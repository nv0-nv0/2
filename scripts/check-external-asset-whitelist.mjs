import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roots=['apps','shared'];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=roots.flatMap((dir)=>walk(path.join(root,dir))).filter((file)=>/\.(?:html|js|css)$/.test(file));
const allowedRemoteAssets=new Set(['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit']);
const findings=[];
function record(rel,url,kind){ if(url.startsWith('https://nv0.kr')) return; if(allowedRemoteAssets.has(url)) return; findings.push({file:rel,url,kind}); }
for(const file of files){
  const rel=path.relative(root,file).replaceAll('\\','/'); const text=fs.readFileSync(file,'utf8');
  if(file.endsWith('.html')) for(const match of text.matchAll(/<(?:script|link|img|source|video|audio)\b[^>]*(?:src|href)=["'](https?:\/\/[^"']+)["']/gi)) record(rel,match[1],'html-asset');
  if(file.endsWith('.css')) for(const match of text.matchAll(/url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi)) record(rel,match[1],'css-url');
  if(file.endsWith('.js')) for(const match of text.matchAll(/(?:\.src\s*=|import\s*\(|from\s+)[\s]*["'`](https?:\/\/[^"'`]+)["'`]/gi)) record(rel,match[1],'js-loader');
}
assert.deepEqual(findings,[],JSON.stringify(findings,null,2));
console.log(JSON.stringify({ok:true,contract:'external-asset-whitelist-v2',files:files.length,allowedRemoteAssets:[...allowedRemoteAssets],findings},null,2));
