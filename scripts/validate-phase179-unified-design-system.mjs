import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const checks = [];
const add = (name, ok, extra = {}) => checks.push({ name, ok: !!ok, ...extra });

const pages = [
  ['home', 'apps/public/home/index.html'],
  ['plans', 'apps/public/plans/index.html'],
  ['board', 'apps/public/board/index.html'],
  ['documents', 'apps/public/documents/index.html'],
  ['checkout', 'apps/public/checkout/index.html'],
  ['demo', 'apps/public/demo/index.html']
];

add('shared-css:exists', exists('shared/unified-infographic.css'));
const css = exists('shared/unified-infographic.css') ? read('shared/unified-infographic.css') : '';
for (const token of ['nv0-dark', 'nv0-topbar', 'nv0-hero', 'nv0-kpi-grid', 'checkout-layout', 'board-pagination', '@media']) {
  add(`shared-css:${token}`, css.includes(token));
}

for (const [name, file] of pages) {
  add(`${name}:exists`, exists(file));
  const html = exists(file) ? read(file) : '';
  add(`${name}:doctype`, html.trim().startsWith('<!doctype html>'));
  add(`${name}:dark-body`, html.includes('body class="nv0-dark"'));
  add(`${name}:shared-css-linked`, html.includes('/shared/unified-infographic.css'));
  add(`${name}:topbar`, html.includes('class="nv0-topbar"'));
  add(`${name}:footer`, html.includes('business-footer'));
  add(`${name}:no-replacement-char`, !html.includes('�'));
  add(`${name}:no-nvo-typo`, !html.includes('NVO'));
  add(`${name}:nav-home`, html.includes('href="/"'));
  add(`${name}:nav-plans`, html.includes('href="/plans"'));
  add(`${name}:nav-board`, html.includes('href="/board"'));
  add(`${name}:nav-documents`, html.includes('href="/documents"'));
  add(`${name}:nav-checkout`, html.includes('href="/checkout"'));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const duplicated = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  add(`${name}:no-duplicate-id`, duplicated.length === 0, duplicated.length ? { duplicated } : {});
}

const home = read('apps/public/home/index.html');
add('home:score-preview', home.includes('신뢰도 점수') && home.includes('72'));
add('home:cta-count', (home.match(/\/products\/veridion\/demo/g) || []).length >= 4);

const plans = read('apps/public/plans/index.html');
add('plans:four-core-plans', ['Free 진단', 'Pro 리포트', 'FixPack', 'Auto 운영'].every(token => plans.includes(token)));
add('plans:dynamic-containers-preserved', ['oneTimeCards', 'subscriptionCards', 'certCards', 'comparisonRows'].every(id => plans.includes(`id="${id}"`)));

const board = read('apps/public/board/index.html');
add('board:filters-preserved', ['data-filter="all"', 'data-filter="cta"', 'boardList', 'boardPagination'].every(token => board.includes(token)));

const docs = read('apps/public/documents/index.html');
add('documents:form-preserved', ['id="docForm"', 'id="docState"', 'id="docView"'].every(token => docs.includes(token)));

const checkout = read('apps/public/checkout/index.html');
add('checkout:required-ids-preserved', ['buyerEmail', 'plan', 'privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent', 'checkoutBtn', 'completeBtn', 'checkoutState', 'orderSummary'].every(id => checkout.includes(`id="${id}"`)));
add('checkout:refund-visible', checkout.includes('환불·취소 안내'));

const passed = checks.filter(c => c.ok).length;
const failed = checks.length - passed;
const report = {
  generatedAt: new Date().toISOString(),
  ok: failed === 0,
  phase: 179,
  title: 'unified infographic design system package QA',
  total: checks.length,
  passed,
  failed,
  checks
};

fs.writeFileSync(path.join(root, 'PHASE179_UNIFIED_DESIGN_SYSTEM_VALIDATION_20260503.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed, failed, report: 'PHASE179_UNIFIED_DESIGN_SYSTEM_VALIDATION_20260503.json' }, null, 2));
if (!report.ok) process.exit(1);
