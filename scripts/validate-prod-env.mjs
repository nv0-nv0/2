import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  const abs = path.resolve(filePath);
  const text = fs.readFileSync(abs, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const envFile = process.argv[2] || '';
if (envFile) loadEnvFile(envFile);

const errors = [];
const warnings = [];
const deploymentStage = String(process.env.NV0_DEPLOYMENT_STAGE || 'prelaunch').trim().toLowerCase();
const commercialLaunchReady = process.env.NV0_COMMERCIAL_LAUNCH_READY === 'true' || deploymentStage === 'commercial_launch';
const prelaunch = String(process.env.NV0_PLATFORM_TARGET || '') === 'commercial' && !commercialLaunchReady;

function isPlaceholderConfigValue(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return ['replace-with', 'example.com', 'localhost', '127.0.0.1', 'changeme', 'your-', 'dummy', 'test_', 'long-random', 'password@smtp', 'smtp.your-provider'].some(token => text.includes(token));
}

const required = [
  'NODE_ENV', 'PORT', 'NV0_PLATFORM_TARGET', 'NV0_PUBLIC_BASE_URL',
  'NV0_ADMIN_AUTH_MODE', 'NV0_BOOTSTRAP_ADMIN_EMAIL', 'NV0_BOOTSTRAP_ADMIN_PASSWORD',
  'NV0_PERSISTENCE_MODE', 'NV0_DATABASE_URL',
  'NV0_REDIS_URL', 'NV0_SESSION_STORE', 'NV0_RATE_LIMIT_STORE', 'NV0_LOCK_PROVIDER',
  'NV0_STORAGE_MODE', 'NV0_S3_ENDPOINT', 'NV0_S3_BUCKET', 'NV0_S3_ACCESS_KEY_ID', 'NV0_S3_SECRET_ACCESS_KEY',
  'NV0_SECURE_RECORDS_KEY', 'NV0_PRIVACY_HASH_KEY', 'NV0_BACKUP_ENCRYPTION_SECRET',
  'NV0_BUSINESS_TRADE_NAME', 'NV0_BUSINESS_REPRESENTATIVE', 'NV0_BUSINESS_REGISTRATION_NUMBER', 'NV0_BUSINESS_ADDRESS',
  'NV0_SCAN_PROVIDER', 'NV0_SCAN_PROVIDER_URL',
  'NV0_PAYMENT_PROVIDER', 'NV0_PORTONE_WEBHOOK_VERIFY_MODE'
];
if (commercialLaunchReady) required.push('NV0_PORTONE_API_SECRET', 'NV0_PORTONE_STORE_ID', 'NV0_PORTONE_CHANNEL_KEY', 'NV0_PORTONE_WEBHOOK_SECRET');
for (const key of required) if (!String(process.env[key] || '').trim()) errors.push(`${key} is required`);

for (const key of required) {
  const value = String(process.env[key] || '').trim();
  if (value && isPlaceholderConfigValue(value)) errors.push(`${key} must be a real production value, not a placeholder`);
}
for (const key of ['NV0_SUPPORT_EMAIL','NV0_PRIVACY_OFFICER_EMAIL','NV0_OPERATOR_ALERT_EMAIL']) {
  const value = String(process.env[key] || '').trim();
  if (value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) errors.push(`${key} must be a valid email address`);
}
const requiredBusinessKeys = ['NV0_HOSTING_PROVIDER','NV0_CUSTOMER_SERVICE_PHONE','NV0_ADMIN_IP_ALLOWLIST','NV0_SMTP_URL','NV0_SECURE_RECORDS_KEY','NV0_PRIVACY_HASH_KEY','NV0_BACKUP_ENCRYPTION_SECRET','NV0_BUSINESS_TRADE_NAME','NV0_BUSINESS_REPRESENTATIVE','NV0_BUSINESS_REGISTRATION_NUMBER','NV0_BUSINESS_ADDRESS'];
if (commercialLaunchReady) requiredBusinessKeys.push('NV0_MAIL_ORDER_REGISTRATION_NUMBER');
for (const key of requiredBusinessKeys) {
  const value = String(process.env[key] || '').trim();
  if (!value) errors.push(`${key} is required for commercial launch`);
  if (value && isPlaceholderConfigValue(value)) errors.push(`${key} must be finalized before commercial launch`);
}

const nodeEnv = String(process.env.NODE_ENV || '').trim();
const port = Number(process.env.PORT || 0);
const allowedOrigins = String(process.env.NV0_ALLOWED_ADMIN_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
const enableTurnstile = String(process.env.NV0_ENABLE_TURNSTILE || '').trim() === 'true';

if (nodeEnv !== 'production') errors.push('NODE_ENV must be production');
if (String(process.env.NV0_PLATFORM_TARGET) !== 'commercial') errors.push('NV0_PLATFORM_TARGET must be commercial');
if (!port || Number.isNaN(port) || port < 1 || port > 65535) errors.push('PORT must be a valid TCP port');
if (process.env.NV0_ADMIN_KEY) errors.push('NV0_ADMIN_KEY must not be set for commercial launch');
if (String(process.env.NV0_ADMIN_AUTH_MODE) !== 'account_rbac') errors.push('NV0_ADMIN_AUTH_MODE must be account_rbac');
if (String(process.env.NV0_PERSISTENCE_MODE) !== 'postgres_primary') errors.push('NV0_PERSISTENCE_MODE must be postgres_primary');
if (String(process.env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION) !== 'true') errors.push('NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION must be true');
if (String(process.env.NV0_SESSION_STORE) !== 'redis') errors.push('NV0_SESSION_STORE must be redis');
if (String(process.env.NV0_RATE_LIMIT_STORE) !== 'redis') errors.push('NV0_RATE_LIMIT_STORE must be redis');
if (String(process.env.NV0_LOCK_PROVIDER) !== 'redis') errors.push('NV0_LOCK_PROVIDER must be redis');
if (String(process.env.NV0_STORAGE_MODE) === 'local_fs') errors.push('NV0_STORAGE_MODE must not be local_fs');
if (String(process.env.NV0_SCAN_PROVIDER) !== 'external_http') errors.push('NV0_SCAN_PROVIDER must be external_http');
if (commercialLaunchReady && String(process.env.NV0_PAYMENT_PROVIDER) !== 'portone_v2') errors.push('NV0_PAYMENT_PROVIDER must be portone_v2');
if (prelaunch && String(process.env.NV0_PAYMENT_PROVIDER) !== 'disabled') errors.push('NV0_PAYMENT_PROVIDER must be disabled during prelaunch');
if (commercialLaunchReady && String(process.env.NV0_PORTONE_WEBHOOK_VERIFY_MODE) !== 'strict') errors.push('NV0_PORTONE_WEBHOOK_VERIFY_MODE must be strict');
if (!allowedOrigins.length) errors.push('NV0_ALLOWED_ADMIN_ORIGINS must not be empty');
for (const origin of allowedOrigins) if (!/^[a-z0-9.-]+$/i.test(origin)) errors.push(`Invalid origin host: ${origin}`);
if (!allowedOrigins.includes('nv0.kr')) warnings.push('NV0_ALLOWED_ADMIN_ORIGINS should include nv0.kr');
if (!allowedOrigins.includes('www.nv0.kr')) warnings.push('NV0_ALLOWED_ADMIN_ORIGINS should include www.nv0.kr');
if (enableTurnstile) {
  if (!String(process.env.NV0_TURNSTILE_SITE_KEY || '').trim()) errors.push('NV0_TURNSTILE_SITE_KEY required when NV0_ENABLE_TURNSTILE=true');
  if (!String(process.env.NV0_TURNSTILE_SECRET || '').trim()) errors.push('NV0_TURNSTILE_SECRET required when NV0_ENABLE_TURNSTILE=true');
}

const report = {
  ok: errors.length === 0,
  envFile: envFile || null,
  checked: {
    NODE_ENV: nodeEnv,
    PORT: port,
    NV0_PLATFORM_TARGET: process.env.NV0_PLATFORM_TARGET,
    NV0_ADMIN_AUTH_MODE: process.env.NV0_ADMIN_AUTH_MODE,
    NV0_PERSISTENCE_MODE: process.env.NV0_PERSISTENCE_MODE,
    NV0_SESSION_STORE: process.env.NV0_SESSION_STORE,
    NV0_PAYMENT_PROVIDER: process.env.NV0_PAYMENT_PROVIDER,
    NV0_DEPLOYMENT_STAGE: deploymentStage,
    NV0_COMMERCIAL_LAUNCH_READY: commercialLaunchReady
  },
  errors,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
