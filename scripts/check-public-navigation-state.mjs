import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const check = (file, href, label) => {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const pattern = new RegExp(`<a\\b[^>]*href=["']${href.replaceAll('/', '\\/')}["'][^>]*aria-current=["']page["'][^>]*>${label}<\\/a>`);
  if (!pattern.test(text)) errors.push({ file, href, label, error: 'active-public-navigation-state-missing' });
};
check('apps/public/demo/index.html', '/products/veridion/demo', '진단');
check('apps/public/plans/index.html', '/plans', '요금제');
check('apps/public/board/index.html', '/board', '인사이트');
for (const file of [
  'apps/public/insights/index.html',
  'apps/public/insights/refund-policy-checklist/index.html',
  'apps/public/insights/privacy-policy-checklist/index.html',
  'apps/public/insights/ecommerce-trust-checklist/index.html',
  'apps/public/insights/conversion-before-payment/index.html',
  'apps/public/insights/business-info-display/index.html',
  'apps/public/insights/mobile-checkout-trust/index.html',
]) check(file, '/board', '인사이트');
assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ ok: true, contract: 'public-navigation-state-v1', checked: 11, errors }, null, 2));
