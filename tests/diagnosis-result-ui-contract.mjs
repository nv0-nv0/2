import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const js = read('apps/public/demo/app.js');
const css = read('apps/public/demo/app.css');
const html = read('apps/public/demo/index.html');
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }

add('sample-preview-replaced', () => assert.match(html, /class="vr360-sample"[\s\S]*구매 전환 위기도[\s\S]*리스크 히트맵[\s\S]*수정 문구 잠금 해제/));
add('new-shell-renderers-exist', () => {
  for (const name of ['renderVr360ExecutiveHero','renderVr360RiskMap','renderVr360Journey','renderVr360PriorityIssues','renderVr360Unlock','renderVr360TechnicalDetails','renderVr360StickyCta','renderVr360Result']) assert.match(js, new RegExp(`function ${name}\\(`), name);
});
add('result-uses-new-shell-only', () => {
  const block = js.slice(js.lastIndexOf('function renderResult(scan)'), js.length);
  assert.match(block, /setResultHtml\(renderVr360Result\(view, scan\)\)/);
  assert.doesNotMatch(block, /renderConversionCommandCenter|renderCrisisAreaMap|renderTopRiskSpotlight|renderProgressiveEvidenceDetails/);
});
add('new-shell-priority-order', () => {
  const block = js.slice(js.indexOf('function renderVr360Result(view, scan)'), js.indexOf('function renderResult(scan)'));
  const order = ['renderResultToolbar(view, scan)','renderVr360ExecutiveHero(view)','renderVr360RiskMap(view)','renderVr360Journey(view)','renderVr360PriorityIssues(view)','renderVr360Unlock(view)','renderVr360TechnicalDetails(view, scan)','renderVr360StickyCta(view)'];
  let cursor = -1;
  for (const token of order) { const next = block.indexOf(token); assert.ok(next > cursor, token); cursor = next; }
});
add('technical-details-no-duplicate-dashboard', () => {
  const block = js.slice(js.indexOf('function renderVr360TechnicalDetails(view, scan)'), js.indexOf('function renderVr360StickyCta(view)'));
  assert.doesNotMatch(block, /renderDemoCountOnlyResult|renderConversionImpact|renderRiskCards|renderCategoryBoard/);
});
add('cta-purchase-path-visible', () => {
  const block = js.slice(js.indexOf('function renderVr360ExecutiveHero(view)'), js.indexOf('function renderVr360RiskMap(view)'));
  assert.match(block, /checkout\?plan=Report/);
  assert.match(block, /checkout\?plan=Expert/);
  assert.match(js, /실제 수정 위치와 문구/);
});
add('risk-disclaimer-not-deceptive', () => {
  assert.match(js, /법적 판단이나 실제 매출 손실 확정값이 아니라/);
  assert.match(js, /실제 이탈률 측정값이 아니라/);
});
add('csp-safe-no-inline-style', () => assert.doesNotMatch(js, /\bstyle\s*=/i));
add('required-css-components', () => {
  for (const token of ['.vr360-report-shell','.vr360-hero','.vr360-gauge','.vr360-kpi-strip','.vr360-dashboard-grid','.vr360-risk-map','.vr360-journey','.vr360-priority-grid','.vr360-unlock','.vr360-details','.vr360-sticky','.vr360-sample']) assert.ok(css.includes(token), token);
});
add('aligned-grid-css', () => {
  assert.match(css, /\.vr360-hero-grid\{display:grid;grid-template-columns:/);
  assert.match(css, /\.vr360-dashboard-grid\{display:grid;grid-template-columns:/);
  assert.match(css, /\.vr360-priority-grid\{display:grid;grid-template-columns:repeat\(3/);
  assert.match(css, /\.vr360-kpi-strip\{display:grid;grid-template-columns:repeat\(4/);
});
add('mobile-responsive-css', () => assert.match(css, /@media\(max-width:760px\)[\s\S]*\.vr360-priority-grid\{grid-template-columns:1fr\}[\s\S]*\.vr360-sticky/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'baseline-diagnosis-result-redesign-contract', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/DIAGNOSIS_RESULT_UI_CONTRACT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
