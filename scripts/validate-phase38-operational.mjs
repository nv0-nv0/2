import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const checks = [
  ['phase marker updated', (source.includes("phase38-operational-hardening") || source.includes("phase39-launch-gate-hardening") || source.includes("phase41-commercial-final-complete") || source.includes("phase42-final-closeout-complete") || source.includes("phase42-final-closeout-complete"))],
  ['checkout idempotency key support', source.includes('getIdempotencyKey') && source.includes('storeIdempotencyRecord')],
  ['checkout replay conflict protection', source.includes('동일 idempotency key로 다른 결제 요청')],
  ['robots.txt endpoint', source.includes("pathname === '/robots.txt'") && source.includes('Disallow: /checkout')],
  ['sitemap.xml endpoint', source.includes("pathname === '/sitemap.xml'") && source.includes('buildSitemapXml')],
  ['noindex for auth portal checkout', source.includes('noindex,nofollow')],
  ['public static immutable cache', source.includes('max-age=31536000, immutable')],
  ['webhook signature release gate', source.includes('webhook_signature_strict')],
  ['admin ip allowlist gate', source.includes('ADMIN_IP_ALLOWLIST') && source.includes('admin_ip_policy_reviewed')],
  ['email queue processor', source.includes('processEmailOutbox') && source.includes('/api/admin/email-outbox/process')],
  ['ops self test endpoint', source.includes("/api/admin/ops/self-test")],
  ['graceful crash handlers', source.includes('unhandledRejection') && source.includes('uncaughtException')],
  ['package phase38 script', Boolean(pkg.scripts?.['validate:phase38'])],
];

const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({ ok: failed.length === 0, passed: checks.length - failed.length, total: checks.length, failed: failed.map(([name]) => name) }, null, 2));
if (failed.length) process.exit(1);
