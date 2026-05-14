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
  ['/', 'apps/public/home/index.html', ['온라인 사업자 리스크 진단', '법률·규제·과태료 리스크']],
  ['/demo', 'apps/public/demo/index.html', ['무료 진단', '최신 무료 진단 화면']],
  ['/documents', 'apps/public/documents/index.html', ['문서 생성', '고객 안내문']],
  ['/guides', 'apps/public/guides/index.html', ['가이드', '고객이 안심하는 페이지']],
  ['/plans', 'apps/public/plans/index.html', ['상품·요금', '필요한 리포트']],
  ['/checkout', 'apps/public/checkout/index.html', ['결제 확인', '받을 결과물']],
  ['/portal', 'apps/public/portal/index.html', ['내 사이트 관리', '확인 기록']],
  ['/products/veridion/demo', 'apps/public/veridion-demo/index.html', ['무료 진단', '사이트 주소 하나']],
  ['/solutions', 'apps/public/solutions/index.html', ['분석 프로세스', '고지·환불·개인정보']],
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
