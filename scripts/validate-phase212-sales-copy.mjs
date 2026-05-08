import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = async file => fs.readFile(new URL(file, root), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const files = {
  plansHtml: await read('apps/public/plans/index.html'),
  plansJs: await read('apps/public/plans/app.js'),
  checkoutHtml: await read('apps/public/checkout/index.html'),
  checkoutJs: await read('apps/public/checkout/app.js'),
  serverIndex: await read('server/index.mjs')
};
function stripHidden(html) {
  return html.replace(/<section class="sr-only[\s\S]*?<\/section>/g, '').replace(/<div id="(?:oneTimeCards|subscriptionCards|certCards)"[\s\S]*?<\/div>/g, '').replace(/<!--([\s\S]*?)-->/g, '');
}
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const visiblePlans = stripHidden(files.plansHtml);
const visibleCheckout = stripHidden(files.checkoutHtml);

add('plans:sales-first-hero', /방문자는 보고 있습니다[\s\S]*믿고 결제해도 되는 사이트/.test(visiblePlans));
add('plans:buyer-pain-grid', visiblePlans.includes('문의는 오는데 구매가 약하다면') && visiblePlans.includes('광고비는 쓰는데 전환이 낮다면'));
add('plans:fixpack-primary-cta', (visiblePlans.match(/FixPack으로 바로 고치기/g) || []).length >= 2);
add('plans:buyer-value-section', visiblePlans.includes('고객이 멈추는 문장을, 고객이 안심하는 문장으로 바꿉니다'));
add('plans:no-visible-internal-ops-copy', !/(상품코드|checkout-session|payment-config|PortOne 결제|검증 스크립트|100점 산출물|운영 검수|due 체크|분산 락)/.test(visiblePlans));
add('checkout:buyer-first-copy', visibleCheckout.includes('선택한 상품으로') && visibleCheckout.includes('구매하면 받을 수 있는 것'));
add('checkout:no-visible-internal-payment-copy', !/(상품코드|서버에서 금액|PortOne으로 결제 시작|결제 검증|운영 상황)/.test(visibleCheckout));
add('payment:wiring-preserved', files.plansJs.includes('data-plan-code') && files.plansJs.includes('/api/public/payment/config') && files.checkoutJs.includes('/api/public/checkout-session') && files.checkoutJs.includes('/api/public/payment/complete'));
add('server:commercial-catalog-sales-copy', files.serverIndex.includes('사이트에 넣을 수정 전/후 문장') && files.serverIndex.includes('고객이 어디서 멈추는지'));
add('scripts:phase212-registered', Boolean(pkg.scripts['test:phase212'] && pkg.scripts['validate:phase212-sales-copy'] && pkg.scripts['phase212:final']));

const failures = checks.filter(item => !item.ok);
assert.equal(failures.length, 0, `phase212 validation failed: ${JSON.stringify(failures, null, 2)}`);
const result = {
  ok: true,
  name: 'phase212-public-sales-copy-reset',
  scoreTarget: 100,
  checks,
  appliedScope: [
    '/plans hero and buyer pain copy',
    '/plans product cards and comparison copy',
    '/plans payment readiness public wording',
    '/checkout buyer-facing purchase copy',
    'server commercial offer catalog copy'
  ],
  limitation: '로컬 패키지는 코드·정적 게이트·테스트 기준 검증입니다. 실제 운영 결제 승인과 정산 정보는 운영 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(new URL('PHASE212_PUBLIC_SALES_COPY_VALIDATION_20260508.json', root), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
