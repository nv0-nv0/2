import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(root, 'deploy/entrypoint.sh');
const checks = [];
const add = async (name, fn) => { try { await fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } };
const baseEnv = runtime => ({ ...process.env, NV0_PLATFORM_TARGET: 'commercial', NV0_DEPLOYMENT_STAGE: 'prelaunch', NV0_COMMERCIAL_LAUNCH_READY: 'false', NV0_ADMIN_MFA_REQUIRED: 'true', NV0_ADMIN_TOTP_SECRET: 'wrong_secret_0189', NV0_RUN_PREFLIGHT: 'false', NV0_RUNTIME_DIR: runtime, NV0_FALLBACK_RUNTIME_DIR: runtime, NV0_REQUIRE_PERSISTENT_RUNTIME: 'false' });

await add('prelaunch auto mode holds safely instead of restart-loop exit', async () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-totp-hold-'));
  const child = spawn('sh', [entrypoint, 'sh', '-c', 'echo should-not-run'], { cwd: root, env: baseEnv(runtime), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  try {
    const deadline = Date.now() + 4000;
    while (!/safe configuration hold mode/.test(stderr) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(child.exitCode, null, `process exited unexpectedly: ${stderr}`);
    assert.match(stderr, /safe configuration hold mode/);
    assert.doesNotMatch(stdout + stderr, /wrong_secret_0189/);
    assert.doesNotMatch(stdout, /should-not-run/);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(runtime, { recursive: true, force: true });
  }
});

await add('commercial launch auto mode fails fast instead of holding', async () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-totp-hold-'));
  try {
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'echo should-not-run'], { cwd: root, encoding: 'utf8', env: { ...baseEnv(runtime), NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PREFLIGHT_FAILURE_DELAY_SECONDS: '0' } });
    assert.equal(result.status, 78, result.stderr);
    assert.match(result.stderr, /Waiting 0s before exit/);
    assert.doesNotMatch(result.stdout, /should-not-run/);
  } finally { fs.rmSync(runtime, { recursive: true, force: true }); }
});

await add('operator exit override remains available for CI and troubleshooting', async () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-totp-hold-'));
  try {
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'echo should-not-run'], { cwd: root, encoding: 'utf8', env: { ...baseEnv(runtime), NV0_TOTP_PREFLIGHT_FAILURE_MODE: 'exit', NV0_PREFLIGHT_FAILURE_DELAY_SECONDS: '0' } });
    assert.equal(result.status, 78, result.stderr);
    assert.doesNotMatch(result.stdout, /should-not-run/);
  } finally { fs.rmSync(runtime, { recursive: true, force: true }); }
});

await add('safe diagnostic reports metadata but never the secret', async () => {
  const secret = 'wrong_secret_0189';
  const result = spawnSync(process.execPath, ['scripts/diagnose-admin-totp-env.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, NV0_PLATFORM_TARGET: 'commercial', NV0_DEPLOYMENT_STAGE: 'prelaunch', NV0_ADMIN_MFA_REQUIRED: 'true', NV0_ADMIN_TOTP_SECRET: secret } });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /wrong_secret_type_base64url_like/);
  assert.match(result.stdout, /"secretPrinted": false/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

await add('safe diagnostic passes a valid Base32 secret without printing it', async () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const result = spawnSync(process.execPath, ['scripts/diagnose-admin-totp-env.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, NV0_PLATFORM_TARGET: 'commercial', NV0_DEPLOYMENT_STAGE: 'prelaunch', NV0_ADMIN_MFA_REQUIRED: 'true', NV0_ADMIN_TOTP_SECRET: secret } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"validBase32TotpSecret": true/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'commercial-totp-safe-hold-v1', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COMMERCIAL_TOTP_SAFE_HOLD.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
