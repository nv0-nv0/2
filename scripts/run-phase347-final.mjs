import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = [
  ['phase346:final', ['npm', 'run', 'phase346:final'], 240_000],
  ['test:unified-diagnosis-flow', ['npm', 'run', 'test:unified-diagnosis-flow'], 90_000],
  ['check:button-contrast', ['npm', 'run', 'check:button-contrast'], 90_000],
  ['check:pages', ['npm', 'run', 'check:pages'], 90_000],
  ['test:e2e', ['npm', 'run', 'test:e2e'], 90_000],
  ['check:responsive-contract', ['npm', 'run', 'check:responsive-contract'], 90_000],
  ['validate:phase347', ['npm', 'run', 'validate:phase347'], 90_000],
  ['clean:runtime', ['npm', 'run', 'clean:runtime'], 90_000],
  ['check-runtime-clean', ['node', 'scripts/check-runtime-clean.mjs'], 90_000]
];

function run(name, command, timeoutMs) {
  return new Promise(resolve => {
    const startedAt = Date.now();
    const child = spawn(command[0], command.slice(1), { cwd: root, env: process.env, shell: false });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      resolve({ name, ok: false, timeout: true, elapsedMs: Date.now() - startedAt, stdoutTail: stdout.slice(-4000), stderrTail: stderr.slice(-4000) });
    }, timeoutMs);
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('exit', code => {
      clearTimeout(timer);
      resolve({ name, ok: code === 0, code, elapsedMs: Date.now() - startedAt, stdoutTail: stdout.slice(-4000), stderrTail: stderr.slice(-4000) });
    });
  });
}

const results = [];
for (const [name, command, timeoutMs] of commands) {
  const result = await run(name, command, timeoutMs);
  results.push(result);
  console.log(`[${result.ok ? 'PASS' : 'FAIL'}] ${name} ${result.elapsedMs}ms`);
  if (!result.ok) {
    console.error(result.stderrTail || result.stdoutTail || 'no output');
    break;
  }
}

const failed = results.filter(item => !item.ok);
const report = {
  ok: failed.length === 0 && results.length === commands.length,
  phase: 'phase347-unified-diagnosis-final',
  passed: results.filter(item => item.ok).length,
  total: commands.length,
  inheritedPhase346Gate: true,
  addedPhase347Gates: ['unified diagnosis flow contract', 'button contrast contract', 'page/e2e/responsive regression', 'phase347 validator'],
  results
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE347_FINAL_GATE_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, phase: report.phase, passed: report.passed, total: report.total, report: 'docs/current/PHASE347_FINAL_GATE_REPORT.json' }, null, 2));
if (!report.ok) process.exit(1);
