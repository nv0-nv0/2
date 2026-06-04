# Deployment

## Boot-safe local or staging

```bash
npm run verify:release
npm start
```

## Strict commercial preparation

```bash
npm run secrets:generate
npm run generate:r2-env > .env.strict-commercial.generated
npm run deploy:precheck
node scripts/preflight.mjs .env.strict-commercial.generated
node scripts/validate-prod-env.mjs .env.strict-commercial.generated
node scripts/check-storage-config.mjs .env.strict-commercial.generated
```

Compose 선택 기준은 `deploy/README.md`를 확인합니다.

## Production verification

```bash
NV0_LIVE_BASE_URL=https://nv0.kr npm run live:smoke
```

실제 DNS, Coolify 환경변수, 컨테이너 빌드, PostgreSQL·Redis·S3 연결, PortOne 웹훅은 운영 환경에서 별도로 검증해야 합니다.


## v2.7 스티치 기관형 리디자인 마감

- 전체 공개 화면은 밝은 기관형 디자인과 한글 우선 문구를 사용합니다.
- 정적 CSS·JS는 `?v=2.7.1` 릴리즈 식별자를 사용하며, 식별자가 없는 자산은 장기 캐시하지 않습니다.
- 관리자 로그인은 상용 환경에서 계정 기반 RBAC를 사용하고, `NV0_ADMIN_MFA_REQUIRED=true`인 경우 TOTP 일회용 인증번호를 추가로 요구합니다.
- 운영 리포트에는 CSRF 토큰을 포함하지 않습니다.
- 배포 후에는 CDN·브라우저 캐시 제거와 데스크톱·모바일 육안 검수를 수행합니다.


## v2.7 운영 안정성 마감
- 신규 비밀번호는 15자 이상, 128자 이하로 제한하며 추측하기 쉬운 문자열을 차단합니다.
- 진단 오류 fallback 결과는 캐시에 고정하지 않습니다. 다시 진단하면 서버에 강제 재점검을 요청합니다.
- 브라우저 오류는 개인정보를 제거한 최소 필드만 `/api/public/client-metric`으로 전송합니다.
- 백업, 운영 리포트, 메일 처리, 환경 정리는 `/api/admin/jobs` 비동기 큐에서 실행하고 관리자 화면은 작업 상태를 확인합니다.
- 공개 메뉴는 `진단`, `인사이트`, `요금제`, `고객 포털` 한글 표기를 기준으로 고정합니다.

## v2.7 관리자 2차 인증 배포 정합성

- 상용 프로파일은 `NV0_ADMIN_MFA_REQUIRED=true`를 필수로 사용합니다.
- `npm run secrets:generate` 또는 `npm run generate:r2-env`가 Base32 형식의 `NV0_ADMIN_TOTP_SECRET`을 생성합니다.
- 실제 관리자 계정의 인증 앱에 TOTP 비밀값을 안전하게 등록한 뒤 운영 환경변수 저장소에 주입하십시오.
- TOTP 비밀값은 Git, ZIP, 운영 보고서, 고객 화면에 노출하지 마십시오.
