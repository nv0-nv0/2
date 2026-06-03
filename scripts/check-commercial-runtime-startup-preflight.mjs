import { createPlatformProfile } from '../server/core/platform.mjs';
import { readEnvConfig } from '../server/config/env.mjs';
import { isPlaceholderConfigValue, validateRuntimeConfig } from '../server/config/validation.mjs';

const env = process.env;
const platform = createPlatformProfile(env);
const jsonMode = process.argv.includes('--json');

function lower(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}
function bool(name, fallback = false) {
  if (env[name] === undefined) return fallback;
  return lower(env[name]) === 'true';
}
function number(name, fallback) {
  const raw = env[name];
  return Number(raw === undefined || String(raw).trim() === '' ? fallback : raw);
}
function issueKey(message = '') {
  const match = String(message).match(/\b(?:NV0|POSTGRES)_[A-Z0-9_]+\b/);
  return match?.[0] || 'commercial-runtime-config';
}
function remediation(key) {
  const direct = {
    NV0_SESSION_SECRET: 'Run npm run secrets:generate locally and replace NV0_SESSION_SECRET in Coolify Runtime Variables with the generated value. Use at least 32 characters.',
    NV0_SECURE_RECORDS_KEY: 'Run npm run secrets:generate locally and replace NV0_SECURE_RECORDS_KEY in Coolify Runtime Variables with the generated value.',
    NV0_PRIVACY_HASH_KEY: 'Run npm run secrets:generate locally and replace NV0_PRIVACY_HASH_KEY in Coolify Runtime Variables with the generated value.',
    NV0_BACKUP_ENCRYPTION_SECRET: 'Run npm run secrets:generate locally and replace NV0_BACKUP_ENCRYPTION_SECRET in Coolify Runtime Variables with the generated value.',
    NV0_BOOTSTRAP_ADMIN_PASSWORD: 'Run npm run secrets:generate locally and replace NV0_BOOTSTRAP_ADMIN_PASSWORD in Coolify Runtime Variables with the generated value.',
    NV0_REDIS_URL: 'Set a redis:// or rediss:// NV0_REDIS_URL Runtime Variable, save, and redeploy.',
    NV0_SMTP_URL: 'Set an smtp:// or smtps:// NV0_SMTP_URL Runtime Variable, save, and redeploy.',
    NV0_S3_ENDPOINT: 'Set an HTTPS NV0_S3_ENDPOINT Runtime Variable for object storage, save, and redeploy.'
  };
  return direct[key] || `Finalize ${key} in Coolify Runtime Variables, save, and redeploy.`;
}

function present(name) {
  const value = String(env[name] || '').trim();
  return value && !isPlaceholderConfigValue(value) ? value : '';
}
function validUrl(name, protocols) {
  const value = present(name);
  if (!value) return false;
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol);
  } catch {
    return false;
  }
}
function collectAggregateIssues({ deploymentStage, commercialLaunchReady, prelaunchMode, adminAuthMode, persistenceMode, storageMode, scanProvider, paymentProvider }) {
  const issues = [];
  const seen = new Set();
  const add = (key, code, message, fix = remediation(key)) => {
    const signature = `${key}|${code}|${message}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    issues.push({ key, code, message, remediation: fix });
  };
  const required = (key) => { if (!present(key)) add(key, 'missing_or_placeholder', `${key} must be finalized before commercial startup.`); };
  const secret = (key, minLength) => {
    const value = present(key);
    if (!value) add(key, 'missing_or_placeholder', `${key} must be finalized before commercial startup.`);
    else if (value.length < minLength) add(key, 'too_short', `${key} must contain at least ${minLength} characters.`);
  };

  for (const [key, minLength] of [
    ['NV0_SESSION_SECRET', 32],
    ['NV0_SECURE_RECORDS_KEY', 32],
    ['NV0_PRIVACY_HASH_KEY', 32],
    ['NV0_BACKUP_ENCRYPTION_SECRET', 32],
    ['NV0_BOOTSTRAP_ADMIN_PASSWORD', 15]
  ]) secret(key, minLength);

  for (const key of ['NV0_BOOTSTRAP_ADMIN_EMAIL','NV0_PUBLIC_BASE_URL','NV0_SUPPORT_EMAIL','NV0_HOSTING_PROVIDER','NV0_CUSTOMER_SERVICE_PHONE','NV0_PRIVACY_OFFICER_EMAIL','NV0_ADMIN_IP_ALLOWLIST','NV0_REDIS_URL','NV0_SMTP_URL','NV0_SCAN_PROVIDER_URL','NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY']) required(key);

  const allowDbFallback = ['1','true','yes','on','fallback'].includes(lower(env.NV0_POSTGRES_FALLBACK_MODE || env.NV0_PRELAUNCH_DB_FALLBACK || env.NV0_ALLOW_DB_FALLBACK, prelaunchMode ? 'true' : 'false'));
  if (commercialLaunchReady || !allowDbFallback) required('NV0_DATABASE_URL');

  if (adminAuthMode !== 'account_rbac') add('NV0_ADMIN_AUTH_MODE', 'invalid_enum', 'NV0_ADMIN_AUTH_MODE must be account_rbac for commercial startup.');
  if (persistenceMode !== 'postgres_primary') add('NV0_PERSISTENCE_MODE', 'invalid_enum', 'NV0_PERSISTENCE_MODE must be postgres_primary for commercial startup.');
  if (storageMode === 'local_fs') add('NV0_STORAGE_MODE', 'invalid_enum', 'NV0_STORAGE_MODE must use S3-compatible object storage for commercial startup.');
  if (scanProvider !== 'external_http') add('NV0_SCAN_PROVIDER', 'invalid_enum', 'NV0_SCAN_PROVIDER must be external_http for commercial startup.');
  if (prelaunchMode && paymentProvider !== 'disabled') add('NV0_PAYMENT_PROVIDER', 'prelaunch_payment_must_be_disabled', 'NV0_PAYMENT_PROVIDER must remain disabled during prelaunch.');
  if (String(env.NV0_SESSION_STORE || '').trim() !== 'redis') add('NV0_SESSION_STORE', 'invalid_store', 'NV0_SESSION_STORE must be redis for commercial startup.');
  if (String(env.NV0_RATE_LIMIT_STORE || '').trim() !== 'redis') add('NV0_RATE_LIMIT_STORE', 'invalid_store', 'NV0_RATE_LIMIT_STORE must be redis for commercial startup.');
  if (String(env.NV0_LOCK_PROVIDER || '').trim() !== 'redis') add('NV0_LOCK_PROVIDER', 'invalid_store', 'NV0_LOCK_PROVIDER must be redis for commercial startup.');
  if (lower(env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION) !== 'true') add('NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION', 'must_be_true', 'NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION must be true for commercial startup.');

  if (present('NV0_REDIS_URL') && !validUrl('NV0_REDIS_URL', ['redis:','rediss:'])) add('NV0_REDIS_URL', 'invalid_protocol', 'NV0_REDIS_URL must use redis:// or rediss://.');
  if (present('NV0_SMTP_URL') && !validUrl('NV0_SMTP_URL', ['smtp:','smtps:'])) add('NV0_SMTP_URL', 'invalid_protocol', 'NV0_SMTP_URL must use smtp:// or smtps://.');
  if (present('NV0_SCAN_PROVIDER_URL') && !validUrl('NV0_SCAN_PROVIDER_URL', ['https:'])) add('NV0_SCAN_PROVIDER_URL', 'invalid_protocol', 'NV0_SCAN_PROVIDER_URL must use https://.');
  if (present('NV0_PUBLIC_BASE_URL') && !validUrl('NV0_PUBLIC_BASE_URL', ['https:'])) add('NV0_PUBLIC_BASE_URL', 'invalid_protocol', 'NV0_PUBLIC_BASE_URL must use https://.');
  if (present('NV0_S3_ENDPOINT')) {
    try {
      const url = new URL(present('NV0_S3_ENDPOINT'));
      const local = new Set(['minio','localhost','127.0.0.1','::1']).has(url.hostname);
      if (url.protocol !== 'https:' && !(prelaunchMode && url.protocol === 'http:' && local)) add('NV0_S3_ENDPOINT', 'invalid_protocol', 'NV0_S3_ENDPOINT must use HTTPS except private local MinIO during prelaunch.');
    } catch {
      add('NV0_S3_ENDPOINT', 'invalid_url', 'NV0_S3_ENDPOINT must be a valid URL.');
    }
  }
  if (/\b0\.0\.0\.0\b|\*|0\.0\.0\.0\/0/.test(String(env.NV0_ADMIN_IP_ALLOWLIST || ''))) add('NV0_ADMIN_IP_ALLOWLIST', 'wildcard_disallowed', 'NV0_ADMIN_IP_ALLOWLIST must not contain wildcard ranges.');

  return issues;
}

if (!platform.commercial) {
  if (jsonMode) console.log(JSON.stringify({ ok: true, gate: 'commercial-runtime-startup-preflight', skipped: true, reason: 'non-commercial-profile' }, null, 2));
  process.exit(0);
}

try {
  const config = readEnvConfig(env);
  const deploymentStage = lower(env.NV0_DEPLOYMENT_STAGE, 'prelaunch');
  const commercialLaunchReady = bool('NV0_COMMERCIAL_LAUNCH_READY', false) || deploymentStage === 'commercial_launch';
  const prelaunchMode = !commercialLaunchReady;
  const adminAuthMode = String(env.NV0_ADMIN_AUTH_MODE || 'account_rbac').trim();
  const persistenceMode = String(env.NV0_PERSISTENCE_MODE || 'postgres_primary').trim();
  const storageMode = String(env.NV0_STORAGE_MODE || 's3').trim();
  const scanProvider = String(env.NV0_SCAN_PROVIDER || 'external_http').trim();
  const paymentProvider = String(env.NV0_PAYMENT_PROVIDER || (prelaunchMode ? 'disabled' : 'portone_v2')).trim();
  const aggregateIssues = collectAggregateIssues({ deploymentStage, commercialLaunchReady, prelaunchMode, adminAuthMode, persistenceMode, storageMode, scanProvider, paymentProvider });
  if (aggregateIssues.length) {
    console.error(JSON.stringify({
      ok: false,
      gate: 'commercial-runtime-startup-preflight',
      commercial: true,
      deploymentStage,
      commercialLaunchReady,
      issueCount: aggregateIssues.length,
      issues: aggregateIssues,
      errors: aggregateIssues.map((item) => item.message),
      secretPrinted: false
    }, null, 2));
    process.exit(1);
  }

  validateRuntimeConfig({
    env,
    platform,
    port: config.port,
    nodeEnv: config.nodeEnv,
    deploymentStage,
    commercialLaunchReady,
    prelaunchMode,
    allowPrelaunchOnlinePayment: bool('NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT', false),
    adminAuthMode,
    persistenceMode,
    storageMode,
    scanProvider,
    paymentProvider,
    databaseUrl: String(env.NV0_DATABASE_URL || ''),
    sessionTtlMs: number('NV0_ADMIN_SESSION_TTL_MS', 60 * 60_000),
    maxJsonBodyBytes: number('NV0_MAX_JSON_BODY_BYTES', 64 * 1024),
    maxMultipartBodyBytes: number('NV0_MAX_MULTIPART_BODY_BYTES', 5 * 1024 * 1024),
    publicScanLimit: number('NV0_PUBLIC_SCAN_LIMIT', 20),
    publicScanWindowMs: number('NV0_PUBLIC_SCAN_WINDOW_MS', 60_000),
    adminAuthLimit: number('NV0_ADMIN_AUTH_LIMIT', 8),
    adminAuthWindowMs: number('NV0_ADMIN_AUTH_WINDOW_MS', 10 * 60_000),
    backupRetentionCount: number('NV0_BACKUP_RETENTION_COUNT', 20),
    autoBackupIntervalMs: number('NV0_AUTO_BACKUP_INTERVAL_MS', 6 * 60 * 60_000),
    auditLogRetentionCount: number('NV0_AUDIT_LOG_RETENTION_COUNT', 200),
    scanCacheTtlMs: number('NV0_SCAN_CACHE_TTL_MS', 10 * 60_000),
    ctaAutopublishIntervalMs: number('NV0_CTA_AUTOPUBLISH_INTERVAL_MS', 20 * 60_000),
    publicCacheSeconds: config.publicCacheSeconds,
    requestTimeoutMs: config.requestTimeoutMs,
    slowRequestThresholdMs: config.slowRequestThresholdMs,
    accessLogMode: config.accessLogMode,
    dataDestructionGraceDays: number('NV0_DATA_DESTRUCTION_GRACE_DAYS', 30),
    targetFetchTimeoutMs: number('NV0_TARGET_FETCH_TIMEOUT_MS', 3000),
    targetFetchMaxBytes: number('NV0_TARGET_FETCH_MAX_BYTES', 512 * 1024),
    targetFetchMaxRedirects: number('NV0_TARGET_FETCH_MAX_REDIRECTS', 3),
    scanSoftTimeoutMs: number('NV0_SCAN_SOFT_TIMEOUT_MS', 6500),
    targetFetchMaxPages: number('NV0_TARGET_FETCH_MAX_PAGES', 12),
    targetFetchConcurrency: number('NV0_TARGET_FETCH_CONCURRENCY', 4),
    targetFetchMaxSitemapUrls: number('NV0_TARGET_FETCH_MAX_SITEMAP_URLS', 40),
    targetFetchMaxDiscoveryResources: number('NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES', 4),
    dataRetentionDays: number('NV0_DATA_RETENTION_DAYS', 1095),
    refundRequestWindowDays: number('NV0_REFUND_REQUEST_WINDOW_DAYS', 7),
    paymentIdempotencyTtlMs: number('NV0_PAYMENT_IDEMPOTENCY_TTL_MS', 24 * 60 * 60_000),
    emailMaxRetryCount: number('NV0_EMAIL_MAX_RETRY_COUNT', 5),
    emailRetryBackoffMs: number('NV0_EMAIL_RETRY_BACKOFF_MS', 5 * 60_000),
    publicAssetCacheSeconds: config.publicAssetCacheSeconds,
    readyzCacheTtlMs: number('NV0_READYZ_CACHE_TTL_MS', 3000),
    redisTimeoutMs: number('NV0_REDIS_TIMEOUT_MS', 1500)
  });

  if (jsonMode) console.log(JSON.stringify({ ok: true, gate: 'commercial-runtime-startup-preflight', commercial: true, deploymentStage, commercialLaunchReady, secretPrinted: false }, null, 2));
  process.exit(0);
} catch (error) {
  const message = String(error?.message || error || 'commercial runtime startup validation failed');
  const key = issueKey(message);
  console.error(JSON.stringify({
    ok: false,
    gate: 'commercial-runtime-startup-preflight',
    commercial: true,
    issueKey: key,
    errors: [message],
    remediation: remediation(key),
    secretPrinted: false
  }, null, 2));
  process.exit(1);
}
