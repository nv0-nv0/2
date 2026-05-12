import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const publicDir = path.join(root, 'apps', 'public');
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'index.html') htmlFiles.push(full);
  }
}
walk(publicDir);
const bannedPublicHtml = [
  'Customer View',
  'CTA 게시판',
  '자동발행',
  '자동 발행',
  '자동 발행 200',
  'autoPublishedCount',
  'contentFingerprint',
  'combinationMode',
  'publicDisplayVersion',
  'Editorial Board',
  '진단·결제 흐름에 JavaScript가 필요합니다',
  'Trust Flow',
  '본문이 준비되지',
  '상품 정보를 불러오고',
  '불러오고 있습니다',
  'undefined',
  'NaN'
];
const failures = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of bannedPublicHtml) {
    if (text.includes(token)) failures.push(`${path.relative(root, file)} contains ${token}`);
  }
  if ((text.match(/<header class="nv0-topbar"/g) || []).length > 1) failures.push(`${path.relative(root, file)} duplicate static header`);
}
const boardHtml = read('apps/public/board/index.html');
for (const token of ['data-filter="seo"', 'data-filter="content"', 'data-filter="technical"', '전문가 칼럼', '검색 노출을 높이는 콘텐츠 구조 설계 방법']) {
  assert.ok(boardHtml.includes(token), `board page missing ${token}`);
}
assert.ok(!boardHtml.includes('data-filter="cta"'), 'board still has legacy cta filter');
assert.ok(!boardHtml.includes('data-filter="case"'), 'board still has legacy case filter');
assert.ok(!boardHtml.includes('data-filter="notice"'), 'board still has legacy notice filter');
const css = read('shared/nv0-clean-slate-20260512.css');
for (const selector of ['.site-topbar-inner', '.unified-trust-dashboard', '.utd-top-grid', '.utd-columns', '.result-tabbed-ia', '.result-tab-button', '.demo-progress-panel', '.demo-progress-steps']) {
  assert.ok(css.includes(selector), `missing CSS selector ${selector}`);
}
const server = read('server/index.mjs');
assert.ok(server.includes('site-topbar-inner'), 'server top menu does not use inner container');
assert.ok(server.includes('/shared/nv0-clean-slate-20260512.css'), 'server error page does not use clean-slate CSS');
assert.ok(server.includes('publicBoardBodyFor(source, index)'), 'public board API does not guarantee full body fallback');
const publicRoutes = read('server/routes/public.mjs');
assert.ok(publicRoutes.includes("pathname === '/api/public/diagnose'"), 'demo diagnose endpoint is missing');
assert.ok(publicRoutes.includes('buildPublicDiagnosisPackage(scan)'), 'demo diagnose endpoint does not return diagnosis package');
assert.ok(publicRoutes.includes('publicationCadence'), 'public diagnosis engine still missing public cadence label');
assert.ok(!publicRoutes.includes('autoPublish:'), 'public diagnosis engine still exposes autoPublish key');
assert.ok(publicRoutes.includes('mergedBoardMap'), 'public board route does not merge seed columns with existing posts');
const demoJs = read('apps/public/veridion-demo/app.js');
for (const token of ['renderUnifiedDashboard', 'unified-trust-dashboard', 'result-tabbed-ia', 'dashboardRetryBtn']) {
  assert.ok(demoJs.includes(token), `demo result missing ${token}`);
}
assert.deepEqual(failures, []);
console.log(JSON.stringify({ ok: true, checkedPublicHtml: htmlFiles.length, bannedPublicHtml: bannedPublicHtml.length, focus: ['top-menu','demo-result','board-filters','public-board-api'] }, null, 2));
