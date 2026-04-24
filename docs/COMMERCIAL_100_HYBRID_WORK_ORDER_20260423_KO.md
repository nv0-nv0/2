# NV0 / Veridion 상용 100점 하이브리드 작업지시서

## 0. 목표
이 작업지시서는 현 결과물의 장점(UI/퍼널/검증 스크립트/운영 문서 뼈대)을 최대한 유지하면서,
실결제·고객 데이터 누적 운영·멀티 운영자·멀티 인스턴스·본격 상용 런칭이 가능한 구조로 승격시키기 위한 기준 문서다.

## 1. 최종 원칙
1. 모놀리식 유지, 내부 모듈화 강화
2. DB 중심 상태 관리
3. 외부 의존성만 인터페이스화
4. 운영자 안전 우선
5. 테스트는 핵심 경로 위주로 강하게
6. demo/seed/prod 혼재 금지
7. 복구 가능한 시스템으로 설계

## 2. 살릴 자산
- 공개 페이지, 관리자 UI, 퍼널 동선
- 핵심 API 경로 체계
- acceptance / smoke / verify 계열 자동검증 틀
- 배포/운영 문서 골격
- 보안 헤더 및 request logging 기초

## 3. 교체 대상
- runtime/data 기반 영속 저장
- shared admin key 인증
- demo payment completion 흐름
- production 노출 seed route
- local upload/state 의존 설계

## 4. 목표 아키텍처
- App: modular monolith
- DB: PostgreSQL
- Session / rate limit: Redis
- File assets: S3-compatible storage
- Payment: PortOne-first multi-PG adapter
- AuthN/AuthZ: account-based RBAC + MFA
- Observability: structured logs + error tracking + metrics

## 5. 단계별 실행
### Phase 1 — 경계 고정 (즉시)
- 상용 타깃 모드 도입
- demo/seed route 차단 가드 추가
- 결제 상태머신 정의
- provider contract 문서화
- 상용 전환 작업지시서 고정

### Phase 2 — 저장소 전환
- Postgres schema 확장
- repository 계층 추가
- db.json reads/writes 제거
- backup/restore DB 기준 전환

### Phase 3 — 인증/권한 전환
- admin accounts / roles / sessions
- shared key 제거
- MFA / lockout / revoke sessions

### Phase 4 — 결제 상용화
- PortOne adapter 구현
- webhook verify / idempotency
- order-payment-subscription state machine
- cancel/refund/reconcile tooling

### Phase 5 — 멀티 인스턴스화
- Redis session/rate limiting
- S3 object storage
- stateless containers
- migration / rollout / rollback 정식화

## 6. P0 파일 작업 목록
- `server/index.mjs`: 상용 가드, demo/seed 억제, 코어 분리 준비
- `server/core/platform.mjs`: 런칭 타깃 정책
- `server/core/payment-state-machine.mjs`: 상태 전이 기준
- `server/contracts/commercial-target-interfaces.md`: adapter 계약
- `deploy/env.commercial.template`: 상용 환경변수 초안
- `docs/COMMERCIAL_100_HYBRID_WORK_ORDER_20260423_KO.md`: 본 문서

## 7. 승인 기준
다음 항목을 만족해야 상용 승인을 검토할 수 있다.
- demo provider 제거
- local_fs 제거
- shared admin key 제거
- seed route 비활성화
- payment webhook verification 구현
- postgres + redis + object storage 실환경 검증
- 장애/복구 런북 검증

## 8. 이번 턴에서 실제 반영한 1차 작업
- 상용 타깃 정책 모듈 추가
- 결제 상태머신 모듈 추가
- provider contract 문서 추가
- 상용 작업지시서 추가
- commercial target에서 demo 결제 완료 및 seed route 차단 예정 반영
