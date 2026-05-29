# VERIDION phase346 global-hardening final

VERIDION은 온라인 사업자의 공개 웹사이트를 기준으로 고객 신뢰·고지·환불·개인정보·전환 이슈를 진단하고, 무료 미리보기 → 유료 리포트 → 전문가 검토 → 고객 포털 관리로 이어지는 상용 진단 서비스 패키지입니다.

## 최종 실행

```bash
npm run phase346:final
```

`release:predeploy`, `delivery:final`, `./RUN_ALL_TESTS.sh`는 모두 `phase346:final`을 바라봅니다. 납품 전에는 아래 명령 중 하나만 실행해도 동일한 최종 게이트를 통과해야 합니다.

```bash
npm run release:predeploy
npm run delivery:final
./RUN_ALL_TESTS.sh
```

운영 서버에 실제 반영한 뒤에는 아래 명령으로 라이브 스모크를 별도 실행합니다.

```bash
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

`NV0_LIVE_BASE_URL`이 없으면 오프라인 패키지 게이트에서는 라이브 스모크가 skip으로 통과합니다. 이는 서버 접근 권한이 없는 납품 환경을 위한 처리이며, 운영 배포 완료 판정은 반드시 위 라이브 명령으로 별도 확인해야 합니다.

## phase346에서 추가 고정한 핵심 문제

- phase345의 216개 레드팀 개선을 유지하면서 최종 명령 체계를 phase346으로 통일했습니다.
- 무료 데모 `/api/public/diagnose`는 외부 진단 provider가 500을 반환해도 사용자에게 `서버 오류가 발생했습니다`로 끝나지 않고 내장 진단 fallback 결과를 반환합니다.
- 운영 배포 후 확인해야 하는 `/healthz`, `/api/public/health`, `/api/public/config`, `/api/public/diagnose` 라이브 계약을 `npm run live:smoke`로 표준화했습니다.
- Docker/Coolify healthcheck는 HTTP 200만 보지 않고 `/healthz` JSON body의 `ok:true`까지 확인합니다.
- 운영 검증은 `NV0_SCAN_PROVIDER_FALLBACK=false`를 차단해 public demo 장애 전파를 막습니다.
- 최종 게이트는 phase345 누적 검증에 public demo provider-500 회귀 테스트, release currentness, live smoke operator gate, phase346 validator를 추가했습니다.

## 최종 게이트에 포함된 검증

- phase345 최종 게이트 전체
- 구문 검사, 단위 테스트, E2E, route smoke, link check
- public page integrity, responsive contract, performance budget
- SSRF/CSRF/header/secret hygiene 보안 검증
- public API isolation live audit
- operational readiness contract
- diagnose fallback 회귀 테스트
- public health/error contract 회귀 테스트
- public demo external-provider-500 fallback 회귀 테스트
- release currentness 검증
- live smoke operator contract
- runtime clean 검증

## 운영 배포 후 필수 확인

```bash
npm run release:predeploy
NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke
```

라이브 스모크가 확인하는 항목:

1. `/healthz` HTTP 200 + JSON `ok:true`
2. `/api/public/health` HTTP 200 + `cache-control: no-store`
3. `/api/public/config` HTTP 200 + `ok:true`
4. `/api/public/diagnose` 정상 URL 200
5. `/api/public/diagnose` 잘못된 URL 400

## 주요 문서

- `docs/PHASE344_216_REDTEAM_REMEDIATION_REPORT.md` — 216개 레드팀 처리표
- `docs/PHASE345_FINAL_DELIVERY_CLOSEOUT.md` — phase345 납품 마감 보고서
- `docs/PHASE346_GLOBAL_HARDENING_WORK_ORDER.md` — 전역 고도화 작업지시서
- `docs/PHASE346_REMAINING_STEPS_MATRIX.md` — 남은 단계·요소·영역 84개 처리표
- `docs/PHASE346_GLOBAL_HARDENING_CLOSEOUT.md` — phase346 최종 납품 보고서
- `docs/current/PHASE346_FINAL_GATE_REPORT.json` — phase346 최종 게이트 실행 결과

## 실행 환경

- Node.js 18+ 권장
- 운영 환경에서는 `.env.example`, `deploy/env.production.nv0.kr.example`, `deploy/env.commercial.template` 기준으로 환경변수를 구성합니다.
- API 키, 토큰, DB URL, 결제 키는 코드에 직접 넣지 않습니다.

## 최종 판정

로컬 패키지 기준 최종 납품 게이트는 `npm run phase346:final`입니다. 실제 nv0.kr 운영 서버 해결 여부는 운영 배포 후 `NV0_LIVE_BASE_URL=https://www.nv0.kr npm run live:smoke`가 통과해야 확정할 수 있습니다.
