import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

add('package-version-phase347', () => assert.match(pkg.version, /phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout|phase353-full-package-closeout|phase354-deployment-security-closeout|phase355-organization-closeout/));
add('description-current-final', () => assert.match(pkg.description || '', /phase347 unified diagnosis|phase348 final unified diagnosis engine|phase349 customer journey|phase350 global cta semantics|phase351 prompt full sweep|phase353 full package validation|phase354 deployment security|phase355 organization closeout/i));
add('delivery-final-current', () => assert.ok(['npm run phase347:final','npm run phase348:final','npm run phase349:final|npm run phase350:final', 'npm run phase350:final','npm run phase351:final','npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(scripts['delivery:final'])));
add('release-predeploy-current', () => assert.ok(['npm run phase347:final','npm run phase348:final','npm run phase349:final|npm run phase350:final', 'npm run phase350:final','npm run phase351:final','npm run phase353:final','npm run phase354:final','npm run phase355:final'].includes(scripts['release:predeploy'])));
add('phase347-final-runner', () => assert.equal(scripts['phase347:final'], 'node scripts/run-phase347-final.mjs'));
add('run-all-tests-current', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase347:final|npm run phase348:final|npm run phase349:final|npm run phase350:final|npm run phase351:final|npm run phase353:final|npm run phase354:final|npm run phase355:final/));
add('readme-current-command', () => assert.match(read('README.md'), /npm run phase347:final|npm run phase348:final|npm run phase349:final|npm run phase350:final|npm run phase351:final|npm run phase353:final|npm run phase354:final|npm run phase355:final/));
add('live-smoke-script', () => assert.equal(scripts['live:smoke'], 'node scripts/live-smoke.mjs'));
add('public-demo-error-contract-script', () => assert.equal(scripts['test:public-demo-error-contract'], 'node tests/public-demo-error-contract.mjs'));

add('phase347-docs-exist', () => {
  assert.equal(exists('docs/PHASE347_UNIFIED_DIAGNOSIS_WORK_ORDER.md'), true);
  assert.equal(exists('docs/PHASE347_128_UIUX_HARDENING_MATRIX.md'), true);
  assert.equal(exists('docs/PHASE347_UNIFIED_DIAGNOSIS_CLOSEOUT.md'), true);
});
add('phase346-docs-exist', () => {
  assert.equal(exists('docs/PHASE346_GLOBAL_HARDENING_WORK_ORDER.md'), true);
  assert.equal(exists('docs/PHASE346_GLOBAL_HARDENING_CLOSEOUT.md'), true);
  assert.equal(exists('docs/PHASE346_REMAINING_STEPS_MATRIX.md'), true);
});
add('docker-healthcheck-body-ok-contract', () => {
  const files = ['docker-compose.yml','deploy/docker-compose.commercial.yml','deploy/docker-compose.coolify.yml','deploy/docker-compose.local-minio.yml'];
  for (const file of files) assert.match(read(file), /b\.ok\s*={2,3}\s*true|body\.ok\s*={2,3}\s*true/, file);
});
add('env-templates-keep-demo-fallback', () => {
  const files = ['deploy/env.commercial.template','deploy/env.production.nv0.kr.example','deploy/env.production.nv0.kr.ci-check.env'];
  for (const file of files) assert.doesNotMatch(read(file), /NV0_SCAN_PROVIDER_FALLBACK\s*=\s*false/i, file);
});
add('operator-live-smoke-command-documented', () => assert.match(read('docs/PHASE346_GLOBAL_HARDENING_CLOSEOUT.md'), /NV0_LIVE_BASE_URL=https:\/\/www\.nv0\.kr npm run live:smoke/));

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, phase: 'phase351-release-currentness', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE347_RELEASE_CURRENTNESS.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
