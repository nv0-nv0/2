import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');

const checks = [
  ['phase marker updated', source.includes("phase39-launch-gate-hardening") || source.includes("phase41-commercial-final-complete") || source.includes("phase42-final-closeout-complete")],
  ['placeholder config detector', source.includes('isPlaceholderConfigValue') && source.includes('replace-with')],
  ['production launch checklist builder', source.includes('buildProductionLaunchChecklist') && source.includes('no_placeholder_env')],
  ['public launch checklist endpoint', source.includes("pathname === '/api/public/launch-checklist'")],
  ['admin launch checklist endpoint', source.includes("pathname === '/api/admin/launch-checklist'")],
  ['SMTP included in release gate', source.includes("'NV0_SMTP_URL'") && source.includes('smtp_configured')],
  ['Turnstile included in commercial gate', source.includes("'NV0_TURNSTILE_SECRET'") && source.includes('turnstile_enabled')],
  ['admin IP included in launch gate', source.includes("'NV0_ADMIN_IP_ALLOWLIST'") && source.includes('admin_ip_allowlist')],
  ['HTTPS public URL gate', source.includes('https_public_base_url')],
  ['runtime unresolved refund gate', source.includes('unresolved_refunds_empty')],
  ['failed email gate', source.includes('failed_email_reviewed')],
  ['package phase39 script', Boolean(pkg.scripts?.['validate:phase39'])],
  ['env example still documents SMTP', envExample.includes('NV0_SMTP_URL=')],
];

const failed = checks.filter(([, ok]) => !ok);
const summary = { ok: failed.length === 0, passed: checks.length - failed.length, total: checks.length, failed: failed.map(([name]) => name) };
console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);
