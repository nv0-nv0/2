# Phase305 Remaining Stage Inventory

## Summary

- Total remaining go-live elements: **13**
- Package-side controls completed: **13 / 13**
- Live/external actions still required: **13 / 13**
- Live verified: **0 / 13**
- Current judgement: **package-delivery-ready-live-verification-required**

## Category Counts

- live-verification: 1
- environment: 1
- data-migration: 1
- deployment: 1
- visual-qa: 2
- ops-observation: 1
- payment: 1
- mail: 1
- storage: 1
- security-session: 1
- backup-restore: 1
- observability: 1

## Remaining Elements

| No | Category | Element | Current status | Package control applied | Required live signal |
|---:|---|---|---|---|---|
| 1 | live-verification | 배포 후 공개 페이지·가격·법적 고지 라이브 검증 | package-ready-live-check-required | verify:prod expanded public/legal/price/admin checks | docs/current/VERIFY_PROD_REPORT.json live ok |
| 2 | environment | 운영 환경변수 실제값 주입 | package-ready-live-check-required | validate:env, deploy/env.production.nv0.kr.example | NV0_COMMERCIAL_LAUNCH_READY=true |
| 3 | data-migration | 운영 DB 과거 게시글 정제·마이그레이션 | package-ready-live-check-required | product-agent quality gate and cleanPublicText | 운영 DB 대상 dry-run 결과 |
| 4 | deployment | 배포 캐시 무효화 | package-ready-live-check-required | deployment runbook and cache checklist | 배포 후 새 CSS/JS 해시 확인 |
| 5 | visual-qa | Chrome·Edge·Safari 데스크톱 시각 QA | package-ready-live-check-required | button/layout static guard | 브라우저 캡처 검수 |
| 6 | visual-qa | 모바일 실기기 시각 QA | package-ready-live-check-required | responsive CSS hardening | 실기기 360/390/430px 확인 |
| 7 | ops-observation | 20분 자동발행 2회 이상 관측 | package-ready-live-check-required | cadence watchdog and phase298 validator | 운영 로그 2회 이상 |
| 8 | payment | PortOne 결제 샌드박스·실결제 확인 | package-ready-live-check-required | payment provider gate | 결제 성공·웹훅 수신 로그 |
| 9 | mail | SMTP 발송 확인 | package-ready-live-check-required | email outbox and ops self-test | 운영 수신함 확인 |
| 10 | storage | R2/S3 업로드·다운로드 확인 | package-ready-live-check-required | check-storage-config and storage adapter | 업로드·다운로드 probe |
| 11 | security-session | HTTPS 도메인 쿠키·세션 확인 | package-ready-live-check-required | verify:prod and security headers | 도메인 로그인 유지 확인 |
| 12 | backup-restore | 운영 백업·복구 리허설 | package-ready-live-check-required | backup:runtime, restore:drill, restore:latest | 복구 리허설 승인 기록 |
| 13 | observability | 운영 모니터링·알림 수신 확인 | package-ready-live-check-required | monitoring:rollback and ops report | 알림 수신 기록 |

## Completion Rule

Phase305 treats all package-side work as complete only when this file, the machine-readable JSON inventory, the work order, and the phase305 validator agree on the same 13 go-live elements. Real commercial-live-ready status is reserved for the post-deploy environment after all 13 live signals are verified.
