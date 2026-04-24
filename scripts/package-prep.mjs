import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'runtime', 'backups'),
  path.join(root, 'runtime', 'reports'),
  path.join(root, 'runtime', 'uploads')
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const gitkeep = path.join(dir, '.gitkeep');
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');
}

for (const dir of targets) {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === '.gitkeep') continue;
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }
  ensureDir(dir);
}

const runtimeDataDir = path.join(root, 'runtime', 'data');
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
  cleaned: targets,
  restoredDbFromSeed: fs.existsSync(seedPath) ? seedPath : null,
  resetSessions: sessionsPath
}, null, 2));
