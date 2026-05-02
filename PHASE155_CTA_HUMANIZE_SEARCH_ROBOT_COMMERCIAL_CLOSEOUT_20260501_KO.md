# PHASE155 CTA 인간화·검색로봇 최적화·외부키 제외 상용화 마감 패치

## 목적

이번 P155는 nv0.kr 본제품 기준으로 외부 키값 입력이 필요한 항목을 제외하고, 코드·UI·문구·검색 수집·기존 CTA 게시글 정리까지 처리하는 최종 마감 패치입니다.

## 처리 범위

### 1. 기존 CTA 게시글 재작성/정리

새로 발행되는 글뿐 아니라, 이미 DB에 저장된 기존 CTA 게시글까지 독자 친화적인 말투로 다시 정리할 수 있는 마이그레이션 도구를 추가했습니다.

추가 스크립트:

```bash
node scripts/migrate-existing-cta-human-friendly.mjs
node scripts/migrate-existing-cta-human-friendly.mjs --apply
node scripts/validate-phase155-cta-existing-rewrite.mjs
```

기본 실행은 dry-run입니다. 실제 반영은 `--apply`를 붙여야 합니다.  
실제 반영 전에는 자동으로 백업 파일을 생성합니다.

지원 저장소:

- JSON runtime DB
- PostgreSQL `state_snapshots` 기반 저장소

### 2. CTA 발행 글 인간화

자동 발행 글을 중학생도 이해할 수 있는 쉬운 말투로 정리했습니다.

제거/완화한 표현:

- CTA
- SEO
- fingerprint
- 퍼널
- 아키타입
- 랜딩
- URL 입력
- 즉시 요약
- 메타 설명 후보

발행 글 기본 구조:

- 왜 이 글을 썼나요?
- 지금 보이는 문제
- 고객 입장에서 보면
- 바로 고칠 수 있는 것
- 문구를 쉽게 바꾸는 방법
- 자주 묻는 질문
- 다음에 할 일
- 관련 링크

### 3. 공개 화면 쉬운 말 정리

주요 공개 화면의 내부자 표현을 독자 친화적인 표현으로 바꿨습니다.

대상:

- 홈
- 무료 진단 안내
- VERIDION 데모
- 요금제
- 게시판
- 가이드
- 솔루션
- 내 사이트 관리
- 사업자 정보

### 4. 검색 로봇 수집 최적화

검색 로봇이 가장 잘 긁어갈 수 있도록 다음 조건을 보강했습니다.

- `robots.txt` 개선
- `sitemap.xml` 개선
- `feed.xml` 신규 제공
- canonical 메타 유지
- `googlebot`, `naverbot` 로봇 메타 추가
- `max-image-preview:large`
- `max-snippet:-1`
- `max-video-preview:-1`
- 공개 페이지 index/follow
- 로그인, 포털, 결제, 관리자 noindex
- 구조화 데이터 확장
  - Organization
  - WebSite
  - SearchAction
  - SoftwareApplication
  - Service
  - WebPage
  - BreadcrumbList
  - FAQPage
- sitemap `lastmod` 추가
- RSS feed에 최근 게시글 노출
- 공개 페이지 H1/title 기본 검증

### 5. 외부 키값 제외 상용화 마감

외부 키값 입력이 필요한 항목은 코드로 완료할 수 없으므로 대기 목록으로 분리했습니다.

남는 항목:

- `NV0_PORTONE_API_SECRET`
- `NV0_PORTONE_STORE_ID`
- `NV0_PORTONE_CHANNEL_KEY`
- `NV0_PORTONE_WEBHOOK_SECRET`
- `NV0_TURNSTILE_SITE_KEY`
- `NV0_TURNSTILE_SECRET`
- `NV0_SMTP_URL`
- `NV0_SCAN_PROVIDER_URL`
- `NV0_SCAN_PROVIDER_TOKEN`
- `NV0_MAIL_ORDER_REGISTRATION_NUMBER`

그 외 코드·UI·문구·검증·운영 스크립트로 처리 가능한 항목은 P155에 포함했습니다.

## 검증

통과한 핵심 검증:

```bash
node --check server/index.mjs
node --check server/core/cta-publication.mjs
node --check apps/public/board/app.js
node --check apps/public/demo/app.js
node --check apps/public/guides/app.js
node --check apps/public/home/app.js
node --check apps/public/portal/app.js
node --check apps/public/veridion-demo/app.js
node --check scripts/migrate-existing-cta-human-friendly.mjs
node --check scripts/validate-phase155-cta-existing-rewrite.mjs
node --check scripts/validate-phase155-nonkey-commercial-closeout.mjs
node --check scripts/validate-phase155-search-robot-max.mjs
node scripts/validate-phase155-cta-existing-rewrite.mjs
node scripts/validate-phase155-nonkey-commercial-closeout.mjs
node scripts/validate-phase155-search-robot-max.mjs
node scripts/validate-deploy-bundle.mjs
node scripts/check-env-examples.mjs
node scripts/check-storage-config.mjs deploy/coolify.env.bulk.txt
node scripts/check-source-syntax.mjs
npm run deploy:precheck
```

## 적용 후 기존 CTA 글 재작성 순서

배포 후 서버 컨테이너 또는 배포 환경에서 먼저 dry-run을 실행합니다.

```bash
node scripts/migrate-existing-cta-human-friendly.mjs
```

결과가 정상이고 `failures`가 비어 있으면 실제 반영합니다.

```bash
node scripts/migrate-existing-cta-human-friendly.mjs --apply
```

마지막으로 검증합니다.

```bash
node scripts/validate-phase155-cta-existing-rewrite.mjs
```

## 주의

- Postgres / Redis / runtime volume 삭제 금지
- 외부 키값은 가짜값으로 넣지 말 것
- P155 적용 후 기존 게시글 마이그레이션은 반드시 dry-run 후 apply
- 문제가 생기면 생성된 backup 파일 또는 P154 전체 ZIP으로 롤백
