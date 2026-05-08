import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const read = async file => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const plansHtml = await read('apps/public/plans/index.html');
const plansJs = await read('apps/public/plans/app.js');
const checkoutHtml = await read('apps/public/checkout/index.html');
const checkoutJs = await read('apps/public/checkout/app.js');
const serverIndex = await read('server/index.mjs');

function stripHidden(html) {
  return html
    .replace(/<section class="sr-only[\s\S]*?<\/section>/g, '')
    .replace(/<div id="(?:oneTimeCards|subscriptionCards|certCards)"[\s\S]*?<\/div>/g, '')
    .replace(/<!--([\s\S]*?)-->/g, '');
}
const visiblePlans = stripHidden(plansHtml);
const visibleCheckout = stripHidden(checkoutHtml);

for (const token of ['방문자는 보고 있습니다', '고객이 망설이는 지점', 'FixPack으로 바로 고치기', '지금 필요한 만큼만 선택하세요', '구매하면 달라지는 점']) {
  assert.ok(visiblePlans.includes(token), `sales plans copy missing: ${token}`);
}
for (const token of ['상품코드', 'checkout-session', 'payment-config', 'PortOne 결제', '검증 스크립트', '100점 산출물', '운영 검수', 'due 체크']) {
  assert.ok(!visiblePlans.includes(token), `plans visible internal copy remains: ${token}`);
}
for (const token of ['선택한 상품으로', '무엇을 받을지 먼저 확인하세요', '구매하면 받을 수 있는 것', '결제 전 마지막 확인']) {
  assert.ok(visibleCheckout.includes(token), `checkout sales copy missing: ${token}`);
}
for (const token of ['상품코드', '서버에서 금액', 'PortOne으로 결제 시작', '결제 검증', '운영 상황']) {
  assert.ok(!visibleCheckout.includes(token), `checkout visible internal copy remains: ${token}`);
}
for (const token of ['data-plan-code', 'data-price', 'data-checkout-href', '/api/public/payment/config', '/checkout?plan=']) {
  assert.ok(plansJs.includes(token), `payment-safe plan wiring missing: ${token}`);
}
for (const token of ['window.PortOne?.requestPayment', '/api/public/checkout-session', '/api/public/payment/complete', 'await completePayment()']) {
  assert.ok(checkoutJs.includes(token), `checkout payment wiring missing: ${token}`);
}
for (const token of ['막연한 느낌이 아니라', '사이트에 넣을 수정 전/후 문장', '광고, 이벤트, 상세페이지가 자주 바뀌는 사이트']) {
  assert.ok(serverIndex.includes(token), `server offer copy missing: ${token}`);
}

console.log(JSON.stringify({ ok: true, test: 'phase212-sales-copy-checkout', checks: { publicPlansSalesCopy: 5, noVisibleInternalCopy: 13, paymentWiringKept: 9 } }, null, 2));
