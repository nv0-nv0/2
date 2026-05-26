// Phase166 public API dispatcher for native http.createServer routing.
import { createAccountRouteHandler } from './account.mjs';
import { createPaymentRouteHandler } from './payment.mjs';
import { buildDemoAccuracyContract, buildDemoIssueOverview, buildPaidDeliverableBlueprint, buildPaidOutputQualityGate, buildPaidFullDetailContract, buildSiteOperationsDocument, buildConversionUrgencyModel, PHASE220_SERVICE_QUALITY_VERSION } from '../core/service-quality-220.mjs';
import { buildPublicColumnEnginePosts, publicColumnTypeLabel } from '../core/public-column-engine.mjs';

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
      .replace(/자동 발행/g, '20분 발행')
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
if (pathname === '/api/public/diagnosis-engine' && req.method === 'GET') {
return json(req, res, 200, { ok: true, phase: RELEASE_PHASE, engine: 'VERIDION Public Evidence Summary Check Engine', rulesVersion: RULES_VERSION, targetFetchEnabled: TARGET_FETCH_ENABLED, scanProvider: SCAN_PROVIDER, aiReviewProvider: AI_REVIEW_PROVIDER, geminiConfigured: AI_REVIEW_ENABLED, resultContract: { resultType: 'preliminary_check', legalConclusion: false, includesEvidenceSummary: true, includesConfidenceScore: true, includesManualReviewFlags: true, includesAutomationDisclosure: true, includesAutomatedActionPlan: true, includesAccuracyProfile: true, includesReportQualityGate: true, includesDemoAccuracyContract: true, includesPaidOutputQualityGate: true, phase220ServiceQualityVersion: PHASE220_SERVICE_QUALITY_VERSION, phase223RiskGuardVersion: PHASE223_RISK_GUARD_VERSION }, endpoints: { scan: 'POST /api/public/scan', diagnose: 'POST /api/public/diagnose', board: 'GET /api/public/board', engine: 'GET /api/public/diagnosis-engine', productIntelligence: 'GET /api/public/product-intelligence', productQuality: 'GET /api/public/product-quality', productAgentStatus: 'GET /api/public/product-agent-status' }, smartProduct: { version: 'p153-smart-ops-v1', nextBestAction: true, planFitScoring: true, journeyOrchestration: true, smartProductEndpoint: '/api/public/smart-product', userPath: ['무료 요약','요금제 선택','내 사이트 관리','게시판 재유입'] }, publicationCadence: { boardName: '게시판', intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), cadenceLabel: `${Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)}분에 1회 발행`, columnEngine: 'product-agent-insight-v1' }, automation: { mode: TARGET_FETCH_AUTOMATION_LEVEL, robotsEnabled: TARGET_FETCH_ROBOTS_ENABLED, sitemapEnabled: TARGET_FETCH_SITEMAP_ENABLED, maxPages: TARGET_FETCH_MAX_PAGES, maxDiscoveryResources: TARGET_FETCH_MAX_DISCOVERY_RESOURCES, notice: '자동 확인 가능한 공개 항목은 모두 처리하고 자동 확정 불가 영역은 직접 확인으로 고지합니다.' }, checks: buildRuleCatalog().map(({ code, category, title, severity, penaltyMax }) => ({ code, category, title, severity, penaltyMax })) });
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
appendAudit(db, req, 'public.diagnose.completed', { siteId: scan.siteId, requestId: scan.requestId, target: scan.target, customerId: session?.customer?.id || null });
await writeDb(db);
const portalUrl = `/portal?siteId=${encodeURIComponent(scan.siteId || '')}&requestId=${encodeURIComponent(scan.requestId || '')}`;
const reportUrl = `/products/veridion/demo?target=${encodeURIComponent(scan.target || payload.target)}`;
const resultPayload = { ...scan, portalUrl, redirectUrl: portalUrl, reportUrl, diagnosis: buildPublicDiagnosisPackage(scan), demoIssueOverview: scan.demoIssueOverview || buildDemoIssueOverview(scan), conversionUrgency: scan.conversionUrgency || buildConversionUrgencyModel(scan, { plan: scan.recommendedPlan || 'Report' }), savedToAccount: !!session, paidAccess: false, locked: true, handoff: { next: 'portal', portalUrl, reportUrl, source: payload.source || (isLegacyDiagnosticStart ? 'legacy-diagnostics-start' : 'public-diagnose') } };
if (isLegacyDiagnosticStart) {
  const compatScan = { ...resultPayload, id: scan.requestId, scanId: scan.requestId, domain: site.domain || scan.domain || scan.target, targetUrl: scan.target, status: 'completed' };
  return json(req, res, 200, cleanLegacyPublicTokens({ ok: true, status: 'completed', portalUrl, redirectUrl: portalUrl, reportUrl, result: resultPayload, scan: compatScan }), { 'cache-control': 'no-store' });
}
return json(req, res, 200, cleanLegacyPublicTokens({ ok: true, status: 'completed', portalUrl, redirectUrl: portalUrl, reportUrl, result: resultPayload, scan: { ...resultPayload, id: scan.requestId, scanId: scan.requestId, domain: site.domain || scan.domain || scan.target, targetUrl: scan.target, status: 'completed' } }), { 'cache-control': 'no-store' });
}
if (pathname === '/api/public/config' && req.method === 'GET') {
return json(req, res, 200, { ok: true, turnstileEnabled: TURNSTILE_PUBLIC_ENABLED, turnstileConfigured: TURNSTILE_CONFIGURED, prelaunchMode: PRELAUNCH_MODE, turnstileSiteKey: TURNSTILE_PUBLIC_ENABLED ? TURNSTILE_SITE_KEY : '' });
}
if (pathname === '/api/public/health' && req.method === 'GET') {
return json(req, res, 200, { ok: true, area: 'public', time: nowIso(), phase: RELEASE_PHASE, privacy: 'minimum_required_only', deploymentRiskGuard: { ok: DEPLOYMENT_RISK_GUARD?.ok !== false, version: PHASE223_RISK_GUARD_VERSION, redirectOwner: DEPLOYMENT_RISK_GUARD?.redirectOwner || 'edge' } });
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
return json(req, res, 200, { ok: true, offers: annotateOffersWithIntelligence(offers, intelligence), intelligence, orchestration });
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
return json(req, res, 200, {
  ok: true,
  publicationCadence: { intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), label: `${Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)}분에 1회 발행`, engine: 'product-agent-insight-v1', actualPublishing: true, searchScope: 'server-side', dataSource: publicPosts[0]?.source || 'persisted-db', lastPublishedAt: publicPosts[0]?.publishedAt || publicPosts[0]?.createdAt || null, createdOnThisRequest: !!createdNow },
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
db.customerSessions.unshift({ sid, customerId: customer.id, createdAt: nowIso(), lastSeenAt: nowIso(), expiresAt, ip: clientIp(req) });
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
db.customerSessions.unshift({ sid, customerId: customer.id, createdAt: nowIso(), lastSeenAt: nowIso(), expiresAt, ip: clientIp(req) });
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

