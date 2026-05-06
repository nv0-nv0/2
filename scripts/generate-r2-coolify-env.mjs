import crypto from 'node:crypto';

function randBase64(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
function randHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
function value(name, fallback) {
  const raw = String(process.env[name] || '').trim();
  return raw || fallback;
}

const accountId = value('R2_ACCOUNT_ID', 'R2_ACCOUNT_ID');
const bucket = value('R2_BUCKET', 'nv0-production');
const r2AccessKey = value('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID');
const r2SecretKey = value('R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY');
const postgresPassword = value('POSTGRES_PASSWORD', randBase64(24));
const adminPassword = value('NV0_BOOTSTRAP_ADMIN_PASSWORD', randBase64(24));
const secureKey = value('NV0_SECURE_RECORDS_KEY', randBase64(32));
const secureSalt = value('NV0_SECURE_RECORDS_SALT', randHex(32));

const lines = [
  '# NV0 Coolify production env - R2 primary low-cost profile',
  '# Paste into Coolify > Environment Variables > Developer View.',
  '# Replace all REPLACE_REAL_* and R2_* placeholders before redeploy.',
  '# Never set NV0_STORAGE_MODE=local_fs in commercial.',
  'NODE_ENV=production',
  'HOST=0.0.0.0',
  'PORT=3210',
  'NV0_RUNTIME_DIR=/app/runtime',
  'NV0_PLATFORM_TARGET=commercial',
  'NV0_DEPLOYMENT_STAGE=prelaunch',
  'NV0_COMMERCIAL_LAUNCH_READY=false',
  'NV0_PUBLIC_BASE_URL=https://nv0.kr',
  'NV0_TRUST_PROXY_HEADERS=true',
  'NV0_ALLOWED_ADMIN_ORIGINS=nv0.kr,www.nv0.kr',
  'NV0_ALLOWED_HOSTS=nv0.kr,www.nv0.kr',
  'NV0_REQUEST_TIMEOUT_MS=15000',
  'NV0_MAX_JSON_BODY_BYTES=1048576',
  'NV0_MAX_MULTIPART_BODY_BYTES=10485760',
  'NV0_SUPPORT_EMAIL=ct@nv0.kr',
  'NV0_PRIVACY_OFFICER_EMAIL=ct@nv0.kr',
  'NV0_OPERATOR_ALERT_EMAIL=ct@nv0.kr',
  'NV0_HOSTING_PROVIDER=Coolify/Contabo',
  'NV0_CUSTOMER_SERVICE_PHONE=이메일 전용 고객지원',
  'NV0_MAIL_ORDER_REGISTRATION_NUMBER=',
  '# PostgreSQL is internal to docker-compose. Do not set NV0_DATABASE_URL manually in Coolify.',
  '# Compose sets NV0_DATABASE_URL to postgres://nv0:${POSTGRES_PASSWORD}@postgres:5432/nv0.',
  `POSTGRES_PASSWORD=${postgresPassword}`,
  'NV0_PERSISTENCE_MODE=postgres_primary',
  'NV0_DB_COMPARE_MODE=0',
  'NV0_REDIS_URL=redis://redis:6379/0',
  'NV0_REDIS_TIMEOUT_MS=1500',
  'NV0_SESSION_STORE=redis',
  'NV0_RATE_LIMIT_STORE=redis',
  'NV0_LOCK_PROVIDER=redis',
  'NV0_STORAGE_MODE=s3',
  `NV0_S3_ENDPOINT=https://${accountId}.r2.cloudflarestorage.com`,
  `NV0_S3_BUCKET=${bucket}`,
  'NV0_S3_REGION=auto',
  `NV0_S3_ACCESS_KEY_ID=${r2AccessKey}`,
  `NV0_S3_SECRET_ACCESS_KEY=${r2SecretKey}`,
  'NV0_S3_PUBLIC_BASE_URL=',
  'NV0_S3_FORCE_PATH_STYLE=true',
  'NV0_SCAN_PROVIDER=external_http',
  'NV0_SCAN_PROVIDER_URL=REPLACE_REAL_SCAN_PROVIDER_URL',
  'NV0_SCAN_PROVIDER_TOKEN=',
  'NV0_SCAN_PROVIDER_FALLBACK=false',
  'NV0_SCAN_CACHE_TTL_MS=300000',
  'NV0_TARGET_FETCH_ENABLED=false',
  'NV0_PAYMENT_PROVIDER=disabled',
  'NV0_PORTONE_API_BASE_URL=https://api.portone.io',
  'NV0_PORTONE_API_SECRET=',
  'NV0_PORTONE_STORE_ID=',
  'NV0_PORTONE_CHANNEL_KEY=',
  'NV0_PORTONE_REDIRECT_URL=https://nv0.kr/checkout',
  'NV0_PORTONE_PAY_METHOD=CARD',
  'NV0_PORTONE_CUSTOMER_ID_PREFIX=nv0',
  'NV0_PORTONE_WEBHOOK_SECRET=',
  'NV0_PORTONE_WEBHOOK_VERIFY_MODE=optional',
  'NV0_SMTP_URL=REPLACE_REAL_SMTP_URL',
  'NV0_EMAIL_MAX_RETRY_COUNT=5',
  'NV0_EMAIL_RETRY_BACKOFF_MS=300000',
  'NV0_ENABLE_TURNSTILE=true',
  'NV0_TURNSTILE_SITE_KEY=REPLACE_REAL_TURNSTILE_SITE_KEY',
  'NV0_TURNSTILE_SECRET=REPLACE_REAL_TURNSTILE_SECRET',
  'NV0_ADMIN_AUTH_MODE=account_rbac',
  'NV0_BOOTSTRAP_ADMIN_EMAIL=admin@nv0.kr',
  'NV0_BOOTSTRAP_ADMIN_NAME=NV0_Admin',
  `NV0_BOOTSTRAP_ADMIN_PASSWORD=${adminPassword}`,
  'NV0_ADMIN_SESSION_TTL_MS=3600000',
  'NV0_ADMIN_IP_ALLOWLIST=REPLACE_REAL_ADMIN_PUBLIC_IP',
  'NV0_PUBLIC_SCAN_LIMIT=20',
  'NV0_PUBLIC_SCAN_WINDOW_MS=60000',
  'NV0_ADMIN_AUTH_LIMIT=8',
  'NV0_ADMIN_AUTH_WINDOW_MS=600000',
  'NV0_BACKUP_RETENTION_COUNT=20',
  'NV0_AUDIT_LOG_RETENTION_COUNT=1000',
  'NV0_PAYMENT_IDEMPOTENCY_TTL_MS=86400000',
  'NV0_PUBLIC_CACHE_SECONDS=60',
  'NV0_PUBLIC_ASSET_CACHE_SECONDS=31536000',
  'NV0_CTA_AUTOPUBLISH_INTERVAL_MS=1200000',
  `NV0_SECURE_RECORDS_KEY=${secureKey}`,
  `NV0_SECURE_RECORDS_SALT=${secureSalt}`,
  'NV0_RUN_PREFLIGHT=true'
];

console.log(lines.join('\n'));
