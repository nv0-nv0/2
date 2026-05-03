const DEFAULT_PLACEHOLDER_PATTERN = /^(|todo|tbd|changeme|change-me|example|dummy|placeholder|your-|your_|insert_|입력|예정|확인필요)$/i;

export function isPlaceholderConfigValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return true;
  if (DEFAULT_PLACEHOLDER_PATTERN.test(raw)) return true;
  return /(todo|tbd|changeme|placeholder|example\.com|입력 필요|확인 필요|예정)/i.test(raw);
}

export function assertFiniteConfigNumber(name, value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
  }
}

export function assertEnumConfig(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(', ')}.`);
  }
}

export function assertHttpsUrl(name, value) {
  const raw = String(value || '').trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error('not https');
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
}

export function assertEmailConfig(name, value) {
  const raw = String(value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new Error(`${name} must be a valid email address.`);
  }
}

function requireRealValue(env, key) {
  const raw = String(env[key] || '').trim();
  if (!raw || isPlaceholderConfigValue(raw)) throw new Error(`Real ${key} is required.`);
  return raw;
}

export function validateRuntimeConfig(input = {}) {
  const env = input.env || process.env;
  const platform = input.platform || { commercial: false, target: 'mvp' };
  const commercialLaunchReady = Boolean(input.commercialLaunchReady);
  const prelaunchMode = Boolean(input.prelaunchMode);
  const adminAuthMode = input.adminAuthMode || 'shared_key';
  const persistenceMode = input.persistenceMode || 'json';
  const storageMode = input.storageMode || 'local_fs';
  const scanProvider = input.scanProvider || 'builtin';
  const paymentProvider = input.paymentProvider || 'demo';
  const warnings = [];

  assertEnumConfig('NV0_ADMIN_AUTH_MODE', adminAuthMode, ['shared_key', 'account_rbac']);
  assertEnumConfig('NV0_PERSISTENCE_MODE', persistenceMode, ['json', 'dual_write', 'postgres_primary']);
  assertEnumConfig('NV0_STORAGE_MODE', storageMode, ['local_fs', 's3', 's3_compatible', 'object_storage']);
  assertEnumConfig('NV0_SCAN_PROVIDER', scanProvider, ['builtin', 'external_http']);
  assertEnumConfig('NV0_PAYMENT_PROVIDER', paymentProvider, ['disabled', 'demo', 'external_http', 'portone_v2']);
  if (input.accessLogMode) assertEnumConfig('NV0_ACCESS_LOG_MODE', input.accessLogMode, ['quiet', 'normal', 'verbose']);

  assertFiniteConfigNumber('PORT', Number(input.port), { min: 1, max: 65535 });
  assertFiniteConfigNumber('NV0_ADMIN_SESSION_TTL_MS', Number(input.sessionTtlMs), { min: 60_000, max: 86_400_000 });
  assertFiniteConfigNumber('NV0_MAX_JSON_BODY_BYTES', Number(input.maxJsonBodyBytes), { min: 1024, max: 1_048_576 });
  assertFiniteConfigNumber('NV0_MAX_MULTIPART_BODY_BYTES', Number(input.maxMultipartBodyBytes), { min: 1024, max: 20_971_520 });
  assertFiniteConfigNumber('NV0_PUBLIC_SCAN_LIMIT', Number(input.publicScanLimit), { min: 1, max: 500 });
  assertFiniteConfigNumber('NV0_PUBLIC_SCAN_WINDOW_MS', Number(input.publicScanWindowMs), { min: 1000, max: 3_600_000 });
  assertFiniteConfigNumber('NV0_ADMIN_AUTH_LIMIT', Number(input.adminAuthLimit), { min: 1, max: 100 });
  assertFiniteConfigNumber('NV0_ADMIN_AUTH_WINDOW_MS', Number(input.adminAuthWindowMs), { min: 1000, max: 3_600_000 });
  assertFiniteConfigNumber('NV0_BACKUP_RETENTION_COUNT', Number(input.backupRetentionCount), { min: 1, max: 500 });
  assertFiniteConfigNumber('NV0_AUTO_BACKUP_INTERVAL_MS', Number(input.autoBackupIntervalMs), { min: 300_000, max: 7 * 24 * 60 * 60_000 });
  assertFiniteConfigNumber('NV0_AUDIT_LOG_RETENTION_COUNT', Number(input.auditLogRetentionCount), { min: 1, max: 10000 });
  assertFiniteConfigNumber('NV0_SCAN_CACHE_TTL_MS', Number(input.scanCacheTtlMs), { min: 0, max: 86_400_000 });
  assertFiniteConfigNumber('NV0_CTA_AUTOPUBLISH_INTERVAL_MS', Number(input.ctaAutopublishIntervalMs), { min: 60_000, max: 86_400_000 });
  assertFiniteConfigNumber('NV0_PUBLIC_CACHE_SECONDS', Number(input.publicCacheSeconds), { min: 0, max: 86_400 });
  assertFiniteConfigNumber('NV0_REQUEST_TIMEOUT_MS', Number(input.requestTimeoutMs), { min: 1000, max: 120_000 });
  assertFiniteConfigNumber('NV0_SLOW_REQUEST_THRESHOLD_MS', Number(input.slowRequestThresholdMs), { min: 100, max: 60_000 });
  assertFiniteConfigNumber('NV0_DATA_DESTRUCTION_GRACE_DAYS', Number(input.dataDestructionGraceDays), { min: 0, max: 3650 });

  if (platform.commercial && adminAuthMode === 'shared_key') {
    throw new Error('NV0_ADMIN_AUTH_MODE=shared_key is not allowed for commercial deployments.');
  }
  if (adminAuthMode === 'account_rbac') {
    requireRealValue(env, 'NV0_BOOTSTRAP_ADMIN_EMAIL');
    requireRealValue(env, 'NV0_BOOTSTRAP_ADMIN_PASSWORD');
    assertEmailConfig('NV0_BOOTSTRAP_ADMIN_EMAIL', env.NV0_BOOTSTRAP_ADMIN_EMAIL);
  }
  if (['dual_write', 'postgres_primary'].includes(persistenceMode)) {
    requireRealValue(env, 'NV0_DATABASE_URL');
  }
  if (scanProvider === 'external_http') requireRealValue(env, 'NV0_SCAN_PROVIDER_URL');
  if (paymentProvider === 'external_http') requireRealValue(env, 'NV0_PAYMENT_PROVIDER_URL');

  if (platform.commercial) {
    if (persistenceMode !== 'postgres_primary') throw new Error('Commercial deployments require NV0_PERSISTENCE_MODE=postgres_primary.');
    if (env.NV0_SESSION_STORE !== 'redis') throw new Error('Commercial deployments require NV0_SESSION_STORE=redis.');
    if (env.NV0_RATE_LIMIT_STORE !== 'redis') throw new Error('Commercial deployments require NV0_RATE_LIMIT_STORE=redis.');
    if (env.NV0_LOCK_PROVIDER !== 'redis') throw new Error('Commercial deployments require NV0_LOCK_PROVIDER=redis.');
    requireRealValue(env, 'NV0_REDIS_URL');
    if (!['s3', 's3_compatible', 'object_storage'].includes(storageMode)) throw new Error('Commercial deployments require S3-compatible object storage.');
    for (const key of ['NV0_S3_ENDPOINT', 'NV0_S3_BUCKET', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY']) requireRealValue(env, key);
    for (const key of ['NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL', 'NV0_HOSTING_PROVIDER', 'NV0_CUSTOMER_SERVICE_PHONE', 'NV0_PRIVACY_OFFICER_EMAIL', 'NV0_SMTP_URL', 'NV0_ADMIN_IP_ALLOWLIST']) requireRealValue(env, key);
    assertHttpsUrl('NV0_PUBLIC_BASE_URL', env.NV0_PUBLIC_BASE_URL);
    assertEmailConfig('NV0_SUPPORT_EMAIL', env.NV0_SUPPORT_EMAIL);
    assertEmailConfig('NV0_PRIVACY_OFFICER_EMAIL', env.NV0_PRIVACY_OFFICER_EMAIL);
    if (commercialLaunchReady) requireRealValue(env, 'NV0_MAIL_ORDER_REGISTRATION_NUMBER');
    if (prelaunchMode && paymentProvider === 'portone_v2') throw new Error('Prelaunch deployments must not enable PortOne before NV0_COMMERCIAL_LAUNCH_READY=true.');
    if (commercialLaunchReady && paymentProvider !== 'portone_v2') throw new Error('Commercial launch requires NV0_PAYMENT_PROVIDER=portone_v2.');
    if (/\b0\.0\.0\.0\b|\*|0\.0\.0\.0\/0/.test(String(env.NV0_ADMIN_IP_ALLOWLIST || ''))) {
      throw new Error('NV0_ADMIN_IP_ALLOWLIST must not contain wildcard IP ranges in commercial mode.');
    }
  }

  if (paymentProvider === 'demo' && platform.commercial) warnings.push('demo payment provider is blocked by commercial route guards.');
  return { ok: true, warnings };
}
