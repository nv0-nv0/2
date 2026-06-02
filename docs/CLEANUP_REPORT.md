# Global cleanup report

## Purpose

누적 단계별 패치 산출물을 운영 패키지에서 분리하고, 현재 동작 코드와 필수 QA만 남긴 새 상용 기준선을 구성했습니다.

## Applied cleanup

- 정리 전 스냅샷 640개 파일에서 배송 ZIP 247개 파일로 축소
- 과거 단계별 보고서·감사 JSON·중첩 릴리즈 게이트를 배송본에서 제거
- 사용되지 않는 빈 페이지 CSS와 단일 import 공개 JS 래퍼 제거
- 구형 호환 CSS를 `shared/veridion-rebrand.css`로 통일
- 날짜가 고정된 배포 문서명을 지속 가능한 이름으로 정리
- npm 명령을 178개에서 70개로 축소하고 미연결 운영 스크립트 0개로 정리
- 내부 관리자 감사 9종을 과거 파일 존재 여부가 아니라 현재 소스·QA·배포·롤백 근거로 재기준화
- 단일 최종 게이트 `scripts/run-release-gate.mjs`로 통합
- 테스트 환경의 불필요한 외부 fetch를 차단하여 TrustOps 묶음 실행 시간을 단축
- 숫자형 단계 코어 파일명을 의미 기반 파일명으로 교체
- 단계 번호가 포함된 내부 상수·함수·응답 키·배포 예시·테스트 fixture를 의미 기반 이름으로 정리
- `scripts/check-reference-integrity.mjs`를 추가하여 import, 고립 모듈, 미연결 스크립트, 구형 렌더러와 단계 번호 재유입을 차단

## Semantic migration

현재 릴리즈 판정은 `2.1.0-clean-commercial-baseline`과 단일 릴리즈 게이트를 기준으로 수행합니다. API 또는 내부 키 변경 사항은 `docs/COMPATIBILITY.md`에 정리했습니다.

## Rollback

정리 전 전체 스냅샷과 의미 기반 리팩터링 직전 기준선은 외부 ZIP으로 별도 보존합니다.
