import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeTotpSecretConfig, assertTotpSecretConfig } from '../server/config/validation.mjs';
import { verifyTotpCode } from '../server/core/admin-auth.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(root, 'deploy/entrypoint.sh');
const checks = [];
const add = (name, fn) => { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error.message }); } };

add('raw Base32 is accepted', () => {
  assert.equal(assertTotpSecretConfig('NV0_ADMIN_TOTP_SECRET', 'JBSWY3DPEHPK3PXP'), 'JBSWY3DPEHPK3PXP');
});
add('KEY=value wrapper is safely normalized', () => {
  const result = analyzeTotpSecretConfig('NV0_ADMIN_TOTP_SECRET=JBSWY3DPEHPK3PXP');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, 'JBSWY3DPEHPK3PXP');
  assert.equal(result.removedAssignmentPrefix, true);
});
add('quotes spaces hyphens and lowercase are safely normalized', () => {
  const result = analyzeTotpSecretConfig(' "jbsw-y3dp ehpk3pxp" ');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, 'JBSWY3DPEHPK3PXP');
});
add('base64url-like application secret is classified but never coerced', () => {
  const result = analyzeTotpSecretConfig('app_X1taFrEQcXF2pSEKJbKymzNJqNrLP1ZPuoLl');
  assert.equal(result.valid, false);
  assert.equal(result.base64UrlLike, true);
  assert.throws(() => assertTotpSecretConfig('NV0_ADMIN_TOTP_SECRET', 'app_X1taFrEQcXF2pSEKJbKymzNJqNrLP1ZPuoLl'), /Base32 TOTP secret/);
});
add('runtime TOTP decoder refuses malformed secret instead of dropping invalid characters', () => {
  assert.equal(verifyTotpCode('app_X1taFrEQcXF2pSEKJbKymzNJqNrLP1ZPuoLl', '123456'), false);
});
add('dedicated generator emits only Base32 in value-only mode', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-admin-totp-secret.mjs', '--value-only'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^[A-Z2-7]{32}$/);
});
add('dedicated generator emits one env line in developer-view mode', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-admin-totp-secret.mjs', '--env-line'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^NV0_ADMIN_TOTP_SECRET=[A-Z2-7]{32}$/);
});
add('entrypoint safely normalizes assignment-line wrapper', () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-totp-transport-'));
  try {
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'printf "%s|%s" "$NV0_ADMIN_TOTP_SECRET" "${NV0_ADMIN_TOTP_TRANSPORT_NORMALIZED:-}"'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NV0_PLATFORM_TARGET: 'commercial', NV0_ADMIN_MFA_REQUIRED: 'true', NV0_ADMIN_TOTP_SECRET: 'NV0_ADMIN_TOTP_SECRET=jbsw-y3dp ehpk3pxp', NV0_RUN_PREFLIGHT: 'false', NV0_RUNTIME_DIR: runtime, NV0_FALLBACK_RUNTIME_DIR: runtime, NV0_REQUIRE_PERSISTENT_RUNTIME: 'false' }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'JBSWY3DPEHPK3PXP|true');
    assert.match(result.stderr, /normalized NV0_ADMIN_TOTP_SECRET transport formatting/);
  } finally { fs.rmSync(runtime, { recursive: true, force: true }); }
});
add('entrypoint rejects wrong secret type without echoing it', () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'nv0-totp-transport-'));
  const secret = 'app_X1taFrEQcXF2pSEKJbKymzNJqNrLP1ZPuoLl';
  try {
    const result = spawnSync('sh', [entrypoint, 'sh', '-c', 'echo should-not-run'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NV0_PLATFORM_TARGET: 'commercial', NV0_ADMIN_MFA_REQUIRED: 'true', NV0_ADMIN_TOTP_SECRET: secret, NV0_TOTP_PREFLIGHT_FAILURE_MODE: 'exit', NV0_PREFLIGHT_FAILURE_DELAY_SECONDS: '0', NV0_RUN_PREFLIGHT: 'false', NV0_RUNTIME_DIR: runtime, NV0_FALLBACK_RUNTIME_DIR: runtime, NV0_REQUIRE_PERSISTENT_RUNTIME: 'false' }
    });
    assert.equal(result.status, 78);
    assert.match(result.stderr, /wrong_secret_type_base64url_like/);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
  } finally { fs.rmSync(runtime, { recursive: true, force: true }); }
});

add('invalid internal padding is rejected', () => {
  const result = analyzeTotpSecretConfig('JBSWY3DP=EHPK3PXP');
  assert.equal(result.valid, false);
  assert.equal(result.paddingValid, false);
});
add('excessively long Base32 value is rejected', () => {
  const result = analyzeTotpSecretConfig('A'.repeat(129));
  assert.equal(result.valid, false);
  assert.equal(result.tooLong, true);
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'commercial-totp-transport-hardening-v1', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COMMERCIAL_TOTP_TRANSPORT_HARDENING.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
