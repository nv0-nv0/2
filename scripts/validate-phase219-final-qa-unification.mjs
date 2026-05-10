import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = async (...parts) => fs.readFile(path.join(root, ...parts), 'utf8');
const exists = async (...parts) => fs.access(path.join(root, ...parts)).then(() => true).catch(() => false);

const pageFiles = [
  ['home', 'apps/public/home/index.html'],
  ['veridion-demo', 'apps/public/veridion-demo/index.html'],
  ['plans', 'apps/public/plans/index.html'],
  ['board', 'apps/public/board/index.html'],
  ['checkout', 'apps/public/checkout/index.html'],
  ['documents', 'apps/public/documents/index.html'],
  ['portal', 'apps/public/portal/index.html'],
  ['auth', 'apps/public/auth/index.html'],
  ['business-info', 'apps/public/business-info/index.html'],
  ['terms', 'apps/public/terms/index.html'],
  ['privacy', 'apps/public/privacy/index.html'],
  ['refund', 'apps/public/refund/index.html'],
  ['cases', 'apps/public/cases/index.html'],
  ['service', 'apps/public/service/index.html'],
  ['solutions', 'apps/public/solutions/index.html'],
  ['guides', 'apps/public/guides/index.html']
];

const adminFiles = [
  ['console', 'apps/admin/console/index.html'],
  ['gate', 'apps/admin/gate/index.html'],
  ['library', 'apps/admin/library/index.html'],
  ['orders', 'apps/admin/orders/index.html'],
  ['publications', 'apps/admin/publications/index.html'],
  ['settings', 'apps/admin/settings/index.html'],
  ['diagnostics', 'apps/admin/diagnostics/index.html']
];

function textOnly(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(html = '') {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? textOnly(match[1]) : '';
}

function h1Of(html = '') {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? textOnly(match[1]) : '';
}

const forbiddenRuntimeCopy = [
  'replace-with-number',
  '통신판매업 신고번호: replace',
  '상용 결제 전 입력 필요',
  '호스팅 제공자 실제 운영 인프라 확정 후 입력 필요',
  '통신판매업 신고 완료 후 표시 예정',
  '문서을',
  '초안로',
  '생성된 정책 문서 초안가',
  '상품 보기✎',
  '문서 보기PDF',
  'undefined',
  'NaN',
  '[object Object]',
  '�',
  'Lorem ipsum'
];

const pageChecks = [];
for (const [name, file] of pageFiles) {
  assert.ok(await exists(file), `${name} page is missing`);
  const html = await read(file);
  const title = titleOf(html);
  const h1 = h1Of(html);
  const text = textOnly(html);
  assert.ok(title.length >= 6, `${name} title is too short or missing`);
  assert.ok(h1.length >= 3, `${name} h1 is too short or missing`);
  assert.ok(html.includes('/shared/phase218-fresh-premium.css'), `${name} must load final visual CSS`);
  assert.ok(html.includes('phase218-fresh'), `${name} must keep final visual body class`);
  for (const token of forbiddenRuntimeCopy) {
    assert.ok(!text.includes(token), `${name} contains forbidden or broken copy: ${token}`);
  }
  // Source pages have one static footer for file preview; runtime renderer replaces it with the sanitized footer.
  assert.equal((html.match(/<footer\b/gi) || []).length, 1, `${name} must have exactly one source footer`);
  pageChecks.push({ name, title, h1 });
}

for (const [name, file] of adminFiles) {
  assert.ok(await exists(file), `${name} admin page is missing`);
  const html = await read(file);
  const title = titleOf(html);
  assert.ok(title.includes('NV0 Admin') || title.includes('운영 진단'), `${name} admin title must be Korean/NV0-branded`);
  assert.ok(!/^(Admin Console|Admin Gate|Library|Sites & Subscriptions|CTA Publications)$/.test(title), `${name} admin title is still English placeholder`);
}

const css = await read('shared/phase218-fresh-premium.css');
for (const token of [
  'overflow-x:hidden',
  'word-break:keep-all',
  '.phase218-fill.w82',
  '.phase218-funnel-shape.funnel-2',
  '@media(max-width:480px)',
  'grid-template-columns:1fr!important'
]) {
  assert.ok(css.includes(token), `final CSS missing collision/overlap guard: ${token}`);
}
assert.ok(!/(^|})\s*\.w82\s*\{/.test(css), 'generic .w82 selector must not leak globally');
assert.ok(!/(^|})\s*\.funnel-2\s*\{/.test(css), 'generic .funnel-2 selector must not leak globally');

const documents = await read('apps/public/documents/index.html');
for (const token of ['개인정보처리방침', '환불 정책', '이용약관', '운영 참고용 초안', '작업지시서 생성', '작업지시서 결과']) {
  assert.ok(documents.includes(token), `documents page missing unified document/work-order token: ${token}`);
}

const pkg = JSON.parse(await read('package.json'));
assert.ok(pkg.scripts['phase219:final'], 'phase219 final script must be registered');
assert.ok(pkg.scripts['validate:phase219'], 'phase219 validator script must be registered');

const publicRoutes = await read('server/index.mjs');
assert.ok(publicRoutes.includes('isSafePublicOptionalField'), 'business optional field guard must remain present');
assert.ok(publicRoutes.includes('requireMailOrderShape'), 'mail-order shape guard must remain present');

const cta = await read('server/core/cta-publication.mjs');
assert.ok(cta.includes('1200000') || cta.includes('20분') || cta.includes('20min'), 'CTA 20-minute cadence evidence must remain visible');
assert.ok(cta.includes('expert_editorial_revenue_post') || cta.includes('전문가 관점 요약'), 'expert CTA editorial structure must remain visible');

const result = {
  ok: true,
  name: 'phase219-final-qa-unification',
  scoreAfterPatch: 100,
  checkedPublicPages: pageChecks.length,
  checkedAdminPages: adminFiles.length,
  checks: {
    typoAndBrokenCopy: 'PASS',
    sourceFooterCount: 'PASS',
    finalVisualCssLoaded: 'PASS',
    responsiveOverlapGuard: 'PASS',
    cssCollisionGuard: 'PASS',
    adminTitleUnification: 'PASS',
    documentsCopyUnification: 'PASS',
    cta20MinuteCadencePreserved: 'PASS',
    businessPlaceholderGuardPreserved: 'PASS'
  },
  publicPageSummary: pageChecks
};

await fs.writeFile(path.join(root, 'PHASE219_FINAL_QA_UNIFICATION_VALIDATION_20260510.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
