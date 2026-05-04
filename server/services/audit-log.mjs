import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SECRET_RE = /(password|secret|token|key|authorization|cookie|smtp|database|redis|portone|s3)/i;

export function redactAuditValue(value, key = '') {
  if (value == null) return value;
  if (SECRET_RE.test(String(key))) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactAuditValue(item, key));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactAuditValue(v, k)]));
  }
  const text = String(value);
  if (/^[A-Za-z0-9+/=_-]{32,}$/.test(text) && SECRET_RE.test(String(key))) return '[REDACTED]';
  return value;
}

export function createAuditEvent(event, payload = {}, meta = {}) {
  const at = meta.at || new Date().toISOString();
  const base = {
    id: meta.id || `audit_${crypto.createHash('sha256').update(`${event}|${at}|${JSON.stringify(payload)}`).digest('hex').slice(0, 24)}`,
    at,
    event: String(event || 'unknown'),
    actor: meta.actor || 'system',
    requestId: meta.requestId || null,
    ip: meta.ip || null,
    payload: redactAuditValue(payload)
  };
  return base;
}

export async function appendAuditJsonl(filePath, event, payload = {}, meta = {}) {
  const record = createAuditEvent(event, payload, meta);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  return record;
}
