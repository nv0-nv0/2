// Phase166 public API dispatcher for native http.createServer routing.
import { createAccountRouteHandler } from './account.mjs';
import { createPaymentRouteHandler } from './payment.mjs';
import { buildDemoAccuracyContract, buildDemoIssueOverview, buildPaidDeliverableBlueprint, buildPaidOutputQualityGate, buildPaidFullDetailContract, buildSiteOperationsDocument, buildConversionUrgencyModel, PHASE220_SERVICE_QUALITY_VERSION } from '../core/service-quality-220.mjs';
import { buildPublicColumnEnginePosts, publicColumnTypeLabel } from '../core/public-column-engine.mjs';
import { buildPaidServiceOperatingModel } from '../core/paid-service-operating-model.mjs';
import { buildTrustOpsGrowthBlueprint, buildFixGeneratorPayload, buildMonitoringPlan, buildRevenueOptimizationPlan, buildIndustryTemplates, buildStructuredDataPackage } from '../core/trustops-growth-engine.mjs';
import { buildTrustOpsAutopilotCockpit, buildCustomerLifecyclePlan, buildAutomationWorkQueue } from '../core/trustops-autopilot-engine.mjs';
import { buildTrustOpsLaunchControl, buildLifecycleMessageSequence } from '../core/trustops-launch-control.mjs';
import { buildProductionSentinel, buildLiveVerificationChecklist } from '../core/trustops-production-sentinel.mjs';
import { buildTrustOpsFinalHandoff } from '../core/trustops-final-handoff.mjs';
import { buildTrustOps100PointFinalScorecard } from '../core/trustops-100-point-finalizer.mjs';
import { buildTrustOpsCompleteDelivery } from '../core/trustops-complete-delivery.mjs';
import { applyEngineAgentGate, appendEngineAgentEvent } from '../core/engine-agent-orchestrator.mjs';
import { buildUnifiedOrganismStatus, normalizeClientMetric } from '../core/unified-platform-organism.mjs';

export function createPublicRouteHandler(ctx) {
  const {
  ADMIN_AUTH_WINDOW_MS,
  AI_REVIEW_ENABLED,
  AI_REVIEW_PROVIDER,
  BUSINESS_PROFILE,
  COMMERCIAL_LAUNCH_READY,
  CTA_AUTOPUBLISH_INTERVAL_MS,
  DATA_DIR,
  DEPLOYMENT_RISK_GUARD,
  DEPLOYMENT_STAGE,
  MAX_JSON_BODY_BYTES,
  PAYMENT_PROVIDER,
  PHASE223_RISK_GUARD_VERSION,
  PERSISTENCE_MODE,
  PLATFORM,
  PORTONE_CLIENT,
  PORTONE_WEBHOOK_SECRET,
  PORTONE_WEBHOOK_VERIFY_MODE,
  PRELAUNCH_MODE,
  ALLOW_PRELAUNCH_ONLINE_PAYMENT,
  PUBLIC_SCAN_LIMIT,
  PUBLIC_SCAN_WINDOW_MS,
  READYZ_REDIS_STRICT,
  RELEASE_PHASE,
  REPORTS_DIR,
  RULES_VERSION,
  SCAN_PROVIDER,
  STORAGE_MODE,
  TARGET_FETCH_AUTOMATION_LEVEL,
  TARGET_FETCH_ENABLED,
  TARGET_FETCH_MAX_DISCOVERY_RESOURCES,
  TARGET_FETCH_MAX_PAGES,
  TARGET_FETCH_ROBOTS_ENABLED,
  TARGET_FETCH_SITEMAP_ENABLED,
  TURNSTILE_CONFIGURED,
  TURNSTILE_PUBLIC_ENABLED,
  TURNSTILE_SITE_KEY,
  UPLOADS_DIR,
  annotateOffersWithIntelligence,
  appendAudit,
  appendWebhookInbox,
  asTrimmedString,
  assertCommercialRouteAllowed,
  bodyJson,
  bodyText,
  buildAssetPdfBuffer,
  buildDiagnosisAccuracyProfile,
  buildCommercialFinalGate,
  buildCommercialOfferCatalog,
  buildFeedXml,
  buildHardeningMatrix,
  buildOpenApiSpec,
  buildPlanCatalog,
  buildPricingRecalculation,
  buildPolicyDocumentPreview,
  buildWorkOrderPreview,
  buildPortalSummary,
  buildProductAgentRuntimeStatus,
  buildEngineAgentRuntimeStatus,
  buildCommercialReadinessStatus,
  buildProductDashboard,
  buildProductIntelligence,
  buildProductionLaunchChecklist,
  buildPublicDiagnosisPackage,
  buildReleaseReadiness,
  buildPhase313GovernanceSnapshot,
  buildRobotsTxt,
  buildRuleCatalog,
  buildSitemapXml,
  buildSmartProductOrchestration,
  buildSmartPublicSnapshot,
  buildSystemItemsFeed,
  canAccessOrder,
  clamp,
  clientIp,
  completeCheckoutOrder,
  createCheckoutOrder,
  createCtaPublication,
  createCtaPublicationIfDue,
  createGuidanceDocument,
  createPasswordResetToken,
  crypto,
  ctaCombinationStats,
  ctaTopicPacks,
  customerOrders,
  customerRecentScans,
  customerSavedSites,
  customerSessionCookie,
  distributedLock,
  enqueueTransactionalEmail,
  ensureFulfillmentForOrder,
  ensureRuntime,
  ensureSiteRecord,
  ensureSubscriptionForSite,
  expiredCustomerSessionCookie,
  findIdempotencyRecord,
  findLatestGuidanceForSite,
  findSiteByAny,
  fs,
  generateOrderAccessToken,
  getCommercialOffer,
  getCustomerSession,
  getIdempotencyKey,
  handleAccountRescan,
  hashPassword,
  hashPasswordResetToken,
  hashRequestPayload,
  hitRateLimit,
  isRefundRequestAllowed,
  isValidEmail,
  json,
  linkCustomerToSite,
  normalizeCheckoutPayload,
  normalizeDocumentPreviewPayload,
  normalizeDomainInput,
  normalizeEmail,
  normalizeMarketingConsentPayload,
  normalizeRefundRequestPayload,
  normalizeSavedSitePayload,
  normalizeScanPayload,
  nowIso,
  ownsOrder,
  parseCookies,
  path,
  persistence,
  publicCustomer,
  pseudonymizeIp,
  privacyComplianceSummary,
  sanitizeOrderForPublic,
  rateLimitStore,
  readDb,
  scanResultFor,
  seedAutoFixJobs,
  sessionStore,
  storeIdempotencyRecord,
  syncPortOneCheckoutOrder,
  text,
  toPublicBoardPost,
  uid,
  validateConfig,
  verifyPassword,
  verifyPortOneWebhook,
  verifyTurnstile,
  writeDb
  } = ctx;
  const accountRouteHandler = createAccountRouteHandler(ctx);
  const paymentRouteHandler = createPaymentRouteHandler(ctx);


function cleanLegacyPublicTokens(value) {
  if (typeof value === 'string') {
    return value
      .replace(/전문가 리포트/g, '전문가 리포트')
      .replace(/Auto\s*정기\s*케어/g, '전문가 리포트')
      .replace(/문서 초안/g, '전문가 리포트')
      .replace(/상세 리포트/g, '기본 리포트')
      .replace(/다음 행동\s*게시판/g, '게시판')
      .replace(/자동\s*발행\s*200/g, '')
      .replace(/자동 발행|20분에\s*1회|20분\s*주기|20분 발행|20분마다/g, '정기 업데이트')
      .replace(/내 사이트 관리/g, '고객 포털')
      .replace(/상품·요금/g, '요금제')
      .replace(/TrustOps|rollback|canary|sentinel|prelaunch|phase\d+/gi, '')
      .replace(/contentFingerprint|combinationMode|publicDisplayVersion/gi, '공개 항목');
  }
  if (Array.isArray(value)) return value.map(cleanLegacyPublicTokens);
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      if (/contentFingerprint|combinationMode|publicDisplayVersion/i.test(key)) continue;
      next[key] = cleanLegacyPublicTokens(val);
    }
    return next;
  }
  return value;
}

function hasPaidScanAccess(db, customer, scan) {
if (!customer || !scan) return false;
const sameSite = (order) => !!order?.siteId && !!scan.siteId && order.siteId === scan.siteId;
const sameDomain = (order) => order?.domain && scan?.target && normalizeDomainInput(order.domain) === normalizeDomainInput(scan.target);
const ownsPaidOrder = (db.orders || []).some(order => order.status === 'paid' && ownsOrder(customer, order) && (sameSite(order) || sameDomain(order)));
const activeSubscription = (db.subscriptions || []).some(sub => sub.status === 'active' && !!scan.siteId && sub.siteId === scan.siteId);
return ownsPaidOrder || activeSubscription;
}
function summarizeScanForLoginMember(scan) {
const topFindings = Array.isArray(scan?.topFindings) ? scan.topFindings.slice(0, 3) : [];
const detailFindings = Array.isArray(scan?.detailFindings) ? scan.detailFindings.slice(0, 2).map(item => ({ title: item.title || item.code || '점검 항목', priority: item.priority || '확인', category: item.category || '요약', recommendation: '상세 근거와 수정 문구안은 결제 후 구매 산출물 영역에서 확인할 수 있습니다.' })) : [];
return { requestId: scan?.requestId || null, siteId: scan?.siteId || null, target: scan?.target || '', riskScore: scan?.riskScore ?? null, riskLevel: scan?.riskLevel || null, totalFindings: scan?.totalFindings ?? detailFindings.length, topFindings, detailFindings, demoIssueOverview: scan?.demoIssueOverview || buildDemoIssueOverview(scan || {}), conversionUrgency: scan?.conversionUrgency || buildConversionUrgencyModel(scan || {}, { plan: scan?.recommendedPlan || 'Report' }), diagnosis: { summary: scan?.summary || '무료진단 요약 결과입니다.', locked: true, lockedReason: 'paid_required' }, savedToAccount: true, paidAccess: false, locked: true };
}

  return async function handlePublicRoutes(req, res, state = {}) {
  const routeState = state.requestUrl ? state : req._nv0RouteState;
  if (!routeState || !routeState.requestUrl) return false;
  const url = routeState.requestUrl;
  const pathname = routeState.pathname;
  const isLegacyDiagnosticStart = pathname === '/api/diagnostics/start';
  if (!pathname.startsWith('/api/public/') && !isLegacyDiagnosticStart) return false;
  const accountHandled = await accountRouteHandler(req, res, { requestUrl: url, pathname });
  if (accountHandled !== false) return accountHandled;
  const paymentHandled = await paymentRouteHandler(req, res, { requestUrl: url, pathname });
  if (paymentHandled !== false) return paymentHandled;
  const customerHiddenOperationalEndpoints = new Set([
    '/api/public/diagnosis-engine',
    '/api/public/privacy-status',
    '/api/public/governance-status',
    '/api/public/risk-guard',
    '/api/public/openapi.json',
    '/api/public/hardening-matrix',
    '/api/public/release-readiness',
    '/api/public/launch-checklist',
    '/api/public/commercial-final-gate',
    '/api/public/commercial-readiness',
    '/api/public/product-agent-status',
    '/api/public/engine-agent-status',
    '/api/public/organism-status',
    '/api/public/product-intelligence',
    '/api/public/product-quality',
    '/api/public/trustops-blueprint',
    '/api/public/fix-generator',
    '/api/public/monitoring-plan',
    '/api/public/revenue-optimization',
    '/api/public/structured-data-package',
    '/api/public/trustops-autopilot',
    '/api/public/customer-lifecycle',
    '/api/public/automation-workqueue',
    '/api/public/trustops-launch-control',
    '/api/public/lifecycle-message-sequence',
    '/api/public/trustops-production-sentinel',
    '/api/public/live-verification-checklist',
    '/api/public/trustops-final-handoff',
    '/api/public/trustops-100-final',
    '/api/public/trustops-complete-delivery'
  ]);
  if (customerHiddenOperationalEndpoints.has(pathname)) {
    return json(req, res, 404, { ok: false, error: 'Not found' }, { 'cache-control': 'no-store' });
  }
if (pathname === '/api/public/diagnosis-engine' && req.method === 'GET') {
return json(req, res, 200, { ok: true, phase: RELEASE_PHASE, engine: 'VERIDION Public Evidence Summary Check Engine', rulesVersion: RULES_VERSION, targetFetchEnabled: TARGET_FETCH_ENABLED, scanProvider: SCAN_PROVIDER, aiReviewProvider: AI_REVIEW_PROVIDER, geminiConfigured: AI_REVIEW_ENABLED, resultContract: { resultType: 'preliminary_check', legalConclusion: false, includesEvidenceSummary: true, includesConfidenceScore: true, includesManualReviewFlags: true, includesAutomationDisclosure: true, includesAutomatedActionPlan: true, includesAccuracyProfile: true, includesReportQualityGate: true, includesDemoAccuracyContract: true, includesPaidOutputQualityGate: true, phase220ServiceQualityVersion: PHASE220_SERVICE_QUALITY_VERSION, phase223RiskGuardVersion: PHASE223_RISK_GUARD_VERSION }, endpoints: { scan: 'POST /api/public/scan', diagnose: 'POST /api/public/diagnose', board: 'GET /api/public/board', engine: 'GET /api/public/diagnosis-engine', productIntelligence: 'GET /api/public/product-intelligence', productQuality: 'GET /api/public/product-quality', productAgentStatus: 'GET /api/public/product-agent-status' }, smartProduct: { version: 'p153-smart-ops-v1', nextBestAction: true, planFitScoring: true, journeyOrchestration: true, smartProductEndpoint: '/api/public/smart-product', userPath: ['무료 요약','요금제 선택','고객 포털','인사이트 확인'] }, insightUpdate: { boardName: '인사이트', cadenceLabel: '정기 업데이트' }, automation: { mode: TARGET_FETCH_AUTOMATION_LEVEL, robotsEnabled: TARGET_FETCH_ROBOTS_ENABLED, sitemapEnabled: TARGET_FETCH_SITEMAP_ENABLED, maxPages: TARGET_FETCH_MAX_PAGES, maxDiscoveryResources: TARGET_FETCH_MAX_DISCOVERY_RESOURCES, notice: '자동 확인 가능한 공개 항목은 모두 처리하고 자동 확정 불가 영역은 직접 확인으로 고지합니다.' }, checks: buildRuleCatalog().map(({ code, category, title, severity, penaltyMax }) => ({ code, category, title, severity, penaltyMax })) });
}

if (((pathname === '/api/public/diagnose' || pathname === '/api/public/scan') && req.method === 'POST') || (isLegacyDiagnosticStart && req.method === 'POST')) {
const rate = await hitRateLimit('public-diagnose', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: PUBLIC_SCAN_LIMIT });
if (rate.blocked) return json(req, res, 429, { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
let payload;
try {
const rawPayload = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
if (isLegacyDiagnosticStart && rawPayload.url && !rawPayload.target && !/^https?:\/\//i.test(String(rawPayload.url))) {
  rawPayload.url = `https://${String(rawPayload.url).trim()}`;
}
payload = normalizeScanPayload(rawPayload);
} catch (error) {
return json(req, res, 400, { ok: false, error: error.message || '진단할 사이트 주소가 필요합니다.' });
}
if (TURNSTILE_PUBLIC_ENABLED && TURNSTILE_CONFIGURED) {
const challenge = await verifyTurnstile(req, payload.turnstileToken);
if (!challenge.ok) return json(req, res, 400, { ok: false, error: '보안 확인을 완료한 뒤 다시 시도해 주세요.' });
}
const db = await readDb();
const session = await getCustomerSession(req, db);
const scan = await scanResultFor(payload.target, db);
const site = ensureSiteRecord(db, scan);
scan.siteId = scan.siteId || site.id;
scan.requestId = scan.requestId || uid('scan');
scan.customerId = session?.customer?.id || scan.customerId || null;
scan.savedToAccount = !!session;
scan.paidAccess = false;
scan.locked = true;
db.scans ||= [];
const existingIndex = db.scans.findIndex(item => item.requestId === scan.requestId || (item.siteId === scan.siteId && item.target === scan.target && item.generatedAt === scan.generatedAt));
if (existingIndex >= 0) db.scans[existingIndex] = { ...db.scans[existingIndex], ...scan };
else db.scans.unshift(scan);
db.scans = db.scans.slice(0, 120);
if (session?.customer && site?.id) linkCustomerToSite(db, session.customer.id, site, { label: site.domain || scan.target, memo: '무료 진단 결과 저장' });
try { createCtaPublicationIfDue(db, scan, { force: false }); } catch {}
const diagnosisAgentGate = applyEngineAgentGate('diagnosis.completed', {
  target: scan.target,
  requestId: scan.requestId,
  siteId: scan.siteId,
  locked: scan.locked,
  legalConclusion: scan.legalConclusion === true
}, { stage: 'public-diagnose', nowIso: nowIso() });
appendEngineAgentEvent(db, diagnosisAgentGate);
if (!diagnosisAgentGate.ok) return json(req, res, 500, { ok: false, error: '진단 엔진 에이전트 게이트를 통과하지 못했습니다.', gate: diagnosisAgentGate });
appendAudit(db, req, 'public.diagnose.completed', { siteId: scan.siteId, requestId: scan.requestId, target: scan.target, customerId: session?.customer?.id || null, engineAgentGate: diagnosisAgentGate.ok });
await writeDb(db);
const portalUrl = `/portal?siteId=${encodeURIComponent(scan.siteId || '')}&requestId=${encodeURIComponent(scan.requestId || '')}`;
const reportUrl = `/products/veridion/demo?target=${encodeURIComponent(scan.target || payload.target)}`;
const trustOpsBlueprint = buildTrustOpsGrowthBlueprint({ scan, site, offers: buildCommercialOfferCatalog(), siteUrl: scan.target || payload.target });
const resultPayload = { ...scan, portalUrl, redirectUrl: portalUrl, reportUrl, diagnosis: buildPublicDiagnosisPackage(scan), demoIssueOverview: scan.demoIssueOverview || buildDemoIssueOverview(scan), conversionUrgency: scan.conversionUrgency || buildConversionUrgencyModel(scan, { plan: scan.recommendedPlan || 'Report' }), trustOpsBlueprint: { positioning: trustOpsBlueprint.positioning, trustScores: trustOpsBlueprint.trustScores, conversionFunnel: trustOpsBlueprint.conversionFunnel, fixPreview: trustOpsBlueprint.fixPack.fixes.slice(0, 2), monitoring: trustOpsBlueprint.monitoring, improvementBacklogCount: trustOpsBlueprint.improvementBacklogCount }, savedToAccount: !!session, paidAccess: false, locked: true, handoff: { next: 'portal', portalUrl, reportUrl, source: payload.source || (isLegacyDiagnosticStart ? 'legacy-diagnostics-start' : 'public-diagnose') } };
if (isLegacyDiagnosticStart) {
  const compatScan = { ...resultPayload, id: scan.requestId, scanId: scan.requestId, domain: site.domain || scan.domain || scan.target, targetUrl: scan.target, status: 'completed' };
  return json(req, res, 200, cleanLegacyPublicTokens({ ok: true, status: 'completed', portalUrl, redirectUrl: portalUrl, reportUrl, result: resultPayload, scan: compatScan }), { 'cache-control': 'no-store' });
}
return json(req, res, 200, cleanLegacyPublicTokens({ ok: true, status: 'completed', portalUrl, redirectUrl: portalUrl, reportUrl, result: resultPayload, scan: { ...resultPayload, id: scan.requestId, scanId: scan.requestId, domain: site.domain || scan.domain || scan.target, targetUrl: scan.target, status: 'completed' } }), { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/config' && req.method === 'GET') {
return json(req, res, 200, { ok: true, turnstileEnabled: TURNSTILE_PUBLIC_ENABLED, turnstileConfigured: TURNSTILE_CONFIGURED, turnstileSiteKey: TURNSTILE_PUBLIC_ENABLED ? TURNSTILE_SITE_KEY : '' });
}
if (pathname === '/api/public/health' && req.method === 'GET') {
return json(req, res, 200, { ok: true, area: 'public', service: 'VERIDION', time: nowIso() }, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/privacy-status' && req.method === 'GET') {
return json(req, res, 200, { ok: true, ...privacyComplianceSummary(process.env) }, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/governance-status' && req.method === 'GET') {
const db = await readDb();
const readiness = buildReleaseReadiness(db);
const privacy = privacyComplianceSummary(process.env);
const governance = buildPhase313GovernanceSnapshot({ privacy, readiness, env: process.env });
return json(req, res, governance.ok ? 200 : 503, { ok: governance.ok, privacy, readiness: { ready: readiness.ready, gates: readiness.gates }, governance }, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/risk-guard' && req.method === 'GET') {
const guard = DEPLOYMENT_RISK_GUARD?.public || { ok: true, version: PHASE223_RISK_GUARD_VERSION };
return json(req, res, guard.ok ? 200 : 503, { ok: guard.ok, riskGuard: guard }, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/openapi.json' && req.method === 'GET') {
return json(req, res, 200, buildOpenApiSpec(), { 'cache-control': 'public, max-age=3600' });
}
if (pathname === '/api/public/hardening-matrix' && req.method === 'GET') {
const db = await readDb();
return json(req, res, 200, buildHardeningMatrix(db));
}
if (pathname === '/api/public/release-readiness' && req.method === 'GET') {
const db = await readDb();
return json(req, res, 200, { ok: true, readiness: buildReleaseReadiness(db) });
}
if (pathname === '/api/public/launch-checklist' && req.method === 'GET') {
const db = await readDb();
const checklist = buildProductionLaunchChecklist(db);
return json(req, res, checklist.ok ? 200 : 503, { ok: checklist.ok, checklist: { phase: checklist.phase, checkedAt: checklist.checkedAt, blockers: checklist.blockers, checks: checklist.checks.map(item => ({ key: item.key, ok: item.ok, label: item.label })) } });
}
if (pathname === '/api/public/commercial-final-gate' && req.method === 'GET') {
const db = await readDb();
const gate = buildCommercialFinalGate(db);
return json(req, res, gate.ok ? 200 : 503, { ok: gate.ok, phase: gate.phase, checkedAt: gate.checkedAt, summary: gate.summary, blockers: gate.blockers.map(item => ({ key: item.key, label: item.label, count: item.count || undefined })) });
}
if (pathname === '/api/public/smart-product' && req.method === 'GET') {
const db = await readDb();
const offers = buildCommercialOfferCatalog();
const requestedRiskScore = Number(url.searchParams.get('riskScore') || 0);
const domain = String(url.searchParams.get('domain') || '').trim();
let intelligence = null;
if (requestedRiskScore || domain) {
const site = domain ? findSiteByAny(db, '', domain) : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || db.scans[0] || {} : db.scans[0] || {};
intelligence = buildProductIntelligence({ scan, site, riskScore: requestedRiskScore || site?.latestRiskScore || scan?.riskScore || 55, offers, source: 'smart-product' });
}
return json(req, res, 200, buildSmartPublicSnapshot(db, { offers, intelligence }));
}

if (pathname === '/api/public/paid-service-model' && req.method === 'GET') {
const portone = PORTONE_CLIENT?.configSummary ? PORTONE_CLIENT.configSummary() : { enabled: false };
const externalHttpReady = PAYMENT_PROVIDER !== 'external_http' || !!process.env.NV0_PAYMENT_PROVIDER_URL;
const paymentReady = (!PRELAUNCH_MODE || ALLOW_PRELAUNCH_ONLINE_PAYMENT) && PAYMENT_PROVIDER !== 'disabled' && externalHttpReady && (PAYMENT_PROVIDER !== 'portone_v2' || !!portone.enabled);
return json(req, res, 200, buildPaidServiceOperatingModel({
  paymentProvider: PAYMENT_PROVIDER,
  paymentReady,
  prelaunchMode: PRELAUNCH_MODE,
  commercialLaunchReady: COMMERCIAL_LAUNCH_READY,
  offers: buildCommercialOfferCatalog(),
  generatedAt: nowIso()
}), { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/product-intelligence' && req.method === 'GET') {
const db = await readDb();
const requestedRiskScore = Number(url.searchParams.get('riskScore') || 0);
const siteId = url.searchParams.get('siteId') || '';
const domain = String(url.searchParams.get('domain') || '').trim();
const site = siteId || domain ? findSiteByAny(db, siteId, domain) : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || db.scans[0] || {} : db.scans[0] || {};
const offers = buildCommercialOfferCatalog();
const intelligence = buildProductIntelligence({ scan, site, riskScore: requestedRiskScore || site?.latestRiskScore || scan?.riskScore || 55, offers, source: 'public-api' });
const dashboard = buildProductDashboard(db);
const orchestration = buildSmartProductOrchestration({ scan, site, intelligence, offers, dashboard, source: 'public-api' });
return json(req, res, 200, { ok: true, intelligence, dashboard, orchestration });
}

if (pathname === '/api/public/product-quality' && req.method === 'GET') {
const db = await readDb();
const siteId = url.searchParams.get('siteId') || '';
const domain = String(url.searchParams.get('domain') || '').trim();
const site = siteId || domain ? findSiteByAny(db, siteId, domain) : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || db.scans[0] || null : db.scans[0] || null;
const diagnosisAccuracy = scan ? buildDiagnosisAccuracyProfile(scan) : null;
const demoAccuracy = scan ? buildDemoAccuracyContract(scan) : null;
const paidDeliverableBlueprint = scan ? buildPaidDeliverableBlueprint(scan, scan.recommendedPlan || 'Report') : null;
const paidOutputQualityGate = scan ? buildPaidOutputQualityGate({ scan, asset: { paidDeliverableBlueprint }, order: { plan: scan.recommendedPlan || 'Report', status: 'generating', siteId: scan.siteId, domain: scan.target } }) : null;
return json(req, res, 200, { ok: true, productQuality: { version: PHASE220_SERVICE_QUALITY_VERSION, siteId: site?.id || scan?.siteId || null, requestId: scan?.requestId || null, diagnosisAccuracy, demoAccuracy, paidDeliverableBlueprint, paidOutputQualityGate, publicContract: { diagnosisIsPreliminary: true, scoreMeansPriorityNotLegalConclusion: true, paidDeliverablesRequireReportQualityGate: true, manualReviewItemsRemainVisible: true, paidOutputMustPassAcceptanceGate: true }, notice: '진단 정확도는 공개 수집 커버리지·근거 신뢰도·수동검토 비율·결제 후 산출물 수용 기준을 함께 반영한 운영 품질 지표입니다.' } });
}
if (pathname === '/api/public/pricing-fit' && req.method === 'GET') {
return json(req, res, 200, buildPricingRecalculation());
}
if (pathname === '/api/public/products' && req.method === 'GET') {
const riskScore = Number(url.searchParams.get('riskScore') || 55);
const offers = buildCommercialOfferCatalog();
const intelligence = buildProductIntelligence({ riskScore, offers, source: 'products' });
const orchestration = buildSmartProductOrchestration({ intelligence, offers, source: 'products' });
const annotated = annotateOffersWithIntelligence(offers, intelligence);
const annotatedByCode = new Map(annotated.map(item => [item.code, item]));
const orderedOffers = offers.map(item => annotatedByCode.get(item.code) || item);
return json(req, res, 200, { ok: true, offers: orderedOffers, intelligence, orchestration });
}
if (pathname === '/api/public/plans' && req.method === 'GET') {
const db = await readDb();
const requestedRiskScore = Number(url.searchParams.get('riskScore') || 0);
const siteId = url.searchParams.get('siteId') || '';
const site = siteId ? findSiteByAny(db, siteId) : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || db.scans[0] || {} : db.scans[0] || {};
const riskScore = requestedRiskScore || site?.latestRiskScore || scan?.riskScore || 55;
const offers = buildCommercialOfferCatalog();
const intelligence = buildProductIntelligence({ scan, site, riskScore, offers, source: 'plans' });
const recommendedPlan = intelligence.recommendedPlan;
const orchestration = buildSmartProductOrchestration({ scan, site, intelligence, offers, dashboard: buildProductDashboard(db), source: 'plans' });
return json(req, res, 200, { ok: true, recommendedPlan, plans: buildPlanCatalog(recommendedPlan), riskScore, intelligence, orchestration, smartOffers: intelligence.offerFit });
}

if (pathname === '/api/public/trustops-blueprint' && req.method === 'GET') {
const db = await readDb();
const siteId = String(url.searchParams.get('siteId') || '').trim();
const industry = String(url.searchParams.get('industry') || '').trim();
const riskScore = Number(url.searchParams.get('riskScore') || 0) || undefined;
const site = siteId ? findSiteByAny(db, siteId) : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || {} : (db.scans || [])[0] || {};
const blueprint = buildTrustOpsGrowthBlueprint({ scan, site, industry, riskScore, offers: buildCommercialOfferCatalog(), siteUrl: site?.domain || scan?.target || url.searchParams.get('target') || '' });
const gate = applyEngineAgentGate('trustops.blueprint', { improvementBacklogCount: blueprint.improvementBacklogCount, conversionFunnel: blueprint.conversionFunnel, fixCount: blueprint.fixPack?.fixes?.length || 0 }, { stage: 'trustops-blueprint', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 고도화 엔진 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, blueprint });
}
if (pathname === '/api/public/fix-generator' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const db = await readDb();
const fixPack = buildFixGeneratorPayload({
  industry: body.industry,
  siteUrl: body.siteUrl || body.domain || body.target,
  brandName: body.brandName || body.businessName,
  supportEmail: body.supportEmail || body.email || BUSINESS_PROFILE.contactEmail
});
const gate = applyEngineAgentGate('fix.generate', { copyReadyCount: fixPack.copyReadyCount, industry: fixPack.industry?.code || fixPack.industry?.label, legalConclusion: false }, { stage: 'fix-generator', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '개선 문구 생성 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, fixPack });
}
if (pathname === '/api/public/monitoring-plan' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const db = await readDb();
const monitoring = buildMonitoringPlan({ industry: body.industry, siteUrl: body.siteUrl || body.domain || body.target, cadence: body.cadence });
const gate = applyEngineAgentGate('monitoring.plan', { target: monitoring.target, scheduleCount: monitoring.schedule?.length || 0, alertCount: monitoring.alertRules?.length || 0 }, { stage: 'monitoring-plan', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '모니터링 설계 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, monitoring });
}
if (pathname === '/api/public/revenue-optimization' && req.method === 'GET') {
const db = await readDb();
const plan = buildRevenueOptimizationPlan({ offers: buildCommercialOfferCatalog() });
const gate = applyEngineAgentGate('revenue.optimize', { ladderCount: plan.ladder?.length || 0, kpiCount: plan.kpis?.length || 0 }, { stage: 'revenue-optimization', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '수익 최적화 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, plan });
}
if (pathname === '/api/public/industry-templates' && req.method === 'GET') {
return json(req, res, 200, { ok: true, templates: buildIndustryTemplates() });
}
if (pathname === '/api/public/structured-data-package' && req.method === 'GET') {
const db = await readDb();
const structuredData = buildStructuredDataPackage({ name: url.searchParams.get('name') || BUSINESS_PROFILE.tradeName, url: url.searchParams.get('url') || BUSINESS_PROFILE.domain });
const gate = applyEngineAgentGate('structured-data.package', { hasJsonLd: Boolean(structuredData.jsonLd), hasFaq: Boolean(structuredData.faqJsonLd) }, { stage: 'structured-data-package', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '구조화 데이터 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, structuredData });
}


// Operational endpoint isolation is enforced before public handlers run.



if (pathname === '/api/public/trustops-autopilot' && req.method === 'GET') {
const db = await readDb();
const cockpit = buildTrustOpsAutopilotCockpit(db, { nowIso: nowIso() });
const gate = applyEngineAgentGate('trustops.autopilot', { queueCount: cockpit.counts.queue, backlogCount: cockpit.backlogCount, hasNextOffer: Boolean(cockpit.nextBestOffer?.code), safeguards: cockpit.safeguards?.length || 0 }, { stage: 'trustops-autopilot', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 오토파일럿 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, cockpit });
}
if (pathname === '/api/public/customer-lifecycle' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const db = await readDb();
const lifecycle = buildCustomerLifecyclePlan(body, db);
const gate = applyEngineAgentGate('customer.lifecycle', { stageCount: lifecycle.stages?.length || 0, hasNextOffer: Boolean(lifecycle.nextBestOffer?.code), riskScore: lifecycle.riskScore }, { stage: 'customer-lifecycle', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '고객 생애주기 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, lifecycle });
}
if (pathname === '/api/public/automation-workqueue' && req.method === 'GET') {
const db = await readDb();
const queue = buildAutomationWorkQueue(db, { nowIso: nowIso() }).slice(0, 20).map(item => ({ type: item.type, priority: item.priority, title: item.title, reason: item.reason, automation: item.automation, recommendedOffer: item.recommendedOffer ? { code: item.recommendedOffer.code, title: item.recommendedOffer.title, price: item.recommendedOffer.price } : null }));
return json(req, res, 200, { ok: true, queue });
}


if (pathname === '/api/public/trustops-launch-control' && req.method === 'GET') {
const db = await readDb();
const launch = buildTrustOpsLaunchControl(db, { nowIso: nowIso() });
const gate = applyEngineAgentGate('trustops.launch_control', { readinessScore: launch.readiness.score, backlogCount: launch.backlogCount, phase319BacklogCount: launch.phase319BacklogCount, experimentCount: launch.experiments.length, playbookCount: launch.incidentPlaybooks.length }, { stage: 'trustops-launch-control', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 런칭 컨트롤 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, launch });
}
if (pathname === '/api/public/lifecycle-message-sequence' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const db = await readDb();
const sequence = buildLifecycleMessageSequence(body, db, { nowIso: nowIso() });
const gate = applyEngineAgentGate('lifecycle.message_sequence', { hasSubject: Boolean(sequence.message?.subject), hasSafeguard: Boolean(sequence.message?.safeguard), hasSuppressionRules: (sequence.suppressionRules || []).length >= 3, hasNextOffer: Boolean(sequence.nextBestOffer?.code) }, { stage: 'lifecycle-message-sequence', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: '생애주기 메시지 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, sequence });
}


if (pathname === '/api/public/trustops-production-sentinel' && req.method === 'GET') {
const db = await readDb();
const sentinel = buildProductionSentinel(db, { nowIso: nowIso(), env: process.env, baseUrl: BUSINESS_PROFILE.domain, maxPages: TARGET_FETCH_MAX_PAGES });
const gate = applyEngineAgentGate('trustops.production_sentinel', { sentinelScore: sentinel.score, backlogCount: sentinel.backlogCount, phase320BacklogCount: sentinel.phase320BacklogCount, liveCheckCount: sentinel.liveVerification.checks.length, rollbackCount: sentinel.rollbackMatrix.length, slaCount: sentinel.slaMatrix.length }, { stage: 'trustops-production-sentinel', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 프로덕션 센티널 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, sentinel });
}
if (pathname === '/api/public/live-verification-checklist' && req.method === 'GET') {
const checklist = buildLiveVerificationChecklist({ baseUrl: url.searchParams.get('baseUrl') || BUSINESS_PROFILE.domain }, { nowIso: nowIso() });
return json(req, res, 200, { ok: true, checklist });
}

if (pathname === '/api/public/trustops-final-handoff' && req.method === 'GET') {
const db = await readDb();
const handoff = buildTrustOpsFinalHandoff(db, { nowIso: nowIso(), env: process.env, baseUrl: BUSINESS_PROFILE.domain, maxPages: TARGET_FETCH_MAX_PAGES, allowMvp: PLATFORM?.target !== 'commercial' });
const gate = applyEngineAgentGate('trustops.final_handoff', { acceptanceScore: handoff.acceptanceScore, backlogCount: handoff.summary.backlogCount, phase321BacklogCount: handoff.summary.phase321BacklogCount, checklistCount: handoff.acceptanceChecklist.length, runbookCount: handoff.operatorRunbook.length, safeModeCount: handoff.safeModeMatrix.length, kpiCount: handoff.goLiveKpi.length }, { stage: 'trustops-final-handoff', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 최종 인수인계 게이트를 통과하지 못했습니다.', gate });
return json(req, res, 200, { ok: true, handoff });
}


if (pathname === '/api/public/trustops-100-final' && req.method === 'GET') {
const db = await readDb();
const scorecard = buildTrustOps100PointFinalScorecard(db, { nowIso: nowIso(), env: process.env, baseUrl: BUSINESS_PROFILE.domain, packageGateReady: true, runtimeClean: true, secretHygienePassed: true, files: [], scripts: {}, routes: ['/api/public/trustops-100-final'], sourceText: '' });
const gate = applyEngineAgentGate('trustops.100_final', { packageScore: scorecard.packageScore, failedAreaCount: scorecard.failed.length, operatorItemCount: scorecard.externalOperatorItems.length, engineCount: scorecard.linkedSystems.engineCount, agentCount: scorecard.linkedSystems.agentCount }, { stage: 'trustops-100-final', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 100점 최종 게이트를 통과하지 못했습니다.', gate, scorecard });
return json(req, res, 200, { ok: true, scorecard });
}


if (pathname === '/api/public/trustops-complete-delivery' && req.method === 'GET') {
const db = await readDb();
const delivery = buildTrustOpsCompleteDelivery(db, { nowIso: nowIso(), env: process.env, baseUrl: BUSINESS_PROFILE.domain, packageGateReady: true, runtimeClean: true, secretHygienePassed: true, files: [], scripts: {}, routes: ['/api/public/trustops-complete-delivery'], sourceText: '' });
const gate = applyEngineAgentGate('trustops.100_final', { packageScore: delivery.packageScore, failedAreaCount: delivery.failed.length, operatorItemCount: delivery.finalOperatorPack.length, engineCount: delivery.linkedScores.engineCount, agentCount: delivery.linkedScores.agentCount }, { stage: 'trustops-complete-delivery', nowIso: nowIso() });
appendEngineAgentEvent(db, gate);
await writeDb(db);
if (!gate.ok || !delivery.ok) return json(req, res, 500, { ok: false, error: 'TrustOps 최종 완성 납품 게이트를 통과하지 못했습니다.', gate, delivery });
return json(req, res, 200, { ok: true, delivery });
}

if (pathname === '/api/public/document-preview' && req.method === 'POST') {
const body = normalizeDocumentPreviewPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const db = await readDb();
const preview = body.documentKind === 'work_order'
  ? buildWorkOrderPreview(body, { nowIso })
  : buildPolicyDocumentPreview(body, db.settings || {});
return json(req, res, 200, { ok: true, preview });
}
if (pathname === '/api/public/server-availability' && req.method === 'GET') {
return json(req, res, 200, {
  ok: true,
  available: true,
  service: 'VERIDION',
  phase: 'phase288',
  serverTime: nowIso(),
  host: req.headers.host || '',
  checks: {
    router: true,
    publicApi: true,
    staticPages: true
  },
  next: ['/portal', '/products/veridion/demo', '/api/public/commercial-readiness']
});
}
if (pathname === '/api/public/product-agent-status' && req.method === 'GET') {
const db = await readDb();
const status = buildProductAgentRuntimeStatus(db, { businessProfile: BUSINESS_PROFILE });
return json(req, res, 200, status);
}
if (pathname === '/api/public/engine-agent-status' && req.method === 'GET') {
const db = await readDb();
const status = buildEngineAgentRuntimeStatus(db, { businessProfile: BUSINESS_PROFILE, nowIso: nowIso() });
return json(req, res, 200, status);
}
if (pathname === '/api/public/organism-status' && req.method === 'GET') {
const db = await readDb();
const status = buildUnifiedOrganismStatus(db, { businessProfile: BUSINESS_PROFILE, nowIso });
return json(req, res, 200, status, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/client-metric' && req.method === 'POST') {
const payload = await bodyJson(req, Math.min(MAX_JSON_BODY_BYTES, 16_384)) || {};
const metric = normalizeClientMetric(payload, { nowIso });
const db = await readDb();
db.clientMetrics = Array.isArray(db.clientMetrics) ? db.clientMetrics : [];
db.clientMetrics.push(metric);
if (db.clientMetrics.length > 200) db.clientMetrics = db.clientMetrics.slice(-200);
appendAudit(db, req, 'public.client_metric.recorded', { path: metric.path, page: metric.page, loadMs: metric.loadMs, lcpMs: metric.largestContentfulPaintMs, cls: metric.cumulativeLayoutShift });
await writeDb(db);
return json(req, res, 200, { ok: true, accepted: true, metricId: metric.id }, { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/commercial-readiness' && req.method === 'GET') {
const db = await readDb();
const status = buildCommercialReadinessStatus(db, process.env);
return json(req, res, 200, {
  ok: true,
  phase: status.phase,
  version: status.version,
  packageScore: status.packageScore,
  environmentScore: status.environmentScore,
  status: status.status,
  commercialReady: status.commercialReady,
  launchPolicy: status.launchPolicy,
  legal: {
    policyVersion: status.legal.policyVersion,
    legalReviewApproved: status.legal.legalReviewApproved,
    legalReviewRequired: status.legal.legalReviewRequired,
    documents: status.legal.documents,
    references: status.legal.references
  },
  payment: {
    provider: status.payment.provider,
    liveReady: status.payment.liveReady,
    status: status.payment.status,
    failed: status.payment.failed.map(item => ({ key: item.key, message: item.message }))
  },
  ops: {
    status: status.ops.status,
    failed: status.ops.failed.map(item => ({ key: item.key, message: item.message }))
  }
});
}
if (pathname === '/api/public/board' && req.method === 'GET') {
const requestedPageSize = clamp(Number(url.searchParams.get('pageSize') || 10) || 10, 1, 20);
const pageSize = requestedPageSize;
const requestedPage = clamp(Number(url.searchParams.get('page') || 1) || 1, 1, 9999);
const filter = String(url.searchParams.get('filter') || 'all').trim();
const normalizedFilter = ['all', 'read', 'diagnosis', 'policy', 'conversion'].includes(filter) ? filter : 'all';
const query = String(url.searchParams.get('q') || '').trim().slice(0, 80).toLowerCase();
const db = await readDb();
let createdNow = null;
try {
  createdNow = createCtaPublicationIfDue(db, (db.scans || [])[0] || null, { force: false });
  if (createdNow) {
    appendAudit(db, req, 'public.column.published_from_board_request', { id: createdNow.id, intervalMs: CTA_AUTOPUBLISH_INTERVAL_MS });
    await writeDb(db);
  }
} catch (error) {
  appendAudit(db, req, 'public.column.publish_check_failed', { error: error.message });
}
const persisted = [...(db.boards || []), ...(db.publications || [])]
  .filter(item => item && item.visibility !== 'private')
  .filter(item => item.status === 'published' || item.visibility === 'public' || item.autoPublished === true)
  .filter(item => item.type === 'column' || item.autoPublished === true || item.engine === 'public-column-engine-v1' || item.engine === 'product-agent-insight-v1')
  .sort((a, b) => Date.parse(b.publishedAt || b.createdAt || 0) - Date.parse(a.publishedAt || a.createdAt || 0));
const seen = new Set();
let publicPosts = persisted.map((item, index) => ({
  ...toPublicBoardPost(item, index),
  status: 'published',
  publishedAt: item.publishedAt || item.createdAt || nowIso(),
  source: 'persisted-db',
  boardPurpose: 'column',
  category: item.category || publicColumnTypeLabel(item.boardType)
})).filter(item => {
  const key = `${item.title}::${item.summary}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
if (!publicPosts.length) {
  publicPosts = buildPublicColumnEnginePosts({ pageSize: 50 }).map((item, index) => ({
    ...toPublicBoardPost({ ...item, status: 'published', visibility: 'public', type: 'column' }, index),
    status: 'published',
    publishedAt: item.createdAt || nowIso(),
    source: 'engine-emergency-fallback',
    boardPurpose: 'column',
    category: item.category || publicColumnTypeLabel(item.boardType)
  }));
}
const filtered = publicPosts.filter(item => {
  const haystack = [item.title, item.summary, item.body, item.primaryKeyword, item.audienceHook, item.searchIntent, item.category, ...(item.checklist || []), ...((item.faq || []).flatMap(entry => [entry.question, entry.answer])), ...(item.tags || []), ...(item.hashtags || [])].join(' ');
  if (query && !haystack.toLowerCase().includes(query)) return false;
  if (normalizedFilter === 'all') return true;
  if (normalizedFilter === 'read') return /가독성|모바일|푸터|첫인상|문구/.test(haystack);
  if (normalizedFilter === 'diagnosis') return /진단|재점검|구조|고지/.test(haystack);
  if (normalizedFilter === 'policy') return /정책|개인정보|환불|결제/.test(haystack);
  if (normalizedFilter === 'conversion') return /다음 행동 버튼|버튼|전환|리포트|무료진단/.test(haystack);
  return true;
});
const total = filtered.length;
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const page = clamp(requestedPage, 1, totalPages);
const start = (page - 1) * pageSize;
const posts = filtered.slice(start, start + pageSize);
const activity = publicPosts.slice(0, 3).map(item => ({
  id: item.id,
  title: item.title,
  type: '정기 칼럼',
  createdAt: item.publishedAt || item.createdAt || null,
  label: '새 글 발행'
}));
const boardAgentGate = applyEngineAgentGate('board.render', {
  postCount: publicPosts.length,
  intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000),
  sample: publicPosts.slice(0, 5).map(item => `${item.title} ${item.summary}`).join(' ')
}, { stage: 'public-board', nowIso: nowIso() });
appendEngineAgentEvent(db, boardAgentGate);
if (!boardAgentGate.ok) {
  appendAudit(db, req, 'public.board.engine_agent_gate_failed', { failures: boardAgentGate.failures });
  await writeDb(db);
  return json(req, res, 500, { ok: false, error: '인사이트 엔진 에이전트 게이트를 통과하지 못했습니다.', gate: boardAgentGate });
}
await writeDb(db);
return json(req, res, 200, {
  ok: true,
  publicationCadence: { label: '정기 업데이트', actualPublishing: true, lastPublishedAt: publicPosts[0]?.publishedAt || publicPosts[0]?.createdAt || null },
  createdNow: !!createdNow,
  pageSize,
  activity,
  pagination: { page, pageSize, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages, query },
  query,
  posts
});
}
if ((pathname === '/api/public/content' || pathname === '/api/public/system-items') && req.method === 'GET') {
const db = await readDb();
const type = String(url.searchParams.get('type') || '').trim();
let items = buildSystemItemsFeed(db).filter(item => item.visibility !== 'private');
if (type) items = items.filter(item => item.type === type);
return json(req, res, 200, { ok: true, alias: pathname === '/api/public/system-items' ? 'system-items' : undefined, items: items.slice(0, 50) });
}
if (pathname === '/api/public/auth/session' && req.method === 'GET') {
const db = await readDb();
const session = await getCustomerSession(req, db);
return json(req, res, 200, { ok: true, authenticated: !!session, customer: publicCustomer(db, session?.customer) });
}
if (pathname === '/api/public/auth/register' && req.method === 'POST') {
const rate = await hitRateLimit('customer-register', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: 10 });
if (rate.blocked) return json(req, res, 429, { ok: false, error: '요청이 너무 많습니다.' });
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const email = normalizeEmail(body.email);
const password = String(body.password || '');
const consent = body.privacyConsent === true || body.privacyConsent === 'true';
if (!isValidEmail(email)) return json(req, res, 400, { ok: false, error: '유효한 이메일이 필요합니다.' });
if (password.length < 12) return json(req, res, 400, { ok: false, error: '비밀번호는 12자 이상이어야 합니다.' });
if (!consent) return json(req, res, 400, { ok: false, error: '개인정보 처리방침 동의가 필요합니다.' });
const db = await readDb();
db.customers ||= [];
db.customerSessions ||= [];
if (db.customers.some(item => normalizeEmail(item.email) === email)) return json(req, res, 409, { ok: false, error: '이미 가입된 이메일입니다.' });
const customer = { id: uid('cus'), email, status: 'active', passwordHash: await hashPassword(password), privacyConsentAt: nowIso(), dataMinimizationVersion: RELEASE_PHASE, createdAt: nowIso(), updatedAt: nowIso() };
const sid = uid('csess') + crypto.randomBytes(16).toString('hex');
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
db.customers.unshift(customer);
db.customerSessions.unshift({ sid, customerId: customer.id, createdAt: nowIso(), lastSeenAt: nowIso(), expiresAt, ipHash: pseudonymizeIp(clientIp(req)) });
for (const order of db.orders || []) {
if (!order.customerId && normalizeEmail(order.email) === email) { order.customerId = customer.id; generateOrderAccessToken(order); }
}
appendAudit(db, req, 'public.customer.registered', { customerId: customer.id, email });
await writeDb(db);
return json(req, res, 200, { ok: true, customer: publicCustomer(db, customer) }, { 'set-cookie': customerSessionCookie(req, sid, 60 * 60 * 24 * 14) });
}
if (pathname === '/api/public/auth/login' && req.method === 'POST') {
const rate = await hitRateLimit('customer-login', clientIp(req), { windowMs: ADMIN_AUTH_WINDOW_MS, limit: 12 });
if (rate.blocked) return json(req, res, 429, { ok: false, error: '요청이 너무 많습니다.' });
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const email = normalizeEmail(body.email);
const password = String(body.password || '');
const db = await readDb();
db.customers ||= [];
db.customerSessions ||= [];
const customer = db.customers.find(item => normalizeEmail(item.email) === email && item.status !== 'disabled');
if (!customer || !await verifyPassword(password, customer.passwordHash)) {
appendAudit(db, req, 'public.customer.login_failed', { email });
await writeDb(db);
return json(req, res, 401, { ok: false, error: '로그인 정보가 올바르지 않습니다.' });
}
customer.lastLoginAt = nowIso();
customer.updatedAt = nowIso();
const sid = uid('csess') + crypto.randomBytes(16).toString('hex');
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
db.customerSessions.unshift({ sid, customerId: customer.id, createdAt: nowIso(), lastSeenAt: nowIso(), expiresAt, ipHash: pseudonymizeIp(clientIp(req)) });
db.customerSessions = db.customerSessions.slice(0, 2000);
appendAudit(db, req, 'public.customer.login_succeeded', { customerId: customer.id, email });
await writeDb(db);
return json(req, res, 200, { ok: true, customer: publicCustomer(db, customer) }, { 'set-cookie': customerSessionCookie(req, sid, 60 * 60 * 24 * 14) });
}
if (pathname === '/api/public/auth/logout' && req.method === 'POST') {
const sid = parseCookies(req).nv0_customer_sid;
const db = await readDb();
db.customerSessions ||= [];
db.customerSessions = db.customerSessions.filter(item => item.sid !== sid);
appendAudit(db, req, 'public.customer.logout');
await writeDb(db);
return json(req, res, 200, { ok: true }, { 'set-cookie': expiredCustomerSessionCookie(req) });
}
if (pathname === '/api/public/auth/request-password-reset' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const email = normalizeEmail(body.email);
if (!isValidEmail(email)) return json(req, res, 400, { ok: false, error: '유효한 이메일이 필요합니다.' });
const db = await readDb();
const customer = (db.customers || []).find(item => normalizeEmail(item.email) === email && item.status !== 'disabled');
if (customer) {
const { rawToken, record } = createPasswordResetToken(db, customer, req);
const resetUrl = `${BUSINESS_PROFILE.domain.replace(/\/$/, '')}/auth?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
enqueueTransactionalEmail(db, { to: email, customerId: customer.id, template: 'password_reset', subject: '[VERIDION] 비밀번호 재설정 안내', body: `30분 안에 아래 링크에서 비밀번호를 재설정하세요.\n${resetUrl}`, meta: { resetTokenId: record.id, resetUrl } });
appendAudit(db, req, 'public.customer.password_reset_requested', { customerId: customer.id, email });
} else {
appendAudit(db, req, 'public.customer.password_reset_requested_unknown', { email });
}
await writeDb(db);
return json(req, res, 200, { ok: true, message: '가입된 이메일이면 재설정 안내가 발송됩니다.' });
}
if (pathname === '/api/public/auth/reset-password' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const email = normalizeEmail(body.email);
const token = String(body.token || '').trim();
const password = String(body.password || '');
if (!isValidEmail(email) || !token) return json(req, res, 400, { ok: false, error: '이메일과 재설정 토큰이 필요합니다.' });
if (password.length < 12) return json(req, res, 400, { ok: false, error: '비밀번호는 12자 이상이어야 합니다.' });
const db = await readDb();
const customer = (db.customers || []).find(item => normalizeEmail(item.email) === email && item.status !== 'disabled');
const record = (db.passwordResetTokens || []).find(item => item.tokenHash === hashPasswordResetToken(token) && !item.usedAt);
if (!customer || !record || record.customerId !== customer.id || Date.parse(record.expiresAt) < Date.now()) {
appendAudit(db, req, 'public.customer.password_reset_failed', { email });
await writeDb(db);
return json(req, res, 400, { ok: false, error: '재설정 링크가 올바르지 않거나 만료되었습니다.' });
}
customer.passwordHash = await hashPassword(password);
customer.updatedAt = nowIso();
record.usedAt = nowIso();
db.customerSessions = (db.customerSessions || []).filter(item => item.customerId !== customer.id);
enqueueTransactionalEmail(db, { to: email, customerId: customer.id, template: 'password_changed', subject: '[VERIDION] 비밀번호가 변경되었습니다', body: '계정 비밀번호가 변경되었습니다. 본인이 요청하지 않았다면 즉시 고객센터로 문의하세요.' });
appendAudit(db, req, 'public.customer.password_reset_completed', { customerId: customer.id, email });
await writeDb(db);
return json(req, res, 200, { ok: true, message: '비밀번호가 변경되었습니다. 다시 로그인하세요.' }, { 'set-cookie': expiredCustomerSessionCookie(req) });
}
if (pathname === '/api/public/account' && req.method === 'GET') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
const orders = customerOrders(db, session.customer);
const assets = (db.purchasedAssets || []).filter(asset => orders.some(order => order.id === asset.orderId));
return json(req, res, 200, { ok: true, customer: publicCustomer(db, session.customer), orders, assets, savedSites: customerSavedSites(db, session.customer), recentScans: customerRecentScans(db, session.customer, 5) });
}
if (pathname === '/api/public/account/export' && req.method === 'GET') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
const orders = customerOrders(db, session.customer).map(sanitizeOrderForPublic);
const assets = (db.purchasedAssets || []).filter(asset => orders.some(order => order.id === asset.orderId));
return json(req, res, 200, { ok: true, export: { customer: publicCustomer(db, session.customer), orders, assets, savedSites: customerSavedSites(db, session.customer), exportedAt: nowIso() } });
}
if (pathname === '/api/public/account/deactivate' && req.method === 'POST') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
session.customer.status = 'disabled';
session.customer.disabledAt = nowIso();
session.customer.updatedAt = nowIso();
db.customerSessions = (db.customerSessions || []).filter(item => item.customerId !== session.customer.id);
appendAudit(db, req, 'public.customer.deactivated', { customerId: session.customer.id });
await writeDb(db);
return json(req, res, 200, { ok: true, message: '계정이 비활성화되었습니다.' }, { 'set-cookie': expiredCustomerSessionCookie(req) });
}
if (pathname === '/api/public/account/marketing-consent' && req.method === 'POST') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
const body = normalizeMarketingConsentPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
session.customer.marketingConsentAt = body.marketingConsent ? nowIso() : null;
session.customer.marketingConsentRevokedAt = body.marketingConsent ? null : nowIso();
session.customer.updatedAt = nowIso();
appendAudit(db, req, 'public.customer.marketing_consent_changed', { customerId: session.customer.id, marketingConsent: body.marketingConsent });
await writeDb(db);
return json(req, res, 200, { ok: true, customer: publicCustomer(db, session.customer) });
}
if (pathname === '/api/public/account/sites' && req.method === 'GET') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
return json(req, res, 200, { ok: true, sites: customerSavedSites(db, session.customer), recentScans: customerRecentScans(db, session.customer, 5) });
}
if (pathname === '/api/public/account/scan-detail' && req.method === 'GET') {
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
const requestId = String(url.searchParams.get('requestId') || '').trim();
const siteId = String(url.searchParams.get('siteId') || '').trim();
const scan = (db.scans || []).find(item => (requestId && item.requestId === requestId) || (siteId && item.siteId === siteId));
if (!scan) return json(req, res, 404, { ok: false, error: '검사 결과를 찾을 수 없습니다.' });
const ownsLinkedSite = (db.customerSiteLinks || []).some(item => item.customerId === session.customer.id && item.siteId === scan.siteId);
if (scan.customerId !== session.customer.id && !ownsLinkedSite) return json(req, res, 403, { ok: false, error: '검사 결과 접근 권한이 없습니다.' });
if (!hasPaidScanAccess(db, session.customer, scan)) return json(req, res, 200, { ok: true, result: summarizeScanForLoginMember(scan), locked: true });
const paidSite = (db.sites || []).find(item => item.id === scan.siteId || item.siteId === scan.siteId || item.domain === scan.target || item.domain === scan.normalizedTarget) || null;
const paidOrder = (db.orders || []).find(item => item.siteId === scan.siteId && ['paid','completed','fulfilled'].includes(item.status)) || { plan: scan.recommendedPlan || 'Report', siteId: scan.siteId, domain: scan.target || scan.normalizedTarget };
const paidFullDetailContract = buildPaidFullDetailContract({ scan, order: paidOrder, asset: { plan: paidOrder.plan || scan.recommendedPlan || 'Report' } });
const siteOperationsDocument = buildSiteOperationsDocument(scan, { site: paidSite, order: paidOrder, settings: db.settings || {} });
return json(req, res, 200, cleanLegacyPublicTokens({ ok: true, result: { ...scan, diagnosis: buildPublicDiagnosisPackage(scan), demoIssueOverview: scan.demoIssueOverview || buildDemoIssueOverview(scan), conversionUrgency: scan.conversionUrgency || buildConversionUrgencyModel(scan, { plan: scan.recommendedPlan || paidOrder.plan || 'Report' }), paidFullDetailContract, siteOperationsDocument, savedToAccount: true, paidAccess: true }, locked: false }));
}
if (pathname === '/api/public/account/sites' && req.method === 'POST') {
const body = normalizeSavedSitePayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
if (!body.domain && !body.siteId) return json(req, res, 400, { ok: false, error: '저장할 사이트 주소가 필요합니다.' });
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
db.sites ||= [];
let site = body.siteId ? findSiteByAny(db, body.siteId) : null;
if (!site) site = findSiteByAny(db, '', body.domain);
if (!site) {
site = { id: uid('site'), domain: body.domain, industry: body.industry || '일반 이커머스', jurisdiction: db.settings?.defaultJurisdiction || 'KR', latestRiskScore: null, latestRiskLevel: null, latestEstimatedMaxPenalty: 0, lastScanAt: null, createdAt: nowIso(), status: 'saved' };
db.sites.unshift(site);
}
const link = linkCustomerToSite(db, session.customer.id, site, { label: body.label, industry: body.industry, memo: body.memo });
appendAudit(db, req, 'public.customer.site_saved', { customerId: session.customer.id, siteId: site.id, domain: site.domain });
await writeDb(db);
return json(req, res, 200, { ok: true, site: customerSavedSites(db, session.customer).find(item => item.siteId === site.id) || { ...link, domain: site.domain } });
}
if (pathname.startsWith('/api/public/account/sites/') && req.method === 'DELETE') {
const siteId = decodeURIComponent(pathname.split('/').pop() || '');
const db = await readDb();
const session = await getCustomerSession(req, db);
if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
const before = (db.customerSiteLinks || []).length;
db.customerSiteLinks = (db.customerSiteLinks || []).filter(item => !(item.customerId === session.customer.id && item.siteId === siteId));
appendAudit(db, req, 'public.customer.site_removed', { customerId: session.customer.id, siteId, removed: before !== db.customerSiteLinks.length });
await writeDb(db);
return json(req, res, 200, { ok: true, removed: before !== db.customerSiteLinks.length });
}
if (pathname === '/api/public/account/rescan' && req.method === 'POST') return handleAccountRescan([req,res,json,readDb,writeDb,getCustomerSession,bodyJson,MAX_JSON_BODY_BYTES,asTrimmedString,normalizeDomainInput,findSiteByAny,scanResultFor,ensureSiteRecord,ensureSubscriptionForSite,createGuidanceDocument,seedAutoFixJobs,createCtaPublicationIfDue,buildPublicDiagnosisPackage,customerSavedSites,appendAudit,nowIso]);
// Commerce/payment endpoints are delegated above to createPaymentRouteHandler(ctx).
// Keeping only non-commerce public routes here reduces route shadowing risk and
// prevents the public dispatcher from carrying unreachable duplicate branches.
  return json(req, res, 404, { ok: false, error: 'Public route not found' });
  };
}

export async function handlePublicRoutes(req, res, ctx, state = {}) {
  return createPublicRouteHandler(ctx)(req, res, state);
}

