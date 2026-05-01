P147 nv0.kr QA·CTA·SEO Smart Patch

목적:
- nv0.kr 개선·보완 항목 30개 도출
- CTA 게시판/자동 발행 로직/SEO 메타/구조화 데이터/API 일관성 개선
- P143~P146 배포 안정화 패치는 유지

주요 수정 파일:
- server/index.mjs
- server/core/cta-publication.mjs
- apps/public/board/index.html
- apps/public/board/app.js
- scripts/validate-phase147-smart-seo-audit.mjs
- PHASE147_SITE_QA_SMART_SEO_WORK_ORDER_20260501_KO.md
- PHASE147_SITE_QA_SMART_SEO_VALIDATION_20260501.json

적용:
1. 압축 해제
2. 프로젝트 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify Reload Compose File
5. Save
6. Redeploy

주의:
- Postgres/Redis/runtime volume 삭제 금지
- local_fs로 되돌리지 않음
- PortOne/통신판매업 신고번호 가짜값 입력 금지
- prelaunch 유지
