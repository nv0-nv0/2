P151 NV0 제품 범위 재정렬 패치

이 패치는 P150의 prompt-directive 방향을 폐기하고, nv0.kr 실제 서비스 개선 범위로 되돌리는 패치입니다.

적용:
1. nv0_full_p151_product_focus.zip 압축 해제
2. 프로젝트에 덮어쓰기
3. P150을 이미 적용했다면 node scripts/remove-phase150-prompt-directive.mjs 실행
4. node scripts/validate-phase151-nv0-product-focus.mjs 실행
5. GitHub push 또는 Coolify 소스 업데이트
6. Coolify → Reload Compose File → Save → Redeploy

주의:
- Postgres/Redis/runtime volume 삭제하지 마세요.
- P150 prompt-directive API는 nv0 본제품 범위가 아니므로 사용하지 않습니다.
