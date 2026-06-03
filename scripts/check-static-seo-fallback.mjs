import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'apps/public');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(publicRoot).filter((file) => file.endsWith('.html')).sort();
const errors = [];
let checkedIndexable = 0;
for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf8');
  const robots = text.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const canonical = text.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || '';
  if (!canonical.startsWith('https://nv0.kr')) errors.push({ file: rel, error: 'canonical-apex-domain-required', canonical });
  if (/noindex/i.test(robots)) continue;
  checkedIndexable += 1;
  for (const token of ['og:locale', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url']) {
    if (!new RegExp(`<meta[^>]+property=["']${token.replace(':', '\\:')}["']`, 'i').test(text)) errors.push({ file: rel, error: `missing-${token}` });
  }
  for (const token of ['twitter:card', 'twitter:title', 'twitter:description']) {
    if (!new RegExp(`<meta[^>]+name=["']${token.replace(':', '\\:')}["']`, 'i').test(text)) errors.push({ file: rel, error: `missing-${token}` });
  }
}
assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'static-seo-fallback-v1', htmlFiles: files.length, indexablePages: checkedIndexable, errors }, null, 2));
