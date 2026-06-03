import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}
function parseEnvText(raw) {
  const values = {};
  const duplicates = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key in values) duplicates.push(key);
    values[key] = value;
  }
  return { values, duplicates };
}
function composeVars(raw) {
  return new Set([...raw.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)/g)].map(match => match[1]));
}
function runNode(script, args = [], options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
    ...options
  });
}

const pkg = JSON.parse(read('package.json'));
const bulk = parseEnvText(read('deploy/coolify.env.bulk.txt'));
const bootSafeComposeFiles = ['docker-compose.yml', 'deploy/docker-compose.coolify.yml'];
const strictCompose = read('deploy/docker-compose.commercial.yml');
const bulkForwardExceptions = new Set(['POSTGRES_PASSWORD']);

add('bulk-env-no-duplicates', () => assert.deepEqual(bulk.duplicates, []));
add('bulk-env-boot-safe-prelaunch-profile', () => {
  const env = bulk.values;
  assert.equal(env.NV0_PLATFORM_TARGET, 'commercial');
  assert.equal(env.NV0_DEPLOYMENT_STAGE, 'prelaunch');
  assert.equal(env.NV0_COMMERCIAL_LAUNCH_READY, 'false');
  assert.equal(env.NV0_RUN_PREFLIGHT, 'true');
  assert.equal(env.NV0_TOTP_PREFLIGHT_FAILURE_MODE, 'auto');
  assert.equal(env.NV0_PAYMENT_PROVIDER, 'disabled');
  assert.equal(env.NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT, 'false');
  assert.equal(env.NV0_SCAN_PROVIDER, 'external_http');
  assert.equal(env.NV0_SCAN_PROVIDER_FALLBACK, 'true');
  assert.equal(env.NV0_PRELAUNCH_DB_FALLBACK, 'true');
  assert.equal(env.NV0_READYZ_REDIS_STRICT, 'false');
});
for (const file of bootSafeComposeFiles) {
  add(`${file}:boot-safe-single-app`, () => {
    const raw = read(file);
    assert.doesNotMatch(raw, /^\s{2}(?:postgres|redis|minio):\s*$/m);
    assert.doesNotMatch(raw, /^\s+depends_on:/m);
    assert.doesNotMatch(raw, /^\s+env_file:/m);
    assert.match(raw, /fetch\('http:\/\/127\.0\.0\.1:3210\/healthz'\)/);
    assert.match(raw, /b\.ok===true/);
  });
  add(`${file}:bulk-keys-forwarded`, () => {
    const vars = composeVars(read(file));
    for (const key of Object.keys(bulk.values)) {
      if (bulkForwardExceptions.has(key)) continue;
      assert.equal(vars.has(key), true, `${file}: bulk key is not forwarded: ${key}`);
    }
  });
  add(`${file}:admin-mfa-default-fail-closed`, () => {
    const raw = read(file);
    assert.match(raw, /NV0_ADMIN_MFA_REQUIRED:\s*\$\{NV0_ADMIN_MFA_REQUIRED:-true\}/, `${file}: admin MFA must default to true so an omitted Coolify variable cannot disable the commercial preflight control`);
  });
}
add('commercial-compose:strict-services-and-readyz', () => {
  assert.match(strictCompose, /^\s{2}postgres:\s*$/m);
  assert.match(strictCompose, /^\s{2}redis:\s*$/m);
  assert.match(strictCompose, /^\s+depends_on:/m);
  assert.match(strictCompose, /NV0_DATABASE_URL:\s*postgres:\/\/nv0:\$\{POSTGRES_PASSWORD:\?set POSTGRES_PASSWORD\}@postgres:5432\/nv0/);
  assert.match(strictCompose, /NV0_READYZ_REDIS_STRICT:\s*\$\{NV0_READYZ_REDIS_STRICT:-true\}/);
  assert.match(strictCompose, /fetch\('http:\/\/127\.0\.0\.1:3210\/readyz'\)/);
  assert.match(strictCompose, /b\.ok===true&&b\.ready===true/);
});
add('package:operator-commands-registered', () => {
  assert.equal(pkg.scripts?.['generate:r2-env'], 'node scripts/generate-r2-coolify-env.mjs');
  assert.equal(pkg.scripts?.['validate:coolify-env'], 'node scripts/validate-coolify-env-detection.mjs');
  assert.equal(pkg.scripts?.['deploy:precheck'], 'npm run validate:coolify-env && npm run validate:deploy && npm run check:release-secret-hygiene && npm run check:operational-contract');
});
add('root-coolify-example:safe-initial-profile', () => {
  const env = parseEnvText(read('.env.coolify.example')).values;
  assert.equal(env.NV0_PLATFORM_TARGET, 'mvp');
  assert.equal(env.NV0_DEPLOYMENT_STAGE, 'mvp');
  assert.equal(env.NV0_RUN_PREFLIGHT, 'false');
  assert.equal(env.NV0_PAYMENT_PROVIDER, 'disabled');
  assert.equal('NV0_ADMIN_KEY' in env, false);
});
add('strict-r2-generator:complete-and-self-validating', () => {
  const testEnv = {
    ...process.env,
    R2_ACCOUNT_ID: '1234567890abcdef1234567890abcdef',
    R2_ACCESS_KEY_ID: 'r2accesskey1234567890',
    R2_SECRET_ACCESS_KEY: 'r2secretkey12345678901234567890',
    NV0_SCAN_PROVIDER_URL: 'https://scan.vendor.kr/api/scan',
    NV0_SMTP_URL: 'smtps://mailer:StrongPass123@smtp.vendor.kr:465?from=ct%40nv0.kr',
    NV0_ADMIN_IP_ALLOWLIST: '203.0.113.10/32',
    NV0_TURNSTILE_SITE_KEY: 'turnstile-site-key-1234567890',
    NV0_TURNSTILE_SECRET: 'turnstile-secret-key-1234567890',
    NV0_BUSINESS_TRADE_NAME: '엔브이제로',
    NV0_BUSINESS_REPRESENTATIVE: '운영담당자',
    NV0_BUSINESS_REGISTRATION_NUMBER: '123-45-67890',
    NV0_BUSINESS_ADDRESS: '서울특별시중구세종대로1'
  };
  const generated = runNode('scripts/generate-r2-coolify-env.mjs', [], { env: testEnv });
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);
  const parsed = parseEnvText(generated.stdout);
  assert.deepEqual(parsed.duplicates, []);
  const env = parsed.values;
  for (const key of [
    'NODE_ENV','NV0_PLATFORM_TARGET','NV0_DEPLOYMENT_STAGE','NV0_COMMERCIAL_LAUNCH_READY','NV0_RUN_PREFLIGHT',
    'NV0_DATABASE_URL','POSTGRES_PASSWORD','NV0_REDIS_URL','NV0_SESSION_STORE','NV0_RATE_LIMIT_STORE','NV0_LOCK_PROVIDER',
    'NV0_READYZ_REDIS_STRICT','NV0_STORAGE_MODE','NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY',
    'NV0_SCAN_PROVIDER','NV0_SCAN_PROVIDER_URL','NV0_SCAN_PROVIDER_FALLBACK','NV0_PAYMENT_PROVIDER','NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT',
    'NV0_PORTONE_WEBHOOK_VERIFY_MODE','NV0_SECURE_RECORDS_KEY','NV0_SECURE_RECORDS_SALT','NV0_PRIVACY_HASH_KEY',
    'NV0_BACKUP_ENCRYPTION_SECRET','NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION','NV0_ADMIN_AUTH_MODE','NV0_BOOTSTRAP_ADMIN_PASSWORD'
  ]) assert.ok(String(env[key] || '').trim(), `generated env missing ${key}`);
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.NV0_PLATFORM_TARGET, 'commercial');
  assert.equal(env.NV0_DEPLOYMENT_STAGE, 'prelaunch');
  assert.equal(env.NV0_COMMERCIAL_LAUNCH_READY, 'false');
  assert.equal(env.NV0_PRELAUNCH_DB_FALLBACK, 'false');
  assert.equal(env.NV0_READYZ_REDIS_STRICT, 'true');
  assert.equal(env.NV0_PAYMENT_PROVIDER, 'disabled');
  assert.equal(env.NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT, 'false');
  assert.equal(env.NV0_PORTONE_WEBHOOK_VERIFY_MODE, 'strict');
  assert.equal(env.NV0_SCAN_PROVIDER, 'external_http');
  assert.equal(env.NV0_SCAN_PROVIDER_FALLBACK, 'true');
  assert.equal(env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION, 'true');
  assert.equal(env.NV0_DATABASE_URL, `postgres://nv0:${env.POSTGRES_PASSWORD}@postgres:5432/nv0`);
  assert.equal('NV0_ADMIN_KEY' in env, false);
  assert.match(generated.stdout, /Pair this output with deploy\/docker-compose\.commercial\.yml/);
  assert.doesNotMatch(generated.stdout, /PostgreSQL is internal to docker-compose\. Do not set NV0_DATABASE_URL manually/);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridion-coolify-validation-'));
  const tmpEnv = path.join(tmpDir, 'generated.env');
  fs.writeFileSync(tmpEnv, generated.stdout);
  try {
    for (const script of ['scripts/preflight.mjs','scripts/validate-prod-env.mjs','scripts/check-storage-config.mjs']) {
      const result = runNode(script, [tmpEnv]);
      assert.equal(result.status, 0, `${script} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
add('runbook:staged-compose-path-documented', () => {
  const raw = read('deploy/COOLIFY_R2_DEPLOYMENT_RUNBOOK_KO.md');
  assert.match(raw, /boot-safe/);
  assert.match(raw, /deploy\/docker-compose\.commercial\.yml/);
  assert.match(raw, /npm run generate:r2-env/);
  assert.doesNotMatch(raw, /`\/docker-compose\.yml`은 R2 우선 프로필이다/);
});

const failures = checks.filter(item => !item.ok);
const report = {
  ok: failures.length === 0,
  phase: 'coolify-env-detection',
  checkedAt: new Date().toISOString(),
  checked: checks.length,
  failed: failures.length,
  failures,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/COOLIFY_ENV_DETECTION.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
