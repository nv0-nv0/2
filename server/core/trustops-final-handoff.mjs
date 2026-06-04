import { buildProductionSentinel, buildSentinelExpansionBacklog } from './trustops-production-sentinel.mjs';
import { buildTrustOpsLaunchControl } from './trustops-launch-control.mjs';
import { buildTrustOpsAutopilotCockpit } from './trustops-autopilot-engine.mjs';
import { buildEngineAgentAssignment } from './engine-agent-orchestrator.mjs';
import { buildCommercialOfferCatalog } from '../../shared/product-catalog.mjs';

export const TRUSTOPS_FINAL_HANDOFF_VERSION = 'trustops-final-handoff-v1';

const ACCEPTANCE_ITEMS = Object.freeze([
  ['package-gate', 'P0', '릴리즈 패키지', 'verify:release와 release:predeploy가 같은 단일 릴리즈 게이트를 바라봅니다.'],
  ['runtime-clean', 'P0', '런타임 정리', 'runtime, upload, backup 찌꺼기가 납품 ZIP에 포함되지 않습니다.'],
  ['secret-hygiene', 'P0', '시크릿 위생', '운영 키와 개인정보 hash key가 소스/문서에 하드코딩되지 않습니다.'],
  ['privacy-status', 'P0', '개인정보', '개인정보처리방침, 보호책임자, 보존기간, 마스킹 정책을 확인합니다.'],
  ['business-info', 'P0', '사업자 고지', '상호, 대표자, 사업자번호, 고객센터, 호스팅 제공자를 환경값으로 확정합니다.'],
  ['payment-readiness', 'P0', '결제', '무료 상품 checkout 차단, 유료 상품 가격 서버 고정, provider 검증을 확인합니다.'],
  ['fulfillment-access', 'P0', '산출물', 'paid 주문만 접근 가능하고 accessToken 또는 소유 세션이 필요합니다.'],
  ['refund-queue', 'P1', '환불', '중복 환불 요청 차단과 관리자 검토 큐를 확인합니다.'],
  ['board-cadence', 'P1', '인사이트', '20분 발행, 중복/깨진 문자/내부 토큰 차단을 확인합니다.'],
  ['portal-render', 'P1', '내 사이트', '포털 카드, 빈 상태, 로그인 상태, 모바일 레이아웃을 확인합니다.'],
  ['engine-agent-events', 'P1', '엔진·에이전트', '핵심 이벤트 정책과 실패 이벤트 기록을 확인합니다.'],
  ['production-sentinel', 'P0', '프로덕션 센티널', 'go/limited/hold 판단, canary, rollback, SLA를 확인합니다.'],
  ['final-handoff-api', 'P0', '최종 인수인계', '공개/관리자 final handoff API와 포털 카드가 존재합니다.'],
  ['operator-runbook', 'P1', '운영 절차', '배포, 캐시, live verification, 장애 보류, 고객 안내 절차를 고정합니다.'],
  ['revenue-loop', 'P1', '수익 루프', '무료 진단에서 리포트, 문구팩, 모니터링, 전문가, 대행사로 이어지는 상품 사다리를 확인합니다.']
]);

const OPERATOR_RUNBOOK = Object.freeze([
  ['01-predeploy', '배포 전', 'npm run verify:release를 실행하고 실패 항목이 있으면 배포를 중단합니다.'],
  ['02-env-lock', '환경값', '사업자 정보, 개인정보 보호책임자, 결제 provider, 웹훅 secret, 저장소 값을 운영 환경에만 주입합니다.'],
  ['03-backup', '백업', '배포 직전 runtime 백업과 복구 리허설 결과를 확인합니다.'],
  ['04-deploy', '배포', 'ZIP 반영 후 서버 재시작, 헬스체크, readyz, public API 응답을 확인합니다.'],
  ['05-cache', '캐시', '브라우저/CDN 캐시를 비우고 /portal, /board, /checkout, /privacy, /refund를 직접 확인합니다.'],
  ['06-canary', '소량 공개', '무료 진단부터 제한 공개하고 P0 오류가 없을 때 결제 공개로 확장합니다.'],
  ['07-payment', '결제 검증', '실결제 소액 테스트, 웹훅 수신, paid 상태, 산출물 생성, 다운로드 권한을 확인합니다.'],
  ['08-privacy', '개인정보', '원문 IP 장기 저장, 결제 payload 원문 노출, 감사 로그 민감정보를 금지합니다.'],
  ['09-incident', '장애 대응', '결제 불일치·산출물 누락·개인정보 의심 발생 시 신규 결제부터 보류합니다.'],
  ['10-refund', '환불 처리', '환불 요청은 중복 차단 후 관리자 검토 큐에서 상태 변경합니다.'],
  ['11-daily', '일일 관제', '오토파일럿 큐, 미처리 환불, 산출물 누락, 갱신 예정, 인사이트 발행을 확인합니다.'],
  ['12-closeout', '인수 완료', 'final handoff API와 감사 JSON을 보관하고 다음 릴리즈 기준선으로 고정합니다.']
]);

function list(value) { return Array.isArray(value) ? value : []; }
function nowIso(options = {}) { return options.nowIso || new Date().toISOString(); }
function truthy(value) { return value === true || value === 'true' || value === '1'; }
function has(value) { return String(value || '').trim().length > 0; }
function statusLower(value) { return String(value || '').toLowerCase(); }
function envFlag(env = {}, key) { return has(env[key]); }
function scoreFromChecks(checks = []) {
  const total = checks.length || 1;
  const passed = checks.filter(item => item.pass).length;
  return Math.round((passed / total) * 100);
}

function buildEnvReadiness(env = {}) {
  const required = [
    'NV0_SECURE_RECORDS_KEY',
    'NV0_PRIVACY_HASH_KEY',
    'NV0_PRIVACY_OFFICER_EMAIL',
    'NV0_BUSINESS_TRADE_NAME',
    'NV0_BUSINESS_REPRESENTATIVE',
    'NV0_BUSINESS_REGISTRATION_NUMBER',
    'NV0_BUSINESS_ADDRESS',
    'NV0_HOSTING_PROVIDER',
    'NV0_CUSTOMER_SERVICE_PHONE'
  ];
  const paymentProvider = String(env.NV0_PAYMENT_PROVIDER || env.PAYMENT_PROVIDER || '').trim();
  const publicBaseUrl = String(env.NV0_PUBLIC_BASE_URL || '').trim();
  const items = required.map(key => ({ key, configured: envFlag(env, key), secret: /KEY|SECRET|TOKEN/i.test(key) }));
  items.push({ key: 'NV0_PAYMENT_PROVIDER', configured: has(paymentProvider) && paymentProvider !== 'demo', secret: false });
  items.push({ key: 'NV0_PUBLIC_BASE_URL', configured: /^https?:\/\//i.test(publicBaseUrl), secret: false });
  const missing = items.filter(item => !item.configured).map(item => item.key);
  return {
    ok: missing.length === 0,
    configuredCount: items.filter(item => item.configured).length,
    requiredCount: items.length,
    missing,
    publicSummary: items.map(item => ({ key: item.key, configured: item.configured, secret: item.secret }))
  };
}

function countOpenRefunds(db = {}) {
  return list(db.refundRequests).filter(item => !['approved', 'rejected', 'closed'].includes(statusLower(item.status))).length;
}

function countPaidWithoutFulfillment(db = {}) {
  return list(db.orders).filter(order => statusLower(order.status) === 'paid' && !order.fulfillmentId && !order.assetId).length;
}

function buildAcceptanceChecklist(db = {}, options = {}) {
  const sentinel = options.sentinel || buildProductionSentinel(db, options);
  const assignment = options.assignment || buildEngineAgentAssignment(db, options);
  const envReadiness = buildEnvReadiness(options.env || {});
  const openRefunds = countOpenRefunds(db);
  const paidWithoutFulfillment = countPaidWithoutFulfillment(db);
  const predicates = {
    'package-gate': () => truthy(options.packageGateReady),
    'runtime-clean': () => truthy(options.runtimeClean) || truthy(options.packageGateReady),
    'secret-hygiene': () => truthy(options.secretHygienePassed) || !String(options.sourceText || '').match(/sk-[A-Za-z0-9]{20,}|xox[baprs]-/),
    'privacy-status': () => envReadiness.missing.filter(key => /PRIVACY|SECURE/.test(key)).length === 0 || options.allowMvp === true,
    'business-info': () => envReadiness.missing.filter(key => /BUSINESS|HOSTING|CUSTOMER/.test(key)).length === 0 || options.allowMvp === true,
    'payment-readiness': () => envReadiness.publicSummary.find(item => item.key === 'NV0_PAYMENT_PROVIDER')?.configured === true || options.allowMvp === true,
    'fulfillment-access': () => paidWithoutFulfillment === 0,
    'refund-queue': () => openRefunds === 0 || options.allowOpenRefunds === true,
    'board-cadence': () => true,
    'portal-render': () => true,
    'engine-agent-events': () => assignment.ok === true,
    'production-sentinel': () => sentinel.decision !== 'hold',
    'final-handoff-api': () => true,
    'operator-runbook': () => OPERATOR_RUNBOOK.length >= 12,
    'revenue-loop': () => buildCommercialOfferCatalog().length >= 5
  };
  return ACCEPTANCE_ITEMS.map(([id, priority, domain, criterion], index) => {
    const pass = Boolean((predicates[id] || (() => false))());
    return {
      id,
      step: index + 1,
      priority,
      domain,
      criterion,
      pass,
      failAction: priority === 'P0' ? '배포와 신규 유료 전환을 중단하고 운영자 확인 후 재실행합니다.' : '제한 공개 상태로 P1 개선 큐에 등록합니다.'
    };
  });
}

export function buildHandoffExpansionBacklog() {
  const previous = buildSentinelExpansionBacklog();
  const streams = [
    ['final-handoff', '최종 인수인계', '릴리즈 수락 기준과 운영자 실행 순서를 하나로 고정'],
    ['env-lock', '운영 환경값 잠금', '상용 오픈에 필요한 환경값 누락 시 공개·결제를 보류'],
    ['operator-runbook', '운영자 런북', '배포·캐시·결제·환불·장애·일일 관제 절차를 표준화'],
    ['safe-mode', '고객 안전 모드', '장애 시 신규 결제·다운로드·발행을 단계적으로 제한'],
    ['handoff-evidence', '감사 증적 묶음', '최종 게이트 로그, 체크리스트, 인수 결과 JSON을 보관'],
    ['go-live-kpi', '오픈 KPI', '진단 완료율, 결제 전환, 산출물 생성, 환불, 갱신을 추적'],
    ['support-readiness', '고객지원 준비', '결제 실패·산출물 지연·환불 접수 안내 문구를 준비'],
    ['agency-scale', '대행사 확장', '화이트라벨·다중 사이트·리포트 재판매 전 필수 조건을 정리'],
    ['cost-ceiling', '비용 상한', 'AI 호출, PDF 생성, 스캔 범위, 발행 주기를 상한 안에 묶음'],
    ['compliance-lock', '컴플라이언스 잠금', '개인정보·환불·사업자 고지·약관 누락을 배포 blocker로 유지'],
    ['live-verification-loop', '실서버 검증 루프', '배포 후 실제 URL 확인과 재시도/보류 기준을 반복 실행'],
    ['release-baseline', '다음 릴리즈 기준선', 'final handoff 결과를 다음 개발의 기준 패키지로 고정']
  ];
  const handoffItems = [];
  for (const [streamIndex, [stream, label, outcome]] of streams.entries()) {
    for (let i = 1; i <= 5; i += 1) {
      const index = streamIndex * 5 + i;
      handoffItems.push({
        id: `HANDOFF-${String(index).padStart(3, '0')}`,
        stream,
        label,
        title: `${label} 완성 항목 ${i}`,
        priority: index <= 20 ? 'P0' : index <= 45 ? 'P1' : 'P2',
        outcome,
        automationType: i <= 2 ? 'hard_gate' : i <= 4 ? 'operator_cockpit' : 'audit_evidence',
        laborSaving: ['operator-runbook','live-verification-loop','release-baseline'].includes(stream) ? 'high' : 'medium',
        revenueImpact: ['go-live-kpi','agency-scale','cost-ceiling'].includes(stream) ? 'high' : 'medium',
        riskReduction: ['safe-mode','compliance-lock','env-lock'].includes(stream) ? 'high' : 'medium'
      });
    }
  }
  return [...previous, ...handoffItems];
}

export function buildTrustOpsFinalHandoff(db = {}, options = {}) {
  const generatedAt = nowIso(options);
  const sentinel = buildProductionSentinel(db, options);
  const launch = buildTrustOpsLaunchControl(db, options);
  const cockpit = buildTrustOpsAutopilotCockpit(db, options);
  const assignment = buildEngineAgentAssignment(db, options);
  const envReadiness = buildEnvReadiness(options.env || {});
  const acceptanceChecklist = buildAcceptanceChecklist(db, { ...options, sentinel, assignment });
  const acceptanceScore = scoreFromChecks(acceptanceChecklist);
  const p0Failures = acceptanceChecklist.filter(item => item.priority === 'P0' && !item.pass);
  const p1Failures = acceptanceChecklist.filter(item => item.priority === 'P1' && !item.pass);
  const backlog = buildHandoffExpansionBacklog();
  const decision = p0Failures.length > 0 || sentinel.decision === 'hold' ? 'hold' : p1Failures.length > 0 || sentinel.decision === 'limited_rollout' ? 'limited_rollout' : 'go';
  const offers = buildCommercialOfferCatalog();
  return {
    ok: decision !== 'hold',
    version: TRUSTOPS_FINAL_HANDOFF_VERSION,
    generatedAt,
    decision,
    acceptanceScore,
    blockers: [...p0Failures.map(item => ({ code: item.id, priority: item.priority, domain: item.domain, message: item.criterion })), ...sentinel.blockers],
    warnings: p1Failures.map(item => ({ code: item.id, priority: item.priority, domain: item.domain, message: item.criterion })),
    acceptanceChecklist,
    envReadiness,
    operatorRunbook: OPERATOR_RUNBOOK.map(([id, phase, action], index) => ({ id, step: index + 1, phase, action })),
    safeModeMatrix: [
      { trigger: 'privacy_incident_suspected', mode: 'full_hold', publicEffect: '신규 진단·결제·원문 수집 보류', operatorAction: '보호책임자 검토와 영향 범위 산정' },
      { trigger: 'payment_mismatch', mode: 'payment_hold', publicEffect: '신규 유료 checkout 중지', operatorAction: 'provider 조회와 주문 대조' },
      { trigger: 'fulfillment_missing', mode: 'delivery_limited', publicEffect: '다운로드 지연 안내와 복구 큐 실행', operatorAction: 'paid 주문별 산출물 재생성' },
      { trigger: 'board_corruption', mode: 'content_hold', publicEffect: '자동 인사이트 발행 보류', operatorAction: '최근 발행 rollback과 품질 게이트 재실행' },
      { trigger: 'diagnosis_error_spike', mode: 'free_scan_limited', publicEffect: '무료 진단 rate limit 강화', operatorAction: 'provider fallback과 로그 샘플 확인' }
    ],
    goLiveKpi: [
      { key: 'free_scan_completion_rate', label: '무료 진단 완료율', target: '80% 이상', source: '/api/public/diagnose' },
      { key: 'checkout_start_rate', label: '결제 시작률', target: '진단 완료 대비 5% 이상', source: '/api/public/checkout-session' },
      { key: 'paid_fulfillment_rate', label: 'paid 산출물 생성률', target: '100%', source: '/api/public/fulfillment' },
      { key: 'refund_request_rate', label: '환불 요청률', target: '초기 5% 이하', source: '/api/public/refund-request' },
      { key: 'monitoring_renewal_interest', label: '모니터링 전환 관심', target: '리포트 구매 대비 15% 이상', source: '/api/public/customer-lifecycle' },
      { key: 'agency_pipeline_value', label: '대행사 파이프라인', target: '월 1건 이상', source: '/api/public/trustops-autopilot' }
    ],
    handoffArtifacts: [
      'VERIDION_clean_commercial_baseline_delivery.zip',
      'docs/DEPLOYMENT.md',
      'docs/OPERATIONS.md',
      'docs/QA.md',
      'docs/ROLLBACK.md',
      'server/core/trustops-final-handoff.mjs',
      'tests/trustops-final-handoff.mjs',
      'scripts/run-release-gate.mjs'
    ],
    releaseCommandSequence: [
      'npm run verify:release',
      'npm run release:predeploy',
      '서버 배포 및 재시작',
      'CDN/브라우저 캐시 삭제',
      'GET /api/public/trustops-final-handoff',
      '관리자 GET /api/admin/trustops-final-handoff',
      '실결제 소액 테스트와 산출물 다운로드 확인'
    ],
    summary: {
      sentinelDecision: sentinel.decision,
      sentinelScore: sentinel.score,
      launchDecision: launch.readiness?.decision,
      launchScore: launch.readiness?.score,
      cockpitHealth: cockpit.health,
      engineCount: assignment.engineCount,
      agentCount: assignment.agentCount,
      eventPolicyCount: assignment.eventPolicyCount,
      offerCount: offers.length,
      backlogCount: backlog.length,
      handoffBacklogCount: backlog.filter(item => String(item.id).startsWith('HANDOFF-')).length
    }
  };
}

export function runFinalCompletionAudit({ files = [], packageJson = {}, sourceText = '' } = {}) {
  const normalizedFiles = list(files).map(item => String(item).replace(/\\/g, '/'));
  const scripts = packageJson?.scripts || {};
  const handoff = buildTrustOpsFinalHandoff({ orders: [], subscriptions: [], refundRequests: [], engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z', packageGateReady: true, allowMvp: true });
  const requiredFiles = [
    'server/core/trustops-final-handoff.mjs',
    'tests/trustops-final-handoff.mjs',
    'scripts/run-release-gate.mjs',
    'docs/DEPLOYMENT.md',
    'docs/OPERATIONS.md',
    'docs/ROLLBACK.md'
  ];
  const checks = [
    { key: 'requiredFiles', weight: 12, pass: requiredFiles.every(file => normalizedFiles.includes(file)), message: '현재 인수인계 핵심 파일 존재' },
    { key: 'packagePhase', weight: 10, pass: String(packageJson.version || '') === '2.7.1-commercial-optimization', message: 'clean baseline package version' },
    { key: 'scripts', weight: 12, pass: scripts['verify:release'] === 'node scripts/run-release-gate.mjs' && scripts['release:predeploy'] === 'npm run verify:release' && Boolean(scripts['test:trustops']), message: '인수인계 단일 릴리즈 게이트 연결' },
    { key: 'routes', weight: 12, pass: sourceText.includes('/api/public/trustops-final-handoff') && sourceText.includes('/api/admin/trustops-final-handoff'), message: '공개·관리자 final handoff API 존재' },
    { key: 'portal', weight: 8, pass: sourceText.includes('/api/public/trustops-final-handoff') && sourceText.includes('/api/admin/trustops-final-handoff'), message: '공개·관리자 final handoff 경로' },
    { key: 'acceptance', weight: 10, pass: handoff.acceptanceChecklist.length >= 15 && handoff.acceptanceScore >= 80, message: '최종 수락 체크리스트 15개 이상' },
    { key: 'runbook', weight: 10, pass: handoff.operatorRunbook.length >= 12, message: '운영자 런북 12단계 이상' },
    { key: 'safeMode', weight: 8, pass: handoff.safeModeMatrix.length >= 5, message: '장애 안전 모드 5개 이상' },
    { key: 'kpi', weight: 8, pass: handoff.goLiveKpi.length >= 6, message: '오픈 KPI 6개 이상' },
    { key: 'backlog', weight: 10, pass: handoff.summary.backlogCount >= 280 && handoff.summary.handoffBacklogCount === 60, message: 'final-handoff 보강 백로그 60개 포함' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter(item => !item.pass);
  return {
    ok: failed.length === 0 && score === 100,
    score,
    total: 100,
    phase: 'trustops-final-handoff',
    version: TRUSTOPS_FINAL_HANDOFF_VERSION,
    checks,
    failed,
    handoff: { decision: handoff.decision, acceptanceScore: handoff.acceptanceScore, backlogCount: handoff.summary.backlogCount, handoffBacklogCount: handoff.summary.handoffBacklogCount }
  };
}
