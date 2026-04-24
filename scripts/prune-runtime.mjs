import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT, 'runtime', 'backups');
const keep = Number(process.env.NV0_BACKUP_RETENTION_COUNT || 20);

await fs.mkdir(BACKUPS_DIR, { recursive: true });
const names = (await fs.readdir(BACKUPS_DIR)).filter(name => name.startsWith('db-') && name.endsWith('.json')).sort().reverse();
const removed = [];
for (const name of names.slice(Math.max(keep, 1))) {
  await fs.unlink(path.join(BACKUPS_DIR, name)).catch(() => {});
  removed.push(name);
}
console.log(JSON.stringify({ ok: true, keep, removed }, null, 2));
