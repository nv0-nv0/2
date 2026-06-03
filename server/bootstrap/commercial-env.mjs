const SECRET_NAME_RE = /(SECRET|TOKEN|KEY|PASSWORD|PASS|PRIVATE|WEBHOOK|SMTP|DATABASE_URL|REDIS_URL|S3_|PORTONE)/i;
const PLACEHOLDER_RE = /(replace[-_ ]?with|replace_real|changeme|change-me|placeholder|example\.com|your[-_]|insert[-_]|dummy|tbd|todo|입력|예정|확인필요|r2_account_id|r2_access_key|r2_secret_key)/i;
const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export const COMMERCIAL_ENV_SPEC = Object.freeze({
  core: ['NODE_ENV', 'NV0_PLATFORM_TARGET', 'NV0_DEPLOYMENT_STAGE', 'NV0_COMMERCIAL_LAUNCH_READY', 'NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL'],
  persistence: ['NV0_PERSISTENCE_MODE', 'NV0_DATABASE_URL', 'NV0_REDIS_URL', 'NV0_SESSION_STORE', 'NV0_RATE_LIMIT_STORE', 'NV0_LOCK_PROVIDER'],
  storage: ['NV0_STORAGE_MODE', 'NV0_S3_BUCKET', 'NV0_S3_ENDPOINT', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY'],
  payment: ['NV0_PAYMENT_PROVIDER', 'NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS', 'NV0_PORTONE_STORE_ID', 'NV0_PORTONE_CHANNEL_KEY', 'NV0_PORTONE_API_SECRET', 'NV0_PORTONE_WEBHOOK_SECRET', 'NV0_PORTONE_WEBHOOK_VERIFY_MODE'],
  email: ['NV0_SMTP_URL', 'NV0_EMAIL_FROM', 'NV0_OPERATOR_ALERT_EMAIL'],
  security: ['NV0_SESSION_SECRET', 'NV0_SECURE_RECORDS_KEY', 'NV0_PRIVACY_HASH_KEY', 'NV0_ADMIN_AUTH_MODE', 'NV0_ADMIN_MFA_REQUIRED', 'NV0_ADMIN_TOTP_SECRET', 'NV0_BOOTSTRAP_ADMIN_EMAIL', 'NV0_BOOTSTRAP_ADMIN_PASSWORD', 'NV0_ADMIN_IP_ALLOWLIST', 'NV0_TURNSTILE_SITE_KEY', 'NV0_TURNSTILE_SECRET'],
  operations: ['NV0_BACKUP_REMOTE_ENABLED', 'NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION', 'NV0_BACKUP_ENCRYPTION_SECRET', 'NV0_READYZ_REDIS_STRICT', 'NV0_HEALTHZ_STRICT'],
  legal: ['NV0_BUSINESS_TRADE_NAME', 'NV0_BUSINESS_REPRESENTATIVE', 'NV0_BUSINESS_REGISTRATION_NUMBER', 'NV0_BUSINESS_ADDRESS', 'NV0_MAIL_ORDER_REGISTRATION_NUMBER', 'NV0_HOSTING_PROVIDER', 'NV0_CUSTOMER_SERVICE_PHONE', 'NV0_PRIVACY_OFFICER_EMAIL']
});

export function isCommercialPlaceholder(value) {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_RE.test(text);
}

export function redactEnvValue(name, value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (!SECRET_NAME_RE.test(String(name || ''))) return text;
  if (text.length <= 8) return '***';
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

export function buildCommercialEnvMatrix(env = process.env) {
  const groups = {};
  for (const [group, names] of Object.entries(COMMERCIAL_ENV_SPEC)) {
    groups[group] = names.map((name) => ({
      name,
      configured: !isCommercialPlaceholder(env[name]),
      maskedValue: redactEnvValue(name, env[name])
    }));
  }
  return groups;
}

function requireConfigured(env, missing, name) {
  if (isCommercialPlaceholder(env[name])) missing.push(name);
}
function bool(env, name, fallback = false) {
  const raw = String(env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return TRUTHY.has(raw);
}
function validUrl(value, protocols = []) {
  try {
    const url = new URL(String(value || '').trim());
    return protocols.length === 0 || protocols.includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateCommercialEnv(env = process.env, options = {}) {
  const mode = String(env.NV0_PLATFORM_TARGET || 'mvp').trim().toLowerCase();
  const deploymentStage = String(env.NV0_DEPLOYMENT_STAGE || (mode === 'commercial' ? 'prelaunch' : 'mvp')).trim().toLowerCase();
  const commercialLaunchReady = bool(env, 'NV0_COMMERCIAL_LAUNCH_READY', false) || deploymentStage === 'commercial_launch';
  const prelaunch = mode === 'commercial' && !commercialLaunchReady;
  const paymentProvider = String(env.NV0_PAYMENT_PROVIDER || (prelaunch ? 'disabled' : 'demo')).trim().toLowerCase();
  const persistenceMode = String(env.NV0_PERSISTENCE_MODE || 'json').trim().toLowerCase();
  const storageMode = String(env.NV0_STORAGE_MODE || 'local_fs').trim().toLowerCase();
  const strict = options.strict === true || bool(env, 'NV0_COMMERCIAL_ENV_STRICT', false);
  const missing = [];
  const blockers = [];
  const warnings = [];

  if (mode !== 'commercial') {
    return { ok: true, strict, mode, deploymentStage, commercialLaunchReady, prelaunch, paymentProvider, persistenceMode, storageMode, missing, blockers, warnings, matrix: buildCommercialEnvMatrix(env) };
  }

  const alwaysRequired = [
    'NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL', 'NV0_SESSION_SECRET', 'NV0_SECURE_RECORDS_KEY', 'NV0_PRIVACY_HASH_KEY',
    'NV0_ADMIN_TOTP_SECRET', 'NV0_BOOTSTRAP_ADMIN_EMAIL', 'NV0_BOOTSTRAP_ADMIN_PASSWORD', 'NV0_ADMIN_IP_ALLOWLIST',
    'NV0_DATABASE_URL', 'NV0_REDIS_URL', 'NV0_S3_BUCKET', 'NV0_S3_ENDPOINT', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY',
    'NV0_SCAN_PROVIDER_URL', 'NV0_SMTP_URL', 'NV0_OPERATOR_ALERT_EMAIL', 'NV0_BACKUP_ENCRYPTION_SECRET',
    'NV0_HOSTING_PROVIDER', 'NV0_CUSTOMER_SERVICE_PHONE', 'NV0_PRIVACY_OFFICER_EMAIL'
  ];
  for (const key of alwaysRequired) requireConfigured(env, missing, key);
  if (commercialLaunchReady) {
    for (const key of [
      'NV0_BUSINESS_TRADE_NAME', 'NV0_BUSINESS_REPRESENTATIVE', 'NV0_BUSINESS_REGISTRATION_NUMBER', 'NV0_BUSINESS_ADDRESS',
      'NV0_MAIL_ORDER_REGISTRATION_NUMBER', 'NV0_TURNSTILE_SITE_KEY', 'NV0_TURNSTILE_SECRET',
      'NV0_PORTONE_STORE_ID', 'NV0_PORTONE_CHANNEL_KEY', 'NV0_PORTONE_API_SECRET', 'NV0_PORTONE_WEBHOOK_SECRET'
    ]) requireConfigured(env, missing, key);
  }
  if (strict) {
    for (const key of ['NV0_EMAIL_FROM']) requireConfigured(env, missing, key);
  }

  if (String(env.NODE_ENV || '').trim().toLowerCase() !== 'production') blockers.push('NODE_ENV must be production for commercial deployments.');
  if (String(env.NV0_ADMIN_AUTH_MODE || '').trim() !== 'account_rbac') blockers.push('NV0_ADMIN_AUTH_MODE must be account_rbac.');
  if (!bool(env, 'NV0_ADMIN_MFA_REQUIRED', false)) blockers.push('NV0_ADMIN_MFA_REQUIRED must be true.');
  if (persistenceMode !== 'postgres_primary') blockers.push('NV0_PERSISTENCE_MODE must be postgres_primary.');
  if (String(env.NV0_SESSION_STORE || '').trim() !== 'redis') blockers.push('NV0_SESSION_STORE must be redis.');
  if (String(env.NV0_RATE_LIMIT_STORE || '').trim() !== 'redis') blockers.push('NV0_RATE_LIMIT_STORE must be redis.');
  if (String(env.NV0_LOCK_PROVIDER || '').trim() !== 'redis') blockers.push('NV0_LOCK_PROVIDER must be redis.');
  if (!['s3', 's3_compatible', 'object_storage'].includes(storageMode)) blockers.push('NV0_STORAGE_MODE must use S3-compatible object storage.');
  if (String(env.NV0_SCAN_PROVIDER || '').trim() !== 'external_http') blockers.push('NV0_SCAN_PROVIDER must be external_http.');
  if (!bool(env, 'NV0_SCAN_PROVIDER_FALLBACK', true)) blockers.push('NV0_SCAN_PROVIDER_FALLBACK must stay true for public demo outage protection.');
  if (!bool(env, 'NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION', false)) blockers.push('NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION must be true.');
  if (prelaunch && paymentProvider !== 'disabled') blockers.push('NV0_PAYMENT_PROVIDER must be disabled during prelaunch.');
  if (commercialLaunchReady && paymentProvider !== 'portone_v2') blockers.push('NV0_PAYMENT_PROVIDER must be portone_v2 for commercial_launch.');
  if (commercialLaunchReady && String(env.NV0_PORTONE_WEBHOOK_VERIFY_MODE || '').trim().toLowerCase() !== 'strict') blockers.push('NV0_PORTONE_WEBHOOK_VERIFY_MODE must be strict for commercial_launch.');
  if (commercialLaunchReady && !bool(env, 'NV0_ENABLE_TURNSTILE', false)) blockers.push('NV0_ENABLE_TURNSTILE must be true for commercial_launch.');
  if (String(env.NV0_ADMIN_KEY || '').trim()) blockers.push('NV0_ADMIN_KEY must not be present in commercial account_rbac mode.');

  if (!validUrl(env.NV0_PUBLIC_BASE_URL, ['https:'])) blockers.push('NV0_PUBLIC_BASE_URL must be a valid HTTPS URL.');
  if (!validUrl(env.NV0_REDIS_URL, ['redis:', 'rediss:'])) blockers.push('NV0_REDIS_URL must use redis:// or rediss://.');
  if (!validUrl(env.NV0_SCAN_PROVIDER_URL, ['https:'])) blockers.push('NV0_SCAN_PROVIDER_URL must be a valid HTTPS URL.');
  let s3Endpoint = null;
  try { s3Endpoint = new URL(String(env.NV0_S3_ENDPOINT || '').trim()); } catch {}
  const localS3Hosts = new Set(['minio', 'localhost', '127.0.0.1', '::1']);
  const allowLocalMinioPrelaunch = prelaunch && s3Endpoint?.protocol === 'http:' && localS3Hosts.has(s3Endpoint.hostname);
  if (!s3Endpoint || (s3Endpoint.protocol !== 'https:' && !allowLocalMinioPrelaunch)) blockers.push('NV0_S3_ENDPOINT must be a valid HTTPS URL except private local MinIO during prelaunch.');
  if (allowLocalMinioPrelaunch) warnings.push('local-minio-prelaunch-only: replace the private HTTP MinIO endpoint with HTTPS object storage before commercial_launch.');
  if (!validUrl(env.NV0_SMTP_URL, ['smtp:', 'smtps:'])) blockers.push('NV0_SMTP_URL must use smtp:// or smtps://.');
  if (/\b0\.0\.0\.0\b|\*|0\.0\.0\.0\/0/.test(String(env.NV0_ADMIN_IP_ALLOWLIST || ''))) blockers.push('NV0_ADMIN_IP_ALLOWLIST must not include wildcard ranges.');
  if (String(env.NV0_ADMIN_TOTP_SECRET || '').trim().length < 16 || !/^[A-Z2-7]+=*$/i.test(String(env.NV0_ADMIN_TOTP_SECRET || '').trim())) blockers.push('NV0_ADMIN_TOTP_SECRET must be a finalized Base32 secret.');
  for (const key of ['NV0_SESSION_SECRET', 'NV0_SECURE_RECORDS_KEY', 'NV0_PRIVACY_HASH_KEY', 'NV0_BACKUP_ENCRYPTION_SECRET']) {
    if (String(env[key] || '').trim().length < 32) blockers.push(`${key} must contain at least 32 characters.`);
  }
  if (String(env.NV0_BOOTSTRAP_ADMIN_PASSWORD || '').length < 15) blockers.push('NV0_BOOTSTRAP_ADMIN_PASSWORD must contain at least 15 characters.');

  if (prelaunch && isCommercialPlaceholder(env.NV0_MAIL_ORDER_REGISTRATION_NUMBER)) warnings.push('Expected prelaunch warning: mail-order registration number is not set. Keep NV0_PAYMENT_PROVIDER=disabled and add NV0_MAIL_ORDER_REGISTRATION_NUMBER before commercial_launch.');
  const missingBusinessKeys = ['NV0_BUSINESS_TRADE_NAME', 'NV0_BUSINESS_REPRESENTATIVE', 'NV0_BUSINESS_REGISTRATION_NUMBER', 'NV0_BUSINESS_ADDRESS'].filter(key => isCommercialPlaceholder(env[key]));
  if (prelaunch && missingBusinessKeys.length) warnings.push(`Prelaunch legal business profile is incomplete: ${missingBusinessKeys.join(', ')}.`);
  if (paymentProvider !== 'portone_v2') warnings.push('payment-provider-not-live: live payment verification requires portone_v2 during approved commercial_launch cutover.');
  if (!String(env.NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS || '').trim()) warnings.push('payment-redirect-hosts-empty: configure explicit redirect hosts before enabling external payment redirects.');
  if (!bool(env, 'NV0_HEALTHZ_STRICT', false)) warnings.push('healthz-strict-disabled: keep /healthz lightweight during prelaunch, then enable strict mode after external integrations are stable.');

  return {
    ok: missing.length === 0 && blockers.length === 0,
    strict,
    mode,
    deploymentStage,
    commercialLaunchReady,
    prelaunch,
    paymentProvider,
    persistenceMode,
    storageMode,
    missing: Array.from(new Set(missing)),
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    matrix: buildCommercialEnvMatrix(env)
  };
}

export function assertCommercialEnv(env = process.env, options = {}) {
  const result = validateCommercialEnv(env, options);
  if (!result.ok) {
    const detail = [...result.missing, ...result.blockers].join(', ');
    const error = new Error(`Commercial environment is incomplete: ${detail}`);
    error.code = 'NV0_COMMERCIAL_ENV_INCOMPLETE';
    error.details = result;
    throw error;
  }
  return result;
}
