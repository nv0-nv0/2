import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const defaultTimeoutMs = Number(process.env.NV0_PHASE354_STEP_TIMEOUT_MS || 240000);
const steps = [
  ['phase353:final', ['npm', ['run', 'phase353:final']]],
  ['test:public-probe-minimal', ['npm', ['run', 'test:public-probe-minimal']]],
  ['check:compose-env-forwarding', ['npm', ['run', 'check:compose-env-forwarding']]],
  ['check:phase354-audit', ['npm', ['run', 'check:phase354-audit']]],
  ['clean:runtime', ['npm', ['run', 'clean:runtime']]],
  ['check-runtime-clean', ['node', ['scripts/check-runtime-clean.mjs']]]
];
const results = [];
const startedAt = new Date().toISOString();
for (const [name, [cmd, args]] of steps) {
  const started = Date.now();
  const res = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: defaultTimeoutMs,
    maxBuffer: 1024 * 1024 * 48
  });
  const timedOut = res.error?.code === 'ETIMEDOUT';
  const ok = res.status === 0 && !timedOut;
  const item = {
    name,
    ok,
    status: res.status,
    signal: res.signal,
    timedOut,
    durationMs: Date.now() - started,
    stdoutTail: (res.stdout || '').slice(-12000),
    stderrTail: (res.stderr || '').slice(-12000)
  };
  results.push(item);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${item.durationMs}ms${timedOut ? ' TIMEOUT' : ''}`);
  if (!ok) break;
}
const failed = results.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase354-deployment-security-closeout',
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter(item => item.ok).length,
  attempted: results.length,
  total: steps.length,
  failed: failed.length,
  timeoutMs: defaultTimeoutMs,
  results
};
fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/current/PHASE354_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, attempted: report.attempted, total: report.total, failed: report.failed, report: 'docs/current/PHASE354_FINAL_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
