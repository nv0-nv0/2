# ENGINE / AGENT Assignment Matrix

Version: `phase286-engine-agent-orchestrator-v1.0.0`

## Summary

- Engines: 11
- Agents: 12
- Domains: site-intake, diagnosis, risk-score, portal-ui, fulfillment, plans-checkout, content-publication, payment, security, release, ops
- Assignment status: optimized

## Engine Assignments

| Engine | Domain | Owner Agent | Runtime File | Responsibility |
|---|---|---|---|---|
| `site-intake-normalization-engine` | site-intake | `site-registration-agent` | `apps/public/portal/app.js` | 사이트 URL·이름·메모 입력을 정규화하고 저장 사이트 관리 흐름에 연결 |
| `scan-evidence-engine` | diagnosis | `scan-quality-agent` | `server/core/scan-evidence-model.mjs` | 무료 진단의 증거 요약·점수 모델·발견 항목을 구성 |
| `risk-scoring-engine` | risk-score | `scan-quality-agent` | `server/core/product-quality-engine.mjs` | 상용화 기준 위험도와 진단 정확도 프로필을 계산 |
| `portal-dashboard-ux-engine` | portal-ui | `visual-readability-agent` | `shared/portal-phase283-dashboard.css` | 내 사이트 대시보드·인포그래픽·사이드바·점수 게이지 UI를 제공 |
| `report-asset-engine` | fulfillment | `checkout-delivery-agent` | `server/core/premium-asset-builder.mjs` | 기본/전문가 리포트와 PDF 산출물을 구성 |
| `product-offer-engine` | plans-checkout | `offer-routing-agent` | `server/core/product-intelligence.mjs` | 진단 점수와 사이트 상태를 요금제·체크아웃·리포트 추천에 연결 |
| `insight-publication-engine` | content-publication | `autopublish-scheduler-agent` | `server/core/product-agent-suite.mjs` | 제품 맥락 기반 인사이트를 생성하고 20분 자동 발행을 수행 |
| `payment-fulfillment-engine` | payment | `checkout-delivery-agent` | `server/routes/payment.mjs` | 주문·결제·상태 전이·산출물 제공 흐름을 처리 |
| `security-compliance-engine` | security | `security-gate-agent` | `server/middleware/security.mjs` | 보안 헤더·CSRF·접근 토큰·민감 기록 보관 구조를 관리 |
| `release-structure-engine` | release | `release-audit-agent` | `scripts/generate-structure-tree.mjs` | 구조 트리·상용화 감사·패키지 무결성 검증을 수행 |
| `observability-readiness-engine` | ops | `recovery-agent` | `server/services/observability.mjs` | 상태 점검·운영 리포트·장애 분류를 담당 |

## Agent Assignments

| Agent | Assigned Engine | Trigger | Duty |
|---|---|---|---|
| `site-registration-agent` | `site-intake-normalization-engine` | portal form submit / account routes | 사이트 등록·삭제·재검사 요청을 계정 상태와 연결 |
| `scan-quality-agent` | `scan-evidence-engine` | public diagnosis / rescan | 진단 결과의 발견 항목·점수·우선순위를 검수 |
| `visual-readability-agent` | `portal-dashboard-ux-engine` | portal render | 숫자·게이지·카드·상태 배너의 시인성과 겹침 방지 기준을 유지 |
| `report-quality-agent` | `report-asset-engine` | fulfillment create / download | 리포트 구성·PDF 제공·구매 산출물 표시를 검수 |
| `offer-routing-agent` | `product-offer-engine` | plans / checkout / portal summary | 무료 진단·기본 리포트·전문가 리포트 연결을 최적화 |
| `autopublish-scheduler-agent` | `insight-publication-engine` | server interval / board request | 20분 자동 발행과 중복 주제 재시도 수행 |
| `board-sync-agent` | `insight-publication-engine` | publication create | publications와 boards 동기화 및 공개 노출 보장 |
| `checkout-delivery-agent` | `payment-fulfillment-engine` | checkout / payment webhook / fulfillment | 결제 상태와 산출물 제공 상태를 일관되게 연결 |
| `security-gate-agent` | `security-compliance-engine` | request middleware / admin routes | 보안 헤더·CSRF·접근 권한·토큰 검증 유지 |
| `seo-index-agent` | `release-structure-engine` | sitemap / feed / board publication | 공개 페이지와 인사이트 색인 가능성을 확인 |
| `release-audit-agent` | `release-structure-engine` | npm run phase286:final | 구조·검증·압축·상용화 게이트를 최종 판정 |
| `recovery-agent` | `observability-readiness-engine` | readyz / ops report | 운영 상태 확인과 복구 지표를 제공 |

## Optimization Policy

- 포털 UI·진단·리포트·결제·인사이트·보안·배포 검증을 전역 엔진/에이전트 단위로 배정했습니다.
- 각 엔진은 담당 에이전트와 파일 책임을 갖고, phase286 게이트에서 존재 여부와 연결 상태를 검증합니다.
- 20분 자동 발행, shared 대시보드 CSS, POSIX 패키징, 구조 트리 검증을 유지합니다.
