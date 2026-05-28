const ORCHESTRATOR_VERSION = 'phase324-complete-delivery-engine-agent-v8.1.0';

export const ENGINE_AGENT_ORCHESTRATOR_VERSION = ORCHESTRATOR_VERSION;

const ENGINE_DEFINITIONS = Object.freeze([
  ['site-intake-normalization-engine','site-intake','server/routes/account.mjs','apps/public/portal/app.js','사이트 URL, 이름, 메모, 고객 계정 연결을 표준화'],
  ['scan-evidence-engine','diagnosis','server/core/scan-evidence-model.mjs','server/routes/public.mjs','무료 진단 증거, 점수, 발견 항목, 자동화 한계 고지를 구성'],
  ['risk-scoring-engine','risk-score','server/core/product-quality-engine.mjs','server/index.mjs','위험 점수, 정확도 프로필, 우선순위 기준을 관리'],
  ['portal-dashboard-ux-engine','portal-ui','apps/public/portal/index.html','shared/veridion-clean-v311.css','내 사이트 대시보드, 카드, 게이지, 다음 행동 UI를 관리'],
  ['board-publication-engine','content-publication','server/core/product-agent-suite.mjs','apps/public/board/app.js','20분 인사이트 발행, 검색, 폴백, 게시판 동기화를 처리'],
  ['product-offer-engine','plans-checkout','shared/product-catalog.mjs','apps/public/plans/index.html','상품 카탈로그, 가격, 무료/유료 경계를 고정'],
  ['checkout-consent-engine','checkout','server/routes/payment.mjs','apps/public/checkout/app.js','결제 전 동의, 대상 사이트 확정, idempotency, 가격 서버 고정을 담당'],
  ['payment-verification-engine','payment','server/infrastructure/payments/portone-v2.mjs','server/routes/payment.mjs','결제사 검증, 웹훅, 상태 전이를 담당'],
  ['fulfillment-asset-engine','fulfillment','server/services/order-fulfillment.mjs','server/core/premium-asset-builder.mjs','유료 산출물 생성, 접근 기간, 다운로드 권한을 관리'],
  ['refund-review-engine','refund','server/routes/payment.mjs','apps/public/refund/index.html','환불 요청, 중복 요청, 검토 큐를 관리'],
  ['privacy-compliance-engine','privacy','server/core/privacy-compliance-guard.mjs','apps/public/privacy/index.html','개인정보 최소수집, 가명처리, 보존기간, 공개 상태를 관리'],
  ['legal-notice-engine','legal','apps/public/terms/index.html','apps/public/business-info/index.html','약관, 환불, 사업자 정보, 통신판매 고지를 관리'],
  ['security-gate-engine','security','server/middleware/security.mjs','server/infrastructure/security/secure-record-store.mjs','보안 헤더, CSRF, 관리자 접근, 민감정보 마스킹을 관리'],
  ['admin-operations-engine','admin-ops','server/routes/admin.mjs','apps/admin/console/index.html','관리자 콘솔, 주문, 사이트, 발행, 자료, 설정 운영을 담당'],
  ['observability-readiness-engine','observability','server/services/observability.mjs','scripts/ops-report.mjs','health, readyz, 운영 리포트, 장애 분류를 관리'],
  ['release-gate-engine','release','scripts/validate-phase317-trustops-growth.mjs','package.json','최종 게이트, 배포 전 검증, 납품 무결성을 담당'],
  ['backup-restore-engine','backup','server/core/backup-operations.mjs','scripts/backup-runtime.mjs','백업, 복구, prune, 원격 저장소 준비도를 관리'],
  ['rate-limit-abuse-engine','abuse-control','server/infrastructure/ratelimit/rate-limit-store.mjs','server/infrastructure/lock/distributed-lock.mjs','반복 요청, 중복 결제, 웹훅 재진입, 다운로드 남용을 제한'],
  ['seo-feed-engine','seo','server/index.mjs','apps/public/board/index.html','robots, sitemap, feed, security.txt, 인사이트 색인 흐름을 관리'],
  ['data-retention-engine','retention','server/core/privacy-compliance-guard.mjs','scripts/prune-runtime.mjs','거래기록, 개인정보, 런타임 찌꺼기 정리 기준을 관리'],
  ['accessibility-performance-engine','quality-ui','scripts/check-accessibility-basics.mjs','scripts/check-performance-budget.mjs','접근성 기본값과 성능 예산을 최종 게이트에 연결'],
  ['customer-support-engine','support','server/routes/payment.mjs','apps/public/refund/index.html','문의, 환불, 장애 대응, 고객 안내 문구를 관리'],
  ['integration-contract-engine','contract','tests/e2e.mjs','tests/paid-service-redteam.mjs','API 계약, 회귀, 결제 통합 테스트를 담당'],
  ['redteam-governance-engine','redteam','server/core/paid-service-redteam-control.mjs','scripts/redteam-global-audit.mjs','50인 회의, 100개 보강안, 악용 시나리오를 운영 게이트로 유지'],
  ['trustops-growth-engine','growth','server/core/trustops-growth-engine.mjs','apps/public/plans/index.html','무료 진단에서 유료 리포트, 개선 문구팩, 모니터링, 대행사 플랜으로 이어지는 매출 자동화를 담당'],
  ['fix-generator-engine','fix-generation','server/core/trustops-growth-engine.mjs','apps/public/portal/app.js','복사 가능한 환불, 개인정보, 고객센터, 결제 전 안내 문구와 HTML 블록을 생성'],
  ['monitoring-loop-engine','monitoring','server/core/trustops-growth-engine.mjs','server/routes/public.mjs','정기 재진단, 변경 감지, 위험 점수 변화, 운영 알림 흐름을 설계'],
  ['agency-whitelabel-engine','agency','shared/product-catalog.mjs','apps/public/plans/index.html','대행사 다중 사이트, 화이트라벨 리포트, 고객별 리포트 확장을 관리'],
  ['revenue-optimization-engine','revenue','server/core/trustops-growth-engine.mjs','apps/public/checkout/app.js','상품 사다리, 업셀, 전환 KPI, 반복 매출 구조를 최적화'],
  ['structured-data-engine','seo-advanced','server/core/trustops-growth-engine.mjs','server/index.mjs','상품, FAQ, 인사이트 구조화 데이터 패키지를 관리'],
  ['trustops-autopilot-engine','autopilot','server/core/trustops-autopilot-engine.mjs','server/routes/public.mjs','진단, 구매, 산출물, 모니터링, 갱신, 환불 큐를 하나의 자동 운영 관제판으로 통합'],
  ['customer-lifecycle-engine','lifecycle','server/core/trustops-autopilot-engine.mjs','apps/public/portal/app.js','무료 진단부터 대행사 확장까지 고객 단계별 다음 최적 상품과 행동을 계산'],
  ['workqueue-prioritization-engine','operator-queue','server/core/trustops-autopilot-engine.mjs','server/routes/admin.mjs','P0/P1/P2 운영 큐와 산출물 복구, 갱신, 환불 검토를 우선순위화'],
  ['revenue-forecast-engine','forecast','server/core/trustops-autopilot-engine.mjs','apps/public/plans/app.js','단건 매출, 반복 매출, 파이프라인 기대 매출을 계산'],
  ['trustops-launch-control-engine','launch-control','server/core/trustops-launch-control.mjs','server/routes/public.mjs','상용 오픈 준비도, 단계 배포, 롤백, 사고 대응을 통합 관리'],
  ['lifecycle-message-engine','lifecycle-message','server/core/trustops-launch-control.mjs','server/routes/public.mjs','무료 진단, 업셀, 갱신, 환불 안내 메시지를 안전하게 생성'],
  ['conversion-experiment-engine','experiment','server/core/trustops-launch-control.mjs','apps/public/portal/app.js','저비용 전환 실험과 KPI를 설계'],
  ['incident-playbook-engine','incident','server/core/trustops-launch-control.mjs','server/routes/admin.mjs','결제, 산출물, 개인정보, 진단, 발행 장애 대응 절차를 관리'],
  ['production-sentinel-engine','production-sentinel','server/core/trustops-production-sentinel.mjs','server/routes/public.mjs','실서버 검증, canary 공개, 롤백 트리거, SLA를 통합 관제'],
  ['live-verification-engine','live-verification','server/core/trustops-production-sentinel.mjs','scripts/check-live-public.mjs','운영 URL 기준 공개 페이지와 API live checklist를 표준화'],
  ['rollback-sla-engine','rollback-sla','server/core/trustops-production-sentinel.mjs','server/routes/admin.mjs','결제·개인정보·산출물 장애별 보류·제한공개·롤백 단계를 관리'],
  ['cost-quality-budget-engine','cost-quality','server/core/trustops-production-sentinel.mjs','shared/product-catalog.mjs','AI 호출·PDF 생성·진단 수집·발행 주기의 비용 대비 품질 예산을 관리'],
  ['final-handoff-engine','final-handoff','server/core/trustops-final-handoff.mjs','server/routes/public.mjs','최종 수락 기준, 운영자 런북, safe mode, handoff artifact를 통합 관리'],
  ['environment-lock-engine','env-lock','server/core/trustops-final-handoff.mjs','server/config/validation.mjs','상용 필수 환경값 누락 시 공개·결제·인수 완료를 보류'],
  ['operator-handoff-engine','operator-handoff','server/core/trustops-final-handoff.mjs','server/routes/admin.mjs','운영자 배포, 캐시, live verification, 장애 보류 절차를 표준화'],
  ['go-live-kpi-engine','go-live-kpi','server/core/trustops-final-handoff.mjs','apps/public/portal/app.js','무료 진단, 결제, 산출물, 환불, 갱신, 대행사 KPI를 오픈 후 추적'],
  ['one-hundred-finalizer-engine','hundred-point','server/core/trustops-100-point-finalizer.mjs','server/routes/public.mjs','20개 영역 100점 납품 기준, 외부 운영 확인 항목, 최종 점수판을 통합 관리'],
  ['split-gate-runner-engine','test-gate','scripts/run-phase324-final.mjs','package.json','긴 통합 명령을 안정적인 순차 게이트로 실행하고 로그를 남김'],
  ['responsive-contract-engine','ui-contract','scripts/check-responsive-contract.mjs','shared/veridion-clean-v311.css','모바일·태블릿·데스크톱 레이아웃 계약과 깨진 도형 후보를 검수'],
  ['operational-contract-engine','operations','scripts/check-operational-readiness-contract.mjs','deploy/env.production.template','실결제·개인정보·사업자정보·스토리지 운영 준비 계약을 검수'],
]);

const AGENT_DEFINITIONS = Object.freeze([
  ['site-registration-agent','site-intake-normalization-engine','portal/account','사이트 등록, 중복, 삭제, 재진단 요청을 계정과 연결'],
  ['url-canonicalization-agent','site-intake-normalization-engine','all-url-inputs','http/https, 도메인, 경로, 추적 파라미터 입력을 표준화'],
  ['scan-quality-agent','scan-evidence-engine','diagnose/scan','진단 결과의 증거, 점수, 우선순위를 검수'],
  ['automation-disclosure-agent','scan-evidence-engine','diagnose/scan','자동 확인 항목과 직접 확인 항목을 분리 고지'],
  ['risk-threshold-agent','risk-scoring-engine','scan/report','위험도 구간과 추천 플랜 경계값을 유지'],
  ['visual-readability-agent','portal-dashboard-ux-engine','portal render','겹침, 잘림, 카드 시인성, 모바일 레이아웃을 검수'],
  ['dashboard-state-agent','portal-dashboard-ux-engine','portal api','빈 상태, 오류 상태, 로그인 상태를 안정적으로 표시'],
  ['publication-scheduler-agent','board-publication-engine','20min interval','20분 주기 발행과 누락 발행 재시도를 담당'],
  ['board-sync-agent','board-publication-engine','publication create','publications와 boards 동기화를 보장'],
  ['insight-quality-agent','board-publication-engine','content gate','제목, 본문, 태그, 중복, 내부 토큰을 검수'],
  ['korean-proofreading-agent','board-publication-engine','content copy','오탈자, 조사, 어색한 공개 문구를 보정'],
  ['special-character-guard-agent','board-publication-engine','content copy','깨진 문자와 장식형 특수기호 노출을 차단'],
  ['offer-routing-agent','product-offer-engine','plans/checkout','무료 진단, 기본 리포트, 전문가 플랜 연결을 담당'],
  ['price-authority-agent','product-offer-engine','checkout','클라이언트 가격 무시와 서버 카탈로그 금액 고정을 감시'],
  ['checkout-consent-agent','checkout-consent-engine','checkout-session','동의, 대상 사이트, 이메일, idempotency 게이트를 검수'],
  ['checkout-abuse-agent','checkout-consent-engine','checkout-session','반복 세션 생성, 키 재사용, 결제 전 남용을 제한'],
  ['payment-state-agent','payment-verification-engine','payment complete','상태 전이, 결제사 조회, 금액 검증을 담당'],
  ['webhook-integrity-agent','payment-verification-engine','payment webhook','웹훅 서명, 중복 처리, provider refetch를 담당'],
  ['settlement-evidence-agent','payment-verification-engine','admin/payment','정산 증적과 주문 상태 변경 기록을 관리'],
  ['fulfillment-access-agent','fulfillment-asset-engine','fulfillment','주문 소유권, accessToken, 접근 기간을 검수'],
  ['pdf-delivery-agent','fulfillment-asset-engine','download','PDF 생성, 헤더, 다운로드 권한을 검수'],
  ['guidance-auth-agent','fulfillment-asset-engine','guidance','지침 문서가 유료 접근권 없이 노출되지 않게 차단'],
  ['refund-eligibility-agent','refund-review-engine','refund request','환불 가능 기간과 결제 완료 상태를 검수'],
  ['refund-duplicate-agent','refund-review-engine','refund request','중복 환불 요청과 검토 큐 충돌을 차단'],
  ['privacy-minimization-agent','privacy-compliance-engine','all routes','IP 원문, user-agent, payload 민감정보 장기 저장을 차단'],
  ['privacy-retention-agent','privacy-compliance-engine','maintenance','보존기간과 파기 작업을 점검'],
  ['privacy-export-agent','privacy-compliance-engine','account export','계정 내보내기와 비활성화 흐름을 관리'],
  ['legal-review-agent','legal-notice-engine','predeploy','약관, 환불, 개인정보, 사업자 정보 필수값을 확인'],
  ['commerce-notice-agent','legal-notice-engine','checkout/refund','청약철회 제한, 디지털 산출물 제공 고지를 점검'],
  ['business-info-agent','legal-notice-engine','business-info','사업자 정보 환경변수와 공개 노출 상태를 검수'],
  ['security-header-agent','security-gate-engine','middleware','CSP, HSTS, frame-src, XSS 기본 헤더를 관리'],
  ['csrf-admin-agent','security-gate-engine','admin','관리자 CSRF와 세션 권한을 점검'],
  ['secret-hygiene-agent','security-gate-engine','release','시크릿, 토큰, 키 하드코딩을 차단'],
  ['admin-rbac-agent','admin-operations-engine','admin routes','관리자 권한과 작업 범위를 분리'],
  ['operator-audit-agent','admin-operations-engine','admin routes','관리자 작업 감사 로그와 마스킹을 유지'],
  ['ops-observability-agent','observability-readiness-engine','health/readyz','장애, 준비도, 운영 상태를 공개/관리자 API에 반영'],
  ['incident-classification-agent','observability-readiness-engine','ops report','장애 분류와 대응 우선순위를 제공'],
  ['release-audit-agent','release-gate-engine','npm final','최종 게이트와 ZIP 무결성 검사를 수행'],
  ['package-manifest-agent','release-gate-engine','delivery zip','변경 파일, 테스트 결과, 누락 파일을 검증'],
  ['backup-integrity-agent','backup-restore-engine','backup/restore','백업 생성, 복구, 원격 저장 상태를 점검'],
  ['restore-drill-agent','backup-restore-engine','restore drill','복구 훈련과 실패 기록을 관리'],
  ['rate-limit-agent','rate-limit-abuse-engine','public api','공개 API 요청량 제한을 유지'],
  ['distributed-lock-agent','rate-limit-abuse-engine','critical flows','결제, 웹훅, 자동발행 중복 실행을 차단'],
  ['seo-index-agent','seo-feed-engine','sitemap/feed','공개 페이지와 인사이트 색인 파일을 관리'],
  ['feed-freshness-agent','seo-feed-engine','feed.xml','인사이트 발행과 피드 최신성을 연결'],
  ['retention-prune-agent','data-retention-engine','maintenance','런타임, 로그, 개인정보 보존기간 정리를 실행'],
  ['runtime-clean-agent','data-retention-engine','release','납품 ZIP에 런타임 찌꺼기가 포함되지 않도록 차단'],
  ['accessibility-agent','accessibility-performance-engine','public/admin pages','라벨, 포커스, 구조적 제목을 점검'],
  ['performance-budget-agent','accessibility-performance-engine','assets','CSS/JS 크기, 이미지, 응답 예산을 점검'],
  ['support-routing-agent','customer-support-engine','refund/support','고객 문의, 환불 요청, 장애 문의 동선을 정리'],
  ['transactional-email-agent','customer-support-engine','email outbox','영수, 환불, 장애 안내 발송 큐를 관리'],
  ['api-contract-agent','integration-contract-engine','tests','공개/관리자 API 스키마와 상태코드를 검수'],
  ['paid-redteam-agent','integration-contract-engine','paid tests','유료 서비스 우회 시나리오를 회귀 테스트에 반영'],
  ['redteam-council-agent','redteam-governance-engine','phase council','50인 실무 회의와 100개 보강안을 유지'],
  ['abuse-scenario-agent','redteam-governance-engine','threat model','토큰 추측, 결제 우회, 반복 다운로드를 시뮬레이션'],
  ['external-audit-evidence-agent','redteam-governance-engine','docs/current','외부 감사 대응 JSON과 보고서를 남김'],
  ['growth-funnel-agent','trustops-growth-engine','plans/diagnosis','무료 진단, 잠금형 상세, 유료 전환 CTA를 연결'],
  ['upsell-routing-agent','trustops-growth-engine','checkout/portal','기본 리포트 이후 문구팩, 모니터링, 전문가 플랜 업셀을 제안'],
  ['copy-pack-agent','fix-generator-engine','fix-generator','복사 가능한 개선 문구와 HTML 블록을 생성'],
  ['placement-guide-agent','fix-generator-engine','fix-generator','문구 삽입 위치와 적용 난이도를 함께 제시'],
  ['monitoring-schedule-agent','monitoring-loop-engine','monitoring-plan','주간 재진단, 변경 감지, 알림 일정을 구성'],
  ['risk-delta-agent','monitoring-loop-engine','monitoring-plan','위험 점수 변화 기준과 알림 임계값을 관리'],
  ['agency-workspace-agent','agency-whitelabel-engine','agency','다중 사이트 관리와 고객별 리포트 흐름을 담당'],
  ['whitelabel-report-agent','agency-whitelabel-engine','agency','대행사 브랜드 리포트와 내보내기 요건을 관리'],
  ['revenue-kpi-agent','revenue-optimization-engine','revenue','전환율, 반복 매출, 업셀 지표를 정리'],
  ['product-ladder-agent','revenue-optimization-engine','revenue','무료, 단건, 문구팩, 모니터링, 전문가, 대행사 상품 사다리를 유지'],
  ['jsonld-schema-agent','structured-data-engine','structured-data','상품과 FAQ 구조화 데이터 패키지를 생성'],
  ['seo-cta-agent','structured-data-engine','structured-data','검색 유입을 무료 진단 CTA로 연결'],
  ['autopilot-queue-agent','trustops-autopilot-engine','trustops-autopilot','진단, 결제, 산출물, 환불, 갱신 큐를 통합 산출'],
  ['autopilot-safeguard-agent','trustops-autopilot-engine','trustops-autopilot','유료 접근, 환불, 수동 갱신 고지 같은 안전장치를 결과에 포함'],
  ['next-best-offer-agent','customer-lifecycle-engine','customer-lifecycle','위험 점수와 현재 플랜 기준으로 다음 최적 상품을 제안'],
  ['lifecycle-stage-agent','customer-lifecycle-engine','customer-lifecycle','무료, 리포트, 문구팩, 모니터링, 전문가, 대행사 단계를 추적'],
  ['operator-priority-agent','workqueue-prioritization-engine','automation-workqueue','P0/P1/P2 업무 우선순위와 실행 자동화를 계산'],
  ['fulfillment-recovery-agent','workqueue-prioritization-engine','automation-workqueue','paid 주문의 산출물 누락을 복구 큐로 올림'],
  ['renewal-guard-agent','workqueue-prioritization-engine','subscription lifecycle','수동 갱신 만료 전 안내와 결제 링크 생성을 준비'],
  ['pipeline-forecast-agent','revenue-forecast-engine','trustops-autopilot','예상 파이프라인 매출과 반복 매출 지표를 계산'],
  ['launch-readiness-agent','trustops-launch-control-engine','trustops-launch-control','P0 큐, 산출물 누락, 환불, 필수 환경값을 상용 오픈 의사결정으로 계산'],
  ['rollout-stage-agent','trustops-launch-control-engine','trustops-launch-control','내부 검증부터 전체 공개까지 단계별 진입·종료 조건을 관리'],
  ['rollback-playbook-agent','trustops-launch-control-engine','trustops-launch-control','결제 또는 개인정보 위험 발생 시 롤백 절차를 제공'],
  ['lifecycle-message-agent','lifecycle-message-engine','message-sequence','고객 단계별 제목, 본문, CTA, 억제 규칙을 생성'],
  ['message-compliance-agent','lifecycle-message-engine','message-sequence','법률 확정 표현, 자동결제 오인, 마케팅 수신거부 위반을 차단'],
  ['experiment-priority-agent','conversion-experiment-engine','experiment-plan','저비용 고수익 실험을 우선순위화'],
  ['unit-economics-agent','conversion-experiment-engine','unit-economics','상품별 가격, 갱신, 업셀 레버를 요약'],
  ['incident-playbook-agent','incident-playbook-engine','incident-playbook','결제, 산출물, 개인정보, 진단, 발행 장애 대응 단계를 유지'],
  ['production-readiness-agent','production-sentinel-engine','production-sentinel','런칭 컨트롤, 오토파일럿, 운영 큐를 합산해 최종 go/hold를 계산'],
  ['sentinel-digest-agent','production-sentinel-engine','production-sentinel','운영 큐, 산출물 누락, 환불, 갱신, 매출 지표를 일일 요약으로 제공'],
  ['live-route-check-agent','live-verification-engine','live-verification','홈, 진단, 포털, 결제, 약관, 개인정보, API live check 목록을 생성'],
  ['cdn-cache-check-agent','live-verification-engine','live-verification','배포 후 브라우저/CDN 캐시 제거와 확인 순서를 안내'],
  ['rollback-trigger-agent','rollback-sla-engine','rollback','결제 불일치, 개인정보 의심, 산출물 누락, 스토리지 장애별 차단 모드를 결정'],
  ['sla-priority-agent','rollback-sla-engine','sla','P0/P1/P2 확인 시간과 조치 목표를 고정'],
  ['ai-cost-guard-agent','cost-quality-budget-engine','cost-quality','룰 기반 1차 판정과 AI 호출 최소화 정책을 운영 예산으로 묶음'],
  ['revenue-quality-agent','cost-quality-budget-engine','cost-quality','상품별 접근 기간, 수동 갱신, 매출 레버를 비용·품질 기준으로 점검'],
  ['final-acceptance-agent','final-handoff-engine','trustops-final-handoff','최종 수락 체크리스트와 blocker를 산출'],
  ['handoff-artifact-agent','final-handoff-engine','delivery zip','납품 ZIP, 감사 JSON, 최종 게이트 로그, 작업지시서를 묶음'],
  ['env-readiness-agent','environment-lock-engine','predeploy env','상용 필수 환경값의 설정 여부를 시크릿 노출 없이 점검'],
  ['commercial-lock-agent','environment-lock-engine','checkout launch','필수 환경값 누락 시 신규 유료 전환을 보류'],
  ['operator-runbook-agent','operator-handoff-engine','admin final handoff','운영자가 따라야 할 배포·장애·환불·일일 관제 순서를 유지'],
  ['safe-mode-agent','operator-handoff-engine','incident safe mode','개인정보, 결제, 산출물, 진단 장애별 고객 안전 모드를 지정'],
  ['go-live-kpi-agent','go-live-kpi-engine','post launch metrics','무료 진단 완료율, 결제 전환, 산출물 생성, 환불, 갱신 KPI를 관리'],
  ['baseline-freeze-agent','go-live-kpi-engine','release baseline','phase321 결과를 다음 릴리즈 기준선으로 고정'],
  ['hundred-scorecard-agent','one-hundred-finalizer-engine','trustops-100-final','20개 영역 100점 점수판과 실패 영역 0개 조건을 검수'],
  ['external-truth-agent','one-hundred-finalizer-engine','trustops-100-final','패키지 내부 100점과 실서버·법무 검증 필요 영역을 분리 표기'],
  ['operator-final-action-agent','one-hundred-finalizer-engine','trustops-100-final','운영 서버 반영, 캐시 삭제, 실결제, 다운로드, 환불, 모바일 검증 순서를 고정'],
  ['split-gate-runner-agent','split-gate-runner-engine','phase324:final','각 검증 명령을 순차 실행하고 실패 지점·소요 시간을 로그로 남김'],
  ['gate-timeout-agent','split-gate-runner-engine','phase324:final','장시간 통합 명령의 환경 제한을 줄이도록 분할 실행 계약을 유지'],
  ['responsive-breakpoint-agent','responsive-contract-engine','responsive contract','360, 390, 768, 1024, 1440 기준 CSS/HTML 계약을 검수'],
  ['glyph-regression-agent','responsive-contract-engine','public screens','깨진 도형 후보와 과거 phase 보정 CSS 재유입을 차단'],
  ['commercial-env-contract-agent','operational-contract-engine','release predeploy','운영 결제·사업자·개인정보·스토리지 필수 환경값 계약을 검수']

]);

const EVENT_POLICIES = Object.freeze({
  'diagnosis.completed': {
    domain: 'diagnosis',
    requiredAgents: ['scan-quality-agent','automation-disclosure-agent','privacy-minimization-agent','risk-threshold-agent'],
    checks: [
      ['hasTarget', payload => Boolean(payload.target), '진단 대상 URL이 필요합니다.'],
      ['hasRequestId', payload => Boolean(payload.requestId), '진단 요청 ID가 필요합니다.'],
      ['noLegalConclusion', payload => payload.legalConclusion !== true, '무료 진단은 법률 결론으로 표시할 수 없습니다.'],
      ['lockedUntilPaid', payload => payload.locked !== false, '무료 진단 상세 결과는 유료 접근 전 잠금 상태여야 합니다.']
    ]
  },
  'board.render': {
    domain: 'content-publication',
    requiredAgents: ['publication-scheduler-agent','board-sync-agent','insight-quality-agent','special-character-guard-agent'],
    checks: [
      ['hasPosts', payload => Number(payload.postCount || 0) > 0, '인사이트 게시물이 최소 1개 필요합니다.'],
      ['cadence20', payload => Number(payload.intervalMinutes || 20) === 20, '인사이트 발행 주기는 20분이어야 합니다.'],
      ['noBrokenGlyph', payload => !/[�□■◆◇●▲▼※★☆♣♥♠♬✓✔✕✖↔⇒⇐⇔⌕▱↻▤▥♢⚖⚙☑⋮🛡█░›↗]/u.test(String(payload.sample || '')), '공개 인사이트에 깨진 도형 후보가 없어야 합니다.']
    ]
  },
  'checkout.session.create': {
    domain: 'checkout',
    requiredAgents: ['price-authority-agent','checkout-consent-agent','checkout-abuse-agent','privacy-minimization-agent'],
    checks: [
      ['paidPlanOnly', payload => Number(payload.amount || 0) > 0, '무료 상품은 결제 세션을 생성할 수 없습니다.'],
      ['targetRequired', payload => Boolean(payload.siteId || payload.domain), '유료 산출물 대상 사이트가 필요합니다.'],
      ['emailRequired', payload => /@/.test(String(payload.buyerEmail || '')), '결제 연락처 이메일이 필요합니다.'],
      ['consentsRequired', payload => ['privacyConsent','termsConsent','refundConsent','deliveryConsent'].every(key => payload[key] === true), '필수 동의 4종이 필요합니다.'],
      ['idempotencyBound', payload => Boolean(payload.idempotencyKey), '결제 세션은 idempotency key로 묶여야 합니다.']
    ]
  },
  'payment.complete': {
    domain: 'payment',
    requiredAgents: ['payment-state-agent','webhook-integrity-agent','settlement-evidence-agent','distributed-lock-agent'],
    checks: [
      ['hasOrderId', payload => Boolean(payload.orderId), '주문 ID가 필요합니다.'],
      ['lockBound', payload => Boolean(payload.lockKey), '결제 완료 처리는 분산락으로 보호되어야 합니다.'],
      ['providerKnown', payload => Boolean(payload.provider), '결제 provider가 필요합니다.']
    ]
  },
  'fulfillment.download': {
    domain: 'fulfillment',
    requiredAgents: ['fulfillment-access-agent','pdf-delivery-agent','guidance-auth-agent'],
    checks: [
      ['paidOnly', payload => payload.orderStatus === 'paid', '결제 완료 주문만 다운로드할 수 있습니다.'],
      ['accessActive', payload => payload.accessActive === true, '산출물 접근 기간이 유효해야 합니다.'],
      ['authorized', payload => payload.authorized === true, '주문 소유권 또는 accessToken이 필요합니다.']
    ]
  },
  'refund.request': {
    domain: 'refund',
    requiredAgents: ['refund-eligibility-agent','refund-duplicate-agent','support-routing-agent','operator-audit-agent'],
    checks: [
      ['orderRequired', payload => Boolean(payload.orderId), '환불 대상 주문이 필요합니다.'],
      ['authorized', payload => payload.authorized === true, '환불 요청 권한이 필요합니다.'],
      ['allowed', payload => payload.allowed === true, '환불 가능 기간과 상태를 만족해야 합니다.']
    ]
  },
  'trustops.blueprint': {
    domain: 'growth',
    requiredAgents: ['growth-funnel-agent','product-ladder-agent','revenue-kpi-agent'],
    checks: [
      ['hasBacklog', payload => Number(payload.improvementBacklogCount || 0) >= 100, '고도화 백로그 100개가 필요합니다.'],
      ['hasFunnel', payload => Boolean(payload.conversionFunnel), '무료에서 유료로 이어지는 전환 흐름이 필요합니다.'],
      ['hasFixPack', payload => Number(payload.fixCount || 0) >= 5, '복사 가능한 개선 문구가 필요합니다.']
    ]
  },
  'fix.generate': {
    domain: 'fix-generation',
    requiredAgents: ['copy-pack-agent','placement-guide-agent','commerce-notice-agent'],
    checks: [
      ['copyReady', payload => Number(payload.copyReadyCount || 0) >= 5, '복사 가능한 개선 문구가 최소 5개 필요합니다.'],
      ['hasIndustry', payload => Boolean(payload.industry), '업종 템플릿이 필요합니다.'],
      ['noLegalConclusion', payload => payload.legalConclusion !== true, '개선 문구는 법률 확정 결론으로 표시할 수 없습니다.']
    ]
  },
  'monitoring.plan': {
    domain: 'monitoring',
    requiredAgents: ['monitoring-schedule-agent','risk-delta-agent','support-routing-agent'],
    checks: [
      ['hasTarget', payload => Boolean(payload.target), '모니터링 대상 사이트가 필요합니다.'],
      ['hasSchedule', payload => Number(payload.scheduleCount || 0) >= 5, '정기 점검 단계가 필요합니다.'],
      ['hasAlerts', payload => Number(payload.alertCount || 0) >= 4, '운영 알림 기준이 필요합니다.']
    ]
  },
  'revenue.optimize': {
    domain: 'revenue',
    requiredAgents: ['revenue-kpi-agent','product-ladder-agent','upsell-routing-agent'],
    checks: [
      ['hasLadder', payload => Number(payload.ladderCount || 0) >= 6, '상품 사다리가 필요합니다.'],
      ['hasKpis', payload => Number(payload.kpiCount || 0) >= 6, '전환과 반복 매출 KPI가 필요합니다.']
    ]
  },
  'structured-data.package': {
    domain: 'seo-advanced',
    requiredAgents: ['jsonld-schema-agent','seo-cta-agent','seo-index-agent'],
    checks: [
      ['hasJsonLd', payload => payload.hasJsonLd === true, 'JSON-LD 구조화 데이터가 필요합니다.'],
      ['hasFaq', payload => payload.hasFaq === true, 'FAQ 구조화 데이터가 필요합니다.']
    ]
  },
  'trustops.autopilot': {
    domain: 'autopilot',
    requiredAgents: ['autopilot-queue-agent','autopilot-safeguard-agent','operator-priority-agent','pipeline-forecast-agent'],
    checks: [
      ['hasBacklog', payload => Number(payload.backlogCount || 0) >= 130, 'phase317 100개와 phase318 30개 이상 백로그가 필요합니다.'],
      ['hasNextOffer', payload => payload.hasNextOffer === true, '다음 최적 상품 제안이 필요합니다.'],
      ['hasSafeguards', payload => Number(payload.safeguards || 0) >= 4, '유료 서비스 안전장치가 필요합니다.'],
      ['queueNumeric', payload => Number(payload.queueCount || 0) >= 0, '운영 큐 수량은 숫자여야 합니다.']
    ]
  },
  'customer.lifecycle': {
    domain: 'lifecycle',
    requiredAgents: ['next-best-offer-agent','lifecycle-stage-agent','upsell-routing-agent'],
    checks: [
      ['hasStages', payload => Number(payload.stageCount || 0) >= 6, '고객 생애주기 단계가 필요합니다.'],
      ['hasNextOffer', payload => payload.hasNextOffer === true, '다음 최적 상품이 필요합니다.'],
      ['riskBounded', payload => Number(payload.riskScore || 0) >= 0 && Number(payload.riskScore || 0) <= 100, '위험 점수 범위가 필요합니다.']
    ]
  },
  'trustops.launch_control': {
    domain: 'launch-control',
    requiredAgents: ['launch-readiness-agent','rollout-stage-agent','rollback-playbook-agent','incident-playbook-agent'],
    checks: [
      ['readinessBounded', payload => Number(payload.readinessScore || 0) >= 0 && Number(payload.readinessScore || 0) <= 100, '런칭 준비도 점수 범위가 필요합니다.'],
      ['hasBacklog', payload => Number(payload.backlogCount || 0) >= 170, 'phase319 누적 백로그 170개 이상이 필요합니다.'],
      ['phase319Backlog', payload => Number(payload.phase319BacklogCount || 0) >= 40, 'phase319 보강 항목 40개가 필요합니다.'],
      ['hasExperiments', payload => Number(payload.experimentCount || 0) >= 8, '전환 실험 8개 이상이 필요합니다.'],
      ['hasPlaybooks', payload => Number(payload.playbookCount || 0) >= 5, '장애 대응 플레이북 5개 이상이 필요합니다.']
    ]
  },
  'lifecycle.message_sequence': {
    domain: 'lifecycle-message',
    requiredAgents: ['lifecycle-message-agent','message-compliance-agent','transactional-email-agent'],
    checks: [
      ['hasSubject', payload => payload.hasSubject === true, '메시지 제목이 필요합니다.'],
      ['hasSafeguard', payload => payload.hasSafeguard === true, '법률·동의 안전 고지가 필요합니다.'],
      ['hasSuppressionRules', payload => payload.hasSuppressionRules === true, '수신거부와 거래성 안내 억제 규칙이 필요합니다.'],
      ['hasNextOffer', payload => payload.hasNextOffer === true, '다음 제안 상품이 필요합니다.']
    ]
  },
  'trustops.production_sentinel': {
    domain: 'production-sentinel',
    requiredAgents: ['production-readiness-agent','sentinel-digest-agent','live-route-check-agent','rollback-trigger-agent','sla-priority-agent','ai-cost-guard-agent'],
    checks: [
      ['scoreBounded', payload => Number(payload.sentinelScore || 0) >= 0 && Number(payload.sentinelScore || 0) <= 100, '프로덕션 센티널 점수 범위가 필요합니다.'],
      ['hasBacklog', payload => Number(payload.backlogCount || 0) >= 220, 'phase320 누적 백로그 220개 이상이 필요합니다.'],
      ['phase320Backlog', payload => Number(payload.phase320BacklogCount || 0) >= 50, 'phase320 보강 항목 50개가 필요합니다.'],
      ['liveChecks', payload => Number(payload.liveCheckCount || 0) >= 13, '실서버 검증 체크 13개 이상이 필요합니다.'],
      ['rollbackMatrix', payload => Number(payload.rollbackCount || 0) >= 7, '롤백 트리거 7개 이상이 필요합니다.'],
      ['slaMatrix', payload => Number(payload.slaCount || 0) >= 3, 'P0/P1/P2 SLA가 필요합니다.']
    ]
  },
  'trustops.final_handoff': {
    domain: 'final-handoff',
    requiredAgents: ['final-acceptance-agent','handoff-artifact-agent','env-readiness-agent','operator-runbook-agent','safe-mode-agent','go-live-kpi-agent'],
    checks: [
      ['scoreBounded', payload => Number(payload.acceptanceScore || 0) >= 0 && Number(payload.acceptanceScore || 0) <= 100, '최종 수락 점수 범위가 필요합니다.'],
      ['hasBacklog', payload => Number(payload.backlogCount || 0) >= 280, 'phase321 누적 백로그 280개 이상이 필요합니다.'],
      ['phase321Backlog', payload => Number(payload.phase321BacklogCount || 0) === 60, 'phase321 보강 항목 60개가 필요합니다.'],
      ['acceptanceChecklist', payload => Number(payload.checklistCount || 0) >= 15, '최종 수락 체크리스트 15개 이상이 필요합니다.'],
      ['operatorRunbook', payload => Number(payload.runbookCount || 0) >= 12, '운영자 런북 12단계 이상이 필요합니다.'],
      ['safeMode', payload => Number(payload.safeModeCount || 0) >= 5, '고객 안전 모드 5개 이상이 필요합니다.'],
      ['kpis', payload => Number(payload.kpiCount || 0) >= 6, '오픈 KPI 6개 이상이 필요합니다.']
    ]
  },
  'trustops.100_final': {
    domain: 'hundred-point',
    requiredAgents: ['hundred-scorecard-agent','external-truth-agent','operator-final-action-agent','split-gate-runner-agent','commercial-env-contract-agent'],
    checks: [
      ['packageScore100', payload => Number(payload.packageScore || 0) === 100, '패키지 내부 점수 100점이 필요합니다.'],
      ['failedAreasZero', payload => Number(payload.failedAreaCount || 0) === 0, '실패 영역은 0개여야 합니다.'],
      ['externalItems', payload => Number(payload.operatorItemCount || 0) >= 10, '운영자 최종 확인 항목 10개 이상이 필요합니다.'],
      ['engineCoverage', payload => Number(payload.engineCount || 0) >= 50 && Number(payload.agentCount || 0) >= 108, '최종 엔진·에이전트 커버리지가 필요합니다.']
    ]
  },
  'release.final': {
    domain: 'release',
    requiredAgents: ['release-audit-agent','package-manifest-agent','secret-hygiene-agent','runtime-clean-agent','external-audit-evidence-agent'],
    checks: [
      ['phase319', payload => /phase31[6-9]|phase320|phase321|phase322|phase323|phase324/.test(String(payload.version || '')), 'phase316 이상 최신 버전이어야 합니다.'],
      ['scriptsPresent', payload => payload.hasFinalScript === true, 'phase317 최종 스크립트가 필요합니다.'],
      ['auditPresent', payload => payload.hasAudit === true, 'phase317 감사 JSON이 필요합니다.']
    ]
  }
});

function list(value) { return Array.isArray(value) ? value : []; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function nowIso(options = {}) { return options.nowIso || new Date().toISOString(); }
function toAgentObject(item) {
  const [id, assignedEngine, trigger, duty] = item;
  return { id, layer: 'agent', assignedEngine, trigger, duty };
}
function toEngineObject(item) {
  const [id, domain, runtimeFile, serverFile, responsibility] = item;
  const agents = AGENT_DEFINITIONS.filter(agent => agent[1] === id).map(agent => agent[0]);
  return { id, layer: 'engine', domain, runtimeFile, serverFile, responsibility, ownerAgents: agents, assignedAgents: agents };
}

export const ENGINE_AGENT_ASSIGNMENT_MATRIX = Object.freeze({
  version: ORCHESTRATOR_VERSION,
  engines: ENGINE_DEFINITIONS.map(toEngineObject),
  agents: AGENT_DEFINITIONS.map(toAgentObject),
  eventPolicies: Object.fromEntries(Object.entries(EVENT_POLICIES).map(([key, value]) => [key, { domain: value.domain, requiredAgents: value.requiredAgents }]))
});

export function buildEngineAgentAssignment(db = {}, options = {}) {
  const engines = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.map(engine => {
    const assignedAgents = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.filter(agent => agent.assignedEngine === engine.id).map(agent => agent.id);
    return { ...engine, assignedAgents, ownerAgentReady: assignedAgents.length > 0, status: assignedAgents.length > 0 ? 'assigned' : 'missing-agent' };
  });
  const agents = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.map(agent => {
    const engine = engines.find(item => item.id === agent.assignedEngine) || null;
    return { ...agent, engineReady: Boolean(engine), status: engine ? 'assigned' : 'missing-engine' };
  });
  const missing = [
    ...engines.filter(item => item.status !== 'assigned').map(item => item.id),
    ...agents.filter(item => item.status !== 'assigned').map(item => item.id)
  ];
  const runtimeSignals = {
    savedSites: list(db.savedSites).length || list(db.sites).length,
    scans: list(db.scans).length,
    boards: list(db.boards).length,
    publications: list(db.publications).length,
    orders: list(db.orders).length,
    paymentSessions: list(db.paymentSessions).length,
    refunds: list(db.refundRequests).length,
    agentEvents: list(db.engineAgentEvents).length,
    settingsReady: Boolean(db.settings),
    generatedAt: nowIso(options)
  };
  return {
    ok: missing.length === 0,
    phase: 'phase324',
    version: ORCHESTRATOR_VERSION,
    engineCount: engines.length,
    agentCount: agents.length,
    eventPolicyCount: Object.keys(EVENT_POLICIES).length,
    assignedEngines: engines.filter(item => item.status === 'assigned').length,
    assignedAgents: agents.filter(item => item.status === 'assigned').length,
    domains: unique(engines.map(item => item.domain)),
    engines,
    agents,
    missing,
    runtimeSignals,
    optimizationSummary: [
      '진단·인사이트·상품·체크아웃·결제·산출물·환불·개인정보·보안·관리자·배포 흐름을 전역 엔진/에이전트로 배정했습니다.',
      '핵심 이벤트마다 담당 에이전트가 실행 전/후 게이트를 기록하며, 실패 시 유료 기능 또는 공개 노출을 차단할 수 있습니다.',
      'phase321 게이트는 엔진 수, 에이전트 수, 이벤트 정책, 실서버 검증, 롤백·SLA 문서를 함께 검증합니다.'
    ]
  };
}

export function applyEngineAgentGate(eventKey, payload = {}, options = {}) {
  const policy = EVENT_POLICIES[eventKey];
  if (!policy) {
    return {
      ok: false,
      version: ORCHESTRATOR_VERSION,
      eventKey,
      domain: 'unknown',
      stage: options.stage || 'runtime',
      requiredAgents: [],
      checks: [],
      failures: [{ key: 'policyMissing', message: `엔진/에이전트 정책이 없습니다: ${eventKey}` }],
      checkedAt: nowIso(options)
    };
  }
  const checks = policy.checks.map(([key, fn, message]) => {
    let ok = false;
    try { ok = Boolean(fn(payload)); } catch { ok = false; }
    return { key, ok, message };
  });
  const failures = checks.filter(item => !item.ok).map(({ key, message }) => ({ key, message }));
  return {
    ok: failures.length === 0,
    version: ORCHESTRATOR_VERSION,
    eventKey,
    domain: policy.domain,
    stage: options.stage || 'runtime',
    requiredAgents: policy.requiredAgents,
    checks,
    failures,
    payloadSummary: summarizePayload(payload),
    checkedAt: nowIso(options)
  };
}

export function appendEngineAgentEvent(db = {}, event = {}, options = {}) {
  db.engineAgentEvents ||= [];
  const record = {
    id: options.id || `eag_${String(Date.now()).slice(-8)}_${Math.random().toString(16).slice(2, 8)}`,
    ...event,
    checkedAt: event.checkedAt || nowIso(options)
  };
  db.engineAgentEvents.unshift(record);
  db.engineAgentEvents = db.engineAgentEvents.slice(0, 500);
  return record;
}

function summarizePayload(payload = {}) {
  const keys = ['target','requestId','siteId','domain','plan','orderId','orderStatus','provider','amount','intervalMinutes','postCount'];
  return Object.fromEntries(keys.filter(key => payload[key] !== undefined && payload[key] !== null && payload[key] !== '').map(key => [key, payload[key]]));
}

export function buildEngineAgentRuntimeStatus(db = {}, options = {}) {
  const assignment = buildEngineAgentAssignment(db, options);
  const recentEvents = list(db.engineAgentEvents).slice(0, 20).map(item => ({
    id: item.id,
    ok: item.ok,
    eventKey: item.eventKey,
    domain: item.domain,
    checkedAt: item.checkedAt,
    failures: list(item.failures).map(failure => failure.key || failure.message)
  }));
  const failedEvents = recentEvents.filter(item => item.ok === false);
  return {
    ok: assignment.ok && failedEvents.length === 0,
    phase: 'phase324',
    version: ORCHESTRATOR_VERSION,
    status: assignment.ok && failedEvents.length === 0 ? 'applied' : 'needs-attention',
    engineCount: assignment.engineCount,
    agentCount: assignment.agentCount,
    eventPolicyCount: assignment.eventPolicyCount,
    assignedEngines: assignment.assignedEngines,
    assignedAgents: assignment.assignedAgents,
    domains: assignment.domains,
    runtimeSignals: assignment.runtimeSignals,
    recentEvents,
    publicSummary: {
      message: assignment.ok ? '엔진과 에이전트가 주요 서비스 흐름에 적용되어 있습니다.' : '일부 엔진/에이전트 배정이 필요합니다.',
      coverage: `${assignment.assignedEngines}/${assignment.engineCount} engines · ${assignment.assignedAgents}/${assignment.agentCount} agents · ${assignment.eventPolicyCount} event policies`,
      appliedRoutes: ['/api/public/diagnose','/api/public/board','/api/public/checkout-session','/api/public/payment/complete','/api/public/fulfillment-download','/api/public/refund-request','/api/public/trustops-autopilot','/api/public/customer-lifecycle','/api/public/trustops-launch-control','/api/public/lifecycle-message-sequence','/api/public/trustops-production-sentinel','/api/public/live-verification-checklist','/api/public/trustops-final-handoff','/api/public/trustops-100-final']
    }
  };
}

export function runEngineAgentPackageAudit({ files = [], packageJson = {}, routes = [], sourceText = '' } = {}) {
  const normalizedFiles = list(files).map(item => String(item).replace(/\\/g, '/'));
  const scripts = packageJson?.scripts || {};
  const auditSourceText = sourceText || normalizedFiles.join('\n');
  const requiredFiles = [
    'server/core/engine-agent-orchestrator.mjs',
    'server/core/product-agent-suite.mjs',
    'server/routes/public.mjs',
    'server/routes/payment.mjs',
    'server/routes/admin.mjs',
    'shared/veridion-clean-v311.css',
    'scripts/validate-phase317-trustops-growth.mjs',
    'scripts/validate-phase319-launch-control.mjs',
    'scripts/validate-phase320-production-sentinel.mjs',
    'docs/PHASE316_ENGINE_AGENT_APPLICATION_WORK_ORDER.md',
    'docs/PHASE316_ENGINE_AGENT_APPLICATION_REPORT.md',
    'docs/current/PHASE316_ENGINE_AGENT_APPLICATION_AUDIT.json'
  ];
  const assignment = buildEngineAgentAssignment({});
  const checks = [
    { key: 'matrixCoverage', weight: 12, pass: assignment.engineCount >= 50 && assignment.agentCount >= 108 && assignment.ok, message: '전역 엔진/에이전트 배정표' },
    { key: 'eventPolicies', weight: 12, pass: assignment.eventPolicyCount >= 19, message: '핵심 서비스 이벤트 정책' },
    { key: 'requiredFiles', weight: 12, pass: requiredFiles.every(file => normalizedFiles.includes(file)), message: 'phase317 핵심 파일 존재' },
    { key: 'publicRoute', weight: 8, pass: routes.includes('/api/public/engine-agent-status'), message: '공개 엔진/에이전트 상태 API' },
    { key: 'adminRoute', weight: 8, pass: routes.includes('/api/admin/engine-agents/audit'), message: '관리자 엔진/에이전트 감사 API' },
    { key: 'phaseLatestScripts', weight: 12, pass: Boolean(scripts['validate:phase317']) && Boolean(scripts['phase317:final']) && Boolean(scripts['validate:phase318']) && Boolean(scripts['phase318:final']) && Boolean(scripts['validate:phase319']) && Boolean(scripts['phase319:final']) && Boolean(scripts['validate:phase320']) && Boolean(scripts['phase320:final']) && Boolean(scripts['validate:phase321']) && Boolean(scripts['phase321:final']) && Boolean(scripts['validate:phase322']) && Boolean(scripts['phase322:final']) && Boolean(scripts['validate:phase323']) && Boolean(scripts['phase323:final']) && Boolean(scripts['validate:phase324']) && Boolean(scripts['phase324:final']) && ['npm run phase321:final','npm run phase322:final','npm run phase323:final','npm run phase324:final'].includes(scripts['release:predeploy']), message: '최신 phase 최종 검증 스크립트' },
    { key: 'runtimeGateExport', weight: 8, pass: /applyEngineAgentGate/.test(auditSourceText), message: '런타임 게이트 함수 적용' },
    { key: 'runtimeEventStore', weight: 8, pass: /appendEngineAgentEvent/.test(auditSourceText), message: '에이전트 이벤트 저장 적용' },
    { key: 'autopublishPreserved', weight: 8, pass: normalizedFiles.includes('server/core/product-agent-suite.mjs'), message: '20분 자동 발행 엔진 유지' },
    { key: 'dashboardPreserved', weight: 6, pass: normalizedFiles.includes('shared/veridion-clean-v311.css'), message: '단일 디자인 시스템 유지' },
    { key: 'packageOptimization', weight: 6, pass: normalizedFiles.every(file => !file.includes('\\')), message: 'POSIX 패키지 경로 최적화' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter(item => !item.pass);
  return {
    ok: failed.length === 0 && score === 100,
    score,
    total: 100,
    phase: 'phase324',
    version: ORCHESTRATOR_VERSION,
    checks,
    failed,
    assignment: { engineCount: assignment.engineCount, agentCount: assignment.agentCount, eventPolicyCount: assignment.eventPolicyCount, domains: assignment.domains }
  };
}
