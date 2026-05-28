# PHASE327 Privacy Hash Boot Recovery

## Fixed failure

Runtime logs showed repeated server crashes with:

```text
Real NV0_PRIVACY_HASH_KEY is required.
```

The root cause was an environment contract mismatch: the server required commercial privacy/security keys, but the Coolify compose and bulk env templates did not consistently pass or preflight-check `NV0_PRIVACY_HASH_KEY` and adjacent commercial runtime keys.

## Applied corrections

- `docker-compose.yml` and `deploy/docker-compose.coolify.yml` now pass supplied Coolify variables for:
  - `NV0_PRIVACY_HASH_KEY`
  - `NV0_SECURE_RECORDS_KEY`
  - business identity fields
  - `NV0_BACKUP_ENCRYPTION_SECRET`
  - PostgreSQL/Redis/S3/SMTP/PortOne/scan provider fields
- `scripts/preflight.mjs` now fails before server boot if required commercial privacy/security/storage/backup keys are missing or placeholders.
- `scripts/validate-prod-env.mjs` now checks the same keys.
- `deploy/coolify.env.bulk.txt`, `.env.coolify.example`, and `deploy/env.commercial.template` now include the missing keys.
- `scripts/generate-commercial-secrets.mjs` generates strong values for operator-side Coolify entry.

## Immediate Coolify action

Run locally once:

```bash
npm run secrets:generate
```

Copy the generated values into Coolify environment variables, then replace all remaining `replace-with-*` placeholders with real production values. Redeploy after removing legacy `NV0_ADMIN_KEY` from Coolify.

Minimum key that caused this crash:

```env
NV0_PRIVACY_HASH_KEY=<strong random value>
```

Do not reuse `NV0_ADMIN_KEY` as a privacy hash key.
