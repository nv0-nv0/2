import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
function add(key, ok, detail = '') { checks.push({ key, ok: Boolean(ok), detail }); assert.ok(ok, `${key}${detail ? `: ${detail}` : ''}`); }

const catalog = read('shared/product-catalog.mjs');
const publicRoutes = read('server/routes/public.mjs');
const paymentRoutes = read('server/routes/payment.mjs');
const index = read('server/index.mjs');
const checkoutHtml = read('apps/public/checkout/index.html');
const checkoutApp = read('apps/public/checkout/app.js');
const operatingModel = read('server/core/paid-service-operating-model.mjs');
const packageJson = read('package.json');

add('catalog version phase314', catalog.includes('phase314-paid-service-precision-model-v1'));
add('report service scope', /code: 'Report'[\s\S]*serviceScope:[\s\S]*1회성 디지털 리포트/.test(catalog));
add('expert manual renewal explicit', /code: 'Expert'[\s\S]*autoRecurringBilling: false/.test(catalog) && catalog.includes('manual_renewal_until_recurring_billing_enabled'));
add('catalog has unlock rules', (catalog.match(/unlocks:/g) || []).length >= 3);
add('paid service operating model exists', operatingModel.includes('PAID_SERVICE_OPERATING_VERSION') && operatingModel.includes('provider_verified_paid'));
add('public paid service API', publicRoutes.includes("/api/public/paid-service-model") && publicRoutes.includes('buildPaidServiceOperatingModel'));
add('checkout target input exists', checkoutHtml.includes('id="targetDomain"') && checkoutHtml.includes('대상 사이트 URL'));
add('checkout target client gate', checkoutApp.includes('targetReady') && checkoutApp.includes('대상 사이트 URL을 입력'));
add('checkout sends domain', checkoutApp.includes("domain: targetInput?.value.trim() || prefill.domain"));
add('checkout rejects free plan', paymentRoutes.includes('유료 결제는 기본 리포트 또는 전문가 플랜만 진행할 수 있습니다'));
add('checkout requires target', paymentRoutes.includes('유료 산출물의 대상 사이트 URL이 필요합니다'));
add('portal order auth is strict', !paymentRoutes.includes('order.customerId && !canAccessOrder(req, order)'));
add('public order auth is strict', paymentRoutes.includes("if (!canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '주문 접근 권한이 없습니다.' });"));
add('fulfillment auth is strict', paymentRoutes.includes("if (!canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '산출물 접근 권한이 없습니다.' });"));
add('subscription only for subscription billing', index.includes("offer?.billingType === 'subscription'") && index.includes('autoRecurringBilling = offer.autoRecurringBilling === true'));
add('paid sync creates fulfillment', /case 'PAID':[\s\S]*ensureFulfillmentForOrder\(db, order\);[\s\S]*payment.provider.confirmed/.test(index));
add('phase314 package scripts', packageJson.includes('phase314:final') && packageJson.includes('validate-phase314-paid-service-design.mjs'));
add('phase314 docs present', fs.existsSync(path.join(root, 'docs/PHASE314_PAID_SERVICE_PRECISION_DESIGN.md')) && fs.existsSync(path.join(root, 'docs/PHASE314_PAID_SERVICE_REDTEAM_REPORT.md')));

const report = { ok: true, phase: 'phase314', checkedAt: new Date().toISOString(), passed: checks.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE314_PAID_SERVICE_DESIGN_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
