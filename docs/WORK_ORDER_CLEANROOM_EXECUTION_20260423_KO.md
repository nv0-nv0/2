# NV0 / Veridion 클린룸 재설계 정식 작업지시서

## 1. 작업 모드
- 상태: 실제 확인 완료
- 판정: 실행 모드
- 근거: 현재 런타임에 클린룸 스타터 패키지, 서버 코드, 앱 페이지, E2E 테스트가 존재함.

## 2. 최종 목표
- 기존 공용 프런트 의존 없이 Public App / Admin App / API App을 분리한다.
- Coolify + Contabo Tokyo + Cloudflare 앞단 구조로 1인 운영 최적화를 달성한다.
- 관리자 영역은 키 게이트 + 서버 세션 + HttpOnly 쿠키로 보호한다.
- 데모와 관리자 핵심 기능을 우선 완성하고 E2E로 검증한다.

## 3. 이번 단계 실제 반영 범위
### 실제 확인 완료
- `/healthz`, `/readyz` 헬스체크 추가
- 기본 보안 헤더 추가
- 공개 페이지 / 정적 자산 / 관리자 / 업로드 캐시 정책 분리
- 관리자 인증 API 인메모리 rate limit 추가
- 공개 스캔 API 인메모리 rate limit 추가
- Coolify용 Dockerfile 추가
- Coolify용 compose 추가
- `.env.example` 추가
- Cloudflare + Coolify 운영 지시서 추가
- E2E 테스트 보강

### 동작 확인 필요
- 실서버 배포 후 Cloudflare 프록시 환경에서 `Secure` 쿠키 동작
- 실제 Coolify healthcheck 성공 여부
- 실제 Contabo 디스크/메모리/네트워크 환경

### 검증 미완료
- 실결제
- 실스캔 엔진
- 실데이터 마이그레이션

### 확인되지 않음
- 기존 운영 ZIP 전체 구조와 최종 교체 충돌 포인트

## 4. 작업 순서
1. 서버 표준화
2. 관리자 인증 보호 고정
3. 헬스체크/캐시/보안 헤더 고정
4. 컨테이너 패키징
5. Coolify 리소스 정의
6. Cloudflare 정책 반영
7. E2E 재검증
8. 실배포 검증

## 5. 완료 기준
- 공개 홈에 관리자 흔적 0
- `/admin`은 게이트만 렌더
- 세션 없이는 `/admin/console*` 차단
- 데모 제출/결과/플랜/결제 흐름 정상
- 주문/발행/자료/설정/진단 기능 정상
- `/readyz` 성공
- E2E 통과

## 6. 롤백 기준
- `/readyz` 실패
- 관리자 인증 실패
- 공개 데모 제출 실패
- 로그인 이후 관리자 콘솔 렌더 실패
- 업로드 기능 실패

## 7. 다음 즉시 작업
- 실제 코드베이스 교체 통합
- Postgres 영속화 전환
- 감사 로그 영속화
- Cloudflare Turnstile 서버 검증 추가
