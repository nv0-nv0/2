import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogConsistencySnapshot } from '../shared/product-catalog.mjs';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const snapshot = buildCatalogConsistencySnapshot();
const files = {
  server: read('server/index.mjs'),
  checkout: read('apps/public/checkout/app.js'),
  demo: read('apps/public/veridion-demo/app.js') + '\n' + read('apps/public/demo/app.js'),
  plans: read('apps/public/plans/index.html'),
  pricing: read('server/core/pricing-conversion-model.mjs'),
  readme: read('README.md')
};
const joinedRuntime = [files.server, files.checkout, files.demo, files.plans, files.pricing, files.readme].join('\n');
assert.equal(snapshot.prices.Report, 49000, 'Report price must be 49,000 KRW');
assert.equal(snapshot.prices.Expert, 149000, 'Expert price must be 149,000 KRW');
assert.ok(files.server.includes('../shared/product-catalog.mjs'), 'server must import shared product catalog');
assert.ok(files.checkout.includes('/shared/product-catalog.mjs'), 'checkout must import shared product catalog');
assert.ok(files.plans.includes('₩49,000') && files.plans.includes('₩149,000'), 'plans page must show canonical public prices');
assert.ok(files.demo.includes('기본 리포트 49,000원') && files.demo.includes('전문가 플랜 149,000원'), 'demo paid gate must show canonical prices');
assert.ok(!/29000|89000|29,000원|89,000원/.test(joinedRuntime), 'legacy 29,000/89,000 prices must not remain in runtime surfaces');
const report = { ok: true, generatedAt: new Date().toISOString(), snapshot };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PRICE_CATALOG_AUDIT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
