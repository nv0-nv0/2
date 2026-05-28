import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function add(name, ok, detail = {}) {
  if (!ok) throw new Error(`${name} failed ${JSON.stringify(detail)}`);
  checks.push({ name, ok: true, ...detail });
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const server = read('server/index.mjs');
add('security:csp-no-unsafe-inline', !/CSP[^\n]*unsafe-inline|unsafe-inline/.test(server), { note: 'server source does not allow unsafe-inline' });
add('security:trusted-types-report-only', /content-security-policy-report-only|require-trusted-types-for/.test(server), { note: 'Trusted Types kept report-only to avoid production render breakage' });
add('security:nosniff', /x-content-type-options/i.test(server) && /nosniff/i.test(server));
add('security:frame-deny', /x-frame-options/i.test(server) && /DENY/.test(server));
add('security:admin-cookie-httponly', /HttpOnly/.test(server) && /SameSite=Strict/.test(server));
add('security:csrf-header-required', /x-vr-csrf/.test(server));
add('security:admin-public-hidden', !read('apps/public/home/index.html').includes('/admin'));
add('security:readyz-runtime-writable', /runtimeWritable/.test(server) && /readyz/.test(server));
add('security:env-placeholder-guard', /replace-with|changeme|dummy|test_/.test(server));
add('security:turnstile-gate-supported', /NV0_ENABLE_TURNSTILE/.test(server) && fs.existsSync(path.join(root, 'shared/turnstile.js')));

const clientFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(entry.name)) clientFiles.push(p);
  }
}
walk(path.join(root, 'apps'));
const allClient = clientFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
add('client:no-inline-event-handlers', !/\son[a-z]+\s*=/.test(allClient));
add('client:no-debug-console-log', !/console\.log\(/.test(allClient));
add('client:html-escape-helper', /escapeHtml/.test(read('shared/html.js')));

console.log(JSON.stringify({ ok: true, baseUrl: process.env.NV0_BASE_URL || null, checks }, null, 2));
process.exit(0);
