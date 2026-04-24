import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(abs, out);
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

const appRoot = path.join(root, 'apps');
const files = await walk(appRoot);
const checked = [];
const failures = [];

for (const abs of files) {
  const rel = path.relative(root, abs);
  const src = await fs.readFile(abs, 'utf8');
  const hasInnerHtml = /\.innerHTML\s*=/.test(src);
  const hasInsertAdjacentHtml = /\.insertAdjacentHTML\s*\(/.test(src);
  const hasUnsafeSink = hasInnerHtml || hasInsertAdjacentHtml;
  const hasEscaper = /escapeHtml|escapeAttr|safeUrl/.test(src) || /function\s+escapeHtml\s*\(/.test(src);
  const hasLiteralOnHandler = /<[^>]+\son[a-z]+\s*=/.test(src);
  checked.push({ file: rel, hasUnsafeSink, hasEscaper, hasLiteralOnHandler });
  if (hasUnsafeSink && !hasEscaper) failures.push({ file: rel, reason: 'unsafe html sink without escaping helper' });
  if (hasLiteralOnHandler) failures.push({ file: rel, reason: 'inline event handler-like markup found in source template' });
}

const result = { ok: failures.length === 0, checkedCount: checked.length, checked, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
