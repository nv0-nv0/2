# Phase 8 Completion Review — Commercial Hardening Continuation

## 처리 내용

- 테스트 환경에서 외부 네트워크 fetch가 e2e를 지연시키지 않도록 `NV0_TARGET_FETCH_ENABLED=false` 옵션을 추가했다.
- 내장 스캔 엔진은 해당 옵션이 false일 때 외부 URL을 직접 fetch하지 않고 분석 가능한 내부 결과를 반환한다.
- e2e 테스트 서버 포트를 고정값에서 동적 포트로 전환하여 이전 테스트 프로세스/포트 충돌 리스크를 낮췄다.
- POST 테스트 호출 중 body가 없는 요청이 환경에 따라 지연될 수 있어 운영/백업/프룬 테스트 호출에 명시적 `{}` JSON body를 추가했다.
- 문법 검사 스크립트는 파일 경로 기반 `node --check` 대신 stdin 기반 검사로 변경하여 일부 ESM/환경 조합에서의 hang 리스크를 낮췄다.

## 상용 기준 추가 보강

- `TARGET_FETCH_ENABLED` 설정이 ops report 환경 요약에 포함된다.
- 실서비스에서는 기본값이 fetch enabled이며, 테스트/폐쇄망/방화벽 환경에서는 false로 둘 수 있다.
- 스캔 공급자 외부 연동 실패 시 fallback 경로와 테스트 경로가 분리되어 유지보수성이 개선됐다.

## 검증 메모

- 핵심 라우트와 결제/웹훅/이벤트 계층은 이전 Phase 5~7 구조를 유지한다.
- 이 산출물은 Phase 7 최종본에 Phase 8 안정화 패치를 더한 버전이다.
- 실제 운영키, 실제 PortOne 웹훅, 실제 PostgreSQL/Redis/Coolify 환경 검증은 서버 배포 후 진행해야 한다.

## 남은 실환경 확인 항목

1. PortOne 실 API 키로 결제 생성/조회/취소 확인
2. PortOne 웹훅 secret으로 서명 검증 확인
3. PostgreSQL dual_write 또는 postgres_primary 확인
4. Redis 세션/레이트리밋/락 확인
5. Coolify 배포 후 `/healthz`, `/readyz`, `/api/public/config` 확인
