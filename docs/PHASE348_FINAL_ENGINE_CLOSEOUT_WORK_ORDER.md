# PHASE348 최종 단일 진단 엔진 마감 작업지시서

## 현재 판단
phase347에서 메인/진단 화면의 실행 흐름은 통합됐지만, `/products/veridion/demo` 전용 JS가 별도 런타임으로 남아 있었다. 운영자가 한 파일만 고쳐도 다른 진입점이 다시 갈라질 수 있으므로 최종 납품 기준에서는 부족하다.

## 이번 단계 목표
- `/`, `/demo`, `/products/veridion/demo`를 단일 진단 엔진으로 완전 고정한다.
- 결과 생성 전 후속 버튼이 고객 포털 이동을 암시하지 않도록 비활성 상태를 명확히 한다.
- 최종 게이트를 phase348로 승격한다.

## 구현 범위
1. product demo HTML도 `/apps/public/demo/app.js`만 로드한다.
2. `/apps/public/veridion-demo/app.js`는 캐시 안전 alias만 유지한다.
3. 진단 기본 CTA 문구를 `사이트 무료 진단 실행`으로 통일한다.
4. 결과 생성 전 `다시 점검`, `이어보기` 버튼은 disabled/aria-disabled 상태로 둔다.
5. 결과 저장 후 버튼이 자동 활성화되도록 런타임 상태 함수를 추가한다.
6. 단일 엔진·후속 버튼 상태·phase348 릴리즈 검증을 자동 게이트에 추가한다.

## 제외 범위
- 실제 운영 서버 배포
- 실결제사 웹훅 검증
- 실제 모바일 기기 수동 QA

## 완료 기준
- `npm run phase348:final` 통과
- `npm run release:predeploy` 통과
- `npm run delivery:final` 통과
- `./RUN_ALL_TESTS.sh` 통과
