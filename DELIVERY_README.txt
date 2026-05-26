VERIDION Phase305 Integrity Closeout Package

Status:
- Package-side closeout: complete
- Remaining go-live elements counted: 13
- Package controls applied to all 13 items
- Live evidence propagation fixed for postdeploy inventory
- Live/external proof still required before commercial-live-ready

Primary commands:
1. npm run phase305:final
2. npm run release:predeploy
3. npm run release:postdeploy

Important reports:
- docs/PHASE305_INTEGRITY_CLOSEOUT_WORK_ORDER.md
- docs/PHASE305_FINAL_INTEGRITY_CLOSEOUT_REPORT.md
- docs/PHASE304_REMAINING_STAGE_INVENTORY.md
- docs/current/PHASE304_REMAINING_STAGE_INVENTORY.json
- docs/current/PHASE305_INTEGRITY_CLOSEOUT_AUDIT.json

Commercial judgement rule:
The package can be handed off after phase305:final passes. The live service is commercial-live-ready only after all 13 postdeploy live signals pass.

Phase305 correction:
Post-deploy live verification evidence is now propagated into both the operational matrix and the remaining-stage inventory.

Phase303 compatibility note:
Post-deploy live verification evidence remains compatible with the Phase303 live-public-smoke handoff flow.
