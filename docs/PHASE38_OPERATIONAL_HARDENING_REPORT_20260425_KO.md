# Phase38 운영 안정화 패치 리포트

## 적용 목적
Phase37까지의 법적·개인정보·결제·포털 구현 위에 실제 상용 운영 중 발생하기 쉬운 장애 지점을 줄이기 위해 운영 안정화 패치를 적용했다.

## 적용 항목

1. 결제 세션 idempotency
- `Idempotency-Key` / `X-Idempotency-Key` / body `idempotencyKey` 지원
- 동일 키·동일 요청은 기존 결제 세션 재응답
- 동일 키·다른 요청은 409 차단
- TTL 기반 idempotency 기록 정리

2. 검색엔진 노출 제어
- `/robots.txt` 추가
- `/sitemap.xml` 추가
- `/auth`, `/portal`, `/checkout` noindex/nofollow 메타 삽입
- 내부/결제/포털 페이지 색인 방지

3. 캐시 정책 정리
- 공개 HTML은 짧은 캐시
- 정적 자원은 immutable 장기 캐시
- API/동적 응답은 no-store 유지

4. 이메일 큐 운영 처리
- queued / retry_scheduled / sent / failed 상태 전이
- 재시도 횟수 제한
- 백오프 기반 다음 시도 시간 기록
- 관리자 큐 처리 API 추가

5. 관리자 운영 보호
- `NV0_ADMIN_IP_ALLOWLIST` 환경변수 추가
- 상용 release readiness에 관리자 IP 정책 게이트 추가
- 관리자 API 접근 IP 제한 가능

6. 결제 웹훅 운영 게이트
- 상용 PortOne 사용 시 strict webhook secret 검증 게이트 추가
- release readiness에서 웹훅 서명 설정 누락 탐지

7. 운영 자가검수 API
- `/api/admin/ops/self-test` 추가
- release readiness + 이메일 큐 probe 생성
- DB 쓰기 가능 여부 검증

8. 크래시 방어
- unhandledRejection 로깅
- uncaughtException 발생 시 graceful shutdown 시도

## 신규 검증
- `npm run validate:phase38`
- 총 13개 항목 검증
- 결제 idempotency, robots/sitemap, noindex, 캐시, 웹훅 게이트, 관리자 IP 게이트, 이메일 큐, self-test, 크래시 핸들러 확인

## 운영 전 남은 외부 검증
코드 패키지 안에서 강제 검증할 수 없는 항목은 실제 운영 환경에서 직접 확인해야 한다.

- 실제 카드 결제 1회 이상
- PortOne 웹훅 실수신 1회 이상
- 이메일 실제 도착/SPF/DKIM/DMARC 확인
- Cloudflare 캐시 purge 및 HTML no-cache 확인
- 관리자 IP allowlist 실제 접속 테스트
- 환불 요청 → 관리자 처리 → 결제 취소 동기화 테스트

## 결론
Phase38은 코드 내부 운영 리스크를 줄이는 패치이며, 실제 런칭 전에는 외부 결제·메일·DNS·Cloudflare 설정을 운영 환경에서 반드시 확인해야 한다.
