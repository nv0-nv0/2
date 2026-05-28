import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const requiredFiles = [
  'scripts/preflight.mjs',
  'deploy/entrypoint.sh',
  'docker-compose.yml',
  'deploy/docker-compose.coolify.yml',
  'docs/PHASE326_ADMIN_KEY_PREFLIGHT_RECOVERY.md',
  'docs/current/PHASE326_ADMIN_KEY_PREFLIGHT_AUDIT.json'
];
for (const file of requiredFiles) if (!fs.existsSync(file)) failures.push(`missing required file: ${file}`);

function read(file) { return fs.readFileSync(file, 'utf8'); }
const preflight = read('scripts/preflight.mjs');
if (!preflight.includes('NV0_ADMIN_KEY is ignored in commercial prelaunch')) failures.push('preflight must warn, not fail, for legacy NV0_ADMIN_KEY during commercial prelaunch');
if (!preflight.includes('if (commercialLaunchReady) errors.push')) failures.push('preflight must still hard-block NV0_ADMIN_KEY for commercial launch');

const entrypoint = read('deploy/entrypoint.sh');
if (!entrypoint.includes('unset NV0_ADMIN_KEY')) failures.push('entrypoint must unset legacy NV0_ADMIN_KEY in commercial account_rbac mode');
if (!entrypoint.includes('NV0_LEGACY_ADMIN_KEY_SANITIZED')) failures.push('entrypoint must expose sanitization marker');

for (const file of ['docker-compose.yml', 'deploy/docker-compose.coolify.yml']) {
  const text = read(file);
  if (text.includes('NV0_ADMIN_KEY:')) failures.push(`${file} must not inject NV0_ADMIN_KEY by default`);
  if (!text.includes('legacy shared-key admin is MVP-only')) failures.push(`${file} must document the admin key boundary`);
}

const baseCommercialEnv = {
  ...process.env,
  NODE_ENV: 'production',
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_DEPLOYMENT_STAGE: 'prelaunch',
  NV0_COMMERCIAL_LAUNCH_READY: 'false',
  NV0_RUN_PREFLIGHT: 'true',
  NV0_ADMIN_AUTH_MODE: 'account_rbac',
  NV0_ADMIN_KEY: 'legacy-key-that-must-not-block-prelaunch',
  NV0_BOOTSTRAP_ADMIN_EMAIL: 'admin@nv0.kr',
  NV0_BOOTSTRAP_ADMIN_PASSWORD: 'RealLongRandomPassword123!RealLongRandomPassword123!',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_DATABASE_URL: 'postgres://nv0:real-password@postgres:5432/nv0',
  NV0_REDIS_URL: 'redis://redis:6379/0',
  NV0_SESSION_STORE: 'redis',
  NV0_RATE_LIMIT_STORE: 'redis',
  NV0_LOCK_PROVIDER: 'redis',
  NV0_STORAGE_MODE: 's3',
  NV0_S3_ENDPOINT: 'https://r2.example.invalid',
  NV0_S3_BUCKET: 'vr-production',
  NV0_S3_ACCESS_KEY_ID: 'real-access-key-id',
  NV0_S3_SECRET_ACCESS_KEY: 'real-secret-access-key',
  NV0_SCAN_PROVIDER: 'external_http',
  NV0_SCAN_PROVIDER_URL: 'https://scan.nv0.kr/api/scan',
  NV0_SCAN_PROVIDER_TOKEN: 'real-scan-provider-token',
  NV0_PAYMENT_PROVIDER: 'disabled',
  NV0_PUBLIC_BASE_URL: 'https://www.nv0.kr',
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_HOSTING_PROVIDER: 'Coolify/Contabo',
  NV0_CUSTOMER_SERVICE_PHONE: '02-0000-0000',
  NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
  NV0_SMTP_URL: 'smtps://mailer:mailsecret123@smtp.nv0.kr:465?from=ct%40nv0.kr',
  NV0_ADMIN_IP_ALLOWLIST: '203.0.113.10/32',
  NV0_SECURE_RECORDS_KEY: 'real-secure-records-key-real-secure-records-key',
  NV0_PRIVACY_HASH_KEY: 'real-privacy-hash-key-real-privacy-hash-key',
  NV0_BUSINESS_TRADE_NAME: 'VERIDION',
  NV0_BUSINESS_REPRESENTATIVE: 'Real Representative',
  NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
  NV0_BUSINESS_ADDRESS: 'Seoul, Republic of Korea',
  NV0_ENABLE_TURNSTILE: 'false',
  NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION: 'true',
  NV0_BACKUP_ENCRYPTION_SECRET: 'real-backup-encryption-secret-real-backup-encryption-secret',
  NV0_TRUST_PROXY_HEADERS: 'true'
};

const prelaunch = spawnSync(process.execPath, ['scripts/preflight.mjs'], { env: baseCommercialEnv, encoding: 'utf8' });
if (prelaunch.status !== 0) failures.push(`commercial prelaunch preflight must pass with sanitized/ignored legacy admin key: ${prelaunch.stderr || prelaunch.stdout}`);
else {
  try {
    const payload = JSON.parse(prelaunch.stdout);
    if (!payload.ok) failures.push('prelaunch preflight returned ok=false');
    if (!payload.warnings?.some((item) => item.includes('NV0_ADMIN_KEY is ignored'))) failures.push('prelaunch preflight must include admin key warning');
  } catch (error) {
    failures.push(`prelaunch preflight output must be JSON: ${error.message}`);
  }
}

const launch = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
  env: { ...baseCommercialEnv, NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PAYMENT_PROVIDER: 'portone_v2', NV0_PORTONE_API_SECRET: 'real-portone-api-secret', NV0_PORTONE_STORE_ID: 'real-store-id', NV0_PORTONE_CHANNEL_KEY: 'real-channel-key', NV0_PORTONE_WEBHOOK_SECRET: 'real-webhook-secret', NV0_MAIL_ORDER_REGISTRATION_NUMBER: '2026-Seoul-0000' },
  encoding: 'utf8'
});
if (launch.status === 0) failures.push('commercial launch preflight must fail when NV0_ADMIN_KEY is present');
else if (!String(launch.stderr || launch.stdout).includes('NV0_ADMIN_KEY must not be used for commercial launch')) failures.push('commercial launch preflight must clearly report the NV0_ADMIN_KEY blocker');

const audit = fs.existsSync('docs/current/PHASE326_ADMIN_KEY_PREFLIGHT_AUDIT.json') ? JSON.parse(fs.readFileSync('docs/current/PHASE326_ADMIN_KEY_PREFLIGHT_AUDIT.json', 'utf8')) : null;
if (!audit?.ok) failures.push('phase326 audit must be ok=true');
if (audit && audit.score !== 100) failures.push('phase326 audit score must be 100');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, phase: 326, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 326, score: 100, checks: 18, guard: 'commercial-prelaunch-admin-key-sanitizer' }, null, 2));
