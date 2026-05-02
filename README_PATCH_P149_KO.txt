P149 패치 요약

- 메인 화면 URL 입력창 제거
- 메인 CTA를 무료 진단 화면 이동 버튼으로 변경
- 데모 Turnstile 보안 확인 고착 방지
- Turnstile placeholder/prelaunch 상태에서는 일반 진단 모드로 자동 fallback
- 요금제 페이지 discountLabel/valueLabel 누락 오류 수정
- 요금제 API 실패 시 기본 요금표 fallback 표시
- veridion-demo JS 중복 함수 선언 제거

적용:
1. nv0_full_p149.zip 압축 해제
2. 프로젝트 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify Reload Compose File → Save → Redeploy

주의:
- Postgres/Redis/runtime volume 삭제 금지
- prelaunch 모드 유지
- PortOne/통신판매업 신고번호 가짜값 입력 금지
