# Phase170 Redis Readyz / Startup Backup Hotfix

## 목적
Coolify prelaunch 운영 로그에서 `/readyz`가 Redis ping timeout으로 503을 반환하고, `postgres_primary` 모드에서 `db.json`이 없을 때 시작 백업이 ENOENT로 실패하는 문제를 제거한다.

## 수정 사항

1. Redis RESP 클라이언트 응답 처리 개선
   - 기존 구현은 Redis 서버가 연결을 닫는 `end` 이벤트를 기다렸다.
   - Redis는 일반적으로 연결을 유지하므로 `PING` 응답이 와도 timeout이 발생할 수 있었다.
   - `data` 이벤트에서 충분한 RESP 응답을 파싱하면 즉시 resolve하도록 수정했다.

2. 자동 백업 시작 실패 방지
   - `postgres_primary` 환경에서는 `db.json`이 없을 수 있다.
   - 자동 백업은 `db.json`이 없으면 오류로 서버 로그를 오염시키지 않고 안전하게 skip한다.
   - 수동 백업의 명시적 실패 의미는 유지한다.

3. Coolify ENV 예시 보강
   - `NV0_READYZ_REDIS_STRICT=false`
   - `NV0_READYZ_CACHE_TTL_MS=3000`
   - Target Fetch sitemap/robots 관련 ENV 누락 보강

## 운영 권장값

프리런치/Coolify 환경에서 Redis가 같은 compose stack에 정상 포함되어 있어도 다음 값을 권장한다.

```env
NV0_READYZ_REDIS_STRICT=false
NV0_READYZ_CACHE_TTL_MS=3000
NV0_REDIS_TIMEOUT_MS=1500
```

상용 런칭 후 Redis 미연결을 배포 실패로 강제하려면 아래처럼 전환한다.

```env
NV0_COMMERCIAL_LAUNCH_READY=true
NV0_READYZ_REDIS_STRICT=true
```
