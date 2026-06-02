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

add('version:phase348', () => assert.match(pkg.version, /phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/));
add('terminal-gates:phase348', () => {
  assert.equal(scripts['phase348:final'], 'node scripts/run-phase348-final.mjs');
  assert.ok(['npm run phase348:final','npm run phase349:final', 'npm run phase350:final','npm run phase358:final', 'npm run phase350:final','npm run phase358:final'].includes(scripts['delivery:final']));
  assert.ok(['npm run phase348:final','npm run phase349:final', 'npm run phase350:final','npm run phase358:final', 'npm run phase350:final','npm run phase358:final'].includes(scripts['release:predeploy']));
});
add('new-contract-scripts', () => {
  assert.equal(scripts['test:diagnosis-engine-single-source'], 'node tests/diagnosis-engine-single-source-contract.mjs');
  assert.equal(scripts['check:result-action-state'], 'node scripts/check-result-action-state-contract.mjs');
});
add('run-all-tests:phase348', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase348:final|npm run phase349:final|npm run phase350:final|npm run phase358:final/));
add('readme:phase348', () => assert.match(read('README.md'), /npm run phase348:final|npm run phase349:final|npm run phase350:final|npm run phase358:final/));
add('docs:phase348', () => {
  assert.equal(exists('docs/PHASE348_FINAL_ENGINE_CLOSEOUT_WORK_ORDER.md'), true);
  assert.equal(exists('docs/PHASE348_112_FINAL_POLISH_MATRIX.md'), true);
  assert.equal(exists('docs/PHASE348_FINAL_ENGINE_CLOSEOUT.md'), true);
});
add('canonical-product-demo-script', () => assert.match(read('apps/public/veridion-demo/index.html'), /\/apps\/public\/demo\/app\.js/));
add('alias-runtime-not-duplicated', () => assert.ok(read('apps/public/veridion-demo/app.js').length < 900));
add('single-source-marker-on-home', () => assert.match(read('apps/public/home/index.html'), /data-diagnosis-engine="single-source"/));
add('single-source-marker-on-product-demo', () => assert.match(read('apps/public/veridion-demo/index.html'), /data-diagnosis-engine="single-source"/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE348_FINAL_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
