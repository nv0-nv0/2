# PHASE283 Dashboard Design Closeout

## Summary

Phase283 closes the package-applied portal dashboard shell. The approved sidebar dashboard layout now loads through a shared stylesheet, so the page integrity gate no longer rejects the portal page for a retired app-level CSS reference.

## Root Cause

- The Phase283 dashboard CSS was linked directly from `apps/public/portal/app.css`, while the package integrity gate allows shared CSS references only.
- The portal score gauge kept an inline `style` attribute even though the gauge default already existed in CSS and runtime updates are handled by JavaScript.
- The source-size checker compared Windows paths with POSIX-style compatibility keys, so `server/index.mjs` incorrectly used the default 225 KB limit instead of its explicit monolith compatibility limit.

## Changes

- Added `shared/portal-phase283-dashboard.css` as the shared Phase283 dashboard stylesheet.
- Updated the portal HTML to reference the shared dashboard stylesheet and removed the inline gauge style.
- Normalized source-check paths before applying compatibility size limits.
- Added `validate:phase283` and `phase283:final` package scripts.
- Updated package metadata and legacy release-line guards for the Phase283 version.

## Verification

Run:

```bash
npm run phase283:final
```

The validator writes:

```text
docs/current/PHASE283_DASHBOARD_DESIGN_AUDIT.json
```
