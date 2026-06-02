// Request security gate for Node's native http.createServer flow.
// It returns a pre-parsed native request state so downstream route handlers do not re-parse URL.
function normalizeHostHeader(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) return raw.slice(1).split(']')[0];
  return raw.split(':')[0];
}
function canonicalBaseParts(canonicalBaseUrl = '') {
  try {
    const parsed = new URL(String(canonicalBaseUrl || '').trim());
    return { origin: parsed.origin.replace(/\/+$/, ''), host: parsed.hostname.toLowerCase(), protocol: parsed.protocol || 'https:' };
  } catch {
    return { origin: '', host: '', protocol: 'https:' };
  }
}
function shouldCanonicalHostRedirect(requestHost, canonicalHost) {
  if (!requestHost || !canonicalHost || requestHost === canonicalHost) return false;
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
  if (localHosts.has(requestHost)) return false;
  if (requestHost === `www.${canonicalHost}`) return true;
  if (canonicalHost === `www.${requestHost}`) return true;
  return false;
}

export function createSecurityMiddleware({ isAllowedHost, text, baseHeaders, requestUrlFrom, redirect, canonicalBaseUrl = '', canonicalHostRedirect = false }) {
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
    const canonical = canonicalBaseParts(canonicalBaseUrl);
    const currentHost = normalizeHostHeader(req.headers.host || '');
    // Canonical host guard: canonical host redirects are opt-in. In production, Cloudflare/Coolify
    // should own apex/www redirects unless NV0_CANONICAL_HOST_REDIRECT=true is set explicitly.
    // This prevents nv0.kr <-> www.nv0.kr redirect loops when an edge rule and app rule disagree.
    if (canonicalHostRedirect === true && shouldCanonicalHostRedirect(currentHost, canonical.host)) {
      const target = `${canonical.origin || `${canonical.protocol}//${canonical.host}`}${requestUrl.pathname}${requestUrl.search}`;
      redirect(req, res, 308, target);
      return { handled: true, reason: 'canonical_host_redirect', canonicalHostLoopGuard: 'app_redirect_opt_in', ...routeState };
    }
    if (pathname.length > 1 && pathname.endsWith('/')) {
      requestUrl.pathname = pathname.replace(/\/+$/, '');
      const target = canonical.origin && shouldCanonicalHostRedirect(currentHost, canonical.host)
        ? `${canonical.origin}${requestUrl.pathname}${requestUrl.search}`
        : requestUrl.pathname + requestUrl.search;
      redirect(req, res, 308, target);
      return { handled: true, reason: 'canonical_path_redirect', ...routeState };
    }
    return { handled: false, ...routeState };
  };
}
