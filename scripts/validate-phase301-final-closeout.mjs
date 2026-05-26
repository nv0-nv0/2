import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const pkg = JSON.parse(read('package.json'));
const server = read('server/index.mjs');
const verifyProd = read('scripts/verify-prod.mjs');
const privacy = read('apps/public/privacy/index.html');
const terms = read('apps/public/terms/index.html');
const refund = read('apps/public/refund/index.html');
const business = read('apps/public/business-info/index.html');
const board = read('apps/public/board/index.html');
const phaseReport = exists('docs/PHASE301_FINAL_CLOSEOUT_REPORT.md') ? read('docs/PHASE301_FINAL_CLOSEOUT_REPORT.md') : '';

const checks = [];
function add(key, ok, weight, message = '') {
  checks.push({ key, ok: Boolean(ok), weight, message });
}
function noLegacyVisibleTokens(text) {
  return !/(<span class="brand-mark">\s*nv0\s*<\/span>|<a[^>]*class="nv0n-brand"[^>]*>\s*nv0\s*<\/a>|hello@nv0\.kr|© 2024|29,000원|89,000원|₩29,000|₩89,000)/i.test(text);
}
function noWrongBusinessActive(text) {
  return !text.includes('aria-current="page" class="nv0n-nav-link is-active" href="/business-info">문의하기</a>');
}

add('phase301 version and scripts', (/phase301-final-closeout|phase302-final-handoff|phase303-live-evidence-handoff|phase304-remaining-stage-closeout|phase305-integrity-closeout/.test(pkg.version)) && pkg.scripts['phase301:final']?.includes('validate:phase301') && (pkg.scripts['delivery:final'] === 'npm run phase301:final' || pkg.scripts['delivery:final'] === 'npm run phase302:final' || pkg.scripts['delivery:final'] === 'npm run phase303:final' || pkg.scripts['delivery:final'] === 'npm run phase304:final' || pkg.scripts['delivery:final'] === 'npm run phase305:final'), 10, 'delivery gate points to phase301');
add('duplicate topbar injection blocked', server.includes("nextBody.includes('nv0n-topbar')") && server.includes('<span class="brand-mark">VERIDION</span>'), 16, 'server no longer injects legacy nv0 topbar above native VERIDION header');
add('live verification expanded to legal and board pages', ['/privacy', '/terms', '/refund', '/business-info', '/board'].every(token => verifyProd.includes(token)) && verifyProd.includes('assertPublicPageHygiene'), 16, 'verify-prod checks legal, board, price, legacy brand, duplicate topbar');
add('canonical price lock retained', read('shared/product-catalog.mjs').includes('Report: 49000') && read('shared/product-catalog.mjs').includes('Expert: 149000') && verifyProd.includes('₩49,000') && verifyProd.includes('₩149,000'), 12, 'catalog and live gate enforce public prices');
add('legal pages are production-expanded', privacy.includes('제3자 제공과 처리위탁') && privacy.includes('정보주체 권리') && terms.includes('금지 행위') && terms.includes('분쟁 처리') && refund.includes('오류·중복 결제') && business.includes('사업자등록번호'), 16, 'legal pages contain expanded commercial terms');
add('legal top navigation not falsely active', noWrongBusinessActive(privacy) && noWrongBusinessActive(terms) && noWrongBusinessActive(refund) && business.includes('aria-current="page" class="nv0n-nav-link is-active" href="/business-info"'), 8, 'privacy/terms/refund no longer mark contact as current page');
add('public visible legacy tokens blocked in critical pages', [privacy, terms, refund, business, board].every(noLegacyVisibleTokens), 10, 'critical pages have no legacy nv0 brand, old contact, old year, or old prices');
add('runtime release remains clean', JSON.stringify(JSON.parse(read('runtime/data/db.json'))) === JSON.stringify(JSON.parse(read('runtime/data/db.seed.json'))) && Array.isArray(JSON.parse(read('runtime/data/sessions.json'))) && JSON.parse(read('runtime/data/sessions.json')).length === 0, 6, 'runtime db equals seed and sessions empty');
add('phase301 closeout report exists', phaseReport.includes('Phase301') && phaseReport.includes('중복 상단 메뉴') && phaseReport.includes('verify:prod'), 6, 'closeout report documents fixes and validation');

const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
const failed = checks.filter(item => !item.ok);
const report = { ok: failed.length === 0 && score === 100, phase: 'phase301', score, total: 100, generatedAt: new Date().toISOString(), checks, failed };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE301_FINAL_CLOSEOUT_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
assert.equal(report.ok, true, `phase301 final closeout failed: ${failed.map(item => item.key).join(', ')}`);
