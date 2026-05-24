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
  'portalPublishCadence','portalLastPublishedAt','portalPublishState','portalCompliantSites','portalTotalSites',
  'portalScoreMetrics','portalScoreBars','portalQuickTitle','portalNextTitle','portalNextActions',
  'portalRegisterTitle','portalSitesTitle','portalAssetList','portalPrimary','portalFeedTitle','portalFeed',
  'portalToolsTitle','portalAccountState','portalState','portalShellProfileState'
];

const checks = [
  {
    key: 'wideMainLayout',
    weight: 14,
    pass: css.includes('width:min(100% - 64px,1440px)')
      && css.includes('grid-template-columns:repeat(12,minmax(0,1fr))')
      && !css.includes('max-width:1780px'),
    message: '화면 폭을 제대로 쓰는 1440px 대시보드 폭'
  },
  {
    key: 'realCardPlacement',
    weight: 16,
    pass: css.includes('.portal-score-card{grid-column:1/span 5')
      && css.includes('.portal-quick-card{grid-column:6/span 4')
      && css.includes('.portal-actions-card{grid-column:10/span 3')
      && css.includes('.portal-site-registration-priority{grid-column:1/-1')
      && css.includes('.portal-site-card{grid-column:1/span 6')
      && css.includes('.portal-feed-card{grid-column:7/span 3')
      && css.includes('.portal-tools-card{grid-column:10/span 3'),
    message: '진단/빠른실행/다음행동/등록/현황/인사이트/계정 카드 배열'
  },
  {
    key: 'notTinyTypography',
    weight: 12,
    pass: css.includes('font-size:56px')
      && css.includes('font-size:25px')
      && css.includes('font-size:56px!important')
      && css.includes('min-height:414px'),
    message: '작게 찌그러지지 않는 제목/점수/카드 크기'
  },
  {
    key: 'topMenuWorks',
    weight: 10,
    pass: html.includes('portal-main-nav')
      && ['대시보드','내 사이트','사이트 등록','진단 결과','인사이트','요금 안내'].every((label) => html.includes(label)),
    message: '상단 메뉴 명확화'
  },
  {
    key: 'quickActionsPreserved',
    weight: 10,
    pass: html.includes('portal-quick-grid')
      && js.includes('portal-quick-grid')
      && ['새 진단','사이트 저장','재진단','리포트 보기','인사이트','키워드','비교 분석','설정'].every((label) => html.includes(label) || js.includes(label)),
    message: '빠른 실행 8개 기능'
  },
  {
    key: 'functionalIds',
    weight: 14,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 유지'
  },
  {
    key: 'twentyMinuteCadence',
    weight: 8,
    pass: html.includes('20분에 1회 발행') && js.includes('20분에 1회 발행') && !html.includes('20분마다') && !js.includes('20분마다'),
    message: '인사이트 20분에 1회 발행 유지'
  },
  {
    key: 'responsiveNotBroken',
    weight: 8,
    pass: css.includes('@media (max-width:1200px)')
      && css.includes('@media (max-width:720px)')
      && css.includes('.portal-quick-grid{grid-template-columns:repeat(4,1fr)}')
      && css.includes('.portal-quick-grid{grid-template-columns:repeat(2,1fr)}'),
    message: '태블릿/모바일 배열'
  },
  {
    key: 'previousGateScripts',
    weight: 4,
    pass: Boolean(pkg.scripts?.['phase293:final'] && pkg.scripts?.['phase292:final'] && pkg.scripts?.['phase289:final']),
    message: '이전 게이트 유지'
  },
  {
    key: 'phase294Scripts',
    weight: 4,
    pass: pkg.scripts?.['validate:phase294'] === 'node scripts/validate-phase294-portal-real-layout.mjs'
      && pkg.scripts?.['phase294:final']?.includes('phase293:final'),
    message: 'phase294 최종 게이트'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase294',
  score,
  total: 100,
  issue: 'fix actually broken portal layout from screenshot',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE294_PORTAL_REAL_LAYOUT_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
