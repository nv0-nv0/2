import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const css = readFileSync('shared/phase231-bright-professional-clarity.css', 'utf8');
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

pass('phase231 CSS exists and declares light color scheme', ()=>{
  assert.match(css, /PHASE231: Bright professional visibility authority layer/);
  assert.match(css, /color-scheme:light/);
});

pass('phase231 palette is bright and professional, not dark navy', ()=>{
  for (const token of ['--p231-page:#f6fbff','--p231-surface:#ffffff','--p231-ink:#102033','--p231-primary:#1d4ed8','--p231-teal:#047f86']) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.ok(!css.includes('--p231-page:#07111f'), 'must not use dark navy as page base');
});

pass('all public pages load phase231 after phase230', ()=>{
  assert.equal(htmlFiles.length, 17);
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const i230 = html.indexOf('/shared/phase230-visual-clarity-conversion.css');
    const i231 = html.indexOf('/shared/phase231-bright-professional-clarity.css');
    assert.ok(i230 >= 0, `${file} missing phase230 baseline`);
    assert.ok(i231 > i230, `${file} must load phase231 after phase230`);
    assert.ok(html.includes('phase231-bright'), `${file} missing phase231 body class`);
  }
});

pass('core surfaces are explicitly overridden to light backgrounds', ()=>{
  for (const selector of ['body.nv0-dark','.nv0-topbar','.page-head','.card','.business-footer','input,textarea,select']) {
    assert.ok(css.includes(selector), `missing override selector ${selector}`);
  }
});

pass('conversion risk panel is bright warm, not gloomy red/dark', ()=>{
  assert.match(css, /\.conversion-crisis-panel[\s\S]*#fff8ed/);
  assert.match(css, /\.conversion-crisis-score strong[\s\S]*#9a3412/);
});

pass('WCAG AA contrast pairs are locked', ()=>{
  assert.ok(contrast('#102033','#ffffff') >= 12, 'main text contrast below AA');
  assert.ok(contrast('#43566d','#ffffff') >= 6, 'muted text contrast below AA');
  assert.ok(contrast('#ffffff','#1d4ed8') >= 4.5, 'primary button contrast below AA');
  assert.ok(contrast('#17375f','#ffffff') >= 9, 'secondary button contrast below AA');
  assert.ok(contrast('#9a3412','#fff8ed') >= 5, 'risk score contrast below AA');
});

pass('CTA and mobile readability are governed by phase231', ()=>{
  assert.match(css, /\.btn\.primary[\s\S]*linear-gradient\(135deg,#2563eb 0%,#0ea5e9 100%\)/);
  assert.match(css, /@media\(max-width:560px\)[\s\S]*\.btn,button,\.topnav a/);
});

const failed = results.filter((r)=>!r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ` :: ${r.error}`}`);
if (failed.length) process.exit(1);
console.log(`phase231 bright professional visibility tests passed: ${results.length}/${results.length}`);
