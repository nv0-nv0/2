import { createRedisClient } from '../redis/redis-client.mjs';

export function createDistributedLock(env = process.env, logger = console) {
  const mode = String(env.NV0_LOCK_PROVIDER || (env.NV0_REDIS_URL ? 'redis' : 'memory')).trim();
  const redis = createRedisClient(env, logger);
  const memory = new Map();

  return {
    mode,
    redisEnabled: mode === 'redis' && redis.enabled,
    async acquire(key, ttlSec = 10) {
      if (mode === 'redis' && redis.enabled) {
        const value = await redis.set(`lock:${key}`, '1', { ttlSec, onlyIfNotExists: true });
        if (value === 'OK') return true;
      }
      const now = Date.now();
      const until = memory.get(key) || 0;
      if (until > now) return false;
      memory.set(key, now + ttlSec * 1000);
      return true;
    },
    async release(key) {
      if (mode === 'redis' && redis.enabled) await redis.del(`lock:${key}`);
      memory.delete(key);
    },
    async ping() {
      if (mode !== 'redis' || !redis.enabled) return false;
      return redis.ping();
    }
  };
}
