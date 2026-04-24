import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const runtimeDir = path.join(ROOT, 'runtime');
const dataDir = path.join(runtimeDir, 'data');
const uploadsDir = path.join(runtimeDir, 'uploads');
const backupsDir = path.join(runtimeDir, 'backups');

await fs.mkdir(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const snapshotDir = path.join(backupsDir, `snapshot-${stamp}`);
await fs.mkdir(snapshotDir, { recursive: true });
await fs.copyFile(path.join(dataDir, 'db.json'), path.join(snapshotDir, 'db.json'));

const uploads = await fs.readdir(uploadsDir).catch(() => []);
const manifest = [];
for (const filename of uploads) {
  const full = path.join(uploadsDir, filename);
  const stat = await fs.stat(full);
  manifest.push({ filename, size: stat.size, mtime: stat.mtime.toISOString() });
}
await fs.writeFile(path.join(snapshotDir, 'uploads-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(snapshotDir);
