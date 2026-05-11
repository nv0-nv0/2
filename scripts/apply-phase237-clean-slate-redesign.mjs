import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cleanCss = '/shared/nv0-clean-slate-20260512.css';
const htmlRoots = ['apps/public', 'apps/admin'];
const oldCssPattern = /<link\s+[^>]*rel=["']stylesheet["'][^>]*>|<link\s+[^>]*href=["'][^"']+\.css["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
function walk(dir, list = []) { if (!fs.existsSync(dir)) return list; for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, ent.name); if (ent.isDirectory()) walk(p, list); else list.push(p); } return list; }
const htmlFiles = htmlRoots.flatMap(d => walk(path.join(root, d))).filter(p => p.endsWith('index.html'));
for (const file of htmlFiles) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(oldCssPattern, '');
  if (!s.includes(cleanCss)) s = s.replace('</head>', `<link href="${cleanCss}" rel="stylesheet"/></head>`);
  s = s.replace(/<body([^>]*)>/i, (_, attrs) => {
    const m = attrs.match(/class=["']([^"']*)["']/i);
    if (m) {
      const classes = m[1].split(/\s+/).filter(Boolean).filter(c => !/^nv0-phase/.test(c) && c !== 'phase236-clean');
      if (!classes.includes('nv0-clean-slate')) classes.unshift('nv0-clean-slate');
      return `<body${attrs.replace(m[0], `class="${classes.join(' ')}"`)}>`;
    }
    return `<body${attrs} class="nv0-clean-slate">`;
  });
  fs.writeFileSync(file, s);
}
for (const file of walk(path.join(root, 'apps')).filter(p => p.endsWith('app.css'))) {
  fs.writeFileSync(file, '/* Retired by PHASE237 clean-slate redesign. Use /shared/nv0-clean-slate-20260512.css only. */\n');
}
console.log(JSON.stringify({ ok: true, htmlFiles: htmlFiles.length }, null, 2));
