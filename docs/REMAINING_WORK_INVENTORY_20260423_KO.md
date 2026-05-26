# 남은 단계·영역·요소 인벤토리 (Phase304 갱신)

## 1. 현재 실제 구현 요소 수

- Public 페이지: **17**
- Admin 페이지: **7**
- 고유 API/헬스체크 라우트: **11**
- Shared 모듈: **18**
- 운영 스크립트: **97**
- 배포 파일: **16**
- 문서 파일: **110**
- 테스트 파일: **13**
- 추적 대상 총 파일 환산치: **400**

## 2. 남은 단계 수

- 총 남은 go-live 요소: **13**
- 패키지 내부 처리 완료: **13 / 13**
- 실서버·외부계정·실브라우저 확인 필요: **13 / 13**
- 현재 판정: **package-delivery-ready-live-verification-required**

## 3. 카테고리별 수량

- live-verification: **1**
- environment: **1**
- data-migration: **1**
- deployment: **1**
- visual-qa: **2**
- ops-observation: **1**
- payment: **1**
- mail: **1**
- storage: **1**
- security-session: **1**
- backup-restore: **1**
- observability: **1**

## 4. 남은 단계 상세

| 번호 | 작업 | 카테고리 | 상태 | 패키지 적용 근거 | 라이브 완료 근거 |
|---:|---|---|---|---|---|
| 1 | 배포 후 공개 페이지·가격·법적 고지 라이브 검증 | live-verification | package-ready-live-check-required | verify:prod expanded public/legal/price/admin checks | docs/current/VERIFY_PROD_REPORT.json live ok |
| 2 | 운영 환경변수 실제값 주입 | environment | package-ready-live-check-required | validate:env, deploy/env.production.nv0.kr.example | NV0_COMMERCIAL_LAUNCH_READY=true |
| 3 | 운영 DB 과거 게시글 정제·마이그레이션 | data-migration | package-ready-live-check-required | product-agent quality gate and cleanPublicText | 운영 DB 대상 dry-run 결과 |
| 4 | 배포 캐시 무효화 | deployment | package-ready-live-check-required | deployment runbook and cache checklist | 배포 후 새 CSS/JS 해시 확인 |
| 5 | Chrome·Edge·Safari 데스크톱 시각 QA | visual-qa | package-ready-live-check-required | button/layout static guard | 브라우저 캡처 검수 |
| 6 | 모바일 실기기 시각 QA | visual-qa | package-ready-live-check-required | responsive CSS hardening | 실기기 360/390/430px 확인 |
| 7 | 20분 자동발행 2회 이상 관측 | ops-observation | package-ready-live-check-required | cadence watchdog and phase298 validator | 운영 로그 2회 이상 |
| 8 | PortOne 결제 샌드박스·실결제 확인 | payment | package-ready-live-check-required | payment provider gate | 결제 성공·웹훅 수신 로그 |
| 9 | SMTP 발송 확인 | mail | package-ready-live-check-required | email outbox and ops self-test | 운영 수신함 확인 |
| 10 | R2/S3 업로드·다운로드 확인 | storage | package-ready-live-check-required | check-storage-config and storage adapter | 업로드·다운로드 probe |
| 11 | HTTPS 도메인 쿠키·세션 확인 | security-session | package-ready-live-check-required | verify:prod and security headers | 도메인 로그인 유지 확인 |
| 12 | 운영 백업·복구 리허설 | backup-restore | package-ready-live-check-required | backup:runtime, restore:drill, restore:latest | 복구 리허설 승인 기록 |
| 13 | 운영 모니터링·알림 수신 확인 | observability | package-ready-live-check-required | monitoring:rollback and ops report | 알림 수신 기록 |

## 5. 현재 고유 라우트 목록

- `/`
- `/.well-known/security.txt`
- `/api/diagnostics/start`
- `/favicon.ico`
- `/feed.xml`
- `/health`
- `/healthz`
- `/livez`
- `/readyz`
- `/robots.txt`
- `/sitemap.xml`
