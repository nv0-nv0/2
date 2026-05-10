# Phase229 가격 재산정 · 유료 품질 잠금 클로즈아웃

## 목적
기존 가격이 비싸게 느껴질 수 있다는 전환 장벽을 낮추면서도, 유료 결과물의 상세도·수정 가능성·운영 문서 품질을 줄이지 않는 구조로 개편했습니다.

## 최종 권장 가격
| 상품 | 이전 기준 | Phase229 기준 | 역할 |
|---|---:|---:|---|
| 상세 리포트 | 69,000원 | 39,000원 | 첫 유료 전환 상품 |
| FixPack | 99,000원 | 79,000원 | 주력 전환·수익 균형 상품 |
| Auto 정기 케어 | 월 299,000원 | 월 149,000원 | 반복 관리 구독 상품 |

## 적용 원칙
- 무료 데모는 위기도 점수, 문제 영역, 영향 요소, 갯수로 개선 필요성을 보여줍니다.
- 유료 리포트는 전체 발견 항목, 근거, 수정 방향, 수용 기준을 100% 공개합니다.
- FixPack은 사이트에 바로 넣을 수 있는 전/후 수정 문구와 적용 위치를 제공합니다.
- Auto는 반복 점검과 운영 문서 갱신을 월 구독 진입가로 제공합니다.
- 가격을 낮추더라도 paid output quality lock 조건을 통과하지 않으면 유료 산출물로 간주하지 않습니다.

## 주요 코드 변경
- `server/core/pricing-conversion-model.mjs` 추가
- `server/core/service-quality-220.mjs`에 Phase229 품질 잠금 게이트 추가
- `server/core/premium-asset-builder.mjs`의 유료 산출물 품질·근거·수정안 보강
- `server/index.mjs` 상품 카탈로그와 결제 금액 갱신
- `server/routes/public.mjs` 가격 적합성 공개 API 추가
- `apps/public/plans`와 `apps/public/checkout`의 정적/동적 가격 표기 통일
- Phase229 테스트·검증 스크립트 추가

## 최종 게이트
- `npm run phase229:final`: 통과
- `npm run phase225:final`: 통과
- `npm run phase226:final`: 통과
- `npm run phase227:final`: 통과
- `npm run test:all`: 통과
- `npm run check:links -- --summary`: 통과

## 운영 한계
실제 전환율, 결제 승인율, 환불률, PG 정산 비용, 메일 발송, PostgreSQL/S3/Redis 실연결은 운영 키와 실서버 데이터가 필요합니다. 본 패키지는 로컬 패키지 안에서 검증 가능한 가격·상품·유료 산출물 품질·데모·결제 플로우 계약을 통과시킨 버전입니다.
