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
  'addSiteToggle',
  'portalShellProfileState',
  'portalSiteFormPanel',
  'saveSiteForm',
  'saveUrl',
  'saveName',
  'saveMemo',
  'saveSiteState',
  'portalScoreTitle',
  'portalRiskGauge',
  'portalLatestScanAt',
  'portalSummaryDomain',
  'portalIssueCount',
  'portalWarningIssues',
  'portalActionRequiredCount',
  'portalRiskLabelText',
  'portalRiskMeterCaption',
  'portalRiskMeterFill',
  'portalStatusBanner',
  'portalStatusSummary',
  'portalStatusDetail',
  'portalPublishCadence',
  'portalLastPublishedAt',
  'portalPublishState',
  'portalCompliantSites',
  'portalCriticalIssues',
  'portalScoreMetrics',
  'portalScoreBars',
  'portalQuickTitle',
  'portalNextActions',
  'portalSitesTitle',
  'portalAssetList',
  'portalPrimary',
  'portalFeedTitle',
  'portalFeed',
  'portalToolsTitle',
  'portalAccountState',
  'portalState'
];

const quickActions = ['새 진단', '사이트 저장', '재진단', '리포트 보기', '인사이트 보기', '키워드 분석', '비교 분석', '계정 설정'];

const checks = [
  {
    key: 'screenshotInspiredTopbar',
    weight: 12,
    pass: html.includes('portal-topbar')
      && html.includes('portal-brand')
      && html.includes('portal-main-nav')
      && ['내 사이트','사이트 등록','진단 결과','사이트 현황','인사이트','요금 안내'].every((text) => html.includes(text)),
    message: '이미지 기준 상단 메뉴 구조'
  },
  {
    key: 'dashboardGridComposition',
    weight: 12,
    pass: html.includes('portal-score-card') && html.includes('portal-quick-card') && html.includes('portal-actions-card') && html.includes('portal-site-registration-priority') && html.includes('portal-site-card') && html.includes('portal-feed-card') && html.includes('portal-tools-card'),
    message: '등록/진단/빠른 실행/제안/현황/인사이트/계정 카드 구성'
  },
  {
    key: 'visualRegisterCard',
    weight: 10,
    pass: html.includes('portal-site-registration-priority') && css.includes('.portal-site-registration-priority') && css.includes('.portal-register-form'),
    message: '이미지와 유사한 새 사이트 등록 행'
  },
  {
    key: 'recentScanCard',
    weight: 10,
    pass: html.includes('portal-score-main') && html.includes('portal-score-breakdown') && css.includes('.portal-score-gauge') && css.includes('.portal-score-breakdown'),
    message: '최근 진단 결과 카드와 원형 점수 게이지'
  },
  {
    key: 'quickActionsEightGrid',
    weight: 10,
    pass: quickActions.every((text) => html.includes(text) || js.includes(text)) && html.includes('portal-quick-grid') && css.includes('.portal-quick-grid'),
    message: '빠른 실행 8개 기능 그리드'
  },
  {
    key: 'siteInsightAccountRows',
    weight: 8,
    pass: css.includes('.portal-site-card{grid-column:1/span 11') && css.includes('.portal-feed-card{grid-column:12/span 6') && css.includes('.portal-tools-card{grid-column:18/span 7'),
    message: '하단 현황/인사이트/계정 카드 배열'
  },
  {
    key: 'functionalityIdsPreserved',
    weight: 14,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 전체 유지'
  },
  {
    key: 'twentyMinuteCadence',
    weight: 8,
    pass: html.includes('20분에 1회 발행')
      && js.includes('20분에 1회 발행')
      && !html.includes('20분마다')
      && !js.includes('20분마다'),
    message: '인사이트 발행 주기 20분에 1회 유지'
  },
  {
    key: 'responsive',
    weight: 8,
    pass: css.includes('@media (max-width:1320px)') && css.includes('@media (max-width:720px)') && css.includes('grid-template-columns:1fr'),
    message: 'PC/태블릿/모바일 반응형 배열'
  },
  {
    key: 'existingGates',
    weight: 8,
    pass: Boolean(pkg.scripts?.['phase291:final'] && pkg.scripts?.['phase290:final'] && pkg.scripts?.['phase289:final']),
    message: '기존 상용/서버/부팅/20분 게이트 유지'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase292',
  score,
  total: 100,
  issue: 'screenshot-inspired portal redesign integrated with existing VERIDION pages',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE292_PORTAL_SCREENSHOT_DESIGN_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
