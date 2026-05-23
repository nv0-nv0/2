# COMMERCIAL LAUNCH RUNBOOK

## 1. 사전 준비
1. `.env.example`을 기준으로 운영 환경변수를 설정한다.
2. 운영 도메인, DB, Redis, S3/R2, SMTP, PortOne 키를 운영 환경에만 입력한다.
3. `NV0_COMMERCIAL_LAUNCH_READY=false` 상태에서 먼저 전체 점검을 실행한다.

## 2. 법무 검수
1. `/business-info`, `/terms`, `/privacy`, `/refund`를 최신 정책 기준으로 확인한다.
2. 고지 문구, 책임 제한, 환불 제한, 개인정보 보유/파기 기준을 검토한다.
3. 검토 완료 후에만 `NV0_LEGAL_REVIEW_APPROVED=true`로 설정한다.

## 3. 결제 검수
1. 테스트 결제를 실행한다.
2. 결제 성공, 실패, 취소, 환불, 웹훅 검증 실패, 웹훅 재전송을 확인한다.
3. 운영 결제 승인 후에만 `NV0_PAYMENT_LIVE_READY=true`로 설정한다.
4. 운영 출시 전까지 `NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=false`를 유지한다.

## 4. 운영 검수
1. `/readyz` 또는 운영 상태 API를 확인한다.
2. 백업 파일 생성과 복원 리허설을 수행한다.
3. 장애 알림 수신을 확인한다.
4. 복구 리허설 후 `NV0_BACKUP_RESTORE_DRILL_APPROVED=true`, `NV0_INCIDENT_RESPONSE_DRILL_APPROVED=true`로 설정한다.

## 5. 출시 전 최종 판정
```bash
npm run phase287:final
```

## 6. 출시
1. `NV0_COMMERCIAL_LAUNCH_READY=true`로 전환한다.
2. `/api/public/commercial-readiness`에서 `commercialReady=true`인지 확인한다.
3. 관리자에서 `/api/admin/commercial-readiness/audit`를 확인한다.

## 7. 롤백
1. 결제 이슈 발생 시 `NV0_COMMERCIAL_LAUNCH_READY=false`로 전환한다.
2. 필요 시 `NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=false`로 유지해 결제 진입을 차단한다.
3. 직전 정상 ZIP 패키지로 되돌리고 DB/스토리지는 보존한다.
4. 백업 복구가 필요한 경우 운영 백업 절차에 따라 복원한다.
