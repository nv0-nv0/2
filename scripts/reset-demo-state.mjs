import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.resolve(process.env.NV0_RUNTIME_DIR || path.join(root, 'runtime'));
const runtimeDataDir = path.join(runtimeDir, 'data');
const seedPath = path.join(root, 'runtime', 'data', 'db.seed.json');
const dbPath = path.join(runtimeDataDir, 'db.json');
const sessionsPath = path.join(runtimeDataDir, 'sessions.json');

fs.mkdirSync(runtimeDataDir, { recursive: true });
if (!fs.existsSync(seedPath)) {
  throw new Error(`Missing seed file: ${seedPath}`);
}
const seed = fs.readFileSync(seedPath, 'utf8');
fs.writeFileSync(dbPath, seed.endsWith('\n') ? seed : `${seed}\n`);
fs.writeFileSync(sessionsPath, '[]\n');

console.log(JSON.stringify({
  ok: true,
  restored: dbPath,
  seed: seedPath,
  resetSessions: sessionsPath
}, null, 2));
