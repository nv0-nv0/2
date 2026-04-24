import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checked = [];
const failures = [];
for (const area of ['apps/public', 'apps/admin']) {
  for (const entry of fs.readdirSync(path.join(root, area), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsPath = path.join(root, area, entry.name, 'app.js');
    if (!fs.existsSync(jsPath)) continue;
    const rel = path.relative(root, jsPath);
    const src = fs.readFileSync(jsPath, 'utf8');
    checked.push(rel);
    if (/console\.(log|debug)\s*\(/.test(src)) failures.push(rel);
  }
}
console.log(JSON.stringify({ ok: failures.length === 0, checkedCount: checked.length, checked, failures }, null, 2));
if (failures.length) process.exit(1);
process.exit(0);
