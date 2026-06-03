import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = path.join(root, 'apps');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(apps).filter((file) => file.endsWith('.html')).sort();
const errors = [];

function attrs(raw) {
  const result = {};
  const regex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(raw))) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}

for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf8');
  for (const [name, expected] of [['theme-color', '#ffffff'], ['color-scheme', 'light'], ['format-detection', 'telephone=no'], ['referrer', 'strict-origin-when-cross-origin']]) {
    const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i');
    if (!regex.test(text)) errors.push({ file: rel, error: `meta-${name}` });
  }

  if (rel.startsWith('apps/admin/') && !/<meta[^>]+name=["']robots["'][^>]+content=["']noindex,nofollow,noarchive["']/i.test(text)) errors.push({ file: rel, error: 'admin-static-noindex-missing' });

  const ids = new Map();
  for (const match of text.matchAll(/\bid=["']([^"']+)["']/gi)) ids.set(match[1], (ids.get(match[1]) || 0) + 1);
  for (const [id, count] of ids) if (count > 1) errors.push({ file: rel, error: 'duplicate-id', id, count });

  for (const match of text.matchAll(/<img\b([^>]*)>/gi)) {
    const a = attrs(match[1]);
    if (!Object.hasOwn(a, 'alt')) errors.push({ file: rel, error: 'image-alt-missing' });
  }
  for (const match of text.matchAll(/<a\b([^>]*)>/gi)) {
    const a = attrs(match[1]);
    if (a.target === '_blank' && !String(a.rel || '').split(/\s+/).includes('noopener')) errors.push({ file: rel, error: 'target-blank-noopener-missing', href: a.href || '' });
  }
  for (const match of text.matchAll(/<button\b([^>]*)>/gi)) {
    const a = attrs(match[1]);
    if (!a.type) errors.push({ file: rel, error: 'button-type-missing', id: a.id || '' });
  }

  const labelFors = new Set([...text.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((match) => match[1]));
  const tags = [...text.matchAll(/<\/?label\b[^>]*>|<input\b[^>]*>/gi)];
  let labelDepth = 0;
  for (const token of tags) {
    const raw = token[0];
    if (/^<label\b/i.test(raw)) { labelDepth += 1; continue; }
    if (/^<\/label/i.test(raw)) { labelDepth = Math.max(0, labelDepth - 1); continue; }
    const a = attrs(raw.replace(/^<input\b/i, '').replace(/>$/, ''));
    const type = String(a.type || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;
    const named = labelDepth > 0 || (a.id && labelFors.has(a.id)) || a['aria-label'] || a['aria-labelledby'];
    if (!named) errors.push({ file: rel, error: 'input-accessible-name-missing', id: a.id || '', type });
    if (!['checkbox', 'radio', 'file'].includes(type) && !a.autocomplete) errors.push({ file: rel, error: 'input-autocomplete-missing', id: a.id || '', type });
  }
}

assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'enhanced-html-accessibility-v1', htmlFiles: files.length, errors }, null, 2));
