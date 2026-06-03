import { analyzeTotpSecretConfig, totpSecretInvalidReason } from '../server/config/validation.mjs';

const env = process.env;
const value = String(env.NV0_ADMIN_TOTP_SECRET ?? '');
const analysis = analyzeTotpSecretConfig(value);
const invalidKinds = [];
if (/[_]/.test(value)) invalidKinds.push('underscore');
if (/[0189]/.test(value)) invalidKinds.push('digits_outside_base32_2_to_7');
if (/[^A-Za-z0-9_=\s'"-]/u.test(value)) invalidKinds.push('other_symbol');
const payload = {
  ok: analysis.valid,
  gate: 'commercial-admin-totp-secret-safe-diagnostic',
  platformTarget: String(env.NV0_PLATFORM_TARGET || 'mvp').trim().toLowerCase(),
  deploymentStage: String(env.NV0_DEPLOYMENT_STAGE || 'mvp').trim().toLowerCase(),
  mfaRequired: String(env.NV0_ADMIN_MFA_REQUIRED || '').trim().toLowerCase() === 'true',
  present: value.trim().length > 0,
  originalLength: value.trim().length,
  normalizedLength: analysis.unpaddedLength,
  validBase32TotpSecret: analysis.valid,
  reason: analysis.valid ? null : totpSecretInvalidReason(analysis),
  transportFormatting: {
    assignmentPrefixDetected: analysis.removedAssignmentPrefix,
    wrappingQuotesDetected: analysis.removedWrappingQuotes,
    separatorsDetected: analysis.removedSeparators
  },
  invalidCharacterKinds: invalidKinds,
  secretPrinted: false,
  nextAction: analysis.valid
    ? 'Redeploy and verify /healthz, /readyz and Microsoft Authenticator login.'
    : 'Generate a dedicated Base32 TOTP secret locally with: node scripts/generate-admin-totp-secret.mjs --value-only. Paste only the raw Base32 value into the Coolify Runtime Variable, save, and redeploy.'
};
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
if (!analysis.valid) process.exitCode = 1;
