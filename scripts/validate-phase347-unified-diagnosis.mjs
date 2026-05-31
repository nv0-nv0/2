import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

add('version:phase347', () => assert.match(pkg.version, /phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/));
add('description:phase347', () => assert.match(pkg.description || '', /phase347 unified diagnosis|phase348 final unified diagnosis engine|phase349 customer journey|phase350 global cta semantics/i));
add('scripts:phase347-final', () => assert.equal(scripts['phase347:final'], 'node scripts/run-phase347-final.mjs'));
add('scripts:terminal-gates-phase347', () => {
  assert.ok(['npm run phase347:final','npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final', 'npm run phase350:final'].includes(scripts['delivery:final']));
  assert.ok(['npm run phase347:final','npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final', 'npm run phase350:final'].includes(scripts['release:predeploy']));
});
add('scripts:new-contracts', () => {
  assert.equal(scripts['test:unified-diagnosis-flow'], 'node tests/unified-diagnosis-flow-contract.mjs');
  assert.equal(scripts['check:button-contrast'], 'node scripts/check-button-contrast-contract.mjs');
});
add('runner:chains-phase346-and-new-gates', () => {
  const runner = read('scripts/run-phase347-final.mjs');
  assert.match(runner, /phase346:final/);
  assert.match(runner, /test:unified-diagnosis-flow/);
  assert.match(runner, /check:button-contrast/);
  assert.match(runner, /validate:phase347/);
});
add('home:uses-demo-script', () => assert.match(read('apps/public/home/index.html'), /\/apps\/public\/demo\/app\.js/));
add('home:no-divergent-home-script-loaded', () => assert.doesNotMatch(read('apps/public/home/index.html'), /\/apps\/public\/home\/app\.js/));
add('demo:form-submit-contract', () => assert.match(read('apps/public/demo/index.html'), /id="unifiedDiagnosisForm"/));
add('css:phase347-contrast-layer', () => assert.match(read('shared/veridion-rebrand.css'), /Phase347 unified diagnosis flow \+ button contrast hardening/));
add('docs:work-order', () => assert.equal(exists('docs/PHASE347_UNIFIED_DIAGNOSIS_WORK_ORDER.md'), true));
add('docs:matrix-128', () => assert.match(read('docs/PHASE347_128_UIUX_HARDENING_MATRIX.md'), /파악 요소:\s*128개/));
add('docs:closeout', () => assert.equal(exists('docs/PHASE347_UNIFIED_DIAGNOSIS_CLOSEOUT.md'), true));
add('readme:phase347-command', () => assert.match(read('README.md'), /npm run phase347:final|npm run phase348:final|npm run phase349:final|npm run phase350:final/));
add('run-all-tests:phase347', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase347:final|npm run phase348:final|npm run phase349:final|npm run phase350:final/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE347_UNIFIED_DIAGNOSIS_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
