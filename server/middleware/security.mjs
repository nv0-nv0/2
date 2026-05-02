// Phase167 request security gate for Node's native http.createServer flow.
// It returns a pre-parsed native request state so downstream route handlers do not re-parse URL.
export function createSecurityMiddleware({ isAllowedHost, text, baseHeaders, requestUrlFrom, redirect }) {
  return function applyHttpSecurityGate(req, res) {
    if (!isAllowedHost(req)) {
      text(req, res, 421, 'Misdirected Request');
      return { handled: true, reason: 'host_rejected' };
    }
    const requestUrl = requestUrlFrom(req);
    const pathname = requestUrl.pathname;
    const method = String(req.method || 'GET').toUpperCase();
    const routeState = Object.freeze({ requestUrl, pathname, method, routeKey: `${method} ${pathname}` });
    req._nv0Url = requestUrl;
    req._nv0RouteState = routeState;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { allow: 'GET, HEAD, POST, OPTIONS', ...baseHeaders(req) });
      res.end();
      return { handled: true, reason: 'preflight', ...routeState };
    }
    if (pathname.length > 1 && pathname.endsWith('/')) {
      requestUrl.pathname = pathname.replace(/\/+$/, '');
      redirect(req, res, 308, requestUrl.pathname + requestUrl.search);
      return { handled: true, reason: 'canonical_redirect', ...routeState };
    }
    return { handled: false, ...routeState };
  };
}
