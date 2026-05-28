import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const paymentRoutes = read('server/routes/payment.mjs');
const accountRoutes = read('server/routes/account.mjs');
const adminRoutes = read('server/routes/admin.mjs');
const portalJs = read('apps/public/portal/app.js');
const checkoutJs = read('apps/public/checkout/app.js');
const boardJs = read('apps/public/board/app.js');
const allRoutes = [server, publicRoutes, paymentRoutes, accountRoutes, adminRoutes].join('\n');

assert.match(pkg.version, /phase33[45]-(clean-rebrand|unified-organism)/);
for (const script of ['test:e2e','phase335:final','validate:phase335','check:responsive-contract','test:routes','check:links','verify:security']) {
  assert.ok(pkg.scripts[script], `missing script ${script}`);
}

for (const route of ['/api/public/scan','/api/public/diagnose','/api/public/checkout-session','/api/public/payment/complete','/api/public/portal-summary','/api/public/fulfillment-download','/api/public/board','/api/public/payment/config','/api/public/paid-service-model','/api/public/engine-agent-status','/api/public/customer-lifecycle','/api/public/lifecycle-message-sequence','/api/public/organism-status','/api/public/client-metric']) {
  assert.ok(allRoutes.includes(route), `missing route ${route}`);
}
assert.match(publicRoutes, /pathname === '\/api\/public\/diagnose' \|\| pathname === '\/api\/public\/scan'/);
assert.ok(publicRoutes.includes('verifyTurnstile(req, payload.turnstileToken)'), 'Turnstile must receive req first');

assert.match(checkoutJs, /privacyConsent/);
assert.match(checkoutJs, /termsConsent/);
assert.match(checkoutJs, /refundConsent/);
assert.match(checkoutJs, /deliveryConsent/);
assert.match(checkoutJs, /window\.PortOne\?\.requestPayment/);
assert.match(checkoutJs, /safeUrl\(data\.paymentSession\.redirectUrl\)/);
assert.match(portalJs + read('apps/public/portal/index.html'), /확인 기록|고객 포털|진단 리포트/i);
assert.match(boardJs, /AbortController/);
assert.doesNotMatch(boardJs, /href="\$\{escapeHtml/);

for (const file of ['apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/terms/index.html','apps/public/business-info/index.html']) {
  const html = read(file);
  assert.match(html, /개인정보|환불|청약철회|이용약관|사업자|고객지원/);
  assert.ok(html.includes('/shared/veridion-rebrand.css'), `${file} missing rebrand css`);
  assert.ok(html.includes('data-veridion-rebrand="clean"'), `${file} missing clean marker`);
}
assert.ok(server.includes('/robots.txt'));
assert.ok(server.includes('/sitemap.xml'));
assert.ok(server.includes('frame-src https://cdn.portone.io https://*.portone.io'));
assert.ok(!server.includes('/shared/veridion-adopted-ui.css'));
console.log('E2E passed: phase335 unified organism flow');
