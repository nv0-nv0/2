import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzip as gzipCallback } from 'node:zlib';
import { isS3CompatibleConfigured, putObjectToS3Compatible, sha256Hex } from '../server/infrastructure/storage/s3-compatible.mjs';

const gzipAsync = promisify(gzipCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const runtimeDir = path.resolve(process.env.NV0_RUNTIME_DIR || path.join(ROOT, 'runtime'));
const dataDir = path.join(runtimeDir, 'data');
const uploadsDir = path.join(runtimeDir, 'uploads');
const backupsDir = path.join(runtimeDir, 'backups');

const remoteEnabled = process.env.NV0_BACKUP_REMOTE_ENABLED !== 'false' && ['s3','s3_compatible','object_storage'].includes(String(process.env.NV0_STORAGE_MODE || '').trim());
const remotePrefix = String(process.env.NV0_BACKUP_REMOTE_PREFIX || 'backups/nv0').trim().replace(/^\/+|\/+$/g, '') || 'backups/nv0';
const compress = process.env.NV0_BACKUP_COMPRESS !== 'false';
const encryptionSecret = String(process.env.NV0_BACKUP_ENCRYPTION_SECRET || '').trim();

function encryptBackupPayload(buffer, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('NV0BKP1\0'), salt, iv, tag, ciphertext]);
}

async function buildUploadsManifest() {
  const uploads = await fs.readdir(uploadsDir).catch(() => []);
  const manifest = [];
  for (const filename of uploads) {
    const full = path.join(uploadsDir, filename);
    const stat = await fs.stat(full).catch(() => null);
    if (!stat || !stat.isFile()) continue;
    const content = await fs.readFile(full);
    manifest.push({ filename, size: stat.size, mtime: stat.mtime.toISOString(), sha256: sha256Hex(content) });
  }
  return manifest;
}

async function remotePut(key, content, contentType) {
  if (!remoteEnabled) return { ok: false, skipped: true, reason: 'remote_backup_disabled' };
  if (!isS3CompatibleConfigured(process.env)) return { ok: false, skipped: true, reason: 's3_not_configured' };
  try {
    return { ok: true, ...(await putObjectToS3Compatible({ env: process.env, key, content, contentType })) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

await fs.mkdir(backupsDir, { recursive: true });
const createdAt = new Date().toISOString();
const stamp = createdAt.replace(/[:.]/g, '-');
const snapshotDir = path.join(backupsDir, `snapshot-${stamp}`);
await fs.mkdir(snapshotDir, { recursive: true });
const dbBuffer = await fs.readFile(path.join(dataDir, 'db.json'));
await fs.writeFile(path.join(snapshotDir, 'db.json'), dbBuffer);

const uploadsManifest = await buildUploadsManifest();
await fs.writeFile(path.join(snapshotDir, 'uploads-manifest.json'), JSON.stringify(uploadsManifest, null, 2));

let remotePayload = dbBuffer;
let remoteKey = `${remotePrefix}/runtime-snapshot-${stamp}/db.json`;
let remoteContentType = 'application/json; charset=utf-8';
if (compress) {
  remotePayload = await gzipAsync(remotePayload);
  remoteKey += '.gz';
  remoteContentType = 'application/gzip';
}
if (encryptionSecret) {
  remotePayload = encryptBackupPayload(remotePayload, encryptionSecret);
  remoteKey += '.enc';
  remoteContentType = 'application/octet-stream';
}
const remoteDb = await remotePut(remoteKey, remotePayload, remoteContentType);
const remoteUploadsManifest = await remotePut(`${remotePrefix}/runtime-snapshot-${stamp}/uploads-manifest.json`, Buffer.from(JSON.stringify(uploadsManifest, null, 2)), 'application/json; charset=utf-8');
const manifest = {
  version: 'phase163-runtime-backup-v1',
  createdAt,
  local: { snapshotDir, dbSha256: sha256Hex(dbBuffer), dbSize: dbBuffer.length },
  security: { compressed: compress, encrypted: Boolean(encryptionSecret), encryptionAlgorithm: encryptionSecret ? 'aes-256-gcm+scrypt' : null },
  remote: { enabled: remoteEnabled, prefix: remotePrefix, db: remoteDb, uploadsManifest: remoteUploadsManifest },
  uploads: { count: uploadsManifest.length, manifestSha256: sha256Hex(Buffer.from(JSON.stringify(uploadsManifest))) }
};
await fs.writeFile(path.join(snapshotDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2));
const remoteManifest = await remotePut(`${remotePrefix}/runtime-snapshot-${stamp}/backup-manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json; charset=utf-8');
manifest.remote.manifest = remoteManifest;
await fs.writeFile(path.join(snapshotDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok: true, snapshotDir, remote: manifest.remote, security: manifest.security }, null, 2));
