import crypto from 'node:crypto';

const args = new Set(process.argv.slice(2));
const preserveTotp = args.has('--preserve-totp');

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}
function hexSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
function base32Secret(bytes = 20) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const data = crypto.randomBytes(bytes);
  let bits = '', out = '';
  for (const byte of data) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += alphabet[Number.parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}

const values = {
  NV0_ADMIN_MFA_REQUIRED: 'true',
  NV0_ADMIN_TOTP_SECRET: base32Secret(20),
  NV0_SESSION_SECRET: secret(48),
  NV0_BOOTSTRAP_ADMIN_PASSWORD: secret(36),
  POSTGRES_PASSWORD: secret(36),
  NV0_DATABASE_URL: '',
  NV0_REDIS_URL: 'redis://redis:6379/0',
  NV0_SECURE_RECORDS_KEY: secret(48),
  NV0_SECURE_RECORDS_SALT: hexSecret(32),
  NV0_PRIVACY_HASH_KEY: secret(48),
  NV0_BACKUP_ENCRYPTION_SECRET: secret(48),
  NV0_SCAN_PROVIDER_TOKEN: secret(32)
};
values.NV0_DATABASE_URL = `postgres://nv0:${values.POSTGRES_PASSWORD}@postgres:5432/nv0`;

for (const [key, value] of Object.entries(values)) {
  if (preserveTotp && ['NV0_ADMIN_MFA_REQUIRED', 'NV0_ADMIN_TOTP_SECRET'].includes(key)) continue;
  console.log(`${key}=${value}`);
}
