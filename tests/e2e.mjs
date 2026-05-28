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

assert.match(pkg.version, /phase31[1-9]-(?:clean-redteam|privacy-compliance-hardening|comprehensive-governance-hardening|paid-service-precision-design|paid-redteam-hardening|engine-agent-total-application|trustops-growth-automation|trustops-autopilot-cockpit|trustops-launch-control)|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery/);
for (const script of ['test:e2e','phase311:final','validate:phase311','redteam:global','phase314:final','validate:phase314','phase315:final','validate:phase315','test:paid-redteam','phase316:final','validate:phase316','phase317:final','validate:phase317','test:trustops','phase318:final','validate:phase318','test:autopilot','phase319:final','validate:phase319','test:launch-control','phase320:final','validate:phase320','test:production-sentinel','phase321:final','validate:phase321','test:final-handoff','phase322:final','validate:phase322','phase323:final','validate:phase323','check:responsive-contract','check:operational-contract','test:100-final']) assert.ok(pkg.scripts[script], `missing script ${script}`);

for (const route of ['/api/public/scan','/api/public/diagnose','/api/public/checkout-session','/api/public/payment/complete','/api/public/portal-summary','/api/public/fulfillment-download','/api/public/board','/api/public/payment/config','/api/public/paid-service-model','/api/public/engine-agent-status','/api/public/trustops-blueprint','/api/public/fix-generator','/api/public/monitoring-plan','/api/public/trustops-autopilot','/api/public/customer-lifecycle','/api/public/automation-workqueue','/api/public/trustops-launch-control','/api/public/lifecycle-message-sequence','/api/public/trustops-production-sentinel','/api/public/live-verification-checklist','/api/public/trustops-final-handoff','/api/public/trustops-100-final']) assert.ok(allRoutes.includes(route), `missing route ${route}`);
assert.match(publicRoutes, /pathname === '\/api\/public\/diagnose' \|\| pathname === '\/api\/public\/scan'/);
assert.ok(publicRoutes.includes('verifyTurnstile(req, payload.turnstileToken)'), 'Turnstile must receive req first');

assert.match(checkoutJs, /privacyConsent/);
assert.match(checkoutJs, /termsConsent/);
assert.match(checkoutJs, /refundConsent/);
assert.match(checkoutJs, /deliveryConsent/);
assert.match(checkoutJs, /window\.PortOne\?\.requestPayment/);
assert.match(checkoutJs, /safeUrl\(data\.paymentSession\.redirectUrl\)/);
assert.match(portalJs + read('apps/public/portal/index.html'), /내 사이트|확인 기록|fulfillment|download/i);
assert.match(boardJs, /AbortController/);
assert.doesNotMatch(boardJs, /href=\"\$\{escapeHtml/);

for (const file of ['apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/terms/index.html','apps/public/business-info/index.html']) {
  const html = read(file);
  assert.match(html, /개인정보|환불|청약철회|이용약관|사업자|고객지원/);
  assert.ok(html.includes('/shared/veridion-clean-v311.css'), `${file} missing v311 css`);
}
assert.ok(server.includes('/robots.txt'));
assert.ok(server.includes('/sitemap.xml'));
assert.ok(server.includes('frame-src https://cdn.portone.io https://*.portone.io'));
assert.ok(!server.includes('/shared/veridion-adopted-ui.css'));
console.log('E2E passed: phase323 one-hundred-point closeout flow');
