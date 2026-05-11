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

const forbiddenCss = [
  'phase218-fresh-premium.css',
  'phase224-readable-marketing.css',
  'phase230-visual-clarity-conversion.css',
  'phase231-bright-professional-clarity.css',
  'phase232-final-typography-card-system.css',
  'phase233-contrast-authority-clean-system.css'
];
const forbiddenBodyClasses = ['nv0-dark','phase218-fresh','phase224-readable','phase231-bright','phase232-final-readable','phase233-clarity-authority'];

let passed=0;
for(const file of htmlFiles){
  const html = fs.readFileSync(file,'utf8');
  assert.match(html, /<link rel="stylesheet" href="\/shared\/nv0-clean-visibility-system\.css">/, `${file} must load clean system css`); passed++;
  for(const css of forbiddenCss){
    assert.doesNotMatch(html, new RegExp(css.replaceAll('.','\\.')), `${file} must not load accumulated ${css}`); passed++;
  }
  const body = html.match(/<body([^>]*)>/)?.[1] || '';
  assert.match(body, /class="[^"]*nv0-clean-ui[^"]*"/, `${file} body must use nv0-clean-ui`); passed++;
  for(const cls of forbiddenBodyClasses){
    assert.doesNotMatch(body, new RegExp(`\\b${cls}\\b`), `${file} body must not keep ${cls}`); passed++;
  }
  const head = html.slice(0, html.indexOf('</head>'));
  const lastStylesheet = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].at(-1)?.[1];
  assert.equal(lastStylesheet, '/shared/nv0-clean-visibility-system.css', `${file} clean CSS must be final stylesheet`); passed++;
}

const cssPath = path.join(root,'shared/nv0-clean-visibility-system.css');
const css = fs.readFileSync(cssPath,'utf8');
for(const token of ['--nv0-bg:#f6f9ff','--nv0-surface:#ffffff','--nv0-text:#0f172a','--nv0-primary:#155eef','body.nv0-clean-ui .sr-only','body.nv0-clean-ui .business-footer','body.nv0-clean-ui :where(.btn.primary,.cta']){
  assert.ok(css.includes(token), `clean CSS must contain ${token}`); passed++;
}
assert.ok(css.length > 9000, 'clean CSS must be a complete system, not a tiny override'); passed++;

console.log(JSON.stringify({ok:true, checkedHtml:htmlFiles.length, passed}, null, 2));
