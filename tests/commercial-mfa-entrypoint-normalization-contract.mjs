import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { commercialRuntimeEnv } from './fixtures/commercial-runtime-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(root, 'deploy/entrypoint.sh');
const checks = [];
const add = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
};
function runCase(name, extraEnv) {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-mfa-entrypoint-'));
  try {
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'printf "%s|%s" "${NV0_ADMIN_MFA_REQUIRED:-}" "${NV0_ADMIN_MFA_RECOVERY_NORMALIZED:-}"'], {
      cwd: root,
      env: {
        ...process.env,
        ...commercialRuntimeEnv(),
        NV0_RUN_PREFLIGHT: 'false',
        NV0_RUNTIME_DIR: runtime,
        NV0_FALLBACK_RUNTIME_DIR: runtime,
        NV0_REQUIRE_PERSISTENT_RUNTIME: 'false',
        ...extraEnv
      },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${name}: ${result.stderr || result.stdout}`);
    return { stdout: result.stdout, stderr: result.stderr };
  } finally {
    fs.rmSync(runtime, { recursive: true, force: true });
  }
}

add('commercial-explicit-false-normalized', () => {
  const result = runCase('commercial-explicit-false-normalized', { NV0_PLATFORM_TARGET: 'commercial', NV0_ADMIN_MFA_REQUIRED: 'false' });
  assert.equal(result.stdout, 'true|true');
  assert.match(result.stderr, /commercial profile forces NV0_ADMIN_MFA_REQUIRED=true/);
});
add('commercial-missing-normalized', () => {
  const env = { NV0_PLATFORM_TARGET: 'commercial' };
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-mfa-entrypoint-'));
  try {
    const cleanEnv = { ...process.env, ...commercialRuntimeEnv(), NV0_RUN_PREFLIGHT: 'false', NV0_RUNTIME_DIR: runtime, NV0_FALLBACK_RUNTIME_DIR: runtime, NV0_REQUIRE_PERSISTENT_RUNTIME: 'false', ...env };
    delete cleanEnv.NV0_ADMIN_MFA_REQUIRED;
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'printf "%s|%s" "${NV0_ADMIN_MFA_REQUIRED:-}" "${NV0_ADMIN_MFA_RECOVERY_NORMALIZED:-}"'], { cwd: root, env: cleanEnv, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stdout, 'true|true');
  } finally { fs.rmSync(runtime, { recursive: true, force: true }); }
});
add('commercial-true-left-unchanged', () => {
  const result = runCase('commercial-true-left-unchanged', { NV0_PLATFORM_TARGET: 'commercial', NV0_ADMIN_MFA_REQUIRED: 'true' });
  assert.equal(result.stdout, 'true|');
  assert.doesNotMatch(result.stderr, /stale or missing Coolify value/);
});
add('mvp-false-left-unchanged', () => {
  const result = runCase('mvp-false-left-unchanged', { NV0_PLATFORM_TARGET: 'mvp', NV0_ADMIN_MFA_REQUIRED: 'false' });
  assert.equal(result.stdout, 'false|');
  assert.doesNotMatch(result.stderr, /stale or missing Coolify value/);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'commercial-mfa-entrypoint-normalization-v1', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COMMERCIAL_MFA_ENTRYPOINT_NORMALIZATION.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
