import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const marker = 'PHASE71: site-wide main-page color unification';
const files = [path.join(root,'shared/base.css')];
for (const scope of ['apps/public','apps/admin']) {
  for (const dir of fs.readdirSync(path.join(root,scope))) {
    const f = path.join(root, scope, dir, 'app.css');
    if (fs.existsSync(f)) files.push(f);
  }
}
const failures=[];
for (const f of files) {
  const t=fs.readFileSync(f,'utf8');
  if (!t.includes(marker)) failures.push(`${f} missing marker`);
  for (const token of ['--nv71-bg:#0B0F14','--nv71-blue:#2563EB','--nv71-line:#273244']) {
    if (!t.includes(token)) failures.push(`${f} missing ${token}`);
  }
}
if (failures.length) { console.error(JSON.stringify({score:0,failures},null,2)); process.exit(1); }
console.log(JSON.stringify({score:100,checkedFiles:files.length,status:'phase71 main color unification passed'},null,2));
