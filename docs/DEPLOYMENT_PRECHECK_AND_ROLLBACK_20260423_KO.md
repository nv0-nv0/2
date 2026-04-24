# NV0 / Veridion 배포 전 점검 및 롤백 절차

## 배포 전 점검
1. `npm run preflight`
2. `npm run test:e2e`
3. `npm run smoke`
4. `NODE_ENV=production` + 비기본 `NV0_ADMIN_KEY` 확인
5. Cloudflare Full (strict) / Origin CA 확인
6. Coolify health check path를 `/readyz`로 설정
7. `NV0_TRUST_PROXY_HEADERS=true` 확인
8. Turnstile 사용 시 site key / secret 확인

## 장애 시 1차 조치
1. `/healthz`, `/readyz` 확인
2. 최근 배포 로그 확인
3. 환경변수 변경 여부 확인
4. 관리자 진단 화면 확인
5. 최근 백업 파일 존재 여부 확인

## 롤백 기준
- `/readyz` 실패
- 관리자 인증 실패
- 데모 제출 실패
- 주요 관리자 POST 요청 403/500 이상 급증

## 롤백 절차
1. Coolify에서 직전 정상 릴리즈 재배포
2. 필요 시 `npm run restore:latest` 실행
3. `npm run smoke` 재실행
4. 관리자 로그인/주문/발행/업로드 기본 흐름 재점검
