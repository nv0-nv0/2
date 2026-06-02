import { buildCommercialOfferCatalog } from '../../shared/product-catalog.mjs';
import { buildProductIntelligence, buildProductDashboard } from './product-intelligence.mjs';
import { buildSmartProductOrchestration, buildSmartPublicSnapshot } from './smart-product-orchestrator.mjs';
import { buildDiagnosisAccuracyProfile, buildAdminOperatingProfile } from './product-quality-engine.mjs';
import { buildProductAgentRuntimeStatus } from './product-agent-suite.mjs';
import { buildEngineAgentRuntimeStatus } from './engine-agent-orchestrator.mjs';
import { buildTrustOpsAutopilotCockpit, buildCustomerLifecyclePlan, buildAutomationWorkQueue } from './trustops-autopilot-engine.mjs';

export const EXPERIENCE_ORCHESTRATOR_VERSION = 'experience-orchestrator-v1';

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(number(value, min))));
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function average(items = []) {
  const values = items.filter((item) => Number.isFinite(Number(item))).map((item) => Number(item));
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function pickSiteAndScan(db = {}, options = {}) {
  const scans = list(db.scans);
  const sites = list(db.sites);
  const siteId = text(options.siteId);
  const domain = text(options.domain);
  const site = siteId
    ? sites.find((item) => item.id === siteId)
    : domain
      ? sites.find((item) => [item.domain, item.url, item.label].some((value) => text(value).toLowerCase() === domain.toLowerCase()))
      : sites[0] || null;
  const scan = site
    ? scans.find((item) => item.siteId === site.id || text(item.target).toLowerCase() === text(site.domain).toLowerCase()) || scans[0] || null
    : scans[0] || null;
  return { site, scan };
}

function stageStatus(score) {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'ready';
  if (score >= 55) return 'watch';
  return 'needs-work';
}

function toBlockers(items = []) {
  return unique(items.map((item) => text(item)).filter(Boolean)).slice(0, 6);
}

function computePillars({ orchestration, diagnosisAccuracy, lifecycle, autopilot, adminProfile, engineStatus, productAgentStatus, scan, offers }) {
  const queue = number(autopilot?.counts?.queue, 0);
  const blockers = number(adminProfile?.blockers?.length, 0);
  const warnings = number(adminProfile?.warnings?.length, 0);
  const scanScore = clamp(diagnosisAccuracy?.score ?? 62);
  const orchestrationScore = clamp(orchestration?.score ?? lifecycle?.riskScore ?? 60);
  const lifecycleScore = clamp(68 + number(lifecycle?.stages?.filter((stage) => stage.unlocked).length, 0) * 4);
  const continuityScore = clamp(65 + Math.min(20, number(autopilot?.counts?.savedSites, 0) * 2) + Math.min(10, number(autopilot?.counts?.activeSubscriptions, 0) * 3) - Math.min(18, queue));
  const trustScore = clamp(scanScore * 0.5 + number(engineStatus?.assignedEngines, 0) / Math.max(1, number(engineStatus?.engineCount, 1)) * 50);
  const actionabilityScore = clamp(orchestrationScore * 0.55 + Math.min(30, number(orchestration?.actionCards?.length, 0) * 7) + Math.min(15, number(lifecycle?.operatorNudges?.length, 0) * 3));
  const speedScore = clamp(76 + Math.min(12, number(productAgentStatus?.operationAgents?.length, 0) / 6) - Math.min(18, blockers * 7));
  const personalizationScore = clamp(64 + Math.min(18, number(offers?.length, 0)) + Math.min(12, number(lifecycle?.stages?.length, 0) * 2) + (scan?.siteId ? 6 : 0));
  const recoveryScore = clamp(72 + Math.min(15, number(adminProfile?.queues?.refunds?.length, 0) === 0 ? 10 : 0) - blockers * 9 - warnings * 3);
  return [
    { key: 'trust', label: '신뢰와 설명력', score: trustScore, reason: '공개 진단 신뢰도와 엔진 커버리지 기준' },
    { key: 'speed', label: '응답 속도와 마찰 감소', score: speedScore, reason: '운영 차단요소와 자동화 대기열 기준' },
    { key: 'actionability', label: '바로 실행 가능한 다음 행동', score: actionabilityScore, reason: '추천 액션, 문구 적용, 단계별 안내 기준' },
    { key: 'continuity', label: '저장·재진단·반복 관리', score: continuityScore, reason: '포털, 구독, 반복 루프 연결 기준' },
    { key: 'personalization', label: '고객별 맞춤 제안', score: personalizationScore, reason: '위험도와 현재 단계 기반 맞춤 제안 기준' },
    { key: 'recovery', label: '문제 발생 시 복구 체감', score: recoveryScore, reason: '환불·산출물·운영 복구 큐 기준' }
  ];
}

function buildStages({ snapshot, orchestration, diagnosisAccuracy, lifecycle, autopilot, adminProfile, engineStatus, productAgentStatus, scan }) {
  const stages = [
    {
      key: 'discover',
      label: '첫 진입과 가치 이해',
      score: clamp(snapshot?.productScore ?? 70),
      summary: text(snapshot?.headline, '무료 진단 가치를 빠르게 이해할 수 있어야 합니다.'),
      blockers: toBlockers([
        snapshot?.signals?.hasLatestScan ? '' : '최근 진단 신호가 없습니다.',
        number(orchestration?.frictionRemovers?.length, 0) < 3 ? '마찰 제거 장치가 부족합니다.' : ''
      ]),
      nextActions: list(orchestration?.frictionRemovers).map((item) => item.title).slice(0, 4),
      ownerEngines: ['site-intake-normalization-engine', 'risk-scoring-engine', 'product-offer-engine'],
      ownerAgents: ['url-canonicalization-agent', 'visual-readability-agent', 'offer-routing-agent']
    },
    {
      key: 'diagnose',
      label: '진단 신뢰도와 결과 설득력',
      score: clamp(diagnosisAccuracy?.score ?? 58),
      summary: text(diagnosisAccuracy?.label, '공개 진단의 신뢰도와 설명 가능성이 중요합니다.'),
      blockers: toBlockers(list(diagnosisAccuracy?.blockers).map((item) => item.label)),
      nextActions: [
        diagnosisAccuracy?.manualReviewRequired ? '수동 확인 항목을 결과에 유지' : '자동 진단 결과를 그대로 사용 가능',
        '근거 URL과 우선순위를 함께 노출',
        '무료 결과와 유료 산출물의 경계를 분명히 안내'
      ],
      ownerEngines: ['scan-evidence-engine', 'risk-scoring-engine', 'privacy-compliance-engine'],
      ownerAgents: ['scan-quality-agent', 'automation-disclosure-agent', 'risk-threshold-agent']
    },
    {
      key: 'guide',
      label: '다음 행동 추천과 문구 적용',
      score: clamp(orchestration?.score ?? 66),
      summary: text(orchestration?.nextBestAction?.title, '고객이 무엇을 먼저 해야 하는지 바로 이해해야 합니다.'),
      blockers: toBlockers([
        number(orchestration?.actionCards?.length, 0) < 3 ? '실행 카드 수가 부족합니다.' : '',
        number(lifecycle?.stages?.length, 0) < 6 ? '고객 단계별 안내가 부족합니다.' : ''
      ]),
      nextActions: unique([
        orchestration?.nextBestAction?.cta,
        ...list(orchestration?.actionCards).map((item) => item.title),
        ...list(lifecycle?.operatorNudges)
      ]).slice(0, 5),
      ownerEngines: ['fix-generator-engine', 'customer-lifecycle-engine', 'revenue-optimization-engine'],
      ownerAgents: ['copy-pack-agent', 'next-best-offer-agent', 'product-ladder-agent']
    },
    {
      key: 'convert',
      label: '전환과 상품 사다리',
      score: clamp(70 + Math.min(18, number(autopilot?.revenue?.queueOpportunityCount, 0) * 2) + (orchestration?.recommendedPlan === 'Expert' ? 4 : 0)),
      summary: text(autopilot?.nextBestOffer?.reason || lifecycle?.nextBestOffer?.reason, '무료 진단 이후 자연스러운 상품 이동이 필요합니다.'),
      blockers: toBlockers([
        number(autopilot?.counts?.queue, 0) > 18 ? '운영 큐가 많아 전환 후 처리 체감이 늦어질 수 있습니다.' : '',
        number(autopilot?.counts?.paidOrders, 0) === 0 ? '유료 전환 데이터가 아직 없습니다.' : ''
      ]),
      nextActions: unique([
        lifecycle?.nextBestOffer?.title,
        '추천 상품을 포털과 결과 화면에 동기화',
        '무료 결과 직후 근거 기반 CTA 강조'
      ]).slice(0, 4),
      ownerEngines: ['trustops-growth-engine', 'revenue-optimization-engine', 'checkout-consent-engine'],
      ownerAgents: ['growth-funnel-agent', 'upsell-routing-agent', 'checkout-consent-agent']
    },
    {
      key: 'deliver',
      label: '결제 후 산출물과 복구',
      score: clamp(78 - number(adminProfile?.counts?.paidWithoutAsset, 0) * 14 - number(adminProfile?.counts?.failedEmails, 0) * 8),
      summary: text(adminProfile?.label, '결제 이후의 제공 안정성이 만족도를 크게 좌우합니다.'),
      blockers: toBlockers(list(adminProfile?.blockers).map((item) => item.label)),
      nextActions: unique([
        ...list(adminProfile?.nextActions),
        '결제 완료 주문의 산출물 연결 상태를 자동 확인',
        '이메일 실패와 환불 요청을 우선 큐로 운영'
      ]).slice(0, 5),
      ownerEngines: ['fulfillment-asset-engine', 'payment-verification-engine', 'customer-support-engine'],
      ownerAgents: ['fulfillment-access-agent', 'pdf-delivery-agent', 'transactional-email-agent']
    },
    {
      key: 'retain',
      label: '재진단·모니터링·고객 유지',
      score: clamp(68 + Math.min(20, number(autopilot?.counts?.activeSubscriptions, 0) * 4) + Math.min(10, number(autopilot?.counts?.savedSites, 0)) - Math.min(12, number(autopilot?.counts?.refundQueue, 0) * 3)),
      summary: '저장된 사이트, 모니터링, 다음 제안이 하나의 루프로 이어져야 합니다.',
      blockers: toBlockers([
        number(autopilot?.counts?.savedSites, 0) === 0 ? '저장된 사이트가 없습니다.' : '',
        number(autopilot?.counts?.activeSubscriptions, 0) === 0 ? '반복 관리 구독이 아직 없습니다.' : ''
      ]),
      nextActions: unique([
        '7일 이상 지난 사이트는 재진단 예약',
        '위험도 변화와 다음 상품 제안을 함께 노출',
        ...list(buildAutomationWorkQueue({ scans: scan ? [scan] : [], subscriptions: [], refundRequests: [], orders: [], sites: [] })).map((item) => item.title)
      ]).slice(0, 4),
      ownerEngines: ['monitoring-loop-engine', 'trustops-autopilot-engine', 'customer-lifecycle-engine'],
      ownerAgents: ['monitoring-schedule-agent', 'autopilot-queue-agent', 'lifecycle-stage-agent']
    }
  ];
  return stages.map((stage) => ({ ...stage, status: stageStatus(stage.score) }));
}

export function buildExperienceOrchestratorSnapshot(db = {}, options = {}) {
  const { site, scan } = pickSiteAndScan(db, options);
  const offers = options.offers || buildCommercialOfferCatalog();
  const riskScore = number(options.riskScore, site?.latestRiskScore || scan?.riskScore || 55);
  const intelligence = options.intelligence || buildProductIntelligence({ scan: scan || {}, site, riskScore, offers, source: options.source || 'experience-orchestrator' });
  const dashboard = buildProductDashboard(db);
  const orchestration = buildSmartProductOrchestration({ scan: scan || {}, site, intelligence, offers, dashboard, source: options.source || 'experience-orchestrator' });
  const snapshot = buildSmartPublicSnapshot(db, { offers, intelligence });
  const diagnosisAccuracy = scan ? buildDiagnosisAccuracyProfile(scan) : null;
  const productAgentStatus = buildProductAgentRuntimeStatus(db, options);
  const engineStatus = buildEngineAgentRuntimeStatus(db, options);
  const lifecycle = buildCustomerLifecyclePlan({
    riskScore,
    currentPlan: intelligence?.recommendedPlan || orchestration?.recommendedPlan || 'Free',
    siteUrl: site?.domain || scan?.target || '',
    industry: scan?.industry || site?.industry || 'shopping'
  }, db);
  const autopilot = buildTrustOpsAutopilotCockpit(db, options);
  const adminProfile = buildAdminOperatingProfile(db);
  const stages = buildStages({ snapshot, orchestration, diagnosisAccuracy, lifecycle, autopilot, adminProfile, engineStatus, productAgentStatus, scan });
  const pillars = computePillars({ orchestration, diagnosisAccuracy, lifecycle, autopilot, adminProfile, engineStatus, productAgentStatus, scan, offers });
  const userSatisfactionScore = clamp(average([...pillars.map((item) => item.score), ...stages.map((item) => item.score)]));
  return {
    ok: true,
    version: EXPERIENCE_ORCHESTRATOR_VERSION,
    generatedAt: options.nowIso || new Date().toISOString(),
    site: {
      id: site?.id || scan?.siteId || null,
      domain: site?.domain || scan?.target || null,
      industry: scan?.industry || site?.industry || null,
      riskScore
    },
    userSatisfactionScore,
    pillars,
    stages,
    nextBestAction: orchestration.nextBestAction,
    recommendedPlan: orchestration.recommendedPlan,
    lifecycle,
    orchestration,
    snapshot,
    diagnosisAccuracy,
    productAgentStatus,
    engineStatus,
    automation: {
      queueCount: autopilot.counts?.queue || 0,
      savedSites: autopilot.counts?.savedSites || 0,
      activeSubscriptions: autopilot.counts?.activeSubscriptions || 0,
      revenue: autopilot.revenue,
      nextBestOffer: autopilot.nextBestOffer,
      safeguards: autopilot.safeguards
    },
    hardeningPrograms: [
      {
        key: 'clarity-first',
        title: '첫 화면에서 가치와 다음 행동을 더 명확하게',
        impact: 'high',
        ownerEngines: ['site-intake-normalization-engine', 'product-offer-engine'],
        tasks: unique([
          ...list(orchestration.frictionRemovers).map((item) => item.title),
          '무료 결과와 유료 제안 사이 설명 간격 줄이기'
        ]).slice(0, 4)
      },
      {
        key: 'trusted-diagnosis',
        title: '진단 신뢰도와 증거 설명 강화',
        impact: 'high',
        ownerEngines: ['scan-evidence-engine', 'risk-scoring-engine'],
        tasks: unique([
          ...list(diagnosisAccuracy?.blockers).map((item) => item.label),
          '수동 확인 항목을 결론처럼 보이지 않게 유지'
        ]).slice(0, 4)
      },
      {
        key: 'delivery-confidence',
        title: '결제 후 제공과 복구 체감 강화',
        impact: 'high',
        ownerEngines: ['fulfillment-asset-engine', 'customer-support-engine'],
        tasks: unique([
          ...list(adminProfile.nextActions),
          '산출물 누락과 이메일 실패를 자동 우선큐로 승격'
        ]).slice(0, 4)
      },
      {
        key: 'retention-loop',
        title: '재진단과 모니터링을 반복 습관으로',
        impact: 'medium',
        ownerEngines: ['monitoring-loop-engine', 'customer-lifecycle-engine'],
        tasks: [
          '저장 사이트 기준 재진단 예약',
          '위험도 변화 요약과 다음 상품 제안 동시 노출',
          '포털에서 최근 실행 이력과 다음 액션을 한 카드에 통합'
        ]
      }
    ],
    publicSummary: {
      headline: orchestration.nextBestAction?.title || snapshot.headline,
      summary: orchestration.nextBestAction?.description || snapshot.summary,
      promise: '무료 진단에서 결제, 산출물, 반복 관리까지 한 흐름으로 덜 헷갈리고 더 신뢰되게 만드는 상위 제어면입니다.',
      satisfactionBand: userSatisfactionScore >= 85 ? 'excellent' : userSatisfactionScore >= 70 ? 'strong' : userSatisfactionScore >= 55 ? 'watch' : 'critical'
    }
  };
}

export function buildExperienceControlPlane(db = {}, options = {}) {
  const snapshot = buildExperienceOrchestratorSnapshot(db, options);
  const adminProfile = buildAdminOperatingProfile(db);
  const criticalStages = snapshot.stages.filter((stage) => stage.score < 70);
  return {
    ok: criticalStages.length === 0 && adminProfile.ok,
    version: EXPERIENCE_ORCHESTRATOR_VERSION,
    generatedAt: snapshot.generatedAt,
    score: snapshot.userSatisfactionScore,
    status: criticalStages.length === 0 && adminProfile.ok ? 'ready' : 'needs-attention',
    systemLayer: {
      runtime: adminProfile.label,
      blockers: adminProfile.blockers,
      warnings: adminProfile.warnings,
      queues: adminProfile.queues
    },
    engineLayer: {
      engineCount: snapshot.engineStatus.engineCount,
      agentCount: snapshot.engineStatus.agentCount,
      domains: snapshot.engineStatus.domains,
      recentEvents: snapshot.engineStatus.recentEvents
    },
    agentLayer: {
      productAgents: list(snapshot.productAgentStatus.operationAgents).map((item) => item.id),
      cadence: snapshot.productAgentStatus.cadence,
      quality: snapshot.productAgentStatus.quality,
      state: snapshot.productAgentStatus.state
    },
    pipelineLayer: {
      stageCount: snapshot.stages.length,
      stages: snapshot.stages,
      pillars: snapshot.pillars,
      hardeningPrograms: snapshot.hardeningPrograms
    },
    priorityMatrix: criticalStages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      score: stage.score,
      blockers: stage.blockers,
      owners: stage.ownerEngines
    })),
    operatorSummary: {
      nextBestAction: snapshot.nextBestAction,
      recommendedPlan: snapshot.recommendedPlan,
      automationQueueCount: snapshot.automation.queueCount,
      satisfactionBand: snapshot.publicSummary.satisfactionBand
    }
  };
}

export function runExperienceOrchestratorAudit({ files = [], packageJson = {}, routes = [], sourceText = '' } = {}) {
  const normalizedFiles = list(files).map((item) => String(item).replace(/\\/g, '/'));
  const scripts = packageJson?.scripts || {};
  const checks = [
    { key: 'core_file', weight: 16, pass: normalizedFiles.includes('server/core/experience-orchestrator.mjs'), message: '상위 경험 오케스트레이터 코어 파일' },
    { key: 'public_route', weight: 16, pass: routes.includes('/api/public/experience-orchestrator'), message: '공개 경험 오케스트레이터 API' },
    { key: 'admin_route', weight: 16, pass: routes.includes('/api/admin/experience-orchestrator'), message: '관리자 경험 오케스트레이터 API' },
    { key: 'admin_audit_route', weight: 12, pass: routes.includes('/api/admin/experience-orchestrator/audit'), message: '관리자 감사 API' },
    { key: 'source_exports', weight: 12, pass: /buildExperienceOrchestratorSnapshot/.test(sourceText) && /buildExperienceControlPlane/.test(sourceText), message: '핵심 빌더 함수 export' },
    { key: 'package_script', weight: 10, pass: Boolean(scripts['test:experience-orchestrator']), message: '경험 오케스트레이터 테스트 스크립트' },
    { key: 'test_file', weight: 10, pass: normalizedFiles.includes('tests/experience-orchestrator.mjs'), message: '경험 오케스트레이터 단위 테스트' },
    { key: 'version_string', weight: 8, pass: /experience-orchestrator-v1/.test(sourceText), message: '버전 선언' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  return {
    ok: score === 100,
    score,
    total: 100,
    version: EXPERIENCE_ORCHESTRATOR_VERSION,
    checks,
    failed: checks.filter((item) => !item.pass)
  };
}
