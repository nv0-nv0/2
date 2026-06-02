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

add('version:phase349', () => assert.match(pkg.version, /phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/));
add('terminal-gates:phase349', () => {
  assert.equal(scripts['phase349:final'], 'node scripts/run-phase349-final.mjs');
  assert.ok(['npm run phase349:final','npm run phase350:final','npm run phase358:final'].includes(scripts['delivery:final']));
  assert.ok(['npm run phase349:final','npm run phase350:final','npm run phase358:final'].includes(scripts['release:predeploy']));
});
add('new-contract-scripts', () => {
  assert.equal(scripts['check:customer-journey'], 'node scripts/check-customer-journey-contract.mjs');
  assert.equal(scripts['check:diagnosis-copy'], 'node scripts/check-diagnosis-copy-contract.mjs');
});
add('run-all-tests:phase349', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase349:final|npm run phase350:final|npm run phase358:final/));
add('readme:phase349', () => assert.match(read('README.md'), /npm run phase349:final|npm run phase350:final|npm run phase358:final/));
add('docs:phase349', () => {
  assert.equal(exists('docs/PHASE349_CUSTOMER_JOURNEY_WORK_ORDER.md'), true);
  assert.equal(exists('docs/PHASE349_118_REMAINING_UIUX_MATRIX.md'), true);
  assert.equal(exists('docs/PHASE349_CUSTOMER_JOURNEY_CLOSEOUT.md'), true);
});
add('current-reports-exist', () => {
  assert.equal(exists('docs/current/PHASE349_CUSTOMER_JOURNEY_CONTRACT.json'), true);
  assert.equal(exists('docs/current/PHASE349_DIAGNOSIS_COPY_CONTRACT.json'), true);
});
add('home-copy-is-customer-facing', () => {
  const home = read('apps/public/home/index.html');
  assert.match(home, /주소 입력부터 결과 확인까지 한 화면에서 끝냅니다/);
  assert.doesNotMatch(home, /무의미하게|같은 진단 엔진|메인과 진단 페이지/);
});
add('demo-actions-hidden-before-result', () => {
  const demo = read('apps/public/demo/index.html');
  assert.match(demo, /class="bridge-actions" hidden aria-hidden="true"/);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE349_FINAL_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
