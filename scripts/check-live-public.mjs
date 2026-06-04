import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsDir = path.join(root, 'docs/current');
fs.mkdirSync(docsDir, { recursive: true });
const checks = [];
function add(name, ok, detail = {}) { checks.push({ name, ok: !!ok, ...detail }); }
const routes = {
  '/': 'apps/public/home/index.html', '/products/veridion/demo': 'apps/public/demo/index.html',
  '/plans': 'apps/public/plans/index.html', '/documents': 'apps/public/documents/index.html',
  '/checkout': 'apps/public/checkout/index.html', '/portal': 'apps/public/portal/index.html',
  '/board': 'apps/public/board/index.html', '/business-info': 'apps/public/business-info/index.html',
  '/privacy': 'apps/public/privacy/index.html', '/terms': 'apps/public/terms/index.html', '/refund': 'apps/public/refund/index.html'
};
for (const [route, rel] of Object.entries(routes)) {
  const file = path.join(root, rel); const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  add(`page:${route}:file`, !!html, { file: rel });
  add(`page:${route}:brand`, /NV0|Veridion|VERIDION|엔브이제로/.test(html));
  add(`page:${route}:shared-style`, html.includes('/shared/veridion-rebrand.css'));
}
const server = fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8');
for (const api of ['/api/public/products','/api/public/plans','/healthz','/readyz','/api/public/checkout-session','/api/public/payment/complete']) add(`api:${api}:mapped`, server.includes(api));
const css = fs.readFileSync(path.join(root, 'shared/veridion-rebrand.css'), 'utf8');
add('asset:canonical-css-shell', /app-shell|vr-card|card/.test(css));
add('asset:canonical-css-responsive', /@media/.test(css));
const failed = checks.filter(c => !c.ok);
const report = { generatedAt: new Date().toISOString(), ok: failed.length === 0, total: checks.length, passed: checks.length - failed.length, failed: failed.length, failures: failed, checks };
fs.writeFileSync(path.join(docsDir, 'LIVE_PUBLIC_CHECK.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/LIVE_PUBLIC_CHECK.json' }, null, 2));
if (!report.ok) process.exit(1);
