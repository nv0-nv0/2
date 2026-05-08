import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const read = async file => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const stripHidden = html => html.replace(/<section class="sr-only[\s\S]*?<\/section>/g, '').replace(/<!--([\s\S]*?)-->/g, '');
const visibleText = html => stripHidden(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const files = {
  plansHtml: await read('apps/public/plans/index.html'),
  plansJs: await read('apps/public/plans/app.js'),
  homeHtml: await read('apps/public/home/index.html'),
  checkoutHtml: await read('apps/public/checkout/index.html'),
  checkoutJs: await read('apps/public/checkout/app.js'),
  demoHtml: await read('apps/public/veridion-demo/index.html'),
  demoJs: await read('apps/public/veridion-demo/app.js'),
  serviceHtml: await read('apps/public/service/index.html'),
  serverIndex: await read('server/index.mjs')
};
const visiblePlans = visibleText(files.plansHtml);
const visibleCheckout = visibleText(files.checkoutHtml);
const visibleDemo = visibleText(files.demoHtml + files.demoJs);
const visibleService = visibleText(files.serviceHtml);
const visibleHome = visibleText(files.homeHtml);

for (const token of [
  '방문자가 망설이는 순간',
  '더 큰 광고가 아니라 더 분명한 안내',
  '문제가 보였다면 FixPack부터 보세요',
  '상황별로 바로 고르세요',
  '표 대신 카드로 정리했습니다',
  '고객이 멈추는 문장을, 고객이 안심하는 문장으로 바꿉니다'
]) assert.ok(visiblePlans.includes(token), `plans buyer-first copy missing: ${token}`);

for (const bad of [
  '결제하기 전에 받을 결과물과 금액을 다시 보여드립니다',
  '구매 전 안심',
  '상품코드',
  'checkout-session',
  'payment-config',
  'PortOne 결제',
  '검증 스크립트',
  '운영 검수',
  'due 체크',
  '분산 락',
  '100점 완성본',
  '100점 완성 기준'
]) {
  assert.ok(!visiblePlans.includes(bad), `plans visible bad copy remains: ${bad}`);
  assert.ok(!visibleCheckout.includes(bad), `checkout visible bad copy remains: ${bad}`);
  assert.ok(!visibleDemo.includes(bad), `demo visible bad copy remains: ${bad}`);
  assert.ok(!visibleService.includes(bad), `service visible bad copy remains: ${bad}`);
}

assert.ok(!files.plansHtml.includes('payment-readiness-panel'), 'removed distracting payment readiness block');
assert.ok(!files.plansHtml.includes('recommended-layout'), 'removed distracting recommended two-column block');
assert.ok(!files.plansHtml.includes('<table class="comparison-table"'), 'plans comparison table removed');
assert.ok(files.plansHtml.includes('plan-decision-grid'), 'decision card grid added');
assert.ok(files.homeHtml.includes('<a class="btn secondary" href="/plans">상품·요금 보기</a>'), 'home secondary CTA points to plans');

for (const token of ['data-plan-code', 'data-price', 'data-checkout-href', '/api/public/payment/config', '/checkout?', 'paymentReady']) {
  assert.ok(files.plansJs.includes(token), `payment-safe plan wiring missing ${token}`);
}
for (const token of ['window.PortOne?.requestPayment', '/api/public/checkout-session', '/api/public/payment/complete', 'await completePayment()']) {
  assert.ok(files.checkoutJs.includes(token), `checkout payment flow missing ${token}`);
}
for (const token of ['고객이 어디서 망설이는지', 'FixPack 신청', '광고·이벤트·상세페이지가 바뀔 때마다']) {
  assert.ok(files.serverIndex.includes(token), `server commercial copy missing ${token}`);
}
for (const token of ['고객이 결제 직전에 멈추는 이유', '이제 고객이 망설이는 문장을', '필요한 만큼만 받고']) {
  assert.ok((visibleHome + visibleCheckout + visibleService).includes(token), `sitewide copy missing ${token}`);
}

console.log(JSON.stringify({ ok: true, test: 'phase214-ux-copy-quality', checks: { publicCopy: 6, removedBadVisibleCopyAcrossPages: 48, removedDistractingPlansBlocks: 3, paymentWiringKept: 10, sitewideCopy: 3 } }, null, 2));
