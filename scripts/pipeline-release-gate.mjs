import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const tasks = [
  ['runtime-clean-before', ['scripts/check-runtime-clean.mjs'], 30000],
  ['env-examples', ['scripts/check-env-examples.mjs'], 30000],
  ['deploy-bundle', ['scripts/validate-deploy-bundle.mjs'], 30000],
  ['commercial-runtime', ['scripts/validate-commercial-runtime.mjs'], 30000],
  ['commercial-release', ['scripts/validate-commercial-release.mjs'], 30000],
  ['pipeline-contract', ['scripts/validate-pipeline.mjs'], 30000],
  ['full-test-suite', ['scripts/test-all.mjs'], 300000],
  ['ci-strict', ['scripts/ci-strict.mjs'], 420000],
  ['runtime-clean-after', ['scripts/check-runtime-clean.mjs'], 30000]
];

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'production',
  NV0_TARGET_FETCH_ENABLED: 'false',
  NV0_ENABLE_TURNSTILE: 'false'
};

const results = [];
for (const [name, args, timeout] of tasks) {
  const started = Date.now();
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    env,
    timeout,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    killSignal: 'SIGKILL'
  });
  const result = {
    name,
    ok: r.status === 0 && !r.error,
    code: r.status,
    signal: r.signal,
    timedOut: r.error?.code === 'ETIMEDOUT',
    durationMs: Date.now() - started,
    stdout: (r.stdout || '').slice(-30000),
    stderr: (r.stderr || String(r.error?.message || '')).slice(-30000)
  };
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.timedOut ? ' (timeout)' : ''}`);
  if (!result.ok) break;
}

const ok = results.length === tasks.length && results.every(item => item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok,
  gate: 'phase23-release-pipeline-gate',
  totalGates: tasks.length,
  passed: results.filter(item => item.ok).length,
  failed: results.filter(item => !item.ok).length,
  results
};
const out = path.join(docsDir, 'PHASE23_PIPELINE_RELEASE_GATE_20260424.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, totalGates: report.totalGates, passed: report.passed, failed: report.failed, report: 'docs/PHASE23_PIPELINE_RELEASE_GATE_20260424.json' }, null, 2));
process.exit(ok ? 0 : 1);
