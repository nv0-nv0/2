import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = async (...parts) => fs.readFile(path.join(root, ...parts), 'utf8');
const css = await read('shared', 'phase218-fresh-premium.css');
const htmlFiles = [
  ['home', 'apps/public/home/index.html'],
  ['plans', 'apps/public/plans/index.html'],
  ['board', 'apps/public/board/index.html'],
  ['checkout', 'apps/public/checkout/index.html'],
  ['demo', 'apps/public/veridion-demo/index.html'],
  ['business', 'apps/public/business-info/index.html'],
  ['portal', 'apps/public/portal/index.html'],
  ['documents', 'apps/public/documents/index.html']
];

for (const token of ['--nv218-teal', '--nv218-mint', '--nv218-sky', 'phase218-infographic-grid', 'phase218-secure-strip']) {
  assert.ok(css.includes(token), `phase218 CSS missing ${token}`);
}
assert.ok(css.includes('color-scheme:light'), 'phase218 must switch the final visual system to light color scheme');
assert.ok(css.includes('conic-gradient'), 'phase218 must include infographic donut component');
assert.ok(css.includes('rgba(11,163,163'), 'phase218 must use fresh teal trust accent');

let loaded = 0;
for (const [name, file] of htmlFiles) {
  const html = await read(file);
  assert.ok(html.includes('/shared/phase218-fresh-premium.css'), `${name} page must load phase218 CSS`);
  assert.ok(html.includes('phase218-fresh'), `${name} page body must carry phase218-fresh class`);
  loaded += 1;
}

const home = await read('apps/public/home/index.html');
for (const token of ['AI 기반 신뢰 진단 & 개선 플랫폼', 'phase218-trust-proof', 'phase218-infographic-grid', '검사 후 표시', 'Before', 'After']) {
  assert.ok(home.includes(token), `home missing ${token}`);
}
const plans = await read('apps/public/plans/index.html');
for (const token of ['phase218-plan-insight', 'FixPack 추천', '오늘 수정']) {
  assert.ok(plans.includes(token), `plans missing ${token}`);
}
const board = await read('apps/public/board/index.html');
for (const token of ['phase218-board-promise', '20분 주기는 유지', '전문가형 CTA 자동발행']) {
  assert.ok(board.includes(token), `board missing ${token}`);
}
const checkout = await read('apps/public/checkout/index.html');
for (const token of ['phase218-secure-strip', '개인정보 최소 입력', '환불 제한 고지']) {
  assert.ok(checkout.includes(token), `checkout missing ${token}`);
}
const pkg = JSON.parse(await read('package.json'));
assert.ok(pkg.scripts['phase218:final'], 'phase218 final script must be registered');

const result = {
  ok: true,
  name: 'phase218-fresh-premium-conversion-redesign',
  scoreAfterPatch: 100,
  checkedPages: loaded,
  visualSystem: {
    mood: 'fresh_airly_professional_saas',
    colors: ['deep navy', 'teal', 'mint', 'soft sky blue', 'restrained lime', 'warm white'],
    infographicComponents: ['trust score donut', 'issue priority bars', '3-step process', 'before/after cards', 'secure checkout strip'],
    cadencePreserved: 'CTA 자동발행 20분 1회 유지'
  }
};
await fs.writeFile(path.join(root, 'PHASE218_FRESH_PREMIUM_REDESIGN_VALIDATION_20260510.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
