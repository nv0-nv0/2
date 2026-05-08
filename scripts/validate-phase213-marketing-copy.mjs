import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = async file => fs.readFile(new URL(file, root), 'utf8');
const pkg = JSON.parse(await read('package.json'));
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
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

add('plans:expert-hero', /고객은 상품보다 먼저[\s\S]*믿고 결제해도 되는지/.test(visiblePlans));
add('plans:outcome-led-flow', visiblePlans.includes('진단에서 끝나지 않고, 고칠 문장까지 이어집니다') && visiblePlans.includes('지금 필요한 결과물만 선택하세요'));
add('plans:fixpack-primary-cta', (visiblePlans.match(/FixPack으로 오늘 수정/g) || []).length >= 2);
add('plans:before-after-human-copy', visiblePlans.includes('문장이 바뀌면 고객의 판단도 바뀝니다') && visiblePlans.includes('평일 09–18시 확인'));
add('plans:no-visible-internal-copy', !/(상품코드|checkout-session|payment-config|PortOne 결제|검증 스크립트|운영 검수|due 체크|분산 락)/.test(visiblePlans));
add('checkout:buyer-first-copy', visibleCheckout.includes('지금 결제하면') && visibleCheckout.includes('무엇이 달라지는지 먼저 확인하세요') && visibleCheckout.includes('구매하면 받을 수 있는 것'));
add('checkout:no-visible-internal-copy', !/(상품코드|checkout-session|payment-config|PortOne 결제|검증 스크립트|운영 검수|due 체크|분산 락)/.test(visibleCheckout));
add('home:buyer-problem-copy', visibleHome.includes('광고로 데려온 고객을') && visibleHome.includes('고객은 결제 버튼을 누르기 전에'));
add('demo:free-to-paid-clarity', visibleDemo.includes('고객이 결제 전 불안해할 지점') && visibleDemo.includes('고칠 필요가 보일 때만 유료 상품을 선택하세요'));
add('payment:wiring-preserved', files.plansJs.includes('data-plan-code') && files.plansJs.includes('/api/public/payment/config') && files.checkoutJs.includes('/api/public/checkout-session') && files.checkoutJs.includes('/api/public/payment/complete'));
add('server:catalog-rewritten', files.serverIndex.includes('막연한 느낌을 근거로 바꿉니다') && files.serverIndex.includes('FixPack으로 오늘 수정'));
add('scripts:phase213-registered', Boolean(pkg.scripts['test:phase213'] && pkg.scripts['validate:phase213-marketing-copy'] && pkg.scripts['phase213:final']));

const failures = checks.filter(item => !item.ok);
assert.equal(failures.length, 0, `phase213 validation failed: ${JSON.stringify(failures, null, 2)}`);
const result = {
  ok: true,
  name: 'phase213-expert-marketing-copy-overhaul',
  scoreTarget: 100,
  checks,
  externalStructureReferences: [
    'Webflow pricing: free start, paid upgrade, plan cards, feature comparison',
    'Semrush subscription model: modular selection by current need',
    'Hotjar comparison page: problem-led diagnostic framing based on actual visitor behavior'
  ],
  appliedScope: [
    '/plans hero, pain framing, offer path, recommendation card, comparison, FAQ, final CTA',
    '/checkout purchase expectation, result delivery, consent, order summary',
    '/ home hero and final CTA public copy',
    '/products/veridion/demo free-to-paid copy',
    'server commercial offer catalog copy'
  ],
  limitation: '로컬 패키지는 코드·정적 게이트·테스트 기준 검증입니다. 실제 운영 결제 승인, 정산, 웹훅 수신 여부는 운영 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(new URL('PHASE213_MARKETING_COPY_VALIDATION_20260508.json', root), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
