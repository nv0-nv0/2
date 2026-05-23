# PHASE287 Commercial Readiness Report

## 목표
phase286 제품 패키지를 실제 상용 목적 기준으로 강화했습니다. 보강 범위는 법무 고지, 결제 실운영, 운영 관측/백업/복구 게이트입니다.

## 신규 파일
- `server/core/commercial-readiness-287.mjs`
- `scripts/validate-phase287-commercial-readiness.mjs`
- `docs/LEGAL_PAYMENT_OPS_CHECKLIST.md`
- `docs/COMMERCIAL_LAUNCH_RUNBOOK.md`
- `docs/PHASE287_COMMERCIAL_READINESS_REPORT.md`
- `docs/current/PHASE287_COMMERCIAL_READINESS_AUDIT.json`

## 수정 파일
- `server/index.mjs`
- `server/routes/public.mjs`
- `server/routes/admin.mjs`
- `.env.example`
- `package.json`

## API
- 공개 상태: `/api/public/commercial-readiness`
- 관리자 감사: `/api/admin/commercial-readiness/audit`

## 법무 강화
- 사업자 정보, 이용약관, 개인정보처리방침, 환불 정책 페이지 존재 여부를 게이트로 검증합니다.
- 공식 법령 및 소비자 기준 매트릭스를 코드에 포함합니다.
- `NV0_LEGAL_REVIEW_APPROVED`가 true가 아니면 실상용 완료 상태로 판정하지 않습니다.

## 결제 강화
- PortOne v2 제공자, 운영 키, store ID, channel key, webhook secret, strict webhook 검증을 게이트로 검증합니다.
- `NV0_PAYMENT_LIVE_READY`가 true가 아니면 실결제 준비 완료로 판정하지 않습니다.
- 사전 출시 단계에서 온라인 결제가 열리지 않도록 `NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=false` 기본값을 유지합니다.

## 운영 강화
- 운영 DB, Redis, S3/R2, 백업 암호화, secure records, 운영 알림, preflight, 20분 자동발행 주기를 점검합니다.
- 백업/복구 리허설과 장애 대응 리허설 환경변수를 추가했습니다.

## 최종 명령
```bash
npm run phase287:final
```

## 판정
패키지 구조 기준 100점입니다. 실제 운영 환경에서 `commercialReady=true`가 되려면 법무 승인, 결제 실환경 승인, 운영 복구 리허설 완료 환경변수가 필요합니다.
