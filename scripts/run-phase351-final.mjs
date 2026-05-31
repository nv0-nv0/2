import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const defaultTimeoutMs = Number(process.env.NV0_PHASE351_STEP_TIMEOUT_MS || 90000);
const steps = [
  ['validate:phase350', ['npm', ['run', 'validate:phase350']]],
  ['check:syntax', ['npm', ['run', 'check:syntax']]],
  ['npm test', ['npm', ['test']]],
  ['test:e2e', ['npm', ['run', 'test:e2e']]],
  ['check:pages', ['npm', ['run', 'check:pages']]],
  ['test:routes', ['npm', ['run', 'test:routes']]],
  ['check:links', ['npm', ['run', 'check:links']]],
  ['smoke', ['npm', ['run', 'smoke']]],
  ['test:diagnose-fallback', ['npm', ['run', 'test:diagnose-fallback']]],
  ['test:public-health-contract', ['npm', ['run', 'test:public-health-contract']]],
  ['test:public-demo-error-contract', ['npm', ['run', 'test:public-demo-error-contract']]],
  ['test:unified-diagnosis-flow', ['npm', ['run', 'test:unified-diagnosis-flow']]],
  ['test:diagnosis-engine-single-source', ['npm', ['run', 'test:diagnosis-engine-single-source']]],
  ['check:result-action-state', ['npm', ['run', 'check:result-action-state']]],
  ['check:customer-journey', ['npm', ['run', 'check:customer-journey']]],
  ['check:diagnosis-copy', ['npm', ['run', 'check:diagnosis-copy']]],
  ['check:global-cta-semantics', ['npm', ['run', 'check:global-cta-semantics']]],
  ['check:button-contrast', ['npm', ['run', 'check:button-contrast']]],
  ['check:ui-global-sweep', ['npm', ['run', 'check:ui-global-sweep']]],
  ['check:prompt-dod', ['npm', ['run', 'check:prompt-dod']]],
  ['check:responsive-contract', ['npm', ['run', 'check:responsive-contract']]],
  ['check:performance-budget', ['npm', ['run', 'check:performance-budget']]],
  ['verify:security', ['npm', ['run', 'verify:security']]],
  ['check:public-api-isolation', ['npm', ['run', 'check:public-api-isolation']]],
  ['validate:deploy', ['npm', ['run', 'validate:deploy']]],
  ['check:release-secret-hygiene', ['npm', ['run', 'check:release-secret-hygiene']]],
  ['check:release-currentness', ['npm', ['run', 'check:release-currentness']]],
  ['check:operational-contract', ['npm', ['run', 'check:operational-contract']]],
  ['validate:phase351', ['npm', ['run', 'validate:phase351']]],
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
    maxBuffer: 1024 * 1024 * 16
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
    stdoutTail: (res.stdout || '').slice(-5000),
    stderrTail: (res.stderr || '').slice(-5000)
  };
  results.push(item);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${item.durationMs}ms${timedOut ? ' TIMEOUT' : ''}`);
  if (!ok) break;
}
const failed = results.filter((r) => !r.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase351-prompt-full-sweep-closeout',
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter((r) => r.ok).length,
  total: steps.length,
  failed: failed.length,
  timeoutMs: defaultTimeoutMs,
  results
};
fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/current/PHASE351_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, total: report.total, failed: report.failed, report: 'docs/current/PHASE351_FINAL_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
