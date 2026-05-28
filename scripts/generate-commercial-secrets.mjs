import crypto from 'node:crypto';

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

const values = {
  NV0_BOOTSTRAP_ADMIN_PASSWORD: secret(36),
  POSTGRES_PASSWORD: secret(36),
  NV0_SECURE_RECORDS_KEY: secret(48),
  NV0_PRIVACY_HASH_KEY: secret(48),
  NV0_BACKUP_ENCRYPTION_SECRET: secret(48),
  NV0_SCAN_PROVIDER_TOKEN: secret(32)
};

for (const [key, value] of Object.entries(values)) {
  console.log(`${key}=${value}`);
}
