import os from 'node:os';

export function logEvent(level, event, payload = {}) {
  const record = {
    level,
    event,
    at: new Date().toISOString(),
    pid: process.pid,
    hostname: os.hostname(),
    ...payload
  };
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  return record;
}

export function buildHealthDetails(options = {}) {
  const integrations = options.integrations || {};
  return {
    ok: Object.values(integrations).every((item) => item?.ok !== false),
    service: options.service || 'nv0-veridion',
    phase: options.phase || 'commercial-system-v1',
    generatedAt: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    runtime: {
      node: process.version,
      platform: process.platform,
      pid: process.pid
    },
    integrations
  };
}

export function classifyIncident(error = {}, context = {}) {
  const code = String(error.code || '').toUpperCase();
  const status = Number(error.status || error.statusCode || 500);
  const severity = status >= 500 || ['ECONNREFUSED','ETIMEDOUT','NV0_COMMERCIAL_ENV_INCOMPLETE'].includes(code) ? 'high' : status >= 400 ? 'medium' : 'low';
  return {
    severity,
    code: code || 'UNKNOWN',
    message: error.message || 'unknown incident',
    requestId: context.requestId || error.requestId || null,
    route: context.route || null,
    shouldNotify: severity === 'high'
  };
}
