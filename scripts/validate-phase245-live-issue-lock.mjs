import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
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
const banned = [
  'Customer View',
  'CTA 게시판',
  '자동발행',
  '자동 발행 200',
  'autoPublishedCount',
  'contentFingerprint',
  'combinationMode',
  'publicDisplayVersion',
  'Editorial Board',
  '진단·결제 흐름에 JavaScript가 필요합니다',
  'Trust Flow'
];
const failures = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of banned) {
    if (text.includes(token)) failures.push(`${path.relative(root, file)} contains ${token}`);
  }
  if (/style\s*=/.test(text)) failures.push(`${path.relative(root, file)} has inline style`);
  if ((text.match(/<header class="nv0-topbar"/g) || []).length > 1) failures.push(`${path.relative(root, file)} duplicate header`);
}
const css = fs.readFileSync(path.join(root, 'shared', 'nv0-clean-slate-20260512.css'), 'utf8');
for (const selector of ['.site-topbar', '.cta-banner', '.phase239-board-layout .phase239-board-list', '.article-card.featured']) {
  assert.ok(css.includes(selector), `missing design selector ${selector}`);
}
const board = fs.readFileSync(path.join(root, 'apps/public/board/index.html'), 'utf8');
for (const required of ['검색 노출을 높이는 콘텐츠 구조 설계 방법', 'robots.txt와 sitemap.xml을 올바르게 설정하기', '전환을 만드는 다음 행동 버튼 배치와 문구 전략']) {
  assert.ok(board.includes(required), `board missing static column: ${required}`);
}
assert.deepEqual(failures, []);
console.log(JSON.stringify({ ok: true, checkedFiles: htmlFiles.length, bannedTokens: banned.length }, null, 2));
