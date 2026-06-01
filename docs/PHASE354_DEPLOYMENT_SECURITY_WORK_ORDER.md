# PHASE354 배포 보안 마감 작업지시서

## 현재 판단

PHASE353 로컬 릴리즈 게이트는 통과했지만, 깨끗한 압축 해제본의 수동 서버 기동과 배포 설정 대조에서 운영 배포 전 보완해야 할 항목을 확인했다.

## 이번 단계 목표

1. 공개 헬스 프로브가 내부 런타임·환경 정보를 과도하게 노출하지 않도록 최소 응답으로 제한한다.
2. 상용 환경 필수값인 `NV0_SESSION_SECRET`의 발급·입력·Compose 전달 경로를 완성한다.
3. Coolify boot-safe Compose에서 보안·요청 제한·rate limit·데이터 보존·결제 redirect allowlist 운영값을 컨테이너로 전달한다.
4. 로컬 비밀값과 활성 런타임 상태가 Git에 포함되지 않도록 `.gitignore`를 추가한다.
5. 전용 회귀 테스트와 PHASE354 최종 게이트를 제공한다.

## 구현 범위

- `server/index.mjs` 공개 `/healthz`, `/readyz` 응답 최소화
- `.gitignore` 신규 생성
- 환경변수 예시·운영 템플릿·시크릿 생성기 보강
- `docker-compose.yml`, `deploy/docker-compose.coolify.yml` 환경변수 전달 보강
- 공개 프로브 최소 응답 회귀 테스트
- Compose 환경 전달 정적 검사
- PHASE354 감사·최종 게이트·README 갱신

## 제외 범위

- DB 스키마 변경
- 결제 로직 변경
- 인증 방식 변경
- 실제 Coolify 배포
- 운영 DNS·Cloudflare·실결제 웹훅 검증

## 위험도와 롤백

위험도는 중간 이하이다. 문제가 발생하면 PHASE353 ZIP으로 되돌리고 `npm run phase353:final`을 실행한다. 데이터 마이그레이션은 없다.
