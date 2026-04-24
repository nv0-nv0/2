# NV0 / Veridion 실배포 입력값 작성지 2026-04-23

이 문서는 **Contabo + Coolify + Cloudflare** 실투입 직전에 운영자가 실제 값을 채워 넣는 최종 입력지다.
값을 채운 뒤 아래 순서로 사용한다.

1. `deploy/env.production.nv0.kr.example` 복사 후 실제 `.env` 작성
2. `npm run validate:env -- deploy/.env.production.actual` 로 검증
3. `docs/COOLIFY_INPUT_MATRIX_20260423_KO.md` 입력
4. `docs/CLOUDFLARE_INPUT_MATRIX_20260423_KO.md` 입력
5. `docs/CUTOVER_CHECKLIST_20260423_KO.md` 실행

## 1) Contabo 서버 실제값
- VPS 플랜명: ____________________
- vCPU / RAM / Disk: ____________________
- 공인 IP: ____________________
- 리전: Tokyo / Japan
- OS: Ubuntu 24.04 LTS
- SSH 포트: ____________________
- 운영 계정명: ____________________
- SSH 공개키 적용 여부: [ ] 예 [ ] 아니오
- UFW 적용 여부: [ ] 예 [ ] 아니오

## 2) Coolify 실제값
- Coolify URL: ____________________
- 프로젝트명: nv0-veridion-prod
- 애플리케이션명: nv0-veridion-app
- 리포지토리 URL: ____________________
- 브랜치: release
- Build Pack / Dockerfile: Dockerfile
- Container Port: 3210
- Persistent volume paths:
  - /app/runtime/data
  - /app/runtime/uploads
  - /app/runtime/backups
  - /app/runtime/reports
- Healthcheck path: /healthz
- Readiness path: /readyz

## 3) 도메인 실제값
- 루트 도메인: nv0.kr
- www: www.nv0.kr
- 관리자 전용 서브도메인 사용 여부: [ ] 아니오 (권장 기본) [ ] 예
- 앱 기본 URL: https://nv0.kr
- 확인용 URL: https://www.nv0.kr

## 4) Cloudflare 실제값
- Zone: nv0.kr
- SSL/TLS mode: Full (strict)
- Universal SSL: [ ] 켜짐
- Origin CA 발급: [ ] 완료
- Always Use HTTPS: [ ] 켜짐
- Automatic HTTPS Rewrites: [ ] 켜짐
- TLS 1.3: [ ] 켜짐
- HTTP/3: [ ] 켜짐
- Tiered Cache: [ ] 켜짐
- Bot Fight Mode: [ ] 켜짐
- Turnstile site key: ____________________
- Turnstile secret: ____________________

## 5) DNS 레코드 실제값
| Type | Name | Content | Proxy |
|---|---|---|---|
| A | @ | ____________________ | Proxied |
| A | www | ____________________ | Proxied |

## 6) 운영 환경변수 실제값
- NODE_ENV=production
- PORT=3210
- NV0_ADMIN_KEY=________________________________
- NV0_ADMIN_SESSION_TTL_MS=3600000
- NV0_TRUST_PROXY_HEADERS=true
- NV0_ALLOWED_ADMIN_ORIGINS=nv0.kr,www.nv0.kr
- NV0_ENABLE_TURNSTILE=true
- NV0_TURNSTILE_SITE_KEY=________________________________
- NV0_TURNSTILE_SECRET=________________________________
- NV0_PUBLIC_SCAN_LIMIT=20
- NV0_PUBLIC_SCAN_WINDOW_MS=60000
- NV0_ADMIN_AUTH_LIMIT=8
- NV0_ADMIN_AUTH_WINDOW_MS=600000
- NV0_BACKUP_RETENTION_COUNT=20
- NV0_AUDIT_LOG_RETENTION_COUNT=200

## 7) 배포 후 즉시 검증
- [ ] `NV0_BASE_URL=https://nv0.kr npm run verify:prod`
- [ ] 공개 홈 관리자 흔적 0개
- [ ] `/admin` 키 게이트만 노출
- [ ] 로그인 없이 `/admin/console` 접근 차단
- [ ] 데모 제출/결과/플랜 이동 확인
- [ ] 관리자 진단/백업/복원 확인
- [ ] 로그아웃 후 재진입 차단
