import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const expected = { Report:39000, FixPack:89000, TemplatePack:69000, IndustryGuide:79000, Basic:99000, Pro:189000, Auto:299000, Certified:249000, Agency:499000 };
const server = fs.readFileSync(path.join(root,'server/index.mjs'),'utf8');
const missing = [];
for (const [code, price] of Object.entries(expected)) {
  const re = new RegExp(`code: '${code}'[\\s\\S]*?price: ${price}\\b`);
  if (!re.test(server)) missing.push(`catalog ${code} price ${price} not found`);
}
const plansHtml = fs.readFileSync(path.join(root,'apps/public/plans/index.html'),'utf8');
for (const token of ['가격 조정 기준','39,000원','89,000원','월 299,000원']) {
  if (!plansHtml.includes(token)) missing.push(`plans missing ${token}`);
}
const testAll = fs.readFileSync(path.join(root,'scripts/test-all.mjs'),'utf8');
if (!testAll.includes("plans.includes('39,000원')") || !testAll.includes("plans.includes('월 299,000원')")) missing.push('test-all static fallback prices not updated');
const checkoutHtml = fs.readFileSync(path.join(root,'apps/public/checkout/index.html'),'utf8');
for (const token of ['월 189,000원','월 299,000원','월 499,000원']) {
  if (!checkoutHtml.includes(token)) missing.push(`checkout missing ${token}`);
}
for (const name of ['db.json','db.seed.json']) {
  const db = JSON.parse(fs.readFileSync(path.join(root,'runtime/data',name),'utf8'));
  if (db.settings?.pricingRevision !== 'phase130-market-adjusted-20260429') missing.push(`${name} missing pricing revision`);
}
if (missing.length) {
  console.error('PHASE130 validation failed');
  for (const item of missing) console.error(' -', item);
  process.exit(1);
}
console.log('PHASE130 validation passed');
