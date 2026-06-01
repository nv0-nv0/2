# 자동 생성 검증 결과 디렉터리

이 폴더의 JSON·TXT·LOG 파일은 테스트, 회귀 검사, 릴리즈 게이트가 생성한 결과입니다.

## 우선 확인 순서

1. `PHASE355_FINAL_GATE_REPORT.json`
2. `PHASE355_GLOBAL_AUDIT.json`
3. `PHASE354_FINAL_GATE_REPORT.json`
4. `PHASE354_COMPOSE_ENV_FORWARDING.json`
5. 문제가 발생한 하위 PHASE 보고서

과거 파일은 장애 추적과 회귀 증빙에 필요하므로 자동으로 삭제하지 않습니다. 배송 직전에는 `npm run runtime:clean`으로 활성 런타임 데이터만 제거합니다.
