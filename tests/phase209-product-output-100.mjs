import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const service = read('apps/public/service/index.html');
const demo = read('apps/public/veridion-demo/app.js');
const plans = read('apps/public/plans/index.html');
const workOrder = read('PHASE209_PRODUCT_OUTPUT_100_WORK_ORDER_AND_TEST_REVIEW_20260508_KO.md');

assert(service.includes('phase209-product-100'), 'service 100 section missing');
assert((service.match(/<strong>100점<\/strong>/g) || []).length >= 4, 'service must show four 100-point output cards');
assert(!/(84점|86점|82점|80점|83점)/.test(service), 'service must not expose previous 80-point scores');
assert(demo.includes('renderPhase209CompletionScorecard'), 'demo completion scorecard function missing');
assert(demo.includes('phase209-completion-scorecard'), 'demo completion scorecard markup missing');
assert(plans.includes('phase209-plan-score-matrix'), 'plans 100 score matrix missing');
assert(plans.includes('20분 주기 게시판 자동 발행'), 'Auto 20-minute cadence copy missing in plans');
assert(workOrder.includes('100점 수용 기준') && workOrder.includes('테스트 리뷰'), 'phase209 work order/test review missing');

console.log(JSON.stringify({ ok: true, phase: '209-product-output-100-test', checkedAt: new Date().toISOString() }, null, 2));
