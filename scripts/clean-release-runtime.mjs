import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.join(root, 'runtime');
const dataDir = path.join(runtimeDir, 'data');
const seedPath = path.join(dataDir, 'db.seed.json');
const dbPath = path.join(dataDir, 'db.json');
const sessionsPath = path.join(dataDir, 'sessions.json');
const secureRecordsDir = path.join(dataDir, 'secure-records');
const secureRecordsDevPath = path.join(secureRecordsDir, 'secure-records.dev.json');

fs.mkdirSync(dataDir, { recursive: true });
if (fs.existsSync(seedPath)) {
  const seed = fs.readFileSync(seedPath, 'utf8');
  fs.writeFileSync(dbPath, seed.endsWith('\n') ? seed : `${seed}\n`);
} else if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '{}\n');
}
fs.writeFileSync(sessionsPath, '[]\n');
fs.rmSync(secureRecordsDir, { recursive: true, force: true });
fs.mkdirSync(secureRecordsDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(secureRecordsDevPath, JSON.stringify({ collections: {}, metadata: { secureCollections: [], encrypted: false, cleanedAt: new Date().toISOString() }, warning: 'development mode only: set NV0_SECURE_RECORDS_KEY in production' }, null, 2) + '\n', { mode: 0o600 });
for (const rel of ['runtime/uploads', 'runtime/backups', 'runtime/reports', 'runtime/stress-smoke']) {
  fs.rmSync(path.join(root, rel), { recursive: true, force: true });
}
for (const rel of ['runtime/uploads', 'runtime/backups', 'runtime/reports']) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
}
console.log(JSON.stringify({ ok: true, cleaned: ['runtime/uploads', 'runtime/backups', 'runtime/reports', 'runtime/stress-smoke', 'runtime/data/secure-records'], resetDb: fs.existsSync(seedPath) }, null, 2));
