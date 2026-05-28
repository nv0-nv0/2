import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const requiredFiles = [
  'server/index.mjs',
  'server/routes/public.mjs',
  'shared/veridion-clean-v311.css',
  'server/core/privacy-compliance-guard.mjs',
  'server/core/phase313-operations-governance.mjs',
  'apps/public/home/index.html',
  'apps/public/portal/index.html',
  'apps/public/portal/app.js',
  'apps/public/board/index.html',
  'apps/public/board/app.js',
  'apps/public/veridion-demo/index.html',
  'apps/public/plans/index.html',
  'apps/public/auth/index.html',
  'Dockerfile',
  'package.json'
];
for (const file of requiredFiles) add(`exists:${file}`, exists(file));

const pkg = JSON.parse(read('package.json'));
add('package:phase331-version', /phase33[0-9]-|phase32[0-9]-|phase31[3-9]-/.test(pkg.version));

const appHtmlFiles = [];
for (const area of ['apps/public', 'apps/admin']) {
  for (const entry of fs.readdirSync(path.join(root, area), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(area, entry.name, 'index.html');
    if (exists(file)) appHtmlFiles.push(file);
  }
}

for (const file of appHtmlFiles) {
  const html = read(file);
  add(`${file}:v311-css`, html.includes('/shared/veridion-clean-v311.css'));
  add(`${file}:v311-marker`, html.includes('data-veridion-clean="v311"'));
  add(`${file}:no-old-shared-css`, !/nv0-clean-slate|nv0n-generated|nv0n-runtime|phase264-hardening|veridion-adopted-ui|veridion-clean-v310/.test(html));
  add(`${file}:no-inline-event`, !/\son[a-z]+\s*=/.test(html));
  add(`${file}:no-inline-script`, !/<script(?![^>]*src=)(?![^>]*type="application\/ld\+json")/.test(html));
}

const portal = read('apps/public/portal/index.html');
const board = read('apps/public/board/index.html');
const portalJs = read('apps/public/portal/app.js');
const boardJs = read('apps/public/board/app.js');
const cleanCss = read('shared/veridion-clean-v311.css');
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');

for (const token of ['data-veridion-clean="v311"', 'data-veridion-brand="v331"', '/shared/veridion-clean-v311.css', '고객 포털', '내 사이트 관리', '새 사이트 등록', 'portalRiskGauge', 'saveSiteForm', 'portalFeed']) add(`portal:${token}`, portal.includes(token));
for (const token of ['data-veridion-clean="v311"', '/shared/veridion-clean-v311.css', '온라인 사업자를 위한 신뢰 점검 인사이트', '20분에 1회 발행', 'boardList', 'boardSearchForm']) add(`board:${token}`, board.includes(token));
for (const token of ['requestJson', '/api/public/account', '/api/public/board?page=1&pageSize=3', 'renderSummary', 'renderSites', '로그인 후 사이트를 저장']) add(`portal-js:${token}`, portalJs.includes(token));
for (const token of ['fallbackPosts', '/api/public/board?', 'renderPagination', '20분에 1회 발행', 'AbortController']) add(`board-js:${token}`, boardJs.includes(token));
for (const token of ['v311-topbar', 'v311-hero', 'v311-grid', 'v311-card', '@media (max-width:980px)', 'overflow-x:hidden']) add(`css:${token}`, cleanCss.includes(token));

add('server:clean-css-injection', server.includes('/shared/veridion-clean-v311.css') && !server.includes('/shared/veridion-adopted-ui.css'));
for (const route of ['/', '/portal', '/board', '/products/veridion/demo', '/plans', '/business-info']) add(`route:${route}`, server.includes(`'${route}'`) || server.includes(`"${route}"`));
for (const api of ['/api/public/account', '/api/public/account/sites', '/api/public/board']) add(`api:${api}`, publicRoutes.includes(api));
add('api:20min-cadence', publicRoutes.includes('intervalMinutes') && publicRoutes.includes('actualPublishing'));
add('privacy:guard-module', exists('server/core/privacy-compliance-guard.mjs'));
add('privacy:pseudonymous-ip', server.includes('ipHash: pseudonymizeIp(clientIp(req))'));
add('privacy:no-raw-persistent-ip', !/(^|[,{}]\s*)ip:\s*clientIp\(req\)/.test(server + '\n' + publicRoutes));
add('privacy:status-endpoint', server.includes('/api/public/privacy-status') || publicRoutes.includes('/api/public/privacy-status'));
add('governance:status-endpoint', publicRoutes.includes('/api/public/governance-status'));
add('governance:phase313-module', exists('server/core/phase313-operations-governance.mjs') && read('server/core/phase313-operations-governance.mjs').includes('PHASE313_IMPROVEMENT_BACKLOG'));

const oldSharedFiles = ['shared/nv0-clean-slate-20260512.css', 'shared/nv0n-generated.css', 'shared/nv0n-runtime.css', 'shared/nv0n-runtime.js', 'shared/phase264-hardening.css', 'shared/veridion-adopted-ui.css', 'shared/veridion-clean-v310.css'];
for (const file of oldSharedFiles) add(`deleted:${file}`, !exists(file));

const combinedClient = appHtmlFiles.map(read).join('\n') + '\n' + cleanCss + '\n' + ['apps/public/home/app.js','apps/public/veridion-demo/app.js','apps/public/checkout/app.js','apps/public/portal/app.js','apps/public/board/app.js'].filter(exists).map(read).join('\n');
add('client:no-broken-glyph-source', !/[▤☑⋮✓↗█░⚠◆▣⚖›🤖◎⋈✦◷]/.test(combinedClient));
add('client:no-old-static-date', !/2025\.05\.23|2025-05-23/.test(combinedClient));
add('client:no-console-log', !/console\.log\(/.test(combinedClient));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), ok: failed === 0, phase: 'phase324-complete-delivery', total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE324_TEST_SUMMARY.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE324_TEST_SUMMARY.json' }, null, 2));
if (!report.ok) process.exit(1);
