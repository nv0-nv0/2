import { createRedisClient } from '../redis/redis-client.mjs';

export function createSessionStore(env = process.env, logger = console) {
  const mode = String(env.NV0_SESSION_STORE || (env.NV0_REDIS_URL ? 'redis' : 'memory')).trim();
  const redis = createRedisClient(env, logger);
  const memory = new Map();

  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
  }

  return {
    mode,
    redisEnabled: mode === 'redis' && redis.enabled,
    async get(sid) {
      if (mode === 'redis' && redis.enabled) {
        const raw = await redis.get(`sess:${sid}`);
        if (raw) return JSON.parse(raw);
      }
      return clone(memory.get(sid) || null);
    },
    async set(sid, session, ttlSec) {
      const payload = clone(session);
      if (mode === 'redis' && redis.enabled) {
        const status = await redis.set(`sess:${sid}`, JSON.stringify(payload), { ttlSec });
        if (status === 'OK') return true;
      }
      memory.set(sid, payload);
      return true;
    },
    async delete(sid) {
      if (mode === 'redis' && redis.enabled) await redis.del(`sess:${sid}`);
      memory.delete(sid);
    },
    async prime(rows = []) {
      memory.clear();
      for (const row of rows) {
        if (!row?.sid) continue;
        memory.set(row.sid, clone(row));
        if (mode === 'redis' && redis.enabled) {
          const ttlSec = Math.max(1, Math.ceil((Number(row.expiresAt || Date.now()) - Date.now()) / 1000));
          await redis.set(`sess:${row.sid}`, JSON.stringify(row), { ttlSec });
        }
      }
    },
    async ping() {
      if (mode !== 'redis' || !redis.enabled) return false;
      return redis.ping();
    }
  };
}
