import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

function stripVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const publicHtmlFiles = [];
function collectHtml(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${ent.name}`;
    if (ent.isDirectory()) collectHtml(rel);
    if (ent.isFile() && ent.name.endsWith('.html')) publicHtmlFiles.push(rel);
  }
}
collectHtml('apps/public');
const visibleText = publicHtmlFiles.map(file => stripVisible(read(file))).join('\n');
const publicSource = publicHtmlFiles.concat([
  'apps/public/home/app.js',
  'apps/public/portal/app.js',
  'apps/public/board/app.js',
  'apps/public/checkout/app.js',
  'apps/public/veridion-demo/app.js'
].filter(exists)).map(read).join('\n');

const css = read('shared/veridion-adopted-ui.css');
const home = read('apps/public/home/index.html');
const portal = read('apps/public/portal/index.html');
const board = read('apps/public/board/index.html');
const auth = read('apps/public/auth/index.html');
const plans = read('apps/public/plans/index.html');
const checkout = read('apps/public/checkout/index.html');

const bannedVisible = [
  '정리했습니다', '정리합니다', '정적 예시', '카드 간격', '2열 2칸', '같은 톤',
  '내부용', '운영용', '검수', '납품', '고객 로고', '허위', '테스트 통과', '패키지'
];
const bannedSourceStrings = ['무료 데모', '데모 신뢰 점수', '데모 정확도', '결제 후 납품 기준', '검수 기준'];

add('01 package version is phase274', /phase274-customer-copy-readability|phase278-customer-perfect|phase283-dashboard-design-applied/.test(pkg.version));
add('02 final review points to phase274', pkg.scripts?.['final:review'] === 'npm run phase274:final');
add('03 phase274 final gate exists', pkg.scripts?.['phase274:final']?.includes('npm run validate:phase274'));
add('04 customer-facing HTML has no production/internal copy phrases', !bannedVisible.some(term => visibleText.includes(term)), bannedVisible.filter(term => visibleText.includes(term)).join(', '));
add('05 public dynamic source has no old demo/proofing wording', !bannedSourceStrings.some(term => publicSource.includes(term)), bannedSourceStrings.filter(term => publicSource.includes(term)).join(', '));
add('06 board intro is customer-focused', board.includes('사이트 운영자가 자주 궁금해하는') && !board.includes('실제 게시판 API'));
add('07 auth copy is customer-focused and empty defaults preserved', auth.includes('계정 관리를 쉽고 안전하게 시작하세요') && auth.includes('이메일이 자동으로 노출되지 않도록') && !/id="(?:loginEmail|loginPassword|registerEmail|registerPassword|resetEmail|resetConfirmEmail|resetPassword)"[^>]*value=/.test(auth));
add('08 portal copy is customer-focused', portal.includes('최근 진단 결과, 보완 우선순위, 저장한 사이트') && portal.includes('지금 먼저 확인하면 좋은 항목'));
add('09 home copy is customer-focused', home.includes('고객이 결제 전 확인해야 할') && home.includes('발견 항목과 다음 행동을 한눈에'));
add('10 plans copy is customer-focused', plans.includes('무료 진단으로 현재 상태를 먼저 확인하고') && plans.includes('결제 전 사이트 상태를 먼저 확인하는 단계'));
add('11 checkout consent copy is customer-facing', checkout.includes('개인정보처리방침을 확인했습니다') && checkout.includes('내 사이트 관리의 확인 기록에서 확인합니다'));
add('12 no unverifiable enterprise-logo proof text', !/SAMSUNG|LG전자|현대자동차|CJ ENM|Amorepacific|kakaopage|8,000\+ 고객|고객이 신뢰합니다/.test(publicSource));
add('13 readability layer exists', css.includes('PHASE274 customer-facing readability and copy polish layer') && css.includes('--phase274-text:#1e293b'));
add('14 stronger contrast text tokens applied', css.includes('--phase274-title:#07162f') && css.includes('--phase274-muted:#475569'));
add('15 responsive font-size and spacing overrides applied', css.includes('font-size:clamp(34px,4.9vw,58px)') && css.includes('@media (max-width:720px)'));
add('16 primary buttons use higher-contrast blue', css.includes('--phase274-blue:#174fd6') && css.includes('linear-gradient(135deg,var(--phase274-blue)'));
add('17 card hierarchy is tightened', css.includes('box-shadow:0 10px 26px rgba(15,35,70,.06)') && css.includes('padding:clamp(20px,2.2vw,28px)'));
add('18 immediate diagnostic flow preserved', home.includes('homeInstantDemoForm') && read('apps/public/home/app.js').includes("'/api/diagnostics/start'") && read('apps/public/home/app.js').includes('beginAutoPortalHandoff'));
add('19 portal insight publishing preserved', portal.includes('portalPublishCadence') && portal.includes('20분마다 1건') && read('apps/public/portal/app.js').includes('/api/public/board'));
add('20 documentation added', exists('docs/PHASE274_CUSTOMER_COPY_READABILITY_REPORT.md'));

const failedChecks = checks.filter(check => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'phase274-customer-copy-readability|phase278-customer-perfect',
  ok: failedChecks.length === 0,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  total: checks.length,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE274_CUSTOMER_COPY_READABILITY_AUDIT.json'), JSON.stringify(report, null, 2));
if (failedChecks.length) {
  console.error(JSON.stringify({ ok: false, failedChecks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed: report.passed, failed: 0, report: 'docs/current/PHASE274_CUSTOMER_COPY_READABILITY_AUDIT.json' }, null, 2));
