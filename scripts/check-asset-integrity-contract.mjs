import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const version='2.7.0';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const htmlFiles=walk(path.join(root,'apps')).filter(f=>f.endsWith('.html')); const errors=[]; let refs=0;
for(const file of htmlFiles){const text=fs.readFileSync(file,'utf8'); const matches=[...text.matchAll(/(?:href|src)=["'](\/(?:shared|apps)\/[^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)]; for(const [,url] of matches){refs++; if(!new URL(url,'https://nv0.kr').searchParams.get('v')) errors.push({file:path.relative(root,file),url,error:'local asset missing release version'});}}
const publicHtml=htmlFiles.filter(file=>file.includes(path.join('apps','public'))); let publicNavPages=0;
for(const file of publicHtml){const text=fs.readFileSync(file,'utf8'); if(!text.includes('class="vr-topbar"')) continue; publicNavPages++; const rel=path.relative(root,file); for(const [href,label] of [['/plans','요금제'],['/products/veridion/demo','진단'],['/board','인사이트'],['/portal','고객 포털']]){const pattern=new RegExp(`<a\\b[^>]*href=\"${href.replace(/\//g,'\\/')}\"[^>]*>${label}<\\/a>`); if(!pattern.test(text)) errors.push({file:rel,href,label,error:'public navigation label or route mismatch'});}}
const server=fs.readFileSync(path.join(root,'server/index.mjs'),'utf8');
assert.match(server,/static-versioned/); assert.match(server,/static-unversioned/); assert.match(server,/immutable/);
assert.equal(errors.length,0,JSON.stringify(errors,null,2));
console.log(JSON.stringify({ok:true,contract:'asset-integrity-contract',htmlFiles:htmlFiles.length,versionedRefs:refs,publicNavPages,releaseVersion:version},null,2));