import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const cssPath = path.join(root, 'shared/visibility.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
add('visibility.css exists', css.length > 100);
add('phase77 marker present', css.includes('PHASE77') || css.includes('--nv77'));
add('primary text readable', css.includes('#F8FAFC') || css.includes('var(--nv77-text)'));
add('placeholder readable color', css.includes('input::placeholder') || css.includes('textarea::placeholder'));
const htmlFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(path.join(root, 'apps'));
for (const file of htmlFiles) {
  const rel = path.relative(root, file).replaceAll('\\\\','/');
  const html = fs.readFileSync(file, 'utf8');
  add(`${rel} loads visibility.css`, html.includes('/shared/visibility.css'));
}
const failed = checks.filter(c => !c.pass);
const summary = { phase: 77, score: failed.length ? 0 : 100, total: checks.length, passed: checks.length - failed.length, failed };
fs.writeFileSync(path.join(root, 'docs/PHASE77_VISIBILITY_UNIFICATION_VALIDATION_20260426.json'), JSON.stringify(summary, null, 2));
if (failed.length) { console.error(JSON.stringify(summary, null, 2)); process.exit(1); }
console.log('[PHASE77] visibility validation passed: 100/100');
process.exit(0);
