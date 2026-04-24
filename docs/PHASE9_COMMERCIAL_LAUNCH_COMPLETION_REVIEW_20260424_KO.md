# Phase 9 공개 런칭 상용화 보강 완료 리뷰

## 판정
- 목표: 실결제 포함 공개 서비스 / 고객 데이터 누적 / 멀티 운영자 / 멀티 인스턴스 기준 보강
- 상태: 코드 레벨 상용 가드 및 런칭 설정 단일화 완료
- 주의: 실제 PortOne 운영키, PostgreSQL, Redis, S3, 외부 스캔 공급자는 샌드박스에서 연결 검증 불가. 서버 실환경에서 `/readyz`와 결제 샌드박스 실거래 검증 필요.

## 이번 단계에서 닫은 P0
1. commercial 타깃의 기본 provider를 demo/json/shared_key/builtin에서 commercial 기본값으로 전환
2. `NV0_PLATFORM_TARGET=commercial`에서 다음 값 강제
   - `NV0_PERSISTENCE_MODE=postgres_primary`
   - `NV0_SESSION_STORE=redis`
   - `NV0_RATE_LIMIT_STORE=redis`
   - `NV0_LOCK_PROVIDER=redis`
   - `NV0_PAYMENT_PROVIDER=portone_v2`
   - `NV0_SCAN_PROVIDER=external_http`
   - object storage mode
3. production shared-key 금지 정책을 commercial 타깃 중심으로 정리
4. commercial에서 `/demo`, `/products/veridion/demo` 공개 페이지 제거
5. production/commercial seed route 404 처리
6. postgres_primary에서 JSON 파일 write 의존 제거
7. commercial readiness에서 Redis 세션/레이트리밋/락 연결 필수화
8. S3-compatible object storage upload adapter 추가
9. commercial env 템플릿 demo/admin-key/json 제거
10. commercial release validator 추가

## 로컬 검증
- `node --check server/index.mjs`: 통과
- `node --check server/core/platform.mjs`: 통과
- `node --check server/infrastructure/persistence/persistence.mjs`: 통과
- `node scripts/validate-commercial-release.mjs`: 통과

## 실환경에서 반드시 확인할 것
1. Coolify에 commercial env 실제값 입력
2. PostgreSQL schema 적용
3. Redis 연결 확인
4. S3-compatible 업로드 확인
5. 외부 스캔 provider 200 응답 확인
6. PortOne V2 결제 생성/완료/웹훅/취소 샌드박스 검증
7. `/readyz` 200 확인
8. Cloudflare 캐시/API 우회 규칙 확인
