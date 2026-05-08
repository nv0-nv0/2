import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
let failed = 0;
function ok(name, condition, detail = '') {
  if (condition) console.log(`PASS ${name}`);
  else { failed += 1; console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const plans = read('apps/public/plans/app.js');
const checkout = read('apps/public/checkout/index.html') + '\n' + read('apps/public/checkout/app.js');
const paymentRoute = read('server/routes/payment.mjs');
const publicRoute = read('server/routes/public.mjs');
const boardApp = read('apps/public/board/app.js');
const boardHtml = read('apps/public/board/index.html');

ok('paid plan CTA never links to customer support', !plans.includes('/business-info?') && !plans.includes('intent=\'support\'') && !plans.includes('상담으로 신청'));
ok('paid plan checkout href is unconditional for paid plans', /function checkoutHref\(plan, siteId\)[\s\S]*return `\/checkout\?\$\{params\.toString\(\)\}`/.test(plans));
ok('paid CTA labels are payment-oriented', ['상세 리포트 결제', 'FixPack 바로 결제', 'Auto 정기 케어 결제'].every(token => plans.includes(token)));
ok('checkout page avoids consultation fallback copy', !/상담|고객지원 문의|필요 시 문의|고객지원으로 안내/.test(checkout));
ok('checkout page is online payment oriented', ['온라인 즉시 결제', '온라인 결제 진행', '결제 전 마지막 확인'].every(token => checkout.includes(token)));
ok('payment route returns payment-only configuration errors', paymentRoute.includes('paymentOnly: true') && !paymentRoute.includes('고객지원 이메일로 신청') && !paymentRoute.includes('supportEmail: BUSINESS_PROFILE.contactEmail'));
ok('board filter uses boardType only', publicRoute.includes("const filtered = publicPosts.filter(item => normalizedFilter === 'all' || item.boardType === normalizedFilter);") && publicRoute.includes("const boardTypeCount = type => publicPosts.filter(item => item.boardType === type).length;"));
ok('board stats separate cta category and autoPublished total', publicRoute.includes("cta: boardTypeCount('cta')") && publicRoute.includes('autoPublished: autoPublishedCount'));
ok('board client renders total/page/filter counts honestly', boardApp.includes('필터 대상') && boardApp.includes('현재') && boardApp.includes('stats.autoPublished'));
ok('fallback board counts are mathematically consistent', boardApp.includes('const FALLBACK_STATS = { total: 5, cta: 2, notice: 1, case: 2, autoPublished: 5') && boardHtml.includes('data-board-stat="cta">2'));

if (failed) process.exit(1);
