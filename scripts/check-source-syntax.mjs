import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['server','scripts','tests','shared','apps'];
const DEFAULT_SOURCE_SIZE_LIMIT = Number(process.env.NV0_SOURCE_SIZE_LIMIT_BYTES || 225000);
const MONOLITH_COMPAT_LIMITS = new Map([
  ['server/index.mjs', Number(process.env.NV0_INDEX_SIZE_LIMIT_BYTES || 300000)]
]);
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
    const relPath = path.relative(ROOT, abs);
    const limit = MONOLITH_COMPAT_LIMITS.get(relPath) || DEFAULT_SOURCE_SIZE_LIMIT;
    if(stat.size > limit) failures.push({ file:relPath, error:`source file exceeds safety size limit (${stat.size}/${limit})` });
  }
}
for (const rel of dirs) walk(path.join(ROOT, rel));
console.log(JSON.stringify({ ok: failures.length === 0, checkedCount, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
process.exit(0);
