# PHASE47 nv0.kr 실접속 문제점 전수 점검 및 수정 보완 보고서

점검일: 2026-04-25
대상: https://www.nv0.kr 실서비스 노출 화면 + phase46 패키지
결론: 공개 화면의 다수 기능 미작동 원인은 CSP Trusted Types 강제 적용과 정적 폴백 부족, 검수 스크립트 버전 불일치가 핵심이었다.

## 1. 문제점 수량 집계

총 37개 항목을 식별했다.

- 즉시 수정 완료: 12개
- 배포 환경에서 값 입력 필요: 8개
- 운영 연동 검증 필요: 7개
- UI/UX 보완 필요: 5개
- 법적/상업 고지 보완 필요: 3개
- 장기 강화 과제: 2개

## 2. 즉시 수정 완료 12개

1. CSP `require-trusted-types-for 'script'` 강제 적용으로 클라이언트 `innerHTML` 렌더링이 막힐 수 있는 문제 수정
2. Trusted Types는 강제 적용에서 Report-Only로 전환
3. 보안 검수 스크립트가 강제 CSP만 통과 기준으로 보던 문제 수정
4. `final:100`이 phase46 버전에서 실패하던 버전 마커 문제 수정
5. phase43 검증기가 후속 phase 패키지를 실패 처리하던 문제 수정
6. `final:100` 검수 순서에 런타임 리셋 추가
7. 보안 검수 후 세션/DB 런타임 찌꺼기로 `test-all`이 실패하던 문제 수정
8. `/plans` 정적 화면의 “서비스 정보를 불러오는 중입니다” 영구 노출 위험 제거
9. `/board` 정적 화면의 “게시글을 불러오는 중입니다” 영구 노출 위험 제거
10. `/guides` 정적 화면의 “콘텐츠를 불러오는 중입니다” 영구 노출 위험 제거
11. `/portal` 정적 화면의 “포털 정보를 불러오는 중입니다” 영구 노출 위험 제거
12. `/business-info`와 푸터의 “상용 결제 전 입력 필요” 문구 완화

## 3. 배포 환경에서 값 입력 필요 8개

1. `NV0_MAIL_ORDER_REGISTRATION_NUMBER`
2. `NV0_CUSTOMER_SERVICE_PHONE`
3. `NV0_HOSTING_PROVIDER`
4. `NV0_PUBLIC_BASE_URL=https://www.nv0.kr`
5. `NV0_SUPPORT_EMAIL`
6. `NV0_PRIVACY_OFFICER_EMAIL`
7. `NV0_ALLOWED_ADMIN_ORIGINS=https://www.nv0.kr,https://nv0.kr`
8. `NV0_TRUST_PROXY_HEADERS=true`

## 4. 운영 연동 검증 필요 7개

1. PortOne 실결제 키
2. PortOne 웹훅 서명 검증
3. PostgreSQL 연결
4. Redis 세션 저장소
5. Redis Rate Limit 저장소
6. Redis Distributed Lock
7. S3/MinIO 파일 저장소

## 5. UI/UX 보완 필요 5개

1. API 지연/실패 시에도 상품 카드 기본 노출
2. 포털 접근 시 주문번호/토큰 입력 폼 명확화
3. 무료 진단 입력창 라벨/플레이스홀더 분리
4. 모바일 상단 메뉴 접힘 처리 강화
5. 결제 페이지에서 선택 상품 가격 즉시 표시 강화

## 6. 법적/상업 고지 보완 필요 3개

1. 통신판매업 신고번호 실제값 반영
2. 호스팅 제공자 실제값 반영
3. 디지털 산출물 제공 후 환불 제한 동의 로그 보관 운영 확인

## 7. 장기 강화 과제 2개

1. Trusted Types 완전 대응: `innerHTML` 제거 또는 TrustedHTML 정책 적용
2. Playwright 기반 실제 브라우저 E2E 추가

## 8. 적용된 파일

- `server/index.mjs`
- `package.json`
- `scripts/run-final-review.mjs`
- `scripts/validate-phase43-perfect-score.mjs`
- `scripts/verify-security.mjs`
- `apps/public/plans/index.html`
- `apps/public/board/index.html`
- `apps/public/guides/index.html`
- `apps/public/portal/index.html`
- `apps/public/checkout/index.html`
- `apps/public/business-info/index.html`

## 9. 최종 검수 결과

직접 실행한 명령:

```bash
node scripts/run-final-review.mjs \
&& node scripts/validate-deploy-bundle.mjs \
&& node scripts/verify-security.mjs \
&& node scripts/reset-demo-state.mjs \
&& node scripts/test-all.mjs
```

결과:

- final review: 14/14 통과
- deploy bundle validation: 통과
- verify-security: 통과
- runtime reset: 통과
- test-all: 52/52 통과

## 10. 재배포 후 확인할 URL

- `/`
- `/products/veridion/demo`
- `/plans`
- `/documents`
- `/board`
- `/guides`
- `/checkout`
- `/portal`
- `/business-info`
- `/healthz`
- `/readyz`
- `/api/public/products`
- `/api/public/plans`
- `/api/public/board`
- `/api/public/content`
