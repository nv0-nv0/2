import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, detail = undefined) => checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });

const requiredFiles = [
  'server/bootstrap/commercial-env.mjs',
  'server/core/api-response.mjs',
  'server/services/diagnosis-trust.mjs',
  'server/services/order-fulfillment.mjs',
  'server/services/audit-log.mjs',
  'server/services/observability.mjs',
  'shared/render-policy.js',
  'tests/phase193-200-services.mjs',
  'scripts/create-secure-release.mjs',
  'docs/current/COMMERCIAL_SYSTEM_HANDOFF_20260504_KO.md',
  'PHASE193_200_COMMERCIAL_SYSTEM_COMPLETION_20260504_KO.md'
];
for (const file of requiredFiles) add(`file:${file}`, exists(file));

const env = exists('server/bootstrap/commercial-env.mjs') ? read('server/bootstrap/commercial-env.mjs') : '';
for (const token of ['COMMERCIAL_ENV_SPEC', 'validateCommercialEnv', 'assertCommercialEnv', 'NV0_PORTONE_WEBHOOK_SECRET', 'NV0_BACKUP_ENCRYPTION_SECRET']) add(`env:${token}`, env.includes(token));

const api = exists('server/core/api-response.mjs') ? read('server/core/api-response.mjs') : '';
for (const token of ['apiOk', 'apiFail', 'withRequestId', 'normalizeApiError', 'x-request-id']) add(`api:${token}`, api.includes(token));

const trust = exists('server/services/diagnosis-trust.mjs') ? read('server/services/diagnosis-trust.mjs') : '';
for (const token of ['DIAGNOSIS_RULES_VERSION', 'createEvidenceSnapshot', 'scoreDiagnosisConfidence', 'attachTrustLayer', 'compareDiagnosisResults', 'snapshotHash']) add(`diagnosis-trust:${token}`, trust.includes(token));

const fulfillment = exists('server/services/order-fulfillment.mjs') ? read('server/services/order-fulfillment.mjs') : '';
for (const token of ['ORDER_FULFILLMENT_TRANSITIONS', 'moveOrderStatus', 'createIdempotencyKey', 'verifyWebhookIdempotency', 'buildFulfillmentChecklist']) add(`fulfillment:${token}`, fulfillment.includes(token));

const audit = exists('server/services/audit-log.mjs') ? read('server/services/audit-log.mjs') : '';
for (const token of ['redactAuditValue', 'createAuditEvent', 'appendAuditJsonl', '[REDACTED]']) add(`audit:${token}`, audit.includes(token));

const obs = exists('server/services/observability.mjs') ? read('server/services/observability.mjs') : '';
for (const token of ['logEvent', 'buildHealthDetails', 'classifyIncident', 'shouldNotify']) add(`observability:${token}`, obs.includes(token));

const index = read('server/index.mjs');
add('server:index-imports-commercial-env', index.includes("./bootstrap/commercial-env.mjs"));
add('server:index-imports-observability', index.includes("./services/observability.mjs"));
add('server:readyz-has-commercial-env', index.includes('commercialEnv: validateCommercialEnv'));
add('server:healthz-uses-health-details', index.includes('buildHealthDetails({ service:'));
add('server:catch-classifies-incident', index.includes('classifyIncident(error'));

const htmlFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, item.name).replaceAll('\\', '/');
    if (item.isDirectory()) walk(rel);
    else if (item.name === 'index.html') htmlFiles.push(rel);
  }
}
walk('apps');
add('html:index-count>=20', htmlFiles.length >= 20, { count: htmlFiles.length });
for (const file of htmlFiles) {
  const html = read(file);
  if (html.includes('/shared/safe-dom.js')) add(`${file}:render-policy-after-safe-dom`, html.includes('/shared/render-policy.js') && html.indexOf('/shared/render-policy.js') > html.indexOf('/shared/safe-dom.js'));
}

const envExample = read('.env.example') + '\n' + read('.env.coolify.example');
for (const token of ['NV0_COMMERCIAL_ENV_STRICT', 'NV0_OPERATOR_ALERT_EMAIL', 'NV0_ORDER_WEBHOOK_REPLAY_ENABLED', 'NV0_DIAGNOSIS_RULES_VERSION']) add(`env-example:${token}`, envExample.includes(token));

const pkg = JSON.parse(read('package.json'));
for (const [name, expected] of Object.entries({
  'test:phase193-200': 'node tests/phase193-200-services.mjs',
  'validate:phase193-200': 'node scripts/validate-phase193-200-commercial-system.mjs',
  'release:secure-package': 'node scripts/create-secure-release.mjs',
  'phase200:final': null
})) {
  if (expected) add(`package:${name}`, pkg.scripts?.[name] === expected, { actual: pkg.scripts?.[name] });
  else add(`package:${name}`, typeof pkg.scripts?.[name] === 'string' && pkg.scripts[name].includes('validate:phase193-200') && pkg.scripts[name].includes('test:phase193-200'));
}
add('package:version-phase200', String(pkg.version).includes('phase200'));

const releaseScript = exists('scripts/create-secure-release.mjs') ? read('scripts/create-secure-release.mjs') : '';
add('release-script:excludes-runtime-data', releaseScript.includes('runtime/data') && releaseScript.includes('runtime/uploads') && releaseScript.includes('runtime/backups') && releaseScript.includes('runtime/reports'));
add('release-script:excludes-env-and-node-modules', releaseScript.includes("'.env'") && releaseScript.includes('node_modules'));

const serviceTest = spawnSync(process.execPath, ['tests/phase193-200-services.mjs'], { cwd: root, encoding: 'utf8' });
add('tests:phase193-200-services-exec', serviceTest.status === 0, { stdout: serviceTest.stdout.trim().slice(0, 1000), stderr: serviceTest.stderr.trim().slice(0, 1000) });

const failed = checks.filter((item) => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  phase: '193-200',
  title: 'Commercial system completion validation',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE193_200_COMMERCIAL_SYSTEM_VALIDATION_20260504.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE193_200_COMMERCIAL_SYSTEM_VALIDATION_20260504.json' }, null, 2));
if (!report.ok) process.exit(1);
