# LEGAL / PAYMENT / OPS Commercial Checklist

## 성격
이 문서는 법률 자문이 아니라 상용 출시 전 누락을 막기 위한 운영 체크리스트입니다. 실제 출시 전에는 담당 법무 검토 또는 관련 기관의 최신 공식 기준 확인이 필요합니다.

## 법무 게이트
- [ ] 사업자 정보 페이지 `/business-info`에 상호, 대표자, 사업자등록번호, 통신판매업 신고, 고객지원 연락처, 소재지가 표시된다.
- [ ] 이용약관 `/terms`에 서비스 정의, 유료 산출물, 책임 제한, 이용 제한, 분쟁 처리 기준이 표시된다.
- [ ] 개인정보처리방침 `/privacy`에 수집 항목, 처리 목적, 보유 기간, 파기, 권리 행사, 보호책임자 연락처가 표시된다.
- [ ] 환불 정책 `/refund`에 청약철회 가능 기간, 디지털 산출물 제공 후 제한, 처리 기한, 예외 조건이 표시된다.
- [ ] 정책 버전 `NV0_POLICY_VERSION`이 운영 배포 버전과 일치한다.
- [ ] 법무 검토 후 `NV0_LEGAL_REVIEW_APPROVED=true`로 전환한다.

## 결제 게이트
- [ ] `NV0_PAYMENT_PROVIDER=portone_v2`
- [ ] PortOne 운영 API secret, store ID, channel key가 운영 환경에만 입력되어 있다.
- [ ] `NV0_PORTONE_WEBHOOK_SECRET`가 입력되어 있다.
- [ ] `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict`
- [ ] 테스트 결제, 취소, 환불, 웹훅 재전송 테스트를 완료했다.
- [ ] 실결제 검수 후 `NV0_PAYMENT_LIVE_READY=true`로 전환한다.
- [ ] 사전 출시 단계에서는 `NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=false`를 유지한다.

## 운영 게이트
- [ ] PostgreSQL 또는 운영 DB가 연결되어 있다.
- [ ] Redis 세션/레이트리밋/락이 연결되어 있다.
- [ ] S3/R2 산출물 저장소가 연결되어 있다.
- [ ] 고객/주문/결제 기록 암호화 키 `NV0_SECURE_RECORDS_KEY`가 설정되어 있다.
- [ ] 백업 암호화 키 `NV0_BACKUP_ENCRYPTION_SECRET`가 설정되어 있다.
- [ ] 백업/복구 리허설 후 `NV0_BACKUP_RESTORE_DRILL_APPROVED=true`로 전환한다.
- [ ] 장애 대응 리허설 후 `NV0_INCIDENT_RESPONSE_DRILL_APPROVED=true`로 전환한다.
- [ ] 운영 알림 이메일 `NV0_OPERATOR_ALERT_EMAIL`이 실제 수신 가능한 주소다.

## 최종 명령
```bash
npm run phase287:final
```
