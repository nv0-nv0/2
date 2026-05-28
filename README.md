# VERIDION phase323 one-hundred-point closeout

## 최종 실행

```bash
npm run phase323:final
```

`release:predeploy`와 `delivery:final`은 모두 phase323 최종 게이트를 바라봅니다.

## 핵심 API

- `/api/public/trustops-100-final`
- `/api/admin/trustops-100-final`
- `/api/public/trustops-final-handoff`
- `/api/public/trustops-production-sentinel`

## 운영 반영 후 필수 확인

1. 운영 환경변수 실제값 입력
2. `npm run release:predeploy`
3. CDN/브라우저 캐시 삭제
4. `/portal`, `/board`, `/checkout`, `/privacy`, `/business-info` 실화면 확인
5. PortOne 소액 실결제, 웹훅, 산출물 다운로드 확인
6. 환불 요청/관리자 처리 확인
7. 모바일/브라우저별 화면 확인
8. 개인정보처리방침·약관·환불정책 법무 검토

패키지 내부 검증 점수와 실서버 운영 확인은 분리됩니다.
