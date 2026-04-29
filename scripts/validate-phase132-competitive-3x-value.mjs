import fs from 'node:fs';
const server = fs.readFileSync('server/index.mjs','utf8');
const plans = fs.readFileSync('apps/public/plans/index.html','utf8');
const plansJs = fs.readFileSync('apps/public/plans/app.js','utf8');
const checkout = fs.readFileSync('apps/public/checkout/index.html','utf8');
const diag = fs.readFileSync('server/core/diagnosis-report-package.mjs','utf8');
const expected = { Report:69000, FixPack:99000, TemplatePack:69000, IndustryGuide:99000, Basic:99000, Pro:199000, Auto:299000, Certified:199000, Agency:399000 };
const failures = [];
for (const [code, price] of Object.entries(expected)) {
  const re = new RegExp(`code: '${code}',[^\\n]*price: ${price}`);
  if (!re.test(server)) failures.push(`${code} expected price ${price}`);
}
for (const token of ['marketPosition','valuePackWorth','가격의 3배 구성 가치 기준',"monthlyPrice: plan === 'Auto' ? 299000 : plan === 'Pro' ? 199000 : 99000",'|| 69000']) if (!server.includes(token)) failures.push(`server missing: ${token}`);
for (const token of ['약 30% 낮은 경쟁가','가격의 3배 구성 가치','69,000원','99,000원']) if (!plans.includes(token)) failures.push(`plans html missing: ${token}`);
for (const token of ['valueLabel','discountLabel','offer-value']) if (!plansJs.includes(token)) failures.push(`plans js missing: ${token}`);
for (const token of ['약 30% 낮은 경쟁가','가격의 3배 구성 가치']) if (!checkout.includes(token)) failures.push(`checkout missing: ${token}`);
for (const token of ['deliverableBundle','commercial-core-v6.7-100-point-output','제목 후보','FAQ','자연스러운 CTA','태그']) if (!diag.includes(token)) failures.push(`diagnosis package missing: ${token}`);
for (const rel of ['runtime/data/db.json','runtime/data/db.seed.json']) {
  const data = JSON.parse(fs.readFileSync(rel,'utf8'));
  if (data.settings?.pricingStandard !== 'phase132-30-percent-competitive-3x-value') failures.push(`${rel} pricingStandard missing`);
}
if (failures.length) {
  console.error('PHASE132 validation failed');
  for (const failure of failures) console.error(' -', failure);
  process.exit(1);
}
console.log('PHASE132 validation passed');
