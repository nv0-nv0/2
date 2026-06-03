import { ENGINE_AGENT_ASSIGNMENT_MATRIX, buildEngineAgentAssignment } from './engine-agent-orchestrator.mjs';

const CONTROL_PLANE_VERSION = 'system-control-plane-v1.0.0';

export const SYSTEM_CONTROL_PLANE_VERSION = CONTROL_PLANE_VERSION;

export const SYSTEM_LAYER_REGISTRY = Object.freeze([
  { id: 'experience-edge-layer', order: 10, label: '고객 경험·엣지', purpose: '고객 진입, 포털, Stitch UI 연결과 화면 상태를 관리합니다.', engines: ['site-intake-normalization-engine','portal-dashboard-ux-engine','stitch-design-system-engine','stitch-route-experience-engine','stitch-state-coverage-engine','stitch-function-binding-engine'] },
  { id: 'diagnosis-intelligence-layer', order: 20, label: '진단·판단', purpose: '진단 증거, 위험 점수, 개선안, 구조화 데이터를 관리합니다.', engines: ['scan-evidence-engine','risk-scoring-engine','fix-generator-engine','structured-data-engine'] },
  { id: 'commerce-lifecycle-layer', order: 30, label: '상품·결제·고객 생애주기', purpose: '상품 연결, 결제, 산출물, 환불, 지원과 고객 단계를 관리합니다.', engines: ['product-offer-engine','checkout-consent-engine','payment-verification-engine','fulfillment-asset-engine','refund-review-engine','customer-support-engine','customer-lifecycle-engine'] },
  { id: 'content-growth-layer', order: 40, label: '콘텐츠·성장', purpose: '콘텐츠 발행, SEO, 상품 사다리, 매출 예측과 전환 실험을 관리합니다.', engines: ['board-publication-engine','seo-feed-engine','trustops-growth-engine','agency-whitelabel-engine','revenue-optimization-engine','revenue-forecast-engine','lifecycle-message-engine','conversion-experiment-engine'] },
  { id: 'security-compliance-layer', order: 50, label: '보안·준법', purpose: '개인정보, 약관, 접근 통제, 남용 방어, 보존 정책과 환경 잠금을 관리합니다.', engines: ['privacy-compliance-engine','legal-notice-engine','security-gate-engine','rate-limit-abuse-engine','data-retention-engine','environment-lock-engine'] },
  { id: 'operator-automation-layer', order: 60, label: '운영 자동화', purpose: '관리자 운영, 자동화 큐, 런칭 제어, 사고 대응과 인수 절차를 관리합니다.', engines: ['admin-operations-engine','trustops-autopilot-engine','workqueue-prioritization-engine','trustops-launch-control-engine','incident-playbook-engine','operator-handoff-engine'] },
  { id: 'observability-resilience-layer', order: 70, label: '관측·복구', purpose: '상태 점검, 백업, 모니터링, 프로덕션 센티널, 롤백과 KPI를 관리합니다.', engines: ['observability-readiness-engine','backup-restore-engine','monitoring-loop-engine','production-sentinel-engine','live-verification-engine','rollback-sla-engine','go-live-kpi-engine','cost-quality-budget-engine'] },
  { id: 'quality-governance-layer', order: 80, label: '품질·거버넌스', purpose: '접근성, 통합 계약, 레드팀, 반응형, 운영 계약과 Stitch 릴리즈 계약을 관리합니다.', engines: ['accessibility-performance-engine','integration-contract-engine','redteam-governance-engine','responsive-contract-engine','operational-contract-engine','stitch-release-contract-engine'] },
  { id: 'release-delivery-layer', order: 90, label: '릴리즈·납품', purpose: '릴리즈 게이트, 최종 인수, 100점 점수판과 분할 검증을 관리합니다.', engines: ['release-gate-engine','final-handoff-engine','one-hundred-finalizer-engine','split-gate-runner-engine'] },
  { id: 'platform-foundation-layer', order: 100, label: '플랫폼 기반', purpose: '전체 레이어를 연결하는 전역 계약과 중앙 제어면을 관리합니다.', engines: ['system-control-plane-engine'] }
]);

export const SYSTEM_PIPELINE_REGISTRY = Object.freeze([
  { id: 'startup-security-pipeline', label: '상용 시작 전 보안 검증', criticality: 'P0', trigger: 'container-start', fallback: 'safe-configuration-hold', stages: ['environment-lock-engine','security-gate-engine','observability-readiness-engine','system-control-plane-engine'] },
  { id: 'public-diagnosis-pipeline', label: '공개 진단', criticality: 'P0', trigger: 'public-diagnose', fallback: 'safe-public-summary', stages: ['site-intake-normalization-engine','scan-evidence-engine','risk-scoring-engine','privacy-compliance-engine'] },
  { id: 'experience-stitch-pipeline', label: '화면 경험 연결', criticality: 'P1', trigger: 'page-render', fallback: 'static-safe-ui', stages: ['portal-dashboard-ux-engine','stitch-design-system-engine','stitch-route-experience-engine','stitch-state-coverage-engine','stitch-function-binding-engine','responsive-contract-engine','accessibility-performance-engine'] },
  { id: 'content-indexing-pipeline', label: '인사이트 발행·색인', criticality: 'P1', trigger: 'publication-cadence', fallback: 'last-known-publication', stages: ['board-publication-engine','seo-feed-engine','structured-data-engine'] },
  { id: 'commerce-fulfillment-pipeline', label: '결제·산출물', criticality: 'P0', trigger: 'checkout', fallback: 'payment-disabled-or-review', stages: ['product-offer-engine','checkout-consent-engine','rate-limit-abuse-engine','payment-verification-engine','fulfillment-asset-engine'] },
  { id: 'refund-support-pipeline', label: '환불·고객지원', criticality: 'P1', trigger: 'refund-request', fallback: 'manual-review-queue', stages: ['refund-review-engine','customer-support-engine','legal-notice-engine'] },
  { id: 'growth-lifecycle-pipeline', label: '성장·고객 생애주기', criticality: 'P2', trigger: 'scan-or-order-change', fallback: 'baseline-offer', stages: ['trustops-growth-engine','fix-generator-engine','agency-whitelabel-engine','revenue-optimization-engine','customer-lifecycle-engine','revenue-forecast-engine','lifecycle-message-engine','conversion-experiment-engine'] },
  { id: 'operator-autopilot-pipeline', label: '운영자 자동화', criticality: 'P1', trigger: 'operator-cycle', fallback: 'manual-operator-queue', stages: ['admin-operations-engine','trustops-autopilot-engine','workqueue-prioritization-engine','trustops-launch-control-engine','incident-playbook-engine','operator-handoff-engine'] },
  { id: 'monitoring-resilience-pipeline', label: '모니터링·복구', criticality: 'P0', trigger: 'health-or-schedule', fallback: 'incident-playbook', stages: ['observability-readiness-engine','backup-restore-engine','monitoring-loop-engine','production-sentinel-engine','live-verification-engine','rollback-sla-engine','go-live-kpi-engine','cost-quality-budget-engine'] },
  { id: 'privacy-retention-pipeline', label: '개인정보·보존', criticality: 'P0', trigger: 'data-write-or-prune', fallback: 'write-block-and-review', stages: ['privacy-compliance-engine','data-retention-engine','security-gate-engine','backup-restore-engine'] },
  { id: 'quality-governance-pipeline', label: '품질·레드팀', criticality: 'P1', trigger: 'release-candidate', fallback: 'release-block', stages: ['integration-contract-engine','redteam-governance-engine','responsive-contract-engine','operational-contract-engine','stitch-release-contract-engine'] },
  { id: 'release-delivery-pipeline', label: '릴리즈·납품', criticality: 'P0', trigger: 'verify-release', fallback: 'delivery-block', stages: ['release-gate-engine','split-gate-runner-engine','final-handoff-engine','one-hundred-finalizer-engine','system-control-plane-engine'] }
]);

const VALID_EVENT_STATUS = new Set(['healthy','observing','degraded','blocked','recovered']);
const VALID_SEVERITY = new Set(['info','warning','critical']);
const VALID_ACTION = new Set(['observe','hold','resume','review','rollback','redeploy']);

function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function unique(values) { return [...new Set(list(values))]; }
function clamp(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
function nowIso(options = {}) { return typeof options.nowIso === 'function' ? options.nowIso() : (options.nowIso || new Date().toISOString()); }
function cleanToken(value, fallback = '', max = 96) { return String(value || fallback).trim().replace(/[^a-z0-9_.:-]/gi, '-').slice(0, max) || fallback; }
function cleanText(value, fallback = '', max = 240) { return String(value || fallback).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max); }
function cleanMetricValue(value) { const n = Number(value); return Number.isFinite(n) ? clamp(n, -1_000_000_000, 1_000_000_000) : undefined; }

function layerIndex() {
  return new Map(SYSTEM_LAYER_REGISTRY.map(layer => [layer.id, layer]));
}
function pipelineIndex() {
  return new Map(SYSTEM_PIPELINE_REGISTRY.map(pipeline => [pipeline.id, pipeline]));
}
function engineLayerIndex() {
  const map = new Map();
  for (const layer of SYSTEM_LAYER_REGISTRY) for (const engineId of layer.engines) map.set(engineId, layer.id);
  return map;
}
function statusPriority(status) {
  return ({ blocked: 5, degraded: 4, observing: 3, recovered: 2, healthy: 1, standby: 0 })[status] ?? 0;
}
function summarizeStatus(items = []) {
  const statuses = list(items).map(item => item.status || 'standby');
  return statuses.sort((a, b) => statusPriority(b) - statusPriority(a))[0] || 'standby';
}
function publicPipelineStatus(status) {
  if (status === 'blocked') return '점검 필요';
  if (status === 'degraded') return '일부 점검 필요';
  if (status === 'observing') return '관측 중';
  if (status === 'recovered') return '복구 확인';
  return '정상 연결';
}

export function normalizeSystemControlEventPayload(payload = {}, options = {}) {
  const pipelines = pipelineIndex();
  const layers = layerIndex();
  const pipelineId = cleanToken(payload.pipelineId, '', 96);
  if (!pipelines.has(pipelineId)) throw new Error('지원하지 않는 pipelineId 입니다.');
  const pipeline = pipelines.get(pipelineId);
  const fallbackLayerId = engineLayerIndex().get(pipeline.stages[0]) || 'operator-automation-layer';
  const layerId = cleanToken(payload.layerId || fallbackLayerId, fallbackLayerId, 96);
  if (!layers.has(layerId)) throw new Error('지원하지 않는 layerId 입니다.');
  const status = VALID_EVENT_STATUS.has(String(payload.status || '').trim()) ? String(payload.status).trim() : 'observing';
  const severity = VALID_SEVERITY.has(String(payload.severity || '').trim()) ? String(payload.severity).trim() : (status === 'blocked' ? 'critical' : status === 'degraded' ? 'warning' : 'info');
  const action = VALID_ACTION.has(String(payload.action || '').trim()) ? String(payload.action).trim() : 'observe';
  const rawMetrics = payload.metrics && typeof payload.metrics === 'object' && !Array.isArray(payload.metrics) ? payload.metrics : {};
  const metrics = Object.fromEntries(Object.entries(rawMetrics).slice(0, 12).map(([key, value]) => [cleanToken(key, 'metric', 48), cleanMetricValue(value)]).filter(([, value]) => value !== undefined));
  return {
    pipelineId,
    layerId,
    status,
    severity,
    action,
    message: cleanText(payload.message, `${pipeline.label} 상태 기록`, 240),
    source: cleanToken(payload.source, options.source || 'operator', 64),
    correlationId: cleanToken(payload.correlationId, '', 96) || null,
    metrics
  };
}

export function appendSystemControlEvent(db = {}, payload = {}, options = {}) {
  db.systemControlEvents ||= [];
  const normalized = normalizeSystemControlEventPayload(payload, options);
  const record = {
    id: options.id || `scp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ...normalized,
    createdAt: nowIso(options)
  };
  db.systemControlEvents.unshift(record);
  db.systemControlEvents = db.systemControlEvents.slice(0, 500);
  return record;
}

function buildStructure() {
  const assignment = buildEngineAgentAssignment({});
  const allEngines = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines;
  const allAgents = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents;
  const layerByEngine = engineLayerIndex();
  const engineIds = new Set(allEngines.map(engine => engine.id));
  const duplicateLayerAssignments = [];
  const seen = new Map();
  for (const layer of SYSTEM_LAYER_REGISTRY) {
    for (const engineId of layer.engines) {
      if (seen.has(engineId)) duplicateLayerAssignments.push(engineId);
      seen.set(engineId, layer.id);
    }
  }
  const missingLayerAssignments = allEngines.filter(engine => !layerByEngine.has(engine.id)).map(engine => engine.id);
  const unknownLayerEngines = [...seen.keys()].filter(engineId => !engineIds.has(engineId));
  const unknownPipelineEngines = SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => pipeline.stages).filter(engineId => !engineIds.has(engineId));
  const pipelineCoveredEngines = new Set(SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => pipeline.stages));
  const enginesMissingPipeline = allEngines.filter(engine => !pipelineCoveredEngines.has(engine.id)).map(engine => engine.id);
  return {
    assignment,
    allEngines,
    allAgents,
    layerByEngine,
    missingLayerAssignments,
    unknownLayerEngines: unique(unknownLayerEngines),
    duplicateLayerAssignments: unique(duplicateLayerAssignments),
    unknownPipelineEngines: unique(unknownPipelineEngines),
    enginesMissingPipeline
  };
}

function recentControlEvents(db = {}, limit = 50) {
  return list(db.systemControlEvents).slice(0, limit).map(event => ({
    id: cleanToken(event.id, 'event', 96),
    pipelineId: cleanToken(event.pipelineId, 'unknown', 96),
    layerId: cleanToken(event.layerId, 'unknown', 96),
    status: VALID_EVENT_STATUS.has(event.status) ? event.status : 'observing',
    severity: VALID_SEVERITY.has(event.severity) ? event.severity : 'info',
    action: VALID_ACTION.has(event.action) ? event.action : 'observe',
    message: cleanText(event.message, '', 240),
    source: cleanToken(event.source, 'unknown', 64),
    correlationId: cleanToken(event.correlationId, '', 96) || null,
    metrics: event.metrics && typeof event.metrics === 'object' ? event.metrics : {},
    createdAt: event.createdAt || null
  }));
}

export function buildSystemControlPlaneSnapshot(db = {}, options = {}) {
  const structure = buildStructure();
  const events = recentControlEvents(db, options.eventLimit || 50);
  const engineMap = new Map(structure.allEngines.map(engine => [engine.id, engine]));
  const agentMap = new Map(structure.allAgents.map(agent => [agent.id, agent]));
  const pipelines = SYSTEM_PIPELINE_REGISTRY.map(pipeline => {
    const pipelineEvents = events.filter(event => event.pipelineId === pipeline.id);
    const latestEvent = pipelineEvents[0] || null;
    const missingStages = pipeline.stages.filter(engineId => !engineMap.has(engineId));
    const agentCount = pipeline.stages.reduce((sum, engineId) => sum + list(engineMap.get(engineId)?.assignedAgents).length, 0);
    const structuralReady = missingStages.length === 0;
    const runtimeStatus = latestEvent?.status || 'healthy';
    const status = structuralReady ? runtimeStatus : 'blocked';
    return {
      id: pipeline.id,
      label: pipeline.label,
      criticality: pipeline.criticality,
      trigger: pipeline.trigger,
      fallback: pipeline.fallback,
      status,
      structuralReady,
      stageCount: pipeline.stages.length,
      agentCount,
      stages: pipeline.stages,
      missingStages,
      latestEvent
    };
  });
  const layers = SYSTEM_LAYER_REGISTRY.map(layer => {
    const engines = layer.engines.map(engineId => engineMap.get(engineId)).filter(Boolean);
    const pipelineStatuses = pipelines.filter(pipeline => pipeline.stages.some(engineId => layer.engines.includes(engineId))).map(pipeline => pipeline.status);
    const agentIds = unique(engines.flatMap(engine => list(engine.assignedAgents)));
    return {
      id: layer.id,
      order: layer.order,
      label: layer.label,
      purpose: layer.purpose,
      status: summarizeStatus(pipelineStatuses.map(status => ({ status }))) || 'healthy',
      engineCount: engines.length,
      agentCount: agentIds.length,
      pipelineCount: pipelines.filter(pipeline => pipeline.stages.some(engineId => layer.engines.includes(engineId))).length,
      engines: engines.map(engine => ({ id: engine.id, domain: engine.domain, agentCount: list(engine.assignedAgents).length }))
    };
  });
  const incidents = events.filter(event => event.status === 'blocked' || event.status === 'degraded');
  const blockers = [
    ...structure.missingLayerAssignments.map(id => ({ type: 'missing-layer-assignment', id })),
    ...structure.unknownLayerEngines.map(id => ({ type: 'unknown-layer-engine', id })),
    ...structure.duplicateLayerAssignments.map(id => ({ type: 'duplicate-layer-assignment', id })),
    ...structure.unknownPipelineEngines.map(id => ({ type: 'unknown-pipeline-engine', id })),
    ...structure.enginesMissingPipeline.map(id => ({ type: 'engine-without-pipeline', id }))
  ];
  const structuralOk = blockers.length === 0 && structure.assignment.ok;
  const blockedPipelines = pipelines.filter(pipeline => pipeline.status === 'blocked');
  const degradedPipelines = pipelines.filter(pipeline => pipeline.status === 'degraded');
  const score = Math.max(0, 100 - blockers.length * 10 - blockedPipelines.length * 5 - degradedPipelines.length * 2);
  return {
    ok: structuralOk && blockedPipelines.length === 0,
    version: CONTROL_PLANE_VERSION,
    phase: 'managed-system-control-plane',
    checkedAt: nowIso(options),
    score,
    structure: {
      engineCount: structure.allEngines.length,
      agentCount: structure.allAgents.length,
      eventPolicyCount: structure.assignment.eventPolicyCount,
      layerCount: SYSTEM_LAYER_REGISTRY.length,
      pipelineCount: SYSTEM_PIPELINE_REGISTRY.length,
      mappedEngineCount: structure.allEngines.length - structure.missingLayerAssignments.length,
      pipelineCoveredEngineCount: structure.allEngines.length - structure.enginesMissingPipeline.length,
      blockers
    },
    runtime: {
      status: blockedPipelines.length ? 'blocked' : degradedPipelines.length ? 'degraded' : 'healthy',
      eventCount: list(db.systemControlEvents).length,
      incidentCount: incidents.length,
      blockedPipelineCount: blockedPipelines.length,
      degradedPipelineCount: degradedPipelines.length
    },
    layers,
    pipelines,
    recentEvents: events,
    registry: {
      engines: structure.allEngines.map(engine => ({ ...engine, layerId: structure.layerByEngine.get(engine.id) || null })),
      agents: structure.allAgents.map(agent => ({ ...agent, layerId: structure.layerByEngine.get(agent.assignedEngine) || null, engineReady: agentMap.has(agent.id) }))
    }
  };
}

export function buildPublicSystemControlPlaneSummary(db = {}, options = {}) {
  const snapshot = buildSystemControlPlaneSnapshot(db, options);
  return {
    ok: snapshot.ok,
    version: snapshot.version,
    phase: snapshot.phase,
    checkedAt: snapshot.checkedAt,
    publicSafe: true,
    score: snapshot.score,
    summary: {
      engines: snapshot.structure.engineCount,
      agents: snapshot.structure.agentCount,
      layers: snapshot.structure.layerCount,
      pipelines: snapshot.structure.pipelineCount,
      runtimeStatus: snapshot.runtime.status,
      blockedPipelines: snapshot.runtime.blockedPipelineCount,
      degradedPipelines: snapshot.runtime.degradedPipelineCount
    },
    layers: snapshot.layers.map(layer => ({ id: layer.id, label: layer.label, status: publicPipelineStatus(layer.status), engineCount: layer.engineCount, pipelineCount: layer.pipelineCount })),
    pipelines: snapshot.pipelines.map(pipeline => ({ id: pipeline.id, label: pipeline.label, criticality: pipeline.criticality, status: publicPipelineStatus(pipeline.status) }))
  };
}

export function runSystemControlPlanePackageAudit({ files = [], routes = [], sourceText = '', releaseGateText = '' } = {}) {
  const normalizedFiles = list(files).map(file => String(file).replace(/\\/g, '/'));
  const structure = buildStructure();
  const requiredFiles = [
    'server/core/system-control-plane.mjs',
    'server/core/engine-agent-orchestrator.mjs',
    'server/routes/public.mjs',
    'server/routes/admin.mjs',
    'tests/system-control-plane-contract.mjs',
    'scripts/run-release-gate.mjs',
    'docs/SYSTEM_CONTROL_PLANE_KO.md'
  ];
  const checks = [
    { key: 'layerRegistry', weight: 12, pass: SYSTEM_LAYER_REGISTRY.length >= 10, message: '전역 레이어 레지스트리' },
    { key: 'pipelineRegistry', weight: 12, pass: SYSTEM_PIPELINE_REGISTRY.length >= 12, message: '핵심 파이프라인 레지스트리' },
    { key: 'engineLayerCoverage', weight: 14, pass: structure.missingLayerAssignments.length === 0 && structure.unknownLayerEngines.length === 0 && structure.duplicateLayerAssignments.length === 0, message: '모든 엔진의 단일 레이어 배정' },
    { key: 'pipelineCoverage', weight: 14, pass: structure.enginesMissingPipeline.length === 0 && structure.unknownPipelineEngines.length === 0, message: '모든 엔진의 파이프라인 연결' },
    { key: 'requiredFiles', weight: 12, pass: requiredFiles.every(file => normalizedFiles.includes(file)), message: '제어면 핵심 파일 존재' },
    { key: 'publicRoute', weight: 8, pass: routes.includes('/api/public/system-control-plane'), message: '공개 안전 요약 API' },
    { key: 'adminRoute', weight: 8, pass: routes.includes('/api/admin/system-control-plane'), message: '관리자 제어면 API' },
    { key: 'adminAuditRoute', weight: 6, pass: routes.includes('/api/admin/system-control-plane/audit'), message: '관리자 제어면 감사 API' },
    { key: 'adminEventRoute', weight: 6, pass: routes.includes('/api/admin/system-control-plane/events'), message: '관리자 운영 이벤트 기록 API' },
    { key: 'releaseGate', weight: 8, pass: /system-control-plane-contract\.mjs/.test(String(releaseGateText)), message: '최종 릴리즈 게이트 연결' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter(item => !item.pass);
  return { ok: failed.length === 0 && score === 100, score, total: 100, version: CONTROL_PLANE_VERSION, checkedAt: new Date().toISOString(), checks, failed, sourceMarkerPresent: /SYSTEM_CONTROL_PLANE_VERSION/.test(String(sourceText)) };
}
