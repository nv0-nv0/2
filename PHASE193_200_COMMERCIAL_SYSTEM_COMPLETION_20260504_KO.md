# PHASE193–200 상용 시스템 완성 보고서

## 적용 요약

이번 패치는 단순 명칭 추가가 아니라, PHASE192 디자인 시스템 위에 운영 안정성·진단 신뢰도·결제/산출물 플로우·릴리즈 위생·관측성·클라이언트 렌더 보안을 코드와 검증 스크립트로 추가한 상용화 강화 패키지입니다.

실제 라이브 서버, 실운영 DB, PortOne 실승인 내역, 외부 SMTP/S3/Redis 계정은 이 패키지 내부에서 검증할 수 없으므로 실운영 값은 환경변수로 주입하고 `/readyz`, 검증 스크립트, 운영 런북으로 확인하도록 설계했습니다. 외부 연결이 필요한 항목에 대해 실승인이 완료되었다고 주장하지 않습니다.

## 반영 파일

| 구분 | 파일 | 내용 |
|---|---|---|
| 환경 검증 | `server/bootstrap/commercial-env.mjs` | 상용 환경변수 매트릭스, 필수값 검증, 비밀값 마스킹 |
| API 표준 | `server/core/api-response.mjs` | 표준 API 응답, requestId, 오류 정규화 |
| 진단 신뢰도 | `server/services/diagnosis-trust.mjs` | 룰 버전, 근거 스냅샷, 신뢰도 점수, 재진단 비교 |
| 주문/산출물 | `server/services/order-fulfillment.mjs` | 주문 상태 전이, webhook idempotency, 산출물 체크리스트 |
| 감사 로그 | `server/services/audit-log.mjs` | JSONL 감사 로그, 민감값 redaction |
| 관측성 | `server/services/observability.mjs` | 구조화 로그, health detail, incident 분류 |
| 렌더 보안 | `shared/render-policy.js` | 클라이언트 렌더 정책 선언 및 safe-dom 연동 |
| 릴리즈 위생 | `scripts/create-secure-release.mjs` | runtime/env 제외 보안 ZIP 생성 |
| 검증 | `scripts/validate-phase193-200-commercial-system.mjs` | PHASE193–200 코드/문서/스크립트/연동 검사 |
| 서비스 테스트 | `tests/phase193-200-services.mjs` | 신규 상용 서비스 모듈 단위 테스트 |
| 운영 인수 문서 | `docs/current/COMMERCIAL_SYSTEM_HANDOFF_20260504_KO.md` | 운영자/배포자용 현재 기준 문서 |

## 서버 통합

`server/index.mjs`에는 다음이 실제 반영되었습니다.

- `validateCommercialEnv` import 및 `/readyz` payload에 상용 환경 검증 결과 포함
- `buildHealthDetails`를 통한 `/healthz` 응답 고도화
- `classifyIncident`를 통한 서버 오류 로그의 incident severity 분류
- 기존 requestId 헤더와 호환 유지

## 진단 신뢰도 계층

진단 결과에는 다음 데이터를 붙일 수 있도록 구현했습니다.

- `rulesVersion`: 진단 기준 버전
- `evidenceSnapshot`: 수집 페이지 URL/status/content hash/finding code
- `confidence`: coverage, evidence ratio, manual review count 기반 신뢰도
- `compareDiagnosisResults`: 이전 진단 대비 추가/해소/유지 항목 비교

## 결제·주문·산출물 플로우

새 주문 상태 전이 그래프는 다음 흐름을 기준으로 합니다.

`created → pending_payment → paid → generating → fulfilled`

예외 흐름:

- `payment_failed`
- `generation_failed`
- `refunding`
- `refunded_partial`
- `refunded_full`
- `cancelled`
- `expired`

Webhook 중복 처리를 막기 위해 `createIdempotencyKey`, `verifyWebhookIdempotency`를 추가했습니다.

## 릴리즈 위생

`npm run release:secure-package`는 다음을 제외한 보안 릴리즈 ZIP을 생성합니다.

- `.env`, `.env.local`, `.env.production`
- `.git`
- `node_modules`
- `runtime/data`
- `runtime/uploads`
- `runtime/backups`
- `runtime/reports`
- `coverage`

## 검증 명령

```bash
npm run test:phase193-200
npm run validate:phase193-200
npm run phase200:final
npm run release:secure-package
```

## 운영 연결 후 필수 확인

| 항목 | 확인 방법 |
|---|---|
| PostgreSQL | `NV0_PERSISTENCE_MODE=postgres_primary`, `NV0_DATABASE_URL` 주입 후 `/readyz` 확인 |
| Redis | `NV0_REDIS_URL`, `NV0_READYZ_REDIS_STRICT=true` 주입 후 `/readyz` 확인 |
| S3/R2 | `NV0_STORAGE_MODE=s3` 및 S3 변수 주입 후 산출물 업로드 테스트 |
| PortOne | `NV0_PAYMENT_PROVIDER=portone_v2` 및 PortOne 변수 주입 후 sandbox/live webhook 테스트 |
| SMTP | `NV0_SMTP_URL` 주입 후 테스트 메일 및 재시도 큐 확인 |
| 백업 암호화 | `NV0_BACKUP_ENCRYPTION_SECRET` 주입 후 백업/복구 drill 수행 |

## 한계 고지

이 패키지는 코드·검증·운영 구조를 완성한 납품본입니다. 다만 외부 계정과 실운영 secret이 필요한 항목은 실제 운영 환경에서 값 주입 후 검증해야 합니다. 라이브 결제 승인, 실제 운영 DB 데이터 정합성, 외부 메일 발송 성공 여부는 이 로컬 패키지 단계에서 확인되지 않았습니다.
