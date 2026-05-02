import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gzip as gzipCallback } from 'node:zlib';
import { isS3CompatibleConfigured, putObjectToS3Compatible, s3CompatibleConfigSummary, sha256Hex } from '../infrastructure/storage/s3-compatible.mjs';

const gzipAsync = promisify(gzipCallback);

function encryptBackupPayload(buffer, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('NV0BKP1\0'), salt, iv, tag, ciphertext]);
}

export function createBackupOperations(config) {
  const { dataDir, uploadsDir, backupsDir, env = process.env, nowIso = () => new Date().toISOString(), logger = console } = config;
  const remoteEnabled = env.NV0_BACKUP_REMOTE_ENABLED !== 'false' && ['s3','s3_compatible','object_storage'].includes(String(env.NV0_STORAGE_MODE || '').trim());
  const remotePrefix = String(env.NV0_BACKUP_REMOTE_PREFIX || 'backups/nv0').trim().replace(/^\/+|\/+$/g, '') || 'backups/nv0';
  const compress = env.NV0_BACKUP_COMPRESS !== 'false';
  const encryptionSecret = String(env.NV0_BACKUP_ENCRYPTION_SECRET || '').trim();
  const requireEncryption = env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION === 'true';
  const autoEnabled = env.NV0_AUTO_BACKUP_ENABLED === 'true' || (config.defaultAutoEnabled && env.NV0_AUTO_BACKUP_ENABLED !== 'false');
  const autoOnStartup = env.NV0_AUTO_BACKUP_ON_STARTUP !== 'false';
  const autoIntervalMs = Number(env.NV0_AUTO_BACKUP_INTERVAL_MS || 6 * 60 * 60_000);

  function securitySummary() {
    return { remoteEnabled, autoBackupEnabled: autoEnabled, autoBackupOnStartup: autoOnStartup, autoBackupIntervalMs: autoIntervalMs, remotePrefix, compressionEnabled: compress, encryptionConfigured: !!encryptionSecret, encryptionRequired: requireEncryption, objectStorage: s3CompatibleConfigSummary(env) };
  }

  async function uploadRemoteBackupObject({ key, content, contentType }) {
    if (!remoteEnabled) return { ok: false, skipped: true, reason: 'remote_backup_disabled' };
    if (!isS3CompatibleConfigured(env)) return { ok: false, skipped: true, reason: 's3_not_configured' };
    try { return { ok: true, ...(await putObjectToS3Compatible({ env, key, content, contentType })) }; }
    catch (error) { return { ok: false, error: error.message }; }
  }

  async function buildUploadsManifest() {
    const uploads = await fs.readdir(uploadsDir).catch(() => []);
    const manifest = [];
    for (const filename of uploads) {
      const full = path.join(uploadsDir, filename);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat || !stat.isFile()) continue;
      manifest.push({ filename, size: stat.size, mtime: stat.mtime.toISOString(), sha256: sha256Hex(await fs.readFile(full)) });
    }
    return manifest;
  }

  async function createSnapshot({ reason = 'manual' } = {}) {
    await fs.mkdir(backupsDir, { recursive: true });
    const createdAt = nowIso();
    const stamp = createdAt.replace(/[:.]/g, '-');
    const dbSource = path.join(dataDir, 'db.json');
    const dbTarget = path.join(backupsDir, `db-${stamp}.json`);
    const manifestTarget = path.join(backupsDir, `db-${stamp}.manifest.json`);
    const dbBuffer = await fs.readFile(dbSource);
    await fs.writeFile(dbTarget, dbBuffer);
    const uploadsManifest = await buildUploadsManifest();
    const manifest = { version: 'phase163-remote-backup-v1', createdAt, reason, local: { dbTarget, manifestTarget, dbSha256: sha256Hex(dbBuffer), dbSize: dbBuffer.length }, security: { compressed: compress, encrypted: !!encryptionSecret, encryptionAlgorithm: encryptionSecret ? 'aes-256-gcm+scrypt' : null, plaintextSha256StoredInManifest: true }, remote: { enabled: remoteEnabled, prefix: remotePrefix, db: null, manifest: null, uploadsManifest: null, errors: [] }, uploads: { localRuntimeFileCount: uploadsManifest.length, manifestSha256: sha256Hex(Buffer.from(JSON.stringify(uploadsManifest))) } };
    let remotePayload = dbBuffer;
    let remoteKey = `${remotePrefix}/db-${stamp}.json`;
    let remoteContentType = 'application/json; charset=utf-8';
    if (compress) { remotePayload = await gzipAsync(remotePayload); remoteKey += '.gz'; remoteContentType = 'application/gzip'; }
    if (encryptionSecret) { remotePayload = encryptBackupPayload(remotePayload, encryptionSecret); remoteKey += '.enc'; remoteContentType = 'application/octet-stream'; }
    const remoteDb = await uploadRemoteBackupObject({ key: remoteKey, content: remotePayload, contentType: remoteContentType });
    manifest.remote.db = remoteDb;
    if (remoteDb.ok) manifest.remote.uploadsManifest = await uploadRemoteBackupObject({ key: `${remotePrefix}/uploads-manifest-${stamp}.json`, content: Buffer.from(JSON.stringify(uploadsManifest, null, 2)), contentType: 'application/json; charset=utf-8' });
    if (!remoteDb.ok && !remoteDb.skipped) manifest.remote.errors.push(remoteDb.error || remoteDb.reason || 'remote db backup upload failed');
    let manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    await fs.writeFile(manifestTarget, manifestBuffer);
    const remoteManifest = await uploadRemoteBackupObject({ key: `${remotePrefix}/db-${stamp}.manifest.json`, content: manifestBuffer, contentType: 'application/json; charset=utf-8' });
    manifest.remote.manifest = remoteManifest;
    if (!remoteManifest.ok && !remoteManifest.skipped) manifest.remote.errors.push(remoteManifest.error || remoteManifest.reason || 'remote manifest upload failed');
    manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    await fs.writeFile(manifestTarget, manifestBuffer);
    return { dbTarget, manifestTarget, dbSha256: manifest.local.dbSha256, dbSize: dbBuffer.length, remote: manifest.remote, security: manifest.security };
  }

  async function listSnapshots() {
    await fs.mkdir(backupsDir, { recursive: true });
    const names = (await fs.readdir(backupsDir)).filter(name => name.startsWith('db-') && name.endsWith('.json') && !name.endsWith('.manifest.json')).sort().reverse();
    const items = [];
    for (const name of names) {
      const fullPath = path.join(backupsDir, name);
      const stat = await fs.stat(fullPath);
      const manifestPath = path.join(backupsDir, name.replace(/\.json$/, '.manifest.json'));
      let manifest = null;
      try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
      items.push({ name, fullPath, size: stat.size, mtime: stat.mtime.toISOString(), manifestPath: manifest ? manifestPath : null, remote: manifest?.remote || null, security: manifest?.security || null, dbSha256: manifest?.local?.dbSha256 || null });
    }
    return items;
  }

  async function pruneSnapshots(retentionCount) {
    const backups = await listSnapshots();
    const keep = Math.max(retentionCount, 1);
    const removed = [];
    for (const backup of backups.slice(keep)) {
      await fs.unlink(backup.fullPath).catch(() => {});
      if (backup.manifestPath) await fs.unlink(backup.manifestPath).catch(() => {});
      removed.push(backup.name);
    }
    return { keep, removed };
  }

  async function restoreSnapshot(name) {
    if (!/^db-[a-zA-Z0-9T:._-]+\.json$/.test(name)) throw new Error('invalid backup name');
    const source = path.join(backupsDir, name);
    const normalized = path.normalize(source);
    if (!normalized.startsWith(backupsDir)) throw new Error('invalid backup path');
    const buffer = await fs.readFile(normalized);
    const manifestPath = normalized.replace(/\.json$/, '.manifest.json');
    let expectedSha256 = null;
    try { expectedSha256 = JSON.parse(await fs.readFile(manifestPath, 'utf8'))?.local?.dbSha256 || null; } catch {}
    const actualSha256 = sha256Hex(buffer);
    if (expectedSha256 && expectedSha256 !== actualSha256) throw new Error('backup integrity check failed');
    await fs.writeFile(path.join(dataDir, 'db.json'), buffer);
    return { restoredFrom: normalized, verifiedSha256: actualSha256 };
  }

  async function runAutomatic(reason = 'scheduled') {
    if (!autoEnabled) return { ok: true, skipped: true, reason: 'auto_backup_disabled' };
    const backup = await createSnapshot({ reason });
    if (backup.remote?.db && backup.remote.db.ok === false && !backup.remote.db.skipped) logger.error('automatic backup remote upload failed', backup.remote.db.error || backup.remote.db.reason);
    return { ok: true, backup };
  }

  return { securitySummary, createSnapshot, listSnapshots, pruneSnapshots, restoreSnapshot, runAutomatic };
}
