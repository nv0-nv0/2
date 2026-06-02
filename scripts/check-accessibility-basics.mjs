import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name === 'index.html') files.push(p);
  }
}
walk(path.join(root, 'apps'));
const failures = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  if (!/<html[^>]+lang="ko"/i.test(html)) failures.push(`${rel}: missing html lang=ko`);
  if (!/<title>[^<]{2,}<\/title>/i.test(html)) failures.push(`${rel}: missing title`);
  if (!/<h1[\s>]/i.test(html)) failures.push(`${rel}: missing h1`);
  if (/<nav\b/i.test(html) && !/<nav[^>]+aria-label=/i.test(html)) failures.push(`${rel}: nav requires aria-label`);
  if (/<img\b(?![^>]*\balt=)/i.test(html)) failures.push(`${rel}: image without alt`);
  if (/id="[^\"]*password/i.test(html) && !/autocomplete="(?:new-password|current-password)"/i.test(html)) failures.push(`${rel}: password autocomplete should be explicit`);
}
if (failures.length) {
  console.error(JSON.stringify({ ok: false, checked: files.length, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: files.length, contract: 'accessibility-basics' }, null, 2));
