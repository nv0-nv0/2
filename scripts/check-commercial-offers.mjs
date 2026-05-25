import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = fs.readFileSync(path.join(root, 'server/index.mjs'), 'utf8');
const required = ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency'];
const failures = [];
for (const code of required) {
  if (!server.includes(`code: '${code}'`)) failures.push(`catalog missing ${code}`);
}
for (const phrase of [
  'targetCustomer', 'deliverables', 'operations', 'kpi',
  'function buildPurchasedAsset', 'function ensureFulfillmentForOrder',
  '/api/public/fulfillment', '/api/public/product-detail',
  'purchasedAssets', 'fix_pack', 'template_pack', 'industry_guide', 'certification', 'subscription_entitlement'
]) {
  if (!server.includes(phrase)) failures.push(`server missing ${phrase}`);
}
const portal = fs.readFileSync(path.join(root, 'apps/public/portal/app.js'), 'utf8');
for (const phrase of ['/api/public/fulfillment', 'renderAsset', '산출물', 'badgeSnippet', 'templates', 'fixes']) {
  if (!portal.includes(phrase)) failures.push(`portal missing ${phrase}`);
}
const checkout = fs.readFileSync(path.join(root, 'apps/public/checkout/index.html'), 'utf8');
for (const code of required) {
  if (!checkout.includes(`<option${code === 'Pro' ? ' selected' : ''}>${code}</option>`) && !checkout.includes(`<option>${code}</option>`)) failures.push(`checkout option missing ${code}`);
}
const docs = fs.existsSync(path.join(root, 'docs/PHASE20_FULL_COMPLETION_WORK_ORDER_20260424_KO.md'));
if (!docs) failures.push('phase20 work order missing');
const result = { ok: failures.length === 0, checkedOffers: required.length, required, failures, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'docs/PHASE20_COMMERCIAL_OFFER_TEST_20260424.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
process.exit(0);
