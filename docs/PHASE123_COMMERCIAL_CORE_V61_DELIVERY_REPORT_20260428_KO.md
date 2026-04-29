# PHASE123 Commercial Core V6.1 Final 납품 보고서

## 1. 목표
로그인 후 공용 상단 메뉴가 계속 “로그인”으로 보이는 P0 UX 결함을 전역 수정하고, 로그아웃 버튼 전환·실제 로그아웃 동작·깨진 메뉴/도형 표기·모바일/접근성/보안/회귀 테스트까지 상용화 기준으로 정리한다.

## 2. 현재 문제

| 구분 | 사실 | 판단 |
|---|---|---|
| 로그인 메뉴 | 서버가 모든 공용 페이지에 정적 상단 메뉴를 주입하며 로그인 상태와 무관하게 `로그인` 링크를 표시했다. | 로그인 후 메뉴 상태가 실제 세션과 불일치하므로 P0 UX 결함이다. |
| 로그아웃 동작 | `/api/public/auth/logout` API는 존재하지만 공용 메뉴에 연결된 버튼이 없었다. | 기능은 있었으나 사용자가 발견·실행할 수 없는 상태였다. |
| 시각 깨짐 | 포털 메뉴·작업 카드·빠른 실행 영역에 특수문자 기반 아이콘이 섞여 일부 환경에서 깨져 보일 수 있었다. | 운영 화면 신뢰도를 떨어뜨리는 P1 시각 품질 이슈다. |
| 접근성 상태 안내 | 주요 상태 메시지 일부에 `aria-live`가 없었다. | 폼 제출, 진단, 결제 상태 변화가 보조기기에 즉시 전달되지 않을 수 있다. |
| 모바일 메뉴 | 메뉴 항목이 많고 버튼/링크 폭 제어가 부족했다. | 작은 화면에서 줄바꿈·간격·터치 대상이 불안정할 수 있다. |

## 3. P0/P1/P2 작업 목록

| 우선순위 | 작업 | 수정 파일/화면 | 완료 상태 |
|---|---|---|---|
| P0 | 로그인 상태 확인 후 공용 메뉴의 `로그인` 링크를 `로그아웃` 버튼으로 전환 | `shared/session-nav.js`, `server/index.mjs`, 전 공용 페이지 상단 메뉴 | 완료 |
| P0 | 로그아웃 버튼 클릭 시 `/api/public/auth/logout` POST 실행, 세션 쿠키 만료, 포털에서는 홈으로 이동 | `shared/session-nav.js` | 완료 |
| P0 | 사용자 입력·세션 메뉴 렌더링에서 `innerHTML` 미사용, `textContent` 중심 처리 | `shared/session-nav.js` | 완료 |
| P1 | 포털 메뉴/도형 깨짐 가능성이 있는 특수문자 아이콘을 텍스트·숫자 배지로 정리 | `apps/public/portal/index.html`, `apps/public/portal/app.js` | 완료 |
| P1 | 상단 메뉴, 로그아웃 버튼, 브랜드 마크, 포커스 링, 모바일 메뉴 그리드 보정 | `shared/base.css` | 완료 |
| P1 | 상태 메시지에 `role="status" aria-live="polite"` 추가 | `auth`, `checkout`, `board`, `portal`, `veridion-demo` HTML | 완료 |
| P2 | reduced-motion 대응, 테이블 가로 스크롤, 빈 상태 높이, 푸터 줄바꿈 안정화 | `shared/base.css` | 완료 |
| P2 | Phase123 전용 검증 스크립트 및 npm 실행 스크립트 추가 | `scripts/validate-phase123-commercial-core-v61.mjs`, `package.json` | 완료 |

## 4. 상세 수용 기준

| 영역 | 수용 기준 |
|---|---|
| 로그인 메뉴 | 비로그인 상태에서는 메뉴에 `로그인`이 표시되고 `/auth`로 이동한다. 로그인 상태에서는 같은 위치가 `로그아웃` 버튼으로 바뀐다. |
| 로그아웃 | 로그아웃 버튼 클릭 시 POST `/api/public/auth/logout`이 호출되고 `nv0_customer_sid` 쿠키가 만료된다. 이후 `/api/public/auth/session`은 `authenticated: false`를 반환한다. |
| 접근성 | 로그아웃 버튼은 `button type="button"`이며 계정 이메일이 있으면 `aria-label`에 반영한다. 상태 변화는 `aria-live` 영역으로 전달한다. |
| 보안 | 세션 메뉴 렌더링은 `innerHTML`을 쓰지 않고, 민감정보를 localStorage에 저장하지 않는다. |
| 모바일 | 900px 이하에서 상단 메뉴는 2열 그리드, 520px 이하에서는 1열로 안정적으로 접힌다. CTA는 전체 폭으로 유지된다. |
| UI 품질 | 포털의 깨질 수 있는 특수문자형 아이콘은 제거하고 숫자 배지/텍스트 표기로 통일한다. |
| 회귀 | 기존 `npm test`, `test:e2e`, `routes-smoke`, 신규 `validate:phase123`이 모두 통과해야 한다. |

## 5. 테스트 케이스

| ID | 테스트 | 기대 결과 | 결과 |
|---|---|---|---|
| T-01 | `npm run check:syntax` | JS 소스 문법 오류 0건 | 통과 |
| T-02 | `npm test` | 기존 86개 체크 전체 통과 | 통과, 86/86 |
| T-03 | `npm run test:e2e` | 결제·계정·산출물·관리자 핵심 흐름 정적 검증 통과 | 통과 |
| T-04 | `node tests/routes-smoke.mjs` | 24개 라우트 스모크 통과 | 통과 |
| T-05 | `npm run validate:phase123` | 세션 메뉴, 로그아웃, CSS, 접근성, 포털 glyph 정리 15개 체크 통과 | 통과, 15/15 |
| T-06 | 실제 서버 기동 후 회원가입 → 세션 확인 → 로그아웃 → 세션 해제 | `authenticated: true` 이후 로그아웃 후 `authenticated: false` | 통과 |

실행 명령:

```bash
npm run phase123:final
node tests/routes-smoke.mjs
```

## 6. 회귀 검증

| 회귀 영역 | 검증 기준 |
|---|---|
| 기존 공용 페이지 | `/`, `/plans`, `/documents`, `/products/veridion/demo`, `/checkout`, `/portal`, `/board`, `/business-info`, `/privacy`, `/terms`, `/refund` 렌더링 유지 |
| 계정 기능 | 회원가입, 로그인, 비밀번호 재설정 API 경로 유지 |
| 결제 기능 | 개인정보·약관·환불·디지털 산출물 동의 흐름 유지 |
| 포털 기능 | 저장 사이트, 최근 검사, 재검사, 산출물 다운로드 링크 유지 |
| 보안 | 렌더링 안전성, 세션 쿠키 만료, 입력값 직접 HTML 삽입 방지 유지 |
| 접근성 | 폼 상태 메시지, 키보드 포커스, reduced-motion 대응 유지 |

## 7. 배포/롤백 기준

### 배포 전 기준

```bash
npm run phase123:final
node tests/routes-smoke.mjs
```

두 명령이 모두 통과해야 배포한다.

### 배포 실패 조건

| P0 실패 조건 | 조치 |
|---|---|
| 로그인 후 메뉴가 여전히 `로그인`으로만 보임 | 즉시 롤백 또는 `shared/session-nav.js` 주입 여부 확인 |
| 로그아웃 클릭 후 세션이 유지됨 | 즉시 롤백, `/api/public/auth/logout` 응답·쿠키 만료 확인 |
| `/`, `/portal`, `/auth`, `/checkout` 중 하나라도 5xx | 즉시 롤백 |
| 결제 버튼, 진단 버튼, 회원가입/로그인 폼 미동작 | 즉시 롤백 |
| 주요 화면에서 레이아웃 붕괴 또는 모바일 메뉴 접근 불가 | 즉시 롤백 또는 hotfix |

### 롤백 순서

1. 직전 정상 릴리즈 아티팩트로 애플리케이션 컨테이너를 되돌린다.
2. 런타임 데이터는 덮어쓰지 않는다. 이번 수정은 정적 파일·서버 렌더링·검증 스크립트 중심이므로 DB 마이그레이션이 없다.
3. `/readyz`, `/`, `/auth`, `/portal`, `/api/public/auth/session` 순서로 복구 확인한다.
4. Cloudflare 캐시 사용 시 HTML/JS/CSS 캐시를 purge하고 브라우저 강력 새로고침으로 재확인한다.
5. 재배포는 `phase123:final` 통과 후 진행한다.

## 8. Definition of Done

- 로그인 상태 메뉴가 세션 API 결과와 일치한다.
- 로그인 상태에서 공용 메뉴에 `로그아웃` 버튼이 표시된다.
- 로그아웃 버튼은 실제 세션 만료 API를 호출하고 성공 후 사용자에게 안전한 위치로 이동시킨다.
- 세션 메뉴 스크립트는 사용자 입력을 HTML로 직접 삽입하지 않는다.
- 포털 메뉴·작업 카드·빠른 실행 영역의 깨질 수 있는 도형/특수문자 표기가 정리됐다.
- 모바일 메뉴, 포커스 링, reduced-motion, aria-live 상태 안내가 반영됐다.
- 기존 테스트와 신규 Phase123 검증이 모두 통과했다.
- 검증이 필요한 외부 운영환경 정보는 포함하지 않았다. 이 정보는 확인되지 않았습니다.

## 자체 QA

- 원문 의도와 제약: 로그인 메뉴, 로그아웃 동작, 전역 UI 정리, 100점 기준 검토 반영.
- 보존 정보: 100%, 100점 요구를 상용 QA 기준과 DoD에 반영.
- 확인되지 않은 정보: 실제 운영 배포 URL·운영 캐시 상태는 제공되지 않아 단정하지 않음.
- 바로 실행성: `npm run phase123:final`, `node tests/routes-smoke.mjs` 제공.
- P0 가능성: 로그인 메뉴 불일치, 로그아웃 실패, 주요 화면 5xx, 기능 버튼 미동작을 별도 표시.
