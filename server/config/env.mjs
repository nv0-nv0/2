// Phase166 environment reader for native Node http service.
// This intentionally returns plain values and avoids framework-specific assumptions.
export function readEnvConfig(env = process.env) {
  const csv = (name, fallback = '') => String(env[name] ?? fallback).split(',').map(v => v.trim()).filter(Boolean);
  const number = (name, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) => {
    const raw = env[name];
    const normalized = raw === undefined || String(raw).trim() === '' ? fallback : String(raw).trim();
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
    }
    return value;
  };
  const bool = (name, fallback = false) => {
    if (env[name] === undefined) return fallback;
    return String(env[name]).trim().toLowerCase() === 'true';
  };
  return Object.freeze({
    port: number('PORT', 3210, { min: 1, max: 65535 }),
    host: String(env.HOST || env.NV0_HOST || '0.0.0.0'),
    nodeEnv: String(env.NODE_ENV || 'development'),
    requestTimeoutMs: number('NV0_REQUEST_TIMEOUT_MS', 15000, { min: 1000, max: 120000 }),
    slowRequestThresholdMs: number('NV0_SLOW_REQUEST_THRESHOLD_MS', 1500, { min: 100, max: 60000 }),
    maxJsonBodyBytes: number('NV0_MAX_JSON_BODY_BYTES', 64 * 1024, { min: 1024, max: 1048576 }),
    maxMultipartBodyBytes: number('NV0_MAX_MULTIPART_BODY_BYTES', 5 * 1024 * 1024, { min: 1024, max: 20971520 }),
    allowedHosts: csv('NV0_ALLOWED_HOSTS', 'nv0.kr,www.nv0.kr,localhost,127.0.0.1,0.0.0.0,::1').map(v => v.toLowerCase()),
    adminIpAllowlist: csv('NV0_ADMIN_IP_ALLOWLIST'),
    allowedAdminOrigins: csv('NV0_ALLOWED_ADMIN_ORIGINS'),
    trustProxyHeaders: bool('NV0_TRUST_PROXY_HEADERS', false),
    publicCacheSeconds: number('NV0_PUBLIC_CACHE_SECONDS', 0, { min: 0, max: 86400 }),
    publicAssetCacheSeconds: number('NV0_PUBLIC_ASSET_CACHE_SECONDS', 0, { min: 0, max: 86400 })
  });
}
