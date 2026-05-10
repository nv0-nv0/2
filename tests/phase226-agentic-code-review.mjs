import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeStringEqual, hasValidOrderAccessToken } from '../server/core/access-token.mjs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
  }
}

check('access token compare accepts byte-identical tokens', () => {
  assert.equal(timingSafeStringEqual('guest_access_token_123', 'guest_access_token_123'), true);
});

check('access token compare rejects ASCII mismatches', () => {
  assert.equal(timingSafeStringEqual('guest_access_token_123', 'guest_access_token_124'), false);
});

check('access token compare rejects UTF-8 byte-length mismatches without throwing', () => {
  const expected = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const sameJavaScriptLengthDifferentByteLength = '한'.repeat(expected.length);
  assert.doesNotThrow(() => timingSafeStringEqual(expected, sameJavaScriptLengthDifferentByteLength));
  assert.equal(timingSafeStringEqual(expected, sameJavaScriptLengthDifferentByteLength), false);
});

check('order access helper trims candidate tokens and rejects empty values', () => {
  assert.equal(hasValidOrderAccessToken({ accessToken: 'token-1' }, ' token-1 '), true);
  assert.equal(hasValidOrderAccessToken({ accessToken: 'token-1' }, ''), false);
  assert.equal(hasValidOrderAccessToken(null, 'token-1'), false);
});

check('public route dispatcher no longer carries unreachable commerce duplicates', () => {
  const publicRoutes = read('server/routes/public.mjs');
  const delegated = publicRoutes.includes('createPaymentRouteHandler(ctx)');
  const duplicateCheckoutBranch = publicRoutes.includes("pathname === '/api/public/checkout-session'");
  const duplicateRefundBranch = publicRoutes.includes("pathname === '/api/public/refund-request'");
  assert.equal(delegated, true);
  assert.equal(duplicateCheckoutBranch, false);
  assert.equal(duplicateRefundBranch, false);
});

check('payment route uses shared token-safe comparison helper', () => {
  const paymentRoutes = read('server/routes/payment.mjs');
  assert.match(paymentRoutes, /timingSafeStringEqual\(order\.accessToken, body\.accessToken\)/);
  assert.doesNotMatch(paymentRoutes, /body\.accessToken\.length === order\.accessToken\.length/);
});

check('README and closeout report document the review patch', () => {
  assert.match(read('README.md'), /Phase226 Agentic Code Review/i);
  assert.match(read('PHASE226_AGENTIC_CODE_REVIEW_CLOSEOUT_20260511_KO.md'), /잠재 버그/);
});

const failed = checks.filter(item => !item.ok);
const report = {
  ok: failed.length === 0,
  phase: 'phase226-agentic-code-review',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  reviewedAreas: [
    'guest order access token comparison',
    'refund authorization token comparison',
    'public/payment route split',
    'function-level security comments',
    'README and closeout documentation'
  ]
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
