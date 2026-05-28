# VERIDION PHASE327 Delivery Summary

## Fixed production boot blocker

Observed runtime error:

```text
Real NV0_PRIVACY_HASH_KEY is required.
```

Root cause:

- `server/config/validation.mjs` correctly required `NV0_PRIVACY_HASH_KEY` in commercial/prelaunch mode.
- Coolify compose/env delivery did not consistently expose that variable to the app container.
- `scripts/preflight.mjs` did not fail early for the missing privacy hash key, so the failure happened only after server start.

## Changed files

- `docker-compose.yml`
- `deploy/docker-compose.coolify.yml`
- `.env.coolify.example`
- `deploy/coolify.env.bulk.txt`
- `deploy/env.commercial.template`
- `scripts/preflight.mjs`
- `scripts/validate-prod-env.mjs`
- `scripts/validate-phase325-server-availability.mjs`
- `scripts/validate-phase326-admin-key-preflight.mjs`
- `scripts/test-all.mjs`
- `scripts/generate-commercial-secrets.mjs`
- `package.json`
- `docs/PHASE327_PRIVACY_HASH_BOOT_RECOVERY.md`

## Validation results

Passed:

```text
npm test
npm run check:syntax
npm run validate:phase326
npm run check:pages
npm run test:routes
npm run verify:security
npm run validate:deploy
npm run check:release-secret-hygiene
npm run check:responsive-contract
npm run phase326:final
```

Additional targeted verification:

- Missing `NV0_PRIVACY_HASH_KEY` now fails in preflight before server boot.
- Complete commercial prelaunch env passes preflight.
- Legacy `NV0_ADMIN_KEY` still warns in prelaunch and remains blocked for commercial launch.

## Coolify operator checklist

1. Remove legacy `NV0_ADMIN_KEY` from Coolify environment variables.
2. Add real values for:
   - `NV0_PRIVACY_HASH_KEY`
   - `NV0_SECURE_RECORDS_KEY`
   - `NV0_BACKUP_ENCRYPTION_SECRET`
   - `NV0_BOOTSTRAP_ADMIN_PASSWORD`
   - `POSTGRES_PASSWORD` or `NV0_DATABASE_URL`, depending on the selected compose profile
   - S3/R2 credentials
   - SMTP URL
   - business identity fields
3. Run `npm run secrets:generate` locally to generate strong random candidate values.
4. Redeploy in Coolify.
