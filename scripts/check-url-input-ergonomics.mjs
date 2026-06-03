import assert from 'node:assert/strict';
import fs from 'node:fs';
const expected = [
  ['apps/public/home/index.html','homeTargetUrl','go'],
  ['apps/public/demo/index.html','targetUrl','go'],
  ['apps/public/veridion-demo/index.html','targetUrl','go'],
  ['apps/public/checkout/index.html','targetDomain','next'],
  ['apps/public/portal/index.html','saveUrl','next'],
  ['apps/admin/orders/index.html','rescanUrl','go'],
];
const errors=[];
for(const [file,id,enterkeyhint] of expected){
 const text=fs.readFileSync(file,'utf8');
 const match=text.match(new RegExp(`<input\\b[^>]*id=["']${id}["'][^>]*>`,'i'));
 if(!match){errors.push({file,id,error:'missing-input'});continue;}
 const tag=match[0];
 for(const token of ['inputmode="url"','autocomplete="url"','autocapitalize="none"','autocorrect="off"','spellcheck="false"',`enterkeyhint="${enterkeyhint}"`]) if(!tag.includes(token)) errors.push({file,id,error:`missing ${token}`});
}
assert.deepEqual(errors,[],JSON.stringify(errors,null,2));
console.log(JSON.stringify({ok:true,contract:'url-input-ergonomics-v1',checked:expected.length,errors},null,2));
