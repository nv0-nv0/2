import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const roots=['apps','server','shared'];
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];
const offenders=[]; for(const base of roots) for(const file of walk(path.join(root,base))){if(!/\.(?:mjs|js|html|css)$/.test(file))continue; const t=fs.readFileSync(file,'utf8'); if(/\bp(?:152|153|208)(?:-|\b)/i.test(t)||/Admin Only|VERIDION Admin/.test(t)) offenders.push(path.relative(root,file).replaceAll('\\','/'));}
assert.deepEqual(offenders,[],JSON.stringify(offenders,null,2)); console.log(JSON.stringify({ok:true,contract:'semantic-identifiers-v1',checkedRoots:roots,offenders},null,2));
