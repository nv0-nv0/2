# PHASE183 브라우저 저장소 분류

- `nv0:lastScan`: 최근 무료 진단 결과의 편의 저장값. 결제정보/비밀번호/민감정보 저장 금지.
- `veridion:instantDemoUsage:*`: 비회원 일일 요약 횟수 표시용. 서버 권한 검증 대체 금지.
- `veridion:instantDemoCache:*`: 동일 URL 5분 캐시. TTL 만료 후 재사용 금지.
- `veridion:document결과 예시`: 문서 미리보기 편의 저장값. 민감정보 입력 금지.

위 저장소는 UX 편의 계층이며 보안·권한·결제 완료 판정은 서버에서만 확정합니다.
