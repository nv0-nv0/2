import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];
const rel=p=>path.relative(root,p).replaceAll('\\','/'); const files=walk(root).map(rel).filter(x=>!x.startsWith('docs/current/'));
const forbidden=files.filter(x=>x==='runtime-ui'||x.startsWith('runtime-ui/')||x==='runtime/data/db.json'||x==='runtime/data/sessions.json'||x.startsWith('runtime/data/secure-records/')||x.startsWith('runtime/uploads/')||x.startsWith('runtime/backups/')||x.startsWith('runtime/reports/')||x.startsWith('runtime-test-')||x==='.DS_Store'||/\.(?:pem|key|p12|pfx)$/i.test(x));
assert.deepEqual(forbidden,[],JSON.stringify(forbidden,null,2));
assert.ok(files.includes('runtime/data/db.seed.json'),'delivery seed is required');
console.log(JSON.stringify({ok:true,contract:'delivery-hygiene-v2',files:files.length,forbiddenSnapshotRoots:['runtime-ui/'],retained:['runtime/data/db.seed.json']},null,2));
