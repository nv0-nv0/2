# Operations

## Routine checks

```bash
npm run verify:quick
npm run clean:runtime && npm run check:runtime-clean
npm run ops:report
npm run ops:matrix
```

## Runtime data policy

배송본에는 `runtime/data/db.seed.json`만 포함합니다. 실제 DB, 세션, 보안 레코드, 업로드, 백업, 리포트는 로컬 또는 운영 런타임에서 생성하며 배송 ZIP에 포함하지 않습니다.

## Observability

- `/healthz`: 프로세스 생존 상태
- `/readyz`: 필수 의존성을 포함한 준비 상태
- 운영 배포 후 `npm run live:smoke`로 공개 경로를 재검증합니다.


## v2.7 스티치 기관형 리디자인 마감

- 전체 공개 화면은 밝은 기관형 디자인과 한글 우선 문구를 사용합니다.
- 정적 CSS·JS는 `?v=2.7.1` 릴리즈 식별자를 사용하며, 식별자가 없는 자산은 장기 캐시하지 않습니다.
- 관리자 로그인은 상용 환경에서 계정 기반 RBAC를 사용하고, `NV0_ADMIN_MFA_REQUIRED=true`인 경우 TOTP 일회용 인증번호를 추가로 요구합니다.
- 운영 리포트에는 CSRF 토큰을 포함하지 않습니다.
- 배포 후에는 CDN·브라우저 캐시 제거와 데스크톱·모바일 육안 검수를 수행합니다.


## v2.7 운영 안정성 마감
- 신규 비밀번호는 15자 이상, 128자 이하로 제한하며 추측하기 쉬운 문자열을 차단합니다.
- 진단 오류 fallback 결과는 캐시에 고정하지 않습니다. 다시 진단하면 서버에 강제 재점검을 요청합니다.
- 브라우저 오류는 개인정보를 제거한 최소 필드만 `/api/public/client-metric`으로 전송합니다.
- 백업, 운영 리포트, 메일 처리, 환경 정리는 `/api/admin/jobs` 비동기 큐에서 실행하고 관리자 화면은 작업 상태를 확인합니다.
- 공개 메뉴는 `진단`, `인사이트`, `요금제`, `고객 포털` 한글 표기를 기준으로 고정합니다.

## v2.7 운영 작업 큐 동시성 마감

- 백업, 운영 보고서, 메일 대기열 처리, 환경 정리 작업은 비동기 작업 ID를 즉시 반환합니다.
- Redis 잠금 공급자를 사용하는 상용 환경에서는 동일 작업 ID의 중복 실행을 분산 잠금으로 차단합니다.
- 일시적 실패는 최대 3회까지 지수 백오프로 재시도하며, 서버 재시작 시 대기·실행·재시도 예약 작업을 복구합니다.
- 관리자 API의 운영 경로는 `server/routes/ops.mjs` 한 곳으로 통합했습니다.

## 배송 런타임 위생
- 배송본에는 `runtime/data/db.seed.json`만 포함합니다.
- `runtime-ui/`, `runtime/data/db.json`, 세션, 보안 레코드, 업로드, 백업, 리포트는 배송 ZIP에 포함하지 않습니다.
- 로컬 검증 이후에는 `npm run clean:runtime`과 `npm run check:runtime-clean`을 실행합니다.

## 시스템 제어면 운영

관리자는 `/api/admin/system-control-plane`에서 레이어·파이프라인 상태를 확인하고 `/api/admin/system-control-plane/events`에 장애·복구 이벤트를 기록합니다. 공개 상태는 `/api/public/system-control-plane`에서 내부 경로 없이 제공됩니다.

## 제어면 운영 이벤트 안전성

운영 이벤트 메모는 시크릿·토큰을 저장 전 마스킹합니다. correlation ID 또는 동일 fingerprint가 짧은 시간 안에 반복되면 중복 저장을 억제합니다. 상세 절차는 `docs/SYSTEM_CONTROL_PLANE_OPERATIONS_HARDENING_KO.md`를 확인합니다.
