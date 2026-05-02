import { promises as fs } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'server/index.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'server/routes/payment.mjs',
  'server/routes/account.mjs',
  'server/routes/ops.mjs',
  'server/core/hardening-matrix.mjs',
  'server/config/env.mjs',
  'server/config/validation.mjs',
  'server/middleware/security.mjs'
];
const failures = [];
async function read(rel) { return fs.readFile(path.join(root, rel), 'utf8'); }
for (const rel of required) {
  try { await fs.access(path.join(root, rel)); } catch { failures.push(`missing:${rel}`); }
}
const files = Object.fromEntries(await Promise.all(required.map(async rel => [rel, await read(rel).catch(() => '')])));
const banned = [/from ['"]express['"]/, /express\.Router\s*\(/, /router\.use\s*\(/, /next\s*\(/, /req\.params/];
for (const [rel, text] of Object.entries(files)) {
  for (const pattern of banned) if (pattern.test(text)) failures.push(`express-style:${rel}:${pattern}`);
}
if (!files['server/index.mjs'].includes('http.createServer')) failures.push('index:not-native-http-createServer');
for (const needle of ['createPublicRouteHandler(routeContext)', 'createAdminRouteHandler(routeContext)', 'securityMiddleware(req, res)', 'readEnvConfig(process.env)']) {
  if (!files['server/index.mjs'].includes(needle)) failures.push(`index:missing:${needle}`);
}
for (const [rel, needle] of [
  ['server/routes/public.mjs','export function createPublicRouteHandler'],
  ['server/routes/admin.mjs','export function createAdminRouteHandler'],
  ['server/routes/payment.mjs','export function createPaymentRouteHandler'],
  ['server/routes/account.mjs','export function createAccountRouteHandler'],
  ['server/routes/ops.mjs','export function createOpsRouteHandler'],
  ['server/config/env.mjs','export function readEnvConfig'],
  ['server/middleware/security.mjs','export function createSecurityMiddleware']
]) {
  if (!files[rel].includes(needle)) failures.push(`${rel}:missing-export:${needle}`);
}
const indexContextInvocations = (files['server/index.mjs'].match(/=\s*createRouteContext\(\)/g) || []).length;
if (indexContextInvocations !== 1) failures.push(`index:route-context-created-wrong-count:${indexContextInvocations}`);
if (!files['server/routes/admin.mjs'].includes('opsRouteHandler(req, res, {') || !files['server/routes/admin.mjs'].includes('session, db')) failures.push('admin:ops-not-behind-session-db-gate');
if (!files['server/routes/public.mjs'].includes('const accountHandled = await accountRouteHandler(req, res')) failures.push('public:account-not-delegated');
if (!files['server/routes/public.mjs'].includes('const paymentHandled = await paymentRouteHandler(req, res')) failures.push('public:payment-not-delegated');
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 'phase166-native-http-route-split', requiredFiles: required.length }, null, 2));
