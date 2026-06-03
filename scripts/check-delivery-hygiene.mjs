import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const normalize = value => value.replaceAll('\\', '/');
const rel = abs => normalize(path.relative(root, abs));
const excludedEvidence = value => value === 'docs/current' || value.startsWith('docs/current/');
const sensitiveExtensions = ['.pem','.key','.p12','.pfx','.jks','.keystore','.sqlite','.sqlite3','.db','.bak','.dump','.sql.gz'];
function hasSensitiveExtension(value) {
  const lower = value.toLowerCase();
  return sensitiveExtensions.some(extension => lower.endsWith(extension));
}
function walk(dir, entries = []) {
  if (!fs.existsSync(dir)) return entries;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const value = rel(abs);
    if (excludedEvidence(value)) continue;
    const stat = fs.lstatSync(abs);
    entries.push({ path: value, type: stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : 'file' });
    if (stat.isDirectory() && !stat.isSymbolicLink()) walk(abs, entries);
  }
  return entries;
}
const entries = walk(root);
const files = entries.filter(entry => entry.type === 'file').map(entry => entry.path);
const symlinks = entries.filter(entry => entry.type === 'symlink').map(entry => entry.path);
const forbidden = files.filter(value =>
  value === 'runtime/data/db.json' || value === 'runtime/data/sessions.json' || value === 'runtime-ui' || value.startsWith('runtime-ui/') ||
  value.startsWith('runtime/data/secure-records/') || value.startsWith('runtime/uploads/') || value.startsWith('runtime/backups/') ||
  value.startsWith('runtime/reports/') || value.startsWith('runtime-test-') || value === '.DS_Store' || hasSensitiveExtension(value)
);
assert.deepEqual(symlinks, [], `delivery must not contain symlinks: ${JSON.stringify(symlinks, null, 2)}`);
assert.deepEqual(forbidden, [], JSON.stringify(forbidden, null, 2));
assert.ok(files.includes('runtime/data/db.seed.json'), 'delivery seed is required');
console.log(JSON.stringify({ ok: true, contract: 'delivery-hygiene-v3', files: files.length, symlinks: symlinks.length, forbiddenSnapshotRoots: ['runtime-ui/'], sensitiveExtensions, retained: ['runtime/data/db.seed.json'] }, null, 2));
