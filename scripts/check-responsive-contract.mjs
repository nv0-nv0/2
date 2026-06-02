import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];
const css = read('shared/veridion-rebrand.css');
const publicFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(rel);
    else if (/\.(html|css|js)$/.test(entry.name)) publicFiles.push(rel);
  }
}
walk('apps/public');
const text = publicFiles.map(file => read(file)).join('\n');
const retired = ['retired-professional-polish.css','retired-portal-screenshot-repair.css','retired-portal-dashboard.css','nv0n-runtime.css','nv0n-generated.css','veridion-clean-v311.css','v311-','v331-','v332-','v333-','nv0n-'];
for (const file of ['apps/public/portal/index.html','apps/public/board/index.html','apps/public/checkout/index.html','apps/public/privacy/index.html','apps/public/business-info/index.html']) {
  if (!exists(file)) failures.push(`missing critical public page: ${file}`);
}
for (const token of retired) {
  if (text.includes(token) || css.includes(token)) failures.push(`retired source token must not return: ${token}`);
}
const brokenGlyph = /[�□■◆◇●▲▼※★☆♣♥♠♬✓✔✕✖↔⇒⇐⇔⌕▱↻▤▥♢⚖⚙☑⋮🛡█░›↗]/u;
for (const file of publicFiles) {
  const value = read(file);
  if (brokenGlyph.test(value)) failures.push(`broken glyph candidate in ${file}`);
}
const requiredBreakpoints = ['max-width:1100px','max-width:760px','max-width:520px'];
for (const bp of requiredBreakpoints) {
  if (!css.replace(/\s+/g,'').includes(bp)) failures.push(`missing responsive breakpoint: ${bp}`);
}
const requiredClasses = ['.vr-shell','.vr-nav','.vr-hero','.vr-grid','.vr-card','.vr-button'];
for (const selector of requiredClasses) {
  if (!css.includes(selector)) failures.push(`missing core design selector: ${selector}`);
}
if (!/overflow-wrap:\s*anywhere|word-break:\s*keep-all/.test(css)) failures.push('missing long-text overflow protection');
if (!/grid-template-columns:\s*repeat\(auto-fit/.test(css)) failures.push('missing auto-fit responsive grid');
const report = { ok: failures.length === 0, phase: 'responsive-contract', checkedFiles: publicFiles.length, requiredBreakpoints, failures };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/RESPONSIVE_CONTRACT.json'), JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
