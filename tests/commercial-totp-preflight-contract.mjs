import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const run = (overrides = {}) => spawnSync(process.execPath, ['scripts/check-commercial-totp-preflight.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    NV0_PLATFORM_TARGET: 'commercial',
    NV0_ADMIN_MFA_REQUIRED: 'true',
    NV0_ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
    ...overrides
  }
});

const cases = [];
function add(name, fn) {
  try { fn(); cases.push({ name, ok: true }); }
  catch (error) { cases.push({ name, ok: false, error: error.message }); }
}

add('valid commercial Base32 TOTP secret passes without echoing the secret', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stdout + result.stderr, /JBSWY3DPEHPK3PXP/);
});

add('placeholder TOTP secret is rejected before server startup', () => {
  const secret = 'replace-with-base32-totp-secret';
  const result = run({ NV0_ADMIN_TOTP_SECRET: secret });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /finalized Base32 TOTP secret with at least 16 characters/);
  assert.match(result.stderr, /npm run secrets:generate locally/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

add('missing TOTP secret is rejected before server startup', () => {
  const result = run({ NV0_ADMIN_TOTP_SECRET: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NV0_ADMIN_TOTP_SECRET/);
});

add('non-commercial targets skip the commercial TOTP gate', () => {
  const result = run({ NV0_PLATFORM_TARGET: 'mvp', NV0_ADMIN_MFA_REQUIRED: 'false', NV0_ADMIN_TOTP_SECRET: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

add('verbose mode can emit a non-sensitive success record', () => {
  const result = run({ NV0_TOTP_PREFLIGHT_VERBOSE: 'true' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\"secretValidated\": true/);
  assert.doesNotMatch(result.stdout + result.stderr, /JBSWY3DPEHPK3PXP/);
});

add('entrypoint runs strict TOTP preflight before optional legacy preflight and server exec', () => {
  const entrypoint = fs.readFileSync('deploy/entrypoint.sh', 'utf8');
  const strictIndex = entrypoint.indexOf('node scripts/check-commercial-totp-preflight.mjs');
  const legacyIndex = entrypoint.indexOf('node scripts/preflight.mjs');
  const serverIndex = entrypoint.indexOf('exec node server/index.mjs');
  assert.ok(strictIndex > -1, 'strict TOTP preflight missing from entrypoint');
  assert.ok(legacyIndex > strictIndex, 'strict TOTP preflight must run before legacy preflight');
  assert.ok(serverIndex > strictIndex, 'strict TOTP preflight must run before server startup');
});

const failures = cases.filter(item => !item.ok);
console.log(JSON.stringify({ ok: failures.length === 0, contract: 'commercial-totp-preflight-alignment-v1', checked: cases.length, failed: failures.length, failures, cases }, null, 2));
if (failures.length) process.exit(1);
