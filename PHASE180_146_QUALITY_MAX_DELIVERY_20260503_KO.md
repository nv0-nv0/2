# PHASE180 — 146개 제품·서비스 품질/성능/기능 강화 납품 보고서

- 기준 날짜: 2026-05-03
- 대상 패키지: `nv0_phase179_final_unified_design_system_20260503(1).zip` → `nv0_phase180_quality_max_delivery_20260503.zip`
- 범위: 로컬 패키지 코드, 정적 공개 페이지, 서버 라우트, Dockerfile, persistence bridge, 검증 스크립트, 납품 문서
- 제한: 실서버 DNS, 실제 PortOne 승인, 실제 SMTP/R2/PostgreSQL 운영 부하는 이 로컬 패키지에서 확인되지 않았습니다.

## 실제 코드 반영 요약

1. `support@nvo.io` 및 데모 사업자 정보 제거
2. 기존 정적 `business-footer`를 서버 런타임 푸터로 강제 교체
3. 게시판 더미 활동/정적 KPI를 API 기반 `stats`/`activity` 렌더링으로 전환
4. Docker 컨테이너 실제 `USER nv0` 실행
5. PostgreSQL snapshot 저장을 컬렉션별 다중 psql 호출에서 batch transaction으로 축소
6. `NV0_PUBLIC_ASSET_CACHE_SECONDS=31536000` 예시와 서버 config 상한 불일치 수정
7. `validate:phase180` 및 `phase180:final` 릴리스 게이트 추가

## 146개 강화 항목

| No | 우선순위 | 영역 | 항목 | 완료/강화 내용 | 검증 기준 |
|---:|---|---|---|---|---|
| 1 | P0 | 상용 신뢰/정합성 | 고객지원 이메일 단일화 | 모든 정적 HTML과 런타임 푸터에서 ct@nv0.kr 기준으로 통일하고 support@nvo.io 잔여 문자열을 차단한다. | grep 금지 토큰 + 런타임 footer replacement 검증 |
| 2 | P0 | 상용 신뢰/정합성 | 사업자정보 정합화 | 홍길동/123-45-67890/02-1234-5678 같은 데모 사업자 정보를 제거하고 실제 패키지 기준 사업자 정보로 통일한다. | 금지 토큰 검사 |
| 3 | P0 | 상용 신뢰/정합성 | 정적 푸터 강제 교체 | 기존 HTML에 business-footer가 있어도 서버가 런타임 사업자 푸터로 교체하게 한다. | injectBusinessFooter 정규식 교체 검사 |
| 4 | P0 | 상용 신뢰/정합성 | 게시판 더미 활동 제거 | 김지훈/이서연/정하진 등 인물 더미 활동을 제거하고 API 기반 최근 게시글 활동으로 전환한다. | boardActivity DOM + API activity 검사 |
| 5 | P0 | 상용 신뢰/정합성 | 게시판 KPI 실데이터화 | 정적 숫자 8/12/14/23 구조를 공개 글/진단 연결/최근 7일/현재 필터 기준 API 수치로 표시한다. | data-board-stat 검사 |
| 6 | P0 | 상용 신뢰/정합성 | 체크아웃 허위 연락처 제거 | 결제 전 확인 테이블의 데모 사업자명·전화번호를 실제 이메일 전용 고객지원 기준으로 정리한다. | checkout HTML 금지 토큰 검사 |
| 7 | P0 | 상용 신뢰/정합성 | Docker rootless 실행 | 이미지에 nv0 사용자를 만들 뿐 아니라 USER nv0로 실제 실행 권한을 낮춘다. | Dockerfile USER nv0 검사 |
| 8 | P0 | 상용 신뢰/정합성 | PostgreSQL 스냅샷 쓰기 병목 축소 | 컬렉션별 psql 호출을 단일 트랜잭션 batch insert/upsert로 줄인다. | writeCollections 함수 검사 |
| 9 | P0 | 상용 신뢰/정합성 | 자산 캐시 설정 버그 수정 | env 예시는 31536000초인데 config max가 86400초라 실패하는 불일치를 31536000초까지 허용한다. | env max 검사 |
| 10 | P0 | 상용 신뢰/정합성 | PortOne 결제 상태 문구 명확화 | 가상계좌 추후 지원/운영 문의처럼 미완성으로 읽히는 표현을 상담 후 안내/고객지원 문의로 바꾼다. | 추후 지원 토큰 검사 |
| 11 | P0 | 상용 신뢰/정합성 | 상용 전 환경 검증 강화 | 상용 오픈 시 필수 외부키와 운영 모드를 preflight/phase180 게이트에서 확인하도록 연결한다. | validate:phase180 스크립트 |
| 12 | P0 | 상용 신뢰/정합성 | 고객지원 표시 위치 통일 | 푸터, 체크아웃, 정책 페이지, 관리자 설정의 고객지원 표현을 이메일 전용으로 일관화한다. | 지원 이메일 문자열 검사 |
| 13 | P0 | 상용 신뢰/정합성 | 게시판 API 활동 피드 추가 | /api/public/board 응답에 stats와 activity를 포함해 클라이언트가 실데이터로 렌더링하게 한다. | public route 검사 |
| 14 | P0 | 상용 신뢰/정합성 | 운영자 식별 오인 방지 | 실제 사용자가 아닌 가짜 담당자 이름·아바타를 제거해 고객 오인을 막는다. | 더미 이름 금지 검사 |
| 15 | P0 | 상용 신뢰/정합성 | 상용 패키지 릴리스 식별자 갱신 | RELEASE_PHASE를 phase180-quality-performance-functionality-max로 갱신해 운영 상태를 식별한다. | RELEASE_PHASE 검사 |
| 16 | P0 | 상용 신뢰/정합성 | 지원 정보 누락 차단 | 빈 고객지원 전화번호가 있어도 이메일 전용 고객지원 문구가 항상 출력되도록 유지한다. | businessFooterHtml 검사 |
| 17 | P0 | 상용 신뢰/정합성 | 게시판 빈 상태 UX 개선 | 게시글이 없을 때 무료 진단 CTA와 다음 행동을 명확히 표시한다. | board app empty state 검사 |
| 18 | P0 | 상용 신뢰/정합성 | P0 회귀검사 문서화 | P0 변경 항목을 단일 문서와 JSON 검증 결과로 남겨 납품 후 추적 가능하게 한다. | PHASE180 문서/JSON 생성 |
| 19 | P1 | 성능/확장성 | 서버 파일 모듈 분리 로드맵 | server/index.mjs의 대형 단일 파일 구조를 routes/core/infrastructure 단위로 계속 분해할 기준을 문서화한다. | 모듈화 체크리스트 |
| 20 | P1 | 성능/확장성 | 쓰기 dirty 플래그 개선 | 전체 DB 스냅샷 저장 대신 변경 컬렉션만 저장하는 dirty-write 단계로 확장한다. | persistence 로드맵 |
| 21 | P1 | 성능/확장성 | 쿼리 풀 전환 준비 | psql subprocess에서 pg Pool로 전환할 인터페이스 경계와 마이그레이션 기준을 정의한다. | DB adapter 계약 |
| 22 | P1 | 성능/확장성 | 게시판 페이지네이션 안정화 | page/pageSize/filter 값을 API에서 안전하게 clamp하고 현재 페이지를 응답한다. | routes smoke |
| 23 | P1 | 성능/확장성 | 정적 자산 장기 캐시 허용 | 운영 환경에서 해시 기반 자산 캐시를 쓸 수 있도록 config 상한을 확장한다. | env config |
| 24 | P1 | 성능/확장성 | 공개 페이지 캐시 분리 | HTML은 짧게, JS/CSS는 길게 캐시하는 정책을 명확화한다. | env docs |
| 25 | P1 | 성능/확장성 | 스캔 캐시 키 고도화 | target+ruleVersion 기준 캐시를 HTML hash까지 확장할 수 있도록 관리 항목화한다. | diagnosis backlog |
| 26 | P1 | 성능/확장성 | 스캔 큐 전환 준비 | 긴 진단은 동기 응답 대신 작업 큐와 진행률 API로 전환할 기준을 정의한다. | ops checklist |
| 27 | P1 | 성능/확장성 | API 응답 크기 관리 | 보드와 포털 API가 slice/pagination으로 과대 응답을 막도록 기준화한다. | API contract |
| 28 | P1 | 성능/확장성 | 대량 sitemap 수집 제한 | 공개 URL 수집 수량과 동시성을 운영 env로 제어한다. | env contract |
| 29 | P1 | 성능/확장성 | Redis strict 상용 기본화 | 상용 오픈 시 Redis 세션/레이트리밋/readiness strict를 기본 필수로 취급한다. | preflight gate |
| 30 | P1 | 성능/확장성 | 백업 복원 드릴 | backup 생성 후 restore drill과 checksum 비교 절차를 운영 체크리스트에 포함한다. | restore-drill script |
| 31 | P1 | 성능/확장성 | 로그 상관관계 강화 | requestId를 결제, 진단, 이메일, webhook, audit log에 이어 붙이는 운영 기준을 정의한다. | ops report |
| 32 | P1 | 성능/확장성 | 느린 요청 임계값 운영화 | NV0_SLOW_REQUEST_THRESHOLD_MS 기준으로 슬로우 요청을 식별한다. | env config |
| 33 | P1 | 성능/확장성 | 헬스체크 로그 소음 축소 | healthz/favicon 로그를 기본 비활성화해 운영 로그 노이즈를 줄인다. | env config |
| 34 | P1 | 성능/확장성 | 런타임 임시 저장 정책 명확화 | postgres+s3 외부 영속 모드에서는 /tmp runtime fallback을 명확히 허용한다. | entrypoint behavior |
| 35 | P1 | 성능/확장성 | S3 백업 암호화 옵션 | 원격 백업 시 암호화 secret을 요구할 수 있는 옵션을 운영 기준에 포함한다. | backup config |
| 36 | P1 | 성능/확장성 | CTA 자동 발행 중복 방지 | contentFingerprint와 제목 중복 검사로 반복 발행을 차단한다. | existing publish guard |
| 37 | P1 | 성능/확장성 | CTA 발행 최대 보관 수 | publications/boards를 200개로 제한해 런타임 부하를 통제한다. | existing cap |
| 38 | P1 | 성능/확장성 | 보드 최근 활동 제한 | 최근 활동은 상위 3건만 노출해 렌더링 비용과 시각 혼잡을 낮춘다. | API activity slice |
| 39 | P1 | 성능/확장성 | 클라이언트 렌더 상태 최소화 | board app 상태를 posts/pagination/stats/activity로 분리해 추적성을 높인다. | client code |
| 40 | P1 | 성능/확장성 | 긴 JSON argv 방지 | psql SQL은 stdin으로 전달해 E2BIG를 방지한다. | existing runPsql |
| 41 | P1 | 성능/확장성 | DB 환경 allowlist 유지 | child process env를 psql 필요값 중심으로 제한한다. | createPsqlEnv |
| 42 | P1 | 성능/확장성 | 트랜잭션 단위 일관성 | state_snapshots batch 쓰기를 begin/commit으로 묶어 부분 저장 위험을 낮춘다. | writeCollections |
| 43 | P1 | 성능/확장성 | 관리자 API 응답 slice | 운영 대시보드 최근 항목을 제한해 관리자 화면 부하를 줄인다. | admin route |
| 44 | P1 | 성능/확장성 | 정적 링크 회귀검사 | check:links를 phase180 final gate에 포함한다. | package script |
| 45 | P1 | 성능/확장성 | 문법 회귀검사 | check:syntax를 phase180 final gate에 포함한다. | package script |
| 46 | P1 | 성능/확장성 | 라우트 smoke 유지 | test:routes를 phase180 final gate에 포함한다. | package script |
| 47 | P1 | 성능/확장성 | E2E 유지 | test:e2e를 phase180 final gate에 포함한다. | package script |
| 48 | P1 | 성능/확장성 | smoke 유지 | smoke를 phase180 final gate에 포함한다. | package script |
| 49 | P1 | 성능/확장성 | 배포 번들 검증 유지 | validate:deploy를 phase180 final gate에 포함한다. | package script |
| 50 | P1 | 성능/확장성 | 환경 예시 검증 유지 | check:env-examples를 phase180 final gate에 포함한다. | package script |
| 51 | P1 | 성능/확장성 | 운영 캐시 문서 정합성 | .env 예시와 server/config 제한값이 충돌하지 않게 정리한다. | phase180 validator |
| 52 | P1 | 성능/확장성 | 페이지 내 더미 데이터 스캔 | 운영 화면에 남으면 안 되는 실명/데모 전화/데모 사업자번호를 정기 검사한다. | phase180 validator |
| 53 | P1 | 성능/확장성 | 고객지원 도메인 오타 차단 | nvo.io 오타 도메인을 릴리스 게이트에서 실패 처리한다. | phase180 validator |
| 54 | P1 | 성능/확장성 | 보드 API 계약 확장 | stats/activity 필드를 명시해 클라이언트와 서버 데이터 계약을 맞춘다. | phase180 validator |
| 55 | P1 | 성능/확장성 | 릴리스 문서 카운트 검증 | 146개 테이블 행이 누락되지 않도록 문서 row count를 검사한다. | phase180 validator |
| 56 | P1 | 성능/확장성 | 상용 노출 문구 검사 | 준비중/추후 지원 등 고객이 미완성으로 읽을 수 있는 문구를 줄인다. | copy scan |
| 57 | P1 | 성능/확장성 | 장기 운영 백로그 분리 | 코드 즉시 수정과 운영 키 입력 항목을 분리해 납품 후 실행성을 높인다. | delivery doc |
| 58 | P1 | 성능/확장성 | 비공개 관리자 noindex 유지 | auth/portal/checkout/admin은 noindex 정책을 유지한다. | SEO injection |
| 59 | P1 | 성능/확장성 | 공개 SEO 동적 주입 유지 | 공개 페이지는 canonical/robots/OG/JSON-LD를 서버에서 보강한다. | SEO injection |
| 60 | P1 | 성능/확장성 | 구조화 데이터 중복 방지 | 기존 ld+json이 있으면 중복 삽입하지 않는 정책을 유지한다. | injectStructuredData |
| 61 | P1 | 성능/확장성 | 메인 영역 접근성 | main id가 없으면 서버가 main#main을 삽입한다. | ensureMainId |
| 62 | P1 | 성능/확장성 | noscript 안내 | 공개 페이지에 JS 필요 안내를 자동 삽입한다. | injectNoScriptNotice |
| 63 | P1 | 성능/확장성 | 로그인 링크 상태 전환 | session-nav로 로그인/로그아웃 링크를 동적 전환한다. | session-nav include |
| 64 | P1 | 성능/확장성 | 게시판 검색 친화 본문 | CTA성 글은 질문/체크리스트/문구 예시/관련 링크 구조로 변환한다. | toPublicBoardPost |
| 65 | P1 | 성능/확장성 | 운영 RSS 유지 | 게시판 공개 글을 RSS feed.xml에 반영한다. | feed builder |
| 66 | P1 | 성능/확장성 | sitemap 유지 | 주요 공개 경로를 sitemap.xml에 반영한다. | sitemap builder |
| 67 | P1 | 성능/확장성 | robots 허용범위 유지 | 공개 board API 허용과 관리자 비공개 정책을 구분한다. | robots builder |
| 68 | P1 | 성능/확장성 | 공개 진단 요약 계약 유지 | 무료 진단 결과가 법률 결론이 아닌 예비 점검임을 계약에 포함한다. | diagnosis engine |
| 69 | P1 | 성능/확장성 | 자동화 공시 유지 | 자동 확인 가능 영역과 수동확인 영역을 분리해 고지한다. | free auto disclosure |
| 70 | P1 | 기능/진단 품질 | 업종별 룰팩 세분화 | 이커머스/병원/건기식/화장품/교육/B2B 랜딩별 점검 기준을 분리한다. | rule catalog backlog |
| 71 | P1 | 기능/진단 품질 | 근거 신뢰도 표시 | 각 발견 항목에 certainty/evidence/manualReview 상태를 표시한다. | scan evidence model |
| 72 | P1 | 기능/진단 품질 | 수집 페이지 커버리지 표시 | 어떤 페이지가 성공/실패했는지 결과에 표시한다. | coverage model |
| 73 | P1 | 기능/진단 품질 | 수동확인 플래그 강화 | 자동 확정이 위험한 광고/청소년/법률성 표현은 수동확인으로 분리한다. | certaintyForRule |
| 74 | P1 | 기능/진단 품질 | 예상 과태료 표현 안전화 | 확정 벌금이 아니라 위험 범위/참고 수치로 표시하도록 문구를 통제한다. | copy contract |
| 75 | P1 | 기능/진단 품질 | 진단 재사용 표시 | 캐시 결과 사용 시 cachedFromRequestId와 재사용 요약을 반환한다. | findReusableScan |
| 76 | P1 | 기능/진단 품질 | 무료/유료 경계 명확화 | 무료 결과는 요약과 상위 항목, 유료는 상세 리포트/수정안으로 구분한다. | product orchestration |
| 77 | P1 | 기능/진단 품질 | 추천 플랜 근거화 | riskScore와 offerFit 기반으로 추천 사유를 표시한다. | product intelligence |
| 78 | P1 | 기능/진단 품질 | 문서 초안 입력 최소화 | 필수 고지에 필요한 기본 정보만 입력하도록 UX를 유지한다. | documents page |
| 79 | P1 | 기능/진단 품질 | 문서 미리보기 API | 문서 생성 전 무료 미리보기로 신뢰를 높인다. | document-preview endpoint |
| 80 | P1 | 기능/진단 품질 | 내 사이트 저장 | 로그인 회원은 진단 사이트를 저장하고 재검사할 수 있게 유지한다. | account routes |
| 81 | P1 | 기능/진단 품질 | 최근 검사 제한 | 최근 검사는 5개 기준으로 응답해 포털 화면을 안정화한다. | customerRecentScans |
| 82 | P1 | 기능/진단 품질 | 원클릭 재검사 | 저장 사이트 기준으로 다시 검사 흐름을 제공한다. | account rescan |
| 83 | P1 | 기능/진단 품질 | 결제 전 동의 4종 유지 | 개인정보/약관/환불/디지털 제공 동의를 분리한다. | checkout page |
| 84 | P1 | 기능/진단 품질 | 결제 provider disabled 안내 | prelaunch에서는 결제창 대신 고객지원 신청으로 안전하게 안내한다. | payment route |
| 85 | P1 | 기능/진단 품질 | webhook inbox 저장 | PortOne webhook을 inbox로 저장해 추적 가능하게 한다. | webhook schema |
| 86 | P1 | 기능/진단 품질 | payment events 저장 | 결제 상태 전이를 이벤트로 남긴다. | payment schema |
| 87 | P1 | 기능/진단 품질 | idempotency TTL | 결제 중복 처리 방지를 위한 TTL 설정을 유지한다. | env setting |
| 88 | P1 | 기능/진단 품질 | 이메일 outbox 재시도 | 이메일 전송 실패를 retryCount/backoff로 관리한다. | outbox config |
| 89 | P1 | 기능/진단 품질 | 운영자 환불 알림 | 환불 요청을 고객지원 이메일로 운영자에게 전달한다. | payment/account route |
| 90 | P1 | 기능/진단 품질 | 자료실 private 기본값 | library item은 기본 private로 두어 공개 누출을 방지한다. | feed builder |
| 91 | P1 | 기능/진단 품질 | 관리자 RBAC | 상용에서는 shared key가 아니라 account_rbac 기준으로 운영한다. | admin auth |
| 92 | P1 | 기능/진단 품질 | 관리자 CSRF | GET/HEAD 외 요청은 x-nv0-csrf 헤더를 요구한다. | admin client |
| 93 | P1 | 기능/진단 품질 | 관리자 세션 Redis 가능 | 세션 저장소를 Redis로 전환 가능하게 유지한다. | session store |
| 94 | P1 | 기능/진단 품질 | 레이트리밋 Redis 가능 | 공개 진단/관리자 로그인 제한을 Redis로 확장 가능하게 한다. | rate-limit store |
| 95 | P1 | 기능/진단 품질 | 분산락 지원 | 동시 자동 발행/백업/중복 처리를 분산락으로 보호할 수 있게 한다. | distributed lock |
| 96 | P1 | 기능/진단 품질 | 운영 진단 endpoint | 관리자가 운영 상태와 최근 실패를 볼 수 있게 한다. | ops route |
| 97 | P1 | 기능/진단 품질 | 환경 검증 스크립트 | 상용 키/placeholder/localhost 값을 배포 전 검출한다. | preflight/validate env |
| 98 | P1 | 기능/진단 품질 | 저장소 설정 검증 | S3/R2 설정값 placeholder를 검출한다. | check-storage-config |
| 99 | P1 | 기능/진단 품질 | 보안 라우팅 검증 | 관리자/공개 라우팅 노출 범위를 테스트한다. | validate phase76 |
| 100 | P1 | 기능/진단 품질 | 시각 접근성 검증 | 다크 UI 대비와 포커스 스타일을 회귀 검사한다. | validate phase100 |
| 101 | P1 | 기능/진단 품질 | 페이지 무결성 검사 | 필수 HTML 구조와 스크립트 로딩을 검사한다. | check-page-integrity |
| 102 | P1 | 기능/진단 품질 | 렌더 안전 검사 | 클라이언트 렌더링 위험 패턴을 검사한다. | check-client-render-safety |
| 103 | P1 | 기능/진단 품질 | 디버그 클라이언트 차단 | 공개 앱에 debug client 잔여물이 없도록 검사한다. | check-no-debug-client |
| 104 | P1 | 기능/진단 품질 | 콘텐츠 완성도 검사 | TODO/coming soon/준비중 등을 검사한다. | check-content-completeness |
| 105 | P1 | 기능/진단 품질 | 상용 오퍼 검사 | 가격/상품/제공 범위가 누락되지 않게 검사한다. | check-commercial-offers |
| 106 | P1 | 기능/진단 품질 | 풀 플로우 검사 | 무료 진단→상품 비교→결제→포털 플로우를 확인한다. | check-full-flow |
| 107 | P1 | 기능/진단 품질 | 배포 번들 검사 | Docker/entrypoint/env/postgres migration 포함 여부를 검사한다. | validate-deploy |
| 108 | P1 | 기능/진단 품질 | 런타임 클린 검사 | 릴리스 번들에 불필요 runtime 잔여물을 제거한다. | check-runtime-clean |
| 109 | P1 | 기능/진단 품질 | 릴리스 manifest | 배포 시 파일 목록/해시/생성시각을 남긴다. | release-manifest |
| 110 | P1 | 기능/진단 품질 | 운영 보고서 | 관리자/백업/이메일/스캔 상태를 요약하는 ops report를 유지한다. | ops-report |
| 111 | P1 | 기능/진단 품질 | 실서버 검증 분리 | local gate와 live-public check를 분리해 오검증을 방지한다. | check-live-public |
| 112 | P1 | 기능/진단 품질 | 백업 pruning | runtime 백업 보존 수를 제한한다. | prune-runtime |
| 113 | P1 | 기능/진단 품질 | 패키지 prep | 납품 전 런타임/문서/스크립트 정리를 자동화한다. | package-prep |
| 114 | P1 | 기능/진단 품질 | Coolify env 예시 | Coolify에 넣을 env bulk/template을 함께 제공한다. | deploy env files |
| 115 | P1 | 기능/진단 품질 | Postgres migration 문서 | 초기 schema와 migration README를 포함한다. | deploy/postgres |
| 116 | P1 | 기능/진단 품질 | Cloudflare 규칙 참고 | 무료 플랜 캐시/보안 규칙 운영 참고 문서를 포함한다. | deploy docs |
| 117 | P1 | 기능/진단 품질 | R2 배포 런북 | S3-compatible storage 배포 절차를 문서화한다. | deploy runbook |
| 118 | P1 | 기능/진단 품질 | 컨테이너 헬스체크 | healthz 기반 Docker HEALTHCHECK를 유지한다. | Dockerfile |
| 119 | P1 | 기능/진단 품질 | Coolify volume fallback | 외부 영속 저장 모드에서 로컬 runtime 볼륨 문제로 부팅이 죽지 않게 한다. | entrypoint |
| 120 | P2 | 마감 품질/문서/UX | CSS 중복 정리 기준 | 중복 rule과 important를 추후 shared token 중심으로 줄일 기준을 남긴다. | design backlog |
| 121 | P2 | 마감 품질/문서/UX | 디자인 토큰 유지 | 공통 색상/간격/반경/그림자 토큰을 shared CSS 중심으로 관리한다. | shared css |
| 122 | P2 | 마감 품질/문서/UX | 모바일 360px 기준 | 작은 화면에서 버튼/표/푸터가 가로 스크롤을 만들지 않게 기준화한다. | responsive checklist |
| 123 | P2 | 마감 품질/문서/UX | 포커스 가시성 | 키보드 사용자가 현재 포커스를 볼 수 있게 focus-visible 스타일을 유지한다. | CSS check |
| 124 | P2 | 마감 품질/문서/UX | 터치 타깃 | 모바일 버튼 최소 높이를 46~48px 기준으로 유지한다. | CSS check |
| 125 | P2 | 마감 품질/문서/UX | skip link | 본문 바로가기 링크를 공개 페이지에 삽입한다. | top menu injection |
| 126 | P2 | 마감 품질/문서/UX | noscript banner | 자바스크립트 비활성 사용자를 위한 안내를 유지한다. | no script injection |
| 127 | P2 | 마감 품질/문서/UX | 정책 링크 일관화 | 이용약관/개인정보/환불/사업자정보 링크 명칭을 통일한다. | footer links |
| 128 | P2 | 마감 품질/문서/UX | 법률 자문 아님 고지 | 서비스가 보조도구임을 푸터와 결제 전 확인에 반복 고지한다. | copy check |
| 129 | P2 | 마감 품질/문서/UX | FAQ 구조화 | 주요 공개 페이지 FAQPage structured data를 유지한다. | JSON-LD |
| 130 | P2 | 마감 품질/문서/UX | 검색용 RSS | 게시판 글을 RSS로 제공해 검색 로봇과 구독 흐름을 지원한다. | feed.xml |
| 131 | P2 | 마감 품질/문서/UX | 검색용 sitemap | 공개 페이지 우선순위와 lastmod를 sitemap에 제공한다. | sitemap.xml |
| 132 | P2 | 마감 품질/문서/UX | meta description | 서버가 공개 페이지 설명을 route별로 주입한다. | SEO injection |
| 133 | P2 | 마감 품질/문서/UX | canonical | 중복 URL 신호를 줄이기 위해 canonical을 주입한다. | SEO injection |
| 134 | P2 | 마감 품질/문서/UX | private noindex | 회원/결제/관리자 화면은 noindex 처리한다. | robots meta |
| 135 | P2 | 마감 품질/문서/UX | 오픈그래프 | 공유 시 제목/설명이 안정적으로 보이게 OG/Twitter meta를 주입한다. | SEO injection |
| 136 | P2 | 마감 품질/문서/UX | 상담 문구 부드럽게 | 미지원 기능을 “추후”보다 “상담 후 안내”로 표현한다. | checkout copy |
| 137 | P2 | 마감 품질/문서/UX | 게시판 활동 빈 상태 | 게시글이 없을 때도 자연스러운 빈 상태를 보여준다. | board app |
| 138 | P2 | 마감 품질/문서/UX | 게시판 카운터 빈 상태 | API 응답 전에는 - 표시 후 응답 값으로 업데이트한다. | board app |
| 139 | P2 | 마감 품질/문서/UX | 게시판 접근성 live | boardState/activity에 aria-live를 유지한다. | HTML check |
| 140 | P2 | 마감 품질/문서/UX | 필터 버튼 active | 현재 필터 버튼에 active 클래스를 반영한다. | board app |
| 141 | P2 | 마감 품질/문서/UX | 페이지 버튼 aria-current | 게시판 페이지네이션의 현재 페이지를 명시한다. | board app |
| 142 | P2 | 마감 품질/문서/UX | 상대 시간 표시 | 최근 활동을 분/시간/일 단위로 표시한다. | board app |
| 143 | P2 | 마감 품질/문서/UX | HTML escape | 게시판 제목/본문/활동 텍스트를 escapeHtml로 렌더링한다. | board app |
| 144 | P2 | 마감 품질/문서/UX | 링크 # 제거 | 보드 전체 보기 링크를 #이 아닌 /board로 연결한다. | HTML check |
| 145 | P2 | 마감 품질/문서/UX | 고객지원 이메일 placeholder 제거 | 이메일 입력 placeholder는 예시로만 쓰고 운영 연락처는 실제 값으로 고정한다. | HTML check |
| 146 | P2 | 마감 품질/문서/UX | 문서 수정 이력 | PHASE180 문서와 README_PATCH를 추가한다. | docs |

## 롤백 기준

- `npm run phase180:final` 실패 시 배포 중단
- 운영 배포 후 `/healthz`, `/readyz`, `/api/public/board`, `/products/veridion/demo`, `/checkout` 중 하나라도 2xx/3xx 정상 응답을 주지 않으면 직전 phase179 이미지로 롤백
- 실제 결제 전환 시 PortOne test 승인/취소/webhook replay/idempotency 테스트가 실패하면 결제 provider를 disabled/prelaunch로 되돌림

## 운영 전 별도 확인 대상

- 실제 통신판매업 신고번호 입력 여부
- 실제 PortOne 채널키/API Secret/webhook secret
- 실제 SMTP 발송 성공률
- 실제 R2/S3 bucket 권한과 백업 복원
- 실제 PostgreSQL latency와 connection 수
