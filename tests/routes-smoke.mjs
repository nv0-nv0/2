import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));
const server = read('server/index.mjs');
const routeSources = [
  server,
  read('server/routes/public.mjs'),
  read('server/routes/admin.mjs'),
  read('server/routes/payment.mjs'),
  read('server/routes/account.mjs'),
  read('server/routes/ops.mjs')
].join('\n');

const routePairs = [
  ['/', 'apps/public/home/index.html', ['NV0 Veridion', '온라인 사업 리스크']],
  ['/demo', 'apps/public/demo/index.html', ['간단 진단', '무료 진단']],
  ['/documents', 'apps/public/documents/index.html', ['문서', '템플릿']],
  ['/guides', 'apps/public/guides/index.html', ['법령', '가이드']],
  ['/plans', 'apps/public/plans/index.html', ['요금', '플랜']],
  ['/checkout', 'apps/public/checkout/index.html', ['유료 플랜', '결제']],
  ['/portal', 'apps/public/portal/index.html', ['고객 포털']],
  ['/products/veridion/demo', 'apps/public/veridion-demo/index.html', ['Veridion', '진단']],
  ['/solutions', 'apps/public/solutions/index.html', ['상품 구조', '상용화']],
  ['/terms', 'apps/public/terms/index.html', ['이용약관']],
  ['/privacy', 'apps/public/privacy/index.html', ['개인정보']],
  ['/refund', 'apps/public/refund/index.html', ['환불']],
  ['/business-info', 'apps/public/business-info/index.html', ['사업자']]
];

for (const [route, file, needles] of routePairs) {
  assert.ok(server.includes(`'${route}'`) || server.includes(`"${route}"`) || server.includes(route), `route map missing ${route}`);
  assert.ok(exists(file), `page file missing ${file}`);
  const html = read(file);
  assert.ok(needles.some(needle => html.includes(needle)), `page text missing ${route}`);
}

for (const route of ['/admin', '/admin/console', '/admin/orders', '/admin/publications', '/admin/library', '/admin/settings', '/admin/diagnostics']) {
  assert.ok(server.includes(route), `admin route missing ${route}`);
}
for (const route of ['/healthz', '/readyz', '/api/public/health', '/api/admin/session']) {
  assert.ok(routeSources.includes(route), `system route missing ${route}`);
}
assert.match(server, /redirect\(req, res, 302, '\/admin'\)|location.*\/admin|\/admin\/console/);
console.log(JSON.stringify({ ok: true, checked: routePairs.length + 11 }, null, 2));
