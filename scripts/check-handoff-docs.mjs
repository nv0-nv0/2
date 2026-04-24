import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'docs', 'FINAL_HANDOFF_INDEX_20260423_KO.md');
const src = fs.readFileSync(indexPath, 'utf8');
const refs = [...src.matchAll(/`([^`]+)`/g)]
  .map(m => m[1])
  .filter(v => /^(docs|server|scripts|tests)\//.test(v));
const checked = [];
const errors = [];
for (const rel of refs) {
  if (fs.existsSync(path.join(root, rel))) checked.push(rel);
  else errors.push(rel);
}
console.log(JSON.stringify({ ok: errors.length === 0, referencedCount: refs.length, checked, errors }, null, 2));
if (errors.length) process.exit(1);
