import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const baseEnv = {
  ...process.env,
  NV0_ADMIN_KEY: process.env.NV0_ADMIN_KEY || 'strong-admin-key-1234',
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || '3210',
  NV0_TRUST_PROXY_HEADERS: process.env.NV0_TRUST_PROXY_HEADERS || 'true',
  NV0_ALLOWED_ADMIN_ORIGINS: process.env.NV0_ALLOWED_ADMIN_ORIGINS || 'nv0.kr,www.nv0.kr',
  NV0_ENABLE_TURNSTILE: process.env.NV0_ENABLE_TURNSTILE || 'false',
  NV0_PUBLIC_SCAN_LIMIT: process.env.NV0_PUBLIC_SCAN_LIMIT || '20',
  NV0_ADMIN_AUTH_LIMIT: process.env.NV0_ADMIN_AUTH_LIMIT || '8',
  NV0_BACKUP_RETENTION_COUNT: process.env.NV0_BACKUP_RETENTION_COUNT || '20',
  NV0_AUDIT_LOG_RETENTION_COUNT: process.env.NV0_AUDIT_LOG_RETENTION_COUNT || '200',
  NV0_ADMIN_SESSION_TTL_MS: process.env.NV0_ADMIN_SESSION_TTL_MS || '3600000'
};

const tasks = [
  { name: 'npm run check:syntax', cmd: 'npm', args: ['run', 'check:syntax'] },
  { name: 'npm run check:data', cmd: 'npm', args: ['run', 'check:data'] },
  { name: 'npm run check:pages', cmd: 'npm', args: ['run', 'check:pages'] },
  { name: 'npm run check:links', cmd: 'npm', args: ['run', 'check:links'] },
  { name: 'npm run check:env-examples', cmd: 'npm', args: ['run', 'check:env-examples'] },
  { name: 'npm run check:handoff-docs', cmd: 'npm', args: ['run', 'check:handoff-docs'] },
  { name: 'npm run check:no-debug-client', cmd: 'npm', args: ['run', 'check:no-debug-client'] },
  { name: 'npm run check:render-safety', cmd: 'npm', args: ['run', 'check:render-safety'] },
  { name: 'node --check server/index.mjs', cmd: process.execPath, args: ['--check', 'server/index.mjs'] },
  { name: 'npm run reset:demo', cmd: 'npm', args: ['run', 'reset:demo'] },
  { name: 'npm run validate:env -- ./deploy/env.production.nv0.kr.example', cmd: 'npm', args: ['run', 'validate:env', '--', './deploy/env.production.nv0.kr.example'] },
  { name: 'npm run validate:deploy', cmd: 'npm', args: ['run', 'validate:deploy'] },
  { name: 'npm run test:e2e', cmd: 'npm', args: ['run', 'test:e2e'] },
  { name: 'npm run test:routes', cmd: 'npm', args: ['run', 'test:routes'] },
  { name: 'npm run test:contracts', cmd: 'npm', args: ['run', 'test:contracts'] },
  { name: 'npm run test:session', cmd: 'npm', args: ['run', 'test:session'] },
  { name: 'npm run test:runtime', cmd: 'npm', args: ['run', 'test:runtime'] },
  { name: 'npm run test:providers', cmd: 'npm', args: ['run', 'test:providers'] },
  { name: 'npm run test:security-stateful', cmd: 'npm', args: ['run', 'test:security-stateful'] },
  { name: 'npm run smoke', cmd: 'npm', args: ['run', 'smoke'] },
  { name: 'npm run verify:security', cmd: 'npm', args: ['run', 'verify:security'] },
  { name: 'npm run preflight', cmd: 'npm', args: ['run', 'preflight'] },
  { name: 'npm run ops:report', cmd: 'npm', args: ['run', 'ops:report'], env: { NV0_OPS_REPORT_PORT: '3223' } },
  { name: 'npm run audit:inventory', cmd: 'npm', args: ['run', 'audit:inventory'] },
  { name: 'npm run release:manifest', cmd: 'npm', args: ['run', 'release:manifest'] },
  { name: 'NV0_BASE_URL=http://127.0.0.1:3224 PORT=3224 npm run verify:prod', cmd: 'npm', args: ['run', 'verify:prod'], env: { NV0_BASE_URL: 'http://127.0.0.1:3224', PORT: '3224' } },
  { name: 'npm run package:prep', cmd: 'npm', args: ['run', 'package:prep'] }
];

function runTask(task) {
  return new Promise((resolve) => {
    const child = spawn(task.cmd, task.args, {
      cwd: root,
      env: { ...baseEnv, ...(task.env || {}) },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('exit', (code) => resolve({ name: task.name, code: code ?? 1, ok: code === 0 }));
  });
}

const results = [];
for (const task of tasks) {
  const startedAt = new Date().toISOString();
  const result = await runTask(task);
  results.push({ ...result, startedAt, finishedAt: new Date().toISOString() });
  if (!result.ok) break;
}

const ok = results.length === tasks.length && results.every(item => item.ok);
const summary = {
  generatedAt: new Date().toISOString(),
  ok,
  status: ok ? '로컬 MVP 완성 선언 가능' : '완성 선언 보류',
  results
};

const outPath = path.join(docsDir, 'LOCAL_ACCEPTANCE_SUMMARY_20260423.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
if (!ok) process.exit(1);
