# PHASE338 URL Fetch Security Closeout

## Scope

Applied a focused commercial-readiness patch for the URL diagnosis fetch path. This patch does not redesign the product or change public UI copy. It closes the remaining high-impact security gap around target URL fetching, redirect handling, and response-size controls.

## Files changed

- `server/index.mjs`
- `server/core/free-auto-discovery.mjs`
- `scripts/verify-security.mjs`

## Changes

1. Replaced automatic `redirect: 'follow'` target fetch with manual redirect handling.
2. Revalidates every redirect destination before the next request.
3. Blocks final redirect destinations that resolve to unsafe local/private targets by URL policy before fetching them.
4. Added bounded response reading for public target HTML fetches.
5. Added bounded response reading for `robots.txt` and `sitemap.xml` discovery fetches.
6. Added configurable limits:
   - `NV0_TARGET_FETCH_MAX_BYTES`, default 512 KB, clamped between 32 KB and 1 MB.
   - `NV0_TARGET_FETCH_MAX_REDIRECTS`, default 3, clamped between 0 and 5 at runtime.
7. Added config validation for target fetch timeout, max bytes, and max redirects.
8. Removed a duplicate unreachable `return` in `hashText`.
9. Extended `npm run verify:security` with source-level checks for:
   - manual redirect enforcement
   - response size limiting
   - private network target blocking

## Validation run

Final command executed:

```bash
npm run phase337:final
```

Result: PASS

Key passing checks:

| Command | Result |
| --- | --- |
| `npm run validate:phase337` | PASS, 102 checks, 0 failed |
| `npm run check:syntax` | PASS, 207 checked, 0 failures |
| `npm test` | PASS, 863 passed, 0 failed |
| `npm run test:e2e` | PASS |
| `npm run check:pages` | PASS, 44 mapped routes |
| `npm run test:routes` | PASS, 24 checked |
| `npm run check:links` | PASS, 457 links checked, 0 errors |
| `npm run smoke` | PASS |
| `npm run check:responsive-contract` | PASS, 51 files checked |
| `npm run check:performance-budget` | PASS |
| `npm run verify:security` | PASS, includes URL fetch hardening checks |
| `npm run validate:deploy` | PASS |
| `npm run check:release-secret-hygiene` | PASS, 0 findings |
| `npm run validate:phase325` | PASS, score 100 |
| `npm run validate:phase326` | PASS, score 100 |
| `npm run validate:phase328` | PASS |
| `npm run validate:phase329` | PASS |
| `npm run validate:phase330` | PASS, score 100 |
| `node scripts/check-runtime-clean.mjs` | PASS |

## Remaining operational note

The repository is release-cleaned by `npm run phase337:final`; local runtime state files were intentionally removed by `clean:runtime`. Server runtime files are recreated on local JSON-mode start. Commercial launch still requires production environment variables and external service configuration to be set in the deployment environment.
