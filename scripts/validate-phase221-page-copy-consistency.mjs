import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const publicDir = path.join(root, 'apps/public');

const walk = (dir, acc = []) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
};

const appFiles = walk(publicDir).filter((file) => /\.(html|js|mjs)$/.test(file));
const userFacingServerFiles = [
  'server/index.mjs',
  'server/core/cta-publication.mjs',
  'server/core/diagnosis-report-package.mjs',
  'server/core/product-intelligence.mjs',
  'server/core/premium-asset-builder.mjs',
  'server/core/service-quality-220.mjs',
].filter(exists).map((file) => path.join(root, file));

const checkedFiles = [...appFiles, ...userFacingServerFiles];
const textOf = (file) => fs.readFileSync(file, 'utf8');

const failures = [];
const addFailure = (label, file, detail) => failures.push({
  label,
  file: file ? path.relative(root, file) : null,
  detail,
});

const inconsistentTerms = [
  '플랜 비교',
  'Pro 리포트',
  'Free Demo',
  'Auto 케어',
  'Auto 정기 점검',
  '정기 점검 상품',
  '상품 비교',
  '케어으로',
  '상세 상세',
];

const brokenRenderedTokens = [
  'replace-with-number',
  'undefined',
  'NaN',
  '[object Object]',
  'TODO',
  'TBD',
  'lorem',
];

for (const file of checkedFiles) {
  const body = textOf(file);
  for (const token of inconsistentTerms) {
    if (body.includes(token)) addFailure('forbidden inconsistent wording', file, token);
  }
}

const publicHtml = appFiles.filter((file) => file.endsWith('.html'));

for (const file of publicHtml) {
  const body = textOf(file);
  for (const token of brokenRenderedTokens) {
    if (body.includes(token)) addFailure('forbidden rendered token', file, token);
  }
}

const canonicalNav = ['무료 진단', '상품·요금', '콘텐츠 보드', '문서 생성', '내 사이트', '고객지원'];

for (const file of publicHtml) {
  const rel = path.relative(root, file);
  const body = textOf(file);
  if (rel.includes('/portal/')) {
    for (const token of ['무료 진단', '상품·요금', '콘텐츠 보드', '고객지원']) {
      if (!body.includes(`>${token}<`)) addFailure('portal nav core label missing', file, token);
    }
    continue;
  }
  if (rel.includes('/admin/')) continue;
  for (const label of canonicalNav) {
    if (!body.includes(`>${label}<`)) addFailure('public nav label missing', file, label);
  }
}

const planHtml = read('apps/public/plans/index.html');
const checkoutHtml = read('apps/public/checkout/index.html');
const homeHtml = read('apps/public/home/index.html');
const plansJs = read('apps/public/plans/app.js');
const checkoutJs = read('apps/public/checkout/app.js');
const serverIndex = read('server/index.mjs');

const productMatrix = [
  ['상세 리포트', '39,000원', 'Report'],
  ['FixPack', '79,000원', 'FixPack'],
  ['Auto 정기 케어', '149,000원', 'Auto'],
];

for (const [title, price, code] of productMatrix) {
  for (const [fileName, body] of [
    ['apps/public/plans/index.html', planHtml],
    ['apps/public/checkout/index.html', checkoutHtml],
    ['apps/public/home/index.html', homeHtml],
  ]) {
    if (!body.includes(title)) addFailure('product title missing from page matrix', path.join(root, fileName), title);
    if (!body.includes(price)) addFailure('product price missing from page matrix', path.join(root, fileName), price);
    if (!body.includes(`/checkout?plan=${code}`) && fileName !== 'apps/public/checkout/index.html') {
      addFailure('checkout link missing from product page matrix', path.join(root, fileName), code);
    }
  }
  for (const [fileName, body] of [
    ['apps/public/plans/app.js', plansJs],
    ['apps/public/checkout/app.js', checkoutJs],
    ['server/index.mjs', serverIndex],
  ]) {
    if (!body.includes(title)) addFailure('runtime product title missing', path.join(root, fileName), title);
    const rawPrice = price.replace(/원/g, '').replace(/,/g, '');
    if (!body.includes(rawPrice)) addFailure('runtime product price missing', path.join(root, fileName), rawPrice);
  }
}

const titleExpectations = [
  ['apps/public/home/index.html', 'NV0 / Veridion | AI 기반 웹사이트 신뢰 진단 & 전환 개선 플랫폼'],
  ['apps/public/veridion-demo/index.html', '무료 진단 | NV0 / Veridion'],
  ['apps/public/plans/index.html', '상품·요금 | NV0 / Veridion'],
  ['apps/public/board/index.html', '콘텐츠 보드 | NV0 / Veridion'],
  ['apps/public/checkout/index.html', '결제 확인 | NV0 / Veridion'],
  ['apps/public/documents/index.html', '문서·작업지시서 생성 | NV0 / Veridion'],
  ['apps/public/portal/index.html', '내 사이트 관리 | NV0 / Veridion'],
];

for (const [file, title] of titleExpectations) {
  if (!read(file).includes(`<title>${title}</title>`)) addFailure('canonical title mismatch', path.join(root, file), title);
}

const qualityTerms = [
  '정확도 계약',
  '오탐 방어',
  '수동 확인',
  '품질 게이트',
  '근거 매트릭스',
  '재점검 기준',
];
const demoJs = read('apps/public/veridion-demo/app.js');
for (const token of qualityTerms) {
  if (!demoJs.includes(token) && !checkoutHtml.includes(token)) addFailure('phase220 quality wording missing', null, token);
}

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
if (!scripts['test:phase221']) addFailure('package script missing', null, 'test:phase221');
if (!scripts['validate:phase221']) addFailure('package script missing', null, 'validate:phase221');
if (!scripts['phase221:final']) addFailure('package script missing', null, 'phase221:final');
if (scripts['phase221:final'] && !scripts['phase221:final'].includes('phase220:final')) {
  addFailure('phase221 final must preserve phase220 regression', null, scripts['phase221:final']);
}

const result = {
  ok: failures.length === 0,
  phase: 'phase221',
  name: 'page-copy-consistency-unification',
  checkedAt: new Date().toISOString(),
  scoreAfterPatch: failures.length ? Math.max(0, 100 - failures.length * 5) : 100,
  totalChecks: checkedFiles.length + publicHtml.length + productMatrix.length * 6 + titleExpectations.length + qualityTerms.length + 4,
  failedChecks: failures,
  canonicalCopySystem: {
    nav: canonicalNav,
    products: {
      Report: '상세 리포트 · 39,000원 · 1회',
      FixPack: 'FixPack · 79,000원 · 1회',
      Auto: 'Auto 정기 케어 · 149,000원 · 월',
    },
    forbiddenTerms: [...inconsistentTerms, ...brokenRenderedTokens],
  },
};

const out = path.join(root, 'PHASE221_PAGE_COPY_CONSISTENCY_VALIDATION_20260510.json');
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
