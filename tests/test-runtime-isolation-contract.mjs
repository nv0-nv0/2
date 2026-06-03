import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
};

const directRuntimeCleanup = [
  ['scripts/check-public-api-isolation.mjs', 'runtimeDir'],
  ['scripts/check-public-product-pipeline.mjs', 'runtimeDir'],
  ['tests/paid-service-redteam.mjs', 'testRuntimeDir'],
  ['tests/provider-adapters.mjs', 'testRuntimeDir'],
  ['tests/portone-events.mjs', 'testRuntimeDir'],
  ['tests/portone-provider.mjs', 'testRuntimeDir'],
  ['tests/trustops-growth.mjs', 'testRuntimeDir'],
  ['tests/trustops-autopilot.mjs', 'testRuntimeDir'],
  ['tests/trustops-launch-control.mjs', 'testRuntimeDir'],
  ['tests/trustops-production-sentinel.mjs', 'testRuntimeDir'],
  ['tests/trustops-final-handoff.mjs', 'testRuntimeDir'],
  ['tests/trustops-100-final.mjs', 'testRuntimeDir']
];
for (const [file, variable] of directRuntimeCleanup) {
  check(`${file}:finally-cleans-${variable}`, () => assert.match(read(file), new RegExp(`fs\\.rmSync\\(${variable}, \\{ recursive: true, force: true \\}\\)`)));
}
check('scripts/smoke.mjs:dedicated-runtime', () => {
  const text = read('scripts/smoke.mjs');
  assert.match(text, /runtime-test-smoke/);
  assert.match(text, /NV0_RUNTIME_DIR: runtimeDir/);
  assert.match(text, /fs\.rmSync\(runtimeDir, \{ recursive: true, force: true \}\)/);
});
check('scripts/stress-smoke.mjs:public-load-private-isolation', () => {
  const text = read('scripts/stress-smoke.mjs');
  assert.match(text, /runtime-test-stress-smoke/);
  assert.match(text, /hiddenTargets/);
  assert.match(text, /res\.status === 404/);
  assert.match(text, /await fs\.rm\(runtimeDir, \{ recursive: true, force: true \}\)/);
});
for (const file of ['tests/portone-events.mjs', 'tests/portone-provider.mjs']) {
  check(`${file}:does-not-mask-failures`, () => assert.doesNotMatch(read(file), /process\.exit\(0\)/));
}
check('tests/diagnose-fallback.mjs:private-input-fail-closed', () => {
  const text = read('tests/diagnose-fallback.mjs');
  assert.match(text, /assert\.equal\(blockedTarget\.res\.status, 400\)/);
  assert.match(text, /assert\.equal\(blockedTarget\.data\.ok, false\)/);
});
check('scripts/verify-prod.mjs:dedicated-local-runtime', () => {
  const text = read('scripts/verify-prod.mjs');
  assert.match(text, /runtime-test-verify-prod/);
  assert.match(text, /NV0_RUNTIME_DIR: runtimeDir/);
  assert.match(text, /fs\.rmSync\(runtimeDir, \{ recursive: true, force: true \}\)/);
});
for (const file of ['tests/contracts-fuzz.mjs', 'tests/runtime-persistence.mjs', 'tests/session-persistence.mjs', 'tests/security-stateful.mjs']) {
  check(`${file}:dedicated-runtime-cleanup`, () => {
    const text = read(file);
    assert.match(text, /runtime-test-/);
    assert.match(text, /NV0_RUNTIME_DIR/);
    assert.match(text, /(?:fs\.rmSync|fs\.rm)\(runtimeDir/);
  });
}
check('server/index.mjs:runtime-uploads-follow-configured-upload-dir', () => {
  const text = read('server/index.mjs');
  assert.match(text, /serveStaticRoot\(req, res, UPLOADS_DIR, '\/runtime\/uploads\/', 'upload'\)/);
  assert.match(text, /async function serveStaticRoot\(req, res, rootDir, prefix = '', categoryOverride = ''\)/);
  assert.match(text, /return serveFile\(req, res, abs, mime\(abs\), categoryOverride\)/);
});
check('scripts/reset-demo-state.mjs:respects-configured-runtime-dir', () => {
  const text = read('scripts/reset-demo-state.mjs');
  assert.match(text, /process\.env\.NV0_RUNTIME_DIR/);
  assert.match(text, /path\.join\(root, 'runtime', 'data', 'db\.seed\.json'\)/);
});
check('scripts/check-data-integrity.mjs:clean-delivery-seed-aware', () => {
  const text = read('scripts/check-data-integrity.mjs');
  assert.match(text, /runtime\/data\/db\.seed\.json/);
  assert.match(text, /an empty object is a valid clean delivery seed/);
  assert.doesNotMatch(text, /docs\/LOCAL_ACCEPTANCE_SUMMARY_20260423\.json/);
});
check('scripts/check-env-examples.mjs:local-and-commercial-roles-separated', () => {
  const text = read('scripts/check-env-examples.mjs');
  assert.match(text, /requiredLocalKeys/);
  assert.match(text, /isLocalDevelopmentExample/);
  assert.match(text, /NV0_PLATFORM_TARGET=mvp/);
});
check('scripts/verify-prod.mjs:canonical-demo-and-current-page-markers', () => {
  const text = read('scripts/verify-prod.mjs');
  assert.match(text, /expected canonical redirect to \/products\/veridion\/demo/);
  assert.match(text, /\['\/privacy', '개인정보처리방침'\]/);
  assert.match(text, /const portal = await fetchText\('\/portal', 200, '고객 포털'\)/);
});
check('delivery-runtime-is-clean', () => {
  const forbidden = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) if (entry.isDirectory() && entry.name.startsWith('runtime-test-')) forbidden.push(entry.name);
  for (const relative of ['runtime-ui', 'runtime/data/db.json', 'runtime/data/sessions.json', 'runtime/data/secure-records']) if (fs.existsSync(path.join(root, relative))) forbidden.push(relative);
  assert.deepEqual(forbidden, []);
});
const failures = checks.filter(item => !item.ok);
console.log(JSON.stringify({ ok: failures.length === 0, contract: 'baseline-test-runtime-isolation-contract', checked: checks.length, failed: failures.length, failures, checks }, null, 2));
if (failures.length) process.exit(1);
