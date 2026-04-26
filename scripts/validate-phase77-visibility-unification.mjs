import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredTokens = ['--nv77-bg','#0B0F14','--nv77-text:#F8FAFC','--nv77-primary:#2563EB','--nv77-muted:#CBD5E1','--nv77-focus'];
const css = fs.readFileSync(path.join(root,'shared','visibility.css'),'utf8');
const checks = [];
function add(name, pass, detail='') { checks.push({ name, pass, detail }); }
for (const token of requiredTokens) add('visibility token ' + token, css.includes(token));
add('placeholder readable color', /input::placeholder,textarea::placeholder{color:#A8B3C7!important;opacity:1!important;}/.test(css));
add('focus visible ring exists', css.includes(':focus-visible') && css.includes('box-shadow:var(--nv77-focus)!important'));
add('surface text forced readable', css.includes('color:var(--nv77-text)!important;box-shadow'));
add('muted text upgraded', css.includes('color:var(--nv77-muted)!important'));
add('CTA primary contrast locked', css.includes('color:#fff!important;border-color:var(--nv77-primary)!important'));
const htmlFiles = [];
function walk(dir){ for (const name of fs.readdirSync(dir)) { const p = path.join(dir,name); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (p.endsWith('.html')) htmlFiles.push(p); } }
walk(path.join(root,'apps'));
for (const file of htmlFiles) {
  const rel = path.relative(root,file);
  const html = fs.readFileSync(file,'utf8');
  add(rel + ' loads visibility.css after app css', html.includes('/shared/visibility.css') && html.indexOf('/shared/visibility.css') > html.indexOf('rel="stylesheet" href="/apps/'));
}
const failed = checks.filter(c => !c.pass);
const summary = { score: failed.length ? 0 : 100, total: checks.length, passed: checks.length - failed.length, failed };
fs.writeFileSync(path.join(root,'docs','PHASE77_VISIBILITY_UNIFICATION_VALIDATION_20260426.json'), JSON.stringify(summary,null,2));
if (failed.length) {
  console.error('[PHASE77] visibility validation failed');
  console.error(JSON.stringify(failed,null,2));
  process.exit(1);
}
console.log('[PHASE77] visibility validation passed: 100/100');
