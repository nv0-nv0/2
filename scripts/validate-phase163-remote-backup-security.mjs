import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }

const server = read('server/index.mjs');
const routeSources = [server, 'server/routes/admin.mjs', 'server/routes/ops.mjs'].map(item => item === server ? server : (fs.existsSync(path.join(root, item)) ? read(item) : '')).join('\n');
const backupOps = read('server/core/backup-operations.mjs');
const backupScript = read('scripts/backup-runtime.mjs');
const storage = read('server/infrastructure/storage/s3-compatible.mjs');
const pkg = JSON.parse(read('package.json'));

add('phase-version', pkg.version.includes('phase163-remote-backup-security'));
add('phase-script', pkg.scripts['validate:phase163'] === 'node scripts/validate-phase163-remote-backup-security.mjs');

for (const token of [
  'BACKUP_REMOTE_ENABLED',
  'BACKUP_REMOTE_PREFIX',
  'BACKUP_ENCRYPTION_SECRET',
  'BACKUP_REMOTE_REQUIRE_ENCRYPTION',
  'AUTO_BACKUP_ENABLED',
  'AUTO_BACKUP_INTERVAL_MS',
  'createBackupSnapshot({ reason',
  'backupSecurityConfigSummary',
  'runAutomaticBackup',
  "requireAdminPermission(req, res, session, 'ops.write')",
  'if (!adminIpAllowed(req)) return json(req, res, 403'
]) add(`server:${token}`, routeSources.includes(token));

for (const token of [
  'uploadRemoteBackupObject',
  'encryptBackupPayload',
  'backup integrity check failed',
  'createSnapshot',
  'restoreSnapshot',
  'runAutomatic',
  's3CompatibleConfigSummary'
]) add(`backup-operations:${token}`, backupOps.includes(token));

for (const token of [
  'putObjectToS3Compatible',
  'isS3CompatibleConfigured',
  'AWS4-HMAC-SHA256',
  'sha256Hex',
  's3CompatibleConfigSummary'
]) add(`storage:${token}`, storage.includes(token));

for (const token of [
  'backup-manifest.json',
  'uploads-manifest.json',
  'NV0_BACKUP_ENCRYPTION_SECRET',
  'encryptBackupPayload',
  'remotePut',
  'sha256Hex(dbBuffer)'
]) add(`backup-runtime:${token}`, backupScript.includes(token));

for (const rel of ['.env.example', '.env.coolify.example', 'deploy/coolify.env.bulk.txt', 'deploy/coolify.env.example']) {
  const text = read(rel);
  for (const token of [
    'NV0_BACKUP_REMOTE_ENABLED=true',
    'NV0_BACKUP_REMOTE_PREFIX=backups/nv0',
    'NV0_BACKUP_COMPRESS=true',
    'NV0_BACKUP_ENCRYPTION_SECRET=CHANGE_ME_LONG_RANDOM_BACKUP_SECRET',
    'NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true',
    'NV0_AUTO_BACKUP_ENABLED=true',
    'NV0_AUTO_BACKUP_INTERVAL_MS=21600000'
  ]) add(`${rel}:${token}`, text.includes(token));
}

const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync(path.join(root, 'PHASE163_REMOTE_BACKUP_SECURITY_VALIDATION_20260502.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
