P152 NV0 Smart Product Intelligence 패치

목적:
- nv0.kr 본제품을 더 영리하게 만들기 위한 추천/다음 행동 엔진 추가
- 진단 결과, 요금제, 상품 선택, CTA 흐름을 하나의 판단 구조로 연결

적용:
1. nv0_full_p152_smart_product.zip 압축 해제
2. 프로젝트에 덮어쓰기
3. node scripts/validate-phase152-smart-product.mjs 실행
4. GitHub push 또는 Coolify 소스 업데이트
5. Coolify → Reload Compose File → Save → Redeploy

확인:
- /products/veridion/demo
- /plans
- /api/public/product-intelligence
- /api/public/plans
- /api/public/products

주의:
- Postgres/Redis/runtime volume 삭제하지 마세요.
- P150 prompt-directive는 다시 추가하지 않습니다.
