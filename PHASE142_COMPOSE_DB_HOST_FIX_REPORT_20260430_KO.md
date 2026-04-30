# PHASE142 Compose DB Host Fix Report

## 원인
Coolify 환경변수에 남아 있던 `NV0_DATABASE_URL`이 Compose 내부 서비스명 `postgres`가 아니라 이전/외부 호스트명으로 전달되어, 앱 컨테이너 내부에서 `psql`이 해당 호스트를 DNS 해석하지 못했다.

오류 예시:

```text
psql: error: could not translate host name "xdjlffomndo0wsazv7rljp5e" to address: Try again
```

## 수정
- `docker-compose.yml`과 `deploy/docker-compose.coolify.yml`에서 앱의 `NV0_DATABASE_URL`을 Coolify 변수 탭 값이 아니라 Compose 내부 PostgreSQL 서비스명으로 강제 구성했다.
- `POSTGRES_DB`, `POSTGRES_USER`는 Compose 내부에서 `nv0`로 고정했다.
- Coolify 변수 탭에는 `POSTGRES_PASSWORD`만 넣도록 정리했다.
- `scripts/generate-r2-coolify-env.mjs`에서 `NV0_DATABASE_URL` 출력을 제거하고, Postgres 비밀번호를 URL-safe 문자열로 생성하도록 변경했다.
- `scripts/validate-coolify-env-detection.mjs` 검증 기준을 Compose 내부 DB URL 방식에 맞게 수정했다.

## Coolify 적용 원칙
기존 Coolify 변수 탭에 `NV0_DATABASE_URL`이 남아 있어도 이번 Compose에서는 무시된다. 그래도 혼선을 줄이기 위해 변수 탭에서 `NV0_DATABASE_URL`은 삭제하는 것을 권장한다.

필수 입력값:

```env
POSTGRES_PASSWORD=강한_랜덤값
```

앱 컨테이너에 실제 전달되는 DB URL:

```env
NV0_DATABASE_URL=postgres://nv0:${POSTGRES_PASSWORD}@postgres:5432/nv0
```

## 검증
- `docker-compose.yml` 내부 DB URL 고정 확인
- `deploy/docker-compose.coolify.yml` 내부 DB URL 고정 확인
- `scripts/generate-r2-coolify-env.mjs` 문법 검사 통과
- `scripts/validate-coolify-env-detection.mjs` 검사 통과

Docker daemon 실기동 검증은 실행 환경 제한으로 수행하지 못했다.
