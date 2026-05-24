import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const html = read('apps/public/portal/index.html');
const css = read('shared/portal-phase283-dashboard.css');
const js = read('apps/public/portal/app.js');
const pkg = JSON.parse(read('package.json'));

const requiredIds = [
  'addSiteToggle','portalSiteFormPanel','saveSiteForm','saveUrl','saveName','saveMemo','saveSiteState',
  'portalScoreTitle','portalRiskGauge','portalSummaryDomain','portalLatestScanAt','portalIssueCount',
  'portalWarningIssues','portalActionRequiredCount','portalCriticalIssues','portalStatusBanner',
  'portalStatusSummary','portalStatusDetail','portalRiskMeterFill','portalRiskLabelText','portalRiskMeterCaption',
  'portalTotalSites','portalCompliantSites','portalScoreMetrics','portalScoreBars','portalQuickTitle',
  'portalNextTitle','portalNextActions','portalRegisterTitle','portalSitesTitle','portalAssetList',
  'portalPrimary','portalFeedTitle','portalPublishCadence','portalLastPublishedAt','portalPublishState',
  'portalFeed','portalToolsTitle','portalAccountState','portalState','portalShellProfileState'
];

const checks = [
  {
    key: 'screenshotTopbar',
    weight: 12,
    pass: html.includes('portal-topbar')
      && html.includes('portal-main-nav')
      && ['대시보드','내 사이트','사이트 등록','진단 결과','인사이트','요금 안내'].every((label) => html.includes(label))
      && css.includes('grid-template-columns:230px minmax(0,1fr) 260px'),
    message: '이미지 기준 상단 메뉴 구조'
  },
  {
    key: 'screenshotHero',
    weight: 8,
    pass: html.includes('portal-hero-art')
      && html.includes('art-card')
      && css.includes('.art-card')
      && css.includes('.art-bars'),
    message: '우측 일러스트가 있는 내 사이트 헤더'
  },
  {
    key: 'topThreeCards',
    weight: 12,
    pass: html.includes('portal-score-card')
      && html.includes('portal-quick-card')
      && html.includes('portal-actions-card')
      && css.includes('.portal-score-card{grid-column:1/span 8')
      && css.includes('.portal-quick-card{grid-column:9/span 8')
      && css.includes('.portal-actions-card{grid-column:17/span 8'),
    message: '상단 3카드 레이아웃'
  },
  {
    key: 'registrationRow',
    weight: 8,
    pass: html.includes('portal-site-registration-priority')
      && css.includes('.portal-site-registration-priority{grid-column:1/span 24')
      && html.lastIndexOf('portal-site-registration-priority') > html.indexOf('portal-actions-card'),
    message: '새 사이트 등록 가로 행'
  },
  {
    key: 'bottomThreeColumns',
    weight: 10,
    pass: css.includes('.portal-site-card{grid-column:1/span 11')
      && css.includes('.portal-feed-card{grid-column:12/span 6')
      && css.includes('.portal-tools-card{grid-column:18/span 7'),
    message: '내 사이트 현황 / 최신 인사이트 / 계정 상태 하단 배열'
  },
  {
    key: 'quickEightActions',
    weight: 10,
    pass: html.includes('portal-quick-grid')
      && (html.match(/<a href=/g) || []).length >= 12
      && ['새 진단','사이트 저장','재진단','리포트 보기','인사이트 보기','키워드 분석','비교 분석','계정 설정'].every((label) => html.includes(label) || js.includes(label)),
    message: '빠른 실행 8개 기능'
  },
  {
    key: 'functionalIdsPreserved',
    weight: 14,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 보존'
  },
  {
    key: 'twentyMinuteCadence',
    weight: 8,
    pass: html.includes('20분에 1회 발행') && js.includes('20분에 1회 발행') && !html.includes('20분마다') && !js.includes('20분마다'),
    message: '인사이트 발행 주기 20분에 1회'
  },
  {
    key: 'legacyGatesCompatible',
    weight: 8,
    pass: html.includes('portal-shell-sidebar')
      && html.includes('portal-infographic-grid')
      && css.includes('PHASE283: package-applied dashboard shell matching approved design')
      && exists('apps/public/portal/app.css'),
    message: '기존 검증 게이트 호환성'
  },
  {
    key: 'phase293Scripts',
    weight: 5,
    pass: pkg.scripts?.['validate:phase293'] === 'node scripts/validate-phase293-screenshot-portal-design.mjs'
      && pkg.scripts?.['phase293:final']?.includes('phase292:final'),
    message: 'phase293 최종 검증 게이트'
  },
  {
    key: 'responsive',
    weight: 5,
    pass: css.includes('@media (max-width:1320px)') && css.includes('@media (max-width:720px)'),
    message: '반응형 레이아웃'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase293',
  score,
  total: 100,
  issue: 'apply provided screenshot-like portal design to package',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE293_SCREENSHOT_PORTAL_DESIGN_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
