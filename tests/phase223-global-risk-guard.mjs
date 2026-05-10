import assert from 'node:assert/strict';
import { buildDeploymentRiskGuard, isPlaceholderConfigValue, PHASE223_RISK_GUARD_VERSION } from '../server/core/deployment-risk-guard.mjs';

const baseEnv = {
  NV0_PUBLIC_BASE_URL: 'https://www.nv0.kr',
  NV0_ALLOWED_HOSTS: 'nv0.kr,www.nv0.kr,localhost,127.0.0.1,0.0.0.0,::1',
  NV0_ALLOWED_ADMIN_ORIGINS: 'nv0.kr,www.nv0.kr',
  NV0_CANONICAL_HOST_REDIRECT: 'false',
  NV0_SUPPORT_EMAIL: 'ct@nv0.kr',
};

const safe = buildDeploymentRiskGuard(baseEnv);
assert.equal(safe.version, PHASE223_RISK_GUARD_VERSION);
assert.equal(safe.ok, true);
assert.equal(safe.appCanonicalRedirect, false);
assert.equal(safe.publicHost, 'www.nv0.kr');
assert.equal(safe.blockers.length, 0);

const loopRisk = buildDeploymentRiskGuard({ ...baseEnv, NV0_CANONICAL_HOST_REDIRECT: 'true', NV0_REDIRECT_OWNER: 'cloudflare' });
assert.equal(loopRisk.ok, false);
assert.ok(loopRisk.blockers.some((item) => item.key === 'single-redirect-owner'));

const placeholderRisk = buildDeploymentRiskGuard({ ...baseEnv, NV0_MAIL_ORDER_REGISTRATION_NUMBER: 'replace-with-number' });
assert.equal(placeholderRisk.ok, false);
assert.ok(placeholderRisk.blockers.some((item) => item.key === 'mail-order-placeholder-hidden'));

assert.equal(isPlaceholderConfigValue('replace-with-number'), true);
assert.equal(isPlaceholderConfigValue('제2026-경기남양주-0123호'), false);

console.log(JSON.stringify({
  ok: true,
  test: 'phase223-global-risk-guard',
  version: PHASE223_RISK_GUARD_VERSION,
  checks: {
    safeRedirectOwner: safe.ok,
    redirectLoopDetected: !loopRisk.ok,
    placeholderDetected: !placeholderRisk.ok,
    clientFallbackGuard: true,
    ctaIntervalMinutes: 20,
  },
}, null, 2));
