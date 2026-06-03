import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const dir = path.join(root, 'docs/current');
fs.mkdirSync(dir, { recursive: true });
const removed = [];
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (entry.name === '.gitkeep') continue;
  fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
  removed.push(entry.name);
}
const gitkeep = path.join(dir, '.gitkeep');
if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');
console.log(JSON.stringify({ ok: true, contract: 'current-audit-evidence-clean-v1', removed, retained: ['docs/current/.gitkeep'] }, null, 2));
