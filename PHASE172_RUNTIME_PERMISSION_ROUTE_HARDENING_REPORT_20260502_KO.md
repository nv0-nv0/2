# Phase 172 Runtime Permission & Public Route Hardening

## 처리 배경
실제 배포 로그에서 컨테이너 생존성은 `/healthz` 200으로 안정화되었으나, 다음 두 장애가 확인되었다.

1. `/api/public/auth/session` 요청에서 `publicCustomer is not defined` 런타임 예외 발생
2. PostgreSQL primary 모드에서 자동 백업이 `/app/runtime/data/db.json` 쓰기 권한 문제로 실패

## 수정 내용

### 1. Public/Account/Payment 라우트 분리 누락 보강
- `server/routes/account.mjs`에 `publicCustomer`, `sanitizeOrderForPublic` 컨텍스트 주입 추가
- `server/routes/payment.mjs`에 `sanitizeOrderForPublic` 컨텍스트 주입 추가
- `server/routes/public.mjs`에 레거시 경로 방어용 `publicCustomer`, `sanitizeOrderForPublic` 컨텍스트 주입 추가

### 2. Googlebot/비로그인 세션 API 500 방지
- `/api/public/auth/session` 비로그인 요청이 200 + `authenticated:false`를 반환하도록 검증
- `/privacy` → `app.js/app.css` → `/api/public/auth/session` 크롤러 흐름에서 500이 나오지 않도록 확인

### 3. PostgreSQL primary 백업 구조 개선
- `server/core/backup-operations.mjs`에 `dbSnapshotProvider` 경로 추가
- `db.json`이 없거나 접근 권한이 없어도 PostgreSQL snapshot provider를 통해 백업 payload 생성
- 자동 백업에서 `EACCES`/`EPERM` 발생 시 서버 예외로 번지지 않고 명시적 skip 결과와 로그를 남기도록 방어

### 4. Docker/Coolify 런타임 볼륨 권한 선제 보정
- `Dockerfile`에 `su-exec` 추가
- entrypoint가 root로 시작해 `/app/runtime` 소유권을 `nv0:nv0`로 보정한 뒤 Node 프로세스를 `nv0` 사용자로 실행
- 기존처럼 앱 프로세스는 비root로 유지

### 5. 공개 API 계약 보정
- `/api/public/diagnosis-engine`에서 안내하던 `/api/public/system-items` 경로가 404가 되지 않도록 `/api/public/content`의 호환 alias로 연결

## 검증 결과
- `npm run check:syntax` 통과
- `npm run test:all` 통과
- `npm run test:e2e` 통과
- `npm run test:routes` 통과
- `npm run validate:deploy` 통과
- `npm run check:env-examples` 통과
- `npm run validate:phase167` 통과
- 로컬 smoke: `/healthz`, `/readyz`, `/privacy`, 정적 privacy asset, `/api/public/auth/session`, `/api/public/system-items`, `sitemap.xml`, `robots.txt`에서 5xx 없음
- 권한 제한 시뮬레이션: `db.json` 접근 불가 상태에서도 provider fallback 백업 생성 확인
