# PHASE221 페이지별 문구 정합성·일치감 최종 QA 완료 보고서

## 목적
PHASE220 기준 패키지의 공개 페이지와 주요 런타임 문구를 다시 점검하여 페이지별로 일치하지 않는 상품명, CTA, 가격, 서비스 범위, 품질 기준 문구를 통일했습니다.

## 표준 문구 체계
- 브랜드: `NV0 / Veridion`
- 상단 메뉴: `무료 진단`, `상품·요금`, `콘텐츠 보드`, `문서 생성`, `내 사이트`, `고객지원`
- 상품명/가격:
  - 상세 리포트 · 69,000원 · 1회
  - FixPack · 99,000원 · 1회
  - Auto 정기 케어 · 299,000원 · 월
- 품질 기준 문구: `정확도 계약`, `오탐 방어`, `수동 확인`, `품질 게이트`, `근거 매트릭스`, `재점검 기준`
- CTA 자동발행 주기: 20분 1회 유지

## 주요 수정
1. `플랜 비교`와 `상품·요금` 혼용을 `상품·요금` 기준으로 통일했습니다.
2. `Pro 리포트`, `Free Demo`, `Auto 케어`, `Auto 정기 점검` 등 혼재 명칭을 각각 `상세 리포트`, `무료 진단`, `Auto 정기 케어` 기준으로 정리했습니다.
3. 홈/상품·요금/데모/결제/보드/포털/사례/서비스/솔루션/가이드 페이지의 `<title>`, H1, CTA, 버튼 라벨, 상품 가격 표기를 재정렬했습니다.
4. `Auto 정기 케어으로`, `상세 상세 리포트 결제`, `상품 비교`처럼 어색하거나 중복된 문구를 제거했습니다.
5. PHASE221 전용 정합성 검증기를 추가해 금지 문구, 깨짐 토큰, 메뉴 라벨, 상품명·가격·체크아웃 링크, 페이지 title, 품질 기준 문구를 자동 검증하도록 했습니다.
6. PHASE216~PHASE220 기존 회귀 검증을 유지했습니다.

## 검증 결과
`npm run phase221:final`

- check:syntax PASS
- check:pages PASS
- test:routes PASS
- check:links PASS
- test:phase217 PASS
- validate:phase217-cta PASS
- test:phase216 PASS
- validate:phase216 PASS
- validate:phase218 PASS
- validate:phase219 PASS
- test:phase220 PASS
- validate:phase220 PASS
- test:phase221 PASS
- validate:phase221 PASS
- scoreAfterPatch: 100

## 한계
이 검증은 패키지 소스와 정적/런타임 게이트 기준입니다. 실제 운영 서버 배포 후에는 Cloudflare/Coolify 캐시 purge와 라이브 화면 확인이 필요합니다.
