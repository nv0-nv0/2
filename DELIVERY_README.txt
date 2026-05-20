NV0 Phase270 Full Package Verified + Clean Delivery

Base:
  nv0_phase269_complete_20_improvements_optimized.zip

Applied fixes in this delivery:
  - Full final gate restored to include syntax, unit, e2e, route, link, smoke, legacy phase, commercial, security, deploy, runtime API, and clean-runtime checks.
  - Fixed stale e2e/current-version acceptance so the current phase270 release line is tested instead of rejected.
  - Preserved old phase257/phase258 command compatibility by chaining phase257:final -> phase258:final -> phase270:final.
  - Fixed /api/public/scan and /api/diagnostics/start compatibility route condition so legacy/public scan does not fall through to 404.
  - Corrected phase270 validator logic to verify the actual result-card render call before the auto portal handoff call.
  - Re-ran live runtime API verification for /api/diagnostics/start and /api/public/diagnose.
  - Removed non-runtime historical design/reference folders from the clean package while keeping validation-required audit assets.

Kept intact:
  - Main-page instant address input diagnosis.
  - Result card rendering before redirect.
  - Auto portal handoff to /portal?siteId=...&requestId=....
  - Portal handoff banner and saved state handling.
  - Existing functional menus, routes, admin, checkout, board, account, and commercial runtime structure.

Run:
  npm start

Final verification command:
  npm run phase270:final

Current verification status:
  PASS

Important audit files:
  docs/current/PHASE270_FULL_PACKAGE_VERIFIED_AUDIT.json
  docs/current/PHASE270_RUNTIME_FLOW_AUDIT.json
  docs/PHASE270_CLEANUP_AND_REVIEW_REPORT.md
