# PHASE300 전체 구조 트리 — VERIDION / nv0.kr

## 1. 제품 구조 트리

```txt
VERIDION / nv0.kr
├─ 목적
│  ├─ 온라인 사업자의 공개 페이지 신뢰 공백 진단
│  ├─ 결제 전 고지, 환불, 개인정보, 문의, 약관 안내 점검
│  └─ 무료 진단 → 유료 리포트/전문가 플랜 전환
├─ 핵심 사용자
│  ├─ 소상공인·쇼핑몰 운영자
│  ├─ 마케터·웹 운영자
│  └─ 사이트 리뉴얼·광고 집행 전 점검이 필요한 대표
├─ 핵심 문제
│  ├─ 공개 페이지의 법적·운영상 안내 누락
│  ├─ 고객이 결제 전 불안해하는 정보 부족
│  ├─ 점검 결과와 실제 개선 행동의 분리
│  └─ 가격·정책·환경 설정 불일치로 인한 상용화 리스크
├─ 해결책
│  ├─ URL 기반 무료 공개 페이지 진단
│  ├─ 제한 결과와 실제 수집 결과 명확 분리
│  ├─ 기본 리포트와 전문가 플랜 상품화
│  ├─ 포털 기반 이력·결과물 관리
│  └─ 운영·배포·보안 검증 게이트
└─ 성공 기준
   ├─ 가격 정책 단일화
   ├─ 운영 환경 placeholder 차단
   ├─ 내부 final gate 통과
   ├─ 실제 nv0.kr 배포 후 live smoke 통과
   └─ 결제·환불·개인정보 고지 정합성 확보
```

## 2. 폴더 구조 트리

```txt
project-root/
├─ apps/
│  ├─ public/
│  │  ├─ home/                 # 공개 랜딩
│  │  ├─ veridion-demo/        # 무료 진단 화면
│  │  ├─ plans/                # 요금 안내
│  │  ├─ checkout/             # 결제 신청
│  │  ├─ portal/               # 내 사이트 관리
│  │  ├─ board/                # 인사이트 게시판
│  │  ├─ privacy/              # 개인정보처리방침
│  │  ├─ terms/                # 이용약관
│  │  ├─ refund/               # 환불·청약철회 정책
│  │  └─ business-info/        # 사업자·고객지원 정보
│  └─ admin/                   # 관리자 화면
├─ server/
│  ├─ index.mjs                # 메인 서버 엔트리
│  ├─ routes/                  # public/admin/payment/account/ops 라우트
│  ├─ core/                    # 진단, 결제 상태, 상품, 운영 엔진
│  ├─ infrastructure/          # PG, persistence, redis, storage, security
│  ├─ middleware/              # 보안 미들웨어
│  ├─ services/                # 관측성 등 서비스 계층
│  └─ config/                  # 환경 설정/검증
├─ shared/
│  ├─ product-catalog.mjs      # Phase300 가격 단일 소스
│  ├─ html.js                  # 안전 렌더링 유틸
│  └─ *.css / *.js             # 공통 UI/런타임 스크립트
├─ scripts/
│  ├─ validate-price-catalog.mjs
│  ├─ validate-phase300-production-readiness.mjs
│  ├─ check-storage-config.mjs
│  ├─ validate-prod-env.mjs
│  └─ 기존 phase 검증 스크립트
├─ deploy/
│  ├─ env.production.nv0.kr.example       # 실제 운영자가 채워야 하는 템플릿
│  ├─ env.production.nv0.kr.ci-check.env  # 비밀값 없는 CI 검증용 production-shape env
│  └─ docker-compose*.yml
├─ runtime/
│  ├─ data/db.seed.json
│  ├─ data/db.json             # seed와 동일한 깨끗한 릴리스 상태
│  └─ data/sessions.json       # 빈 배열
├─ docs/
│  ├─ PHASE300_STRUCTURE_TREE.md
│  ├─ PHASE300_WORK_ORDER.md
│  ├─ PHASE300_PRODUCTION_READINESS_REPORT.md
│  └─ current/                 # 검증 결과 JSON
├─ tests/
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
├─ README.md
└─ RUN_ALL_TESTS.sh
```

## 3. 기능 구조 트리

```txt
MVP
├─ URL 입력 무료 진단
├─ 공개 페이지 접근 확인
├─ 위험 항목 요약
├─ 요금 안내
└─ 결제 신청 시작

실사용형
├─ 결과 요약/상세 표시
├─ 내 사이트 포털
├─ 인사이트 게시판
├─ 체크아웃 상품 선택
├─ 주문·결제 상태 관리
├─ 환불·약관·개인정보 고지
└─ fallback 결과 고지

상용화형
├─ 가격 카탈로그 단일화
├─ PG 제공자 PortOne v2 연동 구조
├─ Postgres/Redis/S3 운영 모드
├─ 환경변수 검증
├─ 보안 헤더/관리자 RBAC
├─ 백업/복구/롤백 게이트
├─ 운영 매트릭스
├─ live smoke 검증
└─ 릴리스 문서/검수표
```

## 4. 데이터 구조 트리

```txt
DB seed
├─ settings
│  ├─ businessProfile
│  ├─ paymentProviderMode
│  ├─ scanProviderMode
│  └─ retention/refund settings
├─ orders
├─ subscriptions
├─ scans
├─ sites
├─ paymentSessions
├─ paymentEvents
├─ guidanceDocuments
├─ publications / boards
├─ customers / customerSessions
└─ auditLogs

ProductCatalog
├─ Free
├─ Report
│  ├─ price: 49000
│  ├─ period: 1회
│  └─ billingType: one_time
└─ Expert
   ├─ price: 149000
   ├─ period: 월
   └─ billingType: subscription

ScanResult
├─ provider
├─ resultStatus
│  ├─ completed_live_fetch
│  ├─ completed_limited_fallback
│  ├─ completed_external_provider
│  └─ completed_live_fetch_after_provider_error
├─ resultLimitNotice
├─ fetched / fetchStatus / fetchError
├─ evidenceSummary
├─ scoreModel
├─ detailFindings
└─ qualityAssurance
```

## 5. API 구조 트리

```txt
/api/public
├─ GET  /config
├─ GET  /products
├─ GET  /plans
├─ POST /scan
├─ POST /diagnose
├─ POST /checkout-session
├─ POST /payment/complete
├─ GET  /payment/config
├─ GET  /fulfillment
├─ GET  /portal-summary
├─ GET  /board
└─ GET  /document-preview

/admin
├─ /console
├─ /orders
├─ /publications
├─ /library
├─ /settings
└─ /diagnostics

Health
├─ /healthz
└─ /readyz
```

## 6. 테스트 구조 트리

```txt
검증 게이트
├─ check:syntax
├─ check:ast-placeholder
├─ check:content-completeness
├─ check:data-integrity
├─ test / test:e2e
├─ check:pages / test:routes / check:links
├─ smoke
├─ check:commercial-flow
├─ check:storage-config
├─ validate:env:ci
├─ validate:price-catalog
├─ verify:prod
├─ verify:security
├─ validate:deploy
├─ ops:production-matrix
├─ validate:phase299
└─ validate:phase300
```

## 7. 배포 구조 트리

```txt
local
├─ npm start
├─ PORT=3210 node server/index.mjs
└─ local runtime json

staging / prelaunch
├─ NV0_DEPLOYMENT_STAGE=prelaunch
├─ NV0_PAYMENT_PROVIDER=disabled
├─ 외부 스캔 제공자 연결
├─ Postgres/Redis/S3 연결
└─ live smoke + 결제 비활성 상태 검증

production / commercial_launch
├─ NV0_COMMERCIAL_LAUNCH_READY=true
├─ NV0_PAYMENT_PROVIDER=portone_v2
├─ PortOne webhook strict
├─ SMTP/R2/Postgres/Redis real secret 적용
├─ CDN/cache purge
├─ NV0_BASE_URL=https://www.nv0.kr npm run verify:prod
└─ 장애 시 previous image rollback
```
