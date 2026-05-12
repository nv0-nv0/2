import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPublicColumnEnginePosts, publicColumnStats } from '../server/core/public-column-engine.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const publicPages = [
  'home','service','guides','solutions','board','plans','veridion-demo','demo','checkout','portal','documents','cases','business-info','terms','privacy','refund','auth'
];
const menu = ['서비스·가이드','분석 프로세스','게시판','요금제','무료 진단'];
const forbidden = ['전문가 칼럼','CTA 게시판','자동발행','자동 발행 200','Customer View','Editorial Board','Trust Flow','39,000원','FixPack','TemplatePack','Auto 정기','contentFingerprint','combinationMode','publicDisplayVersion','undefined','NaN'];
for (const slug of publicPages) {
  const html = read('apps/public', slug, 'index.html');
  for (const label of menu) assert.ok(html.includes(label), `${slug} missing menu label ${label}`);
  for (const bad of forbidden) assert.ok(!html.includes(bad), `${slug} exposes forbidden token ${bad}`);
}
const service = read('apps/public/service/index.html');
assert.ok(service.includes('서비스와 가이드를 한 화면에서'), 'service page must include merged guide section');
const guides = read('apps/public/guides/index.html');
assert.ok(guides.includes('canonical" href="https://nv0.kr/service"') || guides.includes('canonical" href="https://nv0.kr/service"'), 'guides canonical must point to service');
const board = read('apps/public/board/index.html');
assert.ok(board.includes('일반 독자형 60%') && board.includes('CTA 관련 20%') && board.includes('기타 운영 글 20%'), 'board must disclose 60/20/20 content engine');
assert.ok(!board.includes('200'), 'board must not expose 200 count');
const demoJs = read('apps/public/veridion-demo/app.js');
assert.ok(demoJs.includes('demo-count-result') && demoJs.includes('문제 영역') && demoJs.includes('영향 요소') && demoJs.includes('구분별 문제 개수'), 'demo result must be count-only summary');
assert.ok(demoJs.includes('paid-result-clean') && demoJs.includes('상세 근거와 개선안'), 'paid result clean screen missing');
assert.ok(!demoJs.includes('result-tabbed-ia'), 'old tabbed crowded demo result must be removed');
const plans = read('apps/public/plans/index.html');
assert.ok(plans.includes('29,000') && plans.includes('89,000'), 'plans price labels missing');
assert.ok(!plans.includes('39,000'), 'plans still exposes old 39,000 price');
const checkoutApp = read('apps/public/checkout/app.js');
assert.ok(checkoutApp.includes("price: 29000") && checkoutApp.includes("price: 89000"), 'checkout fallback prices mismatch');
assert.ok(!checkoutApp.includes('price: 39000'), 'checkout app exposes old 39,000 price');
const priceModel = read('server/core/pricing-conversion-model.mjs');
assert.ok(priceModel.includes('Report: 29000') && priceModel.includes('Expert: 89000'), 'pricing model mismatch');
assert.ok(!priceModel.includes('Report: 39000'), 'pricing model still contains old Report 39000');
const posts = buildPublicColumnEnginePosts({ pageSize: 20 });
const stats = publicColumnStats(posts);
assert.equal(posts.length, 10, 'column engine should produce 10 seed posts');
assert.equal(stats.general, 6, 'general content should be 60%');
assert.equal(stats.cta, 2, 'CTA content should be 20%');
assert.equal(stats.other, 2, 'other content should be 20%');
const publicRoutes = read('server/routes/public.mjs');
assert.ok(publicRoutes.includes("['all', 'general', 'cta', 'other']"), 'board API filter must use general/cta/other');
assert.ok(publicRoutes.includes('public-column-engine-v2-ratio-60-20-20'), 'board API engine version missing');
console.log(JSON.stringify({ ok: true, checkedPages: publicPages.length, menuLabels: menu.length, forbiddenTokens: forbidden.length, boardRatio: stats.ratio }, null, 2));
