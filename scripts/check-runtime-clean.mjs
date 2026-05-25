import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
function list(rel) { const abs = path.join(root, rel); return fs.existsSync(abs) ? fs.readdirSync(abs).filter(name => !name.startsWith('.gitkeep')) : []; }

const runtimeExists = exists('runtime');
if (!runtimeExists) {
  console.log(JSON.stringify({ ok: true, checked: 'runtime-clean-release', mode: 'runtime-directory-absent-clean' }, null, 2));
  process.exit(0);
}

for (const rel of ['runtime/data/db.json', 'runtime/data/sessions.json']) {
  if (!exists(rel)) failures.push(`${rel} missing`);
}
try {
  if (exists('runtime/data/db.seed.json') && exists('runtime/data/db.json')) {
    const db = readJson('runtime/data/db.json');
    const seed = readJson('runtime/data/db.seed.json');
    if (JSON.stringify(db) !== JSON.stringify(seed)) failures.push('runtime/data/db.json must match db.seed.json for a clean release');
  }
  if (exists('runtime/data/sessions.json')) {
    const sessions = readJson('runtime/data/sessions.json');
    if (!Array.isArray(sessions) || sessions.length !== 0) failures.push('runtime/data/sessions.json must be an empty array');
  }
} catch (error) {
  failures.push(`runtime JSON parse failed: ${error.message}`);
}
for (const rel of ['runtime/uploads', 'runtime/backups', 'runtime/reports']) {
  const items = list(rel);
  if (items.length) failures.push(`${rel} must be empty in release package: ${items.join(', ')}`);
}
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: 'runtime-clean-release', mode: 'runtime-directory-present-clean' }, null, 2));
