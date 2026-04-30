import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const composeFiles = ['docker-compose.yml', 'deploy/docker-compose.coolify.yml'];
const bulkFile = 'deploy/coolify.env.bulk.txt';

const criticalRequired = [
  'POSTGRES_PASSWORD',
  'NV0_BOOTSTRAP_ADMIN_PASSWORD',
  'NV0_ADMIN_IP_ALLOWLIST',
  'NV0_TURNSTILE_SITE_KEY',
  'NV0_TURNSTILE_SECRET',
  'NV0_S3_ENDPOINT',
  'NV0_S3_BUCKET',
  'NV0_S3_ACCESS_KEY_ID',
  'NV0_S3_SECRET_ACCESS_KEY',
  'NV0_SCAN_PROVIDER_URL',
  'NV0_SMTP_URL'
];

const optionalPrelaunchKeys = ['NV0_MAIL_ORDER_REGISTRATION_NUMBER','NV0_PORTONE_API_SECRET','NV0_PORTONE_STORE_ID','NV0_PORTONE_CHANNEL_KEY','NV0_PORTONE_WEBHOOK_SECRET'];
const forbiddenInCoolifyCompose = [
  /env_file\s*:/,
  /NV0_PAYMENT_PROVIDER\s*[:=]\s*demo/,
  /NV0_PERSISTENCE_MODE\s*[:=]\s*json/,
  /NV0_SCAN_PROVIDER\s*[:=]\s*builtin/,
  /NV0_STORAGE_MODE\s*[:=]\s*local_fs/
];

function parseBulkKeys(raw) {
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
  return { keys, seen, duplicates };
}

function extractComposeVariables(raw) {
  const vars = new Set();
  const regex = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::[-?][^}]*)?\}/g;
  let match;
  while ((match = regex.exec(raw))) vars.add(match[1]);
  return vars;
}

const errors = [];
const bulkRaw = await fs.readFile(path.join(ROOT, bulkFile), 'utf8');
const bulk = parseBulkKeys(bulkRaw);
if (bulk.duplicates.length) errors.push({ file: bulkFile, error: `duplicate keys: ${bulk.duplicates.join(', ')}` });

for (const key of [...criticalRequired, ...optionalPrelaunchKeys]) {
  if (!bulk.seen.has(key)) errors.push({ file: bulkFile, error: `missing key: ${key}` });
}

const composeReports = [];
for (const rel of composeFiles) {
  const raw = await fs.readFile(path.join(ROOT, rel), 'utf8');
  for (const pattern of forbiddenInCoolifyCompose) {
    if (pattern.test(raw)) errors.push({ file: rel, error: `forbidden pattern: ${pattern}` });
  }
  const vars = extractComposeVariables(raw);
  for (const key of criticalRequired) {
    if (!vars.has(key)) errors.push({ file: rel, error: `critical key is not UI-detectable through \${${key}}` });
    if (!raw.includes(`\${${key}:?`)) errors.push({ file: rel, error: `critical key is not marked required with :? guard: ${key}` });
  }
  if (!raw.includes('NV0_DATABASE_URL=postgres://nv0:${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in Coolify}@postgres:5432/nv0')) {
    errors.push({ file: rel, error: 'NV0_DATABASE_URL must be composed internally from postgres service and POSTGRES_PASSWORD' });
  }
  for (const key of optionalPrelaunchKeys) {
    if (!vars.has(key)) errors.push({ file: rel, error: `prelaunch optional key is not UI-detectable through \${${key}}` });
  }
  for (const key of bulk.keys) {
    if (!vars.has(key)) errors.push({ file: rel, error: `bulk env key is not referenced in compose: ${key}` });
  }
  if (!raw.includes('/readyz')) errors.push({ file: rel, error: 'readyz healthcheck missing' });
  composeReports.push({ file: rel, detectedVariables: vars.size, ok: true });
}

const report = { ok: errors.length === 0, bulkKeys: bulk.keys.length, composeReports, errors };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
