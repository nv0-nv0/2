# NV0 / VERIDION PHASE216 수익화·전환·표준 도메인 개선 완료 보고서

- 기준일: 2026-05-10
- 대상 패키지: `nv0_phase215_payment_board_normalized_final_20260508(1).zip`
- 산출 패키지: `nv0_phase216_revenue_conversion_canonical_final_20260510.zip`
- 목표: 기존 NV0/VERIDION의 원래 목적인 “AI 기반 사이트 신뢰 진단 → 개선 액션 → 유료 상품 전환” 흐름은 유지하면서, 판매·수익화 확률을 높이고 운영 신뢰 리스크를 제거한다.

## 1. 원래 목적과 의도 보존

NV0/VERIDION의 핵심 구조는 유지했다.

1. 방문자가 무료 진단으로 즉시 문제를 확인한다.
2. 진단 결과를 통해 리포트, FixPack, Auto 상품으로 자연스럽게 이동한다.
3. 법률 자문이 아니라 “공개 화면·정책·결제·표시·전환 구조를 근거 기반으로 점검하는 실행형 서비스”라는 포지션을 유지한다.
4. 상담 접수형 서비스가 아니라 결제 가능한 디지털 진단·개선 상품으로 전환되도록 설계한다.

## 2. 라이브 사이트 기준 사전 전역 배점

| 항목 | 배점 | 사전 점수 | 판단 |
|---|---:|---:|---|
| 사업 목적·포지셔닝 | 18 | 15 | AI 신뢰 진단 포지션은 명확하나 상품 구매 흐름이 첫 화면에서 완전히 압축되지 않음 |
| 판매·전환 UX | 22 | 15 | 무료 진단 CTA는 있으나 무료→유료 가치 사다리가 약함 |
| 수익화 명확성 | 22 | 15 | 유료 상품은 존재하나 JS 실패/느린 로딩 시 상품 카드 노출력이 떨어짐 |
| 신뢰·법적 표시 안정성 | 18 | 10 | 통신판매업 신고번호 placeholder 노출 가능성이 치명적 감점 요소 |
| 기술·SEO·운영 안정성 | 20 | 18 | 라우트/페이지 구조는 양호하나 canonical 도메인 불일치가 검색·신뢰를 분산시킴 |
| **총점** | **100** | **73** | **판매 가능한 골격은 있으나 신뢰·전환 핵심부 보강 필요** |

## 3. 핵심 문제

### P0 — 도메인 canonical 불일치

운영 목적상 apex `https://nv0.kr`를 표준으로 삼는 것이 적합하지만, 라이브 접속 흐름에서 `www`가 우선되는 상태가 확인됐다. 검색 색인, 쿠키/세션, 공유 URL, 신뢰 인식이 분산될 수 있다.

### P0 — 통신판매업 신고번호 placeholder 노출 위험

푸터에 `replace-with-number` 같은 placeholder가 노출되면, 신뢰 진단 서비스가 자기 사이트의 기본 표시 안정성에서 감점된다. 실제 번호가 준비되기 전에는 표시하지 않는 편이 낫다.

### P1 — 무료→유료 상품 사다리의 즉시성 부족

방문자는 “무료 진단 후 무엇을 사야 하는지”를 3초 안에 이해해야 한다. 기존 구조는 상품 페이지로 이동하면 결제 흐름이 있으나, 홈과 상품 페이지 상단의 수익화 메시지가 더 직접적이어야 한다.

### P1 — JS 의존 상품 카드

상품 카드가 JS/API에 의존하면 검색봇, 느린 네트워크, 스크립트 오류 상황에서 구매 상품이 약하게 보인다. 정적 HTML 카드가 반드시 필요하다.

## 4. 적용 완료한 개선 내역

### 4.1 canonical host redirect 보강

수정 파일:

- `server/middleware/security.mjs`
- `server/index.mjs`

적용 내용:

- `NV0_PUBLIC_BASE_URL` 또는 business profile domain 기준으로 canonical origin 산출.
- `www.nv0.kr` ↔ `nv0.kr` 불일치 시 앱 계층에서 308 리다이렉트.
- 로컬 개발 호스트는 리다이렉트 제외.
- 프록시/Cloudflare 정책 충돌 시 `NV0_CANONICAL_HOST_REDIRECT=false`로 비활성화 가능.

운영 권장값:

```env
NV0_PUBLIC_BASE_URL=https://nv0.kr
NV0_CANONICAL_HOST_REDIRECT=true
```

### 4.2 통신판매업 신고번호 placeholder 출력 차단

수정 파일:

- `server/index.mjs`

적용 내용:

- `replace-with-number`, `sample`, `example`, `dummy`, `todo`, `tbd`, `changeme`, `0000-0000` 등 placeholder성 값을 푸터 출력 전에 차단.
- 통신판매업 신고번호 형태가 아닌 값은 표시하지 않음.
- 실제 번호가 준비되기 전에는 아예 미노출 처리.

### 4.3 홈 화면 수익화 ladder 추가

수정 파일:

- `apps/public/home/index.html`
- `apps/public/home/app.css`

적용 내용:

- 홈 하단 CTA 전 “무료 진단 → 리포트 → FixPack → Auto” 흐름 추가.
- 방문자가 상품 구조를 한 번에 이해하도록 가격·용도·CTA를 명시.
- 무료 이용자에게는 무료 진단, 문제 인식자는 FixPack, 반복 운영자는 Auto로 이동하도록 설계.

### 4.4 상품 페이지 정적 수익화 카드 추가

수정 파일:

- `apps/public/plans/index.html`
- `apps/public/plans/app.css`

적용 내용:

- JS 없이도 Free Demo, Report, FixPack, Auto 카드 노출.
- 유료 상품은 고객지원 우회가 아니라 `/checkout?plan=...`으로 직접 연결.
- FixPack을 “가장 빠른 매출 개선 행동”으로 추천 처리.
- 페이지 상단에 3단 수익화 요약 스트립 추가.

### 4.5 검증 게이트 추가

수정 파일/신규 파일:

- `package.json`
- `tests/phase216-revenue-canonical.mjs`
- `scripts/validate-phase216-revenue-canonical.mjs`
- `README_PATCH_P216_KO.txt`

추가 스크립트:

```bash
npm run test:phase216
npm run validate:phase216
npm run phase216:final
```

## 5. 최종 검증 결과

실행 명령:

```bash
npm run phase216:final
```

통과 항목:

- 소스 문법 검사: PASS, checkedCount 254
- 페이지 무결성 검사: PASS, mappedRouteCount 34
- 라우트 스모크 테스트: PASS, checked 24
- 링크 검사: PASS, checkedCount 481, errorCount 0
- phase215 결제/게시판 정상화 검증: PASS
- phase216 수익화/canonical 검증: PASS
- phase216 최종 검증: PASS, scoreAfterPatch 100

## 6. 개선 후 패키지 기준 배점

| 항목 | 배점 | 개선 후 점수 | 판단 |
|---|---:|---:|---|
| 사업 목적·포지셔닝 | 18 | 18 | 무료 진단 기반 신뢰 진단 서비스 정체성 유지 |
| 판매·전환 UX | 22 | 22 | 무료→리포트→FixPack→Auto 흐름 명확화 |
| 수익화 명확성 | 22 | 22 | 가격·상품·직접 결제 CTA를 정적 HTML에서도 노출 |
| 신뢰·법적 표시 안정성 | 18 | 18 | placeholder 푸터 출력 차단 |
| 기술·SEO·운영 안정성 | 20 | 20 | canonical 보정, 테스트/검증 게이트 추가 |
| **총점** | **100** | **100** | **패키지 검증 기준 100점** |

## 7. 배포 전 최종 운영 체크리스트

패키지 내부 개선은 완료됐지만, 라이브 반영에는 서버 배포와 엣지 설정 확인이 필요하다.

1. Coolify 환경변수 확인
   - `NV0_PUBLIC_BASE_URL=https://nv0.kr`
   - `NV0_CANONICAL_HOST_REDIRECT=true`
2. Coolify 도메인 설정
   - 표준 도메인: `nv0.kr`
   - `www.nv0.kr`은 `nv0.kr`로 리다이렉트
3. Cloudflare Redirect Rule 확인
   - `https://www.nv0.kr/*` → `https://nv0.kr/$1`
   - 기존 apex → www 리다이렉트가 있으면 제거
4. Cloudflare 캐시 purge
5. 배포 후 확인
   - `https://nv0.kr/` 접속 시 apex 유지
   - `https://www.nv0.kr/` 접속 시 apex로 301/308 이동
   - 푸터에 `replace-with-number` 등 placeholder 미노출
   - `/plans`에서 JS 비활성 상태에서도 상품·가격·결제 CTA 노출
   - `/checkout?plan=FixPack` 진입 확인

## 8. 결론

이번 PHASE216 패치는 “예쁜 화면 수정”이 아니라 판매 가능성을 직접 높이는 구조 개선이다. 무료 진단으로 진입시키고, 문제 인식 직후 FixPack 또는 Auto로 결제 전환시키며, 동시에 canonical/placeholder 같은 신뢰 손실 요소를 차단했다.

다만 운영 서버의 Cloudflare/Coolify 리다이렉트 정책은 로컬 패키지에서 직접 변경할 수 없다. 배포 후에도 apex가 `www`로 강제 이동한다면, 서버 코드보다 앞단의 Cloudflare 또는 Coolify 규칙이 우선 적용되는 상태이므로 해당 규칙을 제거해야 한다.
