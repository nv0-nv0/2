import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const h=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const groups=[['apps/public/demo/index.html','apps/public/veridion-demo/index.html'],['apps/public/service/app.js','apps/public/solutions/app.js'],['deploy/postgres/schema.sql','deploy/postgres/migrations/V001__initial_schema.sql']];
for(const group of groups) assert.equal(h(group[0]),h(group[1]),`compatibility copies diverged: ${group.join(' <> ')}`);
console.log(JSON.stringify({ok:true,contract:'compatibility-copy-sync-v1',groups},null,2));
