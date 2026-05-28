import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPhase315PaidRedteamCouncil, PHASE315_PAID_REDTEAM_VERSION, PHASE315_REDTEAM_ROLES, PHASE315_IMPROVEMENT_BACKLOG } from '../server/core/paid-service-redteam-control.mjs';
import { PAID_SERVICE_OPERATING_VERSION, buildPaidServiceOperatingModel } from '../server/core/paid-service-operating-model.mjs';
import { PRODUCT_CATALOG_VERSION } from '../shared/product-catalog.mjs';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
function check(key, fn) {
  try { fn(); checks.push({ key, ok: true }); }
  catch (error) { checks.push({ key, ok: false, detail: error.message }); }
}

const pkg = JSON.parse(read('package.json'));
const paymentRoutes = read('server/routes/payment.mjs');
const server = read('server/index.mjs');
const e2e = read('tests/e2e.mjs');
const paidTest = read('tests/paid-service-redteam.mjs');
const model = buildPaidServiceOperatingModel({ paymentProvider: 'demo', paymentReady: true });
const council = buildPhase315PaidRedteamCouncil();

check('package version phase315 or superseding phase316', () => assert.match(pkg.version, /phase315-paid-redteam-hardening|phase316-engine-agent-total-application|phase317-trustops-growth-automation|phase318-trustops-autopilot-cockpit|phase319-trustops-launch-control|phase320-trustops-production-sentinel|phase321-trustops-final-completion|phase322-final-test-closeout|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery|phase323-one-hundred-point-closeout|phase324-complete-delivery/));
check('product catalog version phase315', () => assert.match(PRODUCT_CATALOG_VERSION, /phase31[578]/));
check('paid operating version phase315', () => assert.match(PAID_SERVICE_OPERATING_VERSION, /phase31[57]/));
check('redteam version phase315', () => assert.match(PHASE315_PAID_REDTEAM_VERSION, /phase315/));
check('50 practical roles present', () => assert.equal(PHASE315_REDTEAM_ROLES.length, 50));
check('100 improvements present', () => assert.equal(PHASE315_IMPROVEMENT_BACKLOG.length, 100));
check('model exposes phase315 council', () => assert.equal(model.phase315Council.roleCount, 50));
check('mandatory gates include guidance auth', () => assert.ok(model.phase315Council.mandatoryGates.includes('guidance_document_auth_required')));
check('payment route imports sanitizer', () => assert.match(paymentRoutes, /sanitizePaymentSessionForPublic/));
check('payment route sanitizes provider payment', () => assert.match(paymentRoutes, /sanitizeProviderPaymentForPublic\(synced\.payment\)/));
check('payment route uses paid access window', () => assert.match(paymentRoutes, /paidAccessWindow\(order\)/));
check('guidance requires siteId or orderId', () => assert.match(paymentRoutes, /siteId 또는 orderId가 필요합니다/));
check('guidance requires paid authorization', () => assert.match(paymentRoutes, /구매 완료 주문 또는 활성 접근권/));
check('download uses base headers from context', () => assert.match(paymentRoutes, /baseHeaders\(req, 'dynamic'\)/));
check('server exposes baseHeaders to route context', () => assert.match(server, /\nbaseHeaders,\n/));
check('public order response sanitized payment session', () => assert.match(paymentRoutes, /paymentSession: sanitizePaymentSessionForPublic\(paymentSession\)/));
check('checkout includes payment request only at checkout', () => assert.match(paymentRoutes, /includePaymentRequest: true/));
check('webhook provider sync audit includes req', () => assert.match(paymentRoutes, /appendAudit\(db, req, 'public\.payment\.webhook\.provider_sync_error'/));
check('paid redteam integration test exists', () => assert.match(paidTest, /fulfillment-download/));
check('e2e allows phase315', () => assert.match(e2e, /paid-redteam-hardening/));
check('phase315 final script includes paid redteam', () => assert.match(pkg.scripts['phase315:final'] || '', /test:paid-redteam/));
check('release predeploy points to latest safe final gate', () => assert.ok(['npm run phase315:final','npm run phase316:final','npm run phase317:final','npm run phase318:final','npm run phase319:final','npm run phase320:final','npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(pkg.scripts['release:predeploy'])));
check('docs work order exists', () => assert.ok(fs.existsSync(path.join(root, 'docs/PHASE315_PAID_REDTEAM_HARDENING_WORK_ORDER.md'))));
check('docs report exists', () => assert.ok(fs.existsSync(path.join(root, 'docs/PHASE315_PAID_REDTEAM_HARDENING_REPORT.md'))));

const ok = checks.every(item => item.ok);
const report = { ok, phase: 'phase315', checkedAt: new Date().toISOString(), passed: checks.filter(item => item.ok).length, failed: checks.filter(item => !item.ok).length, checks, council };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE315_PAID_REDTEAM_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);
