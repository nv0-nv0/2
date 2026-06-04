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

const fullCommercialProfiles = [
  'deploy/coolify.env.example',
  'deploy/env.production.template',
  'deploy/env.production.nv0.kr.example',
  'deploy/env.commercial.template'
];
const canonicalCommercialProfile = 'deploy/env.commercial.template';
const coolifyBulkProfile = 'deploy/coolify.env.bulk.txt';
const composeManagedBulkOmissions = new Set([
  'NV0_DATABASE_URL',
  'PGSSLMODE',
  'POSTGRES_DB',
  'POSTGRES_USER'
]);
const bootSafeCoolifyProfile = '.env.coolify.example';

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

const requiredLocalKeys = [
  'NODE_ENV',
  'HOST',
  'PORT',
  'NV0_RUNTIME_DIR',
  'NV0_PLATFORM_TARGET',
  'NV0_PAYMENT_PROVIDER',
  'NV0_ADMIN_KEY',
  'NV0_SESSION_SECRET',
  'NV0_SECURE_RECORDS_KEY',
  'NV0_PRIVACY_HASH_KEY',
  'NV0_SCAN_PROVIDER'
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
const fileKeySets = new Map();
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
    const isLocalDevelopmentExample = rel === '.env.example';
    const requiredKeys = isLocalDevelopmentExample ? requiredLocalKeys : requiredCommercialKeys;
    for (const key of requiredKeys) {
      if (!seen.has(key)) errors.push({ file: rel, error: `missing ${isLocalDevelopmentExample ? 'local development' : 'commercial'} key: ${key}` });
    }
    if (isLocalDevelopmentExample) {
      if (!raw.includes('NV0_PLATFORM_TARGET=mvp')) errors.push({ file: rel, error: 'local development example must use NV0_PLATFORM_TARGET=mvp' });
      if (!raw.includes('NV0_PAYMENT_PROVIDER=demo')) errors.push({ file: rel, error: 'local development example must default to demo payments' });
    } else {
      for (const pair of forbiddenCommercialPairs) {
        if (raw.includes(pair)) errors.push({ file: rel, error: `forbidden commercial pair: ${pair}` });
      }
      if (!raw.includes('NV0_PLATFORM_TARGET=commercial')) errors.push({ file: rel, error: 'not a commercial env file' });
    }
    if (duplicates.length) errors.push({ file: rel, error: `duplicate keys: ${duplicates.join(', ')}` });
    fileKeySets.set(rel, seen);
    checked.push({ file: rel, keyCount: keys.length, profile: isLocalDevelopmentExample ? 'local-development' : 'full-commercial', ok: true });
  } catch (error) {
    errors.push({ file: rel, error: error.message });
  }
}

const sorted = values => [...values].sort();
const difference = (left, right) => sorted([...left].filter(key => !right.has(key)));
const canonicalKeys = fileKeySets.get(canonicalCommercialProfile) || new Set();
for (const rel of fullCommercialProfiles) {
  const keys = fileKeySets.get(rel) || new Set();
  const missing = difference(canonicalKeys, keys);
  const extra = difference(keys, canonicalKeys);
  if (missing.length || extra.length) errors.push({ file: rel, error: `commercial profile key drift vs ${canonicalCommercialProfile}: missing=[${missing.join(', ')}] extra=[${extra.join(', ')}]` });
}

try {
  const raw = await fs.readFile(path.join(ROOT, coolifyBulkProfile), 'utf8');
  const keys = new Set(raw.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => line.slice(0, line.indexOf('=')).trim()));
  const missing = difference(canonicalKeys, keys);
  const extra = difference(keys, canonicalKeys);
  const unexpectedMissing = missing.filter(key => !composeManagedBulkOmissions.has(key));
  const unexpectedPresent = [...composeManagedBulkOmissions].filter(key => keys.has(key));
  if (unexpectedMissing.length || extra.length || unexpectedPresent.length || missing.length !== composeManagedBulkOmissions.size) {
    errors.push({ file: coolifyBulkProfile, error: `Coolify bulk profile drift: missing=[${missing.join(', ')}] extra=[${extra.join(', ')}] unexpectedMissing=[${unexpectedMissing.join(', ')}] unexpectedPresent=[${unexpectedPresent.join(', ')}]` });
  }
  checked.push({ file: coolifyBulkProfile, keyCount: keys.size, profile: 'coolify-bulk-compose-managed-db-omissions', omittedKeys: sorted(composeManagedBulkOmissions), ok: true });
} catch (error) {
  errors.push({ file: coolifyBulkProfile, error: error.message });
}

try {
  const raw = await fs.readFile(path.join(ROOT, bootSafeCoolifyProfile), 'utf8');
  const keys = new Set(raw.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => line.slice(0, line.indexOf('=')).trim()));
  for (const key of ['NODE_ENV', 'PORT', 'NV0_PLATFORM_TARGET', 'NV0_PUBLIC_CACHE_SECONDS', 'NV0_PUBLIC_ASSET_CACHE_SECONDS']) {
    if (!keys.has(key)) errors.push({ file: bootSafeCoolifyProfile, error: `missing boot-safe Coolify key: ${key}` });
  }
  if (!raw.includes('NV0_PUBLIC_ASSET_CACHE_SECONDS=31536000')) errors.push({ file: bootSafeCoolifyProfile, error: 'boot-safe asset cache must use 31536000 seconds for versioned assets' });
  checked.push({ file: bootSafeCoolifyProfile, keyCount: keys.size, profile: 'boot-safe-coolify-minimal', ok: true });
} catch (error) {
  errors.push({ file: bootSafeCoolifyProfile, error: error.message });
}

console.log(JSON.stringify({ ok: errors.length === 0, checked, commercialProfileParity: { canonical: canonicalCommercialProfile, profiles: fullCommercialProfiles, keyCount: canonicalKeys.size }, errors }, null, 2));
if (errors.length) process.exit(1);
