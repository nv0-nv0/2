import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timeoutMs = Number(process.env.NV0_RELEASE_STEP_TIMEOUT_MS || 600000);
const steps = [
  ['clean:runtime', 'npm', ['run','clean:runtime']],
  ['check:clean-baseline', 'npm', ['run','check:clean-baseline']],
  ['check:runtime-audits', 'npm', ['run','check:runtime-audits']],
  ['check:syntax', 'npm', ['run','check:syntax']],
  ['check:reference-integrity', 'npm', ['run','check:reference-integrity']],
  ['test', 'npm', ['test']],
  ['test:e2e', 'npm', ['run','test:e2e']],
  ['test:routes', 'npm', ['run','test:routes']],
  ['smoke', 'npm', ['run','smoke']],
  ['test:diagnosis-result-ui', 'npm', ['run','test:diagnosis-result-ui']],
  ['test:report-excellence', 'npm', ['run','test:report-excellence']],
  ['test:global-qa-accessibility', 'npm', ['run','test:global-qa-accessibility']],
  ['test:public-target-ssrf', 'npm', ['run','test:public-target-ssrf']],
  ['clean:runtime-before-isolation', 'npm', ['run','clean:runtime']],
  ['test:runtime-isolation', 'npm', ['run','test:runtime-isolation']],
  ['test:commerce', 'npm', ['run','test:commerce']],
  ['test:paid-redteam', 'npm', ['run','test:paid-redteam']],
  ['test:trustops', 'npm', ['run','test:trustops']],
  ['check:pages', 'npm', ['run','check:pages']],
  ['check:links', 'npm', ['run','check:links']],
  ['check:accessibility', 'npm', ['run','check:accessibility']],
  ['check:responsive-contract', 'npm', ['run','check:responsive-contract']],
  ['check:button-contrast', 'npm', ['run','check:button-contrast']],
  ['check:csp-inline-style', 'npm', ['run','check:csp-inline-style']],
  ['check:performance-budget', 'npm', ['run','check:performance-budget']],
  ['verify:security', 'npm', ['run','verify:security']],
  ['check:public-api-isolation', 'npm', ['run','check:public-api-isolation']],
  ['check:public-product-pipeline', 'npm', ['run','check:public-product-pipeline']],
  ['validate:deploy', 'npm', ['run','validate:deploy']],
  ['check:compose-env-forwarding', 'npm', ['run','check:compose-env-forwarding']],
  ['validate:coolify-env', 'npm', ['run','validate:coolify-env']],
  ['check:release-secret-hygiene', 'npm', ['run','check:release-secret-hygiene']],
  ['check:operational-contract', 'npm', ['run','check:operational-contract']],
  ['clean:runtime-final', 'npm', ['run','clean:runtime']],
  ['check:runtime-clean', 'npm', ['run','check:runtime-clean']],
  ['check:clean-baseline-final', 'npm', ['run','check:clean-baseline']]
];
const results = [];
const startedAt = new Date().toISOString();
for (const [name, cmd, args] of steps) {
  const started = Date.now();
  const res = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: timeoutMs, maxBuffer: 1024 * 1024 * 64 });
  const timedOut = res.error?.code === 'ETIMEDOUT';
  const ok = res.status === 0 && !timedOut;
  const item = { name, ok, status: res.status, signal: res.signal, timedOut, durationMs: Date.now() - started, stdoutTail: (res.stdout || '').slice(-12000), stderrTail: (res.stderr || '').slice(-12000) };
  results.push(item);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${item.durationMs}ms${timedOut ? ' TIMEOUT' : ''}`);
  if (!ok) break;
}
const failures = results.filter(item => !item.ok);
const report = { ok: failures.length === 0 && results.length === steps.length, gate: 'veridion-2.3-executive-trust-report-system', startedAt, finishedAt: new Date().toISOString(), passed: results.filter(item => item.ok).length, attempted: results.length, total: steps.length, failed: failures.length, results };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/RELEASE_GATE_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, gate: report.gate, passed: report.passed, attempted: report.attempted, total: report.total, failed: report.failed, report: 'docs/current/RELEASE_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
