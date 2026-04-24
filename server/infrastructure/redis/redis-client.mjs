import net from 'node:net';

function parseRedisUrl(rawUrl = '') {
  const url = new URL(rawUrl || 'redis://127.0.0.1:6379/0');
  return {
    host: url.hostname || '127.0.0.1',
    port: Number(url.port || 6379),
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    db: Number((url.pathname || '/0').replace(/^\//, '') || 0)
  };
}

function encodeCommand(parts) {
  const list = Array.isArray(parts) ? parts : [parts];
  let payload = `*${list.length}\r\n`;
  for (const part of list) {
    const value = Buffer.from(String(part));
    payload += `$${value.length}\r\n${value.toString()}\r\n`;
  }
  return payload;
}

function parseRespMany(buffer) {
  let offset = 0;

  function readLine() {
    const end = buffer.indexOf('\r\n', offset);
    if (end === -1) throw new Error('Incomplete RESP line');
    const line = buffer.slice(offset, end);
    offset = end + 2;
    return line;
  }

  function parseAny() {
    const prefix = buffer[offset++];
    if (prefix === 43) return readLine(); // +
    if (prefix === 45) throw new Error(readLine()); // -
    if (prefix === 58) return Number(readLine()); // :
    if (prefix === 36) { // $
      const length = Number(readLine());
      if (length === -1) return null;
      const end = offset + length;
      const value = buffer.slice(offset, end);
      offset = end + 2;
      return value;
    }
    if (prefix === 42) { // *
      const count = Number(readLine());
      if (count === -1) return null;
      const items = [];
      for (let i = 0; i < count; i += 1) items.push(parseAny());
      return items;
    }
    throw new Error(`Unsupported RESP prefix: ${String.fromCharCode(prefix)}`);
  }

  const responses = [];
  while (offset < buffer.length) responses.push(parseAny());
  return responses;
}

async function execRedis(url, commands, timeoutMs = 3000) {
  const config = parseRedisUrl(url);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    const chunks = [];
    let settled = false;
    const queue = [];
    if (config.password) {
      if (config.username) queue.push(['AUTH', config.username, config.password]);
      else queue.push(['AUTH', config.password]);
    }
    if (Number.isFinite(config.db) && config.db > 0) queue.push(['SELECT', String(config.db)]);
    for (const command of commands) queue.push(command);

    const finalize = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn(value);
    };

    const timer = setTimeout(() => finalize(reject, new Error('Redis request timeout')), timeoutMs);

    socket.on('connect', () => {
      for (const command of queue) socket.write(encodeCommand(command));
    });
    socket.on('data', chunk => chunks.push(chunk));
    socket.on('error', error => finalize(reject, error));
    socket.on('end', () => {
      try {
        const responses = parseRespMany(Buffer.concat(chunks));
        const relevant = responses.slice(responses.length - commands.length);
        finalize(resolve, relevant.map(item => Buffer.isBuffer(item) ? item.toString('utf8') : item));
      } catch (error) {
        finalize(reject, error);
      }
    });
  });
}

export function createRedisClient(env = process.env, logger = console) {
  const url = String(env.NV0_REDIS_URL || '').trim();
  const enabled = Boolean(url);
  const timeoutMs = Number(env.NV0_REDIS_TIMEOUT_MS || 3000);
  let warned = false;

  async function run(...commands) {
    if (!enabled) return null;
    return execRedis(url, commands, timeoutMs);
  }

  async function safeRun(...commands) {
    if (!enabled) return { ok: false, disabled: true, values: [] };
    try {
      const values = await run(...commands);
      return { ok: true, disabled: false, values };
    } catch (error) {
      if (!warned) {
        warned = true;
        logger.warn?.('[redis-client-disabled-fallback]', { message: error.message });
      }
      return { ok: false, disabled: false, error, values: [] };
    }
  }

  return {
    enabled,
    async ping() {
      const result = await safeRun(['PING']);
      return result.ok && result.values[0] === 'PONG';
    },
    async get(key) {
      const result = await safeRun(['GET', key]);
      return result.ok ? result.values[0] ?? null : null;
    },
    async set(key, value, options = {}) {
      const args = ['SET', key, value];
      if (options.onlyIfNotExists) args.push('NX');
      if (options.ttlSec) args.push('EX', String(options.ttlSec));
      const result = await safeRun(args);
      return result.ok ? result.values[0] : null;
    },
    async del(key) {
      const result = await safeRun(['DEL', key]);
      return result.ok ? Number(result.values[0] || 0) : 0;
    },
    async incr(key) {
      const result = await safeRun(['INCR', key]);
      return result.ok ? Number(result.values[0] || 0) : null;
    },
    async expire(key, ttlSec) {
      const result = await safeRun(['EXPIRE', key, String(ttlSec)]);
      return result.ok ? Number(result.values[0] || 0) === 1 : false;
    }
  };
}
