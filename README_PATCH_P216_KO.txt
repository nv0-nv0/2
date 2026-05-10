PHASE216 패치 요약

목표
- nv0.kr의 기존 목적(고객 신뢰 진단 → 개선 문구/리포트/정기관리 판매)을 유지하면서 판매·수익화 흐름을 더 선명하게 만든다.
- 라이브에서 반복 지적된 canonical host 혼선과 통신판매업 신고번호 placeholder 노출 위험을 앱 계층에서도 방어한다.

적용 내용
1. 홈 화면에 무료 진단 → 상세 리포트 → FixPack → Auto 정기 케어의 유료 전환 사다리를 추가했다.
2. 상품·요금 페이지에 JS/API가 느리거나 차단되어도 보이는 정적 상품 카드와 직접 체크아웃 링크를 추가했다.
3. FixPack을 “오늘 바로 수정”용 기본 추천 상품으로 더 명확히 배치했다.
4. server/middleware/security.mjs에 canonical host redirect 방어를 추가했다.
5. server/index.mjs에 통신판매업 신고번호 placeholder/임시값 차단을 강화했다.
6. validate:phase215 누락 스크립트를 복구하고 phase216 최종 검증 스크립트를 추가했다.

검증
- npm run phase216:final

배포 후 필수 확인
- https://nv0.kr 과 https://www.nv0.kr 중 최종 canonical 정책이 서버·Cloudflare·Coolify에서 동일해야 한다.
- 권장 canonical은 https://nv0.kr 이다.
- Cloudflare 또는 Coolify가 apex → www 로 먼저 돌리고 있으면 앱 패치가 도달하기 전에 리다이렉트가 끝날 수 있으므로 엣지 규칙을 함께 정리해야 한다.
