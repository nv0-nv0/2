import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const failures = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
    failures.push({ name, error: error.message });
  }
}

const plans = read('apps/public/plans/index.html');
const board = read('apps/public/board/index.html');
const checkout = read('apps/public/checkout/index.html');
const privacy = read('apps/public/privacy/index.html');
const refund = read('apps/public/refund/index.html');
const css = read('shared/veridion-rebrand.css');
const serverIndex = read('server/index.mjs');
const publicRoutes = read('server/routes/public.mjs');
const paymentRoutes = read('server/routes/payment.mjs');
const accountRoutes = read('server/routes/account.mjs');
const freeDiscovery = read('server/core/free-auto-discovery.mjs');
const phase340Validator = read('scripts/validate-phase340-redteam-closeout.mjs');
const phase341Validator = read('scripts/validate-phase341-final-closeout.mjs');

check('package:phase342-version', () => assert.match(pkg.version, /phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/));
check('package:delivery-final-current', () => assert.ok(['npm run phase342:final','npm run phase343:final','npm run phase345:final', 'npm run phase346:final', 'npm run phase347:final', 'npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final'].includes(pkg.scripts['delivery:final'])));
check('package:release-predeploy-current', () => assert.ok(['npm run phase342:final','npm run phase343:final','npm run phase345:final', 'npm run phase346:final', 'npm run phase347:final', 'npm run phase348:final', 'npm run phase349:final', 'npm run phase350:final'].includes(pkg.scripts['release:predeploy'])));
check('package:phase342-chains-phase341', () => assert.match(pkg.scripts['phase342:final'], /phase341:final/));
check('package:phase342-runs-validator', () => assert.match(pkg.scripts['phase342:final'], /validate:phase342/));
check('validators:accept-phase342', () => {
  assert.match(phase340Validator, /phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/);
  assert.match(phase341Validator, /phase342-merged-best|phase343-final-perfect|phase345-final-delivery-closeout|phase346-global-hardening-final|phase347-unified-diagnosis-final|phase348-final-unified-engine-closeout|phase349-customer-journey-closeout|phase350-global-cta-semantics-closeout|phase351-prompt-full-sweep-closeout/);
});

check('plans:four-tier-commercial-structure', () => {
  ['무료 진단','기본 리포트','전문가 검토','비즈니스','상세 비교표','결제 전 확인 사항과 진행 과정'].forEach(token => assert.ok(plans.includes(token), token));
  assert.ok(plans.includes('plans-grid'));
  assert.ok(plans.includes('₩49,000/회'));
  assert.ok(plans.includes('₩149,000/건'));
  assert.ok(plans.includes('별도 견적'));
});
check('plans:mobile-four-column-css-restored', () => {
  assert.ok(css.includes('.vr-decision-grid-four,.vr-pricing-enhanced'));
  assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
  assert.ok(css.includes('min-width:920px'));
});

const insightSlugs = [
  '/insights/refund-policy-checklist',
  '/insights/privacy-policy-checklist',
  '/insights/ecommerce-trust-checklist',
  '/insights/conversion-before-payment',
  '/insights/business-info-display',
  '/insights/mobile-checkout-trust'
];
check('board:links-to-six-static-insight-slugs', () => {
  for (const slug of insightSlugs) assert.ok(board.includes(slug), slug);
  ['체크리스트','상세 보기','난이도','사이트 무료 진단 실행'].forEach(token => assert.ok(board.includes(token), token));
});
check('insights:static-slug-files-exist', () => {
  for (const slug of insightSlugs) {
    const rel = `apps/public${slug}/index.html`;
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  }
});

check('checkout:rich-prepayment-disclosure', () => {
  ['환불 정책','고객 포털','PDF 리포트','전문가 검토','결제 실패','법률 자문인가요'].forEach(token => assert.ok(checkout.includes(token), token));
});
check('privacy:full-data-handling-disclosure', () => {
  ['암호화된 인증 정보','카드번호','직접 저장하지 않습니다','진단 URL과 결과 기록','로그와 분석 정보','query, hash, 민감 입력값','고객 권리'].forEach(token => assert.ok(privacy.includes(token), token));
});
check('refund:full-commercial-refund-flow', () => {
  ['리포트 생성이 시작되기 전','열람 가능한 상태','전문가 검토가 배정되기 전','기술 오류와 중복 결제','영업일 기준 3~7일','디지털 산출물 제공 기준'].forEach(token => assert.ok(refund.includes(token), token));
});

check('security:public-api-isolation-still-present', () => {
  assert.ok(fs.existsSync(path.join(root, 'scripts/check-public-api-isolation.mjs')));
  assert.ok(publicRoutes.includes('customerHiddenOperationalEndpoints'));
  assert.ok(publicRoutes.includes('/api/public/diagnosis-engine'));
  assert.ok(publicRoutes.includes('return json(req, res, 404'));
});
check('security:ssrf-dns-and-redirect-hardening-preserved', () => {
  ['isBlockedTargetUrlResolved','lookup(host, { all: true, verbatim: true })','redirect: \'manual\'','TARGET_FETCH_MAX_BYTES'].forEach(token => assert.ok(serverIndex.includes(token), token));
  ['isBlockedTargetUrlResolved','lookup(host, { all: true, verbatim: true })','redirect: \'manual\'','readLimitedText'].forEach(token => assert.ok(freeDiscovery.includes(token), token));
});
check('security:payment-and-account-guards-preserved', () => {
  ['NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS','PAYMENT_REDIRECT_ALLOWED_HOSTS','host_not_allowlisted'].forEach(token => assert.ok(serverIndex.includes(token), token));
  assert.ok(accountRoutes.includes('sameOriginAllowed'));
  ['origin','referer'].forEach(token => assert.ok(serverIndex.includes(token), token));
});
check('release:active-runtime-state-not-required', () => {
  assert.ok(fs.existsSync(path.join(root, 'scripts/clean-release-runtime.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'scripts/check-runtime-clean.mjs')));
});

if (failures.length) {
  console.error(JSON.stringify({ ok: false, phase: 'phase342-merged-best|phase343-final-perfect', total: checks.length, failed: failures.length, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, phase: 'phase342-merged-best|phase343-final-perfect', checks: checks.length, mergedStrengths: ['phase341 security baseline','uploaded public page copy depth','four-tier pricing','rich policy/refund disclosures','board-to-insight slug links'] }, null, 2));
