import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

for (const file of [
  'server/index.mjs',
  'server/routes/public.mjs',
  'shared/veridion-clean-v310.css',
  'apps/public/portal/index.html',
  'apps/public/portal/app.js',
  'apps/public/board/index.html',
  'apps/public/board/app.js',
  'apps/public/home/index.html',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'Dockerfile',
  'package.json'
]) add(`exists:${file}`, exists(file));

const pkg = JSON.parse(read('package.json'));
add('package:phase310-version', /phase310-clean-rebuild/.test(pkg.version));

const portal = read('apps/public/portal/index.html');
const board = read('apps/public/board/index.html');
const portalJs = read('apps/public/portal/app.js');
const boardJs = read('apps/public/board/app.js');
const cleanCss = read('shared/veridion-clean-v310.css');
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');

for (const token of ['data-veridion-clean="v310"', '/shared/veridion-clean-v310.css', '내 사이트 관리', '20분 인사이트 발행', '새 사이트 등록', 'portalRiskGauge', 'saveSiteForm', 'portalFeed']) add(`portal:${token}`, portal.includes(token));
for (const blocked of ['phase307', 'phase309', 'portal-phase283-dashboard', 'nv0n-generated.css', 'visual-dots', 'hero-bookmark']) add(`portal:no-${blocked}`, !portal.includes(blocked));
for (const token of ['data-veridion-clean="v310"', '/shared/veridion-clean-v310.css', '온라인 사업자를 위한 신뢰 점검 인사이트', '20분에 1회 발행', 'boardList', 'boardSearchForm']) add(`board:${token}`, board.includes(token));
for (const blocked of ['phase264', 'phase307', 'nv0n-generated.css', 'CTA 목적 칼럼']) add(`board:no-${blocked}`, !board.includes(blocked));

for (const token of ['requestJson', '/api/public/account', '/api/public/board?page=1&pageSize=3', 'renderSummary', 'renderSites', '로그인 후 사이트를 저장']) add(`portal-js:${token}`, portalJs.includes(token));
for (const token of ['fallbackPosts', '/api/public/board?', 'renderPagination', '20분에 1회 발행', 'AbortController']) add(`board-js:${token}`, boardJs.includes(token));
for (const token of ['v310-topbar', 'v310-hero', 'v310-grid', 'v310-card', '@media (max-width:720px)', 'overflow-x:hidden']) add(`css:${token}`, cleanCss.includes(token));

add('server:skip-legacy-css-clean-pages', server.includes('data-veridion-clean="v310"') && server.includes('injectAdoptedUi'));
for (const route of ['/', '/portal', '/board', '/products/veridion/demo', '/plans', '/business-info']) add(`route:${route}`, server.includes(`'${route}'`) || server.includes(`"${route}"`));
for (const api of ['/api/public/account', '/api/public/account/sites', '/api/public/board']) add(`api:${api}`, publicRoutes.includes(api));
add('api:20min-cadence', publicRoutes.includes('intervalMinutes') && publicRoutes.includes('actualPublishing'));

const combinedClient = portal + board + portalJs + boardJs + cleanCss;
add('client:no-inline-event-handlers', !/\son(click|submit|change)=/i.test(combinedClient));
add('client:no-console-log', !/console\.log\(/.test(combinedClient));
add('client:no-broken-glyph-source', !/[▤☑⋮✓]/.test(combinedClient));
add('client:no-old-static-date', !/2025\.05\.23|2025-05-23/.test(combinedClient));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), ok: failed === 0, phase: 'phase310-clean-rebuild', total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE310_CLEAN_REBUILD_TEST_SUMMARY.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE310_CLEAN_REBUILD_TEST_SUMMARY.json' }, null, 2));
if (!report.ok) process.exit(1);
