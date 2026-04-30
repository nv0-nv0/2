# PHASE144 /readyz 421 Host Guard Fix (2026-04-30)

## 문제 요약

배포 로그에서 서버는 정상 기동되었고 prelaunch 검증도 통과했지만, Coolify 또는 컨테이너 내부 헬스체크가 `/readyz`를 반복 호출할 때 `421 Misdirected Request`가 반환되었습니다.

이는 PostgreSQL 스키마 누락 문제가 아니라, 전역 Host allowlist가 `/readyz` 요청을 API 처리부보다 먼저 차단한 문제입니다.

## 수정 파일

- `server/index.mjs`

## 수정 내용

1. `/healthz`, `/readyz` 요청은 Host allowlist 이전에 헬스체크 경로로 인식되도록 보강했습니다.
2. 헬스체크 경로는 Host 헤더가 Coolify 내부 호스트명, 컨테이너 내부 주소, 127.0.0.1, localhost 등으로 들어와도 `421`로 차단하지 않습니다.
3. 일반 페이지와 일반 API는 기존 Host allowlist 보호를 유지합니다.
4. 기본 허용 호스트에 `0.0.0.0`, `::1`을 추가했습니다.
5. IPv6 Host 헤더(`[::1]:3210`)도 정상 정규화하도록 보강했습니다.

## 기대 효과

- `/readyz`가 더 이상 전역 Host guard에서 `421`로 차단되지 않습니다.
- Coolify healthcheck가 실제 readiness 로직까지 도달합니다.
- 일반 요청의 Host allowlist 방어는 유지됩니다.
- 기존 R2 primary, prelaunch payment gate, PostgreSQL schema bootstrap, DB host `postgres` 수정은 유지됩니다.

## 적용 후 Coolify 작업

1. 새 ZIP 압축 해제
2. 프로젝트 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy

## 주의

- Postgres volume 삭제하지 마세요.
- Redis volume 삭제하지 마세요.
- runtime volume 삭제하지 마세요.
- local_fs로 되돌리지 마세요.
- PortOne 가짜값 넣지 마세요.
- 통신판매업신고번호 가짜값 넣지 마세요.
- prelaunch 모드를 유지하세요.
