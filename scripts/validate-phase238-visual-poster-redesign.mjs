import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, list); else list.push(p);
  }
  return list;
}
const errors = [];
const warnings = [];
const cssPath = path.join(root, 'shared', 'nv0-clean-slate-20260512.css');
const referencePath = path.join(root, 'design-preview', 'clean-slate', 'nv0-visual-reference-20260512.png');
const previewPath = path.join(root, 'design-preview', 'clean-slate', 'index.html');
if (!fs.existsSync(cssPath)) errors.push('missing shared/nv0-clean-slate-20260512.css');
if (!fs.existsSync(referencePath)) errors.push('missing visual reference image asset');
if (!fs.existsSync(previewPath)) errors.push('missing visual preview html');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const requiredCssTokens = [
  'NV0 Visual Poster Redesign System',
  '--nvo-blue:#005dff',
  '--nvo-mint:#20c997',
  '--nvo-orange:#ff9f1c',
  '--nvo-red:#ff4d4f',
  '--nvo-ink:#07111f',
  '--nvo-line:#dfe8f3',
  '--nvo-shadow-md',
  '.visual-reference-board',
  '.nv0-hero',
  '.phase218-donut',
  '@media (max-width:720px)'
];
for (const token of requiredCssTokens) if (!css.includes(token)) errors.push(`visual CSS missing token: ${token}`);
for (const retired of ['phase218-fresh-premium.css','phase230-visual-clarity-conversion.css','phase231-bright-professional-clarity.css','phase232-final-typography-card-system.css','phase233-contrast-authority-clean-system.css','nv0-phase236-emergency-clean-ui.css','base.css','design-system.css','visibility.css','unified-infographic.css']) {
  if (css.includes(retired)) errors.push(`visual CSS references retired stylesheet name: ${retired}`);
}
const htmlFiles = ['apps/public','apps/admin'].flatMap(d => walk(path.join(root, d))).filter(p => p.endsWith('index.html'));
for (const f of htmlFiles) {
  const rel = path.relative(root, f);
  const html = fs.readFileSync(f, 'utf8');
  const styles = [...html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(m => m[0]);
  if (styles.length !== 1) errors.push(`${rel}: expected exactly one stylesheet, found ${styles.length}`);
  if (!html.includes('/shared/nv0-clean-slate-20260512.css')) errors.push(`${rel}: missing visual system stylesheet`);
  if (html.includes('/apps/') && html.includes('/app.css')) errors.push(`${rel}: page app.css reference still active`);
  if (!/<body[^>]*class=["'][^"']*nv0-clean-slate/.test(html)) errors.push(`${rel}: missing nv0-clean-slate body class`);
}
const appCssFiles = walk(path.join(root, 'apps')).filter(p => p.endsWith('app.css'));
for (const f of appCssFiles) {
  const rel = path.relative(root, f);
  const content = fs.readFileSync(f, 'utf8').trim();
  if (!content.includes('Retired by PHASE237') || !content.includes('PHASE238 visual-poster redesign')) errors.push(`${rel}: app.css retirement marker missing`);
  if (content.replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0) errors.push(`${rel}: app.css contains active CSS outside retirement comment`);
}
const sharedCssFiles = walk(path.join(root, 'shared')).filter(p => p.endsWith('.css')).map(p => path.relative(root, p));
if (sharedCssFiles.length !== 1 || sharedCssFiles[0] !== 'shared/nv0-clean-slate-20260512.css') errors.push(`shared CSS must be single-source; found ${sharedCssFiles.join(', ')}`);
const cssSize = Buffer.byteLength(css, 'utf8');
if (cssSize < 16000) warnings.push(`visual CSS may be too small for full redesign coverage: ${cssSize} bytes`);
const report = {
  ok: errors.length === 0,
  phase: 'PHASE238_VISUAL_POSTER_REDESIGN',
  htmlFiles: htmlFiles.length,
  retiredPageCssFiles: appCssFiles.length,
  sharedCssFiles,
  visualReferenceIncluded: fs.existsSync(referencePath),
  previewIncluded: fs.existsSync(previewPath),
  cssSizeBytes: cssSize,
  warnings,
  errors
};
fs.writeFileSync(path.join(root, 'PHASE238_VISUAL_POSTER_REDESIGN_VALIDATION_20260512.json'), JSON.stringify(report, null, 2));
if (errors.length) { console.error(JSON.stringify(report, null, 2)); process.exit(1); }
console.log(JSON.stringify(report, null, 2));
