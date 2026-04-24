import fs from 'node:fs';

const env = process.env;
const errors = [];
const warnings = [];
const commercial = String(env.NV0_PLATFORM_TARGET || '').trim() === 'commercial';

function required(name) {
  if (!String(env[name] || '').trim()) errors.push(`${name} is required`);
}

if (commercial || env.NODE_ENV === 'production') {
  for (const key of [
    'NV0_PLATFORM_TARGET',
    'NV0_ADMIN_AUTH_MODE',
    'NV0_BOOTSTRAP_ADMIN_EMAIL',
    'NV0_BOOTSTRAP_ADMIN_PASSWORD',
    'NV0_PERSISTENCE_MODE',
    'NV0_DATABASE_URL',
    'NV0_REDIS_URL',
    'NV0_SESSION_STORE',
    'NV0_RATE_LIMIT_STORE',
    'NV0_LOCK_PROVIDER',
    'NV0_STORAGE_MODE',
    'NV0_SCAN_PROVIDER',
    'NV0_SCAN_PROVIDER_URL',
    'NV0_PAYMENT_PROVIDER',
    'NV0_PORTONE_API_SECRET',
    'NV0_PORTONE_STORE_ID',
    'NV0_PORTONE_CHANNEL_KEY',
    'NV0_PORTONE_WEBHOOK_SECRET'
  ]) required(key);
  if (env.NV0_ADMIN_KEY) errors.push('NV0_ADMIN_KEY must not be used for commercial launch');
  if (env.NV0_ADMIN_AUTH_MODE !== 'account_rbac') errors.push('NV0_ADMIN_AUTH_MODE must be account_rbac');
  if (env.NV0_PERSISTENCE_MODE !== 'postgres_primary') errors.push('NV0_PERSISTENCE_MODE must be postgres_primary');
  if (env.NV0_SESSION_STORE !== 'redis' || env.NV0_RATE_LIMIT_STORE !== 'redis' || env.NV0_LOCK_PROVIDER !== 'redis') errors.push('Redis-backed session, rate limit, and lock are required');
  if (env.NV0_PAYMENT_PROVIDER !== 'portone_v2') errors.push('NV0_PAYMENT_PROVIDER must be portone_v2');
  if (env.NV0_SCAN_PROVIDER !== 'external_http') errors.push('NV0_SCAN_PROVIDER must be external_http');
} else {
  warnings.push('preflight running in non-commercial mode');
}

if (String(env.NV0_ENABLE_TURNSTILE) === 'true') {
  required('NV0_TURNSTILE_SITE_KEY');
  required('NV0_TURNSTILE_SECRET');
}
if (String(env.NV0_TRUST_PROXY_HEADERS) !== 'true') {
  warnings.push('NV0_TRUST_PROXY_HEADERS is not true; Cloudflare/Coolify forwarded proto and client IP may not be trusted');
}
if (!fs.existsSync('./server/index.mjs')) errors.push('server/index.mjs not found');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, commercial, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, commercial, errors, warnings }, null, 2));
