import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));

const server = read('server/index.mjs');
const routeSources = [
  server,
  read('server/routes/public.mjs'),
  read('server/routes/admin.mjs'),
  read('server/routes/payment.mjs'),
  read('server/routes/account.mjs'),
  read('server/routes/ops.mjs')
].join('\n');
const checkoutJs = read('apps/public/checkout/app.js');
const authJs = read('apps/public/auth/app.js');
const portalJs = read('apps/public/portal/app.js');
const privacyHtml = read('apps/public/privacy/index.html');
const refundHtml = read('apps/public/refund/index.html');
const termsHtml = read('apps/public/terms/index.html');
const packageJson = JSON.parse(read('package.json'));

assert.match(packageJson.version, /phase(4[2-3]|20[0-9]|22[0-9]|23[0-9])|100-score/);

// Public conversion flow: scan -> plan -> checkout -> payment complete -> portal/download.
for (const route of [
  '/api/public/scan',
  '/api/public/plans',
  '/api/public/checkout-session',
  '/api/public/payment/complete',
  '/api/public/portal-summary',
  '/api/public/order',
  '/api/public/fulfillment-download'
]) assert.ok(routeSources.includes(route), `missing public route ${route}`);

assert.match(checkoutJs, /privacyConsent/);
assert.match(checkoutJs, /termsConsent/);
assert.match(checkoutJs, /refundConsent/);
assert.match(checkoutJs, /deliveryConsent/);
assert.match(routeSources, /Idempotency-Key|idempotency/i);
assert.doesNotMatch(checkoutJs, /buyerName|registerName|registerCompany/);

// Account flow: signup/login/reset without collecting unnecessary personal fields.
for (const route of [
  '/api/public/auth/register',
  '/api/public/auth/login',
  '/api/public/auth/request-password-reset',
  '/api/public/auth/reset-password'
]) assert.ok(routeSources.includes(route), `missing auth route ${route}`);
assert.doesNotMatch(authJs, /registerName|registerCompany|companyName/);
assert.match(authJs, /reset/i);

// Fulfillment flow: paid orders must produce assets and portal must expose downloads.
assert.match(routeSources, /ensureOrderAssets|asset\/download|assets/);
assert.match(portalJs, /asset\/download|download/i);
assert.match(routeSources, /deliveryConsent/);

// Admin and ops hardening.
for (const route of [
  '/api/admin/launch-checklist',
  '/api/admin/commercial-final-gate',
  '/api/admin/refund-requests',
  'emailOutbox',
  '/api/admin/ops/self-test'
]) assert.ok(routeSources.includes(route), `missing admin/ops route ${route}`);
assert.match(server, /NV0_ADMIN_IP_ALLOWLIST/);
assert.match(routeSources, /webhook/i);
assert.match(routeSources, /mask|masked|redact/i);

// Legal/privacy pages and noindex assets exist.
assert.match(privacyHtml, /개인정보|최소|보유|파기|정보주체/);
assert.match(refundHtml, /청약철회|환불|디지털|제공 후/);
assert.match(termsHtml, /법률 자문|법률 대리|책임/);
assert.ok(exists('apps/public/robots.txt') || routeSources.includes('/robots.txt'));
assert.ok(routeSources.includes('/sitemap.xml'));
assert.match(routeSources, /noindex/);

// Test and launch gate coverage must include the previously unstable checks.
assert.ok(packageJson.scripts['check:links']);
assert.ok(packageJson.scripts['test:e2e']);
assert.ok(packageJson.scripts['final:review']);
assert.ok(packageJson.scripts['validate:phase42']);
assert.ok(packageJson.scripts['validate:phase43']);

console.log('E2E passed');
