import { analyzeTotpSecretConfig, totpSecretInvalidReason } from '../server/config/validation.mjs';

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
const totp = analyzeTotpSecretConfig(env.NV0_ADMIN_TOTP_SECRET);
if (!totp.valid) {
  const reason = totpSecretInvalidReason(totp);
  const guidance = reason === 'wrong_secret_type_base64url_like'
    ? 'The configured value looks like a different application secret, not a TOTP Base32 key. Generate a dedicated TOTP key locally and replace only this variable.'
    : reason === 'invalid_base32_characters' || reason === 'invalid_base32_padding'
      ? 'The configured value is not a valid Base32 key using A-Z and 2-7 with optional trailing padding only. Replace it with a dedicated TOTP Base32 key.'
      : reason === 'too_long'
        ? 'The configured value is unexpectedly long. Generate a dedicated TOTP Base32 key locally and replace only this variable.'
        : 'Generate a dedicated TOTP Base32 key locally and replace only this variable.';
  errors.push(`NV0_ADMIN_TOTP_SECRET is invalid (${reason}). ${guidance} Run node scripts/generate-admin-totp-secret.mjs --value-only locally, paste the copied raw Base32 value into the Coolify Runtime Variable, save, and redeploy. Do not paste the secret into logs or chat.`);
}

if (errors.length) {
  emit({ ok: false, gate, commercial: true, errors }, process.stderr);
  process.exit(1);
}

if (verbose) emit({ ok: true, gate, commercial: true, secretValidated: true });
