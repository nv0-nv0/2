# Phase301 Final Closeout Report

## 1. 현재 판단

Phase300 재검수에서 패키지 내부는 통과했지만, 실제 라이브에서 관찰된 중복 상단 메뉴와 오래된 `nv0` 브랜드 노출 가능성을 추가 차단해야 했다. Phase301은 이 문제를 최종 마감 대상으로 처리한다.

## 2. 확정 정보

- 공개 브랜드는 VERIDION으로 통일한다.
- 가격 기준은 기본 리포트 49,000원, 전문가 플랜 149,000원/월이다.
- `deploy/env.production.nv0.kr.example`은 실값 입력 전 실패해야 한다.
- 로컬 패키지 검증과 실제 `nv0.kr` 라이브 검증은 분리해서 관리한다.

## 3. 적용 수정

### 3.1 중복 상단 메뉴 제거

`server/index.mjs`의 `injectPublicTopMenu()`가 이미 `nv0n-topbar`를 포함한 페이지에도 legacy `site-topbar`를 주입할 수 있었다. 이로 인해 공개 페이지에서 `nv0`와 `VERIDION` 상단 메뉴가 함께 보일 수 있었다.

수정 내용:

- `nv0n-topbar`가 존재하면 추가 상단 메뉴를 주입하지 않는다.
- legacy fallback 메뉴의 브랜드도 `VERIDION`으로 변경한다.
- fallback 메뉴 항목을 위험 진단, 서비스, 요금 안내, 인사이트, 내 사이트, 문의하기로 통일한다.

### 3.2 verify:prod 강화

`scripts/verify-prod.mjs`가 기존에는 주요 라우트 응답만 확인했다. Phase301에서는 다음을 추가했다.

- `/privacy`, `/terms`, `/refund`, `/business-info`, `/board` 확인
- 가격표 `₩49,000`, `₩149,000` 확인
- legacy 가격 `29,000/89,000` 차단
- legacy contact `hello@nv0.kr` 차단
- `© 2024` 차단
- duplicate public topbar 차단
- visible topbar brand `nv0` 차단
- `docs/current/VERIFY_PROD_REPORT.json` 생성

### 3.3 법적/정책 페이지 내비게이션 오표시 수정

개인정보처리방침, 이용약관, 환불정책 페이지가 상단 메뉴의 `문의하기`를 현재 페이지처럼 표시할 수 있었다. 해당 오표시를 제거하고, 실제 business-info 페이지에서만 `문의하기`를 current로 유지했다.

## 4. 구조 트리 변경

```txt
project-root/
├─ server/
│  └─ index.mjs                         # publicTopMenuHtml, injectPublicTopMenu 보강
├─ scripts/
│  ├─ verify-prod.mjs                   # live/legal/price/topbar hygiene gate 강화
│  └─ validate-phase301-final-closeout.mjs
├─ apps/public/
│  ├─ privacy/index.html                # current nav 오표시 제거
│  ├─ terms/index.html                  # current nav 오표시 제거
│  ├─ refund/index.html                 # current nav 오표시 제거
│  └─ business-info/index.html          # 문의하기 current 유지
├─ docs/
│  └─ PHASE301_FINAL_CLOSEOUT_REPORT.md
├─ package.json                         # phase301 final gate 추가
├─ RUN_ALL_TESTS.sh                     # phase301:final 실행
└─ DELIVERY_README.txt                  # Phase301 기준 납품 안내
```

## 5. 실행 방법

```bash
npm run phase301:final
```

개별 확인:

```bash
npm run check:syntax
npm test
npm run verify:prod
npm run validate:phase301
```

라이브 배포 후 확인:

```bash
NV0_BASE_URL=https://www.nv0.kr npm run verify:prod
```

## 6. 테스트 결과 기록 방식

실행 결과는 다음 파일에 남는다.

```txt
docs/current/VERIFY_PROD_REPORT.json
docs/current/PHASE301_FINAL_CLOSEOUT_AUDIT.json
```

## 7. 남은 리스크

- 실제 `nv0.kr` 서버 배포와 CDN purge는 이 패키지 내부에서 수행하지 않는다.
- PortOne 실결제, SMTP 발송, R2/S3 업로드, Turnstile 운영 키 검증은 실 운영 환경에서 별도 수행해야 한다.
- 공개 사이트가 구버전 캐시를 반환하면 live `verify:prod`는 실패하는 것이 정상이다.

## 8. 품질 점수

| 항목 | 점수 |
|---|---:|
| 제품 목적 명확성 | 9/10 |
| 기능 완성도 | 18/20 |
| 코드 구조와 유지보수성 | 13/15 |
| UI/UX 완성도 | 14/15 |
| 예외처리와 안정성 | 9/10 |
| 테스트 가능성 | 10/10 |
| 성능 최적화 | 6/7 |
| 보안 기본기 | 6/7 |
| 문서화 | 3/3 |
| 확장성 | 3/3 |
| **합계** | **91/100** |

최종 판단: 패키지 기준으로는 상용화 전 최종 점검 가능한 수준이다. 실서비스 오픈 완료 판정은 live `verify:prod`, 결제/메일/스토리지/Turnstile 실환경 검증 후 부여한다.
