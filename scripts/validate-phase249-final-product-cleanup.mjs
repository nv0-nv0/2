import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));

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
  'apps/public/documents/index.html',
  'apps/public/cases/index.html',
  'apps/public/business-info/index.html',
  'apps/public/terms/index.html',
  'apps/public/privacy/index.html',
  'apps/public/refund/index.html',
  'apps/public/auth/index.html'
];

const menu = ['서비스 소개','분석 프로세스','전문가 칼럼','가이드','요금제'];
const bannedPublicTokens = [
  'Customer View',
  'CTA 게시판',
  '자동발행',
  '자동 발행 200',
  '자동발행 200',
  '200개',
  'contentFingerprint',
  'combinationMode',
  'publicDisplayVersion',
  'Editorial Board',
  'Trust Flow',
  'FixPack',
  'TemplatePack',
  'Auto 정기',
  '정기 관리 케어',
  '콘텐츠 보드',
  '상품·요금'
];

for (const file of publicPages) {
  assert.ok(exists(file), `missing ${file}`);
  const html = read(file);
  for (const item of menu) assert.ok(html.includes(item), `${file} missing visible menu item ${item}`);
  for (const token of bannedPublicTokens) assert.ok(!html.includes(token), `${file} exposes banned token ${token}`);
  assert.equal((html.match(/class="nv0-topbar"/g) || []).length, 1, `${file} must have one topbar`);
}

const css = read('shared/nv0-clean-slate-20260512.css');
assert.ok(css.includes('overflow-x:auto') || css.includes('overflow-x: auto'), 'mobile/overflow menu must stay visible via horizontal overflow');
assert.ok(!/\.nv0-nav\s*\{[^}]*display\s*:\s*none/i.test(css), 'top menu must not be hidden globally');

const plans = read('apps/public/plans/index.html');
const planMatches = [...plans.matchAll(/<h3>(무료 진단|기본 리포트|전문가 리포트)<\/h3>/g)].map(m => m[1]);
assert.deepEqual(planMatches, ['무료 진단','기본 리포트','전문가 리포트'], 'public pricing must expose exactly 3 plan titles');
assert.ok(plans.includes('/checkout?plan=Report'), 'Report checkout link missing');
assert.ok(plans.includes('/checkout?plan=Expert'), 'Expert checkout link missing');

const checkout = read('apps/public/checkout/index.html');
assert.ok(checkout.includes('value="Report"'), 'checkout missing Report option');
assert.ok(checkout.includes('value="Expert"'), 'checkout missing Expert option');
assert.ok(!checkout.includes('value="Auto"') && !checkout.includes('value="FixPack"') && !checkout.includes('value="TemplatePack"'), 'checkout exposes legacy plan option');

const board = read('apps/public/board/index.html');
assert.ok(!board.includes('data-board-stat'), 'board must not render stat counter cards');
assert.ok(!/전체\s*칼럼\s*0|자동\s*발행\s*0|최근\s*7일\s*0/.test(board), 'board must not contain zero-counter copy');
assert.ok(board.includes('새 칼럼 엔진'), 'board must explain the new column engine');
assert.ok(board.includes('검색 로봇도 읽고'), 'board must be search/reader friendly');

const boardApp = read('apps/public/board/app.js');
assert.ok(!boardApp.includes('data-board-stat'), 'board app must not depend on counter cards');
assert.ok(boardApp.includes('/api/public/board'), 'board app must load public board endpoint');

const publicRoute = read('server/routes/public.mjs');
assert.ok(publicRoute.includes('buildPublicColumnEnginePosts'), 'public board API must use column engine');
assert.ok(!publicRoute.includes('stats,\n  activity'), 'public board API must not expose old stats block');
assert.ok(!/const\s+stats\s*=\s*publicColumnStats/.test(publicRoute), 'public board API must not compute public counter stats');

const columnEngine = read('server/core/public-column-engine.mjs');
for (const heading of ['한눈에 보는 핵심','왜 지금 중요한가','실제 적용 순서','문구 예시','검증 체크리스트','검색 유입을 고려한 구성','자주 묻는 질문','다음 행동']) {
  assert.ok(columnEngine.includes(heading), `column engine missing structure heading ${heading}`);
}

const workOrder = read('PHASE249_REMAINING_ELEMENTS_WORK_ORDER_20260512_KO.md');
assert.ok(workOrder.includes('총 39개 요소'), 'work order must include remaining element count');
assert.ok(workOrder.includes('39개 전부 처리'), 'work order must state all elements handled');

console.log(JSON.stringify({ ok: true, publicPages: publicPages.length, menuItems: menu.length, handledElements: 39, bannedTokens: bannedPublicTokens.length }, null, 2));
