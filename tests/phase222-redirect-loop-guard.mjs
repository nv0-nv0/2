import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSecurityMiddleware } from '../server/middleware/security.mjs';

function runGate({ host = 'www.nv0.kr', canonicalHostRedirect = false, pathname = '/' } = {}) {
  const redirects = [];
  const req = { method: 'GET', headers: { host } };
  const res = { writeHead() {}, end() {} };
  const gate = createSecurityMiddleware({
    isAllowedHost: () => true,
    text: () => { throw new Error('unexpected text response'); },
    baseHeaders: () => ({}),
    requestUrlFrom: () => new URL(`https://${host}${pathname}`),
    redirect: (_req, _res, status, location) => redirects.push({ status, location }),
    canonicalBaseUrl: 'https://nv0.kr',
    canonicalHostRedirect,
  });
  const result = gate(req, res);
  return { result, redirects };
}

const off = runGate({ canonicalHostRedirect: false, host: 'www.nv0.kr' });
assert.equal(off.redirects.length, 0, 'app host redirect must be off by default to avoid Cloudflare/app apex-www loops');
assert.equal(off.result.handled, false, 'request must continue when app canonical redirect is disabled');

const on = runGate({ canonicalHostRedirect: true, host: 'www.nv0.kr', pathname: '/plans' });
assert.equal(on.redirects.length, 1, 'explicit app canonical redirect should still work when enabled');
assert.equal(on.redirects[0].status, 308);
assert.equal(on.redirects[0].location, 'https://nv0.kr/plans');
assert.equal(on.result.reason, 'canonical_host_redirect');
assert.equal(on.result.phase222LoopGuard, 'app_redirect_opt_in');

const serverIndex = fs.readFileSync('server/index.mjs', 'utf8');
assert.ok(serverIndex.includes("process.env.NV0_CANONICAL_HOST_REDIRECT === 'true'"), 'server must opt in to app host redirect only when env is true');

for (const file of ['.env.example', '.env.coolify.example']) {
  const body = fs.readFileSync(file, 'utf8');
  assert.ok(body.includes('NV0_CANONICAL_HOST_REDIRECT=false'), `${file} must default to false`);
}

console.log(JSON.stringify({
  ok: true,
  test: 'phase222-redirect-loop-guard',
  appCanonicalRedirectDefault: 'off',
  explicitOptInRedirect: 'pass',
  edgeRedirectOwner: 'cloudflare_or_coolify_only',
}, null, 2));
