import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const defaultTimeoutMs = Number(process.env.NV0_PHASE353_STEP_TIMEOUT_MS || 120000);
const steps = [
  ['phase351:final', ['npm', ['run', 'phase351:final']]],
  ['phase352:final', ['npm', ['run', 'phase352:final']]],
  ['validate:phase340', ['npm', ['run', 'validate:phase340']]],
  ['test:commerce', ['npm', ['run', 'test:commerce']]],
  ['test:paid-redteam', ['npm', ['run', 'test:paid-redteam']]],
  ['test:trustops', ['npm', ['run', 'test:trustops']]],
  ['test:autopilot', ['npm', ['run', 'test:autopilot']]],
  ['test:launch-control', ['npm', ['run', 'test:launch-control']]],
  ['test:production-sentinel', ['npm', ['run', 'test:production-sentinel']]],
  ['test:final-handoff', ['npm', ['run', 'test:final-handoff']]],
  ['test:100-final', ['npm', ['run', 'test:100-final']]],
  ['test:complete-delivery', ['npm', ['run', 'test:complete-delivery']]],
  ['test:experience-orchestrator', ['npm', ['run', 'test:experience-orchestrator']]],
  ['check:public-product-pipeline', ['npm', ['run', 'check:public-product-pipeline']]],
  ['check:public-api-isolation', ['npm', ['run', 'check:public-api-isolation']]],
  ['check:phase353-audit', ['npm', ['run', 'check:phase353-audit']]],
  ['clean:runtime', ['npm', ['run', 'clean:runtime']]],
  ['check-runtime-clean', ['node', ['scripts/check-runtime-clean.mjs']]],
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
    maxBuffer: 1024 * 1024 * 32
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
    stdoutTail: (res.stdout || '').slice(-8000),
    stderrTail: (res.stderr || '').slice(-8000)
  };
  results.push(item);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${item.durationMs}ms${timedOut ? ' TIMEOUT' : ''}`);
  if (!ok) break;
}
const failed = results.filter((item) => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase353-full-package-closeout',
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter((item) => item.ok).length,
  attempted: results.length,
  total: steps.length,
  failed: failed.length,
  timeoutMs: defaultTimeoutMs,
  results
};
fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/current/PHASE353_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, attempted: report.attempted, total: report.total, failed: report.failed, report: 'docs/current/PHASE353_FINAL_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
