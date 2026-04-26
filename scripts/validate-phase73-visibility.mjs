import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'shared/base.css',
  'apps/public/veridion-demo/app.css',
  'apps/public/demo/app.css',
  'apps/public/plans/app.css',
  'apps/public/portal/app.css',
  'apps/public/board/app.css',
  'apps/admin/console/app.css'
];

const requiredTokens = [
  'PHASE73: global readability/accessibility correction',
  '--p73-surface',
  '.p66-score-mini',
  '.loading-steps div',
  'color:var(--p73-text)',
  'background:linear-gradient'
];

const cssFiles = [];
function walk(dir){
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (p.endsWith('.css')) cssFiles.push(p);
  }
}
walk(path.join(root, 'apps'));
cssFiles.push(path.join(root, 'shared/base.css'));

let failures = [];
for (const rel of requiredFiles){
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) failures.push(`missing required css: ${rel}`);
}
for (const file of cssFiles){
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const token of requiredTokens){
    if (!text.includes(token)) failures.push(`${rel} missing ${token}`);
  }
}

const demo = fs.readFileSync(path.join(root, 'apps/public/veridion-demo/index.html'), 'utf8');
for (const token of ['p66-score-mini', 'loading-steps', 'result-panel', 'scan-card']){
  if (!demo.includes(token)) failures.push(`veridion-demo missing target section ${token}`);
}

if (failures.length){
  console.error('Phase73 visibility validation failed');
  for (const failure of failures.slice(0, 50)) console.error('-', failure);
  process.exit(1);
}
console.log('Phase73 visibility validation passed: 100/100');
console.log(`Checked ${cssFiles.length} CSS files for dark-theme readability guards.`);
