# Phase15 loading stall hotfix

## Problem observed after deployment
Several public and admin pages rendered the initial HTML but stayed on loading states. The most likely browser-side blocker was an overly strict Content-Security-Policy combined with un-hashed static asset caching.

## Fixes applied
- Removed `require-trusted-types-for 'script'` from CSP because current client apps intentionally use escaped `innerHTML` rendering. This directive caused browser-side Trusted Types violations and stopped rendering code before it could replace loading placeholders.
- Added `https://cdn.portone.io` to `script-src` so the PortOne browser SDK on `/checkout` is not blocked by CSP.
- Added PortOne origins to `connect-src` for payment-related browser calls.
- Changed static asset cache policy from `public, max-age=31536000, immutable` to `no-cache, max-age=0, must-revalidate` because the bundle does not use hashed filenames. This prevents browsers and Cloudflare from serving old JS/CSS after Coolify redeploys.

## Validation
- `npm run test:all`: passed 20/20
- `npm run ci:strict`: passed
- `npm run validate:deploy`: passed
- `npm run validate:commercial-runtime`: passed

## Deployment note
After deploying this package, purge Cloudflare cache with Purge Everything and test in an incognito browser window.
