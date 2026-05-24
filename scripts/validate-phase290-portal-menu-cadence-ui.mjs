import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const portalHtml = read('apps/public/portal/index.html');
const portalCss = read('shared/portal-phase283-dashboard.css');
const portalJs = read('apps/public/portal/app.js');
const serverIndex = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const productSuite = read('server/core/product-agent-suite.mjs');
const pkg = JSON.parse(read('package.json'));

const checks = [
  {
    key: 'exactTwentyMinuteServerCadence',
    weight: 16,
    pass: serverIndex.includes('const CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000;')
      && serverIndex.includes('return fallback;')
      && serverIndex.includes('setInterval(() => {\nrunCtaAutopublish')
      && serverIndex.includes('}, CTA_AUTOPUBLISH_INTERVAL_MS);'),
    message: '서버 자동발행 주기 20분에 1회 고정'
  },
  {
    key: 'exactTwentyMinutePublicLabel',
    weight: 12,
    pass: !portalHtml.includes('20분마다')
      && !portalJs.includes('20분마다')
      && !serverIndex.includes('20분마다')
      && !publicRoutes.includes('20분마다')
      && productSuite.includes('20분에 1회 발행'),
    message: 'UI/API 문구 20분에 1회로 통일'
  },
  {
    key: 'topMenuHtml',
    weight: 14,
    pass: (portalHtml.includes('portal290-top-menu') || portalHtml.includes('portal-main-nav'))
      && portalHtml.includes('내 사이트 상단 메뉴')
      && portalHtml.includes('사이트 등록')
      && portalHtml.includes('진단 결과')
      && portalHtml.includes('인사이트'),
    message: '내 사이트 상단 가로 메뉴 추가'
  },
  {
    key: 'topMenuCss',
    weight: 12,
    pass: portalCss.includes('.portal-main-nav') && portalCss.includes('body.portal-shell-body') && portalCss.includes('portal-topbar'),
    message: '좌측 메뉴 의존 제거 및 상단 메뉴 스타일'
  },
  {
    key: 'cleanGridLayout',
    weight: 14,
    pass: (portalCss.includes('.portal-dashboard-grid') || portalCss.includes('.portal-layout'))
      && portalCss.includes('grid-template-columns:repeat(12')
      && portalCss.includes('.portal-score-card')
      && portalCss.includes('.portal-site-card')
      && portalCss.includes('.portal-feed-card'),
    message: '대시보드 카드 배열 재정렬'
  },
  {
    key: 'readabilityTypography',
    weight: 10,
    pass: portalCss.includes('.portal-score-gauge-inner .nv74-score-number') && portalCss.includes('font-size:42px') && portalCss.includes('.portal-score-breakdown b'),
    message: '숫자/본문 시인성 보강'
  },
  {
    key: 'mobileResponsive',
    weight: 8,
    pass: portalCss.includes('@media (max-width:1320px)') && portalCss.includes('@media (max-width:720px)') && portalCss.includes('grid-template-columns:1fr'),
    message: '모바일 상단 메뉴와 카드 배열 대응'
  },
  {
    key: 'previousResiliencePreserved',
    weight: 8,
    pass: pkg.scripts?.['phase289:final'] && exists('docs/PHASE289_STARTUP_AUTOPUBLISH_RESILIENCE.md'),
    message: 'phase289 부팅 안정성 유지'
  },
  {
    key: 'phase290Scripts',
    weight: 6,
    pass: pkg.scripts?.['validate:phase290'] === 'node scripts/validate-phase290-portal-menu-cadence-ui.mjs'
      && pkg.scripts?.['phase290:final']?.includes('phase289:final'),
    message: 'phase290 최종 검증 게이트'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase290',
  score,
  total: 100,
  issue: 'portal top menu, readability, layout and exact 20-minute cadence',
  checks,
  failed,
  report: 'docs/current/PHASE290_PORTAL_MENU_CADENCE_UI_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
