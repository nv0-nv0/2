# PHASE215 온라인 결제 직결 및 콘텐츠보드 숫자 정상화 작업지시서·테스트 리뷰

## 1. 문제 정의

사용자가 확인한 공개 화면에서 두 가지 문제가 확인되었다.

1. 유료 플랜 구매 흐름이 온라인 결제가 아니라 고객지원/상담 경로로 우회될 수 있었다.
2. 콘텐츠보드의 필터 숫자가 실제 분류 기준과 맞지 않았다. 특히 `type: cta`가 대부분의 자동발행 글에 붙어 있어 `진단 연결/CTA` 카운트가 전체 글 수처럼 보이고, `공지`, `사례` 숫자와 합산 논리가 어긋났다.

## 2. 수정 목표

- 유료 플랜 CTA는 항상 `/checkout?plan=...`으로 연결한다.
- 결제 환경값이 미완성인 경우에도 고객지원/상담 접수로 돌리지 않고, 체크아웃 화면에서 온라인 결제 환경 확인 상태를 표시한다.
- 실제 PortOne 결제 구조는 유지한다.
- 콘텐츠보드 숫자는 `boardType` 기준으로 계산한다.
- 한 페이지에 5개만 표시되는 페이지네이션과 전체/필터/자동발행 총수를 분리해서 표시한다.

## 3. 적용 파일

- `apps/public/plans/app.js`
- `apps/public/checkout/index.html`
- `apps/public/checkout/app.js`
- `apps/public/board/index.html`
- `apps/public/board/app.js`
- `server/routes/payment.mjs`
- `server/routes/public.mjs`
- `tests/phase215-payment-board-normalization.mjs`
- `scripts/validate-phase215-payment-board-normalization.mjs`
- `package.json`

## 4. 주요 변경 사항

### 4.1 유료 플랜 CTA 온라인 결제 직결

- 기존: 결제 환경이 준비되지 않으면 `/business-info?...`로 이동할 수 있음.
- 변경: 유료 플랜은 항상 `/checkout?plan=Report`, `/checkout?plan=FixPack`, `/checkout?plan=Auto`로 이동.
- 버튼 문구 변경:
  - 상세 리포트 결제
  - FixPack 바로 결제
  - Auto 정기 케어 결제

### 4.2 체크아웃 문구 정리

- `상담`, `고객지원 문의`, `필요 시 문의` 성격의 문구 제거.
- 체크아웃 화면은 온라인 결제 전용 흐름으로 정리.
- 결제수단 영역 변경:
  - 신용카드: 온라인 즉시 결제
  - 가상계좌: 결제창에서 선택
  - 간편결제: 결제창 지원 시 사용

### 4.3 서버 결제 오류 응답 정리

- 결제 환경 미완성 시 고객지원 접수 안내를 반환하지 않도록 수정.
- `paymentOnly: true`를 포함해 결제 환경 오류임을 명확히 반환.
- 실제 결제 활성화에는 운영 환경의 PortOne 값이 필요하다.

필수 운영 환경값:

```bash
NV0_PAYMENT_PROVIDER=portone_v2
NV0_PORTONE_STORE_ID=...
NV0_PORTONE_CHANNEL_KEY=...
NV0_PORTONE_API_SECRET=...
NV0_PORTONE_WEBHOOK_SECRET=...
```

운영 환경값은 이 패키지 안에서 확인할 수 없으므로 실제 승인·정산 가능 여부는 배포 환경에서 확인해야 한다. 이 정보는 확인되지 않았습니다.

### 4.4 콘텐츠보드 숫자 정상화

- 기존: `cta` 카운트가 `autoPublished` 또는 `type: cta`까지 포함해 전체 글처럼 표시될 수 있음.
- 변경: 필터 숫자는 `boardType` 기준으로 계산.

계산 기준:

```text
전체 = 공개 게시글 전체 수
CTA 글 = boardType === 'cta'
공지 = boardType === 'notice'
사례 = boardType === 'case'
자동 발행 = autoPublished === true
```

### 4.5 콘텐츠보드 상태 문구 정리

기존처럼 `공개 게시글 5건 · 1/40페이지 · 진단 연결 200건`처럼 오해되는 표시를 제거했다.

새 표시 구조:

```text
전체 200건 중 현재 5건 표시 · 1/40페이지 · 필터 대상 200건 · 자동 발행 200건 · 20분 주기
```

이제 페이지에 보이는 5개와 DB 전체 200개, 현재 필터 대상 수, 자동발행 수를 분리해서 볼 수 있다.

## 5. 테스트 리뷰

실행 완료:

```bash
npm run check:syntax
npm run test:phase215
npm run validate:phase215-payment-board
npm run check:pages
npm run test:routes
npm run test:all
npm run test:portone
npm run test:portone-events
npm run phase215:final
```

결과:

- `check:syntax`: 통과, 252개 소스 확인
- `test:phase215`: 통과, 10/10
- `validate:phase215-payment-board`: 통과, 8/8
- `check:pages`: 통과, 34개 라우트 확인
- `test:routes`: 통과, 24개 라우트 확인
- `test:all`: 통과, 87/87
- `test:portone`: 통과
- `test:portone-events`: 통과
- `phase215:final`: 통과

## 6. 운영 배포 후 확인 항목

1. `/plans`에서 유료 플랜 버튼 클릭 시 `/checkout?plan=...`으로 이동하는지 확인.
2. `/checkout?plan=FixPack`에서 결제창이 실제로 열리는지 확인.
3. PortOne 결제 완료 후 `/api/public/payment/complete` 서버 검증이 성공하는지 확인.
4. `/board`에서 전체/CTA/공지/사례 숫자가 합리적으로 맞는지 확인.
5. `/api/public/board?filter=cta&page=1` 응답의 `stats.cta`, `stats.notice`, `stats.case`, `stats.autoPublished`, `pagination.total` 값 확인.

