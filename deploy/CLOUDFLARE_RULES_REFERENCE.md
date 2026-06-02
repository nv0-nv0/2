# Cloudflare Free Rules Reference for nv0.kr / Veridion

## SSL/TLS
- SSL/TLS encryption mode: Full (strict)
- Always Use HTTPS: ON
- Automatic HTTPS Rewrites: ON
- Minimum TLS Version: 1.2 or 1.3
- TLS 1.3: ON
- HTTP/3 (with QUIC): ON

## Cache Rules
1. Bypass cache for admin and API
   - Expression: http.request.uri.path starts_with "/admin" or http.request.uri.path starts_with "/api/"
   - Action: Bypass cache

2. Cache static assets aggressively
   - Expression: http.request.uri.path starts_with "/shared/" or http.request.uri.path contains "/app.css" or http.request.uri.path contains "/app.js"
   - Action: Eligible for cache / respect origin / cache reserve not required

3. Bypass dynamic checkout/portal if sessionised
   - Expression: http.request.uri.path eq "/checkout" or http.request.uri.path eq "/portal"
   - Action: Bypass cache

## Security / Bots
- Bot Fight Mode: ON
- Turnstile: enable for /demo, /products/veridion/demo, /admin
- Rate limit rule priority 1: /api/admin/session
- Rate limit rule priority 2 (when plan/slots allow): /api/public/scan

## DNS
- A record for root: proxied
- CNAME www -> root: proxied

## Origin
- Install Cloudflare Origin CA certificate on the Coolify fronted origin
- Keep direct origin IP undisclosed where possible
