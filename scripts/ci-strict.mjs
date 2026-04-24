import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const tasks = [
  { name: 'syntax', cmd: 'npm', args: ['run', 'check:syntax'], timeoutMs: 90_000 },
  { name: 'static-release-gates', cmd: 'npm', args: ['run', 'validate:commercial'], timeoutMs: 30_000 },
  { name: 'pipeline-integrity', cmd: 'npm', args: ['run', 'validate:pipeline'], timeoutMs: 30_000 },
  { name: 'commercial-runtime-env-contract', cmd: 'npm', args: ['run', 'validate:commercial-runtime'], timeoutMs: 30_000 },
  { name: 'unit-and-integration', cmd: 'npm', args: ['run', 'test:all'], timeoutMs: 240_000 }
];

function run(task) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(task.cmd, task.args, {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        NV0_TARGET_FETCH_ENABLED: 'false',
        NV0_ENABLE_TURNSTILE: process.env.NV0_ENABLE_TURNSTILE || 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    let stdout = '', stderr = '';
    const max = 20000;
    child.stdout.on('data', c => stdout = (stdout + c.toString()).slice(-max));
    child.stderr.on('data', c => stderr = (stderr + c.toString()).slice(-max));
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2000).unref?.();
    }, task.timeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ ...task, ok: code === 0, code, signal, durationMs: Date.now() - started, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

const results = [];
for (const task of tasks) {
  const result = await run(task);
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${task.name}`);
  if (!result.ok) break;
}
const ok = results.length === tasks.length && results.every(r => r.ok);
const report = {
  generatedAt: new Date().toISOString(),
  ok,
  gate: 'commercial-launch-ci-strict',
  results
};
const out = path.join(docsDir, 'PHASE10_CI_STRICT_SUMMARY_20260424.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok, report: out }, null, 2));
if (!ok) process.exit(1);
