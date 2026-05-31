import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const steps = [
  ['phase349:final', ['npm', ['run', 'phase349:final']]],
  ['check:global-cta-semantics', ['npm', ['run', 'check:global-cta-semantics']]],
  ['check:button-contrast', ['npm', ['run', 'check:button-contrast']]],
  ['check:pages', ['npm', ['run', 'check:pages']]],
  ['test:e2e', ['npm', ['run', 'test:e2e']]],
  ['check:responsive-contract', ['npm', ['run', 'check:responsive-contract']]],
  ['validate:phase350', ['npm', ['run', 'validate:phase350']]],
  ['clean:runtime', ['npm', ['run', 'clean:runtime']]],
  ['check-runtime-clean', ['node', ['scripts/check-runtime-clean.mjs']]],
];
const results = [];
for (const [name, [cmd, args]] of steps) {
  const start = Date.now();
  const r = spawnSync(cmd, args, { cwd: process.cwd(), encoding: 'utf8' });
  const ok = r.status === 0;
  results.push({ name, ok, status: r.status, durationMs: Date.now() - start, stdoutTail: (r.stdout || '').slice(-4000), stderrTail: (r.stderr || '').slice(-4000) });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${Date.now() - start}ms`);
  if (!ok) break;
}
const failed = results.filter(r => !r.ok);
const report = { ok: failed.length === 0, phase: 'phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout', passed: results.filter(r=>r.ok).length, total: steps.length, failed: failed.length, results };
fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/current/PHASE350_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, total: report.total, failed: report.failed, report: 'docs/current/PHASE350_FINAL_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
