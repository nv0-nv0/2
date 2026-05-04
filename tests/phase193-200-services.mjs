import assert from 'node:assert/strict';
import { validateCommercialEnv, redactEnvValue } from '../server/bootstrap/commercial-env.mjs';
import { apiOk, apiFail, createRequestId } from '../server/core/api-response.mjs';
import { attachTrustLayer, compareDiagnosisResults, createEvidenceSnapshot, scoreDiagnosisConfidence } from '../server/services/diagnosis-trust.mjs';
import { buildFulfillmentChecklist, createIdempotencyKey, moveOrderStatus, verifyWebhookIdempotency } from '../server/services/order-fulfillment.mjs';
import { createAuditEvent, redactAuditValue } from '../server/services/audit-log.mjs';
import { buildHealthDetails, classifyIncident } from '../server/services/observability.mjs';

const envResult = validateCommercialEnv({
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_SESSION_SECRET: 'replace-with-long-random',
  NV0_PAYMENT_PROVIDER: 'portone_v2',
  NV0_PORTONE_STORE_ID: 'store',
  NV0_PORTONE_CHANNEL_KEY: 'channel',
  NV0_PORTONE_API_SECRET: 'secret',
  NV0_PORTONE_WEBHOOK_SECRET: 'webhook',
  NV0_PERSISTENCE_MODE: 'json',
  NV0_STORAGE_MODE: 'local_fs'
});
assert.equal(envResult.ok, true);
assert.equal(redactEnvValue('NV0_PORTONE_API_SECRET', 'abcdefghijk'), 'abc***ijk');

assert.equal(apiOk({ a: 1 }, { requestId: 'req_test' }).ok, true);
assert.equal(apiFail({ code: 'X', message: 'bad', status: 400 }, { requestId: 'req_test' }).error.status, 400);
assert.match(createRequestId(), /^req_/);

const pages = [{ url: 'https://example.com/privacy', status: 200, contentLength: 1200, text: 'privacy policy text' }];
const findings = [{ code: 'PRIVACY-LINK', evidence: 'found privacy' }, { code: 'CONTACT', manualReviewRequired: true }];
const snapshot = createEvidenceSnapshot({ targetUrl: 'https://example.com', pages, findings });
assert.equal(snapshot.pageCount, 1);
assert.equal(snapshot.findingCount, 2);
assert.equal(typeof snapshot.snapshotHash, 'string');
const conf = scoreDiagnosisConfidence({ pages, findings });
assert.ok(conf.score > 0);
const trusted = attachTrustLayer({ riskScore: 40, findings }, { targetUrl: 'https://example.com', pages });
assert.equal(trusted.trust.rulesVersion.includes('phase200'), true);
const diff = compareDiagnosisResults({ score: 70, findings: [{ code: 'A' }, { code: 'B' }] }, { score: 50, findings: [{ code: 'B' }, { code: 'C' }] });
assert.equal(diff.addedCount, 1);
assert.equal(diff.resolvedCount, 1);

let order = { id: 'ord1', status: 'created', customerEmail: 'a@example.com', targetUrl: 'https://x.test' };
order = moveOrderStatus(order, 'pending_payment', { actor: 'test' });
order = moveOrderStatus(order, 'paid', { actor: 'test' });
order = moveOrderStatus(order, 'generating', { actor: 'test' });
assert.throws(() => moveOrderStatus(order, 'created'), /Invalid order transition/);
const key = createIdempotencyKey(['portone', 'evt1']);
const idem = verifyWebhookIdempotency([{ idempotencyKey: key }], { idempotencyKey: key });
assert.equal(idem.duplicate, true);
const checklist = buildFulfillmentChecklist({ ...order, status: 'fulfilled', assetId: 'asset', accessToken: 'token' });
assert.equal(checklist.ok, true);

const redacted = redactAuditValue({ apiSecret: 'abcdef', nested: { password: '1234' }, plain: 'ok' });
assert.equal(redacted.apiSecret, '[REDACTED]');
assert.equal(redacted.nested.password, '[REDACTED]');
assert.equal(redacted.plain, 'ok');
const audit = createAuditEvent('order.paid', { token: 'secret', orderId: 'ord1' }, { requestId: 'req1' });
assert.equal(audit.payload.token, '[REDACTED]');
assert.equal(audit.requestId, 'req1');

const health = buildHealthDetails({ integrations: { db: { ok: true }, redis: { ok: true } } });
assert.equal(health.ok, true);
const incident = classifyIncident({ code: 'ECONNREFUSED', message: 'down' }, { requestId: 'req1' });
assert.equal(incident.severity, 'high');
assert.equal(incident.shouldNotify, true);

console.log(JSON.stringify({ ok: true, tests: 24, phase: '193-200-services' }, null, 2));
