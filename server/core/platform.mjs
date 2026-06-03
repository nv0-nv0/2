export const PLATFORM_TARGETS = Object.freeze({
  MVP: 'mvp',
  COMMERCIAL: 'commercial'
});

export function createPlatformProfile(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || 'development');
  const target = String(env.NV0_PLATFORM_TARGET || PLATFORM_TARGETS.MVP).trim().toLowerCase();
  const paymentProvider = String(env.NV0_PAYMENT_PROVIDER || (target === PLATFORM_TARGETS.COMMERCIAL ? 'portone_v2' : 'demo')).trim();
  const storageMode = String(env.NV0_STORAGE_MODE || (target === PLATFORM_TARGETS.COMMERCIAL ? 's3' : 'local_fs')).trim();
  const adminAuthMode = String(env.NV0_ADMIN_AUTH_MODE || (target === PLATFORM_TARGETS.COMMERCIAL ? 'account_rbac' : 'shared_key')).trim();
  const scanProvider = String(env.NV0_SCAN_PROVIDER || (target === PLATFORM_TARGETS.COMMERCIAL ? 'external_http' : 'builtin')).trim();

  const commercial = target === PLATFORM_TARGETS.COMMERCIAL;
  return {
    nodeEnv,
    target: commercial ? PLATFORM_TARGETS.COMMERCIAL : PLATFORM_TARGETS.MVP,
    commercial,
    paymentProvider,
    storageMode,
    adminAuthMode,
    scanProvider,
    disallowSeedRoutes: commercial || nodeEnv === 'production',
    disallowDemoCompletion: commercial,
    requireCommercialControls() {
      if (!commercial) return [];
      const failures = [];
      if (paymentProvider === 'demo') failures.push('NV0_PAYMENT_PROVIDER must not be demo when NV0_PLATFORM_TARGET=commercial');
      if (storageMode === 'local_fs') failures.push('NV0_STORAGE_MODE must not be local_fs when NV0_PLATFORM_TARGET=commercial');
      if (adminAuthMode === 'shared_key') failures.push('NV0_ADMIN_AUTH_MODE must not be shared_key when NV0_PLATFORM_TARGET=commercial');
      if (String(env.NV0_ADMIN_MFA_REQUIRED || '').trim() !== 'true') failures.push('NV0_ADMIN_MFA_REQUIRED must be true when NV0_PLATFORM_TARGET=commercial');
      if (!String(env.NV0_ADMIN_TOTP_SECRET || '').trim()) failures.push('NV0_ADMIN_TOTP_SECRET is required when NV0_PLATFORM_TARGET=commercial');
      if (scanProvider === 'builtin') failures.push('NV0_SCAN_PROVIDER must not be builtin when NV0_PLATFORM_TARGET=commercial');
      if (String(env.NV0_PERSISTENCE_MODE || '').trim() !== 'postgres_primary') failures.push('NV0_PERSISTENCE_MODE must be postgres_primary when NV0_PLATFORM_TARGET=commercial');
      if (String(env.NV0_SESSION_STORE || '').trim() !== 'redis') failures.push('NV0_SESSION_STORE must be redis when NV0_PLATFORM_TARGET=commercial');
      if (String(env.NV0_RATE_LIMIT_STORE || '').trim() !== 'redis') failures.push('NV0_RATE_LIMIT_STORE must be redis when NV0_PLATFORM_TARGET=commercial');
      if (String(env.NV0_LOCK_PROVIDER || '').trim() !== 'redis') failures.push('NV0_LOCK_PROVIDER must be redis when NV0_PLATFORM_TARGET=commercial');
      return failures;
    }
  };
}

export function assertCommercialRouteAllowed(profile, capability) {
  if (!profile.commercial) return;
  if (capability === 'seed_route') throw new Error('COMMERCIAL_SEED_ROUTE_DISABLED');
  if (capability === 'demo_payment_complete') throw new Error('COMMERCIAL_DEMO_PAYMENT_DISABLED');
}
