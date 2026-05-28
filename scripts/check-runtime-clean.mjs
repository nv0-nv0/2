import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function list(rel) { const abs = path.join(root, rel); return fs.existsSync(abs) ? fs.readdirSync(abs).filter(name => !name.startsWith('.gitkeep')) : []; }

const runtimeTestDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^runtime-test-/.test(entry.name))
  .map(entry => entry.name)
  .sort();
if (runtimeTestDirs.length) failures.push(`runtime-test directories must not be included in the delivery ZIP: ${runtimeTestDirs.join(', ')}`);

if (!exists('runtime')) {
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: 'runtime-clean-release', mode: 'runtime-directory-absent-clean', phase: 'phase322' }, null, 2));
  process.exit(0);
}
if (!exists('runtime/data/db.seed.json')) failures.push('runtime/data/db.seed.json must remain as the only shippable seed state');
for (const rel of ['runtime/data/db.json', 'runtime/data/sessions.json', 'runtime/data/secure-records']) {
  if (exists(rel)) failures.push(`${rel} must not be included in the delivery ZIP`);
}
for (const rel of ['runtime/uploads', 'runtime/backups', 'runtime/reports']) {
  const items = list(rel);
  if (items.length) failures.push(`${rel} must be empty in release package: ${items.join(', ')}`);
}
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: 'runtime-clean-release', mode: 'active-runtime-state-and-runtime-test-excluded', phase: 'phase322' }, null, 2));
