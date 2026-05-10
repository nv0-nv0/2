import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); }

const accessTokenCore = read('server/core/access-token.mjs');
const index = read('server/index.mjs');
const payment = read('server/routes/payment.mjs');
const publicRoutes = read('server/routes/public.mjs');
const test = read('tests/phase226-agentic-code-review.mjs');
const readme = read('README.md');
const closeout = read('PHASE226_AGENTIC_CODE_REVIEW_CLOSEOUT_20260511_KO.md');

add('shared access-token helper exists', accessTokenCore.includes('timingSafeStringEqual') && accessTokenCore.includes('hasValidOrderAccessToken'));
add('helper explains timingSafeEqual byte-length risk', /byte-length|UTF-8|500 response/.test(accessTokenCore));
add('index canAccessOrder uses helper', index.includes('hasValidOrderAccessToken(order, token)'));
add('payment refund route uses helper', payment.includes('timingSafeStringEqual(order.accessToken, body.accessToken)'));
add('public route delegates payment routes', publicRoutes.includes('const paymentHandled = await paymentRouteHandler'));
add('public route has no duplicated checkout branch', !publicRoutes.includes("pathname === '/api/public/checkout-session'"));
add('phase226 unit/regression test exists', test.includes('sameJavaScriptLengthDifferentByteLength') && test.includes('public route dispatcher no longer carries unreachable commerce duplicates'));
add('package exposes phase226 scripts', read('package.json').includes('test:phase226') && read('package.json').includes('validate:phase226-review'));
add('README includes phase226 runbook', /npm run phase226:final/.test(readme));
add('closeout documents limitations and findings', /남는 한계/.test(closeout) && /성능 개선/.test(closeout));

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase226-agentic-code-review-validation',
  checkedAt: new Date().toISOString(),
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
fs.writeFileSync(path.join(root, 'PHASE226_AGENTIC_CODE_REVIEW_VALIDATION_20260511.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
