import crypto from 'node:crypto';

export const PRIVACY_COMPLIANCE_GUARD_VERSION = 'privacy-zero-leak-guard-v1';

const DEFAULT_RETENTION_DAYS = Object.freeze({
  auditLogs: 90,
  customerSessions: 14,
  passwordResetTokens: 1,
  scans: 180,
  emailOutbox: 30,
  webhookInbox: 90,
  paymentEvents: 365,
  operationalEvents: 90
});

const SENSITIVE_KEY_PATTERN = /(?:password|passwd|pwd|token|secret|authorization|cookie|session|sid|accessToken|refreshToken|rawBody|card|cardNumber|cvc|cvv|ssn|rrn|resident|jumin|주민|계좌|accountNumber|phone|tel|mobile|address|email|buyerEmail|customerEmail|ip|userAgent)/i;
const DIRECT_IDENTIFIER_KEY_PATTERN = /(?:email|buyerEmail|customerEmail|phone|tel|mobile|address|ip|userAgent)/i;
const TOKEN_KEY_PATTERN = /(?:password|passwd|pwd|token|secret|authorization|cookie|session|sid|accessToken|refreshToken|rawBody|card|cardNumber|cvc|cvv|ssn|rrn|resident|jumin|주민|계좌|accountNumber)/i;

function stableSecret(env = process.env) {
  return String(env.NV0_PRIVACY_HASH_KEY || env.NV0_SECURE_RECORDS_KEY || env.NV0_ADMIN_KEY || 'nv0-dev-privacy-hash-key').trim() || 'nv0-dev-privacy-hash-key';
}

export function privacyHash(value, { purpose = 'generic', env = process.env, length = 24 } = {}) {
  const text = String(value || '').trim();
  if (!text) return '';
  return crypto.createHmac('sha256', stableSecret(env)).update(`${purpose}:${text}`).digest('hex').slice(0, length);
}

export function pseudonymizeIp(ip, env = process.env) {
  const raw = String(ip || '').trim();
  if (!raw || raw === 'unknown') return 'unknown';
  return `ip_${privacyHash(raw, { purpose: 'ip', env, length: 20 })}`;
}

export function maskEmailStrict(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email.includes('@')) return email ? '[masked]' : '';
  const [local, domain] = email.split('@');
  const safeLocal = local.length <= 2 ? `${local.slice(0, 1)}***` : `${local.slice(0, 2)}***`;
  const domainParts = String(domain || '').split('.');
  const safeDomain = domainParts.length >= 2 ? `***.${domainParts.slice(-1)[0]}` : '***';
  return `${safeLocal}@${safeDomain}`;
}

export function redactIdentifier(value, key = '') {
  if (value == null) return value;
  const text = String(value);
  if (/email/i.test(key) || text.includes('@')) return maskEmailStrict(text);
  if (/ip/i.test(key)) return pseudonymizeIp(text);
  if (text.length <= 4) return '[redacted]';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

export function sanitizePrivacyPayload(payload, { mode = 'audit', depth = 0 } = {}) {
  if (payload == null) return payload;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(payload)) return payload.slice(0, 50).map(item => sanitizePrivacyPayload(item, { mode, depth: depth + 1 }));
  if (typeof payload !== 'object') return payload;
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    if (TOKEN_KEY_PATTERN.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (DIRECT_IDENTIFIER_KEY_PATTERN.test(key)) {
      out[`${key}Hash`] = privacyHash(value, { purpose: key, length: 16 });
      out[key] = redactIdentifier(value, key);
      continue;
    }
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    out[key] = sanitizePrivacyPayload(value, { mode, depth: depth + 1 });
  }
  return out;
}

export function assertNoHighRiskPersonalData(payload, { context = 'payload' } = {}) {
  const findings = [];
  function visit(value, trail = context, depth = 0) {
    if (value == null || depth > 8) return;
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${trail}[${index}]`, depth + 1));
    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        if (TOKEN_KEY_PATTERN.test(key)) findings.push({ path: `${trail}.${key}`, reason: 'token_or_secret_key' });
        if (/card|cvc|cvv|rrn|resident|jumin|주민|계좌|accountNumber/i.test(key)) findings.push({ path: `${trail}.${key}`, reason: 'forbidden_financial_or_unique_identifier' });
        visit(val, `${trail}.${key}`, depth + 1);
      }
      return;
    }
    const text = String(value);
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) findings.push({ path: trail, reason: 'email_literal' });
    if (/\b\d{6}-?[1-4]\d{6}\b/.test(text)) findings.push({ path: trail, reason: 'rrn_shape' });
    if (/\b(?:\d[ -]*?){13,19}\b/.test(text) && /card|payment|결제|카드/i.test(trail)) findings.push({ path: trail, reason: 'card_shape' });
  }
  visit(payload);
  return { ok: findings.length === 0, findings };
}

function parseDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

function olderThan(item, days, now = Date.now()) {
  const candidates = [item?.createdAt, item?.at, item?.receivedAt, item?.lastSeenAt, item?.expiresAt, item?.generatedAt].map(parseDate).filter(Boolean);
  if (!candidates.length) return false;
  return Math.max(...candidates) < now - days * 24 * 60 * 60 * 1000;
}

export function prunePrivacyRetention(db, { now = Date.now(), retentionDays = DEFAULT_RETENTION_DAYS } = {}) {
  const before = {};
  const after = {};
  const removed = {};
  for (const [key, days] of Object.entries(retentionDays)) {
    if (!Array.isArray(db[key])) continue;
    before[key] = db[key].length;
    if (key === 'passwordResetTokens') {
      db[key] = db[key].filter(item => !item.usedAt && !olderThan(item, days, now));
    } else if (key === 'customerSessions') {
      db[key] = db[key].filter(item => parseDate(item.expiresAt) > now && !olderThan(item, days, now));
    } else {
      db[key] = db[key].filter(item => !olderThan(item, days, now));
    }
    after[key] = db[key].length;
    removed[key] = before[key] - after[key];
  }
  return { ok: true, retentionDays, before, after, removed };
}

export function privacyComplianceSummary(env = process.env) {
  return {
    version: PRIVACY_COMPLIANCE_GUARD_VERSION,
    piiCollection: 'minimum_required_only',
    rawPaymentCredentialStorage: false,
    rawIpPersistence: false,
    auditPayloadRedaction: true,
    secureRecordEncryptionRequired: String(env.NV0_REQUIRE_SECURE_RECORD_ENCRYPTION || 'true').toLowerCase() !== 'false',
    retention: DEFAULT_RETENTION_DAYS,
    legalRiskStatement: 'risk_reduction_gate_not_legal_opinion'
  };
}
