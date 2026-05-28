import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  ['check:syntax', ['npm','run','check:syntax']],
  ['test', ['npm','test']],
  ['test:e2e', ['npm','run','test:e2e']],
  ['test:commerce', ['npm','run','test:commerce']],
  ['test:paid-redteam', ['npm','run','test:paid-redteam']],
  ['test:trustops', ['npm','run','test:trustops']],
  ['test:autopilot', ['npm','run','test:autopilot']],
  ['test:launch-control', ['npm','run','test:launch-control']],
  ['test:production-sentinel', ['npm','run','test:production-sentinel']],
  ['test:final-handoff', ['npm','run','test:final-handoff']],
  ['test:100-final', ['npm','run','test:100-final']],
  ['check:pages', ['npm','run','check:pages']],
  ['test:routes', ['npm','run','test:routes']],
  ['check:links', ['npm','run','check:links']],
  ['verify:security', ['npm','run','verify:security']],
  ['validate:deploy', ['npm','run','validate:deploy']],
  ['check:release-secret-hygiene', ['npm','run','check:release-secret-hygiene']],
  ['check:accessibility', ['npm','run','check:accessibility']],
  ['check:performance-budget', ['npm','run','check:performance-budget']],
  ['check:responsive-contract', ['npm','run','check:responsive-contract']],
  ['check:operational-contract', ['npm','run','check:operational-contract']],
  ['clean:runtime-before-validation', ['npm','run','clean:runtime']],
  ['validate:phase315', ['npm','run','validate:phase315']],
  ['validate:phase316', ['npm','run','validate:phase316']],
  ['validate:phase317', ['npm','run','validate:phase317']],
  ['validate:phase318', ['npm','run','validate:phase318']],
  ['validate:phase319', ['npm','run','validate:phase319']],
  ['validate:phase320', ['npm','run','validate:phase320']],
  ['validate:phase321', ['npm','run','validate:phase321']],
  ['validate:phase322', ['npm','run','validate:phase322']],
  ['validate:phase323', ['npm','run','validate:phase323']],
  ['check-runtime-clean', ['node','scripts/check-runtime-clean.mjs']]
];
const results = [];
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
for (const [name, cmd] of steps) {
  const start = Date.now();
  const run = spawnSync(cmd[0], cmd.slice(1), { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, NV0_PHASE323_GATE: '1' } });
  const elapsedMs = Date.now() - start;
  const ok = run.status === 0;
  const record = { name, command: cmd.join(' '), ok, status: run.status, elapsedMs, stdoutTail: String(run.stdout || '').slice(-3000), stderrTail: String(run.stderr || '').slice(-3000) };
  results.push(record);
  process.stdout.write(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${elapsedMs}ms\n`);
  if (!ok) break;
}
const passed = results.filter(item => item.ok).length;
const failed = results.filter(item => !item.ok).length;
const report = { ok: failed === 0 && passed === steps.length, phase: 'phase323-one-hundred-point-closeout', checkedAt: new Date().toISOString(), passed, failed, total: steps.length, results };
fs.writeFileSync(path.join(root, 'docs/current/PHASE323_FINAL_GATE_LOG.txt'), results.map(item => `${item.ok ? 'PASS' : 'FAIL'} ${item.name} ${item.elapsedMs}ms\n${item.stderrTail || ''}`).join('\n'));
fs.writeFileSync(path.join(root, 'docs/current/PHASE323_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: report.phase, passed, total: steps.length, report: 'docs/current/PHASE323_FINAL_GATE_REPORT.json' }, null, 2));
