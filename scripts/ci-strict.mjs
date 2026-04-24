import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const tasks = [
  { name: 'full-test-suite', cmd: 'node', args: ['scripts/test-all.mjs'], timeoutMs: 300000 },
  { name: 'commercial-release-contract', cmd: 'node', args: ['scripts/validate-commercial-release.mjs'], timeoutMs: 30000 },
  { name: 'pipeline-contract', cmd: 'node', args: ['scripts/validate-pipeline.mjs'], timeoutMs: 30000 }
];
const results = [];
for (const task of tasks) {
  const started = Date.now();
  const r = spawnSync(task.cmd, task.args, { cwd: root, env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production', NV0_TARGET_FETCH_ENABLED: 'false', NV0_ENABLE_TURNSTILE: 'false' }, timeout: task.timeoutMs, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 });
  const result = { name: task.name, ok: r.status === 0 && !r.error, code: r.status, signal: r.signal, durationMs: Date.now() - started, stdout: (r.stdout || '').slice(-24000), stderr: (r.stderr || String(r.error?.message || '')).slice(-24000) };
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${task.name}`);
  if (!result.ok) break;
}
const ok = results.length === tasks.length && results.every(r => r.ok);
const report = { generatedAt: new Date().toISOString(), ok, gate: 'phase21-ci-strict-no-error-masking', results };
const out = path.join(docsDir, 'PHASE21_CI_STRICT_SUMMARY_20260424.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, report: 'docs/PHASE21_CI_STRICT_SUMMARY_20260424.json' }, null, 2));
if (!ok) process.exit(1);
