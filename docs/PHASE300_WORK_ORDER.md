# PHASE300 작업지시서

## 1. 현재 판단

이번 작업은 단순 수정이 아니라 상용화 차단 이슈를 제거하는 대형 개편이다. 기존 Phase299 패키지는 내부 테스트 게이트가 다수 통과하는 구조였지만, 가격 정책 불일치, 운영 환경 placeholder 허용, 패키지와 라이브 배포 검증 분리, fallback 결과 고지 부족, 문서 정합성 문제가 남아 있었다.

## 2. 이번 단계 목표

- 가격 정책을 단일 소스로 통합한다.
- 운영 환경 검증을 실제 상용 기준으로 엄격하게 만든다.
- placeholder가 포함된 운영 템플릿이 최종 게이트에서 조용히 통과하지 못하게 한다.
- 실제 수집 결과와 제한 fallback 결과를 사용자와 운영자가 구분할 수 있게 한다.
- 개인정보, 약관, 환불, 사업자 정보 페이지를 결제 서비스 기준에 맞게 보강한다.
- clean runtime 상태로 납품한다.
- 구조 트리, 작업지시서, 검수 보고서를 문서화한다.

## 3. 구현 범위

- `shared/product-catalog.mjs` 신규 생성
- 서버 상품 카탈로그/가격 계산의 shared catalog 연동
- 체크아웃 fallback 상품 정보 shared catalog 연동
- 무료 진단 유료 CTA 가격 문구 동기화
- 가격 검증 스크립트 추가
- storage config placeholder strict fail 적용
- CI용 production-shape env 추가
- phase300 검증 스크립트 추가
- 법적 고지성 페이지 보강
- board/portal fallback copy 개선
- runtime clean reset 및 `clean:runtime` final gate 연결
- RUN_ALL_TESTS / DELIVERY_README 갱신

## 4. 제외 범위

- 실제 nv0.kr 서버 배포
- 실제 PortOne 실결제 승인 테스트
- 실제 SMTP 발송
- 실제 R2 업로드
- 실제 외부 scan provider 운영 응답 검증
- 통신판매업 신고번호, 고객센터 전화번호 등 사용자가 제공하지 않은 사업자 상세값 확정

## 5. 신규 생성 파일

- `shared/product-catalog.mjs`: 가격·상품 단일 소스
- `scripts/validate-price-catalog.mjs`: 가격 drift 차단
- `scripts/validate-phase300-production-readiness.mjs`: Phase300 종합 검증
- `deploy/env.production.nv0.kr.ci-check.env`: 비밀값 없는 CI 검증용 production-shape env
- `docs/PHASE300_STRUCTURE_TREE.md`: 전체 구조 트리
- `docs/PHASE300_WORK_ORDER.md`: 작업지시서
- `docs/PHASE300_PRODUCTION_READINESS_REPORT.md`: 납품 검수 보고서

## 6. 수정 대상 파일

- `server/index.mjs`: 상품 가격 shared catalog 사용, fallback scan 상태 고지 추가
- `server/core/pricing-conversion-model.mjs`: 가격 모델 49,000/149,000 기준으로 동기화
- `apps/public/checkout/app.js`: fallback 상품 가격 shared catalog 사용
- `apps/public/veridion-demo/app.js`: 유료 CTA 가격 동기화
- `apps/public/privacy/index.html`: 개인정보처리방침 보강
- `apps/public/terms/index.html`: 이용약관 보강
- `apps/public/refund/index.html`: 환불·청약철회 정책 보강
- `apps/public/business-info/index.html`: 사업자/거래 안내 보강
- `apps/public/board/index.html`, `apps/public/board/app.js`: loading/fallback 문구 개선
- `apps/public/portal/index.html`: empty state 개선
- `scripts/check-storage-config.mjs`: placeholder strict fail
- `scripts/test-all.mjs`: 가격 단일 소스 검증 추가
- `package.json`: phase300 scripts 추가, final gate 보강
- `README.md`, `DELIVERY_README.txt`, `RUN_ALL_TESTS.sh`: 최신 납품 기준 반영

## 7. 예상 리스크

- 과거 phase 검증 스크립트 중 일부가 예전 가격 문구를 기대할 수 있다.
- 실제 운영 환경 비밀값은 패키지에 포함할 수 없으므로 최종 상용 배포 전 서버 환경변수 입력이 필요하다.
- live nv0.kr은 이 패키지를 배포해야 변경된다.
- 법적 고지 문구는 기술적 보강이며, 실제 상용 결제 전 전문 검토가 필요하다.

## 8. 방어 전략

- 가격 drift는 `validate:price-catalog`로 차단한다.
- placeholder storage 값은 `check-storage-config`에서 실패 처리한다.
- 예제 env와 CI env를 분리해 실제 운영 템플릿의 placeholder 실패를 숨기지 않는다.
- fallback scan 결과는 `resultStatus`와 `resultLimitNotice`로 구분한다.
- runtime은 seed와 동일한 상태로 reset한다.

## 9. 완료 기준

- [ ] `npm run check:syntax` 통과
- [ ] `npm run validate:price-catalog` 통과
- [ ] `npm run check:storage-config` 통과
- [ ] `npm run validate:env:ci` 통과
- [ ] `npm run phase300:final` 통과
- [ ] 납품 zip 생성
- [ ] 실행 방법과 남은 live 작업 명시
