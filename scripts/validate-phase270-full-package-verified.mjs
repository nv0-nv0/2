import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

const homeHtml = read('apps/public/home/index.html');
const homeJs = read('apps/public/home/app.js');
const portalJs = read('apps/public/portal/app.js');
const publicRoutes = read('server/routes/public.mjs');
const server = read('server/index.mjs');
const runtimeReport = exists('docs/current/PHASE270_RUNTIME_FLOW_AUDIT.json') ? JSON.parse(read('docs/current/PHASE270_RUNTIME_FLOW_AUDIT.json')) : null;
const phase269Report = exists('docs/current/PHASE269_COMPLETE_20_IMPROVEMENTS_AUDIT.json') ? JSON.parse(read('docs/current/PHASE269_COMPLETE_20_IMPROVEMENTS_AUDIT.json')) : null;

add('01 package version phase270, phase271, phase272, or phase273', /phase270-full-package-verified-hardened|phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100|phase274-customer-copy-readability|phase278-customer-perfect|phase283-dashboard-design-applied/.test(pkg.version));
add('02 final review points current final gate', ['npm run phase270:final','npm run phase271:final','npm run phase272:final','npm run phase273:final','npm run phase274:final','npm run phase278:final'].includes(pkg.scripts?.['final:review']));
add('03 RUN_ALL uses current final gate', read('RUN_ALL_TESTS.sh').includes('npm run phase270:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase271:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase272:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase273:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase274:final','npm run phase278:final'));
add('04 phase270 final includes e2e', pkg.scripts?.['phase270:final']?.includes('npm run test:e2e'));
add('05 phase270 final includes legacy phase validators', ['validate:phase258','validate:phase259','validate:phase260'].every(s => pkg.scripts?.['phase270:final']?.includes(`npm run ${s}`)));
add('06 phase270 final includes runtime API verification', pkg.scripts?.['phase270:final']?.includes('npm run phase270:runtime'));
add('07 phase270 final includes deployment/security checks', pkg.scripts?.['phase270:final']?.includes('npm run verify:security') && pkg.scripts?.['phase270:final']?.includes('npm run validate:deploy'));
add('08 CI workflow uses current final', exists('.github/workflows/ci.yml') && (read('.github/workflows/ci.yml').includes('npm run phase270:final') || read('.github/workflows/ci.yml').includes('npm run phase271:final') || read('.github/workflows/ci.yml').includes('npm run phase272:final') || read('.github/workflows/ci.yml').includes('npm run phase273:final') || read('.github/workflows/ci.yml').includes('npm run phase274:final','npm run phase278:final')));
add('09 e2e accepts current release line', read('tests/e2e.mjs').includes('phase274-customer-copy-readability|phase278-customer-perfect'));
add('10 old validators accept current release line', ['scripts/validate-phase258-structural-hardening.mjs','scripts/validate-phase259-demo-penalty-dashboard.mjs','scripts/validate-phase260-dispute-safe-penalty.mjs'].every(file => read(file).includes('phase274-customer-copy-readability|phase278-customer-perfect')));
add('11 home instant form preserved', homeHtml.includes('homeInstantDemoForm') && homeHtml.includes('homeDemoResult'));
add('12 home uses diagnostics compatibility endpoint first', /SCAN_ENDPOINTS\s*=\s*\['\/api\/diagnostics\/start', '\/api\/public\/diagnose'\]/.test(homeJs));
add('13 home saves local and session handoff state', homeJs.includes("localStorage.setItem('nv0:lastScan'") && homeJs.includes("sessionStorage.setItem('nv0:autoHandoff'"));
add('14 home renders result before redirect', homeJs.includes('renderCompleted') && homeJs.indexOf('setResultHtml(renderCompleted') < homeJs.lastIndexOf('beginAutoPortalHandoff(portalUrl)'));
add('15 server routes legacy diagnostic start through public router', server.includes("pathname === '/api/diagnostics/start'") && publicRoutes.includes('isLegacyDiagnosticStart'));
add('16 public API returns portal/report URLs', publicRoutes.includes('portalUrl') && publicRoutes.includes('redirectUrl') && publicRoutes.includes('reportUrl'));
add('17 portal consumes auto handoff state', portalJs.includes('getAutoHandoff') && portalJs.includes('nv0:autoHandoff'));
add('18 phase269 full 20 improvements still green', phase269Report?.ok === true && phase269Report?.passed === 20);
add('19 runtime flow report green', runtimeReport?.ok === true && runtimeReport?.failed === 0);
add('20 runtime release clean after tests', JSON.stringify(JSON.parse(read('runtime/data/db.json'))) === JSON.stringify(JSON.parse(read('runtime/data/db.seed.json'))) && Array.isArray(JSON.parse(read('runtime/data/sessions.json'))) && JSON.parse(read('runtime/data/sessions.json')).length === 0);

const passed = checks.filter(check => check.ok).length;
const failed = checks.length - passed;
const report = { generatedAt: new Date().toISOString(), phase: 'phase270-full-package-verified-hardened-compatible-phase272', ok: failed === 0, total: checks.length, passed, failed, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE270_FULL_PACKAGE_VERIFIED_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'docs/current/PHASE270_FULL_PACKAGE_VERIFIED_AUDIT.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(checks.filter(check => !check.ok), null, 2));
  process.exit(1);
}
