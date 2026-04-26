import fs from 'node:fs';

const requiredFiles = [
  'apps/public/portal/index.html',
  'apps/public/portal/app.css',
  'apps/public/portal/app.js'
];
const requiredHtml = [
  'nv74-dashboard-shell',
  '사이트 종합 점수',
  '진행 중인 작업',
  '빠른 실행',
  '가장 효과 큰 개선 실행',
  '게시판 자동 발행',
  '내 사이트',
  '새 사이트 등록'
];
const requiredCss = [
  '--nv74-bg',
  '--nv74-blue',
  '.nv74-sidebar',
  '.nv74-score-card',
  '.nv74-work-card',
  '.nv74-quick-grid',
  '.nv74-site-table',
  '@media(max-width:1180px)'
];
const requiredJs = [
  'renderSavedSites',
  'nv74-site-table',
  "document.getElementById('saveUrl')",
  "document.getElementById('saveName')",
  "document.getElementById('saveMemo')"
];

const fail = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail.push(`missing file: ${file}`);
}
const html = fs.readFileSync('apps/public/portal/index.html', 'utf8');
const css = fs.readFileSync('apps/public/portal/app.css', 'utf8');
const js = fs.readFileSync('apps/public/portal/app.js', 'utf8');
for (const token of requiredHtml) if (!html.includes(token)) fail.push(`portal html missing: ${token}`);
for (const token of requiredCss) if (!css.includes(token)) fail.push(`portal css missing: ${token}`);
for (const token of requiredJs) if (!js.includes(token)) fail.push(`portal js missing: ${token}`);
if (/saveDomain|saveLabel/.test(js)) fail.push('stale broken form variables remain');
if (!/grid-template-columns:280px minmax\(0,1fr\)/.test(css)) fail.push('dashboard shell layout not applied');
if (!/conic-gradient/.test(css)) fail.push('score ring visual not applied');

if (fail.length) {
  console.error('PHASE74 dashboard UI validation failed');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('PHASE74 dashboard UI validation passed: 100/100');
