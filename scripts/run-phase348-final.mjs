import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const steps = [
  ['phase347:final', ['npm', ['run', 'phase347:final']]],
  ['test:diagnosis-engine-single-source', ['npm', ['run', 'test:diagnosis-engine-single-source']]],
  ['check:result-action-state', ['npm', ['run', 'check:result-action-state']]],
  ['check:pages', ['npm', ['run', 'check:pages']]],
  ['test:e2e', ['npm', ['run', 'test:e2e']]],
  ['check:button-contrast', ['npm', ['run', 'check:button-contrast']]],
  ['check:responsive-contract', ['npm', ['run', 'check:responsive-contract']]],
  ['validate:phase348', ['npm', ['run', 'validate:phase348']]],
  ['clean:runtime', ['npm', ['run', 'clean:runtime']]],
  ['check-runtime-clean', ['node', ['scripts/check-runtime-clean.mjs']]]
];

const results = [];
for (const [name, [cmd, args]] of steps) {
  const started = Date.now();
  const res = spawnSync(cmd, args, { stdio: 'pipe', shell: process.platform === 'win32', encoding: 'utf8' });
  const item = { name, ok: res.status === 0, ms: Date.now() - started };
  if (!item.ok) {
    item.status = res.status;
    item.stdout = (res.stdout || '').slice(-4000);
    item.stderr = (res.stderr || '').slice(-4000);
  }
  results.push(item);
  console.log(`[${item.ok ? 'PASS' : 'FAIL'}] ${name} ${item.ms}ms`);
  if (!item.ok) break;
}
const failed = results.filter(r => !r.ok);
const report = { ok: failed.length === 0, phase: 'phase348-final-unified-engine-closeout|phase349-customer-journey-closeout', passed: results.length - failed.length, total: steps.length, failed: failed.length, results };
fs.mkdirSync(path.join(process.cwd(), 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/current/PHASE348_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, total: report.total, failed: report.failed, report: 'docs/current/PHASE348_FINAL_GATE_REPORT.json' }, null, 2));
if (failed.length) process.exit(1);
