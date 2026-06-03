import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRuntimeConfig } from '../server/config/validation.mjs';
import { validateCommercialEnv } from '../server/bootstrap/commercial-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'docs/current/COMMERCIAL_MAX_HARDENING_TEST.json');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
function expectThrow(name, fn, pattern) {
  add(name, () => assert.throws(fn, pattern));
}
function validRuntimeInput() {
  return {
    env: {},
    platform: { commercial: false, target: 'mvp' },
    port: 3210,
    sessionTtlMs: 3_600_000,
    maxJsonBodyBytes: 65_536,
    maxMultipartBodyBytes: 5_242_880,
    publicScanLimit: 20,
    publicScanWindowMs: 60_000,
    adminAuthLimit: 8,
    adminAuthWindowMs: 600_000,
    backupRetentionCount: 20,
    autoBackupIntervalMs: 21_600_000,
    auditLogRetentionCount: 1000,
    scanCacheTtlMs: 300_000,
    ctaAutopublishIntervalMs: 1_200_000,
    publicCacheSeconds: 60,
    requestTimeoutMs: 15_000,
    slowRequestThresholdMs: 1500,
    dataDestructionGraceDays: 30,
    targetFetchTimeoutMs: 3000,
    targetFetchMaxBytes: 524_288,
    targetFetchMaxRedirects: 3,
    scanSoftTimeoutMs: 6500,
    targetFetchMaxPages: 12,
    targetFetchConcurrency: 4,
    targetFetchMaxSitemapUrls: 40,
    targetFetchMaxDiscoveryResources: 4,
    dataRetentionDays: 90,
    refundRequestWindowDays: 7,
    paymentIdempotencyTtlMs: 86_400_000,
    emailMaxRetryCount: 5,
    emailRetryBackoffMs: 300_000,
    publicAssetCacheSeconds: 31_536_000,
    readyzCacheTtlMs: 3000,
    redisTimeoutMs: 1500
  };
}
function validCommercialEnv() {
  return {
    NODE_ENV: 'production',
    NV0_PLATFORM_TARGET: 'commercial',
    NV0_DEPLOYMENT_STAGE: 'prelaunch',
    NV0_COMMERCIAL_LAUNCH_READY: 'false',
    NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
    NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
    NV0_SESSION_SECRET: 'session-secret-123456789012345678901234567890',
    NV0_SECURE_RECORDS_KEY: 'records-secret-123456789012345678901234567890',
    NV0_PRIVACY_HASH_KEY: 'privacy-secret-123456789012345678901234567890',
    NV0_ADMIN_AUTH_MODE: 'account_rbac',
    NV0_ADMIN_MFA_REQUIRED: 'true',
    NV0_ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
    NV0_BOOTSTRAP_ADMIN_EMAIL: 'admin@nv0.kr',
    NV0_BOOTSTRAP_ADMIN_PASSWORD: 'VeryStrongAdminPassword123!',
    NV0_ADMIN_IP_ALLOWLIST: '203.0.113.10/32',
    NV0_PERSISTENCE_MODE: 'postgres_primary',
    NV0_DATABASE_URL: 'postgres://nv0:ci-only-password@postgres:5432/nv0',
    NV0_REDIS_URL: 'redis://redis:6379/0',
    NV0_SESSION_STORE: 'redis',
    NV0_RATE_LIMIT_STORE: 'redis',
    NV0_LOCK_PROVIDER: 'redis',
    NV0_STORAGE_MODE: 's3',
    NV0_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    NV0_S3_BUCKET: 'nv0-production',
    NV0_S3_ACCESS_KEY_ID: 'r2-access-key-1234567890',
    NV0_S3_SECRET_ACCESS_KEY: 'r2-secret-key-12345678901234567890',
    NV0_SCAN_PROVIDER: 'external_http',
    NV0_SCAN_PROVIDER_URL: 'https://scan.vendor.kr/api/scan',
    NV0_SCAN_PROVIDER_FALLBACK: 'true',
    NV0_PAYMENT_PROVIDER: 'disabled',
    NV0_PORTONE_WEBHOOK_VERIFY_MODE: 'strict',
    NV0_SMTP_URL: 'smtps://mailer:StrongPass123@smtp.vendor.kr:465',
    NV0_EMAIL_FROM: 'ct@nv0.kr',
    NV0_OPERATOR_ALERT_EMAIL: 'ct@nv0.kr',
    NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION: 'true',
    NV0_BACKUP_ENCRYPTION_SECRET: 'backup-secret-123456789012345678901234567890',
    NV0_HOSTING_PROVIDER: 'Coolify/Contabo',
    NV0_CUSTOMER_SERVICE_PHONE: '이메일전용고객지원',
    NV0_PRIVACY_OFFICER_EMAIL: 'ct@nv0.kr',
    NV0_BUSINESS_TRADE_NAME: '엔브이제로',
    NV0_BUSINESS_REPRESENTATIVE: '운영담당자',
    NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
    NV0_BUSINESS_ADDRESS: '서울특별시 중구 세종대로 1',
    NV0_MAIL_ORDER_REGISTRATION_NUMBER: ''
  };
}

add('valid-runtime-input-accepted', () => assert.equal(validateRuntimeConfig(validRuntimeInput()).ok, true));
for (const [field, value, pattern] of [
  ['targetFetchTimeoutMs', 100, /NV0_TARGET_FETCH_TIMEOUT_MS/],
  ['targetFetchMaxBytes', 1024, /NV0_TARGET_FETCH_MAX_BYTES/],
  ['targetFetchMaxRedirects', 99, /NV0_TARGET_FETCH_MAX_REDIRECTS/],
  ['scanSoftTimeoutMs', 100, /NV0_SCAN_SOFT_TIMEOUT_MS/],
  ['targetFetchMaxPages', 100, /NV0_TARGET_FETCH_MAX_PAGES/],
  ['targetFetchConcurrency', 0, /NV0_TARGET_FETCH_CONCURRENCY/],
  ['targetFetchMaxSitemapUrls', 100, /NV0_TARGET_FETCH_MAX_SITEMAP_URLS/],
  ['targetFetchMaxDiscoveryResources', 0, /NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES/],
  ['dataRetentionDays', 0, /NV0_DATA_RETENTION_DAYS/],
  ['refundRequestWindowDays', 999, /NV0_REFUND_REQUEST_WINDOW_DAYS/],
  ['paymentIdempotencyTtlMs', 1, /NV0_PAYMENT_IDEMPOTENCY_TTL_MS/],
  ['emailMaxRetryCount', 99, /NV0_EMAIL_MAX_RETRY_COUNT/],
  ['emailRetryBackoffMs', 1, /NV0_EMAIL_RETRY_BACKOFF_MS/],
  ['publicAssetCacheSeconds', 99_999_999, /NV0_PUBLIC_ASSET_CACHE_SECONDS/],
  ['readyzCacheTtlMs', 99_999, /NV0_READYZ_CACHE_TTL_MS/],
  ['redisTimeoutMs', 1, /NV0_REDIS_TIMEOUT_MS/]
]) {
  expectThrow(`runtime-range-rejects-${field}`, () => validateRuntimeConfig({ ...validRuntimeInput(), [field]: value }), pattern);
}

add('commercial-prelaunch-valid-profile-accepted', () => {
  const result = validateCommercialEnv(validCommercialEnv());
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.prelaunch, true);
  assert.ok(result.warnings.some(item => /mail-order registration/.test(item)));
});
add('commercial-mfa-disabled-blocked', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_ADMIN_MFA_REQUIRED: 'false' });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some(item => /NV0_ADMIN_MFA_REQUIRED/.test(item)));
});
add('commercial-invalid-totp-blocked', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_ADMIN_TOTP_SECRET: 'replace-with-base32-totp-secret' });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some(item => /Base32/.test(item)) || result.missing.includes('NV0_ADMIN_TOTP_SECRET'));
});
add('commercial-http-s3-endpoint-blocked', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_S3_ENDPOINT: 'http://storage.vendor.invalid' });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some(item => /NV0_S3_ENDPOINT/.test(item)));
});
add('commercial-prelaunch-online-payment-blocked', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_PAYMENT_PROVIDER: 'portone_v2' });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some(item => /disabled during prelaunch/.test(item)));
});
add('commercial-launch-requires-turnstile-and-portone-secrets', () => {
  const env = { ...validCommercialEnv(), NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PAYMENT_PROVIDER: 'portone_v2' };
  const result = validateCommercialEnv(env);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('NV0_TURNSTILE_SITE_KEY'));
  assert.ok(result.missing.includes('NV0_PORTONE_API_SECRET'));
});
add('commercial-placeholder-secret-not-configured', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_SESSION_SECRET: 'replace-with-long-random-session-secret' });
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('NV0_SESSION_SECRET'));
});
add('commercial-wildcard-admin-allowlist-blocked', () => {
  const result = validateCommercialEnv({ ...validCommercialEnv(), NV0_ADMIN_IP_ALLOWLIST: '0.0.0.0/0' });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some(item => /wildcard/.test(item)));
});

add('commercial-local-minio-prelaunch-allowed', () => {
  const env = validCommercialEnv();
  env.NV0_S3_ENDPOINT = 'http://minio:9000';
  const result = validateCommercialEnv(env, { strict: true });
  assert.equal(result.ok, true, JSON.stringify(result.blockers));
  assert.ok(result.warnings.some(item => item.includes('local-minio-prelaunch-only')));
});

const failures = checks.filter(item => !item.ok);
const report = { ok: failures.length === 0, contract: 'commercial-max-hardening-runtime-contract-v1', checkedAt: new Date().toISOString(), checked: checks.length, failed: failures.length, failures, checks };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, contract: report.contract, checked: report.checked, failed: report.failed, report: path.relative(root, reportPath).replaceAll('\\', '/') }, null, 2));
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
