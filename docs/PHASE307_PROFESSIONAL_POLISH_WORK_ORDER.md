# PHASE307 Professional Polish 작업 지시서

## 목적
인사이트 페이지와 내 사이트 페이지를 운영 상품 화면답게 깔끔하고 전문적이며 세련된 구조로 정리한다. 20분에 1회 인사이트 발행 구조는 유지하고, 깨진 도형·장식 기호·오래된 날짜·데모성 문구가 공개 화면 품질을 떨어뜨리지 않도록 차단한다.

## 적용 범위
- `apps/public/board/index.html`
- `apps/public/board/app.js`
- `apps/public/portal/index.html`
- `apps/public/portal/app.js`
- `shared/phase307-professional-polish.css`
- `scripts/validate-phase307-professional-polish.mjs`
- `package.json`

## 작업 지시
1. 인사이트 페이지는 API 지연 시에도 검수된 기본 인사이트가 즉시 보이도록 한다.
2. 내 사이트 페이지는 오래된 2025 날짜, 장식 기호, 의미 없는 도형 텍스트를 제거한다.
3. 정적 데모 숫자는 운영 연결 대기 상태로 바꾸고, 실제 데이터가 도착하면 JS가 덮어쓰도록 한다.
4. 다음 행동 카드의 문구를 위험 과장형에서 실무 실행형으로 바꾼다.
5. 버튼, 카드, 표, 인사이트 피드의 시각 톤을 하나의 프리미엄 스타일 토큰으로 통일한다.
6. 20분에 1회 발행 문구와 서버 발행 간격을 검증 대상으로 고정한다.
7. 릴리스 전 런타임 데이터는 seed 기준으로 재정리하고 세션·업로드·백업·리포트 잔여물을 비운다.

## 수용 기준
- `/portal` 정적 HTML에 깨진 문자/장식 기호가 노출되지 않는다.
- `/portal` 정적 HTML에 오래된 2025 날짜가 노출되지 않는다.
- `/board`는 목록 API 실패 시에도 검수된 기본 인사이트를 표시한다.
- 서버 자동 발행 간격은 20분으로 유지된다.
- `npm run validate:phase307`가 100점으로 통과한다.
- `npm run phase307:final`이 통과한다.
