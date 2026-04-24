# 내부 재감사 보강 내역

## 이번 재감사에서 실제로 잡아낸 내부 보강 포인트
1. 일반 데모(`/demo`)가 `veridion:lastScan`을 저장하지 않아 `/plans`, `/checkout`, `/portal` 퍼널 연계가 약했음
2. 공개/고객/관리자 화면 일부가 비동기 초기화 실패 시 사용자에게 의미 있는 오류 상태를 보여주지 못했음
3. 공개/관리자 HTML의 내부 링크 무결성을 자동으로 확인하는 게이트가 없었음
4. 최종 인수문서 인덱스가 실제 파일과 어긋나도 파이프라인이 잡지 못했음
5. 클라이언트 앱에 디버그 로그가 남아 있어도 acceptance가 잡지 못했음
6. 상태 변경 POST가 여러 개 있어도 별도 stateful CSRF 회귀 테스트가 없었음

## 실제 반영 내용
- `apps/public/demo/app.js`
  - 스캔 결과를 `localStorage(veridion:lastScan)`에 저장
  - 추천 플랜/체크아웃/포털 링크를 스캔 결과 기준으로 자동 갱신
- `apps/public/plans/app.js`
- `apps/public/guides/app.js`
- `apps/public/portal/app.js`
- `apps/public/documents/app.js`
- `apps/admin/console/app.js`
  - 비동기 초기화 실패 시 사용자 친화적인 오류 상태/빈 상태 표시
- `apps/public/home/app.js`
  - 불필요한 `console.log` 제거

## 새 게이트/테스트
- `scripts/check-links.mjs`
  - 내부 링크가 실제 라우트로 이어지는지 검사
- `scripts/check-handoff-docs.mjs`
  - 최종 인수문서 인덱스의 참조 파일 존재 검사
- `scripts/check-no-debug-client.mjs`
  - 클라이언트 `console.log/debug` 잔여물 검사
- `tests/security-stateful.mjs`
  - 세션은 있으나 CSRF가 없는 상태 변경 POST 차단 검증
  - 세션 + CSRF가 있는 상태 변경 POST 허용 검증

## acceptance 확대
- `check:links`
- `check:handoff-docs`
- `check:no-debug-client`
- `test:security-stateful`

## 현재 판정
- 외부 연동 제외 내부 범위: **실제 확인 완료**
- 이번 재감사에서 로컬 내부 추가 빈칸: **실제 반영 완료**
- 남은 것은 코드 미완성이 아니라 외부 실행 단계임
