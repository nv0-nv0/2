import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.join(root, 'runtime');
const targets = [
  path.join(runtimeDir, 'backups'),
  path.join(runtimeDir, 'reports'),
  path.join(runtimeDir, 'uploads')
];

function cleanDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

for (const dir of targets) cleanDir(dir);

const runtimeDataDir = path.join(runtimeDir, 'data');
const seedPath = path.join(runtimeDataDir, 'db.seed.json');
const dbPath = path.join(runtimeDataDir, 'db.json');
const sessionsPath = path.join(runtimeDataDir, 'sessions.json');

fs.mkdirSync(runtimeDataDir, { recursive: true });
if (fs.existsSync(seedPath)) {
  const seed = fs.readFileSync(seedPath, 'utf8');
  fs.writeFileSync(dbPath, seed.endsWith('\n') ? seed : `${seed}\n`);
}
fs.writeFileSync(sessionsPath, '[]\n');

console.log(JSON.stringify({
  ok: true,
  cleaned: targets.map(p => path.relative(root, p)),
  restoredDbFromSeed: fs.existsSync(seedPath) ? path.relative(root, seedPath) : null,
  resetSessions: path.relative(root, sessionsPath),
  note: 'runtime/uploads, runtime/backups, runtime/reports are intentionally empty; production data must live in the nv0_runtime Docker volume.'
}, null, 2));
