# PHASE130 보고서 — 서비스 가격 시장 비교 및 재산정

## 결론
기존 NV0 가격은 상세 리포트·문구 수정·정기 관리의 실제 작업량에 비해 낮았습니다. 무료 진단은 유지하되, 유료 상품은 실행형 산출물 기준으로 재가격화했습니다.

## 가격 변경
| 상품 | 기존 | 변경 |
|---|---:|---:|
| 상세 리포트 | 9,900원 | 39,000원 |
| FixPack 수정 문구안 | 29,000원 | 89,000원 |
| 문서 템플릿 팩 | 19,000원 | 69,000원 |
| 업종별 규제 가이드 | 39,000원 | 79,000원 |
| Basic 모니터링 | 월 49,000원 | 월 99,000원 |
| Pro 정기 개선 | 월 89,000원 | 월 189,000원 |
| Auto 정기 케어 | 월 149,000원 | 월 299,000원 |
| NV0 Certified | 연 99,000원 | 연 249,000원 |
| Agency 패키지 | 월 199,000원 | 월 499,000원 |

## 적용 파일
- `server/index.mjs`
- `apps/public/plans/index.html`
- `apps/public/plans/app.css`
- `apps/public/checkout/index.html`
- `runtime/data/db.json`
- `runtime/data/db.seed.json`
- `package.json`
- `scripts/validate-phase130-market-pricing.mjs`

## 운영 메모
- 결제 수수료와 PG 가입비를 고려하면 1만원 이하의 유료 리포트는 상용 가격으로 부적절합니다.
- 법률 자문이 아니라 운영 참고용 점검/문구 산출물이라는 고지는 유지합니다.
- 실제 갤럭시아 채널 수수료와 심사 조건은 PortOne 또는 PG 계약 화면에서 최종 확인이 필요합니다.
