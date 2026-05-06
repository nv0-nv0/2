import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const checks=[]; const add=(name,ok,extra={})=>checks.push({name,ok:!!ok,...extra});
for (const file of ['server/index.mjs','shared/base.css','apps/public/home/index.html','apps/public/home/app.css','apps/public/veridion-demo/index.html','apps/public/veridion-demo/app.js','apps/public/plans/index.html','apps/public/plans/app.js','apps/public/documents/index.html','Dockerfile','package.json']) add(`exists:${file}`, exists(file));
const pkg=JSON.parse(read('package.json'));
add('version:commercial-final', /commercial-final/.test(pkg.version));
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
for (const api of ['/api/public/products','/api/public/plans','/api/public/scan','/api/public/document-preview','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment','/healthz','/readyz']) add(`api:${api}`, routeSources.includes(api));
for (const code of ['Report','FixPack','Auto']) add(`offer:${code}`, server.includes(`code: '${code}'`) || server.includes(`code:"${code}"`) || server.includes(code));
for (const legacy of ['Basic','Pro','Agency']) add(`legacy-plan-normalized:${legacy}`, server.includes('normalizePlanCode') && server.includes(`${legacy.toLowerCase()}:`) || server.includes(`${legacy}: 'Report'`) || server.includes(`${legacy}: 'Auto'`));
const home=read('apps/public/home/index.html');
for (const token of ['NV0','무료 진단 시작','광고를 시작하기 전에','결제 전 신뢰 점검','검사 후 표시','고정 점수 예시는 제거했습니다','추천 이용 순서','상세 리포트','법률 자문 서비스인가요?']) add(`home:${token}`, home.includes(token));
add('home:no-fixed-sample-score-72', !/신뢰도 점수\s*72|72\s*\/\s*100|위험도\s*72/.test(home));
add('home:single-primary-funnel', (home.match(/\/products\/veridion\/demo/g)||[]).length >= 4);
add('home:no-broken-doctype', home.trim().startsWith('<!doctype html>'));
add('home:no-internal-phase-copy', !/Overview|Next Step|작업지시서\s*단계/i.test(home));
const homeCss=read('apps/public/home/app.css');
for (const token of ['hero-board','hero-lead','diagnosis-card','problem-strip','offer-board','floating-cta','@media']) add(`home-css:${token}`, homeCss.includes(token));
const demo=read('apps/public/veridion-demo/index.html');
const demoJs=read('apps/public/veridion-demo/app.js');
for (const token of ['무료 요약 진단 3회','사이트 주소 하나로','결제 전 신뢰 공백','무료 결과와 상품 비교','상세 리포트 신청']) add(`demo:${token}`, demo.includes(token));
for (const token of ['normalizedTarget','nv0:lastScan','renderPaywall','recommendedPlan','freeUsage']) add(`demo-js:${token}`, demoJs.includes(token));
const plans=read('apps/public/plans/index.html');
for (const token of ['상품·요금','상세 리포트','정기 점검','전체 상품 비교','무료 진단 시작']) add(`plans:${token}`, plans.includes(token));
add('plans:not-stuck-loading', !plans.includes('불러오는 중입니다'));
add('plans:static-fallback-cards', plans.includes('69,000원') && plans.includes('월 299,000원'));
const docs=read('apps/public/documents/index.html');
add('documents:minimal-fields', docs.includes('전화번호와 주소는 실제 고지에 필요한 경우에만 선택 입력'));
add('documents:template-pack', docs.includes('템플릿 팩 구매'));
const base=read('shared/base.css');
for (const token of ['site-topbar','business-footer','cta-band','promo-banner','@media']) add(`base-css:${token}`, base.includes(token));
add('client:no-console-log', !/console\.log\(/.test(read('apps/public/veridion-demo/app.js')+read('apps/public/plans/app.js')+read('apps/public/home/app.js')));
add('client:no-inline-handler', !/on(click|submit|change)=/i.test(home+demo+plans));
for (const dir of ['runtime/uploads','runtime/backups','runtime/reports']) { if (exists(dir)) add(`runtime:${dir}:empty`, fs.readdirSync(path.join(root,dir)).length===0); }
const passed=checks.filter(c=>c.ok).length; const failed=checks.length-passed; const report={generatedAt:new Date().toISOString(),ok:failed===0,phase:'commercial-final',total:checks.length,passed,failed,checks};
fs.writeFileSync(path.join(root,'docs/PHASE55_TEST_ALL_SUMMARY_20260425.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,passed,failed,report:'docs/PHASE55_TEST_ALL_SUMMARY_20260425.json'},null,2));
if(!report.ok) process.exit(1);
process.exit(0);
