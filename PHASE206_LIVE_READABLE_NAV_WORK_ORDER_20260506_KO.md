# PHASE206 라이브 시인성 최종 개선 작업지시서

## 1. 진단 배경

사용자 제보 스크린샷 기준으로 상단 내비게이션에서 현재 페이지 표시가 밝은 배경과 밝은 텍스트로 겹쳐 보이며, `콘텐츠 보드`, `내 사이트` 같은 메뉴가 즉시 읽히지 않는 문제가 확인되었다. 라이브 HTML 기준 공개 페이지는 상단 메뉴에 `무료 진단`, `플랜 비교`, `콘텐츠 보드`, `문서 생성`, `내 사이트`, `고객지원`, `로그인` 7개 항목을 노출한다.

## 2. 개선 대상 수량

| 구분 | 산정 기준 | 수량 |
|---|---:|---:|
| 공개 라우트 | server/index.mjs의 PUBLIC_DIR 라우트 | 22개 |
| 상단 메뉴 항목 | 무료 진단, 플랜 비교, 콘텐츠 보드, 문서 생성, 내 사이트, 고객지원, 로그인 | 7개 |
| 직접 영향 요소 | 22개 라우트 × 7개 상단 메뉴 | 154개 |
| 상태별 CSS 처리 | 기본, hover, aria-current, focus-visible, 모바일 배치 | 5종 |
| 즉시 차단해야 할 푸터 placeholder | replace/placeholder/sample/example/dummy/xxx/미정/TBD/TODO 계열 | 1개 정책군 |

## 3. 발견된 개선 필요 포인트

1. 현재 페이지 메뉴의 활성 상태가 밝은 pill과 밝은 글자 조합으로 보이면 대비가 무너진다.
2. 서버 주입형 `.site-topbar`와 정적 HTML의 `.nv0-topbar`가 서로 다른 CSS 체계를 타면서 배포/캐시 상황에 따라 색상이 흔들릴 수 있다.
3. 로그인 버튼이 일반 메뉴 또는 활성 메뉴와 시각적으로 혼동될 수 있다.
4. 861~1180px 구간에서 브랜드 설명과 메뉴 폭이 동시에 남아 상단바가 답답해질 수 있다.
5. 모바일에서 메뉴가 줄바꿈될 때 터치 영역이 균일하지 않으면 시인성과 클릭성이 같이 떨어진다.
6. 키보드 포커스 상태가 hover/active보다 약하면 접근성 검수에서 놓칠 수 있다.
7. 운영환경에 `replace-with-number` 같은 placeholder 값이 들어간 경우 푸터에 노출될 수 있다.

## 4. 즉시 적용한 수정 사항

### 4.1 상단 내비게이션 색상 고정

- `.site-menu a`, `.nv0-nav a`, `.nv0-icon-link` 기본 상태를 어두운 배경 + 밝은 글자로 고정
- `aria-current="page"` 활성 상태를 파란 그라데이션 + 흰색 텍스트로 고정
- 활성 메뉴 앞에 작은 흰색 dot을 추가해 색상 외의 보조 식별 수단 확보
- `opacity:1`, `text-shadow:none`, `white-space:nowrap` 적용

### 4.2 로그인 버튼 분리

- `.site-menu a.login-link`, `.site-menu a:last-child`, `.nv0-icon-link`를 짙은 네이비 배경 + 파란 테두리로 고정
- hover 시 파란 그라데이션으로 전환하되 텍스트는 항상 흰색 유지

### 4.3 반응형 보강

- 861~1180px 구간에서는 브랜드 보조 설명을 숨기고 메뉴 padding/font-size를 축소
- 860px 이하에서는 2열 그리드, 520px 이하에서는 1열 그리드로 전환
- 모든 메뉴의 터치 높이를 44px 이상으로 확보

### 4.4 푸터 placeholder 차단

- `통신판매업 신고번호` 출력 전 placeholder 패턴을 추가 차단
- 차단 키워드: `replace`, `placeholder`, `sample`, `example`, `dummy`, `xxx`, `미정`, `TBD`, `TODO`

## 5. 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `shared/design-system.css` | PHASE206 최종 상단바 시인성 CSS 블록 추가 |
| `server/index.mjs` | 푸터 placeholder 필터 강화 |
| `scripts/validate-phase206-live-readable-nav.mjs` | 라우트/메뉴/시인성 가드 검증 추가 |
| `package.json` | `validate:phase206`, `phase206:final` 스크립트 추가 및 버전 갱신 |

## 6. 검증 기준

- 활성 메뉴는 어떤 페이지에서도 흰색/연한 배경 조합으로 보이면 실패
- `aria-current="page"`가 있는 메뉴는 흰색 텍스트 + 파란 활성 배경이어야 함
- 로그인 메뉴는 일반 메뉴와 분리된 네이비 버튼이어야 함
- 모바일 860px 이하에서 상단 메뉴가 겹치거나 잘리면 실패
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER=replace-with-number` 환경에서도 푸터에 신고번호가 출력되면 실패

## 7. 롤백 기준

- 배포 후 상단 메뉴가 사라지거나 링크 클릭이 막히는 경우 `shared/design-system.css`의 PHASE206 블록만 제거
- 푸터에 실제 정상 통신판매업 신고번호가 출력되지 않는 경우 placeholder 필터 정규식을 실제 번호 형식 검증 방식으로 교체
- 기능 장애 없이 색상만 미세 조정이 필요한 경우 PHASE206 변수(`--nv206-*`)만 수정
