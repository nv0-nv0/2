import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SERVER_FILE = path.join(ROOT, 'server', 'index.mjs');
const APPS_DIR = path.join(ROOT, 'apps');

const serverSource = await fs.readFile(SERVER_FILE, 'utf8');
const pageMapMatch = serverSource.match(/function pageMap\(urlPath\) \{[\s\S]*?const m = \{([\s\S]*?)\n\s*\};\n\s*return m\[urlPath\] \|\| null;\n\}/);
if (!pageMapMatch) throw new Error('pageMap block not found in server/index.mjs');

const routeRegex = /'([^']+)'\s*:\s*\[(PUBLIC_DIR|ADMIN_DIR),\s*'([^']+)'\]/g;
const mappedRoutes = [];
let match;
while ((match = routeRegex.exec(pageMapMatch[1])) !== null) {
  mappedRoutes.push({ route: match[1], area: match[2] === 'PUBLIC_DIR' ? 'public' : 'admin', slug: match[3] });
}

const errors = [];
const checked = [];
const requiredFiles = ['index.html', 'app.js', 'app.css'];
for (const entry of mappedRoutes) {
  const dir = path.join(APPS_DIR, entry.area, entry.slug);
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      errors.push({ route: entry.route, slug: entry.slug, error: 'mapped slug is not a directory' });
      continue;
    }
    const htmlPath = path.join(dir, 'index.html');
    const html = await fs.readFile(htmlPath, 'utf8');
    for (const file of requiredFiles) {
      const abs = path.join(dir, file);
      await fs.access(abs);
    }
    if (!html.includes('/shared/nv0-clean-slate-20260512.css')) errors.push({ route: entry.route, slug: entry.slug, error: 'index.html missing /shared/nv0-clean-slate-20260512.css' });
    if (html.includes('/shared/base.css') || html.includes(`/apps/${entry.area}/${entry.slug}/app.css`)) errors.push({ route: entry.route, slug: entry.slug, error: 'retired css reference detected' });
    if (!html.includes(`/apps/${entry.area}/${entry.slug}/app.js`)) errors.push({ route: entry.route, slug: entry.slug, error: 'index.html missing app.js reference' });
    if (/\son[a-z]+\s*=/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline event handler detected' });
    if (/style="/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline style attribute detected' });
    if (/<script(?![^>]*src=)(?![^>]*type=\"application\/ld\+json\")/.test(html)) errors.push({ route: entry.route, slug: entry.slug, error: 'inline script tag detected' });
    checked.push({ route: entry.route, area: entry.area, slug: entry.slug, ok: true });
  } catch (error) {
    errors.push({ route: entry.route, slug: entry.slug, error: error.message });
  }
}

for (const area of ['public', 'admin']) {
  const areaDir = path.join(APPS_DIR, area);
  const dirs = await fs.readdir(areaDir, { withFileTypes: true });
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const mapped = mappedRoutes.some(item => item.area === area && item.slug === slug);
    if (!mapped) {
      errors.push({ area, slug, error: 'app directory is not reachable from pageMap' });
    }
  }
}

const duplicateRoutes = mappedRoutes
  .map(item => item.route)
  .filter((route, index, list) => list.indexOf(route) !== index);
if (duplicateRoutes.length) {
  errors.push({ error: `duplicate routes in pageMap: ${duplicateRoutes.join(', ')}` });
}

console.log(JSON.stringify({ ok: errors.length === 0, mappedRouteCount: mappedRoutes.length, checked, errors }, null, 2));
if (errors.length) process.exit(1);
process.exit(0);
