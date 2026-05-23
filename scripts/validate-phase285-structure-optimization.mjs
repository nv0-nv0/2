import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const pkg = JSON.parse(read('package.json'));
const treeDoc = exists('docs/PROJECT_STRUCTURE_TREE.md') ? read('docs/PROJECT_STRUCTURE_TREE.md') : '';
const treeJson = exists('docs/current/PROJECT_STRUCTURE_TREE.json') ? JSON.parse(read('docs/current/PROJECT_STRUCTURE_TREE.json')) : null;
const portalHtml = read('apps/public/portal/index.html');
const portalJs = read('apps/public/portal/app.js');
const dashboardCss = read('shared/portal-phase283-dashboard.css');
const phase284Audit = exists('docs/current/PHASE284_PACKAGE_100_AUDIT.json') ? JSON.parse(read('docs/current/PHASE284_PACKAGE_100_AUDIT.json')) : null;

const checks = [
  {
    key: 'structureTreeDoc',
    weight: 14,
    pass: treeDoc.includes('## Structure Tree') && treeDoc.includes('Optimized Responsibility Map'),
    message: '구조 트리 문서와 책임 맵 생성'
  },
  {
    key: 'structureTreeJson',
    weight: 12,
    pass: Boolean(treeJson?.ok && treeJson?.summary?.files >= 250 && Array.isArray(treeJson?.keyFiles)),
    message: '기계 판독용 구조 트리 JSON 생성'
  },
  {
    key: 'keyFileCoverage',
    weight: 14,
    pass: Boolean(treeJson?.keyFiles?.every((item) => item.exists === true)),
    message: '핵심 파일 매트릭스 전부 존재 확인'
  },
  {
    key: 'dashboardCssShared',
    weight: 10,
    pass: portalHtml.includes('/shared/portal-phase283-dashboard.css') && !portalHtml.includes('/apps/public/portal/app.css'),
    message: '포털 대시보드 CSS shared 경로 유지'
  },
  {
    key: 'portalShellStable',
    weight: 10,
    pass: ['portal-shell-sidebar', 'portal-shell-topbar', 'portal-dashboard-grid'].every((token) => portalHtml.includes(token)) && dashboardCss.includes('.portal-shell-sidebar'),
    message: '승인 대시보드 쉘 구조 유지'
  },
  {
    key: 'dynamicIdsStable',
    weight: 10,
    pass: ['portalPrimary','portalFeed','portalRiskGauge','saveSiteForm','addSiteToggle','portalPublishState'].every((id) => portalHtml.includes(`id="${id}"`)),
    message: '기존 동작 ID 유지'
  },
  {
    key: 'gaugeRuntimeStable',
    weight: 8,
    pass: portalJs.includes("style.setProperty('--gauge'") && !/style\s*=/.test(portalHtml),
    message: '인라인 style 없이 런타임 게이지 갱신 유지'
  },
  {
    key: 'phase284Baseline',
    weight: 10,
    pass: Boolean(phase284Audit?.ok && phase284Audit?.score === 100),
    message: 'phase284 100점 기준 유지'
  },
  {
    key: 'phase285Scripts',
    weight: 8,
    pass: pkg.scripts?.['structure:tree'] === 'node scripts/generate-structure-tree.mjs'
      && pkg.scripts?.['validate:phase285'] === 'node scripts/validate-phase285-structure-optimization.mjs'
      && typeof pkg.scripts?.['phase285:final'] === 'string'
      && pkg.scripts['phase285:final'].includes('phase284:final')
      && pkg.scripts['phase285:final'].includes('structure:tree')
      && pkg.scripts['phase285:final'].includes('validate:phase285'),
    message: 'phase285 구조 최적화 게이트 연결'
  },
  {
    key: 'packageDescriptionUpdated',
    weight: 4,
    pass: /phase285/i.test(pkg.description || '') && /structure/i.test(pkg.description || ''),
    message: '패키지 설명 phase285 구조 최적화 반영'
  }
];
const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
const failed = checks.filter((item) => !item.pass);
const result = {
  ok: failed.length === 0 && score === 100,
  score,
  total: 100,
  phase: 'phase285',
  package: 'VERIDION structure tree optimized hardening',
  checks,
  failed,
  report: 'docs/current/PHASE285_STRUCTURE_OPTIMIZATION_AUDIT.json'
};
fs.mkdirSync(path.join(ROOT, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(ROOT, result.report), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
