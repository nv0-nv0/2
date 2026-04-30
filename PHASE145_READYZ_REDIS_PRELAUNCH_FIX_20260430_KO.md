# PHASE145 READYZ Redis Prelaunch Readiness Fix (2026-04-30)

## 문제

P144 적용 후 Host guard에 의한 `/readyz` 421 문제는 해결되었으나, Coolify 헬스체크가 `/readyz`를 호출할 때 Redis ping 단계에서 약 5초 타임아웃이 발생하고 503이 반환되었다.

로그 핵심:

- 서버 기동 성공
- prelaunch 검증 통과 (`errors: []`, `warnings: []`)
- `/readyz` 반복 503
- `[redis-client-disabled-fallback] { message: 'Redis request timeout' }`

## 원인

`/readyz`가 매 요청마다 Redis session/rate-limit/lock provider에 대해 strict ping을 수행했다. prelaunch 단계에서는 결제 비활성화 및 fallback 운용이 가능해야 하는데, Redis ping 실패가 곧바로 readiness 실패로 이어져 Coolify가 컨테이너를 unhealthy로 판단했다.

## 수정 내용

- `server/index.mjs`에 `READYZ_REDIS_STRICT` 플래그 추가
- 기본 동작:
  - `commercialLaunchReady=true` 또는 `NV0_READYZ_REDIS_STRICT=true`일 때만 Redis ping을 strict readiness 조건으로 사용
  - prelaunch에서는 Redis ping을 수행하지 않고, Redis provider 설정 여부를 advisory 상태로 반환
- `/readyz` 응답에 Redis readiness mode 추가
  - `strict_ping`
  - `prelaunch_advisory_no_ping`
- 기존 `/healthz`, `/readyz` Host guard 예외 유지
- 기존 P143 PostgreSQL schema bootstrap 유지
- 기존 R2 primary / prelaunch payment gate / Dockerfile postgresql-client / DB host postgres 수정 유지

## 기대 결과

prelaunch 배포에서는 Redis timeout 때문에 `/readyz`가 503으로 떨어지지 않는다. Redis가 실제로 불안정하거나 연결 정보가 잘못되어도 prelaunch에서는 서버를 올리고 기능별 fallback으로 운영 가능하다.

정식 commercial launch 단계에서는 `commercialLaunchReady=true` 또는 `NV0_READYZ_REDIS_STRICT=true`를 통해 Redis strict readiness를 다시 강제할 수 있다.

## Coolify 적용 방법

1. ZIP 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy
7. Logs 확인

## 주의

- Postgres volume 삭제하지 않음
- Redis volume 삭제하지 않음
- runtime volume 삭제하지 않음
- local_fs로 되돌리지 않음
- PortOne 가짜값 넣지 않음
- 통신판매업신고번호 가짜값 넣지 않음
- prelaunch 모드 유지
