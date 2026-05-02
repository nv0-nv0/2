# Phase171 Healthcheck / Readiness / Backup 최종 핫픽스

## 반영 요약

1. Coolify/Docker 컨테이너 헬스체크를 `/readyz`에서 `/healthz`로 변경했습니다.
   - `/healthz`: 프로세스 생존/HTTP 응답 확인용
   - `/readyz`: DB/Redis/런타임 쓰기 가능 여부 확인용
   - prelaunch 상태에서 외부 준비 조건 때문에 컨테이너가 불필요하게 unhealthy 처리되는 문제를 차단했습니다.

2. prelaunch 기본 Redis readiness strict 값을 `false`로 정리했습니다.
   - 정식 상용 오픈(`NV0_COMMERCIAL_LAUNCH_READY=true` 또는 `NV0_DEPLOYMENT_STAGE=commercial_launch`)에서는 서버 코드가 자동으로 strict readiness를 강제합니다.
   - prelaunch에서는 Redis 연결 상태를 readiness payload로 노출하되, 배포 헬스체크는 `/healthz`로 분리합니다.

3. `/readyz` 실패 시 원인 로그를 남기도록 보강했습니다.
   - `event=readyz_failed`
   - 실패 메시지, 배포 단계, prelaunch 여부, persistence/storage/redisStrict 상태 포함

4. PostgreSQL primary 모드의 자동 백업 스냅샷 누락을 보강했습니다.
   - `postgres_primary + commercial` 환경에서는 자동 백업 실행 전 현재 DB 상태를 `/app/runtime/data/db.json` 스냅샷으로 materialize합니다.
   - 이후 기존 로컬/원격 백업 파이프라인이 동일하게 동작합니다.

## 기대 결과

- Coolify 앱 컨테이너 healthcheck: `/healthz` 200 기준으로 안정화
- `/readyz` 503 발생 시 로그에서 실제 원인 확인 가능
- `automatic backup skipped because json db snapshot is not present` 반복 경고 해소
- prelaunch 단계에서 `launchReady=false`, `payment=disabled`는 정상 상태로 유지

## 운영 확인 명령

```bash
curl -fsS http://127.0.0.1:3210/healthz
curl -sS http://127.0.0.1:3210/readyz | jq .
```

`/healthz`는 200이어야 합니다. `/readyz`가 503이면 이제 컨테이너 로그에 `readyz_failed` 이벤트와 구체 원인이 남습니다.
