const DEFAULT_PLACEHOLDER_PATTERN = new RegExp('^(|' + 'to' + 'do|tbd|changeme|change-me|example|dummy|placeholder|your-|your_|insert_|입력|예정|확인필요)$', 'i');

export function isPlaceholderConfigValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return true;
  if (DEFAULT_PLACEHOLDER_PATTERN.test(raw)) return true;
  return new RegExp('(' + 'to' + 'do|tbd|changeme|placeholder|example\\.com|입력 필요|확인 필요|예정)', 'i').test(raw);
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

export function assertUrlConfig(name, value, { protocols = ['https:'] } = {}) {
  const raw = String(value || '').trim();
  try {
    const url = new URL(raw);
    if (!protocols.includes(url.protocol)) throw new Error('invalid protocol');
    return url;
  } catch {
    throw new Error(`${name} must be a valid URL using one of: ${protocols.join(', ')}.`);
  }
}

export function assertSecretConfig(name, value, { minLength = 24 } = {}) {
  const raw = String(value || '').trim();
  if (isPlaceholderConfigValue(raw) || raw.length < minLength) {
    throw new Error(`${name} must be a finalized secret with at least ${minLength} characters.`);
  }
  return raw;
}

export function assertTotpSecretConfig(name, value) {
  const raw = String(value || '').trim().replace(/\s+/g, '').toUpperCase();
  if (isPlaceholderConfigValue(raw) || raw.length < 16 || !/^[A-Z2-7]+=*$/.test(raw)) {
    throw new Error(`${name} must be a finalized Base32 TOTP secret with at least 16 characters.`);
  }
  return raw;
}

function allowsPrelaunchPostgresFallback(env, commercialLaunchReady) {
  const explicit = String(env.NV0_POSTGRES_FALLBACK_MODE || env.NV0_PRELAUNCH_DB_FALLBACK || env.NV0_ALLOW_DB_FALLBACK || '').trim().toLowerCase();
  if (['0', 'false', 'no', 'off', 'strict'].includes(explicit)) return false;
  if (['1', 'true', 'yes', 'on', 'fallback'].includes(explicit)) return true;
  return !commercialLaunchReady;
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
  const allowPrelaunchOnlinePayment = Boolean(input.allowPrelaunchOnlinePayment);
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
  assertFiniteConfigNumber('NV0_TARGET_FETCH_TIMEOUT_MS', Number(input.targetFetchTimeoutMs), { min: 500, max: 30_000 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_BYTES', Number(input.targetFetchMaxBytes), { min: 32 * 1024, max: 1_048_576 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_REDIRECTS', Number(input.targetFetchMaxRedirects), { min: 0, max: 10 });
  assertFiniteConfigNumber('NV0_SCAN_SOFT_TIMEOUT_MS', Number(input.scanSoftTimeoutMs), { min: 2500, max: 15_000 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_PAGES', Number(input.targetFetchMaxPages), { min: 4, max: 24 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_CONCURRENCY', Number(input.targetFetchConcurrency), { min: 1, max: 6 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_SITEMAP_URLS', Number(input.targetFetchMaxSitemapUrls), { min: 0, max: 80 });
  assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES', Number(input.targetFetchMaxDiscoveryResources), { min: 1, max: 6 });
  assertFiniteConfigNumber('NV0_DATA_RETENTION_DAYS', Number(input.dataRetentionDays), { min: 1, max: 3650 });
  assertFiniteConfigNumber('NV0_REFUND_REQUEST_WINDOW_DAYS', Number(input.refundRequestWindowDays), { min: 0, max: 365 });
  assertFiniteConfigNumber('NV0_PAYMENT_IDEMPOTENCY_TTL_MS', Number(input.paymentIdempotencyTtlMs), { min: 60_000, max: 7 * 24 * 60 * 60_000 });
  assertFiniteConfigNumber('NV0_EMAIL_MAX_RETRY_COUNT', Number(input.emailMaxRetryCount), { min: 0, max: 20 });
  assertFiniteConfigNumber('NV0_EMAIL_RETRY_BACKOFF_MS', Number(input.emailRetryBackoffMs), { min: 1000, max: 24 * 60 * 60_000 });
  assertFiniteConfigNumber('NV0_PUBLIC_ASSET_CACHE_SECONDS', Number(input.publicAssetCacheSeconds), { min: 0, max: 31_536_000 });
  assertFiniteConfigNumber('NV0_READYZ_CACHE_TTL_MS', Number(input.readyzCacheTtlMs), { min: 0, max: 60_000 });
  assertFiniteConfigNumber('NV0_REDIS_TIMEOUT_MS', Number(input.redisTimeoutMs), { min: 100, max: 30_000 });

  if (platform.commercial && adminAuthMode === 'shared_key') {
    throw new Error('NV0_ADMIN_AUTH_MODE=shared_key is not allowed for commercial deployments.');
  }
  if (adminAuthMode === 'account_rbac') {
    requireRealValue(env, 'NV0_BOOTSTRAP_ADMIN_EMAIL');
    requireRealValue(env, 'NV0_BOOTSTRAP_ADMIN_PASSWORD');
    assertEmailConfig('NV0_BOOTSTRAP_ADMIN_EMAIL', env.NV0_BOOTSTRAP_ADMIN_EMAIL);
  }
  if (['dual_write', 'postgres_primary'].includes(persistenceMode)) {
    if (commercialLaunchReady || !allowsPrelaunchPostgresFallback(env, commercialLaunchReady)) {
      requireRealValue(env, 'NV0_DATABASE_URL');
    } else if (isPlaceholderConfigValue(env.NV0_DATABASE_URL)) {
      warnings.push('prelaunch PostgreSQL URL is not set. Server will use JSON fallback until PostgreSQL is configured; commercial launch remains blocked.');
    }
  }
  if (scanProvider === 'external_http') {
    requireRealValue(env, 'NV0_SCAN_PROVIDER_URL');
    if (String(env.NV0_SCAN_PROVIDER_FALLBACK || 'true').trim().toLowerCase() === 'false') warnings.push('NV0_SCAN_PROVIDER_FALLBACK=false can expose public demo users to provider outages; keep true unless a paid-only route handles errors separately.');
  }
  if (paymentProvider === 'external_http') requireRealValue(env, 'NV0_PAYMENT_PROVIDER_URL');

  if (platform.commercial) {
    if (String(env.NV0_ADMIN_MFA_REQUIRED || '').trim().toLowerCase() !== 'true') throw new Error('Commercial deployments require NV0_ADMIN_MFA_REQUIRED=true.');
    assertTotpSecretConfig('NV0_ADMIN_TOTP_SECRET', env.NV0_ADMIN_TOTP_SECRET);
    assertSecretConfig('NV0_SESSION_SECRET', env.NV0_SESSION_SECRET, { minLength: 32 });
    assertSecretConfig('NV0_SECURE_RECORDS_KEY', env.NV0_SECURE_RECORDS_KEY, { minLength: 32 });
    assertSecretConfig('NV0_PRIVACY_HASH_KEY', env.NV0_PRIVACY_HASH_KEY, { minLength: 32 });
    assertSecretConfig('NV0_BACKUP_ENCRYPTION_SECRET', env.NV0_BACKUP_ENCRYPTION_SECRET, { minLength: 32 });
    const bootstrapPassword = requireRealValue(env, 'NV0_BOOTSTRAP_ADMIN_PASSWORD');
    if (bootstrapPassword.length < 15) throw new Error('NV0_BOOTSTRAP_ADMIN_PASSWORD must be at least 15 characters.');
    assertUrlConfig('NV0_REDIS_URL', env.NV0_REDIS_URL, { protocols: ['redis:', 'rediss:'] });
    assertUrlConfig('NV0_SMTP_URL', env.NV0_SMTP_URL, { protocols: ['smtp:', 'smtps:'] });
    assertUrlConfig('NV0_SCAN_PROVIDER_URL', env.NV0_SCAN_PROVIDER_URL, { protocols: ['https:'] });
    const s3Endpoint = assertUrlConfig('NV0_S3_ENDPOINT', env.NV0_S3_ENDPOINT, { protocols: ['https:', 'http:'] });
    const localS3Hosts = new Set(['minio', 'localhost', '127.0.0.1', '::1']);
    if (s3Endpoint.protocol !== 'https:' && (!localS3Hosts.has(s3Endpoint.hostname) || commercialLaunchReady)) {
      throw new Error('NV0_S3_ENDPOINT must use HTTPS except for private local MinIO during non-launch validation.');
    }
    if (persistenceMode !== 'postgres_primary') throw new Error('Commercial deployments require NV0_PERSISTENCE_MODE=postgres_primary.');
    if (env.NV0_SESSION_STORE !== 'redis') throw new Error('Commercial deployments require NV0_SESSION_STORE=redis.');
    if (env.NV0_RATE_LIMIT_STORE !== 'redis') throw new Error('Commercial deployments require NV0_RATE_LIMIT_STORE=redis.');
    if (env.NV0_LOCK_PROVIDER !== 'redis') throw new Error('Commercial deployments require NV0_LOCK_PROVIDER=redis.');
    requireRealValue(env, 'NV0_REDIS_URL');
    if (!['s3', 's3_compatible', 'object_storage'].includes(storageMode)) throw new Error('Commercial deployments require S3-compatible object storage.');
    for (const key of ['NV0_S3_ENDPOINT', 'NV0_S3_BUCKET', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY']) requireRealValue(env, key);
    for (const key of ['NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL', 'NV0_HOSTING_PROVIDER', 'NV0_CUSTOMER_SERVICE_PHONE', 'NV0_PRIVACY_OFFICER_EMAIL', 'NV0_SMTP_URL', 'NV0_ADMIN_IP_ALLOWLIST', 'NV0_SECURE_RECORDS_KEY', 'NV0_PRIVACY_HASH_KEY']) requireRealValue(env, key);
    const businessProfileKeys = ['NV0_BUSINESS_TRADE_NAME', 'NV0_BUSINESS_REPRESENTATIVE', 'NV0_BUSINESS_REGISTRATION_NUMBER', 'NV0_BUSINESS_ADDRESS'];
    if (commercialLaunchReady) {
      for (const key of businessProfileKeys) requireRealValue(env, key);
    } else {
      const missingBusinessKeys = businessProfileKeys.filter((key) => isPlaceholderConfigValue(env[key]));
      if (missingBusinessKeys.length) {
        warnings.push(`prelaunch business profile is incomplete: ${missingBusinessKeys.join(', ')}. Commercial launch remains blocked until these values are finalized.`);
      }
    }
    assertHttpsUrl('NV0_PUBLIC_BASE_URL', env.NV0_PUBLIC_BASE_URL);
    assertEmailConfig('NV0_SUPPORT_EMAIL', env.NV0_SUPPORT_EMAIL);
    assertEmailConfig('NV0_PRIVACY_OFFICER_EMAIL', env.NV0_PRIVACY_OFFICER_EMAIL);
    if (commercialLaunchReady) requireRealValue(env, 'NV0_MAIL_ORDER_REGISTRATION_NUMBER');
    else if (isPlaceholderConfigValue(env.NV0_MAIL_ORDER_REGISTRATION_NUMBER)) {
      warnings.push('prelaunch mail-order registration number is not set. Commercial launch remains blocked until NV0_MAIL_ORDER_REGISTRATION_NUMBER is issued and configured.');
    }
    if (prelaunchMode && paymentProvider === 'portone_v2' && !allowPrelaunchOnlinePayment) throw new Error('Prelaunch deployments must not enable PortOne before NV0_COMMERCIAL_LAUNCH_READY=true or NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=true.');
    if (commercialLaunchReady && paymentProvider !== 'portone_v2') throw new Error('Commercial launch requires NV0_PAYMENT_PROVIDER=portone_v2.');
    if (commercialLaunchReady && String(env.NV0_ENABLE_TURNSTILE || '').trim().toLowerCase() !== 'true') throw new Error('Commercial launch requires NV0_ENABLE_TURNSTILE=true.');
    if (commercialLaunchReady) {
      if (!String(env.NV0_TURNSTILE_SECRET || env.NV0_TURNSTILE_SECRET_KEY || '').trim()) throw new Error('Real NV0_TURNSTILE_SECRET is required.');
      requireRealValue(env, 'NV0_TURNSTILE_SITE_KEY');
    }
    if (String(env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION || '').trim().toLowerCase() !== 'true') throw new Error('Commercial deployments require NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true.');
    requireRealValue(env, 'NV0_BACKUP_ENCRYPTION_SECRET');
    if (/\b0\.0\.0\.0\b|\*|0\.0\.0\.0\/0/.test(String(env.NV0_ADMIN_IP_ALLOWLIST || ''))) {
      throw new Error('NV0_ADMIN_IP_ALLOWLIST must not contain wildcard IP ranges in commercial mode.');
    }
    const redirectHosts = String(env.NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (commercialLaunchReady && paymentProvider === 'portone_v2' && redirectHosts.length === 0) {
      warnings.push('NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS is empty. Configure explicit payment redirect hosts before enabling external redirect flows.');
    }
  }

  if (paymentProvider === 'demo' && platform.commercial) warnings.push('demo payment provider is blocked by commercial route guards.');
  return { ok: true, warnings };
}
