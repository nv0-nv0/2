import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const checks = [];
function add(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
const pkg = JSON.parse(read('package.json'));
add('version:phase351-or-newer', () => assert.match(pkg.version, /1\.0\.13-commercial-phase351-prompt-full-sweep-closeout|1\.0\.14-commercial-phase353-full-package-closeout|1\.0\.15-commercial-phase354-deployment-security-closeout|1\.0\.16-commercial-phase355-organization-closeout/));
add('scripts:phase351-final', () => assert.equal(pkg.scripts['phase351:final'], 'node scripts/run-phase351-final.mjs'));
add('scripts:delivery-release-current', () => {
  assert.ok(['npm run phase351:final','npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(pkg.scripts['delivery:final']));
  assert.ok(['npm run phase351:final','npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(pkg.scripts['release:predeploy']));
});
add('scripts:new-contracts', () => {
  assert.equal(pkg.scripts['check:ui-global-sweep'], 'node scripts/check-ui-global-sweep.mjs');
  assert.equal(pkg.scripts['check:prompt-dod'], 'node scripts/check-prompt-dod-contract.mjs');
});
add('docs:phase351-exist', () => {
  assert.equal(exists('docs/PHASE351_PROMPT_FULL_SWEEP_WORK_ORDER.md'), true);
  assert.equal(exists('docs/PHASE351_156_FULL_SWEEP_MATRIX.md'), true);
  assert.equal(exists('docs/PHASE351_PROMPT_FULL_SWEEP_CLOSEOUT.md'), true);
});
add('runner:bounded-timeout', () => assert.match(read('scripts/run-phase351-final.mjs'), /timeout:\s*defaultTimeoutMs/));
add('runner:no-nested-final', () => assert.doesNotMatch(read('scripts/run-phase351-final.mjs'), /phase350:final|phase349:final|phase348:final/));
add('ui-sweep:checks-global-files', () => {
  const s = read('scripts/check-ui-global-sweep.mjs');
  assert.match(s, /legacy CTA phrase/);
  assert.match(s, /button is missing explicit type/);
  assert.match(s, /shared brand CSS is missing/);
});
add('readme:terminal-gate', () => assert.match(read('README.md'), /phase353:final|phase354:final|phase355:final/));
add('run-all-tests:terminal-gate', () => assert.match(read('RUN_ALL_TESTS.sh'), /phase353:final|phase354:final|phase355:final/));
const failures = checks.filter(c => !c.ok);
const report = { ok: failures.length === 0, phase: 'phase353-compatible-phase351-validation', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE353_COMPAT_PHASE351_VALIDATION.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
