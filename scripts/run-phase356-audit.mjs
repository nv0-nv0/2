import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const js = read('apps/public/demo/app.js');
const css = read('apps/public/demo/app.css');
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
add('package-version-phase356', () => assert.match(pkg.version, /phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout|phase358-commercial-deploy-integrity-closeout/));
add('description-phase356', () => assert.match(pkg.description || '', /phase356 conversion dashboard closeout|phase357 global QA and accessibility closeout/i));
add('delivery-final-phase356', () => assert.ok(['npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['delivery:final'])));
add('release-predeploy-phase356', () => assert.ok(['npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['release:predeploy'])));
add('verify-release-phase356', () => assert.ok(['npm run phase356:final','npm run phase357:final','npm run phase358:final'].includes(pkg.scripts['verify:release'])));
add('run-all-tests-phase356', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('readme-phase356', () => assert.match(read('README.md'), /npm run phase356:final|npm run phase357:final|npm run phase358:final/));
add('current-release-phase356', () => assert.match(read('docs/CURRENT_RELEASE.md'), /phase356-conversion-dashboard-closeout|phase357-global-qa-accessibility-closeout|phase358-commercial-deploy-integrity-closeout/));
add('phase356-runner', () => assert.equal(pkg.scripts['phase356:final'], 'node scripts/run-phase356-final.mjs'));
add('phase356-audit', () => assert.equal(pkg.scripts['check:phase356-audit'], 'node scripts/run-phase356-audit.mjs'));
add('phase356-dashboard-contract', () => assert.equal(pkg.scripts['test:phase356-dashboard-contract'], 'node tests/phase356-conversion-dashboard-contract.mjs'));
add('command-center-mounted-first', () => {
  const block = js.slice(js.indexOf('function renderResult(scan)'), js.indexOf('function bindResultEnhancements'));
  assert.ok(block.indexOf('renderConversionCommandCenter(view)') >= 0);
  assert.ok(block.indexOf('renderConversionCommandCenter(view)') < block.indexOf('renderProgressiveEvidenceDetails(view, scan)'));
});
add('visual-components', () => ['.vr-crisis-command-center','.vr-risk-map-card','.vr-funnel-card','.vr-risk-spotlight','.vr-premium-lock-preview','.vr-sticky-upgrade-bar'].forEach(token => assert.ok(css.includes(token), token)));
add('phase356-docs', () => ['docs/PHASE356_CONVERSION_DASHBOARD_WORK_ORDER.md','docs/PHASE356_CONVERSION_DASHBOARD_CLOSEOUT.md','docs/PHASE356_REMEDIATION_MATRIX.md'].forEach(file => assert.equal(exists(file), true, file)));
add('runtime-seed-preserved', () => assert.equal(exists('runtime/data/db.seed.json'), true));
add('volatile-runtime-not-shipped', () => ['runtime/data/db.json','runtime/data/sessions.json','runtime/data/secure-records'].forEach(file => assert.equal(exists(file), false, file)));
const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase356-conversion-dashboard-closeout', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE356_GLOBAL_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, checked: report.checked, failed: report.failed, report: 'docs/current/PHASE356_GLOBAL_AUDIT.json' }, null, 2));
if (!report.ok) process.exit(1);
