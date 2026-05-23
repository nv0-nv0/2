import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const pkg = JSON.parse(read('package.json'));
const portalHtml = read('apps/public/portal/index.html');
const portalCss = read('shared/portal-phase283-dashboard.css');
const agentSuite = read('server/core/product-agent-suite.mjs');
const phase283Audit = exists('docs/current/PHASE283_DASHBOARD_DESIGN_AUDIT.json')
  ? JSON.parse(read('docs/current/PHASE283_DASHBOARD_DESIGN_AUDIT.json'))
  : null;

const allFiles = walk('.');
const checks = [
  {
    key: 'posixSourcePaths',
    weight: 12,
    pass: allFiles.every((file) => !file.includes('\\')),
    message: '소스 트리 경로가 POSIX 슬래시 기준으로 정리됨'
  },
  {
    key: 'sharedDashboardCss',
    weight: 12,
    pass: exists('shared/portal-phase283-dashboard.css') && portalHtml.includes('/shared/portal-phase283-dashboard.css'),
    message: '포털 대시보드 CSS가 shared 리소스로 연결됨'
  },
  {
    key: 'retiredAppCssRemoved',
    weight: 10,
    pass: !portalHtml.includes('/apps/public/portal/app.css'),
    message: 'retired app-level CSS 참조 제거'
  },
  {
    key: 'inlineStyleRemoved',
    weight: 10,
    pass: !/\sstyle\s*=/.test(portalHtml),
    message: '포털 HTML 인라인 style 속성 제거'
  },
  {
    key: 'sidebarShell',
    weight: 10,
    pass: portalHtml.includes('portal-shell-sidebar') && portalHtml.includes('portal-shell-main') && portalCss.includes('.portal-shell-sidebar'),
    message: '승인 디자인의 사이드바/메인 쉘 구조 반영'
  },
  {
    key: 'infographicResult',
    weight: 10,
    pass: portalHtml.includes('portal-score-gauge') && portalHtml.includes('portal-infographic-grid') && portalHtml.includes('portal-risk-meter'),
    message: '최근 점수·서비스 결과 인포그래픽 구조 반영'
  },
  {
    key: 'dynamicIdsPreserved',
    weight: 10,
    pass: ['portalPrimary','portalFeed','portalRiskGauge','saveSiteForm','addSiteToggle','portalPublishCadence'].every((id) => portalHtml.includes(`id="${id}"`)),
    message: '기존 JS 동적 연결 ID 보존'
  },
  {
    key: 'autoPublishDuplicateRetry',
    weight: 8,
    pass: agentSuite.includes("audit.failed[0] === 'notDuplicate'") && agentSuite.includes('retryDraft') && agentSuite.includes('buildProductInsightDraft'),
    message: '20분 자동발행 중복 재시도 안전장치 유지'
  },
  {
    key: 'phase283Audit',
    weight: 10,
    pass: Boolean(phase283Audit?.ok && phase283Audit?.score === 100),
    message: 'phase283 대시보드 감사 100점 기록 유지'
  },
  {
    key: 'phase284Scripts',
    weight: 8,
    pass: pkg.scripts?.['validate:phase284'] === 'node scripts/validate-phase284-package-100.mjs'
      && typeof pkg.scripts?.['phase284:final'] === 'string'
      && pkg.scripts['phase284:final'].includes('phase283:final')
      && pkg.scripts['phase284:final'].includes('validate:phase284'),
    message: 'phase284 최종 검증 스크립트 연결'
  }
];

const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  score,
  total: 100,
  phase: 'phase284',
  package: 'VERIDION phase283 dashboard fixed + POSIX packaging hardening',
  checkedFiles: allFiles.length,
  checks,
  failed,
  report: 'docs/current/PHASE284_PACKAGE_100_AUDIT.json'
};

fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
