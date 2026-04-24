# 선조치 보강 리뷰 2026-04-23

## 실제 확인 완료
- 전체 패키지 재점검
- `npm run acceptance` 재실행
- 파이프라인 게이트 추가 후 재실행
- 새 게이트에서 검출된 실제 누락 수정 후 재검증

## 이번에 선조치한 항목
1. **페이지 무결성 게이트 추가**
   - `npm run check:pages`
   - `server/index.mjs`의 `pageMap`과 실제 앱 디렉터리/에셋 매칭 검증
   - `index.html`의 `base.css`, `app.css`, `app.js` 참조 검증

2. **환경 예시 무결성 게이트 추가**
   - `npm run check:env-examples`
   - `.env.example`, `deploy/*.env.example`, `deploy/*.template`의 핵심 키/중복 키 검증

3. **잘못된 JSON 요청 사전 차단 강화**
   - malformed JSON을 500이 아닌 400으로 명확히 처리
   - E2E에 malformed JSON 검증 추가

4. **readiness 신뢰도 강화**
   - `/readyz`가 단순 파일 존재만 보지 않고
     - 설정 검증
     - DB 파싱 가능 여부
     - runtime 쓰기/삭제 가능 여부
     를 함께 확인하도록 강화

5. **보안 검증 강화**
   - production 검증에서 관리자 세션 쿠키 `Secure` 속성 확인 추가
   - `/readyz`의 `runtimeWritable` 확인 추가

## 새 게이트가 실제로 검출한 문제
- `/demo` 페이지가 `/apps/public/veridion-demo/app.js`를 잘못 참조하고 있었음
- `check:pages`에서 즉시 검출
- `/apps/public/demo/app.js`로 수정 후 재검증 통과

## 최종 재검증 결과
- `npm run check:pages` 통과
- `npm run check:env-examples` 통과
- `npm run acceptance` 통과

## 현재 판정
- 로컬 내부 범위 선조치 가능한 항목: 실제 확인 완료
- 외부 연동/실서버 영역: 동작 확인 필요
