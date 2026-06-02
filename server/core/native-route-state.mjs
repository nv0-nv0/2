// Native HTTP request state utilities. No Express Router assumptions.
export function resolveNativeRouteState(req, fallbackBase = 'http://localhost') {
  if (req && req._nv0RouteState && req._nv0RouteState.requestUrl) return req._nv0RouteState;
  const base = req?.headers?.host ? `http://${req.headers.host}` : fallbackBase;
  const requestUrl = req && req._nv0Url ? req._nv0Url : new URL(req?.url || '/', base);
  const state = Object.freeze({
    requestUrl,
    pathname: requestUrl.pathname,
    method: String(req?.method || 'GET').toUpperCase(),
    routeKey: `${String(req?.method || 'GET').toUpperCase()} ${requestUrl.pathname}`
  });
  if (req) req._nv0RouteState = state;
  return state;
}

export function isSafeHttpMethod(method) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(String(method || '').toUpperCase());
}

export function createExactRouteMap(entries) {
  const map = new Map();
  const duplicates = [];
  for (const entry of entries) {
    const key = `${String(entry.method || 'GET').toUpperCase()} ${entry.pathname}`;
    if (map.has(key)) duplicates.push(key);
    map.set(key, entry.handler);
  }
  if (duplicates.length) {
    throw new Error(`Duplicate native route keys: ${duplicates.join(', ')}`);
  }
  return map;
}
