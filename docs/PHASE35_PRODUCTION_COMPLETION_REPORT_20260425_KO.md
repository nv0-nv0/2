# NV0 Veridion Phase35 상용화 완료 리포트

## 목표
Phase34 이후 남은 상용화 잔여 항목을 운영 가능한 수준으로 보강했다. 핵심 원칙은 기능 완성, 개인정보 최소수집, 결제/환불 운영성, 관리자 추적성, 배포 전 게이트 검증이다.

## 적용 항목

### 1. 개인정보 최소수집 강화
- 회원가입 필수값: 이메일, 비밀번호, 개인정보 처리방침 동의 시각만 유지
- 결제 필수값: 산출물 수신 이메일, 상품, 약관/개인정보/환불 동의만 유지
- 이름, 회사명, 전화번호, 주소는 기본 회원가입/결제 흐름에서 요구하지 않음
- 문서 초안용 공개 사업자 정보는 이용자가 직접 입력할 때만 사용
- 감사로그/이메일 메타데이터에서 이메일·토큰·시크릿류 마스킹 적용

### 2. 릴리즈 준비상태 게이트
- 공개 API: `/api/public/release-readiness`
- 관리자 API: `/api/admin/release-readiness`
- 점검 항목: 필수 환경변수, 상용 결제 제공자, 보안 헤더, 지원 이메일, 운영 알림 이메일, 개인정보 최소수집, 동의 필수화

### 3. 환불 운영 흐름
- 고객 환불 요청 API: `/api/public/refund-request`
- 관리자 환불 목록 API: `/api/admin/refund-requests`
- 관리자 환불 상태 변경 API: `/api/admin/refund-requests/status`
- 중복 요청 방지, 요청 가능 기간, 주문 접근권한 검증 적용

### 4. 결제 실패/재시도 흐름
- 결제 재시도 API: `/api/public/payment/retry`
- 결제 완료 전 주문만 재시도 가능
- 주문 접근 토큰 또는 로그인 소유권 필요
- 재시도 횟수 및 paymentSession 재생성 기록

### 5. 이메일 대기열 운영화
- 이메일 대기열 조회 유지
- 이메일 발송 상태 변경 API: `/api/admin/email-outbox/status`
- queued/sent/failed 상태 및 재시도 횟수 기록

### 6. 운영 감사/보안
- 감사로그 민감정보 마스킹
- 보안 헤더 유지
- 계정 비활성화 및 마케팅 동의 분리
- 개인정보 export 유지

## 검증 결과
- `node --check server/index.mjs`: 통과
- `node scripts/check-source-syntax.mjs`: 통과
- `node tests/routes-smoke.mjs`: 통과 확인
- `node scripts/test-all.mjs`: 52/52 통과 확인
- `node scripts/validate-phase35-production.mjs`: 통과 확인
- `node tests/e2e.mjs`: E2E passed 출력 확인

## 남은 실제 운영 입력값
코드는 상용화 흐름을 갖췄지만, 실제 배포 시 아래 값은 운영자가 실제 값으로 채워야 한다.

- `NV0_PUBLIC_BASE_URL`
- `NV0_SUPPORT_EMAIL`
- `NV0_OPERATOR_ALERT_EMAIL`
- `NV0_PLATFORM_TARGET=commercial`
- `NV0_PAYMENT_PROVIDER=portone_v2`
- `NV0_PERSISTENCE_MODE=postgres_primary`
- `NV0_SESSION_STORE=redis`
- `NV0_RATE_LIMIT_STORE=redis`
- `NV0_LOCK_PROVIDER=redis`
- `NV0_DATABASE_URL`
- `NV0_REDIS_URL`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_WEBHOOK_SECRET`

## 최종 판단
Phase35 기준으로 껍데기성 기능의 주요 공백을 상용 운영 흐름으로 보강했다. 실제 PG 키, DB, Redis, 도메인, 이메일 발송 제공자를 운영값으로 연결하면 런칭 전 최종 검수 단계로 진입 가능하다.
