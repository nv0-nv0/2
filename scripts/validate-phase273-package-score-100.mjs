import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const css = read('shared/veridion-adopted-ui.css');
const home = read('apps/public/home/index.html');
const homeJs = read('apps/public/home/app.js');
const portal = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const plans = read('apps/public/plans/index.html');
const auth = read('apps/public/auth/index.html');
const authJs = read('apps/public/auth/app.js');
const board = read('apps/public/board/index.html');
const publicFiles = [];
function collect(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${ent.name}`;
    if (ent.isDirectory()) collect(rel);
    if (ent.isFile() && /\.(html|js|css|md)$/.test(ent.name)) publicFiles.push(rel);
  }
}
collect('apps/public');
const publicText = publicFiles.map(read).join('\n');

const categories = [
  {
    name: '기능 보존',
    weight: 20,
    checks: [
      home.includes('homeInstantDemoForm') && home.includes('homeDemoResult'),
      homeJs.includes("'/api/diagnostics/start'") && homeJs.includes("'/api/public/diagnose'"),
      homeJs.includes('beginAutoPortalHandoff') && homeJs.includes('/portal'),
      portal.includes('saveSiteForm') && portal.includes('portalAssetList') && portal.includes('portalPrimary'),
      portalJs.includes('/api/public/board') && portalJs.includes('renderInsightFeed')
    ]
  },
  {
    name: '전체 회귀 검증 연결',
    weight: 15,
    checks: [
      pkg.scripts?.['phase272:final']?.includes('validate:phase272'),
      pkg.scripts?.['phase273:final']?.includes('phase272:final'),
      pkg.scripts?.['validate:phase273'] === 'node scripts/validate-phase273-package-score-100.mjs',
      ['npm run phase273:final','npm run phase274:final'].includes(pkg.scripts?.['final:review']),
      exists('scripts/validate-phase272-premium-redesign.mjs'),
      ['tests/e2e.mjs','scripts/validate-phase258-structural-hardening.mjs','scripts/validate-phase259-demo-penalty-dashboard.mjs','scripts/validate-phase260-dispute-safe-penalty.mjs','scripts/validate-phase270-full-package-verified.mjs','scripts/validate-phase271-site-ux-insight-polish.mjs','scripts/validate-phase272-premium-redesign.mjs'].every(file => (read(file).includes('phase273-package-100') || read(file).includes('phase274-customer-copy-readability|phase278-customer-perfect')))
    ]
  },
  {
    name: 'UI/UX 리디자인 완성도',
    weight: 20,
    checks: [
      css.includes('PHASE272 premium redesign layer') && css.includes('--phase272-blue'),
      home.includes('phase272-home-flow') && home.includes('phase272-home-facts'),
      css.includes('.portal-dashboard-grid') && css.includes('conic-gradient(var(--phase272-blue)'),
      plans.includes('phase272-plan-flow') && css.includes('.plans-footer-clean'),
      auth.includes('phase272-auth-layout') && css.includes('.phase272-auth-aside')
    ]
  },
  {
    name: '사실성·허위문구 방지',
    weight: 10,
    checks: [
      !/SAMSUNG|LG전자|현대자동차|CJ ENM|Amorepacific|kakaopage|8,000\+ 고객|고객이 신뢰합니다/.test(publicText),
      (board.includes('사이트 운영자가 자주 궁금해하는') || board.includes('실제 게시판 API')),
      home.includes('공개 페이지 기준') && home.includes('확인 필요'),
      (plans.includes('무료 진단으로 상태를 확인하고') || plans.includes('무료 진단으로 현재 상태를 먼저 확인하고')) && !plans.includes('20% 할인'),
      exists('docs/PHASE272_PREMIUM_REDESIGN_REPORT.md')
    ]
  },
  {
    name: '인사이트·자동 발행',
    weight: 10,
    checks: [
      portal.includes('portalPublishCadence') && portal.includes('20분마다 1건'),
      portalJs.includes('cadenceLabel') && portalJs.includes('intervalMinutes || 20') && portalJs.includes('분마다 1건'),
      board.includes('20분마다 1건 발행'),
      portal.includes('portalFeed') && portalJs.includes('/api/public/board') && portalJs.includes('renderInsightFeed'),
      portal.includes('인사이트와 발행 기록')
    ]
  },
  {
    name: '로그인 기본값·보안 입력',
    weight: 5,
    checks: [
      !/id="(?:loginEmail|loginPassword|registerEmail|registerPassword|resetEmail|resetConfirmEmail|resetPassword)"[^>]*value=/.test(auth),
      authJs.includes('clearCredentialDefaults'),
      auth.includes('autocomplete="new-password"'),
      auth.includes('phase272-auth-layout'),
      (auth.includes('개인정보 보호') || auth.includes('빈칸 기본값 유지'))
    ]
  },
  {
    name: '요금·하단 영역',
    weight: 5,
    checks: [
      ['무료','₩49,000','₩149,000'].every(token => plans.includes(token)),
      plans.includes('plans-footer-clean'),
      plans.includes('자주 묻는 질문'),
      plans.includes('운영 단계에 맞춰 필요한 만큼만 선택합니다'),
      css.includes('.plans-main')
    ]
  },
  {
    name: '배포·보안 검증 자산',
    weight: 10,
    checks: [
      exists('Dockerfile') && exists('docker-compose.yml'),
      exists('deploy/docker-compose.coolify.yml'),
      exists('scripts/verify-security.mjs'),
      exists('scripts/validate-deploy-bundle.mjs'),
      exists('.github/workflows/ci.yml') && (read('.github/workflows/ci.yml').includes('npm run phase273:final') || read('.github/workflows/ci.yml').includes('npm run phase274:final')) && (read('RUN_ALL_TESTS.sh').includes('npm run phase273:final') || read('RUN_ALL_TESTS.sh').includes('npm run phase274:final'))
    ]
  },
  {
    name: '납품 패키징·문서화',
    weight: 5,
    checks: [
      /phase273-package-100|phase274-customer-copy-readability|phase278-customer-perfect/.test(pkg.version),
      /100점/.test(read('docs/PHASE273_PACKAGE_SCORECARD_100.md')),
      exists('docs/PHASE273_PACKAGE_SCORECARD_100.md'),
      exists('docs/current/PHASE272_PREMIUM_REDESIGN_AUDIT.json'),
      read('DELIVERY_README.txt').includes('Phase273') && read('DELIVERY_README.txt').includes('Phase274')
    ]
  }
];

const scored = categories.map(cat => {
  const passed = cat.checks.filter(Boolean).length;
  const total = cat.checks.length;
  const score = Math.round((cat.weight * passed / total) * 100) / 100;
  return { name: cat.name, weight: cat.weight, passed, total, score, ok: passed === total };
});
const score = Math.round(scored.reduce((sum, cat) => sum + cat.score, 0) * 100) / 100;
const ok = score === 100 && scored.every(cat => cat.ok);
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'phase273-package-100',
  score,
  maxScore: 100,
  grade: ok ? 'A+ / 100' : 'needs-fix',
  ok,
  categories: scored
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE273_PACKAGE_SCORECARD_100.json'), JSON.stringify(report, null, 2));
if (!ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, score, grade: report.grade, report: 'docs/current/PHASE273_PACKAGE_SCORECARD_100.json' }, null, 2));
