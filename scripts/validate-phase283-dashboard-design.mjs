import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (name, ok, points, detail = '') => checks.push({ name, ok: !!ok, points, awarded: ok ? points : 0, detail });

const pkg = JSON.parse(read('package.json'));
const portal = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const sharedDashboardCss = read('shared/portal-phase283-dashboard.css');
const sourcePortalCss = read('apps/public/portal/app.css');
const syntaxCheck = read('scripts/check-source-syntax.mjs');

const registerIndex = portal.indexOf('portal-site-registration-priority');
const dashboardIndex = portal.indexOf('portal-dashboard-grid');

add('package version marks phase283 dashboard design', /phase283-dashboard-design-applied/.test(pkg.version), 10, pkg.version);
add('package exposes phase283 validation scripts', !!pkg.scripts['validate:phase283'] && !!pkg.scripts['phase283:final'], 10);
add('portal uses shared phase283 stylesheet only', portal.includes('/shared/portal-phase283-dashboard.css') && !portal.includes('/apps/public/portal/app.css'), 12);
add('portal html has no inline style attributes', !/style="/.test(portal), 8);
add('dashboard shell markup present', ['portal-shell', 'portal-shell-sidebar', 'portal-shell-topbar', 'portal-shell-content'].every(token => portal.includes(token)), 10);
add('registration stays before dashboard', registerIndex > 0 && dashboardIndex > registerIndex, 8, `register=${registerIndex}, dashboard=${dashboardIndex}`);
add('phase283 css carries approved shell block', sharedDashboardCss.includes('PHASE283: package-applied dashboard shell matching approved design') && sharedDashboardCss.includes('.portal-shell{display:grid'), 12);
add('phase281 and phase282 dashboard refinements preserved', sharedDashboardCss.includes('PHASE281: portal infographic dashboard refinement') && sharedDashboardCss.includes('PHASE282: full page tone unification'), 8);
add('shared dashboard css mirrors source portal stylesheet', sharedDashboardCss.includes(sourcePortalCss.slice(0, 240)) && sharedDashboardCss.includes(sourcePortalCss.slice(-240).trim()), 6);
add('risk gauge default moved to css and remains runtime-updatable', sharedDashboardCss.includes('--gauge:0deg') && portalJs.includes("style.setProperty('--gauge'"), 6);
add('responsive shell collapse preserved', sharedDashboardCss.includes('@media (max-width:1080px)') && sharedDashboardCss.includes('.portal-shell{grid-template-columns:1fr}'), 6);
add('windows source-size check uses normalized paths', syntaxCheck.includes("replace(/\\\\/g, '/')") && syntaxCheck.includes('MONOLITH_COMPAT_LIMITS'), 4);

const score = checks.reduce((sum, check) => sum + check.awarded, 0);
const total = checks.reduce((sum, check) => sum + check.points, 0);
const failed = checks.filter(check => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'phase283-dashboard-design-applied',
  ok: failed.length === 0 && score === 100 && total === 100,
  score,
  total,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE283_DASHBOARD_DESIGN_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, score, total, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE283_DASHBOARD_DESIGN_AUDIT.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
