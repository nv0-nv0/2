P153 Smart Product Operations Layer

이 패치는 nv0.kr 본제품을 더 똑똑하게 만드는 제품 지능화 패치입니다.

적용:
1. nv0_full_p153_smart_ops.zip 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy
7. /readyz 확인
8. /api/public/smart-product 확인
9. /products/veridion/demo, /plans, /board 확인

검증:
- node scripts/validate-phase153-smart-ops.mjs
- npm run deploy:precheck
- node scripts/smoke.mjs

주의:
- Postgres/Redis/runtime volume 삭제하지 마세요.
- P150 prompt-directive 방향은 사용하지 않습니다.
