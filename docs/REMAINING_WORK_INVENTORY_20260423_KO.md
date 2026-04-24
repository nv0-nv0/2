# 남은 단계·영역·요소 인벤토리 (2026-04-23)

## 1. 현재 실제 구현 요소 수

- Public 페이지: **8**
- Admin 페이지: **7**
- 고유 API/헬스체크 라우트: **50**
- Shared 모듈: **4**
- 운영 스크립트: **23**
- 배포 파일: **7**
- 문서: **42**
- 테스트 파일: **7**
- 추적 대상 총 파일 환산치: **129**

## 2. 구현 영역

| 영역 | 수량 | 상태 |
|---|---:|---|
| Public App 페이지 | 8 | 실제 확인 완료 |
| Admin App 페이지 | 7 | 실제 확인 완료 |
| API/헬스체크 라우트 | 50 | 실제 확인 완료 |
| 운영 스크립트 | 23 | 실제 확인 완료 |
| 배포 파일 | 7 | 실제 확인 완료 |
| 테스트 파일 | 7 | 실제 확인 완료 |

## 3. 남은 단계 수

- 총 남은 단계: **17**
- 동작 확인 필요: **15**
- 검증 미완료: **2**

## 4. 남은 단계 상세

| 번호 | 작업 | 상태 | 근거 |
|---:|---|---|---|
| 1 | Contabo VPS 생성 및 SSH 보안 초기화 | 동작 확인 필요 | 실서버 미생성 |
| 2 | Coolify 설치 및 관리자 계정 초기화 | 동작 확인 필요 | 실서버 필요 |
| 3 | DNS 레코드 및 Cloudflare 프록시 연결 | 동작 확인 필요 | 실도메인 필요 |
| 4 | Cloudflare Origin CA 설치 및 Full (strict) 검증 | 동작 확인 필요 | 실서버 필요 |
| 5 | Cloudflare Cache Rules 적용 | 동작 확인 필요 | 실도메인 필요 |
| 6 | Cloudflare Bot Fight Mode / Turnstile 실키 연결 | 동작 확인 필요 | 실키 필요 |
| 7 | Coolify 앱 생성 및 빌드/배포 | 동작 확인 필요 | 실서버 필요 |
| 8 | 운영 환경변수 최종 주입 | 동작 확인 필요 | 실서버 필요 |
| 9 | 프로덕션 PostgreSQL 연결 | 검증 미완료 | 현재는 runtime JSON 저장, 컷오버 문서만 제공 |
| 10 | 실결제 공급자 실연동 | 동작 확인 필요 | external_http 어댑터와 모의 공급자 검증 완료, 실사업자 키 필요 |
| 11 | 실스캔 엔진 실연동 | 동작 확인 필요 | external_http 어댑터와 모의 엔진 검증 완료, 실엔진 스펙/키 필요 |
| 12 | Cloudflare Rate Limit 실룰 적용 | 동작 확인 필요 | 실도메인 필요 |
| 13 | 배포 후 healthz/readyz 실검증 | 동작 확인 필요 | 실배포 필요 |
| 14 | 배포 후 공개/관리 E2E 실도메인 검증 | 동작 확인 필요 | 실배포 필요 |
| 15 | 백업 스케줄러 크론/잡 등록 | 동작 확인 필요 | 실서버 필요 |
| 16 | 운영 전환 및 컷오버 | 동작 확인 필요 | 실서비스 시점 필요 |
| 17 | 컷오버 후 24시간 모니터링 | 검증 미완료 | 운영 전환 이후 가능 |

## 5. 현재 고유 라우트 목록

- `/`
- `/api/admin/audit-logs`
- `/api/admin/auto-fix-jobs`
- `/api/admin/auto-fix-jobs/approve`
- `/api/admin/auto-fix-jobs/rollback`
- `/api/admin/backups`
- `/api/admin/backups/restore`
- `/api/admin/backups/run`
- `/api/admin/diagnostics`
- `/api/admin/guidance`
- `/api/admin/legal-updates`
- `/api/admin/legal-updates/seed`
- `/api/admin/library`
- `/api/admin/library/post`
- `/api/admin/library/upload`
- `/api/admin/logout`
- `/api/admin/maintenance/prune`
- `/api/admin/ops`
- `/api/admin/ops-report`
- `/api/admin/ops-report/run`
- `/api/admin/orders`
- `/api/admin/orders/advance`
- `/api/admin/orders/status`
- `/api/admin/publications`
- `/api/admin/publications/cta-generate`
- `/api/admin/publications/publish-now`
- `/api/admin/publications/seed`
- `/api/admin/rules`
- `/api/admin/session`
- `/api/admin/settings`
- `/api/admin/sites`
- `/api/admin/sites/rescan`
- `/api/admin/status`
- `/api/admin/subscriptions`
- `/api/admin/subscriptions/upsert`
- `/api/admin/system-items`
- `/api/public/board`
- `/api/public/checkout-session`
- `/api/public/config`
- `/api/public/content`
- `/api/public/document-preview`
- `/api/public/guidance`
- `/api/public/health`
- `/api/public/order`
- `/api/public/payment/complete`
- `/api/public/plans`
- `/api/public/portal-summary`
- `/api/public/scan`
- `/healthz`
- `/readyz`