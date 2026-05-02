P154 독자 친화형 CTA 게시판 패치

적용 대상:
- CTA 게시판 자동 발행 글
- 게시판 화면 렌더링 문구

핵심:
- 어려운 말 제거
- 사람 말투 강화
- 중학생도 이해 가능한 수준으로 본문 재구성
- SEO 메타데이터는 유지하되 독자용 본문에는 내부 전문 용어를 노출하지 않음

적용:
1. nv0_full_p154_human_cta.zip 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File → Save → Redeploy
5. /board 및 CTA 자동 발행 결과 확인

주의:
- Postgres/Redis/runtime volume 삭제하지 마세요.
- 기존 게시글은 DB에 저장된 내용이므로, 새 발행 글부터 개선됩니다.
