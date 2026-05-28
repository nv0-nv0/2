import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const budgets = { htmlBytes: 180_000, cssBytes: 220_000, jsBytes: 260_000 };
const failures = [];
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
for (const file of walk(path.join(root, 'apps'))) {
  const rel = path.relative(root, file);
  const size = fs.statSync(file).size;
  if (rel.endsWith('.html') && size > budgets.htmlBytes) failures.push(`${rel}: ${size} > ${budgets.htmlBytes}`);
  if (rel.endsWith('.js') && size > budgets.jsBytes) failures.push(`${rel}: ${size} > ${budgets.jsBytes}`);
}
for (const file of walk(path.join(root, 'shared'))) {
  const rel = path.relative(root, file);
  const size = fs.statSync(file).size;
  if (rel.endsWith('.css') && size > budgets.cssBytes) failures.push(`${rel}: ${size} > ${budgets.cssBytes}`);
  if (rel.endsWith('.js') && size > budgets.jsBytes) failures.push(`${rel}: ${size} > ${budgets.jsBytes}`);
}
if (failures.length) {
  console.error(JSON.stringify({ ok: false, budgets, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, budgets, phase: 'phase313-performance-budget' }, null, 2));
