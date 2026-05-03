# Phase175 Quiet Runtime Normalization Hotfix

## 배경

Phase174 배포 후 서버와 `/healthz`는 정상 동작했지만, Coolify 환경에 남아 있던 `NV0_RUNTIME_DIR=/app/runtime` 레거시 설정 때문에 entrypoint가 `/app/runtime` 쓰기 가능 여부를 검사하고 다음 안내 로그를 남겼다.

```txt
nv0 entrypoint: runtime dir '/app/runtime' is not writable by uid=0; using ephemeral scratch runtime '/tmp/nv0-runtime' because durable state is external (postgres_primary/s3).
```

이 로그는 장애가 아니지만 운영 로그에서는 권한 문제처럼 보이고, 재배포마다 불필요한 혼선을 만들 수 있다.

## 수정 내용

1. `deploy/entrypoint.sh`
   - `su-exec` 제거 상태 유지.
   - `postgres_primary + s3` 외부 영구저장 모드에서 `NV0_RUNTIME_DIR=/app/runtime`이 남아 있으면 이를 레거시 값으로 판단한다.
   - `NV0_REQUIRE_PERSISTENT_RUNTIME=auto`이고 `NV0_FORCE_RUNTIME_DIR=true`가 아닌 경우, `/app/runtime` probe 자체를 생략하고 `/tmp/nv0-runtime`으로 바로 정규화한다.
   - 정상 정규화 메시지는 기본적으로 출력하지 않는다.
   - 필요한 경우 `NV0_ENTRYPOINT_VERBOSE=true`로만 설명 로그를 켤 수 있다.

2. `server/index.mjs`
   - entrypoint를 우회해 `node server/index.mjs`로 직접 실행해도 동일한 정규화 규칙을 적용한다.
   - `NV0_RUNTIME_VERBOSE=true` 또는 `NV0_ENTRYPOINT_VERBOSE=true`가 아닌 이상 정상적인 scratch runtime 전환 로그를 출력하지 않는다.

3. 운영 안전장치
   - `NV0_FORCE_RUNTIME_DIR=true`를 넣으면 운영자가 명시한 runtime 경로를 강제로 사용한다.
   - `json` 또는 `local_fs` 모드에서는 기존처럼 persistent runtime이 필요하므로 쓰기 불가 상태를 강하게 다룬다.

## 기대 결과

상용 `commercial + postgres_primary + s3` 구성에서 Coolify에 아래 값이 남아 있어도:

```env
NV0_RUNTIME_DIR=/app/runtime
```

다음 로그가 더 이상 기본 출력되지 않는다.

```txt
runtime dir '/app/runtime' is not writable
using ephemeral scratch runtime
```

`/healthz`는 계속 200을 반환해야 하며, 영구 데이터는 PostgreSQL/S3에 저장된다.

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
- `npm run validate:phase174`
- `npm run validate:phase175`

Phase175 validator는 다음 상황을 직접 검증한다.

```sh
NV0_PLATFORM_TARGET=commercial \
NV0_PERSISTENCE_MODE=postgres_primary \
NV0_STORAGE_MODE=s3 \
NV0_REQUIRE_PERSISTENT_RUNTIME=auto \
NV0_RUNTIME_DIR=/app/runtime \
NV0_FALLBACK_RUNTIME_DIR=/tmp/nv0-phase175-quiet \
NV0_ENTRYPOINT_VERBOSE=false \
./deploy/entrypoint.sh /bin/true
```

기대값: 종료 코드 0, warning 없음, `/app/runtime` 권한 관련 출력 없음.
