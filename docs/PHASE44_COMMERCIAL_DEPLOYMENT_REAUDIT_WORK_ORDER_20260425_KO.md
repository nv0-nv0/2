# PHASE44 상용화 배포 재검수·작업지시서·즉시 조치 보고서

작성일: 2026-04-25
대상 패키지: `nv0_commercial_phase43_100_score_complete_20260425.zip`
검수 기준: 실제 상용 배포 가능성, CI/CD 재현성, 보안 헤더, 런타임 준비성, 배포 번들 완결성, 공개 페이지/관리자 경계, 데이터 초기화 상태

## 1. 결론

내부 테스트 기준으로는 상용화 배포 직전 상태까지 보강 완료했다. 단, 실제 PG, SMTP, Cloudflare Turnstile, PostgreSQL, Redis, S3/MinIO, 도메인 DNS/SSL은 외부 실계정·실서버 연결이 필요하므로 로컬 패키지 내부에서 100% 실검증할 수 없다.

현재 패키지에서 즉시 수정 적용한 항목은 다음과 같다.

1. GitHub Actions CI 워크플로 누락 보완
2. GitHub Actions Commercial Release 워크플로 누락 보완
3. CSP 보안 헤더에 `require-trusted-types-for 'script'` 추가
4. `/readyz` 성공 응답에 `runtimeWritable: true` 명시
5. `scripts/verify-security.mjs` 종료 불능 문제 수정
6. `scripts/ci-strict.mjs` 종료 안정성 수정
7. 런타임 상태 초기화 재수행
8. 최종 작업지시서 및 검수 보고서 추가

## 2. 상용화까지 남은 단계 갯수

남은 단계는 총 12개다.

### A. 코드/패키지 내부 단계: 0개

패키지 내부에서 처리 가능한 코드·스크립트·문서·테스트 게이트는 즉시 조치 완료했다.

### B. 실배포 환경 단계: 12개

1. 운영 도메인 DNS 확인: `nv0.kr`, `www.nv0.kr`
2. Cloudflare Proxy, SSL/TLS Full Strict 적용
3. Cloudflare Cache Rule 정리: HTML/API no-store, 정적 파일 장기 캐시
4. Cloudflare Turnstile site key/secret 실값 입력
5. PostgreSQL 운영 DB 연결 및 마이그레이션 적용
6. Redis 운영 인스턴스 연결: session, rate-limit, lock provider
7. S3 또는 MinIO 운영 스토리지 연결
8. PortOne V2 실가맹점 API secret/webhook secret 입력
9. PortOne webhook URL 실연동 및 서명 검증 테스트
10. SMTP 운영 계정 연결 및 비밀번호 재설정 메일 발송 테스트
11. Coolify/서버 환경변수에 `deploy/env.commercial.template` 기준 실값 주입
12. 실도메인에서 `/healthz`, `/readyz`, 결제, 회원가입, 관리자 로그인, 산출물 접근 테스트

## 3. 재검수 결과

| 구분 | 결과 | 비고 |
|---|---:|---|
| 최종 리뷰 게이트 | PASS | `node scripts/run-final-review.mjs` 기준 14/14 |
| 전체 내부 테스트 | PASS | `node scripts/test-all.mjs` 기준 52/52 |
| 파이프라인 구조 검증 | PASS | GitHub Actions 누락 보완 후 통과 |
| 배포 번들 검증 | PASS | Dockerfile, compose, env template, entrypoint 확인 |
| 보안 헤더 검증 | PASS | CSP, XFO, nosniff, no-store, CSRF, session 확인 |
| 런타임 초기화 | PASS | sessions empty, db seed match 복구 |

## 4. 발견한 핵심 문제와 적용 조치

### 문제 1. `.github/workflows/ci.yml` 누락

영향: GitHub push/PR 기준 자동 검증이 돌지 않아 배포 전 결함 차단이 불가능했다.

조치: `.github/workflows/ci.yml` 추가.

적용 내용:
- Node.js 22 고정
- `npm ci --ignore-scripts`
- `npm run ci:strict`
- `timeout-minutes: 15`

### 문제 2. `.github/workflows/commercial-release.yml` 누락

영향: 상용 릴리스 태그/수동 실행 시 상용 계약 검증, CI, 릴리스 게이트, Docker build가 자동화되지 않았다.

조치: `.github/workflows/commercial-release.yml` 추가.

적용 내용:
- `npm run validate:commercial`
- `npm run ci:strict`
- `npm run pipeline:release`
- `docker build`

### 문제 3. CSP 강화 항목 누락

영향: 보안 검증 스크립트가 기대하는 Trusted Types 강제 정책이 없었다.

조치: `server/index.mjs`의 CSP에 아래 항목 추가.

```txt
require-trusted-types-for 'script'
```

### 문제 4. `/readyz` 성공 응답에 `runtimeWritable` 값 누락

영향: 실제 준비성 검증에서 런타임 쓰기 가능 여부를 명시적으로 판정하기 어려웠다.

조치: `/readyz` 성공 응답에 `runtimeWritable: true` 추가.

### 문제 5. `verify-security` 종료 불능

영향: 보안 검증은 통과해도 로컬 검증 서버 child process 때문에 명령이 종료되지 않아 CI에서 timeout 위험이 있었다.

조치: `scripts/verify-security.mjs` 종료 루틴을 명시적 `process.exit(process.exitCode || 0)` 방식으로 수정.

### 문제 6. `ci-strict` 종료 안정성

영향: 일부 환경에서 `process.reallyExit` 사용 후 명령 종료가 안정적으로 관측되지 않았다.

조치: `scripts/ci-strict.mjs` 종료 루틴을 표준 `process.exit(ok ? 0 : 1)`로 수정.

## 5. 최종 배포 작업지시서

### 1단계. 코드 반영

1. 수정본 ZIP 압축 해제
2. Git 저장소 루트에 덮어쓰기
3. 아래 파일 변경 확인
   - `.github/workflows/ci.yml`
   - `.github/workflows/commercial-release.yml`
   - `server/index.mjs`
   - `scripts/verify-security.mjs`
   - `scripts/ci-strict.mjs`
   - `docs/PHASE44_COMMERCIAL_DEPLOYMENT_REAUDIT_WORK_ORDER_20260425_KO.md`

### 2단계. 로컬 검증

```bash
node scripts/reset-demo-state.mjs
node scripts/run-final-review.mjs
node scripts/test-all.mjs
node scripts/ci-strict.mjs
node scripts/validate-pipeline.mjs
node scripts/validate-deploy-bundle.mjs
node scripts/verify-security.mjs
node scripts/reset-demo-state.mjs
node scripts/test-all.mjs
```

### 3단계. 운영 환경변수 입력

`deploy/env.commercial.template` 기준으로 실값 입력.

필수 항목:
- `NV0_PLATFORM_TARGET=commercial`
- `NV0_ADMIN_AUTH_MODE=account_rbac`
- `NV0_PERSISTENCE_MODE=postgres_primary`
- `NV0_SESSION_STORE=redis`
- `NV0_RATE_LIMIT_STORE=redis`
- `NV0_LOCK_PROVIDER=redis`
- `NV0_STORAGE_MODE=s3`
- `NV0_PAYMENT_PROVIDER=portone_v2`
- `NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict`
- `NV0_ENABLE_TURNSTILE=true`

### 4단계. Coolify 배포

1. GitHub main 브랜치 push
2. Coolify 프로젝트에서 최신 commit 선택
3. Build 재실행
4. 배포 후 컨테이너 로그 확인
5. `/healthz`, `/readyz` 확인

### 5단계. Cloudflare 설정

1. SSL/TLS: Full Strict
2. Always Use HTTPS: ON
3. Cache Rules:
   - `/api/*`: Bypass cache
   - `/admin*`: Bypass cache
   - HTML: 짧은 캐시 또는 no-cache
   - CSS/JS 정적 파일: 장기 캐시
4. Turnstile 도메인 등록
5. WAF 기본 보호 활성화

### 6단계. 실거래 전 최종 스모크

1. 회원가입
2. 로그인
3. 무료 진단 1회
4. 상품 선택
5. PortOne 결제창 진입
6. 테스트 결제 또는 운영 승인 테스트
7. Webhook 수신
8. 고객 포털 산출물 접근
9. 관리자 로그인
10. 관리자 주문/사이트/출판/설정 페이지 접근
11. 비밀번호 재설정 메일 발송
12. 개인정보/약관/환불/사업자정보 페이지 노출 확인

## 6. 배포 보류 조건

아래 중 하나라도 실패하면 배포를 보류한다.

1. `/readyz` 200 실패
2. PortOne webhook 서명 검증 실패
3. Redis 연결 실패
4. PostgreSQL 연결 실패
5. 관리자 로그인/CSRF 검증 실패
6. 공개 페이지에서 관리자 링크 노출
7. 개인정보 처리방침/약관/환불/사업자정보 누락
8. SMTP 발송 실패
9. 결제 완료 후 산출물 접근 실패
10. Cloudflare 캐시로 HTML/API 구버전 응답 발생

## 7. 최종 판정

코드 패키지 기준: 상용 배포 후보 통과.

실서비스 오픈 기준: 외부 운영 계정과 실서버 환경변수 주입 후 12개 실배포 단계 검증 필요.
