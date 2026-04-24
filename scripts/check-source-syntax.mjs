import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['server','scripts','tests','shared','apps'];
let checkedCount = 0;
const failures = [];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if(entry.isDirectory()){ walk(abs); continue; }
    if(!/\.(js|mjs|sh)$/.test(entry.name)) continue;
    checkedCount += 1;
    const stat = fs.statSync(abs);
    if(stat.size > 160000) failures.push({ file:path.relative(ROOT,abs), error:'source file exceeds safety size limit' });
  }
}
for (const rel of dirs) walk(path.join(ROOT, rel));
console.log(JSON.stringify({ ok: failures.length === 0, checkedCount, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
process.exit(0);
