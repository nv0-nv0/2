import { createPlatformProfile } from '../server/core/platform.mjs';

const env = {
  ...process.env,
  NV0_PLATFORM_TARGET: 'commercial',
  NV0_ADMIN_AUTH_MODE: 'account_rbac',
  NV0_PERSISTENCE_MODE: 'postgres_primary',
  NV0_SESSION_STORE: 'redis',
  NV0_RATE_LIMIT_STORE: 'redis',
  NV0_LOCK_PROVIDER: 'redis',
  NV0_STORAGE_MODE: 's3',
  NV0_SCAN_PROVIDER: 'external_http',
  NV0_PAYMENT_PROVIDER: 'portone_v2'
};

const profile = createPlatformProfile(env);
const failures = profile.requireCommercialControls();
if (!profile.commercial) failures.push('commercial profile was not selected');
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  checkedAt: new Date().toISOString(),
  platformTarget: profile.target,
  controls: {
    auth: env.NV0_ADMIN_AUTH_MODE,
    persistence: env.NV0_PERSISTENCE_MODE,
    session: env.NV0_SESSION_STORE,
    rateLimit: env.NV0_RATE_LIMIT_STORE,
    lock: env.NV0_LOCK_PROVIDER,
    storage: env.NV0_STORAGE_MODE,
    scan: env.NV0_SCAN_PROVIDER,
    payment: env.NV0_PAYMENT_PROVIDER
  }
}, null, 2));
process.exit(0);
