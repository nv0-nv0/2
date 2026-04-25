import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const server = fs.readFileSync(path.join(root, 'server', 'index.mjs'), 'utf8');
const pages = ['/', '/products/veridion/demo', '/plans', '/solutions', '/documents', '/checkout', '/portal', '/board', '/terms', '/privacy', '/refund', '/business-info'];
const offers = ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency'];
for (const route of pages) assert.ok(server.includes(`'${route}'`) || route === '/', `route missing: ${route}`);
for (const offer of offers) {
  assert.ok(server.includes(`'${offer}'`) || server.includes(`code: '${offer}'`), `offer missing: ${offer}`);
  assert.ok(server.includes(`plan === '${offer}'`) || ['Basic','Pro','Auto','Agency'].includes(offer), `fulfillment path missing: ${offer}`);
}
for (const route of ['/api/public/products','/api/public/plans','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment','/api/public/portal-summary','/api/public/document-preview']) {
  assert.ok(server.includes(route), `api missing: ${route}`);
}
const plansHtml = fs.readFileSync(path.join(root, 'apps/public', 'plans', 'index.html'), 'utf8');
assert.ok(plansHtml.includes('상품·요금'), 'plans page title missing');
assert.ok(plansHtml.includes('전체 비교'), 'comparison block missing');
const homeHtml = fs.readFileSync(path.join(root, 'apps/public', 'home', 'index.html'), 'utf8');
assert.ok(homeHtml.includes('문서 초안은 전용 페이지'), 'home document menu entry missing');
assert.ok(homeHtml.includes('요금제 및 서비스 안내'), 'home pricing preview missing');
const report = { ok: true, mode: 'static-commercial-contract-gate', checkedPages: pages.length, checkedOffers: offers.length, checkedApis: 7, generatedAt: new Date().toISOString() };
const out = path.join(root, 'docs', 'PHASE26_FULL_COMMERCIAL_FLOW_CONTRACT_20260424.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(0);
