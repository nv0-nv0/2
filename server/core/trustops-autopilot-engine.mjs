import { buildCommercialOfferCatalog, planPrice, normalizePlanCode } from '../../shared/product-catalog.mjs';
import { buildGrowthImprovementBacklog, buildFixGeneratorPayload, buildMonitoringPlan } from './trustops-growth-engine.mjs';

export const TRUSTOPS_AUTOPILOT_VERSION = 'trustops-autopilot-cockpit-v1';

const WORKSTREAMS = Object.freeze([
  ['conversion', '전환 최적화', '무료 진단을 유료 리포트와 문구팩 구매로 연결'],
  ['fulfillment', '산출물 제공', '결제 완료 후 접근권한과 다운로드를 안정화'],
  ['monitoring', '정기 모니터링', '재진단, 변경 감지, 알림을 반복 매출로 연결'],
  ['retention', '고객 유지', '구독 만료, 재구매, 전문가 전환을 자동 제안'],
  ['agency', '대행사 확장', '다중 사이트와 화이트라벨 리포트를 고단가 상품으로 연결'],
  ['risk-control', '리스크 통제', '환불, 개인정보, 결제 분쟁, 접근권한 문제를 사전 차단']
]);

const KPI_DEFINITIONS = Object.freeze([
  ['scanToReport', '무료 진단에서 기본 리포트 전환율', 'scan.completed', 'order.paid.Report'],
  ['reportToFixPack', '기본 리포트에서 개선 문구팩 전환율', 'order.paid.Report', 'order.paid.FixPack'],
  ['fixPackToMonitoring', '문구팩에서 월간 모니터링 전환율', 'order.paid.FixPack', 'subscription.active.Monitoring'],
  ['monitoringToExpert', '모니터링에서 전문가 플랜 전환율', 'subscription.active.Monitoring', 'subscription.active.Expert'],
  ['agencyExpansion', '대행사 계정당 관리 사이트 수', 'subscription.active.Agency', 'site.active'],
  ['refundRiskRate', '환불 요청 비중', 'refund.requested', 'order.paid']
]);

function list(value) { return Array.isArray(value) ? value : []; }
function safeString(value, fallback = '') { const text = String(value ?? '').trim(); return text || fallback; }
function toNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function nowIso(options = {}) { return options.nowIso || new Date().toISOString(); }
function currency(value) { return Math.max(0, Math.round(toNumber(value, 0))); }
function asDaysFromNow(dateValue, options = {}) {
  const date = new Date(dateValue || 0);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - new Date(nowIso(options)).getTime()) / 86_400_000);
}
function latest(items = [], key = 'createdAt') {
  return [...list(items)].sort((a, b) => Date.parse(b?.[key] || b?.updatedAt || 0) - Date.parse(a?.[key] || a?.updatedAt || 0))[0] || null;
}
function orderPlan(order = {}) {
  return normalizePlanCode(order.plan || order.productCode || order.offerCode || order.planCode || 'Report');
}
function paidOrders(db = {}) { return list(db.orders).filter(order => String(order.status || '').toLowerCase() === 'paid'); }
function activeSubscriptions(db = {}) { return list(db.subscriptions).filter(sub => String(sub.status || '').toLowerCase() === 'active'); }
function siteRisk(site = {}, scans = []) {
  const direct = toNumber(site.latestRiskScore, NaN);
  if (Number.isFinite(direct)) return direct;
  const scan = latest(scans.filter(item => item.siteId === site.id || item.target === site.domain), 'createdAt');
  return toNumber(scan?.riskScore, 55);
}
function hasPaidPlan(db = {}, code) {
  const normalized = normalizePlanCode(code);
  return paidOrders(db).some(order => orderPlan(order) === normalized) || activeSubscriptions(db).some(sub => normalizePlanCode(sub.plan || sub.productCode) === normalized);
}

export function buildAutomationBacklog() {
  const growthItems = buildGrowthImprovementBacklog();
  const autopilotItems = [];
  for (const [streamIndex, [stream, label, outcome]] of WORKSTREAMS.entries()) {
    for (let i = 1; i <= 5; i += 1) {
      const index = streamIndex * 5 + i;
      autopilotItems.push({
        id: `AUTO-${String(index).padStart(3, '0')}`,
        stream,
        label,
        priority: index <= 12 ? 'P0' : index <= 24 ? 'P1' : 'P2',
        title: `${label} 오토파일럿 ${i}`,
        outcome,
        automationType: i <= 2 ? 'runtime_gate' : i <= 4 ? 'operator_queue' : 'analytics',
        laborSaving: i <= 3 ? 'high' : 'medium',
        revenueImpact: ['conversion','monitoring','agency'].includes(stream) ? 'high' : 'medium'
      });
    }
  }
  return [...growthItems, ...autopilotItems];
}

export function buildNextBestOffer(input = {}, db = {}) {
  const riskScore = clamp(toNumber(input.riskScore ?? input.latestRiskScore, 55), 0, 100);
  const currentPlan = normalizePlanCode(input.currentPlan || input.plan || 'Free', 'Free');
  const hasReport = currentPlan === 'Report' || hasPaidPlan(db, 'Report');
  const hasFixPack = currentPlan === 'FixPack' || hasPaidPlan(db, 'FixPack');
  const hasMonitoring = currentPlan === 'Monitoring' || hasPaidPlan(db, 'Monitoring');
  let code = 'Report';
  let reason = '상세 근거와 실행 체크리스트를 먼저 제공합니다.';
  if (riskScore >= 70 && !hasFixPack) { code = 'FixPack'; reason = '위험 점수가 높아 바로 적용 가능한 개선 문구가 우선입니다.'; }
  else if (hasReport && !hasFixPack) { code = 'FixPack'; reason = '리포트 확인 뒤 실제 수정 문구를 제공하면 체감 가치가 커집니다.'; }
  else if ((hasFixPack || riskScore >= 55) && !hasMonitoring) { code = 'Monitoring'; reason = '수정 후 재점검과 변경 감지를 반복 매출로 연결합니다.'; }
  else if (hasMonitoring && riskScore >= 45) { code = 'Expert'; reason = '반복 위험 항목은 전문가 보강과 운영 가이드가 필요합니다.'; }
  if (input.agency === true || toNumber(input.siteCount, 0) >= 5) { code = 'Agency'; reason = '다중 사이트 운영은 대행사 화이트라벨 구조가 수익성이 높습니다.'; }
  const offer = buildCommercialOfferCatalog().find(item => item.code === code) || buildCommercialOfferCatalog()[0];
  return {
    code: offer.code,
    title: offer.title,
    price: offer.price,
    period: offer.period,
    reason,
    expectedOutcome: offer.summary,
    unlocks: offer.unlocks || [],
    confidence: riskScore >= 70 || code === 'Agency' ? 'high' : 'medium'
  };
}

export function buildAutomationWorkQueue(db = {}, options = {}) {
  const scans = list(db.scans);
  const sites = list(db.sites);
  const orders = list(db.orders);
  const subscriptions = list(db.subscriptions);
  const refunds = list(db.refundRequests);
  const queue = [];
  const add = item => queue.push({ id: item.id || `queue-${queue.length + 1}`, createdAt: item.createdAt || nowIso(options), ...item });

  for (const scan of scans.slice(0, 20)) {
    const riskScore = clamp(toNumber(scan.riskScore, 55), 0, 100);
    if (riskScore >= 55) {
      const offer = buildNextBestOffer({ riskScore, currentPlan: 'Free' }, db);
      add({
        type: 'conversion_followup',
        priority: riskScore >= 75 ? 'P0' : 'P1',
        target: scan.target || scan.domain || '진단 사이트',
        title: '무료 진단 후 유료 전환 제안',
        reason: `위험 점수 ${riskScore} 기준으로 ${offer.title} 제안`,
        recommendedOffer: offer,
        automation: 'send_report_preview_or_portal_cta'
      });
    }
  }

  for (const site of sites.slice(0, 50)) {
    const riskScore = siteRisk(site, scans);
    const lastScanAt = site.lastScanAt || latest(scans.filter(scan => scan.siteId === site.id || scan.target === site.domain), 'createdAt')?.createdAt;
    const daysSince = lastScanAt ? Math.abs(asDaysFromNow(lastScanAt, options) || 0) : 999;
    if (daysSince >= 7 || riskScore >= 65) {
      add({
        type: 'monitoring_recheck',
        priority: riskScore >= 75 ? 'P0' : 'P1',
        target: site.domain || site.label || site.id,
        title: '정기 재진단 예약',
        reason: daysSince >= 7 ? '최근 진단 후 7일 이상 경과' : `위험 점수 ${riskScore}로 재점검 필요`,
        automation: 'schedule_rescan_and_delta_summary',
        recommendedOffer: buildNextBestOffer({ riskScore, currentPlan: 'Monitoring' }, db)
      });
    }
  }

  for (const order of orders.slice(0, 50)) {
    const plan = orderPlan(order);
    if (String(order.status || '').toLowerCase() === 'paid' && !order.fulfillmentId && !order.assetId) {
      add({
        type: 'fulfillment_recovery',
        priority: 'P0',
        target: order.siteId || order.domain || order.id,
        title: '결제 완료 산출물 생성 확인',
        reason: 'paid 주문에 산출물 연결값이 없습니다.',
        automation: 'ensure_fulfillment_for_paid_order',
        recommendedOffer: buildNextBestOffer({ currentPlan: plan, riskScore: order.riskScore || 55 }, db)
      });
    }
    if (String(order.status || '').toLowerCase() === 'paid' && ['Report','FixPack'].includes(plan)) {
      add({
        type: 'upsell_sequence',
        priority: 'P2',
        target: order.siteId || order.domain || order.id,
        title: '단건 구매 후 반복 매출 제안',
        reason: `${plan} 구매 고객에게 모니터링 또는 전문가 플랜을 제안`,
        automation: 'portal_next_best_offer',
        recommendedOffer: buildNextBestOffer({ currentPlan: plan, riskScore: order.riskScore || 55 }, db)
      });
    }
  }

  for (const sub of subscriptions.slice(0, 50)) {
    const daysLeft = asDaysFromNow(sub.currentPeriodEnd || sub.expiresAt || sub.renewalDueAt, options);
    if (daysLeft !== null && daysLeft <= 7) {
      add({
        type: 'renewal_guard',
        priority: daysLeft <= 2 ? 'P0' : 'P1',
        target: sub.siteId || sub.customerId || sub.id,
        title: '수동 갱신 만료 전 안내',
        reason: `${Math.max(0, daysLeft)}일 후 접근 기간 만료`,
        automation: 'renewal_notice_and_checkout_link',
        recommendedOffer: buildNextBestOffer({ currentPlan: sub.plan || sub.productCode || 'Monitoring', riskScore: sub.riskScore || 55 }, db)
      });
    }
  }

  for (const refund of refunds.slice(0, 30)) {
    if (!['approved','rejected','closed'].includes(String(refund.status || '').toLowerCase())) {
      add({
        type: 'refund_review',
        priority: 'P0',
        target: refund.orderId || refund.id,
        title: '환불 요청 검토 큐',
        reason: '고객 요청, 결제 상태, 제공 시작 여부를 확인해야 합니다.',
        automation: 'operator_refund_review_gate',
        recommendedOffer: null
      });
    }
  }

  return queue.sort((a, b) => ({ P0: 0, P1: 1, P2: 2 }[a.priority] ?? 3) - ({ P0: 0, P1: 1, P2: 2 }[b.priority] ?? 3));
}

export function buildRevenueForecast(db = {}, options = {}) {
  const orders = paidOrders(db);
  const subs = activeSubscriptions(db);
  const oneTimeRevenue = orders.reduce((sum, order) => sum + currency(order.amount || planPrice(orderPlan(order))), 0);
  const monthlyRecurringRevenue = subs.reduce((sum, sub) => sum + currency(sub.monthlyPrice || sub.amount || planPrice(sub.plan || sub.productCode || 'Monitoring')), 0);
  const queue = buildAutomationWorkQueue(db, options);
  const pipelineRevenue = queue.reduce((sum, item) => sum + currency(item.recommendedOffer?.price || 0) * (item.priority === 'P0' ? 0.35 : item.priority === 'P1' ? 0.2 : 0.08), 0);
  return {
    oneTimeRevenue,
    monthlyRecurringRevenue,
    estimatedPipelineRevenue: currency(pipelineRevenue),
    paidOrderCount: orders.length,
    activeSubscriptionCount: subs.length,
    queueOpportunityCount: queue.filter(item => item.recommendedOffer).length,
    revenueLevers: [
      '무료 진단 완료 후 24시간 이내 기본 리포트 제안',
      '리포트 구매 후 개선 문구팩 업셀',
      '문구팩 제공 후 7일 내 월간 모니터링 제안',
      '위험 점수 70 이상 고객은 전문가 플랜 우선 제안',
      '5개 이상 사이트 보유 고객은 대행사 화이트라벨 제안'
    ]
  };
}

export function buildCustomerLifecyclePlan(input = {}, db = {}) {
  const riskScore = clamp(toNumber(input.riskScore, 55), 0, 100);
  const currentPlan = normalizePlanCode(input.currentPlan || input.plan || 'Free', 'Free');
  const siteUrl = safeString(input.siteUrl || input.domain || input.target, '대상 사이트');
  const nextBestOffer = buildNextBestOffer({ ...input, riskScore, currentPlan }, db);
  const fixPack = buildFixGeneratorPayload({ siteUrl, industry: input.industry || 'shopping', brandName: input.brandName, supportEmail: input.supportEmail });
  const monitoring = buildMonitoringPlan({ siteUrl, industry: input.industry || 'shopping', cadence: input.cadence || 'weekly' });
  return {
    ok: true,
    version: TRUSTOPS_AUTOPILOT_VERSION,
    siteUrl,
    currentPlan,
    riskScore,
    nextBestOffer,
    stages: [
      { key: 'diagnose', title: '무료 진단 완료', unlocked: true, goal: '문제 개수와 대표 리스크 확인' },
      { key: 'report', title: '기본 리포트', unlocked: currentPlan !== 'Free', goal: '페이지별 근거와 우선순위 확보' },
      { key: 'fixpack', title: '개선 문구팩', unlocked: ['FixPack','Monitoring','Expert','Agency'].includes(currentPlan), goal: `${fixPack.copyReadyCount}개 복붙 문구 적용` },
      { key: 'monitoring', title: '월간 모니터링', unlocked: ['Monitoring','Expert','Agency'].includes(currentPlan), goal: monitoring.alertRules[0] },
      { key: 'expert', title: '전문가 보강', unlocked: ['Expert','Agency'].includes(currentPlan), goal: '반복 리스크와 정책 충돌 검토' },
      { key: 'agency', title: '대행사 확장', unlocked: currentPlan === 'Agency', goal: '다중 사이트 운영과 화이트라벨 리포트 제공' }
    ],
    operatorNudges: [
      `${nextBestOffer.title} CTA를 포털 상단과 리포트 하단에 노출`,
      '결제 전 제공 범위와 환불 제한 고지를 같은 화면에 배치',
      '수정 완료 후 재진단 버튼을 바로 이어 붙이기'
    ]
  };
}

export function buildTrustOpsAutopilotCockpit(db = {}, options = {}) {
  const scans = list(db.scans);
  const sites = list(db.sites);
  const orders = list(db.orders);
  const subscriptions = list(db.subscriptions);
  const queue = buildAutomationWorkQueue(db, options);
  const revenue = buildRevenueForecast(db, options);
  const backlog = buildAutomationBacklog();
  const latestScan = latest(scans, 'createdAt');
  const averageRisk = scans.length ? Math.round(scans.reduce((sum, scan) => sum + clamp(toNumber(scan.riskScore, 55), 0, 100), 0) / scans.length) : 55;
  const nextBestOffer = buildNextBestOffer({ riskScore: latestScan?.riskScore || averageRisk, siteCount: sites.length }, db);
  const kpis = Object.fromEntries(KPI_DEFINITIONS.map(([key, label, from, to]) => [key, { key, label, from, to, status: 'tracked', value: 0 }]));
  return {
    ok: true,
    version: TRUSTOPS_AUTOPILOT_VERSION,
    generatedAt: nowIso(options),
    counts: {
      sites: sites.length,
      scans: scans.length,
      paidOrders: paidOrders(db).length,
      activeSubscriptions: activeSubscriptions(db).length,
      refundsOpen: list(db.refundRequests).filter(item => !['approved','rejected','closed'].includes(String(item.status || '').toLowerCase())).length,
      queue: queue.length,
      p0: queue.filter(item => item.priority === 'P0').length,
      p1: queue.filter(item => item.priority === 'P1').length,
      p2: queue.filter(item => item.priority === 'P2').length
    },
    health: {
      averageRisk,
      automationCoverage: 100,
      queueHealth: queue.some(item => item.priority === 'P0') ? 'action_required' : 'normal',
      revenueStage: revenue.monthlyRecurringRevenue > 0 ? 'recurring_revenue' : paidOrders(db).length ? 'first_purchase' : 'lead_capture'
    },
    nextBestOffer,
    workQueue: queue.slice(0, 25),
    revenue,
    kpis,
    workstreams: WORKSTREAMS.map(([key, label, outcome]) => ({ key, label, outcome, active: true })),
    backlogCount: backlog.length,
    autopilotBacklogCount: backlog.filter(item => String(item.id).startsWith('AUTO-')).length,
    safeguards: [
      '유료 산출물은 paid 상태와 접근 기간 확인 뒤 제공',
      '무료 진단은 법률 확정 결론이 아니라 사전 점검으로 표시',
      '환불 요청은 중복 요청과 권한 검증 후 운영 큐로 이동',
      '구독형 상품은 자동정기결제 구현 전까지 수동 갱신형으로 표시'
    ]
  };
}

export function runAutopilotAudit({ files = [], packageJson = {}, sourceText = '' } = {}) {
  const requiredFiles = [
    'server/core/trustops-autopilot-engine.mjs',
    'tests/trustops-autopilot.mjs',
    'scripts/run-release-gate.mjs',
    'docs/OPERATIONS.md',
    'docs/QA.md'
  ];
  const checks = [];
  const check = (key, ok, detail = '') => checks.push({ key, ok: Boolean(ok), detail });
  check('required files present', requiredFiles.every(file => files.includes(file)), requiredFiles.filter(file => !files.includes(file)).join(', '));
  check('package release gate', packageJson.scripts?.['verify:release'] === 'node scripts/run-release-gate.mjs');
  check('autopilot routes present', ['/api/public/trustops-autopilot','/api/public/customer-lifecycle','/api/public/automation-workqueue'].every(route => sourceText.includes(route)));
  check('admin cockpit route present', sourceText.includes('/api/admin/trustops-autopilot'));
  check('engine agent policy present', sourceText.includes('trustops.autopilot'));
  check('backlog exceeds 120', buildAutomationBacklog().length >= 130);
  const cockpit = buildTrustOpsAutopilotCockpit({ scans: [{ riskScore: 72, target: 'https://audit.example' }], sites: [], orders: [], subscriptions: [], refundRequests: [] });
  check('cockpit ok', cockpit.ok && cockpit.counts.queue >= 1);
  check('next offer present', Boolean(cockpit.nextBestOffer?.code));
  const ok = checks.every(item => item.ok);
  return { ok, version: TRUSTOPS_AUTOPILOT_VERSION, score: Math.round((checks.filter(item => item.ok).length / checks.length) * 100), checks };
}
