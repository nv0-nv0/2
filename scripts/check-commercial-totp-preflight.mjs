import { assertTotpSecretConfig } from '../server/config/validation.mjs';

const env = process.env;
const target = String(env.NV0_PLATFORM_TARGET || 'mvp').trim().toLowerCase();
const mfaRequired = String(env.NV0_ADMIN_MFA_REQUIRED || '').trim().toLowerCase() === 'true';
const gate = 'commercial-admin-totp-secret-preflight';
const verbose = String(env.NV0_TOTP_PREFLIGHT_VERBOSE || '').trim().toLowerCase() === 'true';

function emit(payload, stream = process.stdout) {
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (target !== 'commercial') {
  if (verbose) emit({ ok: true, gate, skipped: true, reason: 'non-commercial target' });
  process.exit(0);
}

const errors = [];
if (!mfaRequired) {
  errors.push('NV0_ADMIN_MFA_REQUIRED must be true for commercial deployments. Save NV0_ADMIN_MFA_REQUIRED=true in Coolify and redeploy.');
}
try {
  assertTotpSecretConfig('NV0_ADMIN_TOTP_SECRET', env.NV0_ADMIN_TOTP_SECRET);
} catch {
  errors.push('NV0_ADMIN_TOTP_SECRET must be a finalized Base32 TOTP secret with at least 16 characters. Run npm run secrets:generate locally, copy only NV0_ADMIN_TOTP_SECRET into the Coolify Runtime Variable, save, and redeploy. Do not paste the secret into logs or chat.');
}

if (errors.length) {
  emit({ ok: false, gate, commercial: true, errors }, process.stderr);
  process.exit(1);
}

if (verbose) emit({ ok: true, gate, commercial: true, secretValidated: true });
