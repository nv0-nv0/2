# Deployment

## Boot-safe local or staging

```bash
npm run verify:release
npm run dev
```

## Strict commercial preparation

```bash
npm run secrets:generate
npm run generate:r2-env > .env.strict-commercial.generated
npm run deploy:precheck
node scripts/preflight.mjs .env.strict-commercial.generated
node scripts/validate-prod-env.mjs .env.strict-commercial.generated
node scripts/check-storage-config.mjs .env.strict-commercial.generated
```

Compose 선택 기준은 `deploy/README.md`를 확인합니다.

## Production verification

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

실제 DNS, Coolify 환경변수, 컨테이너 빌드, PostgreSQL·Redis·S3 연결, PortOne 웹훅은 운영 환경에서 별도로 검증해야 합니다.
