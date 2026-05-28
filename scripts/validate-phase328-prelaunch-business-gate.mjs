import { spawnSync } from 'node:child_process';
import { validateRuntimeConfig } from '../server/config/validation.mjs';

const checks = [];
function add(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail });
}

const baseEnv = {
  NODE_ENV: 'production',
  PORT: '3000',
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_DEPLOYMENT_STAGE: 'prelaunch',
  NV0_COMMERCIAL_LAUNCH_READY: 'false',
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_SUPPORT_EMAIL: 'support@nv0.kr',
  NV0_HOSTING_PROVIDER: 'Coolify on Contabo',
  NV0_CUSTOMER_SERVICE_PHONE: '02-1234-5678',
  NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
  NV0_SMTP_URL: 'smtps://user:pass@smtp.mail.example:465?from=support%40nv0.kr',
  NV0_ADMIN_IP_ALLOWLIST: '203.0.113.10/32',
  NV0_BOOTSTRAP_ADMIN_EMAIL: 'admin@nv0.kr',
  NV0_BOOTSTRAP_ADMIN_PASSWORD: 'Real-Admin-Password-1234!',
  NV0_ADMIN_AUTH_MODE: 'account_rbac',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_DATABASE_URL: 'postgresql://nv0:pass@postgres:5432/nv0',
  NV0_REDIS_URL: 'redis://redis:6379',
  NV0_SESSION_STORE: 'redis',
  NV0_RATE_LIMIT_STORE: 'redis',
  NV0_LOCK_PROVIDER: 'redis',
  NV0_STORAGE_MODE: 's3_compatible',
  NV0_S3_ENDPOINT: 'https://s3.example.net',
  NV0_S3_BUCKET: 'nv0-prod',
  NV0_S3_ACCESS_KEY_ID: 'real-access-key',
  NV0_S3_SECRET_ACCESS_KEY: 'real-secret-key',
  NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION: 'true',
  NV0_BACKUP_ENCRYPTION_SECRET: 'real-backup-secret',
  NV0_SECURE_RECORDS_KEY: 'real-secure-records-key',
  NV0_PRIVACY_HASH_KEY: 'real-privacy-hash-key',
  NV0_SCAN_PROVIDER: 'external_http',
  NV0_SCAN_PROVIDER_URL: 'https://scanner.example.net/scan',
  NV0_PAYMENT_PROVIDER: 'disabled',
  NV0_PORTONE_WEBHOOK_VERIFY_MODE: 'strict',
  NV0_TRUST_PROXY_HEADERS: 'true',
  NV0_ALLOWED_ADMIN_ORIGINS: 'nv0.kr,www.nv0.kr'
};

try {
  const result = validateRuntimeConfig({
    env: baseEnv,
    platform: { commercial: true, target: 'commercial' },
    port: 3000,
    commercialLaunchReady: false,
    prelaunchMode: true,
    adminAuthMode: 'account_rbac',
    persistenceMode: 'postgres_primary',
    storageMode: 's3_compatible',
    scanProvider: 'external_http',
    paymentProvider: 'disabled',
    sessionTtlMs: 3600000,
    maxJsonBodyBytes: 1048576,
    maxMultipartBodyBytes: 20971520,
    publicScanLimit: 100,
    publicScanWindowMs: 60000,
    adminAuthLimit: 10,
    adminAuthWindowMs: 60000,
    backupRetentionCount: 10,
    autoBackupIntervalMs: 300000,
    auditLogRetentionCount: 1000,
    scanCacheTtlMs: 60000,
    ctaAutopublishIntervalMs: 60000,
    publicCacheSeconds: 60,
    requestTimeoutMs: 10000,
    slowRequestThresholdMs: 1000,
    dataDestructionGraceDays: 30
  });
  add('runtime:prelaunch-allows-missing-business-profile', result.ok && result.warnings.some((w) => w.includes('prelaunch business profile is incomplete')));
} catch (error) {
  add('runtime:prelaunch-allows-missing-business-profile', false, error.message);
}

try {
  validateRuntimeConfig({
    env: { ...baseEnv, NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PAYMENT_PROVIDER: 'portone_v2', NV0_ENABLE_TURNSTILE: 'true', NV0_TURNSTILE_SECRET: 'real-turnstile-secret', NV0_TURNSTILE_SITE_KEY: 'real-turnstile-site-key' },
    platform: { commercial: true, target: 'commercial' },
    port: 3000,
    commercialLaunchReady: true,
    prelaunchMode: false,
    adminAuthMode: 'account_rbac',
    persistenceMode: 'postgres_primary',
    storageMode: 's3_compatible',
    scanProvider: 'external_http',
    paymentProvider: 'portone_v2',
    sessionTtlMs: 3600000,
    maxJsonBodyBytes: 1048576,
    maxMultipartBodyBytes: 20971520,
    publicScanLimit: 100,
    publicScanWindowMs: 60000,
    adminAuthLimit: 10,
    adminAuthWindowMs: 60000,
    backupRetentionCount: 10,
    autoBackupIntervalMs: 300000,
    auditLogRetentionCount: 1000,
    scanCacheTtlMs: 60000,
    ctaAutopublishIntervalMs: 60000,
    publicCacheSeconds: 60,
    requestTimeoutMs: 10000,
    slowRequestThresholdMs: 1000,
    dataDestructionGraceDays: 30
  });
  add('runtime:commercial-launch-blocks-missing-business-profile', false, 'commercial launch accepted missing business keys');
} catch (error) {
  add('runtime:commercial-launch-blocks-missing-business-profile', /NV0_BUSINESS_TRADE_NAME|NV0_BUSINESS_REPRESENTATIVE|NV0_BUSINESS_REGISTRATION_NUMBER|NV0_BUSINESS_ADDRESS/.test(error.message), error.message);
}

const preflight = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, ...baseEnv },
  encoding: 'utf8'
});
add('preflight:prelaunch-missing-business-is-warning', preflight.status === 0 && preflight.stdout.includes('ok') && preflight.stdout.includes('Prelaunch legal business profile is incomplete'), preflight.stderr || preflight.stdout);

const prodEnv = spawnSync(process.execPath, ['scripts/validate-prod-env.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, ...baseEnv },
  encoding: 'utf8'
});
add('prod-env:prelaunch-missing-business-is-warning', prodEnv.status === 0 && prodEnv.stdout.includes('Prelaunch legal business profile is incomplete'), prodEnv.stderr || prodEnv.stdout);

const failed = checks.filter((check) => !check.ok);
const report = { ok: failed.length === 0, checks };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
