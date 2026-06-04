import { buildTrustOpsLaunchControl, buildLaunchExpansionBacklog } from './trustops-launch-control.mjs';
import { buildTrustOpsAutopilotCockpit, buildAutomationWorkQueue } from './trustops-autopilot-engine.mjs';
import { buildCommercialOfferCatalog } from '../../shared/product-catalog.mjs';

export const TRUSTOPS_PRODUCTION_SENTINEL_VERSION = 'trustops-production-sentinel-v1';

const LIVE_CHECKS = Object.freeze([
  ['public-home', '/', '공개 홈 200 응답과 CTA 확인', 'P0'],
  ['public-demo', '/products/veridion/demo', '무료 진단 화면 진입 확인', 'P0'],
  ['public-board', '/board', '인사이트 목록과 20분 발행 상태 확인', 'P1'],
  ['public-portal', '/portal', '내 사이트 대시보드 카드 렌더링 확인', 'P1'],
  ['public-plans', '/plans', '요금제, 제공 범위, 수동 갱신 고지 확인', 'P0'],
  ['checkout', '/checkout', '결제 전 동의·대상 사이트·가격 고정 안내 확인', 'P0'],
  ['privacy', '/privacy', '개인정보처리방침과 보호책임자 노출 확인', 'P0'],
  ['terms', '/terms', '이용약관과 서비스 한계 고지 확인', 'P1'],
  ['refund', '/refund', '환불·청약철회·디지털 산출물 고지 확인', 'P0'],
  ['business-info', '/business-info', '사업자 정보와 고객지원 채널 확인', 'P0'],
  ['health', '/readyz', '운영 준비 상태 확인', 'P0'],
  ['api-launch', '/api/public/trustops-launch-control', '런칭 컨트롤 API 확인', 'P1'],
  ['api-sentinel', '/api/public/trustops-production-sentinel', '프로덕션 센티널 API 확인', 'P0']
]);

const ROLLBACK_TRIGGERS = Object.freeze([
  ['payment_mismatch', '결제 금액·주문 상태 불일치', 'immediate_hold', ['신규 결제 차단', '웹훅 inbox 보존', 'PortOne 조회 재동기화', '주문별 수동 대조']],
  ['fulfillment_missing', 'paid 주문 산출물 누락', 'limited_rollout', ['산출물 복구 큐 실행', '다운로드 지연 안내', '관리자 P0 처리']],
  ['privacy_incident', '개인정보 노출 의심', 'full_hold', ['로그 원문 수집 중지', '보호책임자 검토', '영향 범위 산정', '신고·통지 필요성 검토']],
  ['admin_auth_failure', '관리자 인증·권한 이상', 'admin_lockdown', ['관리자 세션 폐기', 'IP allowlist 확인', '감사 로그 보존']],
  ['diagnosis_error_spike', '무료 진단 5xx 증가', 'free_scan_limited', ['진단 provider fallback', 'rate limit 강화', '오류 샘플 수집']],
  ['board_publication_corruption', '인사이트 깨짐·중복·내부 토큰 노출', 'content_hold', ['자동 발행 중지', '최근 발행 rollback', '품질 게이트 재실행']],
  ['storage_unavailable', 'DB/스토리지/백업 쓰기 실패', 'read_only_mode', ['쓰기 기능 제한', '백업 복구 상태 확인', '운영자 알림']]
]);

const SLA_TIERS = Object.freeze([
  ['P0', '결제·개인정보·산출물 접근 장애', '15분 내 확인', '2시간 내 1차 조치'],
  ['P1', '진단·포털·인사이트 주요 기능 오류', '1시간 내 확인', '영업일 1일 내 조치'],
  ['P2', '문구·표시·보조 기능 개선', '영업일 1일 내 확인', '영업일 3일 내 조치']
]);

function list(value) { return Array.isArray(value) ? value : []; }
function statusLower(value) { return String(value || '').toLowerCase(); }
function nowIso(options = {}) { return options.nowIso || new Date().toISOString(); }
function countPaidWithoutFulfillment(db = {}) { return list(db.orders).filter(order => statusLower(order.status) === 'paid' && !order.fulfillmentId && !order.assetId).length; }
function countOpenRefunds(db = {}) { return list(db.refundRequests).filter(item => !['approved','rejected','closed'].includes(statusLower(item.status))).length; }
function countFailedAgentEvents(db = {}) { return list(db.engineAgentEvents).filter(item => item.ok === false).length; }
function countDueSubscriptions(db = {}, options = {}) {
  const now = new Date(nowIso(options)).getTime();
  return list(db.subscriptions).filter(sub => statusLower(sub.status) === 'active' && sub.expiresAt && (new Date(sub.expiresAt).getTime() - now) <= 7 * 86_400_000).length;
}
function toBool(value) { return value === true || value === 'true' || value === '1'; }

export function buildSentinelExpansionBacklog() {
  const previous = buildLaunchExpansionBacklog();
  const streams = [
    ['live-verification', '실서버 검증 자동화', '배포 직후 13개 공개/관리자/상태 체크를 표준화'],
    ['rollback', '롤백·홀드 조건', '결제·개인정보·산출물·진단 장애별 차단 단계를 분리'],
    ['sla', '운영 SLA', 'P0/P1/P2 확인·조치 시간을 고정'],
    ['cost-quality', '비용·품질 예산', 'AI 호출, PDF 생성, 진단 수집, 발행 주기를 예산화'],
    ['evidence-pack', '감사 증적 패키지', '오픈 판단, 환경값, 검증 로그, 사고 대응 근거를 묶음'],
    ['operator-digest', '운영자 일일 요약', '매일 확인해야 할 큐와 매출·갱신·환불 지표를 압축'],
    ['customer-safe-mode', '고객 안전 모드', '장애 시 신규 결제와 다운로드를 단계적으로 제한'],
    ['agency-readiness', '대행사 확장 준비', '화이트라벨·다중 사이트·재판매 리포트 오픈 전 조건을 분리'],
    ['data-governance', '데이터 거버넌스', '보존기간, 원문 로그 제한, 개인정보 최소화를 운영 지표화'],
    ['release-discipline', '릴리즈 규율', 'release gate, predeploy, live verification, rollback drill을 하나로 고정']
  ];
  const sentinelItems = [];
  for (const [streamIndex, [stream, label, outcome]] of streams.entries()) {
    for (let i = 1; i <= 5; i += 1) {
      const index = streamIndex * 5 + i;
      sentinelItems.push({
        id: `SENTINEL-${String(index).padStart(3, '0')}`,
        stream,
        label,
        title: `${label} 고도화 ${i}`,
        priority: index <= 15 ? 'P0' : index <= 35 ? 'P1' : 'P2',
        outcome,
        automationType: i <= 2 ? 'live_gate' : i <= 4 ? 'operator_runbook' : 'audit_evidence',
        laborSaving: ['live-verification','operator-digest','release-discipline'].includes(stream) ? 'high' : 'medium',
        riskReduction: ['rollback','data-governance','customer-safe-mode'].includes(stream) ? 'high' : 'medium',
        revenueImpact: ['agency-readiness','cost-quality','operator-digest'].includes(stream) ? 'high' : 'medium'
      });
    }
  }
  return [...previous, ...sentinelItems];
}

export function buildLiveVerificationChecklist(input = {}, options = {}) {
  const baseUrl = String(input.baseUrl || options.baseUrl || '').replace(/\/$/, '');
  return {
    ok: true,
    version: TRUSTOPS_PRODUCTION_SENTINEL_VERSION,
    generatedAt: nowIso(options),
    baseUrl: baseUrl || '운영 URL 설정 후 실행',
    checks: LIVE_CHECKS.map(([id, path, purpose, priority], index) => ({
      id,
      step: index + 1,
      priority,
      method: 'GET',
      path,
      url: baseUrl ? `${baseUrl}${path}` : path,
      purpose,
      expected: id.startsWith('api-') || id === 'health' ? 'JSON ok 또는 준비 상태 응답' : '200 HTML, 깨짐 없는 렌더링, 핵심 CTA 표시',
      failAction: priority === 'P0' ? '신규 유료 전환 또는 전체 공개 보류' : '제한 공개 후 P1 큐 등록'
    })),
    minimumPass: { p0: 8, p1: 5, total: LIVE_CHECKS.length },
    commandSequence: [
      'npm run release:predeploy',
      'npm run check:release-secret-hygiene',
      'npm run check:links',
      'node scripts/check-live-public.mjs',
      '실서버 /api/public/trustops-production-sentinel 확인'
    ]
  };
}

export function buildCanaryStages(readiness = {}) {
  const hardHold = readiness.decision === 'hold';
  return [
    { stage: 0, name: 'staff_only', label: '운영자 내부 검증', traffic: '0%', allowed: true, exit: 'production-sentinel release gate, secret hygiene, runtime clean 통과' },
    { stage: 1, name: 'free_scan_canary', label: '무료 진단 소량 공개', traffic: '5%', allowed: !hardHold, exit: '진단 20건 중 5xx 0건, P0 0개' },
    { stage: 2, name: 'report_checkout_canary', label: '기본 리포트 결제 제한 공개', traffic: '10%', allowed: readiness.decision === 'go', exit: '결제 3건 산출물 자동 생성 100%' },
    { stage: 3, name: 'monitoring_expert_canary', label: '모니터링·전문가 플랜 공개', traffic: '25%', allowed: readiness.decision === 'go', exit: '수동 갱신 고지, 접근 만료, 환불 큐 정상' },
    { stage: 4, name: 'agency_expansion', label: '대행사 화이트라벨 문의 확장', traffic: '50%~100%', allowed: readiness.decision === 'go', exit: '다중 사이트, PDF, 관리자 큐 SLA 확인' }
  ];
}

export function buildProductionSentinel(db = {}, options = {}) {
  const launch = buildTrustOpsLaunchControl(db, options);
  const cockpit = buildTrustOpsAutopilotCockpit(db, options);
  const queue = buildAutomationWorkQueue(db, options);
  const backlog = buildSentinelExpansionBacklog();
  const liveVerification = buildLiveVerificationChecklist({ baseUrl: options.baseUrl || options.env?.NV0_PUBLIC_BASE_URL }, options);
  const paidWithoutFulfillment = countPaidWithoutFulfillment(db);
  const openRefunds = countOpenRefunds(db);
  const failedAgentEvents = countFailedAgentEvents(db);
  const dueSubscriptions = countDueSubscriptions(db, options);
  const blockers = [];
  if (launch.readiness.decision === 'hold') blockers.push({ code: 'launch_control_hold', severity: 'P0', message: '런칭 컨트롤이 보류 상태입니다.' });
  if (paidWithoutFulfillment > 0) blockers.push({ code: 'paid_without_fulfillment', severity: 'P0', count: paidWithoutFulfillment, message: 'paid 주문 산출물 누락 가능성이 있습니다.' });
  if (failedAgentEvents > 0) blockers.push({ code: 'failed_engine_agent_events', severity: 'P1', count: failedAgentEvents, message: '실패한 엔진·에이전트 이벤트가 있습니다.' });
  if (openRefunds > 0) blockers.push({ code: 'open_refunds', severity: 'P1', count: openRefunds, message: '처리 대기 환불 요청이 있습니다.' });
  const p0 = blockers.filter(item => item.severity === 'P0').length;
  const p1 = blockers.filter(item => item.severity === 'P1').length;
  const score = Math.max(0, Math.min(100, 100 - p0 * 30 - p1 * 10));
  const decision = p0 > 0 ? 'hold' : p1 > 0 ? 'limited_rollout' : 'go';
  const offers = buildCommercialOfferCatalog();
  const costQualityBudget = {
    aiCallPolicy: '룰/정규식 1차 판정 후 필요한 문구 생성에만 AI 호출',
    maxPublicScanPages: Number(options.maxPages || 10),
    reportGeneration: 'paid 검증 후 1회 생성, 같은 주문 재다운로드는 캐시 사용',
    boardCadence: '20분 1회 발행 유지, 품질 실패 시 자동 보류',
    revenueGuard: offers.map(offer => ({ code: offer.code, price: offer.price, accessDurationDays: offer.accessDurationDays || null, renewalMode: offer.renewalMode || 'none' }))
  };
  return {
    ok: true,
    version: TRUSTOPS_PRODUCTION_SENTINEL_VERSION,
    generatedAt: nowIso(options),
    decision,
    score,
    blockers,
    liveVerification,
    canaryStages: buildCanaryStages(launch.readiness),
    rollbackMatrix: ROLLBACK_TRIGGERS.map(([code, trigger, mode, actions]) => ({ code, trigger, mode, actions })),
    slaMatrix: SLA_TIERS.map(([priority, scope, acknowledgement, target]) => ({ priority, scope, acknowledgement, target })),
    operationalDigest: {
      queue: cockpit.counts?.queue || queue.length,
      p0: cockpit.counts?.p0 || 0,
      openRefunds,
      paidWithoutFulfillment,
      failedAgentEvents,
      dueSubscriptions,
      nextBestOffer: cockpit.nextBestOffer || null,
      mrr: cockpit.revenue?.monthlyRecurringRevenue || 0,
      pipeline: cockpit.revenue?.pipelineRevenue || 0
    },
    costQualityBudget,
    backlogCount: backlog.length,
    sentinelBacklogCount: backlog.filter(item => String(item.id).startsWith('SENTINEL-')).length,
    releaseCommands: [
      'npm run verify:release',
      'npm run release:predeploy',
      'npm run clean:runtime',
      'node scripts/check-live-public.mjs',
      '관리자 /api/admin/trustops-production-sentinel 확인'
    ],
    operatorGuardrails: [
      'P0 blocker가 있으면 신규 결제와 전체 공개를 보류합니다.',
      '개인정보 노출 의심 시 추가 원문 수집을 중지하고 보호책임자 검토 큐로 넘깁니다.',
      '자동정기결제가 구현되기 전까지 Monitoring, Expert, Agency는 수동 갱신형으로만 표시합니다.',
      'paid 주문 산출물 누락은 매출 손실보다 우선하는 P0로 처리합니다.',
      '실서버 배포 후 브라우저/CDN 캐시를 비우고 portal, board, checkout, privacy, refund를 직접 확인합니다.'
    ]
  };
}

export function runProductionSentinelAudit({ files = [], packageJson = {}, sourceText = '' } = {}) {
  const normalizedFiles = list(files).map(item => String(item).replace(/\\/g, '/'));
  const scripts = packageJson?.scripts || {};
  const source = sourceText || normalizedFiles.join('\n');
  const sentinel = buildProductionSentinel({ orders: [], subscriptions: [], refundRequests: [], engineAgentEvents: [] }, { nowIso: '2026-05-27T00:00:00.000Z' });
  const requiredFiles = [
    'server/core/trustops-production-sentinel.mjs',
    'tests/trustops-production-sentinel.mjs',
    'scripts/run-release-gate.mjs',
    'docs/OPERATIONS.md',
    'docs/ROLLBACK.md',
    'scripts/monitoring-rollback-gate.mjs'
  ];
  const checks = [
    { key: 'requiredFiles', weight: 12, pass: requiredFiles.every(file => normalizedFiles.includes(file)), message: '현재 센티널 핵심 파일 존재' },
    { key: 'packagePhase', weight: 10, pass: String(packageJson.version || '') === '2.7.1-commercial-optimization', message: 'clean baseline package version' },
    { key: 'scripts', weight: 12, pass: scripts['verify:release'] === 'node scripts/run-release-gate.mjs' && scripts['release:predeploy'] === 'npm run verify:release' && Boolean(scripts['monitoring:rollback']), message: '센티널·롤백 단일 게이트 연결' },
    { key: 'routes', weight: 12, pass: source.includes('/api/public/trustops-production-sentinel') && source.includes('/api/admin/trustops-production-sentinel') && source.includes('/api/public/live-verification-checklist'), message: '공개·관리자 sentinel API 존재' },
    { key: 'backlog', weight: 10, pass: sentinel.backlogCount >= 220 && sentinel.sentinelBacklogCount === 50, message: 'production-sentinel 보강 백로그 50개 이상' },
    { key: 'liveChecks', weight: 10, pass: sentinel.liveVerification.checks.length >= 13, message: '실서버 검증 체크 13개 이상' },
    { key: 'rollback', weight: 10, pass: sentinel.rollbackMatrix.length >= 7, message: '롤백 트리거 7개 이상' },
    { key: 'sla', weight: 8, pass: sentinel.slaMatrix.length >= 3, message: '운영 SLA P0/P1/P2' },
    { key: 'portal', weight: 8, pass: source.includes('/api/public/trustops-production-sentinel') && source.includes('/api/admin/trustops-production-sentinel'), message: '공개·관리자 sentinel 관제 경로' },
    { key: 'enginePolicy', weight: 8, pass: source.includes('trustops.production_sentinel') && source.includes('production-sentinel-engine'), message: '엔진·에이전트 정책 연결' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter(item => !item.pass);
  return {
    ok: failed.length === 0 && score === 100,
    score,
    total: 100,
    phase: 'trustops-production-sentinel',
    version: TRUSTOPS_PRODUCTION_SENTINEL_VERSION,
    checks,
    failed,
    sentinel: { decision: sentinel.decision, score: sentinel.score, backlogCount: sentinel.backlogCount, sentinelBacklogCount: sentinel.sentinelBacklogCount, liveCheckCount: sentinel.liveVerification.checks.length }
  };
}
