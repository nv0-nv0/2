# PHASE141 — Coolify PostgreSQL psql client 배포 실패 수정 보고서

## 1. 문제
Coolify prelaunch 배포 검증은 통과했지만 앱 시작 시 다음 오류로 서버가 종료되었다.

```text
server startup failed Error: spawn psql ENOENT
```

## 2. 원인
`server/infrastructure/persistence/postgres-bridge.mjs`는 Node `child_process.spawn('psql', ...)` 방식으로 PostgreSQL에 접근한다. 하지만 앱 Docker image의 `Dockerfile`에는 `curl`만 설치되어 있고 PostgreSQL CLI client인 `psql`이 포함되어 있지 않았다.

## 3. 적용 수정
`Dockerfile`의 apk 설치 항목에 `postgresql-client`를 추가했다.

변경 전:

```dockerfile
RUN apk add --no-cache curl \
```

변경 후:

```dockerfile
RUN apk add --no-cache curl postgresql-client \
```

## 4. 기대 효과
- 앱 컨테이너 내부에서 `psql` 명령 실행 가능
- `postgres-bridge.mjs`의 admin_sessions 조회/동기화 로직 정상 실행 가능
- `spawn psql ENOENT` 오류 제거
- PostgreSQL/Redis/R2/prelaunch 검증을 통과한 현재 배포 흐름을 유지하면서 앱 시작 실패만 해결

## 5. 배포 절차
1. 본 수정본 ZIP을 프로젝트에 반영한다.
2. Coolify에서 `Reload Compose File`을 누른다.
3. `Save` 후 `Redeploy`한다.
4. 로그에서 `spawn psql ENOENT`가 사라졌는지 확인한다.
5. 앱 `/healthz`, `/readyz`를 확인한다.

## 6. 롤백 기준
아래 중 하나라도 발생하면 이전 ZIP으로 롤백한다.

- 이미지 빌드 단계에서 `apk add postgresql-client` 실패
- 앱 컨테이너가 계속 재시작
- `/healthz` 실패
- PostgreSQL 연결 문자열 오류가 새로 발생

## 7. Definition of Done
- Dockerfile에 `postgresql-client` 포함
- `node --check server/index.mjs` 통과
- 배포 번들 검증 통과
- Coolify 재배포 후 `spawn psql ENOENT` 미발생
