import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const checks=[]; const add=(name,ok,extra={})=>checks.push({name,ok:!!ok,...extra});
for (const file of ['server/index.mjs','shared/base.css','shared/site-enhancements.js','apps/public/home/index.html','apps/public/home/app.css','apps/public/veridion-demo/index.html','apps/public/veridion-demo/app.js','apps/public/plans/index.html','apps/public/plans/app.js','apps/public/documents/index.html','apps/public/board/index.html','apps/public/board/app.js','Dockerfile','package.json']) add(`exists:${file}`, exists(file));
const pkg=JSON.parse(read('package.json'));
add('version:phase258-release-line', /commercial-(final|portal|phase|ready)|phase\d+/i.test(pkg.version));
const server=read('server/index.mjs');
const routeSources = [
  server,
  read('server/routes/public.mjs'),
  read('server/routes/admin.mjs'),
  read('server/routes/payment.mjs'),
  read('server/routes/account.mjs'),
  read('server/routes/ops.mjs')
].join('\n');
for (const route of ['/', '/plans', '/documents', '/products/veridion/demo', '/checkout', '/portal', '/board', '/business-info', '/privacy', '/terms', '/refund']) add(`route:${route}`, route==='/' || server.includes(`'${route}'`));
for (const api of ['/api/public/products','/api/public/plans','/api/public/scan','/api/public/document-preview','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment','/api/public/board','/api/public/payment/config','/healthz','/readyz']) add(`api:${api}`, routeSources.includes(api));
for (const code of ['Report','Expert']) add(`offer:${code}`, server.includes(`code: '${code}'`) || server.includes(`code:"${code}"`) || server.includes(code));
for (const legacy of ['fixpack','auto','agency','subscription']) add(`legacy-alias-kept:${legacy}`, server.includes(`${legacy}: 'Expert'`) || server.includes(`${legacy}: 'Report'`));
const home=read('apps/public/home/index.html');
for (const token of ['무료 진단 시작','광고를 시작하기 전에','결제 전 신뢰 점검','검사 후 표시','고정 예시 점수 없음','추천 이용 순서','상세 리포트','법률 자문 서비스인가요?']) add(`home:${token}`, home.includes(token));
add('home:no-fixed-sample-score-72', !/신뢰도 점수\s*72|72\s*\/\s*100|위험도\s*72/.test(home));
add('home:single-risk-panel', (home.match(/class="nv0-section phase252-legal-core"/g)||[]).length === 1);
add('home:single-board-section', ((home.match(/<h2>게시판<\/h2>/g)||[]).length + (home.match(/<h2>인사이트<\/h2>/g)||[]).length) === 1);
add('home:demo-links', (home.match(/\/products\/veridion\/demo/g)||[]).length >= 3);
add('home:no-broken-doctype', home.trim().startsWith('<!doctype html>'));
add('home:no-internal-phase-copy', !/Overview|Next Step|작업지시서\s*단계/i.test(home));
const homeJs=read('apps/public/home/app.js');
add('home-js:hero-search-forwarding', homeJs.includes('.hero-search') && homeJs.includes("searchParams.set('target'") && homeJs.includes('aria-invalid'));
const demo=read('apps/public/veridion-demo/index.html');
const demoJs=read('apps/public/veridion-demo/app.js');
for (const token of ['무료 요약 진단 3회','사이트 주소 하나로','결제 전 신뢰 공백','무료 결과와 상품·요금 비교','상세 리포트 신청']) add(`demo:${token}`, demo.includes(token));
for (const token of ['normalizedTarget','nv0:lastScan','renderPaywall','recommendedPlan','freeUsage']) add(`demo-js:${token}`, demoJs.includes(token));
const plans=read('apps/public/plans/index.html');
for (const token of ['상품·요금','기본 리포트','전문가 리포트','무료 진단 시작','49,000','149,000']) add(`plans:${token}`, plans.includes(token));
add('plans:no-legacy-auto-public-copy', !/Auto 정기 케어|39,000원|149,000원|FixPack|TemplatePack/.test(plans));
add('plans:not-stuck-loading', !plans.includes('불러오는 중입니다'));
const board=read('apps/public/board/index.html');
const boardJs=read('apps/public/board/app.js');
for (const token of ['리스크 점검 칼럼','20분마다 1건 발행','점검 의도','핵심 주제','분류 태그']) add(`board:${token}`, (board+boardJs).includes(token));
add('board:no-old-cta-purpose-copy', !/CTA 목적 칼럼|독자 의도|주요 키워드/.test(board+boardJs));
add('board:no-client-double-filter', !boardJs.includes('posts.filter(matchesQuery)'));
add('board:server-pagination-total', boardJs.includes('pagination?.total') || boardJs.includes('pagination.total'));
const docs=read('apps/public/documents/index.html');
add('documents:minimal-fields', docs.includes('전화번호와 주소는 실제 고지에 필요한 경우에만 선택 입력'));
add('documents:template-pack', docs.includes('문서 초안 확인')); 
const base=read('shared/base.css');
for (const token of ['site-topbar','business-footer','cta-band','promo-banner','@media']) add(`base-css:${token}`, base.includes(token));
const enhance=read('shared/site-enhancements.js');
for (const token of ['.hero-search', '.cta-input', 'aria-invalid', 'noopener', 'pageReady']) add(`enhancements:${token}`, enhance.includes(token));
const checkout=read('apps/public/checkout/app.js');
const productCatalog=read('shared/product-catalog.mjs');
for (const token of ['setCheckoutState', 'safeUrl', 'orderId', 'window.PortOne?.requestPayment']) add(`checkout:${token}`, checkout.includes(token));
add('pricing:single-source-catalog', productCatalog.includes('COMMERCIAL_PRICE_TABLE') && productCatalog.includes('Report: 49000') && productCatalog.includes('Expert: 149000') && checkout.includes('/shared/product-catalog.mjs') && server.includes('../shared/product-catalog.mjs'));
add('pricing:no-legacy-checkout-price', !/29000|89000|29,000원|89,000원/.test(checkout + read('apps/public/veridion-demo/app.js') + read('README.md')));
add('client:no-console-log', !/console\.log\(/.test(read('apps/public/veridion-demo/app.js')+read('apps/public/plans/app.js')+read('apps/public/home/app.js')+boardJs+checkout));
add('client:no-inline-handler', !/on(click|submit|change)=/i.test(home+demo+plans+board));
for (const dir of ['runtime/uploads','runtime/backups','runtime/reports']) { if (exists(dir)) add(`runtime:${dir}:empty`, fs.readdirSync(path.join(root,dir)).length===0); }
const passed=checks.filter(c=>c.ok).length; const failed=checks.length-passed; const report={generatedAt:new Date().toISOString(),ok:failed===0,phase:'phase258-structural-hardening-test-all',total:checks.length,passed,failed,checks};
fs.mkdirSync(path.join(root,'docs/current'), {recursive:true});
fs.writeFileSync(path.join(root,'docs/current/PHASE258_TEST_ALL_SUMMARY_20260514.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,passed,failed,report:'docs/current/PHASE258_TEST_ALL_SUMMARY_20260514.json'},null,2));
if(!report.ok) process.exit(1);
