import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const read = async file => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const files = {
  home: await read('apps/public/home/index.html'),
  demo: await read('apps/public/veridion-demo/index.html'),
  plansHtml: await read('apps/public/plans/index.html'),
  plansJs: await read('apps/public/plans/app.js'),
  checkoutHtml: await read('apps/public/checkout/index.html'),
  checkoutJs: await read('apps/public/checkout/app.js'),
  serverIndex: await read('server/index.mjs')
};
function stripHidden(html) {
  return html
    .replace(/<section class="sr-only[\s\S]*?<\/section>/g, '')
    .replace(/<div id="(?:oneTimeCards|subscriptionCards|certCards)"[\s\S]*?<\/div>/g, '')
    .replace(/<!--([\s\S]*?)-->/g, '');
}
const visibleText = html => stripHidden(html).replace(/<[^>]+>/g, ' ');
const visiblePlans = visibleText(files.plansHtml);
const visibleCheckout = visibleText(files.checkoutHtml);
const visibleHome = visibleText(files.home);
const visibleDemo = visibleText(files.demo);

for (const token of [
  '고객은 상품보다 먼저',
  '믿고 결제해도 되는지',
  '진단에서 끝나지 않고, 고칠 문장까지 이어집니다',
  '지금 필요한 결과물만 선택하세요',
  'FixPack으로 오늘 수정',
  '광고비를 더 쓰기 전에'
]) assert.ok(visiblePlans.includes(token), `plans copy missing ${token}`);

for (const token of [
  '지금 결제하면',
  '무엇이 달라지는지 먼저 확인하세요',
  '구매하면 받을 수 있는 것',
  '전화번호나 주소 없이 이메일만 입력합니다'
]) assert.ok(visibleCheckout.includes(token), `checkout copy missing ${token}`);

for (const token of [
  '광고로 데려온 고객을',
  '고객은 결제 버튼을 누르기 전에',
  '고객이 왜 멈추는지 먼저 확인하세요'
]) assert.ok(visibleHome.includes(token), `home copy missing ${token}`);

for (const token of [
  '고객이 결제 전 불안해할 지점',
  '주소만 입력하면 고객이 불안해할 수 있는 공개 항목부터 확인합니다',
  '고칠 필요가 보일 때만 유료 상품을 선택하세요'
]) assert.ok(visibleDemo.includes(token), `demo copy missing ${token}`);

for (const token of ['상품코드', 'checkout-session', 'payment-config', 'PortOne 결제', '검증 스크립트', '운영 검수', 'due 체크', '분산 락']) {
  assert.ok(!visiblePlans.includes(token), `plans visible internal copy remains ${token}`);
  assert.ok(!visibleCheckout.includes(token), `checkout visible internal copy remains ${token}`);
}

for (const token of ['data-plan-code', 'data-price', 'data-checkout-href', '/api/public/payment/config', '/checkout?plan=']) {
  assert.ok(files.plansJs.includes(token), `payment-safe plan wiring missing ${token}`);
}
for (const token of ['window.PortOne?.requestPayment', '/api/public/checkout-session', '/api/public/payment/complete', 'await completePayment()']) {
  assert.ok(files.checkoutJs.includes(token), `checkout payment wiring missing ${token}`);
}
for (const token of ['막연한 느낌을 근거로 바꿉니다', 'FixPack으로 오늘 수정', '안내 공백을 정기적으로 확인합니다']) {
  assert.ok(files.serverIndex.includes(token), `server catalog copy missing ${token}`);
}

console.log(JSON.stringify({ ok: true, test: 'phase213-marketing-copy', checks: { publicCopy: 16, noVisibleInternalCopy: 16, paymentWiringKept: 9, serverCatalog: 3 } }, null, 2));
