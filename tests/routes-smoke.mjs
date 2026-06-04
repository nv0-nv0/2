import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listPageRoutes } from '../server/config/page-registry.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));
const server = read('server/index.mjs');
const registeredRoutes = new Set(listPageRoutes().map(item => item.route));
const routeSources = [
  server,
  read('server/routes/public.mjs'),
  read('server/routes/admin.mjs'),
  read('server/routes/payment.mjs'),
  read('server/routes/account.mjs'),
  read('server/routes/ops.mjs')
].join('\n');

const routePairs = [
  ['/', 'apps/public/home/index.html', ['사이트 주소 하나로 고객이', '결제 직전에 멈추는 이유']],
  ['/demo', 'apps/public/demo/index.html', ['무료 진단', '핵심 안내 공백']],
  ['/documents', 'apps/public/documents/index.html', ['문서 생성', '고객 안내문']],
  ['/guides', 'apps/public/guides/index.html', ['가이드', '고객이 안심하는 페이지']],
  ['/plans', 'apps/public/plans/index.html', ['요금 안내', '기본 리포트']],
  ['/checkout', 'apps/public/checkout/index.html', ['결제 확인', '받을 결과물']],
  ['/portal', 'apps/public/portal/index.html', ['고객 포털', '우선 조치']],
  ['/products/veridion/demo', 'apps/public/demo/index.html', ['무료 진단', '사이트 주소 하나']],
  ['/solutions', 'apps/public/solutions/index.html', ['솔루션', '고지·환불·개인정보']],
  ['/terms', 'apps/public/terms/index.html', ['이용약관']],
  ['/privacy', 'apps/public/privacy/index.html', ['개인정보']],
  ['/refund', 'apps/public/refund/index.html', ['환불']],
  ['/business-info', 'apps/public/business-info/index.html', ['사업자']]
];

for (const [route, file, needles] of routePairs) {
  assert.ok(registeredRoutes.has(route), `route registry missing ${route}`);
  assert.ok(exists(file), `page file missing ${file}`);
  const html = read(file);
  assert.ok(needles.some(needle => html.includes(needle)), `page text missing ${route}`);
}

for (const route of ['/admin', '/admin/console', '/admin/orders', '/admin/publications', '/admin/library', '/admin/settings', '/admin/diagnostics']) {
  assert.ok(registeredRoutes.has(route), `admin route missing ${route}`);
}
for (const route of ['/healthz', '/readyz', '/api/public/health', '/api/admin/session', '/api/public/experience-orchestrator', '/api/admin/experience-orchestrator']) {
  assert.ok(routeSources.includes(route), `system route missing ${route}`);
}
assert.match(server, /redirect\(req, res, 302, '\/admin'\)|location.*\/admin|\/admin\/console/);
console.log(JSON.stringify({ ok: true, checked: routePairs.length + 11 }, null, 2));
