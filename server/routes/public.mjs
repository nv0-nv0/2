// Phase166 public API dispatcher for native http.createServer routing.
import { createAccountRouteHandler } from './account.mjs';
import { createPaymentRouteHandler } from './payment.mjs';
import { buildDemoAccuracyContract, buildDemoIssueOverview, buildPaidDeliverableBlueprint, buildPaidOutputQualityGate, buildPaidFullDetailContract, buildSiteOperationsDocument, buildConversionUrgencyModel, PHASE220_SERVICE_QUALITY_VERSION } from '../core/service-quality-220.mjs';

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
  if (!pathname.startsWith('/api/public/')) return false;
  const accountHandled = await accountRouteHandler(req, res, { requestUrl: url, pathname });
  if (accountHandled !== false) return accountHandled;
  const paymentHandled = await paymentRouteHandler(req, res, { requestUrl: url, pathname });
  if (paymentHandled !== false) return paymentHandled;
if (pathname === '/api/public/diagnosis-engine' && req.method === 'GET') {
return json(req, res, 200, { ok: true, phase: RELEASE_PHASE, engine: 'NV0 Public Evidence Summary Check Engine', rulesVersion: RULES_VERSION, targetFetchEnabled: TARGET_FETCH_ENABLED, scanProvider: SCAN_PROVIDER, aiReviewProvider: AI_REVIEW_PROVIDER, geminiConfigured: AI_REVIEW_ENABLED, resultContract: { resultType: 'preliminary_check', legalConclusion: false, includesEvidenceSummary: true, includesConfidenceScore: true, includesManualReviewFlags: true, includesAutomationDisclosure: true, includesAutomatedActionPlan: true, includesAccuracyProfile: true, includesReportQualityGate: true, includesDemoAccuracyContract: true, includesPaidOutputQualityGate: true, phase220ServiceQualityVersion: PHASE220_SERVICE_QUALITY_VERSION, phase223RiskGuardVersion: PHASE223_RISK_GUARD_VERSION }, endpoints: { scan: 'POST /api/public/scan', diagnose: 'POST /api/public/diagnose', board: 'GET /api/public/system-items', engine: 'GET /api/public/diagnosis-engine', productIntelligence: 'GET /api/public/product-intelligence', productQuality: 'GET /api/public/product-quality' }, smartProduct: { version: 'p153-smart-ops-v1', nextBestAction: true, planFitScoring: true, journeyOrchestration: true, smartProductEndpoint: '/api/public/smart-product', userPath: ['무료 요약','요금제 선택','내 사이트 관리','게시판 재유입'] }, autoPublish: { boardName: '게시판', intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), cadenceLabel: `${Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)}분에 1회`, topicPackCount: ctaTopicPacks().length }, automation: { mode: TARGET_FETCH_AUTOMATION_LEVEL, robotsEnabled: TARGET_FETCH_ROBOTS_ENABLED, sitemapEnabled: TARGET_FETCH_SITEMAP_ENABLED, maxPages: TARGET_FETCH_MAX_PAGES, maxDiscoveryResources: TARGET_FETCH_MAX_DISCOVERY_RESOURCES, notice: '자동 확인 가능한 공개 항목은 모두 처리하고 자동 확정 불가 영역은 직접 확인으로 고지합니다.' }, checks: buildRuleCatalog().map(({ code, category, title, severity, penaltyMax }) => ({ code, category, title, severity, penaltyMax })) });
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
if (pathname === '/api/public/board' && req.method === 'GET') {
const db = await readDb();
const pageSize = 5;
const requestedPage = clamp(Number(url.searchParams.get('page') || 1) || 1, 1, 9999);
const filter = String(url.searchParams.get('filter') || 'all').trim();
const rawPosts = (db.boards || [])
.filter(item => item && item.visibility !== 'private')
.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
const seedBoardPosts = [
  { id: 'board-seed-checkout-4000', title: '결제 버튼 앞에서 고객이 멈추는 이유와 전환 개선 구조', boardType: 'cta', type: 'cta', ctaType: 'checkout_friction', primaryKeyword: '결제 전 안내', target: 'nv0.kr', visibility: 'public', autoPublished: true, createdAt: nowIso(), summary: '결제 직전 불안을 줄이는 전문가형 공개 포스팅입니다.' },
  { id: 'board-seed-privacy-4000', title: '문의폼 이탈을 줄이는 개인정보 안내와 응답 기준', boardType: 'notice', type: 'cta', ctaType: 'privacy_form', primaryKeyword: '개인정보 안내', target: 'nv0.kr', visibility: 'public', autoPublished: true, createdAt: nowIso(), summary: '입력폼 주변 안내를 쉽게 정리한 전문가형 공개 포스팅입니다.' },
  { id: 'board-seed-footer-4000', title: '푸터 사업자 정보만 정리해도 신뢰가 달라지는 이유', boardType: 'case', type: 'cta', ctaType: 'footer_trust', primaryKeyword: '사업자 정보와 문의 경로', target: 'nv0.kr', visibility: 'public', autoPublished: true, createdAt: nowIso(), summary: '사이트 신뢰를 만드는 사업자 정보 배치 안내 글입니다.' },
  { id: 'board-seed-mobile-4000', title: '모바일 화면에서 버튼과 정책 링크를 함께 보이게 배치하는 방법', boardType: 'cta', type: 'cta', ctaType: 'mobile_readability', primaryKeyword: '모바일 안내 가독성', target: 'nv0.kr', visibility: 'public', autoPublished: true, createdAt: nowIso(), summary: '모바일 화면 여백, 버튼 위치, 정책 링크를 정리하는 전문가형 안내 포스팅입니다.' },
  { id: 'board-seed-adcopy-4000', title: '광고 유입 첫 화면에서 신뢰를 잃지 않는 문제 제기 구조', boardType: 'case', type: 'cta', ctaType: 'ad_copy_risk', primaryKeyword: '광고 첫 화면 신뢰 안내', target: 'nv0.kr', visibility: 'public', autoPublished: true, createdAt: nowIso(), summary: '문제 인식과 자연스러운 다음 행동 흐름을 정리한 공개 안내 글입니다.' }
];
const sourcePosts = rawPosts.length ? rawPosts : seedBoardPosts;
const publicPosts = sourcePosts.map((item, index) => toPublicBoardPost(item, index));
const normalizedFilter = ['all', 'cta', 'notice', 'case'].includes(filter) ? filter : 'all';
const filtered = publicPosts.filter(item => normalizedFilter === 'all' || item.boardType === normalizedFilter);
const total = filtered.length;
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const page = clamp(requestedPage, 1, totalPages);
const start = (page - 1) * pageSize;
const posts = filtered.slice(start, start + pageSize);
const now = Date.now();
const recent7d = publicPosts.filter(item => {
  const at = Date.parse(item.createdAt || '');
  return Number.isFinite(at) && at >= now - 7 * 24 * 60 * 60_000;
}).length;
const boardTypeCount = type => publicPosts.filter(item => item.boardType === type).length;
const stats = {
  total: publicPosts.length,
  filteredTotal: total,
  cta: boardTypeCount('cta'),
  notice: boardTypeCount('notice'),
  case: boardTypeCount('case'),
  recent7d
};
const activity = publicPosts.slice(0, 3).map(item => ({
  id: item.id,
  title: item.title,
  type: item.boardType === 'cta' ? '전문가 칼럼' : (item.boardType || '게시글'),
  createdAt: item.createdAt || null,
  label: '새 칼럼 공개'
}));
return json(req, res, 200, {
ok: true,
publishIntervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000),
cadenceLabel: `${Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000)}분에 1회`,
pageSize,
stats: { total: stats.total, filteredTotal: stats.filteredTotal, cta: stats.cta, notice: stats.notice, case: stats.case, recent7d: stats.recent7d },
activity,
pagination: { page, pageSize, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
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
enqueueTransactionalEmail(db, { to: email, customerId: customer.id, template: 'password_reset', subject: '[NV0] 비밀번호 재설정 안내', body: `30분 안에 아래 링크에서 비밀번호를 재설정하세요.\n${resetUrl}`, meta: { resetTokenId: record.id, resetUrl } });
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
enqueueTransactionalEmail(db, { to: email, customerId: customer.id, template: 'password_changed', subject: '[NV0] 비밀번호가 변경되었습니다', body: '계정 비밀번호가 변경되었습니다. 본인이 요청하지 않았다면 즉시 고객센터로 문의하세요.' });
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
return json(req, res, 200, { ok: true, result: { ...scan, diagnosis: buildPublicDiagnosisPackage(scan), demoIssueOverview: scan.demoIssueOverview || buildDemoIssueOverview(scan), conversionUrgency: scan.conversionUrgency || buildConversionUrgencyModel(scan, { plan: scan.recommendedPlan || paidOrder.plan || 'Report' }), paidFullDetailContract, siteOperationsDocument, savedToAccount: true, paidAccess: true }, locked: false });
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

