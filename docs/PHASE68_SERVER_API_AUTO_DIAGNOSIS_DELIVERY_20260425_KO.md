# PHASE68 서버·API·자동 진단 로직 완성 보고서

## 완료 범위

- 실제 Node HTTP 서버(`server/index.mjs`)에 자동 진단 API 확장
- `POST /api/public/diagnose` 신규 별칭 추가
- `POST /api/public/scan` 응답에 `diagnosis` 패키지 포함
- `GET /api/public/diagnosis-engine` 공개 상태/룰/자동발행 설정 API 추가
- 단일 홈 페이지만 보던 방식에서 `/privacy`, `/terms`, `/refund`, `/business-info`, `/checkout`, `/cart`, `/order`까지 묶어 보는 다중 페이지 프로브 추가
- 결제 전 고지, 제공 범위, 법률 자문 아님 고지 룰 추가
- 진단 결과를 메인 체크 5개, 상위 이슈, 수정 계획, CTA, 게시판 자동발행 설정으로 구조화
- 무료 진단 화면에서 `/api/public/diagnose`를 호출하고 진단 칩/스캔 페이지를 렌더링하도록 수정
- 게시판 자동발행은 30분 주기와 6개 이상 유형 순환 구조 유지

## 핵심 API

### GET /api/public/diagnosis-engine
서버가 현재 사용하는 엔진 버전, 검사 룰, 자동발행 간격, 사용 가능한 API를 반환합니다.

### POST /api/public/diagnose
요청 예시:

```json
{
  "target": "https://your-store.kr",
  "turnstileToken": "optional"
}
```

응답 핵심:

```json
{
  "ok": true,
  "result": {
    "riskScore": 72,
    "riskLevel": "높음",
    "scannedPages": [],
    "detailFindings": [],
    "diagnosis": {
      "mainChecks": [],
      "topIssues": [],
      "fixPlan": [],
      "automation": {
        "boardName": "게시판",
        "intervalMinutes": 30
      }
    }
  }
}
```

## 운영 주의

- 내장 진단은 자동 점검/문구 제안 엔진이며 법률 자문을 대체하지 않습니다.
- 운영 배포에서 외부 스캔 사업자 API를 붙이려면 `NV0_SCAN_PROVIDER=external_http`, `NV0_SCAN_PROVIDER_URL`을 설정하면 됩니다.
- 기본값은 내장 엔진 fallback을 유지하여 외부 API 장애 시에도 진단 결과를 반환합니다.

## 검증

- `node --check server/index.mjs`
- `node scripts/test-all.mjs`
- `node scripts/validate-phase68-server-api-auto-diagnosis.mjs`
