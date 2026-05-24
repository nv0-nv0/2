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

const checks = [
  {
    key: 'cleanSingleShell',
    weight: 12,
    pass: html.includes('class="portal-page"')
      && html.includes('class="portal-topbar"')
      && !html.includes('class="portal-shell-sidebar"')
      && !html.includes('class="portal-shell-main"'),
    message: '좌측/상단 혼합 구조 제거 후 단일 상단 대시보드 구조'
  },
  {
    key: 'usableTopNavigation',
    weight: 12,
    pass: html.includes('portal-main-nav')
      && ['내 사이트','사이트 등록','진단 결과','사이트 현황','인사이트','요금 안내'].every((text) => html.includes(text)),
    message: '내 사이트 상단 메뉴 명확화'
  },
  {
    key: 'functionalIdsPreserved',
    weight: 16,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 전체 유지'
  },
  {
    key: 'layoutGrid',
    weight: 12,
    pass: css.includes('grid-template-columns:repeat(24') && css.includes('.portal-score-card{grid-column:1/span 8') && css.includes('.portal-site-card{grid-column:1/span 11') && css.includes('.portal-feed-card{grid-column:12/span 6'),
    message: '카드 배열 12컬럼 기준으로 재설계'
  },
  {
    key: 'readability',
    weight: 12,
    pass: css.includes('.portal-hero h1') && css.includes('font-size:42px') && css.includes('.portal-score-breakdown b') && css.includes('line-height:1.45'),
    message: '제목/점수/카드 숫자/본문 시인성 기준'
  },
  {
    key: 'cssResetNoLegacyConflict',
    weight: 10,
    pass: !css.includes('PHASE290')
      && !css.includes('portal290-top-menu')
      && css.includes('body.portal-shell-body'),
    message: '누적 CSS 충돌 제거'
  },
  {
    key: 'twentyMinuteCadence',
    weight: 10,
    pass: html.includes('20분에 1회 발행')
      && js.includes('20분에 1회')
      && !html.includes('20분마다')
      && !js.includes('20분마다'),
    message: '인사이트 20분에 1회 표시 유지'
  },
  {
    key: 'dynamicQuickActionsClean',
    weight: 6,
    pass: js.includes('사이트 저장')
      && js.includes('다시 진단')
      && js.includes('20분에 1회 발행 상태')
      && !js.includes('바로 할 수 있는 일'),
    message: '빠른 실행 동적 영역 정리'
  },
  {
    key: 'mobileResponsive',
    weight: 5,
    pass: css.includes('@media (max-width:1320px)') && css.includes('@media (max-width:720px)') && css.includes('grid-template-columns:1fr'),
    message: '반응형 배열 유지'
  },
  {
    key: 'phase291Scripts',
    weight: 5,
    pass: pkg.scripts?.['validate:phase291'] === 'node scripts/validate-phase291-portal-redesign-clean.mjs'
      && pkg.scripts?.['phase291:final']?.includes('phase290:final'),
    message: 'phase291 최종 검증 게이트'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase291',
  score,
  total: 100,
  issue: 'portal page clean redesign with preserved functionality',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE291_PORTAL_REDESIGN_CLEAN_AUDIT.json'
};
fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
