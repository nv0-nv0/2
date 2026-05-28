import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fail = [];
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server/index.mjs');
const platform = read('server/core/platform.mjs');
const envCommercial = read('deploy/env.commercial.template');
for (const token of [
  'NV0_PLATFORM_TARGET=commercial','NV0_ADMIN_AUTH_MODE=account_rbac','NV0_PERSISTENCE_MODE=postgres_primary','NV0_SESSION_STORE=redis','NV0_RATE_LIMIT_STORE=redis','NV0_LOCK_PROVIDER=redis','NV0_STORAGE_MODE=s3','NV0_SCAN_PROVIDER=external_http','NV0_PAYMENT_PROVIDER=portone_v2','NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict'
]) if (!envCommercial.includes(token)) fail.push(`commercial env missing ${token}`);
for (const forbidden of ['NV0_PAYMENT_PROVIDER=demo','NV0_PERSISTENCE_MODE=json','NV0_ADMIN_KEY=','NV0_SCAN_PROVIDER=builtin']) if (envCommercial.includes(forbidden)) fail.push(`commercial env contains forbidden ${forbidden}`);
for (const token of ['Commercial launch requires NV0_PERSISTENCE_MODE=postgres_primary','Commercial launch requires NV0_SESSION_STORE=redis','Commercial launch requires NV0_LOCK_PROVIDER=redis','putObjectToS3Compatible','BUSINESS_PROFILE']) if (!server.includes(token)) fail.push(`server missing launch guard/profile: ${token}`);
for (const token of ['NV0_PAYMENT_PROVIDER must not be demo','NV0_SESSION_STORE must be redis','NV0_LOCK_PROVIDER must be redis']) if (!platform.includes(token)) fail.push(`platform missing commercial control: ${token}`);
for (const rel of ['apps/public/terms/index.html','apps/public/privacy/index.html','apps/public/refund/index.html','apps/public/business-info/index.html']) if (!fs.existsSync(path.join(root, rel))) fail.push(`missing legal page ${rel}`);
if (fail.length) { console.error(JSON.stringify({ ok:false, fail }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok:true, checkedAt:new Date().toISOString(), commercialReleaseGuards:10, legalPages:4, businessProfile:true }, null, 2));
process.exit(0);
process.exit(0);
