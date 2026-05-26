import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoreDirs = new Set(['.git', 'node_modules']);
const ignoredExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.zip', '.gz', '.tgz']);
const findings = [];

const secretPatterns = [
  { name: 'aws_access_key_shape', pattern: /\bA[KS]IA[0-9A-Z]{16}\b/g },
  { name: 'openai_or_generic_live_secret', pattern: /\bsk-(?:live|proj|test)?[A-Za-z0-9_-]{20,}\b/g },
  { name: 'github_token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { name: 'slack_token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'private_key_block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g },
  { name: 'portone_live_secret_literal', pattern: /PORTONE_(?:API_)?SECRET\s*=\s*(?!replace-|REPLACE_|$)[A-Za-z0-9_\-]{24,}/g },
  { name: 'turnstile_secret_literal', pattern: /TURNSTILE_SECRET\s*=\s*(?!replace-|REPLACE_|test-|$)[A-Za-z0-9_\-]{24,}/g }
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (ignoredExt.has(ext)) continue;
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    let text = '';
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    for (const { name, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ file: rel, line, type: name, sample: match[0].slice(0, 16) + '…' });
      }
    }
  }
}

walk(root);

const report = {
  ok: findings.length === 0,
  checkedAt: new Date().toISOString(),
  ruleVersion: 'phase302-release-secret-hygiene-v1',
  findings
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE302_SECRET_HYGIENE_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
