import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const valid = {
  NODE_ENV: 'production',
  PORT: '3210',
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_DEPLOYMENT_STAGE: 'prelaunch',
  NV0_COMMERCIAL_LAUNCH_READY: 'false',
  NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT: 'false',
  NV0_ADMIN_AUTH_MODE: 'account_rbac',
  NV0_ADMIN_MFA_REQUIRED: 'true',
  NV0_ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
  NV0_SESSION_SECRET: 'session-secret-abcdefghijklmnopqrstuvwxyz-1234567890',
  NV0_SECURE_RECORDS_KEY: 'secure-record-key-abcdefghijklmnopqrstuvwxyz-1234567890',
  NV0_PRIVACY_HASH_KEY: 'privacy-hash-key-abcdefghijklmnopqrstuvwxyz-1234567890',
  NV0_BACKUP_ENCRYPTION_SECRET: 'backup-encryption-secret-abcdefghijklmnopqrstuvwxyz-1234567890',
  NV0_BOOTSTRAP_ADMIN_EMAIL: 'ct@nv0.kr',
  NV0_BOOTSTRAP_ADMIN_PASSWORD: 'bootstrap-password-1234567890',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_PRELAUNCH_DB_FALLBACK: 'true',
  NV0_SESSION_STORE: 'redis',
  NV0_RATE_LIMIT_STORE: 'redis',
  NV0_LOCK_PROVIDER: 'redis',
  NV0_REDIS_URL: 'redis://redis:6379/0',
  NV0_STORAGE_MODE: 's3',
  NV0_S3_ENDPOINT: 'https://r2.nv0.kr',
  NV0_S3_BUCKET: 'nv0-production',
  NV0_S3_ACCESS_KEY_ID: 'r2-access-key',
  NV0_S3_SECRET_ACCESS_KEY: 'r2-secret-key',
  NV0_SCAN_PROVIDER: 'external_http',
  NV0_SCAN_PROVIDER_URL: 'https://scan.nv0.kr/api/scan',
  NV0_SCAN_PROVIDER_FALLBACK: 'true',
  NV0_PAYMENT_PROVIDER: 'disabled',
  NV0_PUBLIC_BASE_URL: 'https://nv0.kr',
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
  NV0_HOSTING_PROVIDER: 'Coolify/Contabo',
  NV0_CUSTOMER_SERVICE_PHONE: '이메일 전용 고객지원',
  NV0_PRIVACY_OFFICER_EMAIL: 'privacy@nv0.kr',
  NV0_SMTP_URL: 'smtps://user:pass@smtp.nv0.kr:465',
  NV0_ADMIN_IP_ALLOWLIST: '119.67.146.91',
  NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION: 'true'
};

function run(overrides = {}) {
  return spawnSync(process.execPath, ['scripts/check-commercial-runtime-startup-preflight.mjs', '--json'], {
    cwd: process.cwd(),
    env: { ...process.env, ...valid, ...overrides },
    encoding: 'utf8'
  });
}
function parsed(result) {
  return JSON.parse((result.stdout || result.stderr).trim());
}

const ok = run();
assert.equal(ok.status, 0, ok.stderr);
assert.equal(parsed(ok).ok, true);

for (const [key, value] of [
  ['NV0_SESSION_SECRET', ''],
  ['NV0_SECURE_RECORDS_KEY', ''],
  ['NV0_PRIVACY_HASH_KEY', ''],
  ['NV0_BACKUP_ENCRYPTION_SECRET', ''],
  ['NV0_BOOTSTRAP_ADMIN_PASSWORD', 'short'],
  ['NV0_REDIS_URL', 'http://redis:6379/0'],
  ['NV0_SMTP_URL', 'https://smtp.example.com'],
  ['NV0_S3_ENDPOINT', 'ftp://storage.example.com']
]) {
  const result = run({ [key]: value });
  assert.notEqual(result.status, 0, `${key} should fail`);
  const body = parsed(result);
  assert.equal(body.ok, false);
  assert.equal(body.gate, 'commercial-runtime-startup-preflight');
  assert.equal(body.secretPrinted, false);
  assert.ok(body.errors.some((message) => message.includes(key)), `${key} missing from ${JSON.stringify(body)}`);
}

const aggregate = run({ NV0_SESSION_SECRET: '', NV0_SECURE_RECORDS_KEY: '', NV0_PRIVACY_HASH_KEY: '', NV0_BACKUP_ENCRYPTION_SECRET: '', NV0_SMTP_URL: '', NV0_S3_ENDPOINT: '' });
assert.notEqual(aggregate.status, 0);
const aggregateBody = parsed(aggregate);
assert.ok(aggregateBody.issueCount >= 6, JSON.stringify(aggregateBody));
for (const key of ['NV0_SESSION_SECRET','NV0_SECURE_RECORDS_KEY','NV0_PRIVACY_HASH_KEY','NV0_BACKUP_ENCRYPTION_SECRET','NV0_SMTP_URL','NV0_S3_ENDPOINT']) {
  assert.ok(aggregateBody.issues.some((item) => item.key === key), `${key} missing from aggregate issues`);
}
assert.equal(aggregateBody.secretPrinted, false);

const entrypoint = fs.readFileSync('deploy/entrypoint.sh', 'utf8');
assert.match(entrypoint, /check-commercial-runtime-startup-preflight\.mjs/);
assert.match(entrypoint, /commercial runtime configuration preflight failed/);
assert.match(entrypoint, /exec tail -f \/dev\/null/);

const generator = fs.readFileSync('scripts/generate-commercial-secrets.mjs', 'utf8');
for (const key of ['NV0_SESSION_SECRET','NV0_SECURE_RECORDS_KEY','NV0_SECURE_RECORDS_SALT','NV0_PRIVACY_HASH_KEY','NV0_BACKUP_ENCRYPTION_SECRET','NV0_DATABASE_URL','NV0_REDIS_URL']) {
  assert.match(generator, new RegExp(key));
}

const preserved = spawnSync(process.execPath, ['scripts/generate-commercial-secrets.mjs', '--preserve-totp'], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(preserved.status, 0, preserved.stderr);
assert.doesNotMatch(preserved.stdout, /^NV0_ADMIN_TOTP_SECRET=/m);
assert.doesNotMatch(preserved.stdout, /^NV0_ADMIN_MFA_REQUIRED=/m);
for (const key of ['NV0_SESSION_SECRET','NV0_SECURE_RECORDS_KEY','NV0_SECURE_RECORDS_SALT','NV0_PRIVACY_HASH_KEY','NV0_BACKUP_ENCRYPTION_SECRET','POSTGRES_PASSWORD','NV0_DATABASE_URL','NV0_REDIS_URL']) {
  assert.match(preserved.stdout, new RegExp(`^${key}=.+$`, 'm'));
}
assert.ok(fs.existsSync('tools/RUN_COPY_REMAINING_CORE_SECRETS_FOR_DEVELOPER_VIEW.bat'));
assert.ok(fs.existsSync('tools/copy-remaining-core-secrets-developer-view.ps1'));

console.log('commercial runtime startup preflight contract passed: 16 assertions groups');
