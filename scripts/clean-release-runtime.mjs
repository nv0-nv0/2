import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.join(root, 'runtime');
const dataDir = path.join(runtimeDir, 'data');
const seedPath = path.join(dataDir, 'db.seed.json');

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(seedPath)) fs.writeFileSync(seedPath, '{}\n', { mode: 0o600 });

const removed = [];
function removeRel(rel) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) removed.push(rel);
  fs.rmSync(abs, { recursive: true, force: true });
}

for (const rel of [
  'runtime/data/db.json',
  'runtime/data/sessions.json',
  'runtime/data/secure-records',
  'runtime/uploads',
  'runtime/backups',
  'runtime/reports',
  'runtime/stress-smoke'
]) removeRel(rel);

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isDirectory() && /^runtime-test-/.test(entry.name)) removeRel(entry.name);
}

for (const rel of ['runtime/uploads', 'runtime/backups', 'runtime/reports']) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
}

console.log(JSON.stringify({
  ok: true,
  phase: 'phase322-clean-release-runtime-state-excluded',
  retained: ['runtime/data/db.seed.json'],
  removedActiveState: removed,
  note: 'Release packages must not include local runtime state or runtime-test-* directories. Server recreates local runtime files on first non-commercial JSON-mode start; commercial mode must use PostgreSQL/Redis/object storage.'
}, null, 2));
