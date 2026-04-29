import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const checks = [];
function add(name, ok, detail = {}) {
  if (!ok) {
    console.error(`FAIL ${name}`, detail);
    process.exitCode = 1;
  }
  checks.push({ name, ok, ...detail });
}

const secure = read('server/infrastructure/security/secure-record-store.mjs');
const persistence = read('server/infrastructure/persistence/persistence.mjs');
const server = read('server/index.mjs');
const envExample = read('.env.example') + '\n' + read('.env.coolify.example');
const docs = read('docs/PHASE136_SECURITY_HARDENING_RUNBOOK_20260429_KO.md');

for (const token of ['customers','orders','paymentSessions','paymentEvents','webhookInbox','auditLogs','purchasedAssets']) {
  add(`secure:collection:${token}`, secure.includes(`'${token}'`) || secure.includes(`"${token}"`));
}
add('secure:aes-256-gcm', secure.includes('aes-256-gcm') && secure.includes('createCipheriv') && secure.includes('createDecipheriv'));
add('secure:separate-store-created', persistence.includes('createSecureRecordStore') && persistence.includes('secureStore.split') && persistence.includes('secureStore.merge'));
add('secure:audit-redaction', secure.includes('sanitizeAuditPayload') && server.includes('sanitizeAuditPayload(maskSensitive(meta))') && server.includes('sanitizeAuditPayload(event.payload || {})') && server.includes('sanitizeAuditPayload(record.payload || {})'));
add('secure:env-key-documented', envExample.includes('NV0_SECURE_RECORDS_KEY') && envExample.includes('NV0_SECURE_RECORDS_DIR'));
add('secure:runbook-exists', docs.includes('사용자/결제 기록 분리 보관') && docs.includes('PortOne'));
add('headers:csp', /content-security-policy/.test(server) && /object-src 'none'/.test(server) && /frame-ancestors 'none'/.test(server));
add('headers:hsts', /strict-transport-security/.test(server));
add('portone:webhook-secret-required', server.includes('NV0_PORTONE_WEBHOOK_SECRET') && server.includes('verifyPortOneWebhook'));
add('portone:server-verification', server.includes('verifyPortOnePaymentAgainstOrder') && server.includes('getPayment'));

if (process.exitCode) {
  console.error(JSON.stringify({ ok: false, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 136, checks }, null, 2));
