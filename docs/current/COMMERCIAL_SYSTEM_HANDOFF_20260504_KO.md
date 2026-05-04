# nv0.kr 현재 상용 시스템 인수 문서

## 1. 현재 기준

이 문서는 PHASE200 패키지의 최신 운영 기준입니다. 이전 PHASE 문서가 많아도 실제 운영·배포 판단은 이 문서를 우선합니다.

## 2. 핵심 실행 명령

```bash
npm start
npm run check:syntax
npm run test:all
npm run check:pages
npm run test:routes
npm run check:links -- --summary
npm run smoke
npm run validate:phase192
npm run test:phase193-200
npm run validate:phase193-200
npm run phase200:final
npm run release:secure-package
```

## 3. 환경변수 원칙

운영 secret은 ZIP 내부에 넣지 않습니다. Coolify 또는 서버 secret store에 주입합니다.

필수 운영군:

- `NV0_PUBLIC_BASE_URL`
- `NV0_SUPPORT_EMAIL`
- `NV0_SESSION_SECRET`
- `NV0_PERSISTENCE_MODE`
- `NV0_DATABASE_URL`
- `NV0_REDIS_URL`
- `NV0_STORAGE_MODE`
- `NV0_S3_BUCKET`
- `NV0_S3_ENDPOINT`
- `NV0_S3_ACCESS_KEY_ID`
- `NV0_S3_SECRET_ACCESS_KEY`
- `NV0_PAYMENT_PROVIDER`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_SMTP_URL`
- `NV0_OPERATOR_ALERT_EMAIL`
- `NV0_BACKUP_ENCRYPTION_SECRET`

## 4. 배포 전 체크

| 순서 | 명령 | 통과 기준 |
|---:|---|---|
| 1 | `npm run check:syntax` | JS/CSS/HTML 문법 통과 |
| 2 | `npm run test:all` | 기존 전체 테스트 통과 |
| 3 | `npm run validate:phase192` | 디자인 시스템 유지 |
| 4 | `npm run validate:phase193-200` | 상용 시스템 계층 통과 |
| 5 | `npm run phase200:final` | 통합 게이트 통과 |
| 6 | `npm run release:secure-package` | runtime/env 제외 ZIP 생성 |

## 5. 운영 중 확인 URL

| URL | 목적 |
|---|---|
| `/healthz` | 프로세스 생존, 기본 health detail |
| `/readyz` | DB/Redis/S3/결제/환경 준비 상태 |
| `/api/admin/diagnostics` | 관리자 진단 상태 |
| `/api/admin/ops-report` | 운영 리포트 |
| `/api/admin/backups` | 백업 목록 |

## 6. 장애 대응

1. `/readyz` 확인
2. 최근 로그에서 `requestId` 검색
3. `incident.severity=high` 로그 확인
4. 결제/주문 문제면 webhook idempotency key와 order status history 확인
5. 산출물 문제면 fulfillment checklist 확인
6. 데이터 문제면 백업 상태 확인 후 `restore:drill` 실행

## 7. 고객지원 기준

고객 문의에는 다음 정보를 우선 확인합니다.

- 주문 ID
- 결제 ID
- requestId
- 대상 URL
- 산출물 ID 또는 리포트 경로
- 고객 이메일

## 8. 금지 사항

- 운영 secret을 ZIP에 포함 금지
- runtime/data를 납품 ZIP에 포함 금지
- 실결제 확인 없이 결제 완료 주장 금지
- 자동 진단 결과를 법률 확정 판단처럼 표현 금지
- `innerHTML` 신규 사용 시 escape 또는 safe-dom 정책 없이 병합 금지

## 9. 외부 연동 후 추가 검증

외부 계정 연결 후 다음은 운영 환경에서 직접 확인해야 합니다.

- PortOne sandbox/live 결제 승인 및 webhook 재처리
- PostgreSQL 쓰기/읽기/마이그레이션
- Redis session/rate-limit/lock ping
- S3/R2 업로드/다운로드 권한
- SMTP 발송/재시도 큐
- 원격 백업 암호화/복구 drill
