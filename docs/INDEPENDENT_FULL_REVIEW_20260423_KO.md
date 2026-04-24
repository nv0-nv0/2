# Veridion 독립 전수 점검 및 보강 보고서 (2026-04-23)

## 1. 이번 점검 방식
- 기존 선언/문서 문구를 신뢰하지 않고 ZIP 내부 코드와 스크립트를 직접 점검
- 로컬 자동 검증 전체 재실행
- 깨지는 지점을 실제 수정 후 재검증

## 2. 이번 점검에서 실제 발견한 내부 보강 필요 항목
1. 공개 문서 생성 흐름은 있었지만 `문서 미리보기 API`가 없었음
2. acceptance 경로가 `ops:report`의 실제 성공 내용을 강하게 보증하지 못했음
3. `verify:prod`가 요구하는 `/documents` 공개 페이지가 없어 404가 발생했음
4. 로컬 검증용 포트가 일부 공용으로 섞여 충돌 가능성이 있었음

## 3. 실제 반영한 보강
### 3.1 공개 문서 생성 완결성 보강
- `POST /api/public/document-preview` 추가
- 사업자 정보 입력 기반 4종 문서 초안 생성
  - 개인정보처리방침
  - 이용약관
  - 환불·배송·교환 정책
  - 필수 고지 문구

### 3.2 공개 문서 페이지 추가
- `/documents` 공개 페이지 추가
- 입력 폼 + 문서 미리보기 렌더링 연결

### 3.3 검증 하네스 보강
- `tests/e2e.mjs`에 `/documents` 페이지 및 `/api/public/document-preview` 검증 추가
- `scripts/ops-report.mjs`가 인증 실패/리포트 실패 시 non-zero 종료하도록 강화
- `scripts/acceptance.mjs`에서 `verify:prod`와 `ops:report` 포트를 독립화

## 4. 실제 재검증 결과
- `npm run test:e2e` 실제 확인 완료
- `npm run acceptance` 실제 확인 완료
- acceptance 내부 세부 항목 전체 성공
  - reset:demo
  - validate:env
  - validate:deploy
  - test:e2e
  - test:session
  - test:runtime
  - test:providers
  - smoke
  - verify:security
  - preflight
  - ops:report
  - audit:inventory
  - release:manifest
  - verify:prod
  - package:prep

## 5. 현재 남은 작업 재판정
현재 남은 작업은 코드 내부 미완성이 아니라 전부 외부 실행 단계다.

### 동작 확인 필요
- Contabo VPS
- Coolify 설치 및 배포
- Cloudflare DNS / TLS / Cache / Rate Limit / Turnstile 실적용
- 운영 환경변수 실주입
- 실결제 공급자 실연동
- 실스캔 공급자 실연동
- 배포 후 실도메인 E2E
- 백업 스케줄러 등록
- 컷오버

### 검증 미완료
- 프로덕션 PostgreSQL 컷오버
- 컷오버 후 24시간 모니터링

## 6. 보수적 최종 판정
- 로컬 내부 패키지 완성: 실제 확인 완료
- 외부 연동 제외 내부 기능 완결성: 실제 확인 완료
- 실운영 전체 완성: 동작 확인 필요
