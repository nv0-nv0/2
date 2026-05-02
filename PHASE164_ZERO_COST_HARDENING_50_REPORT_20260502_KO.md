# PHASE164 Zero Cost Hardening 50 개선·검증·납품 보고서

## 1. 처리 원칙

Phase161 Zero Cost Max Coverage 이후 제기된 50개 보안·인프라·프론트엔드·운영·QA 항목을 전부 재분류했다. 외부 계정, 유료 서비스, 실제 운영 키 입력이 필요한 항목은 코드로 거짓 완료 처리하지 않고 `operator_required`로 분리했다. 패키지 내부에서 즉시 보강 가능한 항목은 코드, Compose, 검증 스크립트, 운영 문서로 반영했다.

## 2. 이번 패키지에서 실제 반영한 항목

### 보안·인증
- `/api/public/hardening-matrix`, `/api/admin/hardening-matrix` 추가: 50개 항목의 상태를 운영 화면/API에서 확인할 수 있게 했다.
- `/api/public/openapi.json` 추가: Swagger/OpenAPI 기반 API 계약 확인이 가능하도록 했다.
- `/health`, `/livez` 별칭 추가: 기존 `/healthz`, `/readyz`와 함께 로드밸런서/모니터링 호환성을 높였다.
- Slow request warn 로그 추가: `NV0_SLOW_REQUEST_THRESHOLD_MS` 기본 1500ms 이상 요청은 `event=slow_request`로 기록한다.
- 데이터 파기 보강: `cleanupDataRetention()`을 추가해 만료 세션, 만료/사용 완료 비밀번호 재설정 토큰, 오래된 idempotency key, 오래된 운영 이벤트를 정리하고, 비활성 고객은 `NV0_DATA_DESTRUCTION_GRACE_DAYS` 이후 익명화한다.
- Docker 실행 보안 보강: 앱 컨테이너에 `no-new-privileges:true`, `cap_drop: ALL`을 적용했다.

### DB·인프라
- Compose 로그 로테이션 추가: app/postgres/redis에 `json-file`, `max-size=10m`, `max-file=5`를 적용했다.
- 비파괴 복구훈련 스크립트 추가: `npm run restore:drill`은 운영 DB 파일을 덮어쓰지 않고 별도 restore-target으로 해시 검증을 수행한다.
- Zero-cost stress smoke 추가: `npm run stress:smoke`는 임시 런타임으로 서버를 띄우고 주요 public endpoint를 병렬 호출한다.
- 운영 환경 예시 보강: `NV0_SLOW_REQUEST_THRESHOLD_MS`, `NV0_DATA_DESTRUCTION_GRACE_DAYS`, 내부 Postgres 기준 `PGSSLMODE=disable` 안내를 추가했다. 외부 DB 사용 시 `PGSSLMODE=require` 또는 URL `sslmode=require`로 전환해야 한다.

### QA·CI/CD
- `npm run validate:phase164` 추가: 50개 하드닝 매트릭스, Compose 보안, 로그 로테이션, 신규 endpoint, 복구훈련, 부하 smoke를 검증한다.
- `npm run phase164:final` 추가: 기존 Phase156~163 핵심 게이트와 Phase164 신규 게이트를 묶은 최종 납품 검증 명령이다.
- 소스 안전 한계값 조정: `server/index.mjs`가 Phase 누적 기능으로 275KB를 초과해 `NV0_INDEX_SIZE_LIMIT_BYTES` 기본값을 300KB로 상향했다. 신규 50개 매트릭스 본문은 `server/core/hardening-matrix.mjs`로 분리하여 추가 비대화를 억제했다.

## 3. 50개 항목 처리 상태 요약

- 패키지 내부 구현/검증 완료: 42개
- 외부 운영자가 실제 값·계정·인프라에서 처리해야 하는 항목: 5개
- 선택/확장 항목: 3개

외부 처리가 필요한 항목은 다음과 같다.

1. 실제 Secret Rotation 실행: Cloudflare R2, SMTP, Turnstile, PortOne, Admin Password는 운영 콘솔에서 실제 키를 교체해야 한다.
2. R2 IAM 최소 권한 정책 적용: 패키지는 prefix와 bucket을 제한하지만 Cloudflare 계정 권한 정책은 콘솔에서 적용해야 한다.
3. 멀티 리전 DR: 암호화 원격 백업 기능은 구현되어 있으나, 제2 리전 버킷/서버는 운영자가 마련해야 한다.
4. 모바일 브라우저 실기기 검증: iOS Safari, 삼성 인터넷은 실제 기기 또는 브라우저 클라우드에서 최종 확인해야 한다.
5. Shadow Deployment/트래픽 미러링: Coolify preview 배포와 smoke는 가능하나 실제 운영 트래픽 미러링은 인프라 설정이 필요하다.

## 4. 실행 명령

```bash
npm run phase164:final
```

개별 검증:

```bash
npm run restore:drill
npm run stress:smoke
npm run validate:phase164
```

## 5. 배포 전 체크

1. Coolify 환경변수에서 placeholder 제거.
2. `NV0_BOOTSTRAP_ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `NV0_S3_*`, `NV0_SMTP_URL`, Turnstile, PortOne 실값 입력.
3. prelaunch 상태면 `NV0_PAYMENT_PROVIDER=disabled` 유지.
4. 상용 결제 오픈 시 `NV0_COMMERCIAL_LAUNCH_READY=true`, `NV0_PAYMENT_PROVIDER=portone_v2`, `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict`, 통신판매업 신고번호 입력.
5. 배포 직전 `npm run phase164:final` 통과 확인.
6. 배포 직후 `/readyz`, `/api/public/hardening-matrix`, `/api/public/openapi.json`, 공개 핵심 페이지 확인.

## 6. 롤백 기준

- `/readyz`가 503을 반환하거나 90초 이상 healthcheck가 회복되지 않으면 직전 이미지/커밋으로 롤백한다.
- 결제 관련 webhook 처리 실패가 발생하면 결제 provider를 prelaunch 방식으로 비활성화하고 주문/웹훅 이벤트를 수동 대조한다.
- DB 복구가 필요한 경우 `npm run restore:drill`로 해시 검증 후 관리자 백업 복구 API 또는 `restore-latest-backup.mjs`를 사용한다.

## 7. 납품 판정

패키지 내부에서 무상·무키·무외부계정으로 처리 가능한 개선은 반영했다. 운영 콘솔에서만 처리 가능한 Secret Rotation, 실제 R2 IAM, 실기기 브라우저 테스트, 멀티 리전 DR은 완료 대상이 아니라 배포 전 운영 체크 대상으로 분리했다.
