# PHASE139 배포 완성도 보강 보고서 — 2026-04-29

## 1. 목표

기존 배포 실패 원인인 commercial + local_fs 충돌을 제거하고, Coolify에서 실제로 읽는 compose/env/healthcheck 구성을 R2 우선 프로덕션 배포 기준으로 정리했다.

## 2. 현재 문제

- Coolify 환경변수에 local_fs가 남으면 서버 시작 시 validateConfig에서 즉시 종료된다.
- 기존 템플릿 일부는 AWS S3 기본값(ap-northeast-2, force path false, cdn.nv0.kr)을 유지하고 있었다.
- R2를 production 기본값으로 쓰려면 region auto, path-style true, bucket 분리가 일관되어야 한다.
- Coolify 라우팅 안정성을 위해 app service의 3210 포트 노출과 /readyz healthcheck 여유 시간이 필요하다.

## 3. P0/P1/P2 작업 목록

### P0
- `docker-compose.yml` R2 기본값 정리
- `deploy/docker-compose.coolify.yml` R2 기본값 정리
- `deploy/docker-compose.commercial.yml`을 R2 primary profile로 교체
- `NV0_S3_REGION=auto`, `NV0_S3_FORCE_PATH_STYLE=true` 전역 반영
- `local_fs` 상용 배포 경로 제거
- Coolify app service `expose: 3210` 추가
- healthcheck timeout/retries/start_period 강화

### P1
- `scripts/generate-r2-coolify-env.mjs` 추가
- `scripts/check-storage-config.mjs` 추가
- `npm run generate:r2-env`, `npm run check:storage-config`, `npm run deploy:precheck` 추가
- `deploy/R2_COOLIFY_DEPLOYMENT_RUNBOOK_20260429_KO.md` 추가

### P2
- `deploy/docker-compose.local-minio.yml`을 fallback 전용으로 분리
- 배포 검증 스크립트가 R2 primary와 MinIO fallback을 구분하도록 강화
- R2/AWS/CDN 값 혼재 여부 검출

## 4. 상세 수용 기준

- `/docker-compose.yml`은 MinIO를 기본으로 시작하지 않는다.
- `/docker-compose.yml`은 `${NV0_S3_REGION:-auto}`와 `${NV0_S3_FORCE_PATH_STYLE:-true}`를 사용한다.
- `deploy/coolify.env.bulk.txt`는 R2 placeholder를 사용하고 AWS S3 기본 endpoint를 포함하지 않는다.
- Dockerfile은 curl을 포함하고 `/healthz` healthcheck를 제공한다.
- compose healthcheck는 `/readyz`를 사용하고 충분한 start period를 둔다.
- `NV0_STORAGE_MODE=local_fs`는 production env 템플릿에 존재하지 않는다.

## 5. 테스트 케이스

- `node --check scripts/generate-r2-coolify-env.mjs`
- `node --check scripts/check-storage-config.mjs`
- `node --check scripts/validate-deploy-bundle.mjs`
- `node scripts/validate-deploy-bundle.mjs`
- `node scripts/check-env-examples.mjs`
- `node scripts/validate-coolify-env-detection.mjs`
- `node scripts/check-storage-config.mjs deploy/coolify.env.bulk.txt`
- `node --check server/index.mjs`

## 6. 회귀 검증

- 기존 서버 코드의 commercial validation은 약화하지 않았다.
- payment, SMTP, Turnstile, scan provider guard는 유지했다.
- 파일 저장소만 R2 primary로 표준화했다.
- MinIO는 default path에서 제거하고 fallback 파일로 분리했다.

## 7. 배포/롤백 기준

배포 기준:
- Coolify env에서 `NV0_STORAGE_MODE=local_fs` 제거
- R2 bucket/API key 입력 완료
- PostgreSQL/Redis service healthy
- `/healthz`, `/readyz` 통과

롤백 기준:
- local_fs 에러 재발
- 컨테이너 unhealthy rollback 반복
- readyz가 Redis/Postgres 문제로 계속 실패
- R2 업로드 실패가 사용자 기능 장애로 이어짐

## 8. Definition of Done

- R2 primary 배포 파일 완성
- MinIO fallback 분리
- env 생성/검증 스크립트 포함
- Coolify 실행 순서 문서화
- 배포 전 검증 명령 포함
- placeholder와 실제값 구분 명확화
