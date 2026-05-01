P148 무한 조합형 CTA·SEO 발행 엔진 패치입니다.

적용 파일:
- server/core/cta-publication.mjs
- server/index.mjs
- apps/public/board/app.js
- scripts/validate-phase148-unbounded-cta.mjs
- PHASE148_UNBOUNDED_CTA_COMBINATORIAL_ENGINE_20260501_KO.md
- PHASE148_UNBOUNDED_CTA_COMBINATORIAL_VALIDATION_20260501.json

적용 순서:
1. 전체 ZIP 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy
7. /readyz, /board, /api/public/board 확인

주의:
- Postgres / Redis / runtime volume 삭제 금지
- P147 배포 성공 상태 유지
- 문제가 생기면 P147로 롤백
