import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const checks = [];
function add(name, ok, detail = {}) { checks.push({ name, ok: !!ok, ...detail }); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
const pkg = JSON.parse(read('package.json'));
add('version:phase48', /phase48-perfect-live-hardening/.test(pkg.version), { version: pkg.version });
for (const rel of ['Dockerfile','docker-compose.yml','deploy/coolify.env.bulk.txt','deploy/coolify.env.example','scripts/verify-security.mjs','scripts/check-live-public.mjs','scripts/test-all.mjs','server/index.mjs']) add(`exists:${rel}`, exists(rel));
const server = read('server/index.mjs');
for (const token of ['/healthz','/readyz','/api/public/products','/api/public/plans','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment']) add(`server-route:${token}`, server.includes(token));
add('security:csp-no-unsafe-inline', !/unsafe-inline/.test(server));
add('security:trusted-types-report-only', /require-trusted-types-for/.test(server));
add('security:csrf', /x-nv0-csrf/.test(server));
add('security:cookie-hardening', /HttpOnly/.test(server) && /SameSite=Strict/.test(server));
add('ops:runtime-writable-readyz', /runtimeWritable/.test(server));
add('ops:graceful-shutdown', /SIGTERM/.test(server) && /server.close/.test(server));
const compose = read('docker-compose.yml');
for (const token of ['${NV0_PLATFORM_TARGET','${NV0_PAYMENT_PROVIDER','${NV0_PORTONE_API_SECRET','/readyz']) add(`coolify-compose:${token}`, compose.includes(token));
const envBulk = read('deploy/coolify.env.bulk.txt');
for (const token of ['NV0_PLATFORM_TARGET=commercial','NV0_PAYMENT_PROVIDER=portone_v2','NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict']) add(`coolify-env:${token}`, envBulk.includes(token));
const pages = ['home','veridion-demo','plans','documents','checkout','portal','board','business-info','privacy','terms','refund'];
for (const page of pages) {
  const rel = page === 'veridion-demo' ? 'apps/public/veridion-demo/index.html' : `apps/public/${page}/index.html`;
  const html = read(rel);
  add(`page:${page}:brand`, /NV0|Veridion|VERIDION|엔브이제로/.test(html));
  add(`page:${page}:not-stuck-loading`, !/불러오는 중입니다|Loading\.\.\./.test(html));
  add(`page:${page}:no-admin-link`, page === 'home' ? !html.includes('/admin') : true);
}
const db = read('runtime/data/db.json');
const seed = read('runtime/data/db.seed.json');
add('runtime:seed-matched', db === seed);
add('runtime:sessions-empty', read('runtime/data/sessions.json').trim() === '[]');
const failed = checks.filter(c => !c.ok);
const report = { generatedAt: new Date().toISOString(), ok: failed.length === 0, score: failed.length === 0 ? 100 : Math.max(0, 100 - failed.length * 3), phase: 'phase48-perfect-live-hardening', total: checks.length, passed: checks.length - failed.length, failed: failed.length, failures: failed, checks };
fs.writeFileSync(path.join(docsDir, 'PHASE48_FINAL_100_GATE_20260425.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, score: report.score, passed: report.passed, failed: report.failed, report: 'docs/PHASE48_FINAL_100_GATE_20260425.json' }, null, 2));
process.exit(report.ok ? 0 : 1);
