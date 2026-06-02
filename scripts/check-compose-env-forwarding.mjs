import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

const bootSafeComposeFiles = ['docker-compose.yml', 'deploy/docker-compose.coolify.yml'];
const sessionSecretFiles = [
  '.env.example',
  '.env.coolify.example',
  'deploy/coolify.env.example',
  'deploy/coolify.env.bulk.txt',
  'deploy/env.production.template',
  'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.production.nv0.kr.ci-check.example'
];
const forwardedKeys = [
  'NV0_EXPOSE_INTERNAL_PUBLIC_APIS',
  'NV0_REDIRECT_OWNER',
  'NV0_DEPLOYMENT_RISK_STRICT',
  'NV0_REQUEST_TIMEOUT_MS',
  'NV0_SLOW_REQUEST_THRESHOLD_MS',
  'NV0_LOG_HEALTHCHECK_REQUESTS',
  'NV0_LOG_FAVICON_REQUESTS',
  'NV0_HEALTHZ_STRICT',
  'NV0_READYZ_CACHE_TTL_MS',
  'NV0_BUILD_VERSION',
  'NV0_BUILD_TIME',
  'NV0_COMMIT_SHA',
  'NV0_RELEASE_ID',
  'NV0_MAX_JSON_BODY_BYTES',
  'NV0_MAX_MULTIPART_BODY_BYTES',
  'NV0_SESSION_SECRET',
  'NV0_ADMIN_AUTH_LIMIT',
  'NV0_ADMIN_AUTH_WINDOW_MS',
  'NV0_DATA_RETENTION_DAYS',
  'NV0_DATA_DESTRUCTION_GRACE_DAYS',
  'NV0_REFUND_REQUEST_WINDOW_DAYS',
  'NV0_RULES_VERSION',
  'NV0_PUBLIC_SCAN_LIMIT',
  'NV0_PUBLIC_SCAN_WINDOW_MS',
  'NV0_SCAN_SOFT_TIMEOUT_MS',
  'NV0_PUBLIC_DEMO_FORCE_SCAN_FALLBACK',
  'NV0_TARGET_FETCH_MAX_BYTES',
  'NV0_TARGET_FETCH_MAX_REDIRECTS',
  'NV0_PAYMENT_PROVIDER_URL',
  'NV0_PAYMENT_PROVIDER_TOKEN',
  'NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS',
  'NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT',
  'NV0_LEGAL_EVIDENCE_VERSION',
  'NV0_PRIVACY_POLICY_VERSION',
  'NV0_TERMS_VERSION',
  'NV0_REFUND_POLICY_VERSION',
  'NV0_AI_REVIEW_PROVIDER',
  'NV0_GEMINI_API_KEY',
  'NV0_GEMINI_MODEL'
];

add('gitignore-exists', () => assert.equal(exists('.gitignore'), true));
add('gitignore-secrets-runtime-artifacts', () => {
  const text = read('.gitignore');
  for (const token of ['.env', 'runtime/data/db.json', 'runtime/data/sessions.json', 'runtime/data/secure-records/', 'runtime/uploads/', 'runtime/backups/', 'runtime/reports/', 'runtime-test-*/', '*.zip']) assert.match(text, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), token);
});
add('session-secret-present-in-operator-templates', () => {
  for (const file of sessionSecretFiles) assert.match(read(file), /^NV0_SESSION_SECRET=/m, file);
});
add('session-secret-generated-by-helper', () => assert.match(read('scripts/generate-commercial-secrets.mjs'), /NV0_SESSION_SECRET/));
add('session-secret-generated-by-r2-helper', () => assert.match(read('scripts/generate-r2-coolify-env.mjs'), /NV0_SESSION_SECRET/));
add('r2-helper-locks-internal-public-apis', () => assert.match(read('scripts/generate-r2-coolify-env.mjs'), /NV0_EXPOSE_INTERNAL_PUBLIC_APIS=false/));
add('r2-helper-includes-payment-redirect-allowlist', () => assert.match(read('scripts/generate-r2-coolify-env.mjs'), /NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS=/));
for (const file of bootSafeComposeFiles) {
  add(`${file}:forwards-critical-keys`, () => {
    const text = read(file);
    for (const key of forwardedKeys) assert.match(text, new RegExp(`^\\s+${key}:`, 'm'), `${file} missing ${key}`);
  });
}
const operatorTemplateFiles = [
  'deploy/coolify.env.example',
  'deploy/coolify.env.bulk.txt',
  'deploy/env.production.template',
  'deploy/env.commercial.template',
  'deploy/env.production.nv0.kr.example'
];
const operatorTemplateKeys = [
  'NV0_EXPOSE_INTERNAL_PUBLIC_APIS',
  'NV0_SESSION_SECRET',
  'NV0_PRIVACY_HASH_KEY',
  'NV0_SECURE_RECORDS_KEY',
  'NV0_SECURE_RECORDS_SALT',
  'NV0_SECURE_RECORDS_DIR',
  'NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS',
  'NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT',
  'NV0_HEALTHZ_STRICT',
  'NV0_READYZ_REDIS_STRICT',
  'NV0_READYZ_CACHE_TTL_MS',
  'NV0_SCAN_SOFT_TIMEOUT_MS',
  'NV0_TARGET_FETCH_MAX_BYTES',
  'NV0_TARGET_FETCH_MAX_REDIRECTS',
  'NV0_BUSINESS_TRADE_NAME',
  'NV0_BUSINESS_REPRESENTATIVE',
  'NV0_BUSINESS_REGISTRATION_NUMBER',
  'NV0_BUSINESS_ADDRESS'
];
add('operator-templates-cover-critical-runtime-keys', () => {
  for (const file of operatorTemplateFiles) {
    const text = read(file);
    for (const key of operatorTemplateKeys) assert.match(text, new RegExp(`^${key}=`, 'm'), `${file} missing ${key}`);
  }
});

add('public-probe-sanitizers-exist', () => {
  const server = read('server/index.mjs');
  assert.match(server, /buildPublicHealthzPayload/);
  assert.match(server, /buildPublicReadyzPayload/);
  assert.doesNotMatch(server, /return json\(req, res, 200, \{ \.\.\.readyzCache\.payload, cacheHit: true \}/);
  assert.doesNotMatch(server, /return json\(req, res, 503, \{ ok: false, ready: false, runtimeWritable: false, error: message/);
});

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'compose-env-forwarding',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  forwardedKeys: forwardedKeys.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COMPOSE_ENV_FORWARDING.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, forwardedKeys: report.forwardedKeys, report: 'docs/current/COMPOSE_ENV_FORWARDING.json' }, null, 2));
if (!report.ok) process.exit(1);
