# PHASE308 전체 테스트 리뷰 및 납품 안정화 작업 지시서

## 목적
phase307 전문화 패키지를 기준으로 단순 화면 검증이 아닌 전체 릴리즈 게이트, E2E, 상용 흐름, 보안/배포 검증까지 다시 실행하고 실패 지점을 보완한다.

## 발견 문제
- `npm run phase307:final`은 통과했지만, 심화 게이트인 `npm run phase299:final`에서 `test:e2e`가 실패했다.
- 원인은 실제 기능 결함이 아니라 최신 `phase307-professional-polish` 버전을 E2E 허용 목록에 반영하지 않은 테스트 게이트 노후화였다.
- 같은 계열로 `validate-phase299-final-delivery.mjs`도 최신 closeout 버전명을 허용하지 않아 전체 릴리즈 게이트에서 중단될 수 있었다.

## 작업 범위
- `tests/e2e.mjs` 최신 phase307/phase308 버전 허용 반영
- `validate-phase299-final-delivery.mjs` 최신 closeout 버전 호환 반영
- `phase308:final` 전체 납품 게이트 신설
- `delivery:final`, `release:predeploy`를 phase308 게이트로 상향
- `validate-phase308-full-test-closeout.mjs` 신규 추가
- 기존 인사이트 20분 자동발행, 중복 차단, 깨진 문자 차단, 포털/인사이트 UI 보강 유지 확인
- 릴리즈 시크릿 위생 검사 포함
- 최종 런타임 클린 검증 포함

## 완료 기준
- `npm run phase308:final` 통과
- E2E, 페이지 무결성, 라우트, 링크, 스모크, 상용 흐름, 보안, 배포, 운영 매트릭스 검증 통과
- 인사이트 20분 발행 및 폴백 안정성 유지
- 런타임 임시 파일 정리 상태로 납품
