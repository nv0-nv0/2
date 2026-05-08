import fs from 'node:fs';

const checks = [];
const add = (name, ok, note = '') => checks.push({ name, ok: !!ok, note });
const read = (file) => fs.readFileSync(file, 'utf8');

const plans = read('apps/public/plans/app.js');
const checkoutHtml = read('apps/public/checkout/index.html');
const checkoutJs = read('apps/public/checkout/app.js');
const paymentRoute = read('server/routes/payment.mjs');
const publicRoute = read('server/routes/public.mjs');
const boardApp = read('apps/public/board/app.js');

add('plans-paid-action-is-checkout-not-support', !plans.includes('/business-info?') && !/상담으로 신청|상담 신청/.test(plans), '유료 플랜 클릭이 고객지원/상담 우회로 빠지지 않아야 함');
add('plans-payment-labels', ['온라인 결제 가능','상세 리포트 결제','FixPack 바로 결제','Auto 정기 케어 결제'].every(x => plans.includes(x)), '구매 행동 문구는 결제 중심이어야 함');
add('checkout-public-copy-payment-first', ['온라인 결제 가능 상태','온라인 즉시 결제','결제 전 마지막 확인','온라인 결제 진행'].every(x => checkoutHtml.includes(x) || checkoutJs.includes(x)), '체크아웃은 결제 중심 공개 문구여야 함');
add('checkout-no-consultation-fallback', !/상담|고객지원 문의|필요 시 문의|고객지원으로 안내/.test(checkoutHtml + checkoutJs), '체크아웃에 상담 fallback 문구 금지');
add('server-payment-only-errors', paymentRoute.includes('paymentOnly: true') && !paymentRoute.includes('고객지원 이메일로 신청'), '결제 미설정 오류도 고객지원 접수 전환이 아니라 결제 환경 오류로 반환');
add('board-api-category-counts-by-boardType', publicRoute.includes("const boardTypeCount = type => publicPosts.filter(item => item.boardType === type).length;"), 'type=cta가 모든 글을 CTA 카운트로 오염시키면 안 됨');
add('board-api-filter-by-boardType', publicRoute.includes("normalizedFilter === 'all' || item.boardType === normalizedFilter"), 'CTA/공지/사례 필터는 boardType 기준이어야 함');
add('board-client-count-message', boardApp.includes('필터 대상') && boardApp.includes('자동 발행') && boardApp.includes('stats.autoPublished'), '목록 5개와 전체/필터/자동발행 수를 분리 표시');

const failed = checks.filter(item => !item.ok);
const result = { phase: 'PHASE215_PAYMENT_BOARD_NORMALIZATION', checkedAt: new Date().toISOString(), total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks };
fs.writeFileSync('PHASE215_PAYMENT_BOARD_NORMALIZATION_VALIDATION_20260508.json', JSON.stringify(result, null, 2));
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.note ? ` — ${item.note}` : ''}`);
if (failed.length) process.exit(1);
