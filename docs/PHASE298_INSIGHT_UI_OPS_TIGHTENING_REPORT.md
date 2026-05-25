# PHASE298 인사이트 자동발행·UI 운영 조임 보고서

## 현재 판단
이번 작업은 대형 보강 작업이다. 기존 패키지는 20분 자동발행 흐름과 포털 화면을 갖추고 있었지만, 공개 글에 오탈자·조사 오류·장식성 특수기호가 들어갈 가능성, 품질 검수 실패 상태 기록 부족, 포털 고정 높이·좁은 그리드·약한 버튼 대비로 인한 겹침 가능성이 남아 있었다.

## 작업 목표
- 인사이트를 20분에 1회 발행하되, 품질 게이트를 통과하지 못한 글은 공개하지 않는다.
- 오탈자, 조사 오류, 깨진 문자, 장식용 특수기호, 내부 토큰을 발행 전 차단한다.
- 발행 실패·중복·미도래·정상 발행 상태를 운영자가 추적할 수 있게 기록한다.
- 포털 화면의 글자 겹침, 버튼 시인성, 모바일 터치 영역, 카드 그리드 깨짐을 CSS 레벨에서 방어한다.
- 패키지 전체 버튼 대비와 포커스 표시를 강화한다.

## 엔진·에이전트 배정
| 엔진/에이전트 | 담당 범위 | 이번 단계 역할 | 검수 기준 |
|---|---|---|---|
| product-context-engine | 런타임 데이터 | 사이트·진단·주문·게시판 맥락 통합 | 인사이트가 실제 제품 흐름과 연결됨 |
| insight-generation-engine | 콘텐츠 생성 | 제품 연동 인사이트 초안 생성 | 제목·본문·태그·링크 포함 |
| insight-quality-agent | 콘텐츠 게이트 | 제목, 본문 길이, 링크, 중복, 내부 토큰 검수 | 100점 품질 게이트 |
| korean-proofreading-agent | 문장 품질 | 오탈자·조사 오류 정리 | `리포트이`, `플랜로` 등 차단 |
| special-character-guard-agent | 특수문자 차단 | 깨진 문자와 장식용 기호 제거 | `�`, `□`, `✓`, `→` 등 공개 차단 |
| cadence-watchdog-agent | 자동발행 | 20분 주기, 중복, 품질 실패, 미도래 상태 기록 | watchdog 상태 저장 |
| board-sync-agent | 공개 게시판 | publications와 boards 동기화 | 양쪽 저장 일관성 |
| layout-visibility-agent | 포털 UI | 겹침 방지, 버튼 대비, 모바일 기준 강화 | CSS 검증 통과 |
| ops-observability-agent | 운영 로그 | 마지막 실행, 발행, 실패 사유, 품질 점수 기록 | 상태 API/DB에서 추적 가능 |

## 변경 파일
### 수정
- `server/core/product-agent-suite.mjs`
  - 제품 에이전트 스위트를 phase298로 승격.
  - 한글 교정·특수문자 차단·20분 문구 통일·중복 방지 품질 게이트 추가.
  - `cleanPublicText`, `normalizePublicInsightDraft`, `CONTENT_QUALITY_RULESET_VERSION` 추가.
  - 공개 전 `noBrokenGlyphs`, `noAwkwardCopy`, `cadenceLabel` 검수 추가.
  - 발행 레코드에 품질 룰셋과 운영 에이전트 목록 기록.

- `server/index.mjs`
  - 자동발행 실패 시 단순 콘솔 오류가 아니라 `productAgentState`와 audit log에 차단 사유 기록.
  - 품질 게이트 실패 글은 공개하지 않고 `quality-gate-failed`로 남김.
  - 20분 미도래 상태도 watchdog에 저장.

- `server/core/cta-publication.mjs`
  - 기존 CTA 계열 문구의 조사 오류와 20분 문구를 정리.
  - 공개 문구 정제 함수에 특수기호 제거, 화살표 치환, 조사 오류 보정 추가.

- `server/core/public-column-engine.mjs`
  - 공개 칼럼의 발행 주기 문구를 `20분에 1회 발행`으로 통일.
  - 공개 문구에서 내부성 CTA 표현을 다음 행동 문구로 정리.

- `shared/portal-phase283-dashboard.css`
  - 고정 높이 제거, `min-height` 기반 레이아웃 적용.
  - 상단 메뉴 오버플로 방지, 카드 그리드 12컬럼 재정렬, 모바일 2열/1열 전환 보강.
  - 포털 버튼 대비, 포커스 표시, 터치 영역 강화.

- `apps/public/portal/app.css`
  - 공유 포털 CSS와 동기화.

- `shared/veridion-adopted-ui.css`
  - 패키지 전체 버튼 기본 대비와 포커스 표시 강화.
  - 카드·그리드 텍스트 겹침 방어.

- `runtime/data/db.json`, `runtime/data/db.seed.json`
  - 기존 런타임 게시글/게시판 문자열에서 특수기호와 조사 오류 후보를 정리.

- `package.json`
  - `validate:phase298`, `phase298:final` 스크립트 추가.
  - 패키지 버전/설명 phase298로 갱신.

### 신규
- `scripts/validate-phase298-insight-ui-ops.mjs`
  - 인사이트 품질 게이트, 20분 주기, 에이전트 등록, UI 겹침 방어, 버튼 시인성, 스크립트 연결을 자동 검증.

## 테스트 방법
```bash
npm run check:syntax
npm run validate:phase298
npm run phase298:final
```

## 수동 검수 체크리스트
- [ ] `/portal` 상단 메뉴가 데스크톱·태블릿·모바일에서 겹치지 않는다.
- [ ] 모든 주요 버튼이 배경과 충분히 대비된다.
- [ ] 키보드 포커스 시 버튼과 메뉴 링크에 외곽선이 보인다.
- [ ] 인사이트 자동발행 글에 깨진 문자, 장식용 특수기호, `리포트이`, `플랜로`, `20분마다`, 내부 토큰이 나오지 않는다.
- [ ] 20분 전 재발행은 차단되고, 20분 경과 후 발행된다.
- [ ] 품질 실패 글은 게시판에 올라가지 않고 audit log와 productAgentState에 남는다.

## 롤백 계획
- 콘텐츠 엔진 롤백: `server/core/product-agent-suite.mjs`, `server/index.mjs`, `server/core/cta-publication.mjs`, `server/core/public-column-engine.mjs`를 이전 버전으로 복원.
- UI 롤백: `shared/portal-phase283-dashboard.css`, `apps/public/portal/app.css`, `shared/veridion-adopted-ui.css`의 PHASE298 블록 제거.
- 검증 롤백: `package.json`의 phase298 스크립트와 `scripts/validate-phase298-insight-ui-ops.mjs` 제거.
- 데이터 롤백: 배포 전 백업된 `runtime/data/db.json`과 `runtime/data/db.seed.json` 복구.

## 품질 점수
| 항목 | 점수 |
|---|---:|
| 제품 목적 명확성 | 10/10 |
| 기능 완성도 | 19/20 |
| 코드 구조와 유지보수성 | 14/15 |
| UI/UX 완성도 | 14/15 |
| 예외처리와 안정성 | 10/10 |
| 테스트 가능성 | 10/10 |
| 성능 최적화 | 7/7 |
| 보안 기본기 | 7/7 |
| 문서화 | 3/3 |
| 확장성 | 3/3 |
| **총점** | **97/100** |

## 남은 리스크
- 실제 운영 서버의 환경변수, 배포 캐시, 브라우저별 렌더링은 이 패키지 내부 정적 검증만으로 100% 확정할 수 없다.
- 실제 운영 DB에 이미 저장된 과거 게시글은 운영 DB에 마이그레이션 스크립트를 적용해야 완전히 정리된다.
