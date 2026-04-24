import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backupsDir = path.join(root, 'runtime', 'backups');
const dataFile = path.join(root, 'runtime', 'data', 'db.json');

const names = (await fs.readdir(backupsDir)).filter(name => name.startsWith('db-') && name.endsWith('.json')).sort();
if (!names.length) {
  console.error('No backup files found in runtime/backups');
  process.exit(1);
}
const latest = names[names.length - 1];
await fs.copyFile(path.join(backupsDir, latest), dataFile);
console.log(`restored ${latest} -> runtime/data/db.json`);
