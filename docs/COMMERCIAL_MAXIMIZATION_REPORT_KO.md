# VERIDION 2.7 상용화 극대화 하드닝 보고서

기준일: 2026-06-03  
적용 범위: MFA 핫픽스 이후 안전한 추가 보강  
기준선 보호: 직전 MFA 수정 파일의 핵심 동작은 변경하지 않고 비회귀 계약으로 잠갔다.

## 판정 기준

- `신규 적용`: 이번 보강에서 코드 또는 배포 산출물에 새로 반영했다.
- `검증 강화`: 기존 기능을 유지하면서 자동 계약 검사 또는 회귀 테스트를 추가했다.
- `기준선 잠금`: 직전 MFA 핫픽스가 다시 약화되지 않도록 고정했다.
- `운영 절차 보강`: 실서버에서 운영자가 수행해야 할 검수 절차를 명문화했다.

## 적용·강화 내역 72개

### A. 직전 MFA 핫픽스 비회귀 잠금

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 1 | 기준선 잠금 | 루트 boot-safe Compose의 `NV0_ADMIN_MFA_REQUIRED:-true` 유지 계약 추가 |
| 2 | 기준선 잠금 | Coolify boot-safe Compose의 `NV0_ADMIN_MFA_REQUIRED:-true` 유지 계약 추가 |
| 3 | 기준선 잠금 | strict commercial Compose의 MFA fail-closed 기본값 유지 계약 추가 |
| 4 | 기준선 잠금 | local MinIO 대체 Compose의 MFA fail-closed 기본값 유지 계약 추가 |
| 5 | 기준선 잠금 | preflight의 Coolify MFA 복구 안내 문구 유지 계약 추가 |
| 6 | 기준선 잠금 | Coolify 환경변수 탐지 테스트의 MFA `true` 기대값 유지 계약 추가 |
| 7 | 기준선 잠금 | Coolify 배포 런북의 MFA 운영 입력 안내 유지 계약 추가 |
| 8 | 기준선 잠금 | MFA 복구 문서의 운영 절차 유지 계약 추가 |

### B. HTTP 요청 경계 보강

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 9 | 신규 적용 | 허용 HTTP 메서드를 `GET`, `HEAD`, `POST`, `OPTIONS`로 제한 |
| 10 | 신규 적용 | `TRACE`, `CONNECT`, `PUT`, `PATCH`, `DELETE` 등 비허용 메서드 전역 405 차단 |
| 11 | 신규 적용 | 405 응답에 `Allow` 헤더 제공 |
| 12 | 신규 적용 | OPTIONS 응답을 `no-store`로 고정 |
| 13 | 신규 적용 | 요청 URI 최대 길이 4096자 제한 |
| 14 | 신규 적용 | URI 과대 입력을 414로 조기 차단 |
| 15 | 신규 적용 | URI 내부 제어문자 입력을 400으로 차단 |
| 16 | 신규 적용 | URL 파싱 실패를 400으로 안전 종료 |
| 17 | 검증 강화 | TRACE 차단 자동 회귀 테스트 추가 |
| 18 | 검증 강화 | OPTIONS 캐시 금지 자동 테스트 추가 |
| 19 | 검증 강화 | 과대 URI 414 자동 테스트 추가 |

### C. 응답 전송 효율·캐시·검색 노출 제어

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 20 | 신규 적용 | 공통 응답 종료 헬퍼 도입 |
| 21 | 신규 적용 | JSON 응답 `Content-Length` 자동 계산 |
| 22 | 신규 적용 | 텍스트 응답 `Content-Length` 자동 계산 |
| 23 | 신규 적용 | HTML 응답 `Content-Length` 자동 계산 |
| 24 | 신규 적용 | HEAD 요청에서 본문 전송 생략 |
| 25 | 신규 적용 | 정적 자산 응답에 `Content-Length` 추가 |
| 26 | 신규 적용 | 동적·업로드 응답에 `X-Robots-Tag: noindex, nofollow, noarchive` 적용 |
| 27 | 신규 적용 | DNS prefetch 비활성화 헤더 적용 |
| 28 | 검증 강화 | HEAD 응답 본문 0바이트와 길이 헤더 자동 테스트 추가 |

### D. 요청 본문·정적 파일 보호

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 29 | 신규 적용 | 선언된 `Content-Length`가 제한을 넘으면 본문 수신 전에 413 차단 |
| 30 | 신규 적용 | 스트리밍 중 누적 크기 초과 시 기존 413 차단 유지 |
| 31 | 신규 적용 | 요청 본문 전송 중단·불완전 수신 감지 |
| 32 | 신규 적용 | 불완전 본문을 `INVALID_PAYLOAD`로 안전 종료 |
| 33 | 신규 적용 | 정적 파일 경로를 문자열 경계뿐 아니라 실제 경로(`realpath`)로 재검증 |
| 34 | 신규 적용 | 심볼릭 링크를 이용한 정적 루트 탈출 차단 |
| 35 | 검증 강화 | 정적 파일 심볼릭 링크 탈출 403 자동 테스트 추가 |
| 36 | 검증 강화 | 기존 인코딩 경로 순회 차단 테스트 유지 |
| 36-A | 신규 적용 | `/shared/`, 공개 앱, 관리자 앱별 정적 루트를 분리해 프로젝트 루트 전체 노출 가능성을 제거 |

### E. 서버 자원·종료 안정성

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 37 | 신규 적용 | Node HTTP `requestTimeout` 명시 |
| 38 | 신규 적용 | Node HTTP `headersTimeout` 상한 10초 적용 |
| 39 | 신규 적용 | keep-alive 유휴 시간 5초 적용 |
| 40 | 신규 적용 | 최대 요청 헤더 개수 100개 제한 |
| 41 | 신규 적용 | 소켓당 최대 요청 수 1000회 제한 |
| 42 | 신규 적용 | shutdown 중복 실행 방지 Promise 잠금 추가 |
| 43 | 신규 적용 | 종료 시 신규 연결 차단 후 세션 기록·연결 정리 순서 보강 |
| 44 | 신규 적용 | Docker `STOPSIGNAL SIGTERM` 명시 |
| 45 | 신규 적용 | bare 실행 시 durable runtime 판정 기본값을 `commercial`이 아닌 `mvp`로 정렬 |

### F. 환경변수 범위 검증 확대

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 46 | 신규 적용 | `NV0_TARGET_FETCH_TIMEOUT_MS` 범위 검증 |
| 47 | 신규 적용 | `NV0_TARGET_FETCH_MAX_BYTES` 범위 검증 |
| 48 | 신규 적용 | `NV0_TARGET_FETCH_MAX_REDIRECTS` 범위 검증 |
| 49 | 신규 적용 | `NV0_SCAN_SOFT_TIMEOUT_MS` 범위 검증 |
| 50 | 신규 적용 | `NV0_TARGET_FETCH_MAX_PAGES` 범위 검증 |
| 51 | 신규 적용 | `NV0_TARGET_FETCH_CONCURRENCY` 범위 검증 |
| 52 | 신규 적용 | `NV0_TARGET_FETCH_MAX_SITEMAP_URLS` 범위 검증 |
| 53 | 신규 적용 | `NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES` 범위 검증 |
| 54 | 신규 적용 | `NV0_DATA_RETENTION_DAYS` 범위 검증 |
| 55 | 신규 적용 | `NV0_REFUND_REQUEST_WINDOW_DAYS` 범위 검증 |
| 56 | 신규 적용 | `NV0_PAYMENT_IDEMPOTENCY_TTL_MS` 범위 검증 |
| 57 | 신규 적용 | `NV0_EMAIL_MAX_RETRY_COUNT` 범위 검증 |
| 58 | 신규 적용 | `NV0_EMAIL_RETRY_BACKOFF_MS` 범위 검증 |
| 59 | 신규 적용 | `NV0_PUBLIC_ASSET_CACHE_SECONDS` 범위 검증 |
| 60 | 신규 적용 | `NV0_READYZ_CACHE_TTL_MS` 범위 검증 |
| 61 | 신규 적용 | `NV0_REDIS_TIMEOUT_MS` 범위 검증 |
| 62 | 검증 강화 | 위 16개 범위 오류 자동 거부 테스트 추가 |

### G. 상용 비밀값·외부 연동 판정 강화

| 번호 | 상태 | 보강 내용 |
| ---: | --- | --- |
| 63 | 신규 적용 | 상용 MFA 활성화 필수 검증을 runtime config에도 추가 |
| 64 | 신규 적용 | TOTP 시크릿 Base32 형식과 최소 길이 검증 추가 |
| 65 | 신규 적용 | 세션·보안 레코드·개인정보 해시·백업 암호화 키 최소 32자 검증 추가 |
| 66 | 신규 적용 | 관리자 bootstrap 비밀번호 최소 15자 검증 추가 |
| 67 | 신규 적용 | Redis URL을 `redis://` 또는 `rediss://`로 제한 |
| 68 | 신규 적용 | SMTP URL을 `smtp://` 또는 `smtps://`로 제한 |
| 69 | 신규 적용 | 외부 스캔 공급자 URL을 HTTPS로 제한 |
| 70 | 신규 적용 | 상용 S3 호환 endpoint를 HTTPS로 제한 |
| 71 | 신규 적용 | 상용 환경 상태 점검에서 placeholder를 설정 완료로 오인하지 않도록 개선 |
| 72 | 신규 적용 | prelaunch 결제 비활성화·백업 암호화·Redis 3종 저장소·스캔 fallback·wildcard 관리자 IP 차단을 상태 점검에 통합 |

## 추가 배송 무결성 강화

위 72개 항목과 별도로 배송 ZIP 생성 단계도 보강했다.

- 심볼릭 링크가 포함되면 배송 생성 중단
- `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, `.sqlite`, `.db`, `.bak`, `.dump`, `.sql.gz` 등 민감 파일 확장자 차단
- 단일 확장자뿐 아니라 `.sql.gz` 같은 복합 확장자도 suffix 기준으로 차단
- 단일 파일 크기 상한 적용
- `zip -X`를 사용해 불필요한 메타데이터 제거
- 생성 후 `unzip -Z1`로 실제 ZIP 항목과 allowlist 일치 여부를 정렬 독립적인 집합 기준으로 재검증
- ZIP 내부 중복 항목이 있으면 배송 생성 중단
- 전수조사 인벤토리 산출물은 `docs/current/`로 격리해 배송본 오염 방지
- 인벤토리 보고서 제목 날짜는 실행 시점 기준으로 동적 생성
- ZIP SHA-256, 파일 목록 SHA-256, 개별 파일 SHA-256, 전체 바이트 수 기록
- 별도 SHA-256 sidecar 파일 자동 생성

## 자동 검증 추가

- `scripts/check-commercial-max-hardening.mjs`: 직전 MFA 핫픽스 고정과 신규 하드닝 정적 계약 검사
- `tests/commercial-max-hardening-contract.mjs`: 환경변수 범위·상용 프로필·placeholder·MFA·TOTP·S3·prelaunch 결제·관리자 IP 자동 테스트
- `tests/security-host-guard-contract.mjs`: HTTP 메서드, OPTIONS, HEAD, 과대 URI, 심볼릭 링크 탈출 회귀 테스트 확대
- `scripts/run-release-gate.mjs`: 위 검증을 정식 릴리즈 게이트에 편입

## 자동 적용하지 않은 고위험 항목

아래 항목은 실제 운영 접근 또는 계정이 필요하므로 자동 적용하지 않았다.

1. Coolify 운영 환경변수 실제값 저장
2. 운영 PostgreSQL 마이그레이션 실행
3. 운영 Redis 연결 확인
4. Cloudflare R2 실제 업로드·다운로드 확인
5. PortOne 샌드박스·실결제 및 웹훅 확인
6. SMTP 실발송 확인
7. Cloudflare 캐시 무효화
8. 실도메인 HTTPS 쿠키·세션 확인
9. 운영 백업·복구 리허설
10. 모니터링 알림 수신 확인

실서버 전환 절차는 `POST_DEPLOYMENT_ACCEPTANCE_KO.md`를 따른다.


## MFA stale-value 런타임 자기복구 보강

Coolify에 과거 `NV0_ADMIN_MFA_REQUIRED=false`가 명시적으로 남아 있으면 Compose의 `${NV0_ADMIN_MFA_REQUIRED:-true}` 기본값보다 외부 값이 우선한다. 기존 MFA 핫픽스 6개 파일은 변경하지 않고, `deploy/entrypoint.sh`에 상용 런타임 fail-closed 정규화 계층을 추가했다.

- `NV0_PLATFORM_TARGET=commercial`인데 MFA 값이 누락되거나 `true`가 아니면 컨테이너 내부에서 `NV0_ADMIN_MFA_REQUIRED=true`로 강제 정규화
- 운영자에게 Coolify 화면에서도 `true`를 저장하고 재배포하라는 경고 출력
- `NV0_ADMIN_MFA_RECOVERY_NORMALIZED=true` 표식으로 복구 경로 사용 여부 기록
- 실제 Base32 `NV0_ADMIN_TOTP_SECRET`이 비어 있거나 placeholder면 preflight는 계속 차단
- MVP 프로파일에서는 사용자가 지정한 값을 변경하지 않음
- 정규화·비정규화·MVP 비개입 동작을 자동 계약 테스트로 추가

세부 복구 절차는 `archive/hotfix/HOTFIX_MFA_RUNTIME_NORMALIZATION_KO.md`를 따른다.
