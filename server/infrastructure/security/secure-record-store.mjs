import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const SECURE_COLLECTION_KEYS = [
  'customers',
  'orders',
  'subscriptions',
  'sites',
  'scans',
  'purchasedAssets',
  'paymentSessions',
  'paymentEvents',
  'webhookInbox',
  'auditLogs'
];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function emptyFor(defaultDb, key) {
  const value = defaultDb?.[key];
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') return {};
  return [];
}

function deriveKey(secret, salt) {
  return crypto.scryptSync(String(secret), String(salt || 'nv0-secure-record-store-v1'), 32);
}

function encryptedEnvelope(payload, secret, salt) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt-sha256-32',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    createdAt: new Date().toISOString()
  };
}

function decryptEnvelope(envelope, secret, salt) {
  const key = deriveKey(secret, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function redactSensitiveValue(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.includes('@')) {
    const [name, domain] = text.split('@');
    return `${name.slice(0, 2)}***@${domain || 'hidden'}`;
  }
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

export function sanitizeAuditPayload(payload = {}) {
  const blocked = new Set(['password', 'token', 'accessToken', 'authorization', 'cookie', 'rawBody', 'payload', 'email', 'buyerEmail', 'customer', 'phone', 'address']);
  if (!payload || typeof payload !== 'object') return payload;
  const out = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (blocked.has(key) || /password|token|secret|cookie|authorization|email|phone|address/i.test(key)) {
      out[key] = redactSensitiveValue(value);
      continue;
    }
    if (value && typeof value === 'object') out[key] = sanitizeAuditPayload(value);
    else out[key] = value;
  }
  return out;
}

export function splitSecureCollections(db, defaultDb = {}) {
  const secure = {};
  const publicDb = clone(db || {});
  for (const key of SECURE_COLLECTION_KEYS) {
    secure[key] = clone(publicDb[key] ?? emptyFor(defaultDb, key));
    publicDb[key] = emptyFor(defaultDb, key);
  }
  publicDb.securityStorage = {
    secureCollections: SECURE_COLLECTION_KEYS,
    separatedAt: new Date().toISOString(),
    mode: 'secure-record-store'
  };
  return { publicDb, secure };
}

export function mergeSecureCollections(publicDb, secure, defaultDb = {}) {
  const db = clone(publicDb || {});
  for (const key of SECURE_COLLECTION_KEYS) {
    const fallback = db[key] ?? emptyFor(defaultDb, key);
    db[key] = clone(secure?.[key] ?? fallback ?? emptyFor(defaultDb, key));
  }
  return db;
}

export function createSecureRecordStore({ dataDir, defaultDb = {}, env = process.env, logger = console } = {}) {
  const secureDir = path.resolve(env.NV0_SECURE_RECORDS_DIR || path.join(dataDir, 'secure-records'));
  const secret = String(env.NV0_SECURE_RECORDS_KEY || '').trim();
  const salt = String(env.NV0_SECURE_RECORDS_SALT || 'nv0-secure-record-store-v1').trim();
  const encrypted = Boolean(secret);
  const fileName = encrypted ? 'secure-records.json.enc' : 'secure-records.dev.json';
  const filePath = path.join(secureDir, fileName);

  async function ensureDir() {
    await fs.mkdir(secureDir, { recursive: true, mode: 0o700 });
  }

  async function readSecureCollections() {
    await ensureDir();
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.algorithm === 'aes-256-gcm') {
        if (!secret) throw new Error('NV0_SECURE_RECORDS_KEY is required to read encrypted secure records.');
        return decryptEnvelope(parsed, secret, salt);
      }
      return parsed?.collections || parsed || {};
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      logger.error?.('[secure-record-store] read failed', { message: error.message });
      throw error;
    }
  }

  async function writeSecureCollections(collections) {
    await ensureDir();
    const payload = { collections: {}, metadata: { secureCollections: SECURE_COLLECTION_KEYS, encrypted, writtenAt: new Date().toISOString() } };
    for (const key of SECURE_COLLECTION_KEYS) payload.collections[key] = clone(collections?.[key] ?? emptyFor(defaultDb, key));
    const body = encrypted
      ? JSON.stringify(encryptedEnvelope(payload.collections, secret, salt), null, 2)
      : JSON.stringify({ ...payload, warning: 'development mode only: set NV0_SECURE_RECORDS_KEY in production' }, null, 2);
    await fs.writeFile(filePath, body, { mode: encrypted ? 0o600 : 0o600 });
  }

  return {
    secureDir,
    filePath,
    encrypted,
    requiredInCommercial: true,
    secureCollections: SECURE_COLLECTION_KEYS,
    readSecureCollections,
    writeSecureCollections,
    split(db) { return splitSecureCollections(db, defaultDb); },
    merge(publicDb, secure) { return mergeSecureCollections(publicDb, secure, defaultDb); },
    status() {
      return {
        enabled: true,
        encrypted,
        secureDir,
        fileName,
        secureCollections: SECURE_COLLECTION_KEYS,
        productionReady: encrypted
      };
    }
  };
}
