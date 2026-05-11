import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
function walk(dir, list = []) { if (!fs.existsSync(dir)) return list; for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, ent.name); if (ent.isDirectory()) walk(p, list); else list.push(p); } return list; }
const clean = '/shared/nv0-clean-slate-20260512.css';
const htmlFiles = ['apps/public','apps/admin'].flatMap(d => walk(path.join(root,d))).filter(p => p.endsWith('index.html'));
const errors = [];
if (!fs.existsSync(path.join(root, 'shared/nv0-clean-slate-20260512.css'))) errors.push('missing clean-slate css');
if (!fs.existsSync(path.join(root, 'design-preview/clean-slate/index.html'))) errors.push('missing standalone preview');
for (const f of htmlFiles) {
  const rel = path.relative(root, f);
  const s = fs.readFileSync(f, 'utf8');
  const styles = [...s.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(m => m[0]);
  if (styles.length !== 1) errors.push(`${rel}: expected exactly one stylesheet, found ${styles.length}`);
  if (!s.includes(clean)) errors.push(`${rel}: missing clean-slate stylesheet`);
  if (!/<body[^>]*class=["'][^"']*nv0-clean-slate/.test(s)) errors.push(`${rel}: missing nv0-clean-slate body class`);
  for (const bad of ['phase218-fresh-premium.css','phase224-readable-marketing.css','phase230-visual-clarity-conversion.css','phase231-bright-professional-clarity.css','phase232-final-typography-card-system.css','phase233-contrast-authority-clean-system.css','nv0-phase236-emergency-clean-ui.css','base.css','design-system.css','visibility.css','unified-infographic.css']) {
    if (s.includes(bad)) errors.push(`${rel}: still references retired ${bad}`);
  }
}
const appCss = walk(path.join(root, 'apps')).filter(p => p.endsWith('app.css'));
for (const f of appCss) {
  const s = fs.readFileSync(f, 'utf8').trim();
  if (!s.includes('Retired by PHASE237')) errors.push(`${path.relative(root,f)}: page css not retired`);
}
const sharedCss = walk(path.join(root, 'shared')).filter(p => p.endsWith('.css')).map(p => path.relative(root,p));
if (sharedCss.length !== 1 || sharedCss[0] !== 'shared/nv0-clean-slate-20260512.css') errors.push(`shared css must contain only clean-slate file; found ${sharedCss.join(', ')}`);
const css = fs.readFileSync(path.join(root, 'shared/nv0-clean-slate-20260512.css'), 'utf8');
for (const token of ['--nv0-ink','#0B1220','--nv0-blue','#245BFF','--nv0-rose','#E11D48','@media (max-width:720px)']) if (!css.includes(token)) errors.push(`clean css missing token ${token}`);
const report = { ok: errors.length === 0, htmlFiles: htmlFiles.length, retiredPageCssFiles: appCss.length, sharedCss, errors };
fs.writeFileSync(path.join(root, 'PHASE237_CLEAN_SLATE_REDESIGN_VALIDATION_20260512.json'), JSON.stringify(report, null, 2));
if (errors.length) { console.error(JSON.stringify(report, null, 2)); process.exit(1); }
console.log(JSON.stringify(report, null, 2));
