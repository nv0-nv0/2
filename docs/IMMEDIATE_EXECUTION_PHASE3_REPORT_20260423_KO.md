# 즉시 실행 보고서 — Phase 3 (PostgreSQL 병행 저장 시작)

## 이번 단계 목표
- JSON 중심 런타임을 깨지 않고 PostgreSQL 병행 저장(Dual Write) 기반을 추가한다.
- 운영 환경에서 `json -> dual_write -> postgres_primary` 순서로 안전하게 전환할 수 있는 경계를 만든다.

## 실제 반영 내용
1. `server/infrastructure/persistence/persistence.mjs`
   - 런타임 DB/세션 읽기·쓰기를 단일 매니저로 통합
   - JSON 저장은 기본 유지
   - PostgreSQL 브리지가 활성화되면 병행 저장 가능
2. `server/infrastructure/persistence/postgres-bridge.mjs`
   - `psql` 기반 PostgreSQL 브리지 추가
   - `state_snapshots` 테이블에 컬렉션 단위 JSON 스냅샷 저장
   - `admin_sessions` 테이블에 세션 동기화
   - `NV0_DB_COMPARE_MODE=1` 시 JSON vs PostgreSQL 불일치 로그 출력
3. `server/index.mjs`
   - 기존 `readDb`, `writeDb`, 세션 hydrate/save 경로를 persistence manager로 교체
   - 상용 모드에서 `NV0_PERSISTENCE_MODE=dual_write|postgres_primary`면 `NV0_DATABASE_URL` 강제
4. `deploy/postgres/schema.sql`
   - `state_snapshots` 테이블 추가
   - `admin_sessions` 테이블에 운영자 메타 확장
5. 환경변수 템플릿 업데이트
   - `NV0_PERSISTENCE_MODE`
   - `NV0_DATABASE_URL`
   - `NV0_DB_COMPARE_MODE`

## 운영 모드 정의
- `NV0_PERSISTENCE_MODE=json`
  - 기존과 동일. JSON만 사용.
- `NV0_PERSISTENCE_MODE=dual_write`
  - JSON + PostgreSQL 동시 기록.
  - 읽기는 JSON 우선.
- `NV0_PERSISTENCE_MODE=postgres_primary`
  - JSON + PostgreSQL 동시 기록.
  - 읽기는 PostgreSQL 우선.

## 컷오버 권장 순서
1. `json`
2. `dual_write`
3. `dual_write + NV0_DB_COMPARE_MODE=1`
4. mismatch 0 확인
5. `postgres_primary`
6. 안정화 후 JSON 제거 작업 착수

## 주의
- 이번 단계는 **실제 PG 네이티브 repository 완성**이 아니라, 안전한 이행을 위한 **병행 저장 브리지 도입**이다.
- 현재 브리지는 Node `pg` 의존성 없이 `psql` 클라이언트를 사용한다. 따라서 실제 서버에는 `psql` 설치 또는 별도 PG client 계층이 필요하다.
- 로컬 테스트 환경에서는 PostgreSQL 미구성 상태여도 기존 JSON 경로가 그대로 동작한다.

## 다음 단계
- Redis 세션/레이트리밋 외부화
- PostgreSQL native repository 계층 도입
- 결제 이벤트/주문 상태머신의 DB 트랜잭션화
