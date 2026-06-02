import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

const adminPages = [
  'apps/admin/console/index.html',
  'apps/admin/diagnostics/index.html',
  'apps/admin/gate/index.html',
  'apps/admin/library/index.html',
  'apps/admin/orders/index.html',
  'apps/admin/publications/index.html',
  'apps/admin/settings/index.html'
];
const demoPages = ['apps/public/demo/index.html', 'apps/public/veridion-demo/index.html'];
const operatorTemplates = [
  'deploy/coolify.env.example',
  'deploy/coolify.env.bulk.txt',
  'deploy/env.production.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.commercial.template'
];
const criticalTemplateKeys = [
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
const forwardedKeys = [
  'NV0_BUILD_VERSION','NV0_BUILD_TIME','NV0_COMMIT_SHA','NV0_RELEASE_ID',
  'NV0_HEALTHZ_STRICT','NV0_READYZ_CACHE_TTL_MS',
  'NV0_SCAN_SOFT_TIMEOUT_MS','NV0_PUBLIC_DEMO_FORCE_SCAN_FALLBACK',
  'NV0_TARGET_FETCH_MAX_BYTES','NV0_TARGET_FETCH_MAX_REDIRECTS',
  'NV0_PAYMENT_PROVIDER_URL','NV0_PAYMENT_PROVIDER_TOKEN',
  'NV0_LEGAL_EVIDENCE_VERSION','NV0_PRIVACY_POLICY_VERSION','NV0_TERMS_VERSION','NV0_REFUND_POLICY_VERSION'
];

for (const file of adminPages) {
  add(`${file}:skip-link`, () => assert.match(read(file), /<a class="skip-link" href="#main">본문 바로가기<\/a>/));
  add(`${file}:focusable-main`, () => assert.match(read(file), /<main id="main" tabindex="-1" class="app-shell admin-clean-v311">/));
}
for (const file of demoPages) {
  add(`${file}:submit-primary-action`, () => assert.match(read(file), /<button id="scanBtn" type="submit" data-diagnosis-primary-action="true">/));
  add(`${file}:focusable-live-result`, () => assert.match(read(file), /id="demoResult" tabindex="-1" aria-live="polite" aria-atomic="false" aria-label="진단 결과"/));
  add(`${file}:clear-recent-hidden-before-data`, () => assert.match(read(file), /id="clearRecentBtn" type="button" class="secondary" hidden aria-hidden="true" disabled/));
}
const demoJs = read('apps/public/demo/app.js');
add('demo-js:submit-handler', () => assert.match(demoJs, /unifiedDiagnosisForm\?\.addEventListener\('submit'/));
add('demo-js:no-double-scan-click-listener', () => assert.doesNotMatch(demoJs, /scanBtn\?\.addEventListener\('click'/));
add('demo-js:focuses-result-surface', () => assert.match(demoJs, /result\.focus\(\{ preventScroll: true \}\)/));
add('demo-js:clear-recent-state-toggle', () => { assert.match(demoJs, /clearRecentBtn\.hidden\s*=\s*!hasItems/); assert.match(demoJs, /clearRecentBtn\.disabled\s*=\s*!hasItems/); });

const checkout = read('apps/public/checkout/index.html');
const checkoutJs = read('apps/public/checkout/app.js');
add('checkout:submit-primary-action', () => assert.match(checkout, /id="checkoutBtn" type="submit"/));
add('checkout:live-status', () => assert.match(checkout, /id="checkoutState" role="status" aria-live="polite" aria-atomic="true"/));
add('checkout-js:form-submit-handler', () => assert.match(checkoutJs, /checkoutForm\?\.addEventListener\('submit'/));
add('checkout-js:no-direct-primary-click-handler', () => assert.doesNotMatch(checkoutJs, /checkoutBtn\?\.addEventListener\('click'/));
add('portal:side-nav-accessible-name', () => assert.match(read('apps/public/portal/index.html'), /<nav class="vr-side-nav" aria-label="고객 포털 메뉴">/));

for (const file of ['docker-compose.yml', 'deploy/docker-compose.coolify.yml']) {
  add(`${file}:baseline-operational-forwarding`, () => {
    const text = read(file);
    for (const key of forwardedKeys) assert.match(text, new RegExp(`^\\s+${key}:`, 'm'), `${file} missing ${key}`);
  });
}
add('operator-templates:critical-discoverability', () => {
  for (const file of operatorTemplates) {
    const text = read(file);
    for (const key of criticalTemplateKeys) assert.match(text, new RegExp(`^${key}=`, 'm'), `${file} missing ${key}`);
  }
});

add('server:public-target-input-rejects-obvious-private-addresses', () => {
  const server = read('server/index.mjs');
  assert.match(server, /if \(isBlockedTargetUrl\(url\)\) throw invalidPayload\('공개 인터넷 사이트 주소만 진단할 수 있습니다/);
  assert.match(server, /if \(isBlockedTargetUrl\(url\)\) return '';/);
  assert.match(server, /isBlockedTargetUrlResolved/);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'baseline-global-qa-accessibility-contract', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
