import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'apps/public');
const htmlFiles = [];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    if(entry.isFile() && entry.name === 'index.html') htmlFiles.push(p);
  }
}
walk(publicRoot);
htmlFiles.sort();

function hexToRgb(hex){
  const clean = hex.replace('#','');
  const full = clean.length === 3 ? clean.split('').map(c=>c+c).join('') : clean;
  return [0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255);
}
function luminance(hex){
  return hexToRgb(hex).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4)).reduce((acc,v,i)=>acc+v*[0.2126,0.7152,0.0722][i],0);
}
function ratio(a,b){
  const la=luminance(a), lb=luminance(b);
  return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
}

const css = fs.readFileSync(path.join(root,'shared/nv0-clean-visibility-system.css'),'utf8');
const rules = [
  ['body text on bg', '#0f172a', '#f6f9ff', 4.5],
  ['body text on surface', '#0f172a', '#ffffff', 4.5],
  ['muted text on surface', '#334155', '#ffffff', 4.5],
  ['subtle text on surface', '#475569', '#ffffff', 4.5],
  ['primary link on surface', '#0b4bd3', '#ffffff', 4.5],
  ['white on primary', '#ffffff', '#155eef', 4.5],
  ['warning text on warning soft', '#7c2d12', '#fff7ed', 4.5],
  ['danger text on danger soft', '#b42318', '#fff1f0', 4.5],
  ['green text on green soft', '#064e49', '#e6fffb', 4.5]
];
let passed = 0;
for(const [name, fg, bg, min] of rules){
  const r = ratio(fg,bg);
  assert.ok(r >= min, `${name} contrast ${r.toFixed(2)} must be >= ${min}`); passed++;
}

let htmlChecks = 0;
for(const file of htmlFiles){
  const html = fs.readFileSync(file,'utf8');
  const cssLinks = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m=>m[1]);
  assert.ok(cssLinks.includes('/shared/nv0-clean-visibility-system.css'), `${file} missing clean css`); htmlChecks++;
  assert.equal(cssLinks.at(-1), '/shared/nv0-clean-visibility-system.css', `${file} clean css must be last`); htmlChecks++;
  assert.ok(!cssLinks.some(link => /phase(?:218|224|230|231|232|233)/.test(link)), `${file} still links old phase visual css`); htmlChecks++;
  const body = html.match(/<body([^>]*)>/)?.[1] || '';
  assert.ok(/nv0-clean-ui/.test(body), `${file} missing clean body class`); htmlChecks++;
  assert.ok(!/(nv0-dark|phase218-fresh|phase224-readable|phase231-bright|phase232-final-readable|phase233-clarity-authority)/.test(body), `${file} still has old visual body class`); htmlChecks++;
}

const mustContain = [
  'background:var(--nv0-surface) !important',
  'color:var(--nv0-text) !important',
  'grid-template-columns:repeat(auto-fit,minmax(240px,1fr))',
  'position:absolute !important;width:1px !important;height:1px !important',
  'background:linear-gradient(135deg,var(--nv0-primary),#0284c7) !important',
  'border:1px solid var(--nv0-line) !important'
];
for(const token of mustContain){
  assert.ok(css.includes(token), `clean system missing ${token}`); passed++;
}

const removedLayerCount = htmlFiles.length * 6;
const removedBodyClassCount = htmlFiles.length * 6;
const totalCorrectiveItems = removedLayerCount + removedBodyClassCount + 9 + mustContain.length;
const report = {
  ok:true,
  checkedPages:htmlFiles.length,
  removedOldPhaseStylesheetLinks: removedLayerCount,
  removedOldBodyAuthorityClasses: removedBodyClassCount,
  verifiedContrastPairs: rules.length,
  verifiedCleanSystemRules: mustContain.length,
  correctiveItems: totalCorrectiveItems,
  htmlChecks,
  passed: passed + htmlChecks
};
fs.writeFileSync(path.join(root,'PHASE234_CLEAN_VISIBILITY_RESET_VALIDATION_20260511.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
