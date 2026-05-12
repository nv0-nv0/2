import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const publicPages = [
  'apps/public/home/index.html',
  'apps/public/service/index.html',
  'apps/public/solutions/index.html',
  'apps/public/board/index.html',
  'apps/public/guides/index.html',
  'apps/public/plans/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/checkout/index.html',
  'apps/public/portal/index.html',
  'apps/public/business-info/index.html',
  'apps/public/terms/index.html',
  'apps/public/privacy/index.html',
  'apps/public/refund/index.html'
];
const bannedVisible = [
  'Customer View',
  'CTA 게시판',
  '자동발행',
  '자동 발행 200',
  'contentFingerprint',
  'combinationMode',
  'publicDisplayVersion',
  'Editorial Board',
  'Trust Flow',
  'FixPack',
  'Auto 정기',
  'TemplatePack',
  '정기 관리 케어'
];
for (const file of publicPages) {
  const html = read(file);
  for (const token of bannedVisible) assert.ok(!html.includes(token), `${file} exposes ${token}`);
  for (const menu of ['서비스 소개','분석 프로세스','전문가 칼럼','가이드','요금제']) assert.ok(html.includes(menu), `${file} missing menu ${menu}`);
}
const board = read('apps/public/board/index.html');
assert.ok(!board.includes('data-board-stat'), 'board must not expose counter cards');
assert.ok(board.includes('새 칼럼 엔진'), 'board must describe new column engine');
assert.ok(board.includes('검색 로봇도 읽고'), 'board must have reader/search friendly headline');
const boardApp = read('apps/public/board/app.js');
assert.ok(boardApp.includes('/api/public/board'), 'board app must load public board api');
assert.ok(!boardApp.includes('data-board-stat'), 'board app must not depend on stat cards');
const plans = read('apps/public/plans/index.html');
const planTitles = [...plans.matchAll(/<h3>(무료 진단|기본 리포트|전문가 리포트)<\/h3>/g)].map(m => m[1]);
assert.deepEqual(planTitles, ['무료 진단','기본 리포트','전문가 리포트']);
assert.ok(plans.includes('/checkout?plan=Report'), 'basic report checkout link missing');
assert.ok(plans.includes('/checkout?plan=Expert'), 'expert report checkout link missing');
const checkout = read('apps/public/checkout/index.html');
assert.ok(checkout.includes('value="Report"'), 'checkout missing Report option');
assert.ok(checkout.includes('value="Expert"'), 'checkout missing Expert option');
assert.ok(!checkout.includes('정기 관리'), 'checkout must not expose legacy recurring plan');
const publicRoute = read('server/routes/public.mjs');
assert.ok(publicRoute.includes('buildPublicColumnEnginePosts'), 'public board route must use column engine');
assert.ok(publicRoute.includes("codes!=='Free,Report,Expert'") === false, 'validator text leak guard');
const server = read('server/index.mjs');
assert.ok(server.includes('public-column-engine-v1'), 'server must publish column-engine records');
assert.ok(server.includes('slice(0, 60)'), 'server must not retain 200 public board items');
console.log(JSON.stringify({ ok: true, checkedPages: publicPages.length, bannedTokens: bannedVisible.length }, null, 2));
