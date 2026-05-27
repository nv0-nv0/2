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

const commonNav = [
  ['위험 진단', '/products/veridion/demo'],
  ['서비스', '/service'],
  ['요금 안내', '/plans'],
  ['인사이트', '/board'],
  ['내 사이트', '/portal'],
  ['문의하기', '/business-info']
];

const forbiddenLinks = ['/dashboard', '/keywords', '/compare'];
function hasClassToken(className) {
  return new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`).test(html);
}

const checks = [
  {
    key: 'commonHeader',
    weight: 14,
    pass: hasClassToken('nv0n-topbar')
      && hasClassToken('nv0n-topbar-inner')
      && hasClassToken('nv0n-primary-nav')
      && html.includes('aria-current="page" class="nv0n-nav-link is-active" href="/portal"')
      && commonNav.every(([label, href]) => html.includes(`href="${href}"`) && html.includes(label)),
    message: '다른 페이지와 같은 공통 상단 메뉴 적용'
  },
  {
    key: 'noBrokenPortalShortcuts',
    weight: 16,
    pass: forbiddenLinks.every((href) => !html.includes(`href="${href}"`) && !app.includes(`href="${href}"`)),
    message: '깨진 내부 링크 /dashboard /keywords /compare 제거'
  },
  {
    key: 'portalLayoutPreserved',
    weight: 12,
    pass: html.includes('portal-hero-visual')
      && html.includes('portal-score-breakdown')
      && html.includes('portal-quick-grid')
      && html.includes('portal-action-list')
      && html.includes('portal-site-table')
      && html.includes('portal-tools-card'),
    message: '이미지형 포털 대시보드 핵심 섹션 유지'
  },
  {
    key: 'existingRoutesOnly',
    weight: 10,
    pass: html.includes('href="/service"')
      && html.includes('href="/solutions"')
      && html.includes('href="/products/veridion/demo"')
      && html.includes('href="/board"')
      && html.includes('href="/plans"')
      && html.includes('href="/business-info"'),
    message: '실제 존재하는 공개 라우트로만 이동'
  },
  {
    key: 'functionalIdsPreserved',
    weight: 14,
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
    message: '기존 기능 연결 ID 유지'
  },
  {
    key: 'cadence',
    weight: 8,
    pass: html.includes('20분에 1회 발행')
      && app.includes('20분에 1회 발행')
      && !html.includes('20분마다')
      && !app.includes('20분마다'),
    message: '인사이트 20분에 1회 발행 유지'
  },
  {
    key: 'readabilityAndLayout',
    weight: 8,
    pass: css.includes('grid-template-columns:repeat(24,minmax(0,1fr))')
      && css.includes('.portal-score-card{grid-column:1/span 8')
      && css.includes('.portal-quick-card{grid-column:9/span 8')
      && css.includes('.portal-actions-card{grid-column:17/span 8'),
    message: 'PC 기준 대시보드 카드 폭과 배열'
  },
  {
    key: 'responsive',
    weight: 6,
    pass: css.includes('@media (max-width:1180px)') && css.includes('@media (max-width:720px)'),
    message: '태블릿/모바일 반응형 유지'
  },
  {
    key: 'linkGateInFinal',
    weight: 8,
    pass: pkg.scripts?.['phase297:final']?.includes('npm run check:links'),
    message: '최종 게이트에 링크 검사 포함'
  },
  {
    key: 'docs',
    weight: 4,
    pass: exists('docs/PHASE297_FINAL_LINK_NAV_AUDIT.md'),
    message: '수정 리포트 문서화'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  phase: 'phase297',
  score,
  total: 100,
  issue: 'final portal navigation, route integrity, and release gate hardening',
  checkedIds: requiredIds.length,
  checks,
  failed,
  report: 'docs/current/PHASE297_FINAL_LINK_NAV_AUDIT.json'
};

fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
