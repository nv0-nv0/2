import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const requiredDbKeys = ['settings', 'orders', 'subscriptions', 'publications', 'boards', 'library', 'scans', 'sites', 'legalUpdates', 'systemItems', 'rules', 'autoFixJobs', 'guidanceDocuments', 'paymentSessions', 'auditLogs'];
const jsonFiles = [
  'package.json',
  'runtime/data/db.seed.json'
];

const results = [];
const errors = [];

async function readJson(rel) {
  const abs = path.join(ROOT, rel);
  const raw = await fs.readFile(abs, 'utf8');
  const data = JSON.parse(raw);
  results.push({ file: rel, ok: true });
  return data;
}

for (const rel of jsonFiles) {
  try {
    await fs.access(path.join(ROOT, rel));
    const data = await readJson(rel);
    if (rel.endsWith('db.json')) {
      for (const key of requiredDbKeys) {
        if (!(key in data)) {
          errors.push({ file: rel, error: `missing db key: ${key}` });
        }
      }
    }
    if (rel.endsWith('db.seed.json') && (!data || typeof data !== 'object' || Array.isArray(data))) {
      errors.push({ file: rel, error: 'db.seed.json must be a JSON object; an empty object is a valid clean delivery seed' });
    }
    if (rel.endsWith('sessions.json') && !Array.isArray(data)) {
      errors.push({ file: rel, error: 'sessions.json must be an array' });
    }
  } catch (error) {
    errors.push({ file: rel, error: error.message });
  }
}

const dirsToCheck = ['apps/public', 'apps/admin', 'server', 'shared', 'scripts', 'tests'];
for (const rel of dirsToCheck) {
  try {
    const stat = await fs.stat(path.join(ROOT, rel));
    if (!stat.isDirectory()) errors.push({ file: rel, error: 'expected directory' });
    else results.push({ file: rel, ok: true, type: 'dir' });
  } catch (error) {
    errors.push({ file: rel, error: error.message });
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, checked: results, errors }, null, 2));
if (errors.length) process.exit(1);
process.exit(0);
