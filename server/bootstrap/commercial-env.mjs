const SECRET_NAME_RE = /(SECRET|TOKEN|KEY|PASSWORD|PASS|PRIVATE|WEBHOOK|SMTP|DATABASE_URL|REDIS_URL|S3_|PORTONE)/i;

export const COMMERCIAL_ENV_SPEC = Object.freeze({
  core: ['NODE_ENV', 'NV0_PLATFORM_TARGET', 'NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL'],
  persistence: ['NV0_PERSISTENCE_MODE', 'NV0_DATABASE_URL', 'NV0_REDIS_URL'],
  storage: ['NV0_STORAGE_MODE', 'NV0_S3_BUCKET', 'NV0_S3_ENDPOINT', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY'],
  payment: ['NV0_PAYMENT_PROVIDER', 'NV0_PORTONE_STORE_ID', 'NV0_PORTONE_CHANNEL_KEY', 'NV0_PORTONE_API_SECRET', 'NV0_PORTONE_WEBHOOK_SECRET'],
  email: ['NV0_SMTP_URL', 'NV0_OPERATOR_ALERT_EMAIL'],
  security: ['NV0_SESSION_SECRET', 'NV0_BOOTSTRAP_ADMIN_EMAIL', 'NV0_BOOTSTRAP_ADMIN_PASSWORD', 'NV0_TURNSTILE_SITE_KEY', 'NV0_TURNSTILE_SECRET'],
  operations: ['NV0_BACKUP_REMOTE_ENABLED', 'NV0_BACKUP_ENCRYPTION_SECRET', 'NV0_READYZ_REDIS_STRICT']
});

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
      configured: String(env[name] || '').trim().length > 0,
      maskedValue: redactEnvValue(name, env[name])
    }));
  }
  return groups;
}

export function validateCommercialEnv(env = process.env, options = {}) {
  const mode = String(env.NV0_PLATFORM_TARGET || 'commercial').trim().toLowerCase();
  const paymentProvider = String(env.NV0_PAYMENT_PROVIDER || env.PAYMENT_PROVIDER || 'mock').trim().toLowerCase();
  const persistenceMode = String(env.NV0_PERSISTENCE_MODE || 'json').trim().toLowerCase();
  const storageMode = String(env.NV0_STORAGE_MODE || 'local_fs').trim().toLowerCase();
  const strict = options.strict === true || String(env.NV0_COMMERCIAL_ENV_STRICT || '').toLowerCase() === 'true';
  const required = ['NV0_PUBLIC_BASE_URL', 'NV0_SUPPORT_EMAIL', 'NV0_SESSION_SECRET'];

  if (mode === 'commercial' && persistenceMode === 'postgres_primary') required.push('NV0_DATABASE_URL');
  if (mode === 'commercial' && storageMode === 's3') required.push('NV0_S3_BUCKET', 'NV0_S3_ENDPOINT', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY');
  if (paymentProvider === 'portone_v2') required.push('NV0_PORTONE_STORE_ID', 'NV0_PORTONE_CHANNEL_KEY', 'NV0_PORTONE_API_SECRET', 'NV0_PORTONE_WEBHOOK_SECRET');
  if (strict) required.push('NV0_OPERATOR_ALERT_EMAIL', 'NV0_BACKUP_ENCRYPTION_SECRET');

  const missing = Array.from(new Set(required)).filter((name) => !String(env[name] || '').trim());
  const warnings = [];
  if (mode === 'commercial' && persistenceMode === 'json') warnings.push('commercial-json-persistence: 운영 매출 데이터는 postgres_primary 권장');
  if (mode === 'commercial' && storageMode === 'local_fs') warnings.push('commercial-local-storage: 산출물/보관본은 s3 권장');
  if (paymentProvider !== 'portone_v2') warnings.push('payment-provider-not-live: 실결제 검증은 portone_v2 설정 필요');
  if (String(env.NV0_SCAN_PROVIDER || '').trim().toLowerCase() === 'external_http' && String(env.NV0_SCAN_PROVIDER_FALLBACK || 'true').trim().toLowerCase() === 'false') warnings.push('scan-provider-fallback-disabled: 무료 데모 안정성을 위해 NV0_SCAN_PROVIDER_FALLBACK=true 권장');
  if (String(env.NV0_ENABLE_TURNSTILE || '').trim().toLowerCase() === 'true' && !String(env.NV0_TURNSTILE_SECRET || env.NV0_TURNSTILE_SECRET_KEY || '').trim()) warnings.push('turnstile-secret-missing: NV0_TURNSTILE_SECRET required when Turnstile is enabled');

  return {
    ok: missing.length === 0,
    strict,
    mode,
    paymentProvider,
    persistenceMode,
    storageMode,
    missing,
    warnings,
    matrix: buildCommercialEnvMatrix(env)
  };
}

export function assertCommercialEnv(env = process.env, options = {}) {
  const result = validateCommercialEnv(env, options);
  if (!result.ok) {
    const error = new Error(`Commercial environment is incomplete: ${result.missing.join(', ')}`);
    error.code = 'NV0_COMMERCIAL_ENV_INCOMPLETE';
    error.details = result;
    throw error;
  }
  return result;
}
