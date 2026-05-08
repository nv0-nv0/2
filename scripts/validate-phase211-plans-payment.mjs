import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = async (file) => fs.readFile(new URL(file, root), 'utf8');
const packageJson = JSON.parse(await read('package.json'));
const plansHtml = await read('apps/public/plans/index.html');
const plansJs = await read('apps/public/plans/app.js');
const checkoutHtml = await read('apps/public/checkout/index.html');
const checkoutJs = await read('apps/public/checkout/app.js');
const paymentRoute = await read('server/routes/payment.mjs');

const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }

add('plans:decision-first-order', plansHtml.indexOf('recommendedPlanCard') < plansHtml.indexOf('planCards') && plansHtml.indexOf('planCards') < plansHtml.indexOf('comparisonRows') && plansHtml.indexOf('comparisonRows') < plansHtml.indexOf('선택 가이드'));
add('plans:payment-readiness-visible', plansHtml.includes('paymentReadiness') && plansHtml.includes('paymentProductCodes'));
add('plans:single-checkout-catalog', plansJs.includes('/api/public/products') && plansJs.includes('/api/public/payment/config') && plansJs.includes('data-plan-code') && plansJs.includes('data-price'));
add('plans:paid-cta-to-checkout-only-when-ready', plansJs.includes('paymentConfig.paymentReady===false') && plansJs.includes('/business-info?reason=payment-not-ready') && plansJs.includes('/checkout?plan='));
add('checkout:runtime-payment-config', checkoutHtml.includes('paymentConfigState') && checkoutJs.includes('loadPaymentConfig') && checkoutJs.includes('paymentConfig.paymentReady'));
add('checkout:portone-sdk-guard', checkoutJs.includes('window.PortOne?.requestPayment') && checkoutJs.includes('결제창 로드 확인 중'));
add('checkout:server-complete-after-sdk', checkoutJs.includes('await completePayment()') && checkoutJs.includes('providerPaymentId: responsePaymentId'));
add('checkout:product-code-validation', checkoutJs.includes('선택한 상품코드를 확인하지 못했습니다') && checkoutJs.includes('normalizePlanCode'));
add('server:payment-config-endpoint', paymentRoute.includes("pathname === '/api/public/payment/config'") && paymentRoute.includes('productCodes') && paymentRoute.includes('endpoints'));
add('server:portone-missing-env-blocks-checkout', paymentRoute.includes("PAYMENT_PROVIDER === 'portone_v2' && !PORTONE_CLIENT?.enabled") && paymentRoute.includes('PortOne 결제 환경값이 완성되지 않았습니다'));
add('scripts:phase211-registered', Boolean(packageJson.scripts['test:phase211'] && packageJson.scripts['validate:phase211-plans-payment'] && packageJson.scripts['phase211:final']));

const failures = checks.filter(item => !item.ok);
assert.equal(failures.length, 0, `phase211 validation failed: ${JSON.stringify(failures, null, 2)}`);
const result = {
  ok: true,
  name: 'phase211-clean-plan-payment-ready',
  scoreTarget: 100,
  checks,
  manualOperationsToVerifyAfterDeploy: [
    '운영 환경 NV0_PAYMENT_PROVIDER=portone_v2 확인',
    'NV0_PORTONE_STORE_ID, NV0_PORTONE_CHANNEL_KEY, NV0_PORTONE_API_SECRET 설정 확인',
    'PortOne 실제 승인 1건 또는 테스트 채널 승인 검증',
    'PortOne 웹훅 수신과 /api/public/payment/complete 서버 검증 로그 확인'
  ],
  limitation: '로컬 패키지는 코드·정적 게이트·테스트 서버 기준 검증입니다. 실제 PortOne 승인과 정산은 운영 환경에서 직접 확인해야 하며 이 정보는 확인되지 않았습니다.'
};
await fs.writeFile(new URL('PHASE211_PLANS_PAYMENT_VALIDATION_20260508.json', root), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
