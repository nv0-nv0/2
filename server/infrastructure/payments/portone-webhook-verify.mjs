import crypto from 'node:crypto';

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

function getHeader(headers = {}, name) {
  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return '';
}

function decodeSecret(secret) {
  const raw = String(secret || '').trim();
  if (!raw) return null;
  const value = raw.startsWith('whsec_') ? raw.slice('whsec_'.length) : raw;
  try {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length >= 16) return decoded;
  } catch {}
  return Buffer.from(raw, 'utf8');
}

function extractSignatures(signatureHeader) {
  return String(signatureHeader || '')
    .split(/\s+/)
    .flatMap(part => part.split(','))
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.startsWith('v1,') ? part.slice(3) : part.startsWith('v1=') ? part.slice(3) : part)
    .filter(part => part && part !== 'v1');
}

function safeEqualBase64(expected, received) {
  try {
    const expectedBuf = Buffer.from(expected, 'base64');
    const receivedBuf = Buffer.from(received, 'base64');
    if (!expectedBuf.length || expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export function verifyPortOneWebhook({ rawBody, headers, secret, nowMs = Date.now(), toleranceSeconds = DEFAULT_TOLERANCE_SECONDS }) {
  const webhookId = String(getHeader(headers, 'webhook-id') || '').trim();
  const timestamp = String(getHeader(headers, 'webhook-timestamp') || '').trim();
  const signatureHeader = String(getHeader(headers, 'webhook-signature') || getHeader(headers, 'x-webhook-signature') || getHeader(headers, 'x-portone-signature') || '').trim();
  const signingSecret = decodeSecret(secret);
  if (!signingSecret) return { ok: false, reason: 'webhook_secret_missing', webhookId, timestamp, signaturePresent: !!signatureHeader };
  if (!webhookId) return { ok: false, reason: 'webhook_id_missing', webhookId, timestamp, signaturePresent: !!signatureHeader };
  if (!timestamp) return { ok: false, reason: 'webhook_timestamp_missing', webhookId, timestamp, signaturePresent: !!signatureHeader };
  if (!signatureHeader) return { ok: false, reason: 'webhook_signature_missing', webhookId, timestamp, signaturePresent: false };
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return { ok: false, reason: 'webhook_timestamp_invalid', webhookId, timestamp, signaturePresent: true };
  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - timestampNumber);
  if (ageSeconds > toleranceSeconds) return { ok: false, reason: 'webhook_timestamp_out_of_tolerance', webhookId, timestamp, signaturePresent: true, ageSeconds };
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  const signedContent = `${webhookId}.${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', signingSecret).update(signedContent).digest('base64');
  const signatures = extractSignatures(signatureHeader);
  const matched = signatures.some(sig => safeEqualBase64(expected, sig));
  return { ok: matched, reason: matched ? null : 'webhook_signature_invalid', webhookId, timestamp, signaturePresent: true, ageSeconds, expectedVersion: 'v1' };
}

export function signPortOneWebhookForTest({ rawBody, webhookId, timestamp, secret }) {
  const signingSecret = decodeSecret(secret);
  if (!signingSecret) throw new Error('secret is required');
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  const digest = crypto.createHmac('sha256', signingSecret).update(`${webhookId}.${timestamp}.${payload}`).digest('base64');
  return `v1,${digest}`;
}
