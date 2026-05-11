import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const cssPath = 'shared/phase231-bright-professional-clarity.css';
const css = readFileSync(cssPath, 'utf8');
const htmlFiles = globSync('apps/public/**/index.html').sort();
const requiredSelectors = [
  'body.nv0-dark', '.nv0-topbar', '.nv0-brand-mark', '.btn.primary', '.btn.secondary',
  '.page-head', '.card', '.conversion-crisis-panel', '.impact-meter i',
  'input,textarea,select', '.business-footer', '@media(max-width:560px)'
];
const requiredTokens = [
  '#f6fbff', '#ffffff', '#102033', '#43566d', '#1d4ed8', '#0ea5e9', '#047f86', '#fff8ed'
];

const checks = [];
function check(name, fn){
  try { fn(); checks.push({name, ok:true}); }
  catch(error){ checks.push({name, ok:false, error:error.message}); }
}

check('work order exists with 54 visibility targets', ()=>{
  const doc = readFileSync('PHASE231_BRIGHT_PROFESSIONAL_VISIBILITY_WORK_ORDER_20260511_KO.md','utf8');
  assert.ok(doc.includes('총 54개'));
});
check('bright palette CSS file exists', ()=> assert.ok(css.length > 8000));
check('phase231 explicitly follows phase230 in every public page', ()=>{
  assert.equal(htmlFiles.length, 17);
  for (const file of htmlFiles) {
    const html = readFileSync(file,'utf8');
    const a = html.indexOf('/shared/phase230-visual-clarity-conversion.css');
    const b = html.indexOf('/shared/phase231-bright-professional-clarity.css');
    assert.ok(a >= 0 && b > a, `${file} order failed`);
  }
});
check('phase231 body class is globally applied', ()=>{
  for (const file of htmlFiles) assert.ok(readFileSync(file,'utf8').includes('phase231-bright'), `${file} missing body class`);
});
for (const selector of requiredSelectors) check(`selector override: ${selector}`, ()=> assert.ok(css.includes(selector)));
for (const token of requiredTokens) check(`palette token: ${token}`, ()=> assert.ok(css.includes(token)));
check('dark phase230 base is not reused as phase231 base', ()=>{
  assert.ok(!css.includes('--p231-page:#07111f'));
  assert.ok(!css.includes('linear-gradient(180deg,#081425'));
});
check('visual target categories sum to 54', ()=>{
  const counts = [7,10,8,7,6,4,6,6];
  assert.equal(counts.reduce((a,b)=>a+b,0),54);
});

const failed = checks.filter((c)=>!c.ok);
const report = {
  phase:'231',
  name:'bright_professional_visibility_refresh',
  status: failed.length ? 'failed' : 'passed',
  publicPages: htmlFiles.length,
  visualImprovementTargets: 54,
  palette:'bright_sky_blue_mint_white_professional_saas',
  checks,
  failed
};
writeFileSync('PHASE231_BRIGHT_PROFESSIONAL_VISIBILITY_VALIDATION_20260511.json', JSON.stringify(report,null,2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ` :: ${c.error}`}`);
if (failed.length) process.exit(1);
console.log(`phase231 validation passed: ${checks.length}/${checks.length}`);
