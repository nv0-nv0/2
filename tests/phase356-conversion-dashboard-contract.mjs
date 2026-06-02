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
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
add('single-diagnosis-entry-preserved', () => assert.match(html, /id="unifiedDiagnosisForm"[\s\S]*id="demoResult"/));
add('command-center-renderer', () => assert.match(js, /function renderConversionCommandCenter\(view\)/));
add('risk-map-renderer', () => assert.match(js, /function renderCrisisAreaMap\(view\)/));
add('trust-funnel-renderer', () => assert.match(js, /function renderTrustDropoffFunnel\(view\)/));
add('top-risk-spotlight-renderer', () => assert.match(js, /function renderTopRiskSpotlight\(view\)/));
add('premium-lock-preview-renderer', () => assert.match(js, /function renderLockedDeliverablePreview\(view\)/));
add('progressive-detail-renderer', () => assert.match(js, /function renderProgressiveEvidenceDetails\(view, scan\)/));
add('sticky-upgrade-renderer', () => assert.match(js, /function renderStickyUpgradeBar\(view\)/));
add('render-order-crisis-first', () => {
  const resultBlock = js.slice(js.indexOf('function renderResult(scan)'), js.indexOf('function bindResultEnhancements'));
  assert.ok(resultBlock.indexOf('renderConversionCommandCenter(view)') < resultBlock.indexOf('renderProgressiveEvidenceDetails(view, scan)'));
  assert.ok(resultBlock.indexOf('renderLockedDeliverablePreview(view)') < resultBlock.indexOf('renderProgressiveEvidenceDetails(view, scan)'));
});
add('crisis-score-disclaimer', () => assert.match(js, /실제 이탈률을 측정한 값은 아닙니다/));
add('legal-outcome-not-guaranteed', () => assert.match(js, /법적 결론이 아니라/));
add('conversion-css', () => ['.vr-crisis-command-center','.vr-crisis-orbit','.vr-risk-bars','.vr-trust-funnel','.vr-risk-spotlight','.vr-premium-lock-preview','.vr-progressive-report-details','.vr-sticky-upgrade-bar'].forEach(token => assert.ok(css.includes(token), token)));
add('paid-command-center-routes-to-portal', () => {
  const block = js.slice(js.indexOf('function renderConversionCommandCenter(view)'), js.indexOf('function renderCrisisAreaMap(view)'));
  assert.match(block, /const paidAccess = hasPaidAccess\(view\.raw\)/);
  assert.match(block, /paidAccess[\s\S]*\/portal\?siteId=/);
});
add('paid-result-hides-sticky-upsell', () => {
  const block = js.slice(js.indexOf('function renderResult(scan)'), js.indexOf('function bindResultEnhancements'));
  assert.match(block, /hasPaidAccess\(scan\) \? '' : renderStickyUpgradeBar\(view\)/);
});
add('mobile-css', () => assert.match(css, /@media\(max-width:720px\)[\s\S]*\.vr-sticky-upgrade-bar/));
const failures = checks.filter(item => !item.ok);
console.log(JSON.stringify({ ok: failures.length === 0, contract: 'phase356-conversion-dashboard-contract', checked: checks.length, failed: failures.length, failures }, null, 2));
if (failures.length) process.exit(1);
