import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const html = read('apps/public/portal/index.html');
const css = read('shared/portal-phase283-dashboard.css');
const app = read('apps/public/portal/app.js');
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
    key: 'referenceTopbar',
    weight: 10,
    pass: css.includes('height:74px')
      && css.includes('grid-template-columns:260px minmax(0,1fr) 120px')
      && ['대시보드','내 사이트','사이트 등록','진단 결과','인사이트','요금 안내'].every((text) => html.includes(text)),
    message: '참조 이미지와 같은 상단 메뉴'
  },
  {
    key: 'referenceHero',
    weight: 10,
    pass: html.includes('hero-bookmark')
      && html.includes('portal-hero-visual')
      && css.includes('font-size:45px')
      && css.includes('height:164px'),
    message: '큰 내 사이트 헤더와 우측 일러스트'
  },
  {
    key: 'topThreeCards',
    weight: 14,
    pass: css.includes('.portal-score-card{grid-column:1/span 8')
      && css.includes('.portal-quick-card{grid-column:9/span 8')
      && css.includes('.portal-actions-card{grid-column:17/span 8')
      && css.includes('min-height:330px'),
    message: '상단 3카드 레이아웃'
  },
  {
    key: 'lowerGrid',
    weight: 12,
    pass: css.includes('.portal-site-registration-priority{grid-column:1/span 24')
      && css.includes('.portal-site-card{grid-column:1/span 11')
      && css.includes('.portal-feed-card{grid-column:12/span 6')
      && css.includes('.portal-tools-card{grid-column:18/span 7'),
    message: '등록 행과 하단 3카드 레이아웃'
  },
  {
    key: 'scoreCard',
    weight: 10,
    pass: html.includes('portal-score-breakdown')
      && html.includes('보안 점수')
      && html.includes('성능 점수')
      && css.includes('width:150px')
      && css.includes('font-size:44px!important'),
    message: '최근 진단 결과 원형 게이지와 4개 점수'
  },
  {
    key: 'quickEightGrid',
    weight: 10,
    pass: html.includes('portal-quick-grid')
      && app.includes('portal-quick-grid')
      && ['새 진단','사이트 저장','재진단','리포트 보기','인사이트','키워드','비교 분석','설정'].every((text) => html.includes(text) || app.includes(text)),
    message: '빠른 실행 8개 버튼'
  },
  {
    key: 'functionIds',
    weight: 14,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 유지'
  },
  {
    key: 'twentyMinute',
    weight: 8,
    pass: html.includes('20분에 1회 발행') && app.includes('20분에 1회 발행') && !html.includes('20분마다') && !app.includes('20분마다'),
    message: '인사이트 20분에 1회 발행'
  },
  {
    key: 'dynamicCompatibility',
    weight: 6,
    pass: css.includes('.portal-site-summary') && css.includes('.portal-site-grid') && css.includes('.portal-feed-item') && css.includes('.nv191-action-card'),
    message: '동적 저장 사이트/인사이트/다음 행동 스타일 호환'
  },
  {
    key: 'responsive',
    weight: 6,
    pass: css.includes('@media (max-width:1180px)') && css.includes('@media (max-width:720px)'),
    message: '태블릿/모바일 대응'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase296',
  score,
  total: 100,
  issue: 'apply generated reference image layout to package',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE296_IMAGE_EXACT_PORTAL_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
