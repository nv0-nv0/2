import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { validateRuntimeConfig } from '../server/config/validation.mjs';

const checks = [];
function add(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail: String(detail || '').slice(0, 1200) });
}

const businessEnv = {
  NV0_BUSINESS_TRADE_NAME: '엔브이제로(NV0)',
  NV0_BUSINESS_REPRESENTATIVE: '나금상',
  NV0_BUSINESS_REGISTRATION_NUMBER: '584-77-00586',
  NV0_BUSINESS_ADDRESS: '경기도 남양주시 와부읍 덕소로97번길 34, 105동 402호(덕소주공아파트 1단지)',
  NV0_MAIL_ORDER_REGISTRATION_NUMBER: ''
};

const baseEnv = {
  NODE_ENV: 'production',
  PORT: '3000',
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_DEPLOYMENT_STAGE: 'prelaunch',
  NV0_COMMERCIAL_LAUNCH_READY: 'false',
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_HOSTING_PROVIDER: 'Coolify on Contabo',
  NV0_CUSTOMER_SERVICE_PHONE: '02-1234-5678',
  NV0_PRIVACY_OFFICER_EMAIL: 'ct@nv0.kr',
  NV0_SMTP_URL: 'smtps://user:pass@smtp.mail.example:465?from=ct%40nv0.kr',
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
  NV0_S3_BUCKET: 'vr-prod',
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
  NV0_ALLOWED_ADMIN_ORIGINS: 'nv0.kr,www.nv0.kr',
  ...businessEnv
};

const runtimeInput = {
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
};

try {
  const result = validateRuntimeConfig({ ...runtimeInput, env: baseEnv });
  add('runtime:prelaunch-business-complete-mail-order-pending-is-ok', result.ok && result.warnings.some((w) => w.includes('mail-order registration number is not set')), JSON.stringify(result));
} catch (error) {
  add('runtime:prelaunch-business-complete-mail-order-pending-is-ok', false, error.message);
}

try {
  validateRuntimeConfig({
    ...runtimeInput,
    env: { ...baseEnv, NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PAYMENT_PROVIDER: 'portone_v2', NV0_ENABLE_TURNSTILE: 'true', NV0_TURNSTILE_SECRET: 'real-turnstile-secret', NV0_TURNSTILE_SITE_KEY: 'real-turnstile-site-key' },
    commercialLaunchReady: true,
    prelaunchMode: false,
    paymentProvider: 'portone_v2'
  });
  add('runtime:commercial-launch-still-blocks-missing-mail-order', false, 'commercial launch accepted missing NV0_MAIL_ORDER_REGISTRATION_NUMBER');
} catch (error) {
  add('runtime:commercial-launch-still-blocks-missing-mail-order', /NV0_MAIL_ORDER_REGISTRATION_NUMBER/.test(error.message), error.message);
}

const preflight = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, ...baseEnv },
  encoding: 'utf8'
});
add('preflight:business-complete-mail-order-pending-is-warning', preflight.status === 0 && preflight.stdout.includes('ok') && preflight.stdout.includes('Prelaunch mail-order registration number is not set'), preflight.stderr || preflight.stdout);

const prodEnv = spawnSync(process.execPath, ['scripts/validate-prod-env.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, ...baseEnv },
  encoding: 'utf8'
});
add('prod-env:business-complete-mail-order-pending-is-warning', prodEnv.status === 0 && prodEnv.stdout.includes('Prelaunch mail-order registration number is not set'), prodEnv.stderr || prodEnv.stdout);

const businessInfo = fs.readFileSync('apps/public/business-info/index.html', 'utf8');
add('public-business-info:actual-business-profile-fallback', businessInfo.includes('엔브이제로(NV0)') && businessInfo.includes('나금상') && businessInfo.includes('584-77-00586') && businessInfo.includes('경기도 남양주시 와부읍 덕소로97번길 34'), 'static fallback business-info page check');
add('public-business-info:no-mail-order-placeholder-exposure', !/통신판매업 신고번호:\s*(예정|입력|확인|상용|placeholder|replace)/i.test(businessInfo), 'mail-order placeholder should not be exposed in static public page');

const failed = checks.filter((check) => !check.ok);
const report = { ok: failed.length === 0, phase: 'phase329', scenario: 'business profile set; mail-order registration pending', checks };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
