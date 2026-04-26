import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const summaryOnly = process.argv.includes('--summary') || process.env.NV0_LINK_CHECK_SUMMARY === '1';
const serverSource = fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8');
const pageMapMatch = serverSource.match(/function pageMap\(urlPath\) \{[\s\S]*?const m = \{([\s\S]*?)\n\s*\};\n\s*return m\[urlPath\] \|\| null;\n\}/);
if (!pageMapMatch) throw new Error('pageMap function block not found in server/index.mjs');
const knownRoutes = new Set([...pageMapMatch[1].matchAll(/'([^']+)'\s*:/g)].map(m => m[1]));
const files = [];
for (const area of ['apps/public', 'apps/admin']) {
  for (const entry of fs.readdirSync(path.join(root, area), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const htmlPath = path.join(root, area, entry.name, 'index.html');
    if (fs.existsSync(htmlPath)) files.push(htmlPath);
  }
}
const checked = [];
const errors = [];
const assetRoots = ['/shared/', '/apps/', '/runtime/uploads/'];
function assetExists(urlPath) {
  const abs = path.join(root, decodeURIComponent(urlPath.replace(/^\//, '')));
  return fs.existsSync(abs);
}
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (!ref.startsWith('/')) continue;
    if (ref.startsWith('/api/')) continue;
    const normalized = ref.split('#')[0].split('?')[0] || '/';
    if (assetRoots.some(prefix => normalized.startsWith(prefix))) {
      if (assetExists(normalized)) checked.push({ file: path.relative(root, file), ref, type: 'asset' });
      else errors.push({ file: path.relative(root, file), ref, type: 'asset' });
      continue;
    }
    if (knownRoutes.has(normalized)) checked.push({ file: path.relative(root, file), ref, type: 'route' });
    else errors.push({ file: path.relative(root, file), ref, type: 'route' });
  }
}
const adminNavMatch = serverSource.match(/function adminNav\(\) \{\n\s*return `([\s\S]*?)`;\n\}/);
if (!adminNavMatch) throw new Error('adminNav block not found in server/index.mjs');
for (const m of adminNavMatch[1].matchAll(/href="([^"]+)"/g)) {
  const href = m[1];
  const normalized = href.split('#')[0].split('?')[0] || '/';
  if (knownRoutes.has(normalized)) checked.push({ file: 'server/index.mjs#adminNav', ref: href, type: 'route' });
  else errors.push({ file: 'server/index.mjs#adminNav', ref: href, type: 'route' });
}
const payload = summaryOnly ? { ok: errors.length === 0, checkedCount: checked.length, errorCount: errors.length, errors } : { ok: errors.length === 0, checkedCount: checked.length, checked, errors };
console.log(JSON.stringify(payload, null, 2));
if (errors.length) process.exit(1);
process.exit(0);
