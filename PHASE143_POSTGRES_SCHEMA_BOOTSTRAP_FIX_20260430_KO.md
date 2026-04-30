# PHASE143 PostgreSQL Schema Bootstrap Fix

## 작업 일자
2026-04-30

## 대상 프로젝트
nv0.kr / Coolify 배포 프로젝트

## 문제 요약
마지막 배포 차단 오류는 PostgreSQL 접속 실패가 아니라 스키마 누락이었습니다.

```text
server startup failed Error: ERROR: relation "admin_sessions" does not exist
LINE 13:       from admin_sessions
```

이는 다음을 의미합니다.

- PostgreSQL 컨테이너 접근 성공
- DB 인증 성공
- psql 실행 가능
- 그러나 앱이 조회하는 테이블이 아직 생성되지 않음

## 수정 파일

```text
server/infrastructure/persistence/postgres-bridge.mjs
```

## 반영 내용

### 1. schemaBootstrapPromise 추가

PostgreSQL 스키마 생성 SQL이 중복 실행되지 않도록 module-level promise를 추가했습니다.

```js
let schemaBootstrapPromise = null;
let schemaBootstrapDatabaseUrl = null;
```

### 2. ensurePostgresSchema() 추가

DB URL이 존재할 때 스키마를 자동 생성합니다. 실패 시 명확한 에러 메시지를 출력하고, 재시도 가능하도록 bootstrap promise를 초기화합니다.

```js
export async function ensurePostgresSchema(databaseUrl = process.env.NV0_DATABASE_URL, logger = console) {
  ...
}
```

### 3. 모든 SQL 실행 전 bootstrap 선행

`execPsql()` 내부에서 항상 `ensurePostgresSchema()`를 먼저 호출하도록 변경했습니다.

```js
async function execPsql(databaseUrl, sql, logger = console) {
  await ensurePostgresSchema(databaseUrl, logger);
  return runPsql(databaseUrl, sql);
}
```

따라서 `admin_sessions` 조회, `state_snapshots` 조회/쓰기, `orders`, `payment_events`, `webhook_inbox` 갱신 전에 스키마 생성이 먼저 실행됩니다.

### 4. create table if not exists 기반 스키마 추가

자동 생성 대상은 아래와 같습니다.

- settings
- orders
- publications
- library_items
- scans
- audit_logs
- admin_sessions
- state_snapshots
- payment_events
- webhook_inbox

각 테이블에 필요한 기본 index도 함께 생성합니다.

## 유지한 기존 수정

아래 기존 수정은 유지했습니다.

- R2 primary storage 구성
- `NV0_STORAGE_MODE=s3`
- `NV0_S3_REGION=auto`
- `NV0_S3_FORCE_PATH_STYLE=true`
- `local_fs` 상용 금지
- prelaunch payment gate
- `NV0_PAYMENT_PROVIDER=disabled`
- PortOne 값 없는 prelaunch 허용
- 통신판매업 신고번호 없는 prelaunch 허용
- commercial_launch에서는 PortOne / 신고번호 필수 유지
- Dockerfile의 `postgresql-client` 유지
- Compose 내부 DB host `postgres` 유지

## 검증 결과

필수 정적 검증을 완료했습니다.

```text
node --check server/infrastructure/persistence/postgres-bridge.mjs : PASS
node --check server/index.mjs : PASS
node --check scripts/preflight.mjs : PASS
node --check scripts/validate-deploy-bundle.mjs : PASS
node scripts/validate-deploy-bundle.mjs : PASS
python -m zipfile -t nv0_patch_only_schema_bootstrap_20260430.zip : PASS
python -m zipfile -t nv0p143_postgres_schema_bootstrap_fix_20260430.zip : PASS
```

## Docker 검증 한계

현재 작업 환경에서는 Docker daemon 기반 `compose up` 실기동 검증은 수행하지 않았습니다. 다만 이번 오류는 런타임 SQL 실행 전 스키마 누락 문제이며, 해당 SQL 실행 경로 앞단에 schema bootstrap을 강제 삽입했습니다.

## 배포 후 확인 기준

성공 기준은 다음과 같습니다.

- `relation "admin_sessions" does not exist` 에러 제거
- `server startup failed` 제거
- `Deployment is Finished`
- `/healthz` 정상
- `/readyz` 정상
- prelaunch 상태 유지
