import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const envFiles = [
  '.env.example',
  'deploy/coolify.env.example',
  'deploy/env.production.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.commercial.template'
];

const requiredCommercialKeys = [
  'NODE_ENV',
  'PORT',
  'NV0_PLATFORM_TARGET',
  'NV0_ADMIN_AUTH_MODE',
  'NV0_BOOTSTRAP_ADMIN_EMAIL',
  'NV0_BOOTSTRAP_ADMIN_PASSWORD',
  'NV0_PERSISTENCE_MODE',
  'NV0_DATABASE_URL',
  'NV0_REDIS_URL',
  'NV0_SESSION_STORE',
  'NV0_RATE_LIMIT_STORE',
  'NV0_LOCK_PROVIDER',
  'NV0_STORAGE_MODE',
  'NV0_S3_ENDPOINT',
  'NV0_S3_BUCKET',
  'NV0_SCAN_PROVIDER',
  'NV0_SCAN_PROVIDER_URL',
  'NV0_PAYMENT_PROVIDER',
  'NV0_PORTONE_API_SECRET',
  'NV0_PORTONE_STORE_ID',
  'NV0_PORTONE_CHANNEL_KEY',
  'NV0_PORTONE_WEBHOOK_SECRET',
  'NV0_PORTONE_WEBHOOK_VERIFY_MODE'
];

const forbiddenCommercialPairs = [
  'NV0_ADMIN_KEY=',
  'NV0_PAYMENT_PROVIDER=demo',
  'NV0_PERSISTENCE_MODE=json',
  'NV0_SESSION_STORE=memory',
  'NV0_RATE_LIMIT_STORE=memory',
  'NV0_LOCK_PROVIDER=memory',
  'NV0_STORAGE_MODE=local_fs'
];

const errors = [];
const checked = [];
for (const rel of envFiles) {
  const abs = path.join(ROOT, rel);
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const keys = [];
    const seen = new Set();
    const duplicates = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
      keys.push(key);
    }
    for (const key of requiredCommercialKeys) {
      if (!seen.has(key)) errors.push({ file: rel, error: `missing commercial key: ${key}` });
    }
    for (const pair of forbiddenCommercialPairs) {
      if (raw.includes(pair)) errors.push({ file: rel, error: `forbidden commercial pair: ${pair}` });
    }
    if (!raw.includes('NV0_PLATFORM_TARGET=commercial')) errors.push({ file: rel, error: 'not a commercial env file' });
    if (duplicates.length) errors.push({ file: rel, error: `duplicate keys: ${duplicates.join(', ')}` });
    checked.push({ file: rel, keyCount: keys.length, ok: true });
  } catch (error) {
    errors.push({ file: rel, error: error.message });
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, checked, errors }, null, 2));
if (errors.length) process.exit(1);
