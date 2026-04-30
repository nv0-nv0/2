# nv0.kr PostgreSQL Schema Bootstrap 경량 패치

## 패치 목적
Coolify 배포 시 PostgreSQL 접속과 인증은 성공했지만, DB 스키마가 생성되지 않아 아래 오류로 서버가 시작되지 않는 문제를 해결합니다.

ERROR: relation "admin_sessions" does not exist

## 수정 파일
- server/infrastructure/persistence/postgres-bridge.mjs

## 핵심 수정
- schemaBootstrapPromise 기반 중복 실행 방지 추가
- ensurePostgresSchema(databaseUrl, logger) 추가
- 모든 PostgreSQL SQL 실행 전 ensurePostgresSchema() 선행 실행
- create table if not exists 기반 자동 스키마 생성 추가

## 자동 생성 대상 테이블
- settings
- admin_sessions
- state_snapshots
- orders
- payment_events
- webhook_inbox
- library_items
- publications
- scans
- audit_logs

## 유지 조건
- NV0_STORAGE_MODE=s3 유지
- R2 primary storage 유지
- NV0_DEPLOYMENT_STAGE=prelaunch 유지
- NV0_PAYMENT_PROVIDER=disabled 유지
- PortOne 가짜값 미사용
- 통신판매업신고번호 가짜값 미사용
- DB host는 postgres 유지
- Dockerfile의 postgresql-client 유지

## 적용 방법
1. 이 ZIP을 압축 해제합니다.
2. server/infrastructure/persistence/postgres-bridge.mjs 파일을 프로젝트 동일 경로에 덮어씁니다.
3. GitHub push 또는 Coolify 소스 업데이트를 진행합니다.
4. Coolify에서 Reload Compose File → Save → Redeploy 순서로 배포합니다.

## 주의
이번 단계에서는 Postgres volume, Redis volume, runtime volume을 삭제하지 마세요.
