# Phase176 Access Log & Scanner Hygiene Hotfix

## 목적

배포 로그에서 `/healthz` 200이 반복되어 실제 장애가 아닌 정상 헬스체크가 운영 로그를 과도하게 채우는 문제를 정리했다. 동시에 외부 스캐너/브라우저가 자주 요청하는 `favicon.ico`, `.well-known/security.txt` 경로를 안정적으로 처리해 불필요한 404/잡음 발생 가능성을 줄였다.

## 변경 사항

- `NV0_LOG_HEALTHCHECK_REQUESTS=false` 기본값으로 성공한 `/healthz`, `/health`, `/livez`, `/readyz` access log 생략
- 4xx/5xx와 slow request는 항상 기록하여 장애 탐지 보존
- `NV0_ACCESS_LOG_MODE=quiet|normal|verbose` 추가
- `/favicon.ico` 204 응답 추가
- `/.well-known/security.txt` 응답 추가
- Phase175 runtime 정규화 유지

## 운영 권장값

```env
NV0_ACCESS_LOG_MODE=normal
NV0_LOG_HEALTHCHECK_REQUESTS=false
NV0_LOG_FAVICON_REQUESTS=false
```

장애 추적이 필요하면 일시적으로 다음처럼 올릴 수 있다.

```env
NV0_ACCESS_LOG_MODE=verbose
```
