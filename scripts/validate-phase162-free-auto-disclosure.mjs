import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

const server = read('server/index.mjs');
const routeSources = [server, 'server/routes/public.mjs'].map(item => item === server ? server : (fs.existsSync(path.join(root, item)) ? read(item) : '')).join('\n');
const discovery = read('server/core/free-auto-discovery.mjs');
const disclosure = read('server/core/free-auto-disclosure.mjs');
const demoJs = read('apps/public/veridion-demo/app.js');
const demoHtml = read('apps/public/veridion-demo/index.html');
const env = read('.env.example');
const coolify = read('deploy/coolify.env.bulk.txt');
const pkg = JSON.parse(read('package.json'));

ok('phase162 release marker', (server.includes('phase162-free-auto-disclosure') || server.includes('phase164-zero-cost-hardening-50')) && (pkg.version.includes('phase162-free-auto-disclosure') || pkg.version.includes('phase163-remote-backup-security') || pkg.version.includes('phase164-zero-cost-hardening-50') || pkg.version.includes('phase164')));
ok('free automation env switches exist', ['NV0_TARGET_FETCH_ROBOTS_ENABLED','NV0_TARGET_FETCH_SITEMAP_ENABLED','NV0_TARGET_FETCH_MAX_SITEMAP_URLS','NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES','NV0_TARGET_FETCH_AUTOMATION_LEVEL'].every(token => server.includes(token) && env.includes(token) && coolify.includes(token)));
ok('robots discovery implemented', discovery.includes('fetchTextResource') && discovery.includes('extractSitemapUrlsFromRobots') && discovery.includes('/robots.txt'));
ok('sitemap discovery implemented', discovery.includes('extractUrlsFromSitemap') && discovery.includes('/sitemap.xml') && discovery.includes('sitemap_xml'));
ok('automation discovery included in bundle', server.includes('automationDiscovery') && server.includes('free_auto_home_robots_sitemap_key_path_probe'));
ok('automation disclosure model exists', disclosure.includes('function buildAutomationDisclosure') && disclosure.includes('free_auto_with_explicit_limits'));
ok('automated action plan exists', disclosure.includes('function buildAutomatedActionPlan') && disclosure.includes('auto_first_manual_boundary'));
ok('auto and manual split exists', disclosure.includes('automaticFixes') && disclosure.includes('manualReviews') && disclosure.includes('requiresOperatorApproval: true'));
ok('clear notice avoids hidden failures', discovery.includes('실패 URL 수동확인 항목 자동 고지') && disclosure.includes('자동 확정 불가 항목은 수동확인'));
ok('result contract exposes automation', routeSources.includes('includesAutomationDisclosure: true') && routeSources.includes('includesAutomatedActionPlan: true'));
ok('demo copy shows full auto public probe', demoHtml.includes('전자동 공개 페이지 예비 점검') && demoHtml.includes('robots.txt') && demoHtml.includes('sitemap.xml'));
ok('demo loading states mention auto discovery', demoJs.includes('robots.txt·sitemap.xml') && demoJs.includes('자동 수집'));
ok('demo renders automation disclosure section', demoJs.includes('renderAutomationDisclosure') && demoJs.includes('가능한 것은 자동 처리하고, 불가능한 것은 숨기지 않습니다'));
ok('demo renders automated action plan', demoJs.includes('renderAutomatedActionPlan') && demoJs.includes('자동 초안과 수동확인 항목을 분리했습니다'));
ok('existing zero cost defaults remain', server.includes("const SCAN_PROVIDER = process.env.NV0_SCAN_PROVIDER || 'builtin'") && env.includes('NV0_SCAN_PROVIDER=builtin'));
ok('package scripts registered', pkg.scripts['validate:phase162'] === 'node scripts/validate-phase162-free-auto-disclosure.mjs' && pkg.scripts['phase162:final']);

const banned = [/정확도 보장/g, /절대 놓치지/g, /법적 확정/g, /위반 확정/g, /성과 보장/g, /완벽 보장/g];
for (const [idx, pattern] of banned.entries()) ok(`no impossible overclaim in public demo ${idx + 1}`, !pattern.test(demoHtml + demoJs));

const report = {
  generatedAt: new Date().toISOString(),
  ok: checks.every(item => item.ok),
  phase: 'P162-free-auto-disclosure',
  scope: 'free full-auto public discovery, robots/sitemap, automated drafts, explicit manual boundaries, no paid API dependency',
  total: checks.length,
  passed: checks.filter(item => item.ok).length,
  failed: checks.filter(item => !item.ok).length,
  checks,
  failures: checks.filter(item => !item.ok)
};
fs.writeFileSync(path.join(root, 'PHASE162_FREE_AUTO_DISCLOSURE_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'PHASE162_FREE_AUTO_DISCLOSURE_VALIDATION_20260502.json' }, null, 2));
if (!report.ok) process.exit(1);
