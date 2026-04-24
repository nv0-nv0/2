# Pipeline Hardening Report — 2026-04-23

## 목적
런타임 오류가 배포 단계나 운영 단계에서 늦게 드러나지 않도록, 로컬과 CI에서 더 이른 게이트로 차단한다.

## 이번 보강 내용

### 1. 구문 게이트 추가
- `npm run check:syntax`
- 대상: `server`, `scripts`, `tests`, `shared`, `apps` 하위의 `.js`, `.mjs`
- 방식: `node --check`
- 셸 스크립트는 `sh -n`으로 문법 점검

### 2. 데이터 무결성 게이트 추가
- `npm run check:data`
- 대상:
  - `runtime/data/db.json`
  - `runtime/data/db.seed.json`
  - `runtime/data/sessions.json`
  - 핵심 JSON 문서
- 목적:
  - JSON 파싱 오류 조기 차단
  - 필수 DB 키 누락 차단
  - 런타임 필수 디렉터리 확인

### 3. 라우트 스모크 테스트 추가
- `npm run test:routes`
- 공개 주요 페이지와 관리자 주요 페이지의 실제 렌더/리다이렉트/인증 후 접근을 점검
- 목적:
  - 화면 라우팅 누락 차단
  - 정적 페이지 404/오탈자 차단
  - 관리자 인증 후 하위 화면 진입 가능 여부 점검

### 4. acceptance 파이프라인 강화
기존 acceptance 앞단에 아래 게이트를 추가함.
- `check:syntax`
- `check:data`
- `test:routes`

즉, 실행 순서는 아래처럼 강화되었다.
1. 소스 구문 확인
2. 데이터 무결성 확인
3. 데모 데이터 리셋
4. 환경 검증
5. 배포 번들 검증
6. E2E
7. 라우트 스모크
8. 세션/런타임/공급자 테스트
9. 보안/운영/프로덕션 검증
10. 패키징 정리

### 5. GitHub Actions 강화
CI에서 아래를 실행하도록 변경.
- `npm run check:syntax`
- `npm run check:data`
- `npm run acceptance`

추가로 acceptance 요약 문서를 artifact로 업로드한다.

## 실제 검출 및 수정된 문제
이번 보강 과정에서 아래 실문제가 조기 검출되었다.

1. `db.json`, `db.seed.json`에 `systemItems` 키 누락
- 조치: 시드/런타임 DB 모두 보강

2. 관리자 페이지 텍스트 기대치와 테스트 불일치
- 조치: 라우트 스모크 기대값을 실제 화면 구조에 맞게 보정

## 현재 파이프라인 상태
- `npm run check:syntax` 통과
- `npm run check:data` 통과
- `npm run test:routes` 통과
- `npm run acceptance` 통과

## 효과
- 런타임 전에 문법 오류를 더 넓게 차단
- 잘못된 시드/런타임 데이터로 인한 서버 예외 조기 차단
- 페이지/라우트 누락을 배포 전 차단
- CI가 acceptance 요약을 남겨 실패 원인 추적이 쉬워짐

## 보수적 판정
- 로컬 파이프라인 강화: 실제 확인 완료
- CI 게이트 강화: 실제 확인 완료
- 실운영에서 오류 0 보장: 검증 미완료

