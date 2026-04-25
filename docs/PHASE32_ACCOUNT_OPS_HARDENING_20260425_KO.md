# PHASE32 계정·포털·운영 하드닝 완료 보고서

## 적용 범위
- 고객 비밀번호 재설정 요청 API 추가
- 고객 비밀번호 재설정 확정 API 추가
- 재설정 토큰 SHA-256 저장, 30분 만료, 사용 후 무효화
- 비밀번호 변경 시 기존 고객 세션 일괄 만료
- 거래성 이메일 발송 대기열(emailOutbox) 추가
- 고객 계정 주문/산출물 조회 API 추가
- 주문 상세 API의 공개 accessToken 노출 제한
- 포털 주문 접근권한 검증 추가
- 관리자 고객 목록 조회 API 추가
- 관리자 고객 비활성화 API 추가
- 관리자 주문 산출물 강제 생성 API 추가
- 관리자 이메일 대기열 조회 API 추가
- 공개 로그인/회원가입 화면에 비밀번호 재설정 UI 추가

## 보강 의도
로그인·회원가입만 동작하는 수준에서 그치지 않고, 실제 상용 운영에 필요한 계정 회복, 주문 소유권, 산출물 접근, 고객 상태 관리, 거래성 알림 기록까지 이어지도록 보강했습니다.

## 검증 결과
- `node --check server/index.mjs`: 통과
- `node --check apps/public/auth/app.js`: 통과
- `node tests/routes-smoke.mjs`: 통과, 22개 라우트 확인
- `node scripts/test-all.mjs`: 통과, 52/52
- `node tests/e2e.mjs`: 통과 확인
- `node tests/security-stateful.mjs`: 개별 실행에서 `{ ok: true, checked: 5 }` 출력 확인

## 운영 전 필수 확인
- 실제 메일 발송 사업자 연동 전까지 emailOutbox는 발송 대기열로 동작합니다.
- 실서비스에서는 SMTP/SES/SendGrid 등 발송 어댑터를 연결해야 합니다.
- 비회원 주문은 주문번호만으로 기본 상태 확인이 가능하되, 산출물 다운로드는 accessToken 또는 계정 소유권 기준으로 제한됩니다.
