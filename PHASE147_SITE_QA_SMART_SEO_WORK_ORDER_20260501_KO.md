# PHASE147 nv0.kr 사이트 QA·CTA·SEO 스마트 개선 작업지시서

## 1. 현재 상태 요약

- 대상: nv0.kr / www.nv0.kr
- 목적: 사이트 개선·보완 필요사항을 중분류 기준 30개로 도출하고, 즉시 반영 가능한 CTA·SEO·UX·운영 안정성 패치를 적용한다.
- 기준 배포: P146 CTA Smart SEO 패치 이후 프로젝트
- 이번 산출물: P147 경량 패치 ZIP, P147 전체 프로젝트 ZIP, 30개 중분류 작업지시서, 검증 JSON

## 2. 실제 확인한 핵심 문제

1. 라이브 상단 네비게이션에 `무료 진단` 링크가 일반 메뉴와 CTA 버튼으로 중복 노출되어 텍스트 파싱 기준 반복도가 높았다.
2. 게시판 페이지는 실제 P146 로직이 24개 주제팩으로 확장되었음에도 정적 설명은 여전히 `6가지 글 유형`으로 남아 있었다.
3. 게시판 빈 상태 문구가 `아직 공개된 게시글이 없습니다`라고 고정되어, 아래 샘플 5개 영역과 인지 충돌이 있었다.
4. `/api/public/board`는 여전히 `variantCount: 12`를 반환해 프론트와 실제 CTA 엔진 상태가 불일치했다.
5. `/api/public/diagnosis-engine`의 autoPublish variants가 6개 고정 배열이라 실제 CTA 엔진 주제와 불일치했다.
6. 이미 description이 있는 정적 페이지는 서버 SEO 주입 로직이 canonical, OG, Twitter 메타를 충분히 보강하지 못했다.
7. 구조화 데이터가 단일 SoftwareApplication 중심이라 Organization, WebSite, WebPage, BreadcrumbList 연결이 부족했다.
8. sitemap에 noindex 성격의 `/auth`가 포함되고, `/guides`가 중복 포함되어 검색 크롤링 효율이 떨어질 수 있었다.
9. CTA 글 본문에는 검색의도·고객단계·메타설명 데이터는 저장되지만 게시판 화면에서는 충분히 노출되지 않았다.
10. CTA 글 본문에 내부링크 섹션이 없어 게시글 → 무료 진단 → 요금제 → 문서 생성 → 내 사이트 관리 흐름이 약했다.

## 3. 개선·보완 항목 30개

| 번호 | 중분류 | 우선순위 | 현재 문제 | 수정 지시 | 반영 상태 | 검증 방법 | 롤백 기준 |
|---:|---|---|---|---|---|---|---|
| 01 | 상단 네비게이션 중복 CTA | P1 | `무료 진단` 링크가 메뉴와 CTA로 반복 노출 | CTA 버튼 텍스트를 `무료 시작`으로 변경 | 반영 | `/` HTML 확인 | `publicTopMenuHtml` 이전 문자열 복구 |
| 02 | 페이지별 SEO 메타 | P0 | description이 있는 정적 페이지는 추가 SEO 태그가 누락될 수 있음 | 서버에서 description/keywords/robots/canonical/OG/Twitter/theme-color를 일괄 재주입 | 반영 | 렌더 HTML head 확인 | `injectSeoMeta` 이전 버전 복구 |
| 03 | 키워드 메타 클러스터 | P1 | 페이지별 검색 키워드가 명시적으로 관리되지 않음 | routeMeta에 페이지별 keywords 배열 추가 | 반영 | `/plans`, `/board` head 확인 | routeMeta 이전 구조 복구 |
| 04 | Open Graph 보강 | P1 | SNS/공유 미리보기 품질이 제한적 | og:locale, og:site_name, og:title, og:description, og:url 추가 | 반영 | HTML head grep | injectSeoMeta 복구 |
| 05 | Twitter 카드 보강 | P2 | twitter:title/description 누락 | twitter card/title/description 추가 | 반영 | HTML head grep | injectSeoMeta 복구 |
| 06 | 구조화 데이터 그래프 | P1 | 단일 SoftwareApplication만 제공 | Organization/WebSite/SoftwareApplication/WebPage/BreadcrumbList 그래프 생성 | 반영 | ld+json 파싱 | buildStructuredData 복구 |
| 07 | BreadcrumbList | P2 | 검색엔진용 경로 정보 부족 | 홈→현재 페이지 BreadcrumbList 추가 | 반영 | ld+json 확인 | buildStructuredData 복구 |
| 08 | sitemap 품질 | P1 | `/auth` 포함, `/guides` 중복 | index 대상 페이지만 우선순위/변경주기와 함께 재정리 | 반영 | `/sitemap.xml` 확인 | buildSitemapXml 복구 |
| 09 | CTA 엔진 API 일치 | P0 | API는 variantCount 12 반환 | ctaTopicPacks().length 기준 반환 | 반영 | `/api/public/board` 확인 | 엔드포인트 라인 복구 |
| 10 | 진단 엔진 자동발행 설명 | P1 | 6개 고정 variants 반환 | 실제 ctaTopicPacks headline 배열 반환 | 반영 | `/api/public/diagnosis-engine` 확인 | 엔드포인트 라인 복구 |
| 11 | 게시판 정적 카피 최신화 | P1 | `6가지 글 유형`으로 오래된 설명 | `24가지 SEO 글 유형`으로 수정 | 반영 | `/board` 렌더 확인 | board/index.html 복구 |
| 12 | 게시판 빈 상태 충돌 | P1 | 빈 상태와 샘플 게시글이 충돌 | 로딩/대기형 문구로 변경 | 반영 | `/board` 확인 | board/index.html 복구 |
| 13 | 게시판 글 유형 설명 | P1 | 6개 고정 카드가 실제 엔진과 불일치 | 진단/검색의도/FAQ/사례/정책/내부링크형으로 재정리 | 반영 | `/board` 확인 | board/index.html 복구 |
| 14 | CTA 글 메타 노출 | P1 | searchIntent/funnel/keyword가 화면에서 약함 | 게시글 meta-row에 검색의도, 고객단계, 키워드 노출 | 반영 | board app 렌더 확인 | board/app.js 복구 |
| 15 | CTA 주제 수 상태 표시 | P2 | 프론트가 실제 주제 수를 표시하지 않음 | API variantCount를 받아 상태 문구에 표시 | 반영 | board status 확인 | board/app.js 복구 |
| 16 | CTA 본문 FAQ 밀도 | P1 | FAQ 2개는 SEO 문서 밀도가 낮음 | FAQ 3개로 확장 | 반영 | CTA 샘플 생성 | cta-publication.mjs 복구 |
| 17 | CTA 내부링크 섹션 | P0 | 자동 글에서 내부링크 구조가 약함 | 무료 진단/요금제/문서/포털 내부링크 섹션 추가 | 반영 | CTA 샘플 body 확인 | cta-publication.mjs 복구 |
| 18 | CTA 예상 읽기 시간 | P2 | 글 길이 체감 정보 없음 | readingTimeMinutes 계산 및 신뢰 근거에 반영 | 반영 | CTA 샘플 seo 확인 | cta-publication.mjs 복구 |
| 19 | CTA 콘텐츠 목표 | P2 | 글의 전환 목표가 데이터로 약함 | contentGoal 저장 | 반영 | CTA 샘플 seo 확인 | cta-publication.mjs 복구 |
| 20 | 게시판 섹션 파서 | P1 | 새 내부링크 섹션을 heading으로 인식하지 못함 | `내부링크` heading 인식 추가 | 반영 | board app syntax/render | board/app.js 복구 |
| 21 | 모바일 메뉴 인지 부하 | P2 | 메뉴 항목이 많은 상태에서 CTA 반복이 부담 | CTA 텍스트 차별화로 인지 부하 완화 | 반영 | 모바일 렌더 확인 | top menu 복구 |
| 22 | 페이지별 검색의도 매핑 | P1 | 모든 페이지가 유사한 SEO 설명을 가짐 | routeMeta 페이지별 title/description/keywords 세분화 | 반영 | HTML head 확인 | routeMeta 복구 |
| 23 | 비공개성 페이지 색인 방지 | P0 | auth/portal/checkout은 색인 대상이 아님 | robots noindex 유지, sitemap 제외 | 반영 | sitemap/robots 확인 | sitemap 복구 |
| 24 | CTA 게시글 효율 | P1 | 글 생성 후 다음 행동 연결이 약함 | 내부링크와 CTA 목적 설명 강화 | 반영 | 샘플 body 확인 | cta-publication 복구 |
| 25 | API-UI 상태 일관성 | P1 | backend 24 topics, frontend 6 설명 | API와 UI 모두 24 기준으로 통일 | 반영 | API + UI 확인 | 관련 파일 복구 |
| 26 | 콘텐츠 중복도 완화 | P1 | FAQ/내부링크/메타 조합이 부족하면 장기 중복 가능 | FAQ 3개 + internalLinks + contentGoal 추가 | 반영 | 30개 샘플 fingerprint 확인 | cta-publication 복구 |
| 27 | 검색 결과 공유 품질 | P2 | OG/Twitter 미보강 페이지 존재 | 모든 공용 페이지에 공유 메타 주입 | 반영 | HTML head 확인 | injectSeoMeta 복구 |
| 28 | 구조화 데이터 검증성 | P2 | 제공자/사이트/페이지 관계가 약함 | @graph ID 연결 방식으로 개선 | 반영 | JSON.parse 가능 여부 | buildStructuredData 복구 |
| 29 | 배포 검증 자동화 | P1 | P147 전용 검증 스크립트 없음 | validate-phase147-smart-seo-audit.mjs 추가 | 반영 | node script 실행 | 스크립트 삭제 |
| 30 | 납품 문서화 | P1 | 변경 근거와 롤백 기준이 분산 | 작업지시서, README, validation JSON 생성 | 반영 | 파일 존재 확인 | 문서 파일 삭제 |

## 4. 파일별 수정 내역

- `server/index.mjs`
  - `ctaTopicPacks` import 추가
  - `routeMeta`를 페이지별 객체형 SEO 메타로 확장
  - `injectSeoMeta`가 기존 정적 description 존재 여부와 무관하게 관리 대상 SEO 태그를 정리 후 재주입하도록 개선
  - 구조화 데이터 `@graph` 생성
  - 상단 CTA 텍스트를 `무료 시작`으로 변경
  - `/api/public/diagnosis-engine`, `/api/public/board`가 실제 CTA 주제팩을 기준으로 variants/variantCount 반환
  - sitemap에서 noindex 성격 페이지 제거 및 중복 제거

- `server/core/cta-publication.mjs`
  - FAQ 3개 노출
  - 내부링크 섹션 추가
  - 예상 읽기 시간, contentGoal, internalLinks SEO 데이터 추가

- `apps/public/board/index.html`
  - 6가지 글 유형 설명을 24가지 SEO 글 유형 설명으로 교체
  - 게시판 빈 상태 문구와 샘플 영역 충돌 완화
  - 샘플 콘텐츠 문구를 CTA+SEO 파이프라인 중심으로 보강

- `apps/public/board/app.js`
  - 내부링크 섹션 렌더링 지원
  - searchIntent/funnelStage/primaryKeyword를 게시글 메타에 표시
  - API variantCount를 받아 상태 문구에 표시

- `scripts/validate-phase147-smart-seo-audit.mjs`
  - P147 핵심 변경 항목 자동 검증

## 5. 검증 기준

- Node 문법 검사 통과
- P147 전용 검증 스크립트 통과
- deploy precheck 통과 또는 실패 사유 명시
- ZIP 무결성 검사 통과
- 경량 패치 ZIP과 전체 프로젝트 ZIP 생성

## 6. 적용 순서

1. `nv0_full_p147.zip` 압축 해제
2. 프로젝트에 덮어쓰기
3. GitHub push 또는 Coolify 소스 업데이트
4. Coolify → Reload Compose File
5. Save
6. Redeploy
7. `/readyz`, `/`, `/board`, `/api/public/board`, `/sitemap.xml` 확인

## 7. 롤백 기준

- 배포 후 `/readyz`가 200이 아니면 P146 전체 ZIP으로 즉시 롤백
- `/board` 렌더링 오류 발생 시 `apps/public/board/*`만 P146 버전으로 복구
- SEO head 중복이 발생하면 `server/index.mjs`의 `injectSeoMeta`만 P146 버전으로 복구
- CTA 발행 오류 발생 시 `server/core/cta-publication.mjs`만 P146 버전으로 복구
