import { ENGINE_AGENT_ASSIGNMENT_MATRIX, buildEngineAgentAssignment } from './engine-agent-orchestrator.mjs';

const CONTROL_PLANE_VERSION = 'system-control-plane-v1.1.0';
const DEFAULT_EVENT_LIMIT = 50;
const MAX_EVENT_LIMIT = 100;
const MAX_EVENT_STORE = 500;
const DEFAULT_DEDUPE_WINDOW_MS = 60_000;

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
  { id: 'platform-foundation-layer', order: 100, label: '플랫폼 기반', purpose: '전체 레이어를 연결하는 전역 계약, 의존성 그래프, 상태 집계와 비용·품질 기준을 교차 검증합니다.', engines: ['system-control-plane-engine'] }
]);

export const SYSTEM_PIPELINE_REGISTRY = Object.freeze([
  { id: 'startup-security-pipeline', label: '상용 시작 전 보안 검증', ownerLayerId: 'security-compliance-layer', criticality: 'P0', trigger: 'container-start', fallback: 'safe-configuration-hold', dependencies: [], staleAfterMs: 900_000, runbook: 'startup-security', stages: ['environment-lock-engine','security-gate-engine','observability-readiness-engine','system-control-plane-engine'] },
  { id: 'public-diagnosis-pipeline', label: '공개 진단', ownerLayerId: 'diagnosis-intelligence-layer', criticality: 'P0', trigger: 'public-diagnose', fallback: 'safe-public-summary', dependencies: ['startup-security-pipeline'], staleAfterMs: 900_000, runbook: 'public-diagnosis', stages: ['site-intake-normalization-engine','scan-evidence-engine','risk-scoring-engine','privacy-compliance-engine'] },
  { id: 'experience-stitch-pipeline', label: '화면 경험 연결', ownerLayerId: 'experience-edge-layer', criticality: 'P1', trigger: 'page-render', fallback: 'static-safe-ui', dependencies: ['startup-security-pipeline'], staleAfterMs: 1_800_000, runbook: 'experience-stitch', stages: ['portal-dashboard-ux-engine','stitch-design-system-engine','stitch-route-experience-engine','stitch-state-coverage-engine','stitch-function-binding-engine','responsive-contract-engine','accessibility-performance-engine'] },
  { id: 'content-indexing-pipeline', label: '인사이트 발행·색인', ownerLayerId: 'content-growth-layer', criticality: 'P1', trigger: 'publication-cadence', fallback: 'last-known-publication', dependencies: ['startup-security-pipeline'], staleAfterMs: 1_800_000, runbook: 'content-indexing', stages: ['board-publication-engine','seo-feed-engine','structured-data-engine'] },
  { id: 'commerce-fulfillment-pipeline', label: '결제·산출물', ownerLayerId: 'commerce-lifecycle-layer', criticality: 'P0', trigger: 'checkout', fallback: 'payment-disabled-or-review', dependencies: ['startup-security-pipeline','privacy-retention-pipeline'], staleAfterMs: 900_000, runbook: 'commerce-fulfillment', stages: ['product-offer-engine','checkout-consent-engine','rate-limit-abuse-engine','payment-verification-engine','fulfillment-asset-engine'] },
  { id: 'refund-support-pipeline', label: '환불·고객지원', ownerLayerId: 'commerce-lifecycle-layer', criticality: 'P1', trigger: 'refund-request', fallback: 'manual-review-queue', dependencies: ['commerce-fulfillment-pipeline'], staleAfterMs: 1_800_000, runbook: 'refund-support', stages: ['refund-review-engine','customer-support-engine','legal-notice-engine'] },
  { id: 'growth-lifecycle-pipeline', label: '성장·고객 생애주기', ownerLayerId: 'content-growth-layer', criticality: 'P2', trigger: 'scan-or-order-change', fallback: 'baseline-offer', dependencies: ['public-diagnosis-pipeline','content-indexing-pipeline'], staleAfterMs: 3_600_000, runbook: 'growth-lifecycle', stages: ['trustops-growth-engine','fix-generator-engine','agency-whitelabel-engine','revenue-optimization-engine','customer-lifecycle-engine','revenue-forecast-engine','lifecycle-message-engine','conversion-experiment-engine'] },
  { id: 'operator-autopilot-pipeline', label: '운영자 자동화', ownerLayerId: 'operator-automation-layer', criticality: 'P1', trigger: 'operator-cycle', fallback: 'manual-operator-queue', dependencies: ['startup-security-pipeline'], staleAfterMs: 1_800_000, runbook: 'operator-autopilot', stages: ['admin-operations-engine','trustops-autopilot-engine','workqueue-prioritization-engine','trustops-launch-control-engine','incident-playbook-engine','operator-handoff-engine','system-control-plane-engine'] },
  { id: 'monitoring-resilience-pipeline', label: '모니터링·복구', ownerLayerId: 'observability-resilience-layer', criticality: 'P0', trigger: 'health-or-schedule', fallback: 'incident-playbook', dependencies: ['startup-security-pipeline'], staleAfterMs: 900_000, runbook: 'monitoring-resilience', stages: ['observability-readiness-engine','backup-restore-engine','monitoring-loop-engine','production-sentinel-engine','live-verification-engine','rollback-sla-engine','go-live-kpi-engine','cost-quality-budget-engine'] },
  { id: 'privacy-retention-pipeline', label: '개인정보·보존', ownerLayerId: 'security-compliance-layer', criticality: 'P0', trigger: 'data-write-or-prune', fallback: 'write-block-and-review', dependencies: ['startup-security-pipeline'], staleAfterMs: 900_000, runbook: 'privacy-retention', stages: ['privacy-compliance-engine','data-retention-engine','security-gate-engine','backup-restore-engine'] },
  { id: 'quality-governance-pipeline', label: '품질·레드팀', ownerLayerId: 'quality-governance-layer', criticality: 'P1', trigger: 'release-candidate', fallback: 'release-block', dependencies: ['startup-security-pipeline'], staleAfterMs: 1_800_000, runbook: 'quality-governance', stages: ['integration-contract-engine','redteam-governance-engine','responsive-contract-engine','operational-contract-engine','stitch-release-contract-engine'] },
  { id: 'release-delivery-pipeline', label: '릴리즈·납품', ownerLayerId: 'release-delivery-layer', criticality: 'P0', trigger: 'verify-release', fallback: 'delivery-block', dependencies: ['quality-governance-pipeline','monitoring-resilience-pipeline','privacy-retention-pipeline'], staleAfterMs: 900_000, runbook: 'release-delivery', stages: ['release-gate-engine','split-gate-runner-engine','final-handoff-engine','one-hundred-finalizer-engine','system-control-plane-engine'] }
]);

const VALID_EVENT_STATUS = new Set(['healthy','observing','degraded','blocked','recovered']);
const VALID_SEVERITY = new Set(['info','warning','critical']);
const VALID_ACTION = new Set(['observe','hold','resume','review','rollback','redeploy']);
const VALID_CRITICALITY = new Set(['P0','P1','P2']);

function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function unique(values) { return [...new Set(list(values))]; }
function clamp(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
function dateMs(value) { const n = Date.parse(value || ''); return Number.isFinite(n) ? n : 0; }
function nowIso(options = {}) { return typeof options.nowIso === 'function' ? options.nowIso() : (options.nowIso || new Date().toISOString()); }
function cleanToken(value, fallback = '', max = 96) { return String(value || fallback).trim().replace(/[^a-z0-9_.:-]/gi, '-').slice(0, max) || fallback; }
export function redactSensitiveText(value = '') {
  return String(value || '')
    .replace(/\b((?:NV0|POSTGRES|REDIS|SMTP|S3|PORTONE|GEMINI|TURNSTILE)_[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|KEY|URL|CREDENTIAL)[A-Z0-9_]*)\s*=\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+\/-]+=*/gi, '$1 [REDACTED]')
    .replace(/\b(?:nv0|sk|pk|rk)_[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_TOKEN]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)[^@\s/]+@/gi, '$1[REDACTED]@');
}
function cleanText(value, fallback = '', max = 240) { return redactSensitiveText(String(value || fallback)).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max); }
function cleanMetricValue(value) { const n = Number(value); return Number.isFinite(n) ? clamp(n, -1_000_000_000, 1_000_000_000) : undefined; }
function severityForStatus(status) { return status === 'blocked' ? 'critical' : status === 'degraded' ? 'warning' : 'info'; }
function layerIndex() { return new Map(SYSTEM_LAYER_REGISTRY.map(layer => [layer.id, layer])); }
function pipelineIndex() { return new Map(SYSTEM_PIPELINE_REGISTRY.map(pipeline => [pipeline.id, pipeline])); }
function engineLayerIndex() { const map = new Map(); for (const layer of SYSTEM_LAYER_REGISTRY) for (const engineId of layer.engines) map.set(engineId, layer.id); return map; }
function pipelineLayerIds(pipeline, layerByEngine = engineLayerIndex()) { return unique(pipeline.stages.map(engineId => layerByEngine.get(engineId)).filter(Boolean)); }
function statusPriority(status) { return ({ blocked: 5, degraded: 4, observing: 3, recovered: 2, healthy: 1, standby: 0 })[status] ?? 0; }
function summarizeStatus(items = []) { const statuses = list(items).map(item => item.status || 'standby'); return statuses.sort((a, b) => statusPriority(b) - statusPriority(a))[0] || 'standby'; }
function publicPipelineStatus(status) { if (status === 'blocked') return '점검 필요'; if (status === 'degraded') return '일부 점검 필요'; if (status === 'observing') return '관측 중'; if (status === 'recovered') return '복구 확인'; return '정상 연결'; }
function eventFingerprint(event = {}) { return [event.pipelineId,event.layerId,event.status,event.severity,event.action,event.message,event.source,event.correlationId || ''].join('|'); }
function metricObject(value = {}) { return Object.fromEntries(Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value : {}).slice(0, 12).map(([key, item]) => [cleanToken(key, 'metric', 48), cleanMetricValue(item)]).filter(([, item]) => item !== undefined)); }

export function normalizeSystemControlEventPayload(payload = {}, options = {}) {
  const pipelines = pipelineIndex();
  const layers = layerIndex();
  const layerByEngine = engineLayerIndex();
  const pipelineId = cleanToken(payload.pipelineId, '', 96);
  if (!pipelines.has(pipelineId)) throw new Error('지원하지 않는 pipelineId 입니다.');
  const pipeline = pipelines.get(pipelineId);
  const relevantLayerIds = pipelineLayerIds(pipeline, layerByEngine);
  const fallbackLayerId = pipeline.ownerLayerId || relevantLayerIds[0] || 'platform-foundation-layer';
  const layerId = cleanToken(payload.layerId || fallbackLayerId, fallbackLayerId, 96);
  if (!layers.has(layerId)) throw new Error('지원하지 않는 layerId 입니다.');
  if (!relevantLayerIds.includes(layerId)) throw new Error('선택한 layerId는 해당 파이프라인의 책임 레이어가 아닙니다.');
  const status = VALID_EVENT_STATUS.has(String(payload.status || '').trim()) ? String(payload.status).trim() : 'observing';
  const severity = VALID_SEVERITY.has(String(payload.severity || '').trim()) ? String(payload.severity).trim() : severityForStatus(status);
  const action = VALID_ACTION.has(String(payload.action || '').trim()) ? String(payload.action).trim() : 'observe';
  const correlationId = cleanToken(payload.correlationId, '', 96) || null;
  return {
    pipelineId,
    layerId,
    status,
    severity,
    action,
    message: cleanText(payload.message, `${pipeline.label} 상태 기록`, 240),
    source: cleanToken(payload.source, options.source || 'operator', 64),
    correlationId,
    idempotencyKey: cleanToken(payload.idempotencyKey || correlationId, '', 96) || null,
    metrics: metricObject(payload.metrics)
  };
}

export function appendSystemControlEvent(db = {}, payload = {}, options = {}) {
  db.systemControlEvents ||= [];
  const normalized = normalizeSystemControlEventPayload(payload, options);
  const createdAt = nowIso(options);
  const now = dateMs(createdAt) || Date.now();
  const dedupeWindowMs = clamp(options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS, 0, 3_600_000);
  const fingerprint = eventFingerprint(normalized);
  const duplicate = list(db.systemControlEvents).find(event => {
    const age = now - dateMs(event.createdAt);
    if (!Number.isFinite(age) || age < 0 || age > dedupeWindowMs) return false;
    if (normalized.idempotencyKey && event.idempotencyKey === normalized.idempotencyKey) return true;
    return eventFingerprint(event) === fingerprint;
  });
  if (duplicate) return { ...duplicate, deduplicated: true, duplicateOf: duplicate.id };
  const record = {
    id: options.id || `scp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ...normalized,
    createdAt
  };
  db.systemControlEvents.unshift(record);
  db.systemControlEvents = db.systemControlEvents.slice(0, MAX_EVENT_STORE);
  return { ...record, deduplicated: false };
}

function dependencyCycles(pipelines = SYSTEM_PIPELINE_REGISTRY) {
  const index = new Map(pipelines.map(pipeline => [pipeline.id, pipeline]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  function walk(id, path = []) {
    if (visiting.has(id)) { cycles.push([...path, id].join(' -> ')); return; }
    if (visited.has(id) || !index.has(id)) return;
    visiting.add(id);
    const pipeline = index.get(id);
    for (const dependency of list(pipeline.dependencies)) walk(dependency, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const pipeline of pipelines) walk(pipeline.id, []);
  return unique(cycles);
}

function buildStructure() {
  const assignment = buildEngineAgentAssignment({});
  const allEngines = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines;
  const allAgents = ENGINE_AGENT_ASSIGNMENT_MATRIX.agents;
  const layerByEngine = engineLayerIndex();
  const engineIds = new Set(allEngines.map(engine => engine.id));
  const layerIds = SYSTEM_LAYER_REGISTRY.map(layer => layer.id);
  const pipelineIds = SYSTEM_PIPELINE_REGISTRY.map(pipeline => pipeline.id);
  const pipelineIdSet = new Set(pipelineIds);
  const duplicateLayerAssignments = [];
  const seen = new Map();
  for (const layer of SYSTEM_LAYER_REGISTRY) for (const engineId of layer.engines) { if (seen.has(engineId)) duplicateLayerAssignments.push(engineId); seen.set(engineId, layer.id); }
  const missingLayerAssignments = allEngines.filter(engine => !layerByEngine.has(engine.id)).map(engine => engine.id);
  const unknownLayerEngines = [...seen.keys()].filter(engineId => !engineIds.has(engineId));
  const unknownPipelineEngines = SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => pipeline.stages).filter(engineId => !engineIds.has(engineId));
  const pipelineCoveredEngines = new Set(SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => pipeline.stages));
  const enginesMissingPipeline = allEngines.filter(engine => !pipelineCoveredEngines.has(engine.id)).map(engine => engine.id);
  const duplicateLayerIds = layerIds.filter((id, index) => index > 0 && id === layerIds[index - 1]).concat(layerIds.filter((id, index) => layerIds.indexOf(id) !== index));
  const duplicatePipelineIds = pipelineIds.filter((id, index) => pipelineIds.indexOf(id) !== index);
  const emptyLayers = SYSTEM_LAYER_REGISTRY.filter(layer => layer.engines.length === 0).map(layer => layer.id);
  const emptyPipelines = SYSTEM_PIPELINE_REGISTRY.filter(pipeline => pipeline.stages.length === 0).map(pipeline => pipeline.id);
  const pipelinesWithDuplicateStages = SYSTEM_PIPELINE_REGISTRY.filter(pipeline => pipeline.stages.length !== new Set(pipeline.stages).size).map(pipeline => pipeline.id);
  const unknownPipelineDependencies = SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => list(pipeline.dependencies).filter(id => !pipelineIdSet.has(id)).map(id => `${pipeline.id}:${id}`));
  const invalidPipelineCriticality = SYSTEM_PIPELINE_REGISTRY.filter(pipeline => !VALID_CRITICALITY.has(pipeline.criticality)).map(pipeline => pipeline.id);
  const invalidPipelineOwnerLayers = SYSTEM_PIPELINE_REGISTRY.filter(pipeline => !layerIds.includes(pipeline.ownerLayerId) || !pipelineLayerIds(pipeline, layerByEngine).includes(pipeline.ownerLayerId)).map(pipeline => pipeline.id);
  return {
    assignment, allEngines, allAgents, layerByEngine, missingLayerAssignments,
    unknownLayerEngines: unique(unknownLayerEngines), duplicateLayerAssignments: unique(duplicateLayerAssignments),
    unknownPipelineEngines: unique(unknownPipelineEngines), enginesMissingPipeline,
    duplicateLayerIds: unique(duplicateLayerIds), duplicatePipelineIds: unique(duplicatePipelineIds), emptyLayers, emptyPipelines,
    pipelinesWithDuplicateStages, unknownPipelineDependencies: unique(unknownPipelineDependencies), dependencyCycles: dependencyCycles(),
    invalidPipelineCriticality, invalidPipelineOwnerLayers
  };
}

function recentControlEvents(db = {}, limit = DEFAULT_EVENT_LIMIT) {
  const safeLimit = clamp(limit, 1, MAX_EVENT_LIMIT);
  return list(db.systemControlEvents).slice().sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt)).slice(0, safeLimit).map(event => ({
    id: cleanToken(event.id, 'event', 96), pipelineId: cleanToken(event.pipelineId, 'unknown', 96), layerId: cleanToken(event.layerId, 'unknown', 96),
    status: VALID_EVENT_STATUS.has(event.status) ? event.status : 'observing', severity: VALID_SEVERITY.has(event.severity) ? event.severity : 'info', action: VALID_ACTION.has(event.action) ? event.action : 'observe',
    message: cleanText(event.message, '', 240), source: cleanToken(event.source, 'unknown', 64), correlationId: cleanToken(event.correlationId, '', 96) || null,
    idempotencyKey: cleanToken(event.idempotencyKey, '', 96) || null, metrics: metricObject(event.metrics), createdAt: event.createdAt || null
  }));
}

function effectivePipelineStatuses(pipelines = []) {
  const byId = new Map(pipelines.map(pipeline => [pipeline.id, pipeline]));
  const memo = new Map();
  function resolve(id, chain = []) {
    if (memo.has(id)) return memo.get(id);
    const pipeline = byId.get(id);
    if (!pipeline || chain.includes(id)) return { status: 'blocked', blockedBy: chain.includes(id) ? ['dependency-cycle'] : ['missing-dependency'], degradedBy: [] };
    const dependencyStates = list(pipeline.dependencies).map(dependency => ({ dependency, ...resolve(dependency, [...chain, id]) }));
    const blockedBy = dependencyStates.filter(item => item.status === 'blocked').map(item => item.dependency);
    const degradedBy = dependencyStates.filter(item => item.status === 'degraded' || item.status === 'observing').map(item => item.dependency);
    let status = pipeline.baseStatus;
    if (blockedBy.length) status = 'blocked';
    else if (statusPriority(status) < statusPriority('degraded') && degradedBy.some(id => byId.get(id)?.baseStatus === 'degraded')) status = 'degraded';
    else if (statusPriority(status) < statusPriority('observing') && degradedBy.length) status = 'observing';
    const result = { status, blockedBy, degradedBy };
    memo.set(id, result);
    return result;
  }
  return new Map(pipelines.map(pipeline => [pipeline.id, resolve(pipeline.id)]));
}

export function buildSystemControlPlaneSnapshot(db = {}, options = {}) {
  const structure = buildStructure();
  const events = recentControlEvents(db, options.eventLimit || DEFAULT_EVENT_LIMIT);
  const engineMap = new Map(structure.allEngines.map(engine => [engine.id, engine]));
  const agentMap = new Map(structure.allAgents.map(agent => [agent.id, agent]));
  const now = dateMs(nowIso(options)) || Date.now();
  const basePipelines = SYSTEM_PIPELINE_REGISTRY.map(pipeline => {
    const pipelineEvents = events.filter(event => event.pipelineId === pipeline.id);
    const latestEvent = pipelineEvents[0] || null;
    const missingStages = pipeline.stages.filter(engineId => !engineMap.has(engineId));
    const agentCount = pipeline.stages.reduce((sum, engineId) => sum + list(engineMap.get(engineId)?.assignedAgents).length, 0);
    const structuralReady = missingStages.length === 0;
    const ageMs = latestEvent ? Math.max(0, now - dateMs(latestEvent.createdAt)) : null;
    return { ...pipeline, baseStatus: structuralReady ? (latestEvent?.status || 'healthy') : 'blocked', structuralReady, stageCount: pipeline.stages.length, agentCount, missingStages, latestEvent, latestEventAgeMs: ageMs, freshness: !latestEvent ? 'no-signal' : ageMs > pipeline.staleAfterMs ? 'stale' : 'fresh' };
  });
  const effective = effectivePipelineStatuses(basePipelines);
  const pipelines = basePipelines.map(pipeline => ({ ...pipeline, ...effective.get(pipeline.id) }));
  const layers = SYSTEM_LAYER_REGISTRY.map(layer => {
    const engines = layer.engines.map(engineId => engineMap.get(engineId)).filter(Boolean);
    const relatedPipelines = pipelines.filter(pipeline => pipeline.stages.some(engineId => layer.engines.includes(engineId)));
    const agentIds = unique(engines.flatMap(engine => list(engine.assignedAgents)));
    return { id: layer.id, order: layer.order, label: layer.label, purpose: layer.purpose, status: summarizeStatus(relatedPipelines) || 'standby', engineCount: engines.length, agentCount: agentIds.length, pipelineCount: relatedPipelines.length, engines: engines.map(engine => ({ id: engine.id, domain: engine.domain, agentCount: list(engine.assignedAgents).length })) };
  });
  const blockers = [
    ...structure.missingLayerAssignments.map(id => ({ type: 'missing-layer-assignment', id })), ...structure.unknownLayerEngines.map(id => ({ type: 'unknown-layer-engine', id })), ...structure.duplicateLayerAssignments.map(id => ({ type: 'duplicate-layer-assignment', id })),
    ...structure.unknownPipelineEngines.map(id => ({ type: 'unknown-pipeline-engine', id })), ...structure.enginesMissingPipeline.map(id => ({ type: 'engine-without-pipeline', id })), ...structure.duplicateLayerIds.map(id => ({ type: 'duplicate-layer-id', id })),
    ...structure.duplicatePipelineIds.map(id => ({ type: 'duplicate-pipeline-id', id })), ...structure.emptyLayers.map(id => ({ type: 'empty-layer', id })), ...structure.emptyPipelines.map(id => ({ type: 'empty-pipeline', id })),
    ...structure.pipelinesWithDuplicateStages.map(id => ({ type: 'duplicate-pipeline-stage', id })), ...structure.unknownPipelineDependencies.map(id => ({ type: 'unknown-pipeline-dependency', id })), ...structure.dependencyCycles.map(id => ({ type: 'pipeline-dependency-cycle', id })),
    ...structure.invalidPipelineCriticality.map(id => ({ type: 'invalid-pipeline-criticality', id })), ...structure.invalidPipelineOwnerLayers.map(id => ({ type: 'invalid-pipeline-owner-layer', id }))
  ];
  const structuralOk = blockers.length === 0 && structure.assignment.ok;
  const blockedPipelines = pipelines.filter(pipeline => pipeline.status === 'blocked');
  const degradedPipelines = pipelines.filter(pipeline => pipeline.status === 'degraded');
  const observingPipelines = pipelines.filter(pipeline => pipeline.status === 'observing');
  const historicalIncidents = events.filter(event => event.status === 'blocked' || event.status === 'degraded');
  const criticalityPenalty = pipeline => pipeline.criticality === 'P0' ? 8 : pipeline.criticality === 'P1' ? 5 : 3;
  const score = Math.max(0, 100 - blockers.length * 10 - blockedPipelines.reduce((sum, pipeline) => sum + criticalityPenalty(pipeline), 0) - degradedPipelines.reduce((sum, pipeline) => sum + Math.ceil(criticalityPenalty(pipeline) / 2), 0));
  return {
    ok: structuralOk && blockedPipelines.length === 0,
    version: CONTROL_PLANE_VERSION, phase: 'managed-system-control-plane', checkedAt: nowIso(options), score,
    structure: { engineCount: structure.allEngines.length, agentCount: structure.allAgents.length, eventPolicyCount: structure.assignment.eventPolicyCount, layerCount: SYSTEM_LAYER_REGISTRY.length, pipelineCount: SYSTEM_PIPELINE_REGISTRY.length, mappedEngineCount: structure.allEngines.length - structure.missingLayerAssignments.length, pipelineCoveredEngineCount: structure.allEngines.length - structure.enginesMissingPipeline.length, dependencyCount: SYSTEM_PIPELINE_REGISTRY.reduce((sum, pipeline) => sum + pipeline.dependencies.length, 0), blockers },
    runtime: { status: blockedPipelines.length ? 'blocked' : degradedPipelines.length ? 'degraded' : observingPipelines.length ? 'observing' : 'healthy', eventCount: list(db.systemControlEvents).length, activeIncidentCount: blockedPipelines.length + degradedPipelines.length, historicalIncidentCount: historicalIncidents.length, blockedPipelineCount: blockedPipelines.length, degradedPipelineCount: degradedPipelines.length, observingPipelineCount: observingPipelines.length, actionRequiredCount: blockedPipelines.length + degradedPipelines.length },
    layers, pipelines, recentEvents: events,
    registry: { engines: structure.allEngines.map(engine => ({ ...engine, layerId: structure.layerByEngine.get(engine.id) || null })), agents: structure.allAgents.map(agent => ({ ...agent, layerId: structure.layerByEngine.get(agent.assignedEngine) || null, engineReady: engineMap.has(agent.assignedEngine), registered: agentMap.has(agent.id) })) }
  };
}

export function buildPublicSystemControlPlaneSummary(db = {}, options = {}) {
  const snapshot = buildSystemControlPlaneSnapshot(db, options);
  return { ok: snapshot.ok, version: snapshot.version, phase: snapshot.phase, checkedAt: snapshot.checkedAt, publicSafe: true, score: snapshot.score,
    summary: { engines: snapshot.structure.engineCount, agents: snapshot.structure.agentCount, layers: snapshot.structure.layerCount, pipelines: snapshot.structure.pipelineCount, runtimeStatus: snapshot.runtime.status, blockedPipelines: snapshot.runtime.blockedPipelineCount, degradedPipelines: snapshot.runtime.degradedPipelineCount },
    layers: snapshot.layers.map(layer => ({ id: layer.id, label: layer.label, status: publicPipelineStatus(layer.status), engineCount: layer.engineCount, pipelineCount: layer.pipelineCount })),
    pipelines: snapshot.pipelines.map(pipeline => ({ id: pipeline.id, label: pipeline.label, criticality: pipeline.criticality, status: publicPipelineStatus(pipeline.status) })) };
}

export function runSystemControlPlanePackageAudit({ files = [], routes = [], sourceText = '', releaseGateText = '' } = {}) {
  const normalizedFiles = list(files).map(file => String(file).replace(/\\/g, '/'));
  const structure = buildStructure();
  const requiredFiles = ['server/core/system-control-plane.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs','tests/system-control-plane-contract.mjs','tests/system-control-plane-operations-hardening-contract.mjs','scripts/run-release-gate.mjs','docs/SYSTEM_CONTROL_PLANE_KO.md','docs/SYSTEM_CONTROL_PLANE_OPERATIONS_HARDENING_KO.md'];
  const checks = [
    { key: 'layerRegistry', weight: 8, pass: SYSTEM_LAYER_REGISTRY.length >= 10, message: '전역 레이어 레지스트리' },
    { key: 'nonEmptyLayers', weight: 8, pass: structure.emptyLayers.length === 0, message: '모든 레이어 책임 엔진 배정' },
    { key: 'pipelineRegistry', weight: 8, pass: SYSTEM_PIPELINE_REGISTRY.length >= 12, message: '핵심 파이프라인 레지스트리' },
    { key: 'engineLayerCoverage', weight: 12, pass: structure.missingLayerAssignments.length === 0 && structure.unknownLayerEngines.length === 0 && structure.duplicateLayerAssignments.length === 0, message: '모든 엔진의 단일 레이어 배정' },
    { key: 'pipelineCoverage', weight: 12, pass: structure.enginesMissingPipeline.length === 0 && structure.unknownPipelineEngines.length === 0, message: '모든 엔진의 파이프라인 연결' },
    { key: 'dependencyGraph', weight: 10, pass: structure.unknownPipelineDependencies.length === 0 && structure.dependencyCycles.length === 0 && structure.invalidPipelineOwnerLayers.length === 0, message: '파이프라인 의존성 DAG와 책임 레이어' },
    { key: 'eventSafety', weight: 10, pass: /redactSensitiveText/.test(String(sourceText)) && /idempotencyKey/.test(String(sourceText)) && /dedupeWindowMs/.test(String(sourceText)), message: '운영 이벤트 마스킹·중복 억제' },
    { key: 'requiredFiles', weight: 10, pass: requiredFiles.every(file => normalizedFiles.includes(file)), message: '제어면 핵심 파일 존재' },
    { key: 'routes', weight: 8, pass: ['/api/public/system-control-plane','/api/admin/system-control-plane','/api/admin/system-control-plane/audit','/api/admin/system-control-plane/events'].every(route => routes.includes(route)), message: '공개·관리자 제어면 API' },
    { key: 'releaseGate', weight: 8, pass: /system-control-plane-contract\.mjs/.test(String(releaseGateText)) && /system-control-plane-operations-hardening-contract\.mjs/.test(String(releaseGateText)), message: '최종 릴리즈 게이트 연결' },
    { key: 'registryIntegrity', weight: 6, pass: structure.duplicateLayerIds.length === 0 && structure.duplicatePipelineIds.length === 0 && structure.emptyPipelines.length === 0 && structure.pipelinesWithDuplicateStages.length === 0 && structure.invalidPipelineCriticality.length === 0, message: '레지스트리 무결성' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter(item => !item.pass);
  return { ok: failed.length === 0 && score === 100, score, total: 100, version: CONTROL_PLANE_VERSION, checkedAt: new Date().toISOString(), checks, failed, sourceMarkerPresent: /SYSTEM_CONTROL_PLANE_VERSION/.test(String(sourceText)) };
}
