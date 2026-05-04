# PHASE190 전역 UX·카피·인포그래픽 개선 완료 보고서

작성일: 2026-05-03  
대상: `nv0.kr` 공개 운영 패키지  
입력 기준: 전역 진단 작업 지시서의 230개 개선 대상

---

## 1. 완료 요약

전역 진단에서 잡은 230개 개선 대상 중, 운영 화면 품질을 떨어뜨리는 P0/P1 핵심 항목을 패키지에 직접 반영했다.

이번 완료본의 핵심은 다음 7가지다.

1. 전역 공개 페이지 상단 메뉴를 `무료 진단 / 플랜 / 보드 / 문서 / 내 사이트 / 고객지원`으로 통일
2. 모든 공개 페이지 푸터를 동일 구조로 교체하고 미확정 통신판매업 placeholder 제거
3. 포털의 검사 전 가짜 수치·어색한 도넛형 인포그래픽 제거
4. 홈, 무료 진단, 플랜, 문서, 결제 화면에 목적형 카드/흐름형 인포그래픽 추가
5. 문서 페이지의 더미 수치와 오래된 샘플 날짜 제거
6. 결제 화면의 기본 선택 상품과 주문 요약 불일치 개선
7. `/demo` legacy 경로를 301 리다이렉트가 아닌 200 안내 페이지로 보강해 smoke 통과

---

## 2. 적용 범위

### 2-1. 전역 shell

수정 대상:

- `apps/public/*/index.html`
- `shared/base.css`
- `server/index.mjs`

처리 내용:

- 공개 페이지 상단 메뉴 통일
- 계정/로그인 액션은 우측으로 분리
- `체크아웃`을 기본 메뉴에서 제거
- `콘텐츠 보드`, `운영 게시판`, `개선 보드`를 `보드` 기준으로 정리
- 푸터를 전역 동일 구조로 통일
- `replace-with-number` placeholder 0건화

---

## 3. 페이지별 완료 내용

### 3-1. 홈 `/`

- 타이틀을 `NV0 Veridion | 온라인 사업 리스크 진단 플랫폼`으로 보강
- 홈에 3단 흐름 인포그래픽 추가
  - 고객이 멈추는 지점
  - NV0가 확인하는 것
  - 다음 행동
- 잘못된 띄어쓰기 `신뢰가 깨지는 지점 을` 수정
- 리포트 CTA 문구를 더 자연스럽게 조정

### 3-2. 무료 진단 `/products/veridion/demo`

- `무료 무료` 중복 문구 제거
- `자동 근거 정리`를 `확인 근거 정리`로 완화
- `수동확인`을 더 쉬운 설명으로 정리
- 결과 전 상태에 4카드 요약 인포그래픽 추가
  - 점수
  - 자동 확인
  - 별도 확인
  - 다음 행동
- `상품 비교`를 `플랜`으로 정리

### 3-3. 플랜 `/plans`

- `상품 정보를 확인했습니다.` 제거
- 가격 카드 위에 선택 기준 매트릭스 추가
  - Free
  - Pro 리포트
  - FixPack
  - Auto
- `상세 리포트` 표시를 `Pro 리포트` 중심으로 정리
- 플랜 신청 CTA를 리포트 신청/플랜 신청 기준으로 분리

### 3-4. 보드 `/board`

- 보드 렌더러에 해시태그 블록 추가
- 공개 글 섹션 제목 인식 확대
- CTA 버튼 문구를 `내 사이트도 무료 진단`으로 자연화
- 포털 연결 피드에서 긴 본문 노출 대신 요약 카드로 표시

### 3-5. 내 사이트 `/portal`

- 검사 전 도넛형 인포그래픽 제거
- `최근 검사 요약` 카드 구조 적용
- 가짜 수치 제거
- `저장 사이트 / 최근 검사 / 검토 필요` 카드형 메트릭 적용
- `바로 할 수 있는 일` 중심으로 기능 축소
- 포털 게시글 피드 요약화

### 3-6. 문서 `/documents`

- `생성 문서 24개`, `최근 수정 2025.05.26`, `다운로드 횟수 18회`, `최근 7일 수정 5개` 같은 더미성 수치 제거
- 문서 생성 3단계 흐름으로 재구성
  - 기본 정보 입력
  - 초안 미리보기
  - 복사·다운로드
- 샘플 문서 예시에는 샘플 라벨과 설명만 남김

### 3-7. 결제 `/checkout`

- 기본 선택 상품을 `Pro` 월 결제에서 `Pro 리포트 · 1회`로 변경
- 주문 요약 기본값을 `199,000원 / 월`에서 `선택 후 표시`로 변경
- 결제 진행 3단계 바 추가
  - 상품 확인
  - 정책 동의
  - 결제 진행
- 버튼 줄붙음 방지를 위해 결제 버튼 row 스타일 보강
- `/checkout?plan=Report`가 기존처럼 Pro 월 결제처럼 보이지 않도록 기본 표시 개선

### 3-8. 정책/사업자/고객지원/로그인

- 상단 메뉴와 푸터 통일
- 정책 페이지 최종 수정일 추가
- 개인정보 처리위탁 문구에서 `운영 환경의 실제 계약 현황` 같은 미확정 표현 제거
- 사업자 정보 운영 기준 문장 간결화
- 고객지원 페이지 표현 통일

### 3-9. `/demo` legacy 경로

- 기존 smoke 테스트에서 `/demo`가 200을 기대했으나 서버가 301 리다이렉트 처리하던 문제 수정
- `apps/public/demo/index.html` 추가
- `server/index.mjs` pageMap에 `/demo` 직접 매핑
- `/demo`에서도 `주소 하나로`, `무료 진단` 문구가 보이도록 보강

---

## 4. 제거/정리한 운영 화면 금지 문자열

다음 문자열은 완료본에서 0건이다.

```txt
replace-with-number
지난 진단 대비 8점 상승
신뢰 요소 68 / 100
문의·구매 흐름 74 / 100
콘텐츠 품질 70 / 100
기술 검색 노출 76 / 100
콘텐츠 공백 분석 15개
상품 정보를 확인했습니다.
결제 시작결제 완료 확인
무료 무료
```

---

## 5. 검증 결과

```bash
npm run check:syntax
# PASS

npm run test:routes
# PASS

npm run check:links -- --summary
# PASS

npm run smoke
# PASS
```

검증 결과:

- 문법 오류 없음
- 주요 공개/관리 라우트 smoke 통과
- 링크 무결성 통과
- `/demo` 200 smoke 통과
- placeholder 및 더미 문구 제거 확인

---

## 6. 수정 파일 핵심 목록

- `apps/public/home/index.html`
- `apps/public/veridion-demo/index.html`
- `apps/public/demo/index.html`
- `apps/public/plans/index.html`
- `apps/public/board/app.js`
- `apps/public/board/app.css`
- `apps/public/portal/index.html`
- `apps/public/portal/app.js`
- `apps/public/portal/app.css`
- `apps/public/documents/index.html`
- `apps/public/checkout/index.html`
- `apps/public/checkout/app.js`
- `apps/public/business-info/index.html`
- `apps/public/terms/index.html`
- `apps/public/privacy/index.html`
- `apps/public/refund/index.html`
- `apps/public/guides/index.html`
- `shared/base.css`
- `server/index.mjs`

---

## 7. 배포 후 확인 순서

1. Coolify에서 새 패키지로 재배포
2. Cloudflare 캐시 삭제
3. 다음 경로 직접 확인
   - `/`
   - `/products/veridion/demo`
   - `/plans`
   - `/board`
   - `/portal`
   - `/documents`
   - `/checkout?plan=Report`
   - `/demo`
4. 모바일 390px에서 카드 겹침/버튼 줄붙음 확인
5. `replace-with-number`가 라이브에서 노출되지 않는지 확인

---

## 8. 남은 권장 작업

이번 패키지는 전역 구조와 보이는 품질 문제를 우선 정리한 완료본이다.  
다음 단계로는 실제 라이브 데이터 기준의 상세 QA가 필요하다.

- 실제 회원 로그인 후 포털 데이터 상태 확인
- 실제 결제 provider 환경에서 plan별 금액 검증
- 실제 자동 발행 게시글 10건 샘플 품질 점검
- 모바일 브라우저 실기기 확인
