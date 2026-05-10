import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const read = async (file) => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [plansHtml, plansJs, plansCss, checkoutHtml, checkoutJs, checkoutCss, paymentRoute, serverIndex] = await Promise.all([
  read('apps/public/plans/index.html'),
  read('apps/public/plans/app.js'),
  read('apps/public/plans/app.css'),
  read('apps/public/checkout/index.html'),
  read('apps/public/checkout/app.js'),
  read('apps/public/checkout/app.css'),
  read('server/routes/payment.mjs'),
  read('server/index.mjs')
]);

for (const token of ['paymentReadiness', 'paymentProductCodes', '결제 연동 기준', '추천 플랜 카드', '핵심 차이', '선택 가이드']) {
  assert.ok(plansHtml.includes(token), `plans html missing ${token}`);
}
for (const token of ['GET /api/public/payment/config', 'data-plan-code', 'data-price', 'data-checkout-href', 'checkout-session API', 'paymentReady', 'paymentBadge', 'renderPaymentReadiness', '결제 가능']) {
  assert.ok(plansJs.includes(token), `plans js missing ${token}`);
}
for (const token of ['payment-readiness-panel', 'payment-code-grid', 'payment-microcopy', 'plan-badges']) {
  assert.ok(plansCss.includes(token), `plans css missing ${token}`);
}
for (const token of ['paymentConfigState', 'PortOne payment-config checkout-session payment-complete 상품코드 금액 검증']) {
  assert.ok(checkoutHtml.includes(token), `checkout html missing ${token}`);
}
for (const token of ['loadPaymentConfig', 'isPaymentProviderReady', 'paymentBlockReason', 'window.PortOne?.requestPayment', 'await completePayment()', 'providerPaymentId: responsePaymentId', '선택한 상품코드를 확인하지 못했습니다', '/api/public/payment/config']) {
  assert.ok(checkoutJs.includes(token), `checkout js missing ${token}`);
}
for (const token of ['payment-config-state', 'is-ready', 'is-warning']) {
  assert.ok(checkoutCss.includes(token), `checkout css missing ${token}`);
}
for (const token of ["pathname === '/api/public/payment/config'", 'PORTONE_CLIENT.configSummary', 'productCodes', 'paymentReady', "PAYMENT_PROVIDER === 'portone_v2' && !PORTONE_CLIENT?.enabled", 'storeId, channelKey, apiSecret']) {
  assert.ok(paymentRoute.includes(token), `payment route missing ${token}`);
}
for (const token of ["code: 'Report'", "code: 'FixPack'", "code: 'Auto'", 'price: 39000', 'price: 79000', 'price: 149000', 'function buildCommercialOfferCatalog', 'function planPrice']) {
  assert.ok(serverIndex.includes(token), `server catalog missing ${token}`);
}

console.log(JSON.stringify({
  ok: true,
  test: 'phase211-plans-checkout-payment',
  checks: {
    cleanPlanSections: 6,
    paymentAwarePlanJs: 9,
    paymentAwareCheckoutJs: 8,
    serverPaymentConfigGuard: 6,
    catalogPrices: { Report: 39000, FixPack: 79000, Auto: 149000 }
  }
}, null, 2));
