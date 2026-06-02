import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const acceptanceRuntimeDir = path.join(root, 'runtime-test-acceptance');
fs.rmSync(acceptanceRuntimeDir, { recursive: true, force: true });
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
  NV0_ADMIN_SESSION_TTL_MS: process.env.NV0_ADMIN_SESSION_TTL_MS || '3600000',
  NV0_RUNTIME_DIR: acceptanceRuntimeDir,
  NV0_FALLBACK_RUNTIME_DIR: acceptanceRuntimeDir
};

const node = process.execPath;
const tasks = [
  ['check:syntax', ['scripts/check-source-syntax.mjs']],
  ['check:data', ['scripts/check-data-integrity.mjs']],
  ['check:pages', ['scripts/check-page-integrity.mjs']],
  ['check:links', ['scripts/check-links.mjs', '--summary']],
  ['check:env-examples', ['scripts/check-env-examples.mjs']],
  ['check:handoff-docs', ['scripts/check-handoff-docs.mjs']],
  ['check:no-debug-client', ['scripts/check-no-debug-client.mjs']],
  ['check:render-safety', ['scripts/check-client-render-safety.mjs']],
  ['server syntax', ['--check', 'server/index.mjs']],
  ['reset:demo', ['scripts/reset-demo-state.mjs']],
  ['validate:env:production-shape', ['scripts/validate-prod-env.mjs', './deploy/env.production.nv0.kr.ci-check.env'], { NV0_ADMIN_KEY: '' }],
  ['validate:deploy', ['scripts/validate-deploy-bundle.mjs']],
  ['test:e2e', ['tests/e2e.mjs']],
  ['test:routes', ['tests/routes-smoke.mjs']],
  ['test:contracts', ['tests/contracts-fuzz.mjs']],
  ['test:session', ['tests/session-persistence.mjs']],
  ['test:runtime', ['tests/runtime-persistence.mjs']],
  ['test:providers', ['tests/provider-adapters.mjs']],
  ['test:security-stateful', ['tests/security-stateful.mjs']],
  ['smoke', ['scripts/smoke.mjs']],
  ['verify:security', ['scripts/verify-security.mjs']],
  ['preflight:production-shape', ['scripts/preflight.mjs', './deploy/env.production.nv0.kr.ci-check.env'], { NV0_ADMIN_KEY: '' }],
  ['ops:report', ['scripts/ops-report.mjs'], { NV0_OPS_REPORT_PORT: '3223' }],
  ['audit:inventory', ['scripts/audit-inventory.mjs']],
  ['release:manifest', ['scripts/release-manifest.mjs']],
  ['verify:prod', ['scripts/verify-prod.mjs'], { NV0_BASE_URL: 'http://127.0.0.1:3224', PORT: '3224' }],
  ['package:prep', ['scripts/package-prep.mjs']]
];

const results = [];
for (const [name, args, env = {}] of tasks) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(node, args, {
    cwd: root,
    env: { ...baseEnv, ...env },
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 1024 * 1024 * 12
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const result = {
    name,
    code: r.status,
    signal: r.signal,
    ok: r.status === 0 && !r.error,
    timedOut: Boolean(r.error && r.error.code === 'ETIMEDOUT'),
    startedAt,
    finishedAt: new Date().toISOString(),
    stdout: (r.stdout || '').slice(-12000),
    stderr: (r.stderr || String(r.error?.message || '')).slice(-12000)
  };
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!result.ok) break;
}

const cleanup = spawnSync(node, ['scripts/clean-release-runtime.mjs'], { cwd: root, env: baseEnv, encoding: 'utf8', timeout: 30000 });
fs.rmSync(acceptanceRuntimeDir, { recursive: true, force: true });
results.push({ name: 'cleanup:release-runtime', code: cleanup.status, signal: cleanup.signal, ok: cleanup.status === 0 && !cleanup.error, timedOut: Boolean(cleanup.error && cleanup.error.code === 'ETIMEDOUT'), startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), stdout: (cleanup.stdout || '').slice(-12000), stderr: (cleanup.stderr || String(cleanup.error?.message || '')).slice(-12000) });
console.log(`${results.at(-1).ok ? 'PASS' : 'FAIL'} cleanup:release-runtime`);
const ok = results.length === tasks.length + 1 && results.every(item => item.ok);
const summary = {
  generatedAt: new Date().toISOString(),
  ok,
  status: ok ? '로컬 인수 검증 통과' : '완성 선언 보류',
  results
};

const legacyOutPath = path.join(docsDir, 'PHASE102_ACCEPTANCE_SUMMARY_20260426.json');
const currentDir = path.join(docsDir, 'current');
const currentOutPath = path.join(currentDir, 'PHASE357_ACCEPTANCE_REPORT.json');
fs.mkdirSync(currentDir, { recursive: true });
fs.writeFileSync(legacyOutPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(currentOutPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok, report: 'docs/current/PHASE357_ACCEPTANCE_REPORT.json', legacyReport: 'docs/PHASE102_ACCEPTANCE_SUMMARY_20260426.json', passed: results.filter(r => r.ok).length, total: results.length, taskCount: tasks.length, cleanupIncluded: true }, null, 2));
process.exit(ok ? 0 : 1);
