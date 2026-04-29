# PHASE131 가격 재검수 — 최적 프리미엄 가격표 반영

## 결론
PHASE130 가격은 기존 저가안보다 개선되었으나, 시장 벤치마크와 산출물 범위를 기준으로는 여전히 일부 상품이 낮았습니다. PHASE131에서는 무료 진단으로 진입 장벽을 유지하되, 실제 산출물·문구 수정·정기 운영·대행사 패키지는 프리미엄 가격대로 재정렬했습니다.

## 최종 가격표
| 상품 | PHASE130 | PHASE131 최종 |
|---|---:|---:|
| 상세 리포트 | 39,000원 | 59,000원 |
| FixPack 수정 문구안 | 89,000원 | 149,000원 |
| 법률 문서 템플릿 팩 | 69,000원 | 99,000원 |
| 업종별 규제 가이드 | 79,000원 | 129,000원 |
| Basic 모니터링 | 월 99,000원 | 월 149,000원 |
| Pro 정기 개선 | 월 189,000원 | 월 299,000원 |
| Auto 정기 케어 | 월 299,000원 | 월 499,000원 |
| NV0 Certified | 연 249,000원 | 연 390,000원 |
| Agency 패키지 | 월 499,000원 | 월 990,000원 |

## 가격 철학
- 무료 진단은 유입 유지
- 59,000원 상세 리포트는 첫 결제 진입 상품
- 149,000원 FixPack은 개인정보·약관·환불 문구 개선 단건 시장 하단과 맞춤
- 299,000원 Pro는 핵심 추천 플랜
- 499,000원 Auto는 정기 점검 + CTA 발행 + 개선 후보 제공 프리미엄 운영 상품
- 990,000원 Agency는 월 10개 도메인 기준 B2B 패키지

## 반영 파일
- `server/index.mjs`
- `runtime/data/db.json`
- `runtime/data/db.seed.json`
- `package.json`
- `scripts/validate-phase131-optimal-pricing.mjs`

## 검증
- `node scripts/check-source-syntax.mjs`
- `node scripts/validate-phase131-optimal-pricing.mjs`
- `node scripts/test-all.mjs`
- `node tests/e2e.mjs`
