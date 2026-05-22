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

assert.match(pkg.version, /phase25[89]-(structural-hardening|demo-penalty-dashboard)|phase260-dispute-safe-penalty|phase265-dashboard-portal-completion|phase26[8-9]-|phase270-full-package-verified-hardened|phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100|phase274-customer-copy-readability|phase278-customer-perfect|phase276-veridion-stitch-adopted|phase277-function-menu-lock|phase278-customer-perfect|phase278-customer-perfect|phase280-product-agent-insight/);
for (const script of ['phase258:final','test:e2e','ci:strict','validate:commercial','validate:commercial-runtime','pipeline:release','validate:phase280']) assert.ok(pkg.scripts[script], `missing script ${script}`);

for (const route of ['/api/public/scan','/api/public/diagnose','/api/public/checkout-session','/api/public/payment/complete','/api/public/portal-summary','/api/public/fulfillment-download','/api/public/board','/api/public/payment/config']) assert.ok(allRoutes.includes(route), `missing route ${route}`);
assert.match(publicRoutes, /pathname === '\/api\/public\/diagnose' \|\| pathname === '\/api\/public\/scan'/);
assert.ok(publicRoutes.includes('verifyTurnstile(req, payload.turnstileToken)'), 'Turnstile must receive req first');

assert.match(checkoutJs, /privacyConsent/);
assert.match(checkoutJs, /termsConsent/);
assert.match(checkoutJs, /refundConsent/);
assert.match(checkoutJs, /deliveryConsent/);
assert.match(checkoutJs, /window\.PortOne\?\.requestPayment/);
assert.match(checkoutJs, /safeUrl\(data\.paymentSession\.redirectUrl\)/);
assert.match(portalJs, /내 사이트|확인 기록|fulfillment|download/i);

assert.match(boardJs, /safeLocalPath/);
assert.match(boardJs, /AbortController/);
assert.doesNotMatch(boardJs, /posts\.filter\(matchesQuery\)/);
assert.doesNotMatch(boardJs, /href="\$\{escapeHtml\(link\.href/);

for (const file of ['apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/terms/index.html','apps/public/business-info/index.html']) {
  const html = read(file);
  assert.match(html, /개인정보|환불|청약철회|이용약관|사업자|고객지원/);
}
assert.ok(server.includes('/robots.txt'));
assert.ok(server.includes('/sitemap.xml'));
assert.ok(server.includes('frame-src https://cdn.portone.io https://*.portone.io'));

console.log('E2E passed: structural/commercial flow');
