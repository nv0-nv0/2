import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = {
  service: 'server/core/service-quality-220.mjs',
  diagnosis: 'server/core/diagnosis-report-package.mjs',
  premium: 'server/core/premium-asset-builder.mjs',
  index: 'server/index.mjs',
  publicRoute: 'server/routes/public.mjs',
  demoJs: 'apps/public/veridion-demo/app.js',
  demoCss: 'apps/public/veridion-demo/app.css',
  portalJs: 'apps/public/portal/app.js',
  readme: 'README.md'
};
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, message: error.message }); }
}
function read(file) { return fs.readFileSync(file, 'utf8'); }

check('service exposes phase227 builders', () => {
  const s = read(files.service);
  assert.ok(s.includes('phase229-value-priced-quality-lock-v1'));
  assert.ok(s.includes('buildDemoIssueOverview'));
  assert.ok(s.includes('buildPaidFullDetailContract'));
  assert.ok(s.includes('buildSiteOperationsDocument'));
  assert.ok(s.includes('free_demo_problem_area_element_count_only'));
  assert.ok(s.includes('paid_full_detail_100_percent_disclosure'));
});
check('public diagnosis includes free demo overview', () => {
  const s = read(files.diagnosis);
  assert.ok(s.includes('demoIssueOverview'));
  assert.ok(s.includes('freeDemoContract'));
});
check('premium asset includes paid full detail and operations document', () => {
  const s = read(files.premium);
  assert.ok(s.includes('paidFullDetailContract'));
  assert.ok(s.includes('siteOperationsDocument'));
  assert.ok(s.includes('유료 전체 공개 게이트'));
});
check('scan pipeline attaches demo overview and guidance document metadata', () => {
  const s = read(files.index);
  assert.ok(s.includes('buildDemoIssueOverview'));
  assert.ok(s.includes('operationsDocument'));
  assert.ok(s.includes('qualityScore: operationsDocument.qualityScore'));
});
check('paid scan-detail API exposes full contract', () => {
  const s = read(files.publicRoute);
  assert.ok(s.includes('buildPaidFullDetailContract'));
  assert.ok(s.includes('siteOperationsDocument'));
  assert.ok(s.includes('paidAccess: true'));
});
check('demo UI renders problem area element count and paid full detail', () => {
  const s = read(files.demoJs);
  assert.ok(s.includes('renderDemoIssueOverview'));
  assert.ok(s.includes('문제 영역·영향 요소·갯수 요약'));
  assert.ok(s.includes('renderPaidFullDetailContract'));
  assert.ok(s.includes('renderSiteOperationsDocument'));
});
check('demo CSS includes phase227 grids', () => {
  const s = read(files.demoCss);
  assert.ok(s.includes('.demo-issue-kpis'));
  assert.ok(s.includes('.paid-detail-grid'));
  assert.ok(s.includes('.operations-section-grid'));
});
check('portal renders phase227 asset fields', () => {
  const s = read(files.portalJs);
  assert.ok(s.includes('phase227PaidContract'));
  assert.ok(s.includes('phase227OperationsDoc'));
});
check('README documents phase227 behavior', () => {
  const s = read(files.readme);
  assert.ok(s.includes('Phase227'));
  assert.ok(s.includes('문제 영역'));
  assert.ok(s.includes('100%'));
});

const failed = checks.filter((item) => !item.ok);
const result = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
