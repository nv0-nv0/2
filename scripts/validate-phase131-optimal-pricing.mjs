import fs from 'node:fs';
const expected = { Report:59000, FixPack:149000, TemplatePack:99000, IndustryGuide:129000, Basic:149000, Pro:299000, Auto:499000, Certified:390000, Agency:990000 };
const server = fs.readFileSync('server/index.mjs','utf8');
const failures = [];
for (const [code, price] of Object.entries(expected)) {
  const re = new RegExp(`code: '${code}'[\\s\\S]*?price: ${price}`);
  if (!re.test(server)) failures.push(`${code} price is not ${price}`);
}
for (const token of [
  "monthlyPrice: plan === 'Auto' ? 499000 : plan === 'Pro' ? 299000 : 149000",
  "return buildPlanCatalog(plan).find(item => item.code === plan)?.monthlyPrice || 59000;"
]) {
  if (!server.includes(token)) failures.push(`missing server token: ${token}`);
}
for (const file of ['runtime/data/db.json','runtime/data/db.seed.json']) {
  const txt = fs.readFileSync(file,'utf8');
  if (!txt.includes('phase131-optimal-premium-20260429')) failures.push(`${file} pricing revision missing`);
  if (!txt.includes('499000')) failures.push(`${file} Auto 499000 missing`);
}
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
if (!String(pkg.version || '').includes('phase131-optimal-pricing')) failures.push('package version missing phase131');
if (failures.length) {
  console.error('PHASE131 pricing validation failed');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('PHASE131 pricing validation passed');
