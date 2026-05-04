import crypto from 'node:crypto';

export function createRequestId(prefix = 'req') {
  const value = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
  return `${prefix}_${value.replace(/-/g, '').slice(0, 24)}`;
}

export function apiOk(data = {}, meta = {}) {
  return { ok: true, data, meta: { requestId: meta.requestId || null, generatedAt: meta.generatedAt || new Date().toISOString(), ...meta } };
}

export function apiFail(error = {}, meta = {}) {
  const status = Number(error.status || error.statusCode || 500);
  return {
    ok: false,
    error: {
      code: error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: error.publicMessage || error.message || '요청을 처리하지 못했습니다.',
      status
    },
    meta: { requestId: meta.requestId || null, generatedAt: meta.generatedAt || new Date().toISOString(), ...meta }
  };
}

export function withRequestId(req, res, options = {}) {
  const headerName = options.headerName || 'x-request-id';
  const existing = req?.headers?.[headerName] || req?.headers?.['x-correlation-id'];
  const requestId = String(existing || '').trim().slice(0, 96) || createRequestId(options.prefix || 'req');
  if (req) req.requestId = requestId;
  if (res && typeof res.setHeader === 'function' && !res.headersSent) res.setHeader(headerName, requestId);
  return requestId;
}

export function normalizeApiError(error) {
  const status = Number(error?.status || error?.statusCode || (error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : 500));
  return apiFail({
    status,
    code: error?.code || (status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR'),
    publicMessage: status >= 500 ? '서버 오류가 발생했습니다.' : (error?.message || '요청을 처리하지 못했습니다.')
  }, { requestId: error?.requestId || null });
}
