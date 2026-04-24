# PHASE12 최종 재검수 및 상용 배포 보강 보고서

## 수정 완료 항목

1. Dockerfile 상용 배포 실패 요인 수정
   - 기존 `COPY package.json package-lock.json ./`는 `package-lock.json` 미포함 상태에서 Docker build 실패 가능성이 있었습니다.
   - `COPY package*.json ./`로 수정했습니다.
   - 런타임 이미지를 `node:22-alpine`로 정렬했습니다.

2. 공개 법적 고지 페이지 디버그 출력 제거
   - `apps/public/business-info/app.js`
   - `apps/public/privacy/app.js`
   - `apps/public/refund/app.js`
   - `apps/public/terms/app.js`
   - 위 파일의 `console.log`를 제거하여 클라이언트 디버그 잔존 검사를 통과했습니다.

3. 런타임 기본 데이터 누락 보완
   - `runtime/data/db.json` 추가
   - `runtime/data/sessions.json` 추가
   - 초기 세션은 빈 배열로 정리했습니다.
   - 테스트 중 생성된 업로드/백업/리포트 런타임 산출물은 패키징 전 제거했습니다.

## 최종 검증 결과

- `npm run test:all` 통과: 20/20
- `npm run ci:strict` 통과
- `npm run validate:deploy` 통과
- `npm run validate:commercial-runtime` 통과

## 확인 제한

현재 작업 환경에 Docker CLI가 설치되어 있지 않아 실제 `docker build` 명령은 직접 실행하지 못했습니다. 다만 Dockerfile의 명백한 `package-lock.json` COPY 실패 요인은 수정 완료했습니다.

## 배포 전 필수 운영 입력값

상용 공개 전 `.env` 또는 Coolify 환경변수에 아래 운영값은 반드시 실제 값으로 입력해야 합니다.

- `NV0_PLATFORM_TARGET=commercial`
- `NV0_ADMIN_AUTH_MODE=account_rbac`
- `NV0_PERSISTENCE_MODE=postgres_primary`
- `NV0_SESSION_STORE=redis`
- `NV0_RATE_LIMIT_STORE=redis`
- `NV0_STORAGE_MODE=s3_compatible`
- `NV0_SCAN_PROVIDER=external_http`
- `NV0_PAYMENT_PROVIDER=portone_v2`
- PortOne 운영 Secret / Store ID / Channel Key / Webhook Secret
- PostgreSQL / Redis / S3 접속정보
- Cloudflare Turnstile 사용 시 Site Key / Secret

## 결론

코드·정적검사·런타임 테스트·상용 런타임 계약 검증 기준으로 공개 배포 가능한 상태까지 보강 완료했습니다. 실제 운영 공개는 위 운영 환경변수와 외부 연동키 입력 후 `/readyz` 200 확인을 기준으로 전환합니다.
