import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = async file => fs.readFile(new URL(file, root), 'utf8');
const stripHidden = html => html.replace(/<section class="sr-only[\s\S]*?<\/section>/g, '').replace(/<!--([\s\S]*?)-->/g, '');
const visibleText = html => stripHidden(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const pkg = JSON.parse(await read('package.json'));
const files = {
  plansHtml: await read('apps/public/plans/index.html'),
  plansCss: await read('apps/public/plans/app.css'),
  plansJs: await read('apps/public/plans/app.js'),
  homeHtml: await read('apps/public/home/index.html'),
  checkoutHtml: await read('apps/public/checkout/index.html'),
  checkoutJs: await read('apps/public/checkout/app.js'),
  demoHtml: await read('apps/public/veridion-demo/index.html'),
  demoJs: await read('apps/public/veridion-demo/app.js'),
  serviceHtml: await read('apps/public/service/index.html'),
  serverIndex: await read('server/index.mjs')
};
const visible = {
  plans: visibleText(files.plansHtml),
  checkout: visibleText(files.checkoutHtml),
  demo: visibleText(files.demoHtml + files.demoJs),
  service: visibleText(files.serviceHtml),
  home: visibleText(files.homeHtml)
};
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

add('plans:hero-buyer-first', visible.plans.includes('방문자가 망설이는 순간') && visible.plans.includes('더 큰 광고가 아니라 더 분명한 안내'));
add('plans:removed-second-screenshot-block', !files.plansHtml.includes('payment-readiness-panel') && !files.plansHtml.includes('recommended-layout'));
add('plans:table-replaced-with-decision-cards', !files.plansHtml.includes('<table class="comparison-table"') && files.plansHtml.includes('plan-decision-grid') && files.plansCss.includes('.decision-card'));
add('plans:compact-product-cards', files.plansJs.includes('clean-plan-card') && files.plansJs.includes('이런 분께 추천') && files.plansJs.includes('받는 것'));
add('plans:checkout-wiring-preserved', files.plansJs.includes('data-plan-code') && files.plansJs.includes('data-price') && files.plansJs.includes('data-checkout-href') && files.plansJs.includes('/api/public/payment/config'));
add('checkout:payment-flow-preserved', files.checkoutJs.includes('window.PortOne?.requestPayment') && files.checkoutJs.includes('/api/public/checkout-session') && files.checkoutJs.includes('/api/public/payment/complete'));
add('home:secondary-cta-fixed', files.homeHtml.includes('<a class="btn secondary" href="/plans">상품·요금 보기</a>'));
add('demo:no-public-score-gate-copy', !/(100점 완성본|100점 완성 기준|due 체크|분산 락)/.test(visible.demo));
add('service:no-public-internal-score-copy', !/(100점 완성본|100점 완성 기준|due 체크|분산 락|운영자 확인 기준)/.test(visible.service));
add('site:no-visible-internal-payment-copy', !/(상품코드|checkout-session|payment-config|PortOne 결제|검증 스크립트|운영 검수)/.test(Object.values(visible).join(' ')));
add('server:catalog-humanized', files.serverIndex.includes('고객이 어디서 망설이는지') && files.serverIndex.includes('FixPack 신청') && files.serverIndex.includes('랜딩페이지와 이벤트 페이지가 자주 바뀌는 팀'));
add('package:phase214-scripts-registered', Boolean(pkg.scripts['test:phase214'] && pkg.scripts['validate:phase214-public-site'] && pkg.scripts['phase214:final']));

const failures = checks.filter(item => !item.ok);
assert.equal(failures.length, 0, `phase214 validation failed: ${JSON.stringify(failures, null, 2)}`);
const result = {
  ok: true,
  name: 'phase214-public-site-copy-ux-ui-overhaul',
  scoreTarget: 100,
  checks,
  appliedScope: [
    '/plans distracting payment/readiness block removed and comparison table replaced with decision cards',
    '/plans buyer-first hero, pain framing, product cards, decision guide, before/after, FAQ, final CTA rewritten',
    '/checkout buyer expectation copy rewritten while payment flow remains wired',
    '/ home primary sales message and broken secondary CTA fixed',
    '/products/veridion/demo result-path copy de-internalized',
    '/service public explanation rewritten without internal score/lock/cadence copy',
    'server commercial offer catalog copy humanized'
  ],
  externalStructureReferences: [
    'Webflow pricing pattern: free start, paid upgrade, plan cards, comparison clarity',
    'Semrush subscription pattern: modular product selection by current need',
    'Hotjar positioning pattern: explain user friction before asking for action'
  ],
  limitation: '로컬 패키지는 코드·정적 화면·라우팅·테스트 기준 검증입니다. 운영 서버의 실제 결제 승인, 정산, 웹훅 수신 여부는 운영 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(new URL('PHASE214_PUBLIC_SITE_COPY_UX_VALIDATION_20260508.json', root), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
