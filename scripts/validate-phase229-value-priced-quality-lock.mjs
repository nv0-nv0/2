import fs from 'node:fs';
import assert from 'node:assert/strict';

const checks = [];
const read = (file) => fs.readFileSync(file, 'utf8');
function check(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, message: error.message }); } }

check('pricing core exists and defines value prices', () => {
  const s = read('server/core/pricing-conversion-model.mjs');
  assert.ok(s.includes('PHASE229_PRICING_VERSION'));
  assert.ok(s.includes('Report: 39000'));
  assert.ok(s.includes('FixPack: 79000'));
  assert.ok(s.includes('Auto: 149000'));
  assert.ok(s.includes('buildPricingRecalculation'));
});
check('server catalog uses value-priced offers', () => {
  const s = read('server/index.mjs');
  assert.ok(s.includes('buildValuePricedOfferCatalog'));
  assert.ok(s.includes('buildPricingRecalculation'));
  assert.ok(s.includes('phase229PricingVersion'));
  assert.ok(s.includes("|| 39000"));
});
check('public pricing endpoint is available', () => {
  const s = read('server/routes/public.mjs');
  assert.ok(s.includes('/api/public/pricing-fit'));
  assert.ok(s.includes('buildPricingRecalculation'));
});
check('plans page exposes new lower prices without JS', () => {
  const s = read('apps/public/plans/index.html');
  for (const token of ['39,000원','79,000원','149,000원 / 월','phase229-price-fit','가격 재산정 완료']) assert.ok(s.includes(token), token);
  for (const legacy of ['69,000원','99,000원','299,000원']) assert.equal(s.includes(legacy), false, legacy);
});
check('checkout fallback exposes new prices', () => {
  const html = read('apps/public/checkout/index.html');
  const js = read('apps/public/checkout/app.js');
  for (const token of ['39,000원','79,000원','149,000원','price: 39000','price: 79000','price: 149000']) assert.ok((html + js).includes(token), token);
});
check('paid output quality lock exists and is attached to premium assets', () => {
  const service = read('server/core/service-quality-220.mjs');
  const premium = read('server/core/premium-asset-builder.mjs');
  assert.ok(service.includes('buildPhase229OutputQualityLock'));
  assert.ok(service.includes('phase229_paid_quality_lock'));
  assert.ok(premium.includes('phase229OutputQualityLock'));
  assert.ok(premium.includes('가격은 낮추되'));
});
check('phase229 scripts are registered', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['test:phase229']);
  assert.ok(pkg.scripts['validate:phase229']);
  assert.ok(pkg.scripts['phase229:final']);
});
check('README documents phase229 pricing and quality lock', () => {
  const s = read('README.md');
  assert.ok(s.includes('Phase229'));
  assert.ok(s.includes('39,000원'));
  assert.ok(s.includes('79,000원'));
  assert.ok(s.includes('149,000원'));
  assert.ok(s.includes('품질 잠금'));
});

const failed = checks.filter((item) => !item.ok);
const result = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync('PHASE229_VALUE_PRICED_QUALITY_LOCK_VALIDATION_20260511.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
