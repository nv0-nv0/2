import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createPersistenceManager } from '../server/infrastructure/persistence/persistence.mjs';
import { validateRuntimeConfig } from '../server/config/validation.mjs';

const failures = [];
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-phase330-'));
const dataDir = path.join(root, 'data');
const reportsDir = path.join(root, 'reports');
const fakeBin = path.join(root, 'bin');
fs.mkdirSync(fakeBin, { recursive: true });
fs.writeFileSync(path.join(fakeBin, 'psql'), '#!/usr/bin/env sh\necho "psql: error: could not translate host name \\"postgres\\" to address: Try again" >&2\nexit 2\n');
fs.chmodSync(path.join(fakeBin, 'psql'), 0o755);

const previousPath = process.env.PATH;
process.env.PATH = `${fakeBin}:${previousPath || ''}`;

const defaultDb = {
  settings: { productAgent: { enabled: false } },
  orders: [],
  subscriptions: [],
  publications: [],
  boards: [],
  library: [],
  scans: [],
  sites: [],
  legalUpdates: [],
  systemItems: [],
  rules: [],
  autoFixJobs: [],
  guidanceDocuments: [],
  paymentSessions: [],
  adminUsers: [],
  adminRoleBindings: [],
  adminSessions: [],
  auditLogs: [],
  paymentEvents: [],
  webhookInbox: []
};

async function ensureRuntime() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
}
function ensureAdminCollections(db) {
  db.adminUsers ||= [];
  db.adminRoleBindings ||= [];
  db.adminSessions ||= [];
}

const baseEnv = {
  NODE_ENV: 'production',
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_DEPLOYMENT_STAGE: 'prelaunch',
  NV0_COMMERCIAL_LAUNCH_READY: 'false',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_DATABASE_URL: 'postgres://nv0:password@postgres:5432/nv0',
  NV0_PRELAUNCH_DB_FALLBACK: 'true',
  NV0_SECURE_RECORDS_KEY: 'phase330-secure-records-key-real-value',
  NV0_SECURE_RECORDS_DIR: path.join(dataDir, 'secure-records')
};

const logEvents = [];
const logger = {
  warn(event, payload) { logEvents.push({ level: 'warn', event, payload }); },
  error(event, payload) { logEvents.push({ level: 'error', event, payload }); }
};

const persistence = createPersistenceManager({
  dataDir,
  sessionsFile: path.join(dataDir, 'sessions.json'),
  defaultDb,
  ensureRuntime,
  ensureAdminCollections,
  logger,
  env: baseEnv
});

try {
  const sessions = await persistence.readSessions();
  if (!Array.isArray(sessions) || sessions.length !== 0) failures.push('prelaunch fallback must return empty JSON sessions when PostgreSQL DNS fails');
  const db = await persistence.readDb();
  if (!db?.settings) failures.push('prelaunch fallback must create and read JSON db when PostgreSQL DNS fails');
  db.orders.push({ id: 'phase330-order', customer: 'fallback', status: 'draft', stage: 'draft', amount: 0 });
  await persistence.writeDb(db);
  await persistence.writeSessions([{ sid: 'phase330-session', csrfToken: 'csrf', createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt: Date.now() + 60000 }]);
  const reread = await persistence.readDb();
  if (!reread.orders?.some(order => order.id === 'phase330-order')) failures.push('prelaunch fallback must persist writes to JSON/secure db');
  const storedSessions = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions.json'), 'utf8'));
  if (!storedSessions?.some(session => session.sid === 'phase330-session')) failures.push('prelaunch fallback must persist sessions to JSON');
  if (!logEvents.some(item => item.event === '[postgres-prelaunch-fallback-json]')) failures.push('fallback must log [postgres-prelaunch-fallback-json] once');
} catch (error) {
  failures.push(`prelaunch PostgreSQL fallback threw unexpectedly: ${error.stack || error.message}`);
}

try {
  validateRuntimeConfig({
    env: { ...baseEnv, NV0_DATABASE_URL: '', NV0_BOOTSTRAP_ADMIN_EMAIL: 'admin@nv0.kr', NV0_BOOTSTRAP_ADMIN_PASSWORD: 'RealPassword123!RealPassword123!' },
    platform: { commercial: false, target: 'mvp' },
    commercialLaunchReady: false,
    prelaunchMode: true,
    adminAuthMode: 'account_rbac',
    persistenceMode: 'postgres_primary',
    storageMode: 'local_fs',
    scanProvider: 'builtin',
    paymentProvider: 'disabled',
    port: 3210,
    sessionTtlMs: 3600000,
    maxJsonBodyBytes: 1048576,
    maxMultipartBodyBytes: 10485760,
    publicScanLimit: 20,
    publicScanWindowMs: 60000,
    adminAuthLimit: 8,
    adminAuthWindowMs: 600000,
    backupRetentionCount: 20,
    autoBackupIntervalMs: 21600000,
    auditLogRetentionCount: 1000,
    scanCacheTtlMs: 300000,
    ctaAutopublishIntervalMs: 1200000,
    publicCacheSeconds: 60,
    requestTimeoutMs: 15000,
    slowRequestThresholdMs: 1500,
    dataDestructionGraceDays: 30
  });
} catch (error) {
  failures.push(`validateRuntimeConfig must allow missing NV0_DATABASE_URL when prelaunch fallback is enabled: ${error.message}`);
}


async function runFullServerBootProbe() {
  const port = 3331;
  const runtimeDir = path.join(root, 'server-boot-runtime');
  const env = {
    ...process.env,
    PATH: `${fakeBin}:${previousPath || ''}`,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    NV0_PLATFORM_TARGET: 'commercial',
    NV0_DEPLOYMENT_STAGE: 'prelaunch',
    NV0_COMMERCIAL_LAUNCH_READY: 'false',
    NV0_RUN_PREFLIGHT: 'false',
    NV0_ADMIN_AUTH_MODE: 'account_rbac',
    NV0_BOOTSTRAP_ADMIN_EMAIL: 'admin@nv0.kr',
    NV0_BOOTSTRAP_ADMIN_PASSWORD: 'RealPassword123!RealPassword123!',
    NV0_PERSISTENCE_MODE: 'postgres_primary',
    NV0_DATABASE_URL: 'postgres://nv0:password@postgres:5432/nv0',
    NV0_PRELAUNCH_DB_FALLBACK: 'true',
    NV0_REDIS_URL: 'redis://redis:6379/0',
    NV0_REDIS_TIMEOUT_MS: '20',
    NV0_SESSION_STORE: 'redis',
    NV0_RATE_LIMIT_STORE: 'redis',
    NV0_LOCK_PROVIDER: 'redis',
    NV0_STORAGE_MODE: 's3',
    NV0_S3_ENDPOINT: 'https://r2.invalid.kr',
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
    NV0_CUSTOMER_SERVICE_PHONE: '이메일 전용 고객지원',
    NV0_PRIVACY_OFFICER_EMAIL: 'ct@nv0.kr',
    NV0_SMTP_URL: 'smtps://mailer:secret@smtp.nv0.kr:465?from=ct%40nv0.kr',
    NV0_ADMIN_IP_ALLOWLIST: '203.0.113.10/32',
    NV0_SECURE_RECORDS_KEY: 'real-secure-records-key-real-secure-records-key',
    NV0_PRIVACY_HASH_KEY: 'real-privacy-hash-key-real-privacy-hash-key',
    NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION: 'true',
    NV0_BACKUP_ENCRYPTION_SECRET: 'real-backup-encryption-secret-real-backup-encryption-secret',
    NV0_AUTO_BACKUP_ENABLED: 'false',
    NV0_BUSINESS_TRADE_NAME: '엔브이제로(NV0)',
    NV0_BUSINESS_REPRESENTATIVE: '나금상',
    NV0_BUSINESS_REGISTRATION_NUMBER: '584-77-00586',
    NV0_BUSINESS_ADDRESS: '경기도 남양주시 와부읍 덕소로97번길 34, 105동 402호(덕소주공아파트 1단지)',
    NV0_MAIL_ORDER_REGISTRATION_NUMBER: '',
    NV0_RUNTIME_DIR: runtimeDir
  };
  const child = spawn(process.execPath, ['server/index.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  try {
    const deadline = Date.now() + 8000;
    let healthy = false;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 250));
      if (!child.pid || child.exitCode !== null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/healthz`);
        if (response.ok) { healthy = true; break; }
      } catch {}
    }
    if (!healthy) failures.push(`full server boot probe failed under postgres DNS error. output=${output.slice(-1500)}`);
    if (!output.includes('[postgres-prelaunch-fallback-json]')) failures.push('full server boot probe must log postgres fallback marker');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
}

const strictLogger = { warn() {}, error() {} };
const strictPersistence = createPersistenceManager({
  dataDir: path.join(root, 'strict-data'),
  sessionsFile: path.join(root, 'strict-data', 'sessions.json'),
  defaultDb,
  ensureRuntime: async () => fs.mkdirSync(path.join(root, 'strict-data'), { recursive: true }),
  ensureAdminCollections,
  logger: strictLogger,
  env: { ...baseEnv, NV0_DEPLOYMENT_STAGE: 'commercial_launch', NV0_COMMERCIAL_LAUNCH_READY: 'true', NV0_PRELAUNCH_DB_FALLBACK: 'false' }
});
try {
  await strictPersistence.readSessions();
  failures.push('commercial_launch/strict PostgreSQL failure must not fall back to JSON');
} catch (error) {
  if (!String(error.message || '').includes('PostgreSQL schema bootstrap failed')) failures.push(`strict failure should preserve PostgreSQL error, got: ${error.message}`);
}

await runFullServerBootProbe();

process.env.PATH = previousPath;

const files = ['server/infrastructure/persistence/persistence.mjs', 'server/config/validation.mjs', 'scripts/preflight.mjs', 'docker-compose.yml', 'deploy/docker-compose.coolify.yml'];
for (const file of files) {
  if (!fs.existsSync(file)) failures.push(`missing expected phase330 file: ${file}`);
}
const persistenceText = fs.readFileSync('server/infrastructure/persistence/persistence.mjs', 'utf8');
if (!persistenceText.includes('[postgres-prelaunch-fallback-json]')) failures.push('persistence manager must include explicit fallback log marker');
if (!persistenceText.includes('commercial_launch remains strict')) failures.push('persistence fallback must document strict commercial_launch boundary');
if (!fs.readFileSync('docker-compose.yml', 'utf8').includes('NV0_PRELAUNCH_DB_FALLBACK')) failures.push('root compose must expose NV0_PRELAUNCH_DB_FALLBACK');
if (!fs.readFileSync('deploy/docker-compose.coolify.yml', 'utf8').includes('NV0_PRELAUNCH_DB_FALLBACK')) failures.push('Coolify compose must expose NV0_PRELAUNCH_DB_FALLBACK');

fs.rmSync(root, { recursive: true, force: true });

if (failures.length) {
  console.error(JSON.stringify({ ok: false, phase: 330, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 330, score: 100, checks: 13, guard: 'prelaunch-postgres-json-fallback-strict-launch-boundary' }, null, 2));
