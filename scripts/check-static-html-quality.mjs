import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const apps=path.join(root,'apps');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk(apps).filter(f=>f.endsWith('.html')); const errors=[];
for(const file of html){const t=fs.readFileSync(file,'utf8'); const rel=path.relative(root,file).replaceAll('\\','/');
 for(const [key,rx] of [['lang-ko',/<html[^>]+lang=["']ko["']/i],['viewport',/<meta[^>]+name=["']viewport["']/i],['title',/<title>[^<]+<\/title>/i],['description',/<meta[^>]+name=["']description["']/i],['skip-link',/class=["'][^"']*skip-link/i],['main-id',/<main[^>]+id=["']main["']/i]]) if(!rx.test(t)) errors.push({file:rel,error:key});
 if(rel.startsWith('apps/public/')){if(!/<link[^>]+rel=["']canonical["']/i.test(t)) errors.push({file:rel,error:'static-canonical-fallback'}); if(!/<meta[^>]+name=["']robots["']/i.test(t)) errors.push({file:rel,error:'static-robots-fallback'});}
 const h1Count=(t.match(/<h1\b/gi)||[]).length; if(h1Count!==1) errors.push({file:rel,error:'exactly-one-h1',count:h1Count});
 if(/<input\b[^>]*\/\s+(?:autocomplete|aria-|role=)/i.test(t)) errors.push({file:rel,error:'malformed-self-closing-input-attributes'});
 if(/\bstyle\s*=/i.test(t)) errors.push({file:rel,error:'inline-style'}); if(/\bon(?:click|load|error|submit|change|input)\s*=/i.test(t)) errors.push({file:rel,error:'inline-event-handler'});
}
assert.deepEqual(errors,[],JSON.stringify(errors,null,2)); console.log(JSON.stringify({ok:true,contract:'static-html-quality-v1',htmlFiles:html.length,errors},null,2));
