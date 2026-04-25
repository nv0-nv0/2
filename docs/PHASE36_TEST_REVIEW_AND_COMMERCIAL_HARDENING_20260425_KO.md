# Phase36 테스트 리뷰 및 상용화 하드닝 리포트

## 적용 범위
- Phase35 산출물의 테스트 결과를 재검수했다.
- `test:all` 실패 원인을 확인하고 런타임 산출물 오염을 제거했다.
- 개인정보 최소수집 정책이 회원가입/결제/문서 생성 흐름에 남아 있는지 재확인했다.
- 환불, 결제 재시도, 릴리즈 준비상태, 이메일 대기열, 감사로그 마스킹 항목의 존재 검증을 추가했다.

## 발견 및 조치
1. `npm run test:all` 최초 실행 결과 49/52로 실패했다.
2. 실패 원인은 기능 코드가 아니라 패키지 내부에 남아 있던 런타임 생성물이었다.
   - `runtime/uploads/1777085638980-hello.txt`
   - `runtime/backups/db-*.json`
   - `runtime/reports/ops-report-*.json`
3. 배포 ZIP에는 테스트 부산물이 포함되면 안 되므로 해당 파일을 삭제했다.
4. `runtime/data/sessions.json`은 빈 배열로 초기화했다.
5. `runtime/data/db.json`은 `runtime/data/db.seed.json`과 동일하게 복원했다.
6. Phase36 전용 검증 스크립트 `validate:phase36`을 추가했다.

## 개인정보 최소수집 재검수
- 회원가입 필수값은 이메일/비밀번호 중심이다.
- 결제 필수값은 이메일 중심이다.
- 이름, 전화번호, 주소는 기본 결제/가입 필수값에서 제외했다.
- 문서 생성에서 필요한 사업자 정보는 사용자가 산출물을 만들기 위해 직접 입력하는 값으로 분리했다.
- 마케팅 동의는 필수 동의와 분리했다.

## 테스트 리뷰 결과
- `npm run test:all`: 52/52 통과 확인
- `node scripts/check-source-syntax.mjs`: 통과 확인
- `node scripts/validate-phase35-production.mjs`: 통과 확인
- `node tests/routes-smoke.mjs`: 통과 출력 확인
- `node tests/e2e.mjs`: 통과 출력 확인
- `node tests/security-stateful.mjs`: 통과 출력 확인
- `npm run validate:phase36`: 통과 확인

## 상용화 판단
현재 ZIP은 데모성 런타임 부산물을 제거한 배포 후보 패키지다. 실제 외부 런칭 전에는 실서버 환경변수, 실제 결제사 키, 메일 발송 도메인 인증, 사업자 고지 정보 최종 확인이 필요하다.
