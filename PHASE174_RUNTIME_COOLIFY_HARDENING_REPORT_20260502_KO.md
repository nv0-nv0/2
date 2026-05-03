# Phase174 Runtime/Coolify Hardening Report — 2026-05-02

## 처리 배경

Phase173 배포 후 서버와 `/healthz`는 정상 기동했지만, Coolify/rootless 계열 환경에서 `/app/runtime`이 uid=0 기준으로도 쓰기 불가하여 `/tmp/nv0-runtime`으로 fallback되는 경고가 남았다.

상용 구성은 PostgreSQL primary + S3/R2 object storage가 영구 저장소이므로 `/app/runtime` Docker volume을 필수 영구 볼륨으로 취급하면 오히려 배포 안정성을 해칠 수 있다.

## 핵심 변경

1. Dockerfile의 암묵적 `VOLUME ["/app/runtime"]` 제거
   - Coolify/rootless 환경에서 권한이 꼬인 anonymous volume이 자동 생성되는 문제를 차단했다.

2. Coolify canonical compose에서 앱 runtime volume 제거
   - `docker-compose.yml`
   - `deploy/docker-compose.coolify.yml`
   - PostgreSQL과 Redis volume은 그대로 유지한다.

3. 상용 PostgreSQL+S3 구성의 runtime 기본값을 `/tmp/nv0-runtime`으로 전환
   - `NV0_RUNTIME_DIR=/tmp/nv0-runtime`
   - `NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-runtime`
   - `NV0_REQUIRE_PERSISTENT_RUNTIME=auto`

4. entrypoint runtime 판정 강화
   - `postgres_primary + s3`는 외부 영구 저장소 구성으로 판정한다.
   - 이 구성에서는 `/tmp` scratch runtime 사용을 정상 운영 경로로 취급한다.
   - `json` 또는 `local_fs` 구성에서는 persistent runtime이 필요하므로 권한 문제를 강하게 경고/차단한다.

5. 서버 내부 fallback 보강
   - entrypoint를 우회해 `node server/index.mjs`가 직접 실행되어도 runtime write probe를 수행한다.
   - `/app/runtime`이 불가하고 외부 영구 저장소 구성이라면 `/tmp/nv0-runtime`으로 자동 전환한다.

6. 백업 로직 보강
   - local backup path가 `EACCES`, `EPERM`, `EROFS`로 막혀도 remote backup이 가능한 경우 remote-only snapshot으로 계속 진행한다.
   - local backup listing도 권한 문제 시 500 대신 빈 목록으로 안전하게 반환한다.

## 배포 후 기대 로그

`/app/runtime`이 여전히 쓰기 불가해도 상용 외부 영구 저장소 구성에서는 아래 수준의 정보 로그만 남고 정상 부팅한다.

```txt
nv0 entrypoint: runtime dir '/app/runtime' is not writable by uid=0; using ephemeral scratch runtime '/tmp/nv0-runtime' because durable state is external (postgres_primary/s3).
```

신규 compose/env를 적용하면 기본값 자체가 `/tmp/nv0-runtime`이라 위 로그도 일반적으로 나오지 않는다.

## 운영 메모

Coolify UI 환경변수에 이전 값 `NV0_RUNTIME_DIR=/app/runtime`이 남아 있으면 compose 기본값보다 UI 변수가 우선한다. Phase174 패키지에서도 자동 fallback은 되지만, 로그까지 깨끗하게 하려면 Coolify 환경변수에서 아래처럼 바꾼다.

```txt
NV0_RUNTIME_DIR=/tmp/nv0-runtime
NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-runtime
NV0_REQUIRE_PERSISTENT_RUNTIME=auto
```

PostgreSQL, Redis, S3/R2 설정은 기존 그대로 유지한다.
