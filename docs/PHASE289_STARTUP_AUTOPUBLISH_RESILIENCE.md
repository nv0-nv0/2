# PHASE289 Startup Autopublish Resilience

## 문제
배포 로그에서 서버가 반복 재시작되었습니다.

직접 원인:
```text
server startup failed Error: 인사이트 품질 검수 실패: notDuplicate
code: PRODUCT_INSIGHT_QUALITY_FAILED
```

즉, 서버 자체가 없는 문제가 아니라, 서버 부팅 중 20분 자동 인사이트 발행이 중복 검수에 걸리고 해당 예외가 서버 시작을 중단시켰습니다.

## 수정 방향
자동 인사이트 발행은 부가 기능이므로 서버 부팅을 막아서는 안 됩니다.

적용한 방어:
1. `runCtaAutopublish`에서 `notDuplicate` 단독 실패는 정상 skip으로 처리
2. `system.product_insight.skipped_duplicate` 감사 로그 기록
3. `productAgentState.lastSkipReason = duplicate-insight` 저장
4. 서버 시작 시 `runCtaAutopublish('startup')` 실패를 non-fatal 처리
5. 20분 cadence와 기존 발행 구조는 유지

## 영향 범위
- 기존 게시판/인사이트 기능 유지
- 20분 자동 발행 유지
- 중복 글을 새로 만들지 않음
- 중복으로 인해 서버가 죽지 않음

## 운영 확인
```bash
npm run start:local
npm run server:check
```

배포 환경에서는 로그에 아래 메시지가 나오면 정상 방어입니다.

```text
startup product insight autopublish skipped
```

또는

```text
startup product insight autopublish failed non-fatally
```

## 최종 검증
```bash
npm run phase289:final
```
