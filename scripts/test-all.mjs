import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const isolatedRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-test-runtime-'));
const isolatedData = path.join(isolatedRuntime, 'data');
fs.mkdirSync(isolatedData, { recursive: true });
const seedPath = path.join(root, 'runtime', 'data', 'db.seed.json');
if (fs.existsSync(seedPath)) fs.copyFileSync(seedPath, path.join(isolatedData, 'db.json'));
fs.writeFileSync(path.join(isolatedData, 'sessions.json'), '[]\n');
const tasks = [
  ['check:syntax', ['scripts/check-source-syntax.mjs'], 30000],
  ['check:data', ['scripts/check-data-integrity.mjs'], 30000],
  ['check:pages', ['scripts/check-page-integrity.mjs'], 30000],
  ['check:links', ['scripts/check-links.mjs'], 30000],
  ['check:no-debug-client', ['scripts/check-no-debug-client.mjs'], 30000],
  ['check:render-safety', ['scripts/check-client-render-safety.mjs'], 30000],
  ['check:commercial-offers', ['scripts/check-commercial-offers.mjs'], 30000],
  ['check:runtime-clean', ['scripts/check-runtime-clean.mjs'], 30000],
  ['validate:deploy', ['scripts/validate-deploy-bundle.mjs'], 30000],
  ['validate:commercial-runtime', ['scripts/validate-commercial-runtime.mjs'], 30000],
  ['test:routes', ['tests/routes-smoke.mjs'], 45000],
  ['test:e2e', ['tests/e2e.mjs'], 90000],
  ['test:contracts', ['tests/contracts-fuzz.mjs'], 60000],
  ['test:security-stateful', ['tests/security-stateful.mjs'], 60000],
  ['check:full-commercial-flow', ['scripts/check-full-commercial-flow.mjs'], 90000]
];
const results = [];
for (const [name, args, timeout] of tasks) {
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false', NV0_RUNTIME_DIR: isolatedRuntime }, timeout, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10, killSignal: 'SIGKILL' });
  const result = { name, ok: r.status === 0 && !r.error, code: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', durationMs: Date.now() - started, stdout: (r.stdout || '').slice(-16000), stderr: (r.stderr || String(r.error?.message || '')).slice(-16000) };
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.timedOut ? ' (timeout)' : ''}`);
  if (!result.ok) break;
}
const summary = { generatedAt: new Date().toISOString(), ok: results.length === tasks.length && results.every(r => r.ok), taskCount: tasks.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
fs.writeFileSync(path.join(docsDir, 'PHASE23_FULL_TEST_SUMMARY_20260424.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: summary.ok, passed: summary.passed, failed: summary.failed, report: 'docs/PHASE23_FULL_TEST_SUMMARY_20260424.json', isolatedRuntimeCleaned: true }, null, 2));
try { fs.rmSync(isolatedRuntime, { recursive: true, force: true }); } catch {}
process.exit(summary.ok ? 0 : 1);
