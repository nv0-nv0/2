import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  ['validate:phase340', ['npm','run','validate:phase340'], 90_000],
  ['check:syntax', ['npm','run','check:syntax'], 90_000],
  ['test', ['npm','test'], 90_000],
  ['test:e2e', ['npm','run','test:e2e'], 90_000],
  ['check:pages', ['npm','run','check:pages'], 90_000],
  ['test:routes', ['npm','run','test:routes'], 90_000],
  ['check:links', ['npm','run','check:links'], 90_000],
  ['smoke', ['npm','run','smoke'], 90_000],
  ['test:diagnose-fallback', ['npm','run','test:diagnose-fallback'], 90_000],
  ['check:responsive-contract', ['npm','run','check:responsive-contract'], 90_000],
  ['check:performance-budget', ['npm','run','check:performance-budget'], 90_000],
  ['verify:security', ['npm','run','verify:security'], 90_000],
  ['check:public-api-isolation', ['npm','run','check:public-api-isolation'], 120_000],
  ['validate:deploy', ['npm','run','validate:deploy'], 90_000],
  ['check:release-secret-hygiene', ['npm','run','check:release-secret-hygiene'], 90_000],
  ['validate:phase325', ['npm','run','validate:phase325'], 90_000],
  ['validate:phase326', ['npm','run','validate:phase326'], 90_000],
  ['validate:phase328', ['npm','run','validate:phase328'], 90_000],
  ['validate:phase329', ['npm','run','validate:phase329'], 90_000],
  ['validate:phase330', ['npm','run','validate:phase330'], 90_000],
  ['validate:phase337', ['npm','run','validate:phase337'], 120_000],
  ['validate:phase341', ['npm','run','validate:phase341'], 120_000],
  ['validate:phase342', ['npm','run','validate:phase342'], 90_000],
  ['check:operational-contract', ['npm','run','check:operational-contract'], 90_000],
  ['validate:phase343', ['npm','run','validate:phase343'], 90_000],
  ['test:public-health-contract', ['npm','run','test:public-health-contract'], 90_000],
  ['validate-prod-env-ci-check', ['node','scripts/validate-prod-env.mjs','deploy/env.production.nv0.kr.ci-check.env'], 90_000],
  ['validate:phase345', ['npm','run','validate:phase345'], 90_000],
  ['clean:runtime', ['npm','run','clean:runtime'], 90_000],
  ['check-runtime-clean', ['node','scripts/check-runtime-clean.mjs'], 90_000]
];

const results = [];
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
for (const [name, cmd, timeout] of steps) {
  const start = Date.now();
  const run = spawnSync(cmd[0], cmd.slice(1), {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    timeout,
    maxBuffer: 40 * 1024 * 1024,
    env: { ...process.env, NV0_PHASE345_GATE: '1' }
  });
  const elapsedMs = Date.now() - start;
  const ok = run.status === 0 && !run.error;
  const record = {
    name,
    command: cmd.join(' '),
    ok,
    status: run.status,
    signal: run.signal || null,
    error: run.error ? String(run.error.message || run.error) : null,
    elapsedMs,
    stdoutTail: String(run.stdout || '').slice(-2200),
    stderrTail: String(run.stderr || '').slice(-2200)
  };
  results.push(record);
  process.stdout.write(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${elapsedMs}ms\n`);
  if (!ok) break;
}
const passed = results.filter(item => item.ok).length;
const failed = results.filter(item => !item.ok).length;
const report = {
  ok: failed === 0 && passed === steps.length,
  phase: 'phase345-final-delivery-closeout',
  checkedAt: new Date().toISOString(),
  total: steps.length,
  passed,
  failed,
  results
};
fs.writeFileSync(path.join(root, 'docs/current/PHASE345_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, 'docs/current/PHASE345_FINAL_GATE_LOG.txt'), results.map(item => `${item.ok ? 'PASS' : 'FAIL'} ${item.name} ${item.elapsedMs}ms\n${item.stderrTail || ''}`).join('\n'));
if (!report.ok) {
  console.error(JSON.stringify({ ok: false, phase: report.phase, passed, failed, failedStep: results.find(item => !item.ok), report: 'docs/current/PHASE345_FINAL_GATE_REPORT.json' }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: report.phase, passed, total: report.total, report: 'docs/current/PHASE345_FINAL_GATE_REPORT.json' }, null, 2));
