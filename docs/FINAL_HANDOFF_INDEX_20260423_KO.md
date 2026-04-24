# 최종 납품 인덱스

## 바로 봐야 할 문서 8개
1. `docs/FINAL_REAUDIT_AND_HARDENING_REPORT_20260423_KO.md`
2. `docs/FINAL_OPTIMAL_WORK_ORDER_20260423_KO.md`
3. `docs/ONE_PAGE_EXTERNAL_17_STEP_EXECUTION_CARD_20260423_KO.md`
4. `docs/BUSINESS_OPTIMIZATION_PLAYBOOK_20260423_KO.md`
5. `docs/LOCAL_COMPLETENESS_RESCORE_20260423_KO.md`
6. `docs/VERSION_DIFF_HARDENED_TO_FINAL_20260423_KO.md`
7. `docs/ACCEPTANCE_CHECKLIST.md`
8. `docs/CLOUDFLARE_COOLIFY_CONTABO_RUNBOOK_20260423_KO.md`

## 코드/검증 핵심 진입점
- 서버: `server/index.mjs`
- acceptance: `scripts/acceptance.mjs`
- 보안 검증: `scripts/verify-security.mjs`
- 렌더링 안전 게이트: `scripts/check-client-render-safety.mjs`
- E2E: `tests/e2e.mjs`
- 계약/퍼즈: `tests/contracts-fuzz.mjs`

## 납품 판단 한 줄 요약
- 외부 연동 제외 내부 범위: **실제 확인 완료**
- 실운영 전체: **동작 확인 필요**


## 이번 재감사 추가 문서
- `docs/INTERNAL_REAUDIT_DELTA_20260423_KO.md`
