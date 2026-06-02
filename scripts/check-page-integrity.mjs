import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverSource = await fs.readFile(path.join(root, 'server/index.mjs'), 'utf8');
const pageMapMatch = serverSource.match(/function pageMap\(urlPath\) \{[\s\S]*?const m = \{([\s\S]*?)\n\s*\};\n\s*return m\[urlPath\] \|\| null;\n\}/);
if (!pageMapMatch) throw new Error('pageMap block not found in server/index.mjs');
const routeRegex = /'([^']+)'\s*:\s*\[(PUBLIC_DIR|ADMIN_DIR),\s*'([^']+)'\]/g;
const mappedRoutes = []; let match;
while ((match = routeRegex.exec(pageMapMatch[1])) !== null) mappedRoutes.push({ route: match[1], area: match[2] === 'PUBLIC_DIR' ? 'public' : 'admin', slug: match[3] });
const errors = []; const checked = [];
for (const entry of mappedRoutes) {
  const dir = path.join(root, 'apps', entry.area, entry.slug);
  try {
    const html = await fs.readFile(path.join(dir, 'index.html'), 'utf8');
    if (!html.includes('/shared/veridion-rebrand.css')) errors.push({ route: entry.route, slug: entry.slug, error: 'index.html missing canonical shared stylesheet' });
    if (/vr-clean-slate|vr-generated|vr-runtime|veridion-adopted-ui|veridion-clean-v310|\/shared\/base\.css/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'retired css reference detected' });
    const expectedApp = `/apps/${entry.area}/${entry.slug}/app.js`;
    const canonicalDemo = entry.area === 'public' && entry.slug === 'veridion-demo' && html.includes('/apps/public/demo/app.js');
    const sharedStaticOptimizer = entry.area === 'public' && html.includes('/shared/public-page-optimizer.js');
    if (!html.includes(expectedApp) && !canonicalDemo && !sharedStaticOptimizer) errors.push({ route: entry.route, slug: entry.slug, error: 'index.html missing functional script reference' });
    if (/\son[a-z]+\s*=/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline event handler detected' });
    if (/style="/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline style attribute detected' });
    if (/<script(?![^>]*src=)(?![^>]*type="application\/ld\+json")/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline script tag detected' });
    checked.push({ route: entry.route, area: entry.area, slug: entry.slug, ok: true });
  } catch (error) { errors.push({ route: entry.route, slug: entry.slug, error: error.message }); }
}
for (const area of ['public','admin']) {
  for (const dirent of await fs.readdir(path.join(root, 'apps', area), { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    if (!mappedRoutes.some(item => item.area === area && item.slug === dirent.name)) errors.push({ area, slug: dirent.name, error: 'app directory is not reachable from pageMap' });
  }
}
const duplicateRoutes = mappedRoutes.map(item => item.route).filter((route, index, list) => list.indexOf(route) !== index);
if (duplicateRoutes.length) errors.push({ error: `duplicate routes in pageMap: ${duplicateRoutes.join(', ')}` });
console.log(JSON.stringify({ ok: errors.length === 0, mappedRouteCount: mappedRoutes.length, checked, errors }, null, 2));
if (errors.length) process.exit(1);
