import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = {
  service: 'server/core/service-quality-220.mjs',
  diagnosis: 'server/core/diagnosis-report-package.mjs',
  premium: 'server/core/premium-asset-builder.mjs',
  index: 'server/index.mjs',
  publicRoute: 'server/routes/public.mjs',
  accountRoute: 'server/routes/account.mjs',
  demoJs: 'apps/public/veridion-demo/app.js',
  demoCss: 'apps/public/veridion-demo/app.css',
  readme: 'README.md'
};
const checks = [];
function check(name, fn) { try { fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, message: error.message }); } }
function read(file) { return fs.readFileSync(file, 'utf8'); }

check('service exposes phase228 conversion urgency builder', () => {
  const s = read(files.service);
  assert.ok(s.includes('phase229-value-priced-quality-lock-v1'));
  assert.ok(s.includes('buildConversionUrgencyModel'));
  assert.ok(s.includes('free_demo_conversion_crisis_score'));
  assert.ok(s.includes('crisisScore'));
  assert.ok(s.includes('purchasePath'));
});
check('public diagnosis package carries conversion urgency', () => {
  const s = read(files.diagnosis);
  assert.ok(s.includes('buildConversionUrgencyModel'));
  assert.ok(s.includes('conversionUrgency'));
  assert.ok(s.includes('위기도 상세 리포트 결제'));
});
check('premium asset includes conversion urgency and customer text line', () => {
  const s = read(files.premium);
  assert.ok(s.includes('buildConversionUrgencyModel'));
  assert.ok(s.includes('conversionUrgency'));
  assert.ok(s.includes('전환 위기도'));
});
check('scan pipelines attach conversion urgency to direct result payload', () => {
  const s = read(files.index);
  assert.ok(s.includes('buildConversionUrgencyModel'));
  assert.ok(s.includes('conversionUrgency'));
});
check('account and public routes preserve locked conversion data', () => {
  const pub = read(files.publicRoute);
  const acc = read(files.accountRoute);
  assert.ok(pub.includes('buildConversionUrgencyModel'));
  assert.ok(pub.includes('conversionUrgency'));
  assert.ok(acc.includes('buildConversionUrgencyModel'));
  assert.ok(acc.includes('conversionUrgency'));
});
check('demo UI renders visual crisis score and purchase path', () => {
  const s = read(files.demoJs);
  assert.ok(s.includes('renderConversionUrgencyPanel'));
  assert.ok(s.includes('위기도 점수'));
  assert.ok(s.includes('renderPurchasePathPanel'));
  assert.ok(s.includes('구매 전환 구조'));
  assert.ok(s.includes('상세 리포트 결제하고 원인 확인'));
});
check('demo CSS contains phase228 conversion visual styles', () => {
  const s = read(files.demoCss);
  assert.ok(s.includes('PHASE228'));
  assert.ok(s.includes('.conversion-crisis-panel'));
  assert.ok(s.includes('.crisis-ring'));
  assert.ok(s.includes('.purchase-path-grid'));
});
check('README documents phase228 conversion behavior', () => {
  const s = read(files.readme);
  assert.ok(s.includes('Phase228'));
  assert.ok(s.includes('위기도 점수'));
  assert.ok(s.includes('구매 전환'));
});

const failed = checks.filter((item) => !item.ok);
const result = { ok: failed.length === 0, passed: checks.length - failed.length, failed: failed.length, checks };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
