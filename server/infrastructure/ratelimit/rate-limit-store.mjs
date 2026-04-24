import { createRedisClient } from '../redis/redis-client.mjs';

export function createRateLimitStore(env = process.env, logger = console) {
  const mode = String(env.NV0_RATE_LIMIT_STORE || (env.NV0_REDIS_URL ? 'redis' : 'memory')).trim();
  const redis = createRedisClient(env, logger);
  const memory = new Map();

  return {
    mode,
    redisEnabled: mode === 'redis' && redis.enabled,
    async hit(scope, key, { windowMs, limit }) {
      const bucketKey = `${scope}:${key}`;
      const now = Date.now();
      if (mode === 'redis' && redis.enabled) {
        const redisKey = `rl:${bucketKey}`;
        const count = await redis.incr(redisKey);
        if (count !== null) {
          if (count === 1) await redis.expire(redisKey, Math.max(1, Math.ceil(windowMs / 1000)));
          return {
            blocked: count > limit,
            remaining: Math.max(0, limit - count),
            resetAt: now + windowMs
          };
        }
      }
      const bucket = memory.get(bucketKey) || { count: 0, resetAt: now + windowMs };
      if (bucket.resetAt <= now) {
        bucket.count = 0;
        bucket.resetAt = now + windowMs;
      }
      bucket.count += 1;
      memory.set(bucketKey, bucket);
      return {
        blocked: bucket.count > limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt
      };
    },
    async ping() {
      if (mode !== 'redis' || !redis.enabled) return false;
      return redis.ping();
    }
  };
}
