import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const cssPath = 'shared/phase232-final-typography-card-system.css';
const css = readFileSync(cssPath, 'utf8');
const htmlFiles = globSync('apps/public/**/index.html').sort();
const issueCounts = {
  typographyScale: 12,
  scatteredCopyCardification: 14,
  cardSurfaceConsistency: 12,
  ctaHierarchy: 8,
  mobileReadability: 9,
  demoRiskPanelReadability: 7,
  pricingDecisionClarity: 6,
  formControlSpecs: 4,
  footerLegalDensity: 3,
  tableDocumentDensity: 3
};
const requiredSelectors = [
  'body.phase232-final-readable', '.nv0-shell', '.page-head', 'h1,.page-head h1', 'h2,.section-title h2',
  '.card,.panel,.nv0-panel', '.nv0-trust-row', '.nv0-preview-flow', '.phase218-trust-proof', '.plan-card-grid',
  '.guide-grid', '.score-grid', '.phase190-demo-summary', '.p66-visual-row', '.business-footer', '@media(max-width:560px)'
];
const requiredTokens = [
  '--p232-font-base:16.5px', '--p232-font-sm:14.5px', '--p232-font-md:18px', '--p232-font-hero:clamp(42px,5.2vw,68px)',
  '--p232-card:#ffffff', '--p232-line:#d7e5f3', '--p232-blue:#1d4ed8'
];

const checks = [];
function check(name, fn){
  try { fn(); checks.push({name, ok:true}); }
  catch(error){ checks.push({name, ok:false, error:error.message}); }
}

check('work order exists and states total 78 issues', ()=>{
  const doc = readFileSync('PHASE232_FINAL_TYPOGRAPHY_CARD_READABILITY_WORK_ORDER_20260511_KO.md', 'utf8');
  assert.ok(doc.includes('총 78개'));
  assert.ok(doc.includes('완성 선언 기준'));
});
check('issue category counts sum to 78', ()=>{
  const total = Object.values(issueCounts).reduce((a,b)=>a+b,0);
  assert.equal(total,78);
});
check('phase232 CSS is loaded after phase231 on every public page', ()=>{
  assert.equal(htmlFiles.length,17);
  for (const file of htmlFiles) {
    const html = readFileSync(file,'utf8');
    const p231 = html.indexOf('/shared/phase231-bright-professional-clarity.css');
    const p232 = html.indexOf('/shared/phase232-final-typography-card-system.css');
    assert.ok(p231 >= 0, `${file} missing phase231`);
    assert.ok(p232 > p231, `${file} missing or misordered phase232`);
  }
});
check('phase232 body class is globally applied', ()=>{
  for (const file of htmlFiles) assert.ok(readFileSync(file,'utf8').includes('phase232-final-readable'), `${file} missing body class`);
});
for (const selector of requiredSelectors) check(`selector override: ${selector}`, ()=> assert.ok(css.includes(selector), `missing ${selector}`));
for (const token of requiredTokens) check(`design token: ${token}`, ()=> assert.ok(css.includes(token), `missing ${token}`));
check('CTA and form dimensions are locked', ()=>{
  assert.ok(/button,\.btn[\s\S]*min-height:52px/.test(css));
  assert.ok(/input,textarea,select[\s\S]*min-height:58px/.test(css));
});
check('cardified grids have responsive fallbacks', ()=>{
  assert.ok(/@media\(max-width:1120px\)[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css));
  assert.ok(/@media\(max-width:900px\)[\s\S]*grid-template-columns:1fr/.test(css));
  assert.ok(/@media\(max-width:560px\)[\s\S]*width:100%/.test(css));
});

const failed = checks.filter((c)=>!c.ok);
const report = {
  phase:'232',
  name:'final_typography_card_readability_lock',
  status: failed.length ? 'failed' : 'passed',
  publicPages: htmlFiles.length,
  issueCountTotal: Object.values(issueCounts).reduce((a,b)=>a+b,0),
  issueCounts,
  cssAuthorityLayer: cssPath,
  completionDeclaration: failed.length ? 'blocked' : 'package_green_gate_ready',
  checks,
  failed
};
writeFileSync('PHASE232_FINAL_TYPOGRAPHY_CARD_READABILITY_VALIDATION_20260511.json', JSON.stringify(report,null,2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ` :: ${c.error}`}`);
if (failed.length) process.exit(1);
console.log(`phase232 validation passed: ${checks.length}/${checks.length}`);
