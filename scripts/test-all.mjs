import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const reportsDir = path.join(root, 'docs');
fs.mkdirSync(reportsDir, { recursive: true });

const defaultTimeoutMs = Number(process.env.NV0_TEST_TASK_TIMEOUT_MS || 120_000);

const baseEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'production',
  NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true',
  NV0_TARGET_FETCH_ENABLED: process.env.NV0_TARGET_FETCH_ENABLED || 'false',
  NV0_ENABLE_TURNSTILE: process.env.NV0_ENABLE_TURNSTILE || 'false'
};

const tasks = [
  ['check:syntax', ['npm', ['run', 'check:syntax']]],
  ['check:data', ['npm', ['run', 'check:data']]],
  ['check:pages', ['npm', ['run', 'check:pages']]],
  ['check:links', ['npm', ['run', 'check:links']]],
  ['check:env-examples', ['npm', ['run', 'check:env-examples']]],
  ['check:handoff-docs', ['npm', ['run', 'check:handoff-docs']]],
  ['check:no-debug-client', ['npm', ['run', 'check:no-debug-client']]],
  ['check:render-safety', ['npm', ['run', 'check:render-safety']]],
  ['test:providers', ['npm', ['run', 'test:providers']]],
  ['test:session', ['npm', ['run', 'test:session']]],
  ['test:runtime', ['npm', ['run', 'test:runtime']]],
  ['test:routes', ['npm', ['run', 'test:routes']]],
  ['test:contracts', ['npm', ['run', 'test:contracts']]],
  ['test:security-stateful', ['npm', ['run', 'test:security-stateful']]],
  ['test:portone', ['npm', ['run', 'test:portone']]],
  ['test:portone-events', ['npm', ['run', 'test:portone-events']]],
  ['validate:commercial', ['npm', ['run', 'validate:commercial']]],
  ['validate:pipeline', ['npm', ['run', 'validate:pipeline']]],
  ['smoke', ['npm', ['run', 'smoke']]],
  ['test:e2e', ['npm', ['run', 'test:e2e']]]
];

function run(name, cmd, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const child = spawn(cmd, args, {
      cwd: root,
      env: {
        ...baseEnv,
        PORT: String(3300 + Math.floor(Math.random() * 2000)),
        NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'local-test-key-123456',
        ...(extraEnv || {})
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    let stdout = '';
    let stderr = '';
    const limit = 12000;
    child.stdout.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-limit); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-limit); });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2000).unref?.();
    }, defaultTimeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({
        name, code, signal,
        ok: code === 0,
        durationMs: Date.now() - started,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        name, code: 1, signal: null, ok: false,
        durationMs: Date.now() - started,
        startedAt, finishedAt: new Date().toISOString(),
        stdout: stdout.trim(), stderr: String(error?.message || error)
      });
    });
  });
}

const results = [];
for (const [name, spec] of tasks) {
  const [cmd, args, env] = spec;
  const result = await run(name, cmd, args, env);
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name} ${result.durationMs}ms`);
  if (!result.ok && process.env.NV0_TEST_CONTINUE_ON_FAIL !== 'true') break;
}

const summary = {
  generatedAt: new Date().toISOString(),
  ok: results.length === tasks.length && results.every(r => r.ok),
  taskCount: tasks.length,
  passed: results.filter(r => r.ok).length,
  failed: results.filter(r => !r.ok).length,
  results
};
const out = path.join(reportsDir, 'PHASE10_FULL_TEST_SUMMARY_20260424.json');
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: summary.ok, passed: summary.passed, failed: summary.failed, report: out }, null, 2));
if (!summary.ok) process.exit(1);
