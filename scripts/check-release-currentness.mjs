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

add('package-version-phase346', () => assert.match(pkg.version, /phase346-global-hardening-final/));
add('description-phase346', () => assert.match(pkg.description || '', /phase346 global hardening/i));
add('delivery-final-phase346', () => assert.equal(scripts['delivery:final'], 'npm run phase346:final'));
add('release-predeploy-phase346', () => assert.equal(scripts['release:predeploy'], 'npm run phase346:final'));
add('phase346-final-runner', () => assert.equal(scripts['phase346:final'], 'node scripts/run-phase346-final.mjs'));
add('run-all-tests-phase346', () => assert.match(read('RUN_ALL_TESTS.sh'), /npm run phase346:final/));
add('readme-phase346-command', () => assert.match(read('README.md'), /npm run phase346:final/));
add('live-smoke-script', () => assert.equal(scripts['live:smoke'], 'node scripts/live-smoke.mjs'));
add('public-demo-error-contract-script', () => assert.equal(scripts['test:public-demo-error-contract'], 'node tests/public-demo-error-contract.mjs'));
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
const report = { ok: failures.length === 0, phase: 'phase346-release-currentness', checked: checks.length, failed: failures.length, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE346_RELEASE_CURRENTNESS.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
