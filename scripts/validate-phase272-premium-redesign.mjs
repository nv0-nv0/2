import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const css = read('shared/veridion-adopted-ui.css');
const home = read('apps/public/home/index.html');
const homeJs = read('apps/public/home/app.js');
const portal = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const plans = read('apps/public/plans/index.html');
const auth = read('apps/public/auth/index.html');
const authJs = read('apps/public/auth/app.js');
const board = read('apps/public/board/index.html');
const allPublic = ['home','plans','portal','auth','board'].map(slug => read(`apps/public/${slug}/index.html`)).join('\n');

add('01 package version is phase272 or phase273', /phase272-premium-redesign|phase273-package-100|phase274-customer-copy-readability/.test(pkg.version));
add('02 final review points phase272 or later final', ['npm run phase272:final','npm run phase273:final','npm run phase274:final'].includes(pkg.scripts?.['final:review']));
add('03 phase272 final gate exists', pkg.scripts?.['phase272:final']?.includes('npm run validate:phase272'));
add('04 phase272 validation script registered', pkg.scripts?.['validate:phase272'] === 'node scripts/validate-phase272-premium-redesign.mjs');
add('05 premium redesign CSS layer exists', css.includes('PHASE272 premium redesign layer') && css.includes('--phase272-blue'));
add('06 no unverifiable customer logo showcase', !/SAMSUNG|LG전자|현대자동차|CJ ENM|Amorepacific|kakaopage|8,000\+ 고객/.test(allPublic));
add('07 homepage instant demo IDs preserved', ['homeInstantDemoForm','homeTargetUrl','homeInstantDemoBtn','homeDemoResult','homeDemoOverlay'].every(token => home.includes(token)));
add('08 homepage uses immediate diagnostics endpoints', homeJs.includes("'/api/diagnostics/start'") && homeJs.includes("'/api/public/diagnose'"));
add('09 homepage result-to-portal handoff preserved', homeJs.includes('beginAutoPortalHandoff') && homeJs.includes("sessionStorage.setItem('nv0:autoHandoff'"));
add('10 homepage infographic flow added', home.includes('phase272-home-flow') && (home.includes('주소 입력부터 내 사이트 관리까지') || home.includes('주소 입력부터 결과 확인까지')) && css.includes('.phase272-flow-grid'));
add('11 homepage factual infographic added', home.includes('phase272-home-facts') && home.includes('공개 페이지 기준 확인') && !home.includes('기업 로고'));
add('12 portal two-column dashboard preserved', portal.includes('portal-dashboard-grid') && css.includes('.portal-dashboard-grid'));
add('13 portal 20-minute publishing status preserved', portal.includes('20분마다 1건') && portalJs.includes('cadenceLabel') && portal.includes('portalPublishCadence'));
add('14 portal metric ring and cards styled', css.includes('conic-gradient(var(--phase272-blue)') && css.includes('.portal-metric-strip'));
add('15 plans staged selection flow added', plans.includes('phase272-plan-flow') && plans.includes('운영 단계에 맞춰 필요한 만큼만 선택합니다'));
add('16 plans factual prices retained', ['무료','₩49,000','₩149,000'].every(token => plans.includes(token)));
add('17 pricing top spacing and footer polished', css.includes('.plans-main') && css.includes('.plans-footer-clean'));
add('18 auth split layout added', auth.includes('phase272-auth-layout') && auth.includes('phase272-auth-aside'));
add('19 auth credential fields remain empty defaults', !/id="(?:loginEmail|loginPassword|registerEmail|registerPassword|resetEmail|resetConfirmEmail|resetPassword)"[^>]*value=/.test(auth));
add('20 auth autofill clearing remains active', authJs.includes('clearCredentialDefaults') && authJs.includes('requestAnimationFrame(clearCredentialDefaults)'));
add('21 board page keeps API-only insight wording', (board.includes('사이트 운영자가 자주 궁금해하는') || board.includes('실제 게시판 API')) && board.includes('20분마다 1건 발행'));
add('22 no route/functionality removing changes', ['portalPrimary','saveSiteForm','portalFeed','portalNextActions'].every(token => portal.includes(token)));
add('23 documentation added', exists('docs/PHASE272_PREMIUM_REDESIGN_REPORT.md'));
add('24 legacy validators accept phase273', ['tests/e2e.mjs','scripts/validate-phase258-structural-hardening.mjs','scripts/validate-phase259-demo-penalty-dashboard.mjs','scripts/validate-phase260-dispute-safe-penalty.mjs','scripts/validate-phase270-full-package-verified.mjs','scripts/validate-phase271-site-ux-insight-polish.mjs'].every(file => (read(file).includes('phase273-package-100') || read(file).includes('phase274-customer-copy-readability'))));

const failedChecks = checks.filter(check => !check.ok);
const passed = checks.length - failedChecks.length;
const report = { generatedAt: new Date().toISOString(), phase: 'phase272-premium-redesign', ok: failedChecks.length === 0, total: checks.length, passed, failed: failedChecks.length, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE272_PREMIUM_REDESIGN_AUDIT.json'), JSON.stringify(report, null, 2));
if (failedChecks.length) {
  console.error(JSON.stringify({ ok: false, passed, failed: failedChecks.length, failedChecks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed, failed: 0, report: 'docs/current/PHASE272_PREMIUM_REDESIGN_AUDIT.json' }, null, 2));
