import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const cssPath = 'shared/phase232-final-typography-card-system.css';
const css = readFileSync(cssPath, 'utf8');
const htmlFiles = globSync('apps/public/**/index.html').sort();

function hexToRgb(hex){
  const clean = hex.replace('#','');
  const full = clean.length === 3 ? clean.split('').map((c)=>c+c).join('') : clean;
  const n = Number.parseInt(full,16);
  return [(n>>16)&255,(n>>8)&255,n&255].map((v)=>v/255);
}
function srgbToLinear(v){return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4;}
function luminance(hex){
  const [r,g,b]=hexToRgb(hex).map(srgbToLinear);
  return 0.2126*r+0.7152*g+0.0722*b;
}
function contrast(a,b){
  const [l1,l2]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (l1+0.05)/(l2+0.05);
}

const results = [];
function pass(name, fn){
  try { fn(); results.push({name, ok:true}); }
  catch(error){ results.push({name, ok:false, error:error.message}); }
}

pass('phase232 authority CSS exists and declares final readability objective', ()=>{
  assert.match(css, /PHASE232: Final typography, card hierarchy, and readability authority layer/);
  assert.ok(css.length > 15000, 'phase232 CSS must be a full authority layer, not a token patch');
});

pass('all public pages load phase232 after phase231 and opt into final readable body class', ()=>{
  assert.equal(htmlFiles.length, 17);
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const i231 = html.indexOf('/shared/phase231-bright-professional-clarity.css');
    const i232 = html.indexOf('/shared/phase232-final-typography-card-system.css');
    assert.ok(i231 >= 0, `${file} missing phase231 baseline`);
    assert.ok(i232 > i231, `${file} must load phase232 after phase231`);
    assert.ok(html.includes('phase232-final-readable'), `${file} missing phase232 final body class`);
  }
});

pass('final typography scale locks body, hero, section, card, and helper text sizes', ()=>{
  for (const token of [
    '--p232-font-base:16.5px',
    '--p232-font-sm:14.5px',
    '--p232-font-md:18px',
    '--p232-font-2xl:clamp(28px,3.2vw,40px)',
    '--p232-font-hero:clamp(42px,5.2vw,68px)'
  ]) assert.ok(css.includes(token), `missing ${token}`);
  assert.match(css, /body[\s\S]*font-size:var\(--p232-font-base\)/);
  assert.match(css, /h1,[\s\S]*font-size:var\(--p232-font-hero\)/);
  assert.match(css, /h2,[\s\S]*font-size:var\(--p232-font-2xl\)/);
  assert.match(css, /small,[\s\S]*font-size:var\(--p232-font-sm\)/);
});

pass('cardification covers scattered copy groups across home, plans, demo, portal, and service pages', ()=>{
  for (const selector of [
    '.nv0-trust-row', '.nv0-preview-flow', '.phase218-trust-proof', '.phase218-infographic-grid',
    '.phase218-plan-insight', '.revenue-proof-strip', '.plan-card-grid', '.guide-grid', '.score-grid',
    '.nv0-faq-grid', '.phase190-demo-summary', '.p66-visual-row', '.service-output-grid', '.phase209-acceptance-grid', '.nv191-action-grid'
  ]) assert.ok(css.includes(selector), `missing cardify selector ${selector}`);
});

pass('surface system overrides every older dark or low-contrast card class', ()=>{
  for (const selector of ['.card', '.panel', '.nv0-panel', '.result-card', '.clean-plan-card', '.phase218-card', '.business-footer']) {
    assert.ok(css.includes(selector), `missing surface selector ${selector}`);
  }
  assert.match(css, /background:linear-gradient\(180deg,#ffffff 0%,#fbfdff 100%\)/);
  assert.match(css, /border:1px solid var\(--p232-line\)/);
});

pass('CTA, form, and mobile tap sizes are large enough for production use', ()=>{
  assert.match(css, /button,\.btn[\s\S]*min-height:52px/);
  assert.match(css, /input,textarea,select[\s\S]*min-height:58px/);
  assert.match(css, /\.nv0-nav a,[\s\S]*min-height:46px/);
  assert.match(css, /@media\(max-width:560px\)[\s\S]*\.btn,button,\.topnav a/);
});

pass('contrast pairs satisfy or exceed WCAG AA for normal text and controls', ()=>{
  assert.ok(contrast('#0b1f3a','#ffffff') >= 14, 'main ink contrast too low');
  assert.ok(contrast('#4f637a','#ffffff') >= 5.5, 'muted text contrast too low');
  assert.ok(contrast('#ffffff','#2563eb') >= 4.5, 'primary button contrast too low');
  assert.ok(contrast('#18375b','#ffffff') >= 9, 'secondary button contrast too low');
  assert.ok(contrast('#8a3d05','#fff7ed') >= 6, 'warning pill contrast too low');
});

pass('work order states full re-audit count and declaration criteria', ()=>{
  const doc = readFileSync('PHASE232_FINAL_TYPOGRAPHY_CARD_READABILITY_WORK_ORDER_20260511_KO.md', 'utf8');
  assert.ok(doc.includes('총 78개'), 'work order must state total issue count');
  assert.ok(doc.includes('완성 선언 기준'), 'work order must define completion declaration criteria');
});

const failed = results.filter((r)=>!r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ` :: ${r.error}`}`);
if (failed.length) process.exit(1);
console.log(`phase232 typography/card readability tests passed: ${results.length}/${results.length}`);
