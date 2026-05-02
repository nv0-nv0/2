P155 패치 적용 안내

목적:
- CTA 게시판 글을 독자 친화적으로 재작성
- 기존 DB에 저장된 CTA 글까지 마이그레이션 도구로 정리
- 검색 로봇 수집 조건 최적화
- 외부 키값 입력이 필요한 항목을 제외하고 상용화 잔여 항목 마감

적용:
1. nv0_full_p155_final.zip 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy
7. /readyz 확인
8. /robots.txt, /sitemap.xml, /feed.xml 확인
9. /board 확인
10. 기존 CTA 글 재작성 dry-run 실행

기존 CTA 글 재작성:
node scripts/migrate-existing-cta-human-friendly.mjs

실제 반영:
node scripts/migrate-existing-cta-human-friendly.mjs --apply

검증:
node scripts/validate-phase155-cta-existing-rewrite.mjs
node scripts/validate-phase155-search-robot-max.mjs
node scripts/validate-phase155-nonkey-commercial-closeout.mjs

주의:
- Postgres / Redis / runtime volume 삭제하지 마세요.
- 외부 키값은 실제 값을 받기 전까지 가짜값으로 넣지 마세요.
- 마이그레이션은 dry-run 결과 확인 후 --apply 하세요.
