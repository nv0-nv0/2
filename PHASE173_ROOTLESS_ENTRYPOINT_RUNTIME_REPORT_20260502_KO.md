# Phase173 Rootless Entrypoint & Runtime Permission Hardening Report

## 배경

Phase172 배포 후 Coolify/컨테이너 로그에서 `su-exec: setgroups(101): Operation not permitted`가 반복 발생했다. 이는 애플리케이션 HTTP 라우트 문제가 아니라 컨테이너 시작 단계에서 권한 전환 도구가 `setgroups` 시스템 호출을 수행하려다 제한된 rootless 또는 no-new-privileges 환경에서 차단된 문제다.

## 수정 범위

1. Dockerfile에서 `su-exec` 설치 의존성을 제거했다.
2. entrypoint에서 `su-exec nv0:nv0` 실행 경로를 완전히 제거했다.
3. root/rootless/non-root 환경 모두에서 동일 entrypoint가 동작하도록 런타임 디렉터리 생성, 권한 보정, 쓰기 probe, fallback runtime을 추가했다.
4. `/app/runtime` 볼륨이 쓰기 불가이면 `/tmp/nv0-runtime`으로 자동 우회한다.
5. Docker CMD를 명시해 Coolify/Docker가 기본 명령을 안정적으로 전달하도록 했다.
6. entrypoint가 인자를 받으면 `exec "$@"`로 실행해 Coolify 커스텀 command, one-off shell, preflight 실행을 방해하지 않게 했다.
7. Phase172의 `/api/public/auth/session` 500 방지, 결제/주문 공개 라우트 sanitizer 주입, PostgreSQL primary backup provider fallback, `/api/public/system-items` alias 보강은 유지했다.

## 예상 장애 선제 차단

- `setgroups` 권한 차단으로 컨테이너가 즉시 종료되는 문제
- rootless Docker/Coolify에서 `chown` 실패 시 서버가 시작되지 않는 문제
- named volume이 root 소유로 생성되어 `/app/runtime/data/db.json` 쓰기가 실패하는 문제
- prelaunch/상용 혼합 환경에서 `/readyz`가 컨테이너 생존성 판단에 영향을 주는 문제
- 비로그인 또는 Googlebot 요청에서 `/api/public/auth/session`이 500을 반환하는 문제
- PostgreSQL primary 모드에서 JSON snapshot 파일 부재 또는 권한 오류로 자동 백업이 실패하는 문제
- 공개 API 문서에 노출된 `/api/public/system-items` 경로가 404가 되는 문제

## 배포 후 기대 로그

- `su-exec: setgroups(101): Operation not permitted`가 더 이상 출력되지 않아야 한다.
- `/healthz`는 컨테이너 헬스체크 기준으로 200을 반환해야 한다.
- `/api/public/auth/session`은 비로그인 상태에서 200과 `authenticated:false`를 반환해야 한다.
- 런타임 볼륨이 쓰기 불가이면 entrypoint warning이 1회 출력되고 fallback runtime으로 서버가 계속 기동해야 한다.

## 검증

- `npm run check:syntax`
- `npm run test:all`
- `npm run test:e2e`
- `npm run test:routes`
- `npm run smoke`
- `npm run validate:deploy`
- `npm run check:env-examples`
- `npm run validate:phase167`
- `npm run validate:phase173`
- `sh -n deploy/entrypoint.sh`
- entrypoint 정상 command exec smoke
- non-root + unwritable runtime fallback smoke
