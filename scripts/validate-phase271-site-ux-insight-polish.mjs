import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pkg = JSON.parse(read('package.json'));
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }

const portalHtml = read('apps/public/portal/index.html');
const portalCss = read('apps/public/portal/app.css');
const portalJs = read('apps/public/portal/app.js');
const plansHtml = read('apps/public/plans/index.html');
const plansCss = read('apps/public/plans/app.css');
const authHtml = read('apps/public/auth/index.html');
const authJs = read('apps/public/auth/app.js');
const server = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');

add('01 phase271/phase272/phase273 package version', /phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100/.test(pkg.version));
add('02 phase271 final gate exists', pkg.scripts?.['phase271:final']?.includes('npm run validate:phase271'));
add('03 final review points phase271', ['npm run phase271:final','npm run phase272:final','npm run phase273:final'].includes(pkg.scripts?.['final:review']));
add('04 CI uses phase271 final', read('.github/workflows/ci.yml').includes('npm run phase271:final') || read('.github/workflows/ci.yml').includes('npm run phase272:final') || read('.github/workflows/ci.yml').includes('npm run phase273:final'));
add('05 RUN_ALL uses phase271 final', read('RUN_ALL_TESTS.sh').includes('npm run phase271:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase272:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase273:final'));

add('06 portal has two-column dashboard shell', portalHtml.includes('portal-dashboard-grid') && portalCss.includes('grid-template-columns:minmax(0,1fr) minmax(360px,430px)'));
add('07 portal assigns main and side columns', ['portal-score-card,.portal-actions-card,.portal-site-card{grid-column:1}', '.nv74-work-card,.portal-feed-card,.portal-tools-card{grid-column:2}'].every(token => portalCss.includes(token)));
add('08 portal infographic summary strip', portalHtml.includes('portal-insight-strip') && portalCss.includes('portal-metric-strip article:before'));
add('09 portal metrics reduced and readable', ['portalCriticalIssues','portalWarningIssues','portalActionRequiredCount','portalSummaryDomain','portalIssueCount','portalCompliantSites'].every(id => portalHtml.includes(id)) && !portalHtml.includes('portalContentStatus'));
add('10 portal site cards use 2-column layout', portalCss.includes('.portal-asset-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
add('11 portal clean footer applied', portalHtml.includes('portal-footer-clean') && portalCss.includes('.portal-footer-inner'));

add('12 portal fetches live board API', portalJs.includes("fetch('/api/public/board?page=1&pageSize=4&filter=all'"));
add('13 portal renders publish status', portalJs.includes('function renderPublishStatus') && portalHtml.includes('portalPublishCadence') && portalHtml.includes('portalLastPublishedAt'));
add('14 portal does not expose member email in visible copy', !/account\?\.customer\?\.email|session\.customer\?\.email|session\.customer\.email/.test(portalJs));
add('15 server portal summary includes publications and fallback columns', server.includes('...(db.publications || [])') && server.includes('buildPublicColumnEnginePosts({ pageSize: 10 })') && server.includes('publicationCadence'));
add('16 board API reports 20-minute cadence', publicRoutes.includes('publicationCadence') && publicRoutes.includes('intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)') && publicRoutes.includes('lastPublishedAt'));
add('17 runtime default autopublish interval is 20 minutes', server.includes('const CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000') && server.includes('setInterval(() =>') && server.includes('CTA_AUTOPUBLISH_INTERVAL_MS'));

add('18 plans hero is before pricing grid', plansHtml.indexOf('class="plans-hero"') > -1 && plansHtml.indexOf('class="plans-hero"') < plansHtml.indexOf('class="plans-grid"'));
add('19 plans has comfortable top spacing', plansCss.includes('.plans-main') && /padding:54px 0 54px/.test(plansCss));
add('20 plans footer is clean and main-page-like', plansHtml.includes('plans-footer-clean') && plansCss.includes('.plans-footer-inner'));
add('21 auth inputs default blank and no stored email value', !/id="(?:loginEmail|loginPassword|registerEmail|registerPassword|resetEmail|resetConfirmEmail|resetPassword)"[^>]*value=/.test(authHtml) && !/@/.test(authHtml.match(/<main[\s\S]*?<\/main>/)?.[0] || ''));
add('22 auth clears browser/autofill defaults repeatedly', authJs.includes('clearCredentialDefaults') && authJs.includes('requestAnimationFrame(clearCredentialDefaults)') && authJs.includes("window.addEventListener('pageshow', clearCredentialDefaults)"));

const failed = checks.filter(item => !item.ok);
const passed = checks.length - failed.length;
const report = { generatedAt: new Date().toISOString(), phase: 'phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100', ok: failed.length === 0, total: checks.length, passed, failed: failed.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE271_SITE_UX_INSIGHT_POLISH_AUDIT.json'), JSON.stringify(report, null, 2));
if (failed.length) {
  console.error(JSON.stringify({ ok: false, passed, failed: failed.length, failedChecks: failed }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed, failed: 0, report: 'docs/current/PHASE271_SITE_UX_INSIGHT_POLISH_AUDIT.json' }, null, 2));
