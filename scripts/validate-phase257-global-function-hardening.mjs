import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const files = {
  home: 'apps/public/home/index.html',
  homeJs: 'apps/public/home/app.js',
  plans: 'apps/public/plans/index.html',
  plansJs: 'apps/public/plans/app.js',
  board: 'apps/public/board/index.html',
  boardJs: 'apps/public/board/app.js',
  checkoutJs: 'apps/public/checkout/app.js',
  publicRoutes: 'server/routes/public.mjs',
  paymentRoutes: 'server/routes/payment.mjs',
  server: 'server/index.mjs',
  column: 'server/core/public-column-engine.mjs',
  sessionNav: 'shared/session-nav.js',
  enhancements: 'shared/site-enhancements.js',
  css: 'shared/nv0-clean-slate-20260512.css',
  contract: 'server/contracts/result-ui-copy-spec.phase177.json'
};
for (const [key, file] of Object.entries(files)) add(`file:${key}`, exists(file), file);
const t = Object.fromEntries(Object.entries(files).filter(([,f]) => exists(f)).map(([k,f]) => [k, read(f)]));
add('01 home duplicate risk panel removed', (t.home.match(/phase252-legal-core/g)||[]).length === 1);
add('02 home duplicate board section removed', (t.home.match(/<h2>게시판<\/h2>/g)||[]).length === 1);
add('03 home has targetable hero input', /class="hero-search"[\s\S]*aria-label="진단할 사이트 주소"/.test(t.home));
add('04 home has detailed-report copy', t.home.includes('상세 리포트'));
add('05 home fixed demo score removed', !/72\s*\/\s*100|82점|12개/.test(t.home));
add('06 home keeps legal disclaimer', t.home.includes('법률 자문을 대체하지') || t.home.includes('법률 자문 서비스인가요'));
add('07 global enhancement script exists', t.enhancements.includes('__NV0_SITE_ENHANCEMENTS__'));
add('08 enhancement binds hero-search', t.enhancements.includes('.hero-search'));
add('09 enhancement binds cta-input', t.enhancements.includes('.cta-input'));
add('10 enhancement validates URL visibly', t.enhancements.includes('aria-invalid') && t.enhancements.includes('nv0-input-hint'));
add('11 enhancement secures target blank', t.enhancements.includes('noopener') && t.enhancements.includes('noreferrer'));
add('12 server injects enhancement script globally', t.server.includes('injectSiteEnhancementsScript') && t.server.includes('/shared/site-enhancements.js'));
add('13 home JS forwards target query', t.homeJs.includes("searchParams.set('target'") && t.homeJs.includes('.hero-search'));
add('14 plans JS forwards target query', t.plansJs.includes("searchParams.set('target'") && t.plansJs.includes('.hero-search'));
add('15 plans legacy public names removed', !/Auto 정기 케어|39,000원|149,000원|FixPack|TemplatePack/.test(t.plans));
add('16 plans current paid SKUs present', t.plans.includes('기본 리포트') && t.plans.includes('전문가 리포트') && t.plans.includes('49,000') && t.plans.includes('149,000'));
add('17 board static old CTA labels removed', !/CTA 목적 칼럼|독자 의도|주요 키워드/.test(t.board));
add('18 board dynamic old CTA labels removed', !/CTA 목적 칼럼|독자 의도|주요 키워드/.test(t.boardJs));
add('19 board shows issue-domain labels', (t.board + t.boardJs).includes('점검 의도') && (t.board + t.boardJs).includes('핵심 주제'));
add('20 board no client-side double filter', !t.boardJs.includes('posts.filter(matchesQuery)'));
add('21 board fetches server search no-store', t.boardJs.includes('cache: \'no-store\'') || t.boardJs.includes('cache:"no-store"'));
add('22 board pagination compacted', t.boardJs.includes('windowSize') && t.boardJs.includes('aria-current'));
add('23 public board query bounded', t.publicRoutes.includes('slice(0, 80)'));
add('24 public board search includes checklist faq', t.publicRoutes.includes('item.checklist') && t.publicRoutes.includes('item.faq'));
add('25 public board cadence says issued', t.publicRoutes.includes('20분마다 1건 발행'));
add('26 board label default no seo', t.server.includes("return 'column'") && !t.server.includes("return 'seo'"));
add('27 column engine risk tag pool', t.column.includes('RISK_TAG_POOL') && !t.column.includes('SEO_TAG_POOL'));
add('28 column engine no search-exposure wording', !/검색노출|검색 로봇|SEO_TAG_POOL/.test(t.column));
add('29 old contract no search robot wording', !/검색 로봇|검색노출/.test(t.contract));
add('30 payment external-http readiness validated', t.paymentRoutes.includes('externalHttpReady') && t.paymentRoutes.includes('NV0_PAYMENT_PROVIDER_URL'));
add('31 payment provider errors handled', t.paymentRoutes.includes('provider_error') && t.paymentRoutes.includes('try') && t.paymentRoutes.includes('catch'));
add('32 webhook provider sync does not hard-crash', t.paymentRoutes.includes('public.payment.webhook.provider_sync_error'));
add('33 external payment URL missing guarded', t.server.includes('NV0_PAYMENT_PROVIDER_URL is required'));
add('34 external payment redirect URL validated', t.server.includes('Invalid external payment redirectUrl'));
add('35 checkout status helper', t.checkoutJs.includes('setCheckoutState'));
add('36 checkout safe redirect guard', t.checkoutJs.includes('safeUrl') && t.checkoutJs.includes('redirectUrl'));
add('37 checkout redirect reads orderId', t.checkoutJs.includes("get('orderId')"));
add('38 checkout PortOne wait loop', (t.checkoutJs.includes('sdkWaits') || t.checkoutJs.includes('portoneReadyChecks')) && t.checkoutJs.includes('requestPayment')); 
add('39 session nav supports static topbar', t.sessionNav.includes('.nv0-top-actions') && t.sessionNav.includes('a[href="/auth"].nv0-icon-link'));
add('40 css has validation hint', t.css.includes('.nv0-input-hint') && t.css.includes('[aria-invalid="true"]'));
add('41 css has payment notice modes', t.css.includes('.notice.warn') && t.css.includes('.notice.success'));
add('42 css has board pagination states', t.css.includes('.board-pagination') && t.css.includes('[aria-current="page"]'));
add('43 no public SEO/search conflict in key static pages', !/SEO\/검색|검색 로봇|검색노출/.test(t.home + t.plans + t.board));
add('44 package keeps current phase script', JSON.parse(read('package.json')).scripts['phase257:final'] !== undefined);
const passed = checks.filter(c => c.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), phase: 'phase257-global-function-hardening', ok: failed === 0, total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE257_GLOBAL_FUNCTION_AUDIT_20260514.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE257_GLOBAL_FUNCTION_AUDIT_20260514.json' }, null, 2));
if (!report.ok) process.exit(1);
