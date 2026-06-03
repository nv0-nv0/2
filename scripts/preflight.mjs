import fs from 'node:fs';

function loadEnvFile(filePath) {
  if (!filePath) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env) || process.env[key] === '') process.env[key] = value;
  }
}
loadEnvFile(process.argv[2] || '');
const env = process.env;
const errors = [];
const warnings = [];
const commercial = String(env.NV0_PLATFORM_TARGET || '').trim() === 'commercial';
const deploymentStage = String(env.NV0_DEPLOYMENT_STAGE || (commercial ? 'prelaunch' : 'mvp')).trim().toLowerCase();
const commercialLaunchReady = env.NV0_COMMERCIAL_LAUNCH_READY === 'true' || deploymentStage === 'commercial_launch';
const prelaunch = commercial && !commercialLaunchReady;

function placeholder(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return ['replace-with', 'example.com', 'localhost', '127.0.0.1', 'changeme', 'your-', 'dummy', 'test_', 'long-random', 'password@smtp', 'smtp.your-provider'].some(token => text.includes(token));
}


function prelaunchPostgresFallbackAllowed() {
  const explicit = String(env.NV0_POSTGRES_FALLBACK_MODE || env.NV0_PRELAUNCH_DB_FALLBACK || env.NV0_ALLOW_DB_FALLBACK || '').trim().toLowerCase();
  if (['0', 'false', 'no', 'off', 'strict'].includes(explicit)) return false;
  if (['1', 'true', 'yes', 'on', 'fallback'].includes(explicit)) return true;
  return prelaunch;
}

function required(name) {
  if (!String(env[name] || '').trim()) errors.push(`${name} is required`);
}

function validateSmtpUrl() {
  const raw = String(env.NV0_SMTP_URL || '').trim();
  if (!raw) return;
  if (placeholder(raw)) return;
  try {
    const parsed = new URL(raw);
    if (!['smtp:', 'smtps:'].includes(parsed.protocol)) errors.push('NV0_SMTP_URL must start with smtp:// or smtps://');
    if (!parsed.hostname) errors.push('NV0_SMTP_URL must include SMTP host');
    if (!parsed.searchParams.get('from') && !parsed.username && !env.NV0_EMAIL_FROM) warnings.push('NV0_SMTP_URL has no from query, username, or NV0_EMAIL_FROM; support email will be used as sender');
  } catch {
    errors.push('NV0_SMTP_URL must be a valid URL');
  }
}

function finalized(name) {
  const value = String(env[name] || '').trim();
  if (!value) errors.push(`${name} is required`);
  else if (placeholder(value)) errors.push(`${name} must be finalized before commercial launch`);
}
function finalizedSecret(name, minLength) {
  const value = String(env[name] || '').trim();
  finalized(name);
  if (value && !placeholder(value) && value.length < minLength) errors.push(`${name} must contain at least ${minLength} characters`);
}

if (commercial || env.NODE_ENV === 'production') {
  finalizedSecret('NV0_SESSION_SECRET', 32);
  finalizedSecret('NV0_SECURE_RECORDS_KEY', 32);
  finalizedSecret('NV0_PRIVACY_HASH_KEY', 32);
  finalizedSecret('NV0_BACKUP_ENCRYPTION_SECRET', 32);
  finalizedSecret('NV0_BOOTSTRAP_ADMIN_PASSWORD', 15);
  for (const key of [
    'NV0_PLATFORM_TARGET',
    'NV0_ADMIN_AUTH_MODE',
    'NV0_BOOTSTRAP_ADMIN_EMAIL',
    'NV0_BOOTSTRAP_ADMIN_PASSWORD',
    'NV0_PERSISTENCE_MODE',
    'NV0_REDIS_URL',
    'NV0_SESSION_STORE',
    'NV0_RATE_LIMIT_STORE',
    'NV0_LOCK_PROVIDER',
    'NV0_STORAGE_MODE',
    'NV0_SCAN_PROVIDER',
    'NV0_SCAN_PROVIDER_URL',
    'NV0_PAYMENT_PROVIDER'
  ]) finalized(key);
  if (commercialLaunchReady || !prelaunchPostgresFallbackAllowed()) finalized('NV0_DATABASE_URL');
  else if (placeholder(env.NV0_DATABASE_URL)) warnings.push('NV0_DATABASE_URL is missing or placeholder. Prelaunch will continue with JSON fallback; commercial_launch still requires PostgreSQL.');
  for (const key of ['NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY','NV0_BACKUP_ENCRYPTION_SECRET','NV0_SECURE_RECORDS_KEY','NV0_PRIVACY_HASH_KEY']) finalized(key);
  if (commercialLaunchReady) {
    for (const key of ['NV0_PORTONE_API_SECRET','NV0_PORTONE_STORE_ID','NV0_PORTONE_CHANNEL_KEY','NV0_PORTONE_WEBHOOK_SECRET']) finalized(key);
  }
  if (env.NV0_ADMIN_KEY) {
    if (commercialLaunchReady) errors.push('NV0_ADMIN_KEY must not be used for commercial launch');
    else warnings.push('NV0_ADMIN_KEY is ignored in commercial prelaunch. Remove it before NV0_COMMERCIAL_LAUNCH_READY=true.');
  }
  if (env.NV0_ADMIN_AUTH_MODE !== 'account_rbac') errors.push('NV0_ADMIN_AUTH_MODE must be account_rbac');
  if (env.NV0_ADMIN_MFA_REQUIRED !== 'true') errors.push('NV0_ADMIN_MFA_REQUIRED must be true for commercial deployments. Set NV0_ADMIN_MFA_REQUIRED=true in Coolify environment variables and redeploy.');
  if (env.NV0_ADMIN_MFA_REQUIRED === 'true') finalized('NV0_ADMIN_TOTP_SECRET');
  if (env.NV0_PERSISTENCE_MODE !== 'postgres_primary') errors.push('NV0_PERSISTENCE_MODE must be postgres_primary');
  if (env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION !== 'true') errors.push('NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION must be true');
  if (env.NV0_SESSION_STORE !== 'redis' || env.NV0_RATE_LIMIT_STORE !== 'redis' || env.NV0_LOCK_PROVIDER !== 'redis') errors.push('Redis-backed session, rate limit, and lock are required');
  if (commercialLaunchReady && env.NV0_PAYMENT_PROVIDER !== 'portone_v2') errors.push('NV0_PAYMENT_PROVIDER must be portone_v2');
  if (prelaunch && env.NV0_PAYMENT_PROVIDER !== 'disabled') errors.push('NV0_PAYMENT_PROVIDER must be disabled when NV0_DEPLOYMENT_STAGE=prelaunch');
  if (env.NV0_SCAN_PROVIDER !== 'external_http') errors.push('NV0_SCAN_PROVIDER must be external_http');
  if (String(env.NV0_SCAN_PROVIDER_FALLBACK || 'true').trim().toLowerCase() === 'false') errors.push('NV0_SCAN_PROVIDER_FALLBACK must stay true for public demo outage protection');
  const publicKeys = ['NV0_PUBLIC_BASE_URL','NV0_SUPPORT_EMAIL','NV0_HOSTING_PROVIDER','NV0_CUSTOMER_SERVICE_PHONE','NV0_PRIVACY_OFFICER_EMAIL','NV0_SMTP_URL','NV0_ADMIN_IP_ALLOWLIST'];
  const launchBusinessKeys = ['NV0_BUSINESS_TRADE_NAME','NV0_BUSINESS_REPRESENTATIVE','NV0_BUSINESS_REGISTRATION_NUMBER','NV0_BUSINESS_ADDRESS'];
  if (commercialLaunchReady) {
    publicKeys.push(...launchBusinessKeys, 'NV0_MAIL_ORDER_REGISTRATION_NUMBER');
  } else {
    const missingBusinessKeys = launchBusinessKeys.filter((key) => placeholder(env[key]));
    if (missingBusinessKeys.length) warnings.push(`Prelaunch legal business profile is incomplete: ${missingBusinessKeys.join(', ')}. The server may boot for private prelaunch, but commercial launch remains blocked.`);
    if (placeholder(env.NV0_MAIL_ORDER_REGISTRATION_NUMBER)) warnings.push('Expected prelaunch warning: mail-order registration number is not set. Keep NV0_PAYMENT_PROVIDER=disabled and add NV0_MAIL_ORDER_REGISTRATION_NUMBER before commercial_launch. This warning does not block prelaunch boot.');
  }
  for (const key of publicKeys) finalized(key);
} else {
  warnings.push('preflight running in non-commercial mode');
}

if (String(env.NV0_ENABLE_TURNSTILE) === 'true') {
  required('NV0_TURNSTILE_SITE_KEY');
  if (!String(env.NV0_TURNSTILE_SECRET || env.NV0_TURNSTILE_SECRET_KEY || '').trim()) errors.push('NV0_TURNSTILE_SECRET is required');
}
if (String(env.NV0_TRUST_PROXY_HEADERS) !== 'true') {
  warnings.push('NV0_TRUST_PROXY_HEADERS is not true; Cloudflare/Coolify forwarded proto and client IP may not be trusted');
}
validateSmtpUrl();
if (!fs.existsSync('./server/index.mjs')) errors.push('server/index.mjs not found');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, commercial, deploymentStage, commercialLaunchReady, prelaunch, errors, warnings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, commercial, deploymentStage, commercialLaunchReady, prelaunch, errors, warnings }, null, 2));
