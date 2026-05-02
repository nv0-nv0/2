# PHASE158 PostgreSQL `spawn E2BIG` 긴급 수정 보고서

## 1. 장애 원인

Coolify production 컨테이너가 `Restarting (8x restarts)` 상태에 들어간 직접 원인은 다음 로그입니다.

```text
server startup failed Error: spawn E2BIG
at file:///app/server/infrastructure/persistence/postgres-bridge.mjs:154:19
```

원인은 `server/infrastructure/persistence/postgres-bridge.mjs`가 PostgreSQL CLI인 `psql`을 실행할 때 다음 두 가지를 동시에 수행했기 때문입니다.

1. 큰 JSON 스냅샷 SQL을 `psql -c "...large sql..."` 형태로 argv에 직접 전달
2. Coolify가 주입한 전체 `process.env`를 자식 프로세스에 그대로 전달

Linux의 프로세스 실행 한계(ARG_MAX)를 넘으면 `psql` 자체가 시작되기 전에 Node `child_process.spawn` 단계에서 `E2BIG`가 발생합니다. 그래서 앱 서버 시작 중 DB 스냅샷 저장에서 죽고, Coolify가 계속 재시작한 것입니다.

## 2. 수정 내용

### A. `postgres-bridge.mjs`

- `psql -c <SQL>` 방식 제거
- SQL을 argv가 아니라 `stdin`으로 스트리밍하도록 변경
- 자식 프로세스 env를 전체 `process.env` 대신 최소 allowlist 기반으로 축소
- 큰 JSON 스냅샷이 있어도 커맨드라인 인자 크기가 커지지 않도록 수정
- `child.stdin` 에러 핸들링 추가

### B. `migrate-existing-cta-human-friendly.mjs`

- 운영 마이그레이션 스크립트도 동일한 방식으로 보강
- `psql -c <SQL>` 제거
- 최소 env + stdin SQL 실행 방식으로 변경

### C. 검증 스크립트 추가

추가 파일:

```text
scripts/validate-phase158-e2big-hotfix.mjs
```

검증 내용:

- PostgreSQL bridge가 SQL을 stdin으로 전달하는지 확인
- `-c` argv SQL 전달이 제거되었는지 확인
- 전체 Coolify env를 상속하지 않는지 확인
- 2MB짜리 가짜 Coolify 환경변수가 있어도 spawn 성공하는지 확인
- 1MB 이상 JSON 스냅샷이 stdin으로 정상 전달되는지 확인

## 3. 검증 결과

실행 명령:

```bash
npm run check:syntax
npm run test:all
npm run test:e2e
npm run test:routes
npm run validate:phase156
npm run validate:phase157
npm run validate:phase158
```

결과:

- 문법 검사: 165개 통과
- 전체 테스트: 85개 통과 / 실패 0
- E2E: 통과
- 라우트 스모크: 24개 통과
- Phase156 전역 UX 검증: 64개 통과 / 실패 0
- Phase157 비결제 운영 고도화 검증: 19개 통과 / 실패 0
- Phase158 E2BIG 재발 방지 검증: 8개 통과 / 실패 0

## 4. 배포 시 주의사항

이 패키지를 재배포하면 `spawn E2BIG` 재시작 루프는 코드 구조상 해소됩니다.

다만 기존 Coolify 환경변수에 불필요하게 큰 값이 들어 있다면 별도로 정리하는 것이 좋습니다. 이번 수정은 PostgreSQL `psql` 자식 프로세스 실행 시 전체 env를 넘기지 않도록 막은 것이며, 앱 본체의 환경변수 크기 자체까지 줄이는 것은 아닙니다.

## 5. 재배포 후 확인 순서

1. Coolify에서 새 패키지/커밋으로 Redeploy
2. Logs에서 `server startup failed Error: spawn E2BIG`가 더 이상 뜨지 않는지 확인
3. 컨테이너 상태가 `Running`으로 유지되는지 확인
4. `/health` 또는 홈 접속 확인
5. 관리자 운영 진단 화면에서 PostgreSQL/SMTP/스캔/스토리지 상태 확인
