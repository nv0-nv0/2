import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const html = read('apps/public/portal/index.html');
const css = read('shared/portal-phase283-dashboard.css');
const app = read('apps/public/portal/app.js');
const pkg = JSON.parse(read('package.json'));

const mustKeepIds = [
  'addSiteToggle','portalSiteFormPanel','saveSiteForm','saveUrl','saveName','saveMemo','saveSiteState',
  'portalScoreTitle','portalRiskGauge','portalSummaryDomain','portalLatestScanAt','portalIssueCount',
  'portalWarningIssues','portalActionRequiredCount','portalCriticalIssues','portalStatusBanner',
  'portalStatusSummary','portalStatusDetail','portalRiskMeterFill','portalRiskLabelText','portalRiskMeterCaption',
  'portalPublishCadence','portalLastPublishedAt','portalPublishState','portalCompliantSites','portalTotalSites',
  'portalScoreMetrics','portalScoreBars','portalQuickTitle','portalNextTitle','portalNextActions',
  'portalRegisterTitle','portalSitesTitle','portalAssetList','portalPrimary','portalFeedTitle','portalFeed',
  'portalToolsTitle','portalAccountState','portalState','portalShellProfileState'
];

const topMenu = ['대시보드','내 사이트','사이트 등록','진단 결과','인사이트','요금 안내'];
const quickActions = ['새 진단','사이트 저장','재진단','리포트 보기','인사이트','키워드','비교 분석','설정'];

const checks = [
  {
    key: 'freshPortalStructure',
    weight: 12,
    pass: html.includes('portal-page')
      && html.includes('portal-topbar')
      && html.includes('portal-hero')
      && html.includes('portal-dashboard-grid')
      && !html.includes('portal-shell-sidebar"')
      && !html.includes('portal-shell-main"'),
    message: '기존 혼합 구조가 아닌 새 포털 단일 구조'
  },
  {
    key: 'fullWidthDashboard',
    weight: 14,
    pass: css.includes('width:min(100% - 64px,1440px)')
      && css.includes('grid-template-columns:repeat(12,minmax(0,1fr))')
      && css.includes('gap:20px')
      && css.includes('min-height:414px'),
    message: '화면 폭을 제대로 사용하는 1440px / 12컬럼 대시보드'
  },
  {
    key: 'topNavigation',
    weight: 10,
    pass: topMenu.every((label) => html.includes(label))
      && css.includes('grid-template-columns:210px minmax(0,1fr) 240px')
      && css.includes('.portal-main-nav a.is-active'),
    message: '이미지형 상단 메뉴'
  },
  {
    key: 'heroReadable',
    weight: 8,
    pass: html.includes('MY SITE DASHBOARD')
      && css.includes('font-size:56px')
      && css.includes('font-size:17px')
      && css.includes('min-height:134px'),
    message: '크고 읽기 쉬운 내 사이트 헤더'
  },
  {
    key: 'cardPlacement',
    weight: 16,
    pass: css.includes('.portal-score-card{grid-column:1/span 5')
      && css.includes('.portal-quick-card{grid-column:6/span 4')
      && css.includes('.portal-actions-card{grid-column:10/span 3')
      && css.includes('.portal-site-registration-priority{grid-column:1/-1')
      && css.includes('.portal-site-card{grid-column:1/span 6')
      && css.includes('.portal-feed-card{grid-column:7/span 3')
      && css.includes('.portal-tools-card{grid-column:10/span 3'),
    message: '진단/빠른실행/다음행동/등록/현황/인사이트/계정 카드 재배열'
  },
  {
    key: 'notTinyCards',
    weight: 10,
    pass: css.includes('font-size:25px')
      && css.includes('font-size:56px!important')
      && css.includes('min-height:82px')
      && css.includes('min-height:50px'),
    message: '글자/점수/버튼/입력폼 시인성 개선'
  },
  {
    key: 'quickActions',
    weight: 8,
    pass: quickActions.every((label) => html.includes(label) || app.includes(label))
      && html.includes('portal-quick-grid')
      && app.includes('portal-quick-grid'),
    message: '빠른 실행 8개 기능 사용 가능'
  },
  {
    key: 'functionIds',
    weight: 10,
    pass: mustKeepIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 JS 기능 연결 ID 보존'
  },
  {
    key: 'cadence',
    weight: 6,
    pass: html.includes('20분에 1회 발행')
      && app.includes('20분에 1회 발행')
      && !html.includes('20분마다')
      && !app.includes('20분마다'),
    message: '인사이트 발행 주기 20분에 1회'
  },
  {
    key: 'responsive',
    weight: 6,
    pass: css.includes('@media (max-width:1200px)')
      && css.includes('@media (max-width:720px)')
      && css.includes('grid-template-columns:repeat(8,minmax(0,1fr))')
      && css.includes('grid-template-columns:1fr'),
    message: '태블릿/모바일 재배열'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase295',
  score,
  total: 100,
  issue: 'complete new portal page, not incremental patch',
  checkedIds: mustKeepIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE295_PORTAL_COMPLETE_REBUILD_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
