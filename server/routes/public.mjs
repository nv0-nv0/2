// Phase166 public API dispatcher for native http.createServer routing.
import { createAccountRouteHandler } from './account.mjs';
import { createPaymentRouteHandler } from './payment.mjs';

export function createPublicRouteHandler(ctx) {
  const {
  ADMIN_AUTH_WINDOW_MS,
  AI_REVIEW_ENABLED,
  AI_REVIEW_PROVIDER,
  BUSINESS_PROFILE,
  COMMERCIAL_LAUNCH_READY,
  CTA_AUTOPUBLISH_INTERVAL_MS,
  DATA_DIR,
  DEPLOYMENT_STAGE,
  MAX_JSON_BODY_BYTES,
  PAYMENT_PROVIDER,
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
  buildCommercialFinalGate,
  buildCommercialOfferCatalog,
  buildFeedXml,
  buildHardeningMatrix,
  buildOpenApiSpec,
  buildPlanCatalog,
  buildPolicyDocumentPreview,
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
return json(req, res, 200, { ok: true, phase: RELEASE_PHASE, engine: 'NV0 Full-auto Public Evidence Preliminary Check Engine', rulesVersion: RULES_VERSION, targetFetchEnabled: TARGET_FETCH_ENABLED, scanProvider: SCAN_PROVIDER, aiReviewProvider: AI_REVIEW_PROVIDER, geminiConfigured: AI_REVIEW_ENABLED, resultContract: { resultType: 'preliminary_check', legalConclusion: false, includesEvidenceSummary: true, includesConfidenceScore: true, includesManualReviewFlags: true, includesAutomationDisclosure: true, includesAutomatedActionPlan: true }, endpoints: { scan: 'POST /api/public/scan', diagnose: 'POST /api/public/diagnose', board: 'GET /api/public/system-items', engine: 'GET /api/public/diagnosis-engine', productIntelligence: 'GET /api/public/product-intelligence' }, smartProduct: { version: 'p153-smart-ops-v1', nextBestAction: true, planFitScoring: true, journeyOrchestration: true, smartProductEndpoint: '/api/public/smart-product', userPath: ['예비 점검','근거 확인','요금제 선택','내 사이트 관리','게시판 재유입'] }, autoPublish: { boardName: '게시판', intervalMs: CTA_AUTOPUBLISH_INTERVAL_MS, intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), topicPackCount: ctaTopicPacks().length, combinationStats: ctaCombinationStats(), variants: ctaTopicPacks().map(item => item.headline) }, automation: { mode: TARGET_FETCH_AUTOMATION_LEVEL, robotsEnabled: TARGET_FETCH_ROBOTS_ENABLED, sitemapEnabled: TARGET_FETCH_SITEMAP_ENABLED, maxPages: TARGET_FETCH_MAX_PAGES, maxDiscoveryResources: TARGET_FETCH_MAX_DISCOVERY_RESOURCES, notice: '자동 확인 가능한 공개 항목은 모두 처리하고 자동 확정 불가 영역은 수동확인으로 고지합니다.' }, checks: buildRuleCatalog().map(({ code, category, title, severity, penaltyMax }) => ({ code, category, title, severity, penaltyMax })) });
}
if (pathname === '/api/public/config' && req.method === 'GET') {
return json(req, res, 200, { ok: true, turnstileEnabled: TURNSTILE_PUBLIC_ENABLED, turnstileConfigured: TURNSTILE_CONFIGURED, prelaunchMode: PRELAUNCH_MODE, turnstileSiteKey: TURNSTILE_PUBLIC_ENABLED ? TURNSTILE_SITE_KEY : '' });
}
if (pathname === '/api/public/health' && req.method === 'GET') {
return json(req, res, 200, { ok: true, area: 'public', time: nowIso(), phase: RELEASE_PHASE, privacy: 'minimum_required_only' });
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
const preview = buildPolicyDocumentPreview(body, db.settings || {});
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
const publicPosts = rawPosts.map((item, index) => toPublicBoardPost(item, index));
const filtered = publicPosts.filter(item => filter === 'all' || (item.boardType || item.type) === filter || (filter === 'cta' && (item.autoPublished || item.boardType === 'cta' || item.type === 'cta')));
const total = filtered.length;
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const page = clamp(requestedPage, 1, totalPages);
const start = (page - 1) * pageSize;
const posts = filtered.slice(start, start + pageSize);
const autoPublishedCount = publicPosts.filter(item => item.autoPublished || item.boardType === 'cta' || item.type === 'cta').length;
return json(req, res, 200, {
ok: true,
publishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS,
publishIntervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000),
variantCount: ctaTopicPacks().length,
topicPackCount: ctaTopicPacks().length,
combinationMode: 'reader_helpful_paginated_board',
combinationStats: ctaCombinationStats(),
variants: ctaTopicPacks().map(({ ctaType, boardType, primaryKeyword, headline, intent, funnel }) => ({ ctaType, boardType, primaryKeyword, headline, intent, funnel })),
pageSize,
autoPublishedCount,
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
return json(req, res, 200, { ok: true, result: { ...scan, diagnosis: buildPublicDiagnosisPackage(scan), savedToAccount: true } });
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
if (pathname === '/api/public/account/rescan' && req.method === 'POST') return handleAccountRescan([req,res,json,readDb,writeDb,getCustomerSession,bodyJson,MAX_JSON_BODY_BYTES,asTrimmedString,normalizeDomainInput,findSiteByAny,scanResultFor,ensureSiteRecord,ensureSubscriptionForSite,createGuidanceDocument,seedAutoFixJobs,createCtaPublication,buildPublicDiagnosisPackage,customerSavedSites,appendAudit,nowIso]);
if (pathname === '/api/public/refund-request' && req.method === 'POST') {
const body = normalizeRefundRequestPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const db = await readDb();
db.refundRequests ||= [];
const order = (db.orders || []).find(item => item.id === body.orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
const tokenAllowed = body.accessToken && order.accessToken && body.accessToken.length === order.accessToken.length && crypto.timingSafeEqual(Buffer.from(String(body.accessToken)), Buffer.from(String(order.accessToken)));
if (!tokenAllowed && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '환불 요청 권한이 없습니다.' });
if (!isRefundRequestAllowed(order)) return json(req, res, 400, { ok: false, error: '환불 요청 가능 기간이 지났거나 결제 완료 주문이 아닙니다.' });
const existing = db.refundRequests.find(item => item.orderId === order.id && ['requested','reviewing'].includes(item.status));
if (existing) return json(req, res, 200, { ok: true, refundRequest: existing, duplicate: true });
const refundRequest = { id: uid('refund'), orderId: order.id, customerId: order.customerId || null, email: order.email || null, reason: body.reason, status: 'requested', requestedAt: nowIso(), amount: order.amount, plan: order.plan };
db.refundRequests.unshift(refundRequest);
enqueueTransactionalEmail(db, { to: BUSINESS_PROFILE.contactEmail, template: 'refund_request_operator', subject: '[NV0] 환불 요청 접수', body: '환불 요청이 접수되었습니다.', meta: { refundRequestId: refundRequest.id, orderId: order.id } });
appendAudit(db, req, 'public.refund.requested', { orderId: order.id, refundRequestId: refundRequest.id });
await writeDb(db);
return json(req, res, 200, { ok: true, refundRequest });
}
if (pathname === '/api/public/portal-summary' && req.method === 'GET') {
const db = await readDb();
const orderId = String(url.searchParams.get('orderId') || '');
if (orderId) {
const order = (db.orders || []).find(item => item.id === orderId);
const customerSession = await getCustomerSession(req, db);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
if (order.customerId && !canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '내 사이트 관리 접근 권한이 없습니다.' });
}
const summary = buildPortalSummary(db, { orderId, siteId: url.searchParams.get('siteId') });
summary.order = sanitizeOrderForPublic(summary.order, { includeAccessToken: !!summary.order && canAccessOrder(req, summary.order) });
return json(req, res, 200, { ok: true, summary });
}
if (pathname === '/api/public/order' && req.method === 'GET') {
const db = await readDb();
const orderId = String(url.searchParams.get('orderId') || '');
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
if (order.customerId && !canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '주문 접근 권한이 없습니다.' });
const paymentSession = (db.paymentSessions || []).find(item => item.orderId === order.id) || null;
return json(req, res, 200, { ok: true, order: sanitizeOrderForPublic(order, { includeAccessToken: canAccessOrder(req, order) || ownsOrder(customerSession?.customer, order) }), paymentSession });
}
if (pathname === '/api/public/fulfillment' && req.method === 'GET') {
const db = await readDb();
const orderId = String(url.searchParams.get('orderId') || '').trim();
if (!orderId) return json(req, res, 400, { ok: false, error: 'orderId가 필요합니다.' });
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
if ((order.customerId || order.status === 'paid') && !canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '산출물 접근 권한이 없습니다.' });
const asset = order.status === 'paid' ? ensureFulfillmentForOrder(db, order) : null;
if (asset || !order.accessToken) await writeDb(db);
return json(req, res, 200, { ok: true, order: { ...order, accessToken: generateOrderAccessToken(order) }, asset, locked: order.status !== 'paid' });
}
if (pathname === '/api/public/fulfillment-download' && req.method === 'GET') {
const db = await readDb();
const orderId = String(url.searchParams.get('orderId') || '').trim();
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
if ((order.customerId || order.status === 'paid') && !canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '산출물 접근 권한이 없습니다.' });
if (order.status !== 'paid') return json(req, res, 402, { ok: false, error: '결제 완료 후 다운로드할 수 있습니다.' });
const asset = ensureFulfillmentForOrder(db, order);
await writeDb(db);
const pdf = buildAssetPdfBuffer(asset, order);
res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="nv0-${order.id}.pdf"`, ...baseHeaders(req, 'dynamic') });
res.end(pdf);
return;
}
if (pathname === '/api/public/product-detail' && req.method === 'GET') {
const code = String(url.searchParams.get('code') || '').trim();
const offer = getCommercialOffer(code);
if (!offer) return json(req, res, 404, { ok: false, error: '상품을 찾을 수 없습니다.' });
return json(req, res, 200, { ok: true, offer });
}
if (pathname === '/api/public/guidance' && req.method === 'GET') {
const db = await readDb();
const siteId = String(url.searchParams.get('siteId') || '');
const guidance = siteId ? findLatestGuidanceForSite(db, siteId) : db.guidanceDocuments[0] || null;
if (!guidance) return json(req, res, 404, { ok: false, error: '지침 문서를 찾을 수 없습니다.' });
return json(req, res, 200, { ok: true, guidance });
}
if ((pathname === '/api/public/scan' || pathname === '/api/public/diagnose') && req.method === 'POST') {
const rate = await hitRateLimit('scan', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: PUBLIC_SCAN_LIMIT });
if (rate.blocked) {
return json(req, res, 429, { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) });
}
const body = normalizeScanPayload(await bodyJson(req, MAX_JSON_BODY_BYTES));
const turnstile = await verifyTurnstile(req, body.turnstileToken);
if (!turnstile.ok) return json(req, res, 400, { ok: false, error: 'Turnstile 검증에 실패했습니다.' });
const db = await readDb();
const result = await scanResultFor(body.target, db);
const site = ensureSiteRecord(db, result);
const customerSession = await getCustomerSession(req, db);
if (customerSession?.customer) linkCustomerToSite(db, customerSession.customer.id, site, { label: site.domain, industry: site.industry });
const subscription = ensureSubscriptionForSite(db, site, result.recommendedPlan);
const guidance = createGuidanceDocument(db, site, result);
const autoFixJobs = seedAutoFixJobs(db, site, result);
const offers = buildCommercialOfferCatalog();
const intelligence = buildProductIntelligence({ scan: result, site, offers, source: 'scan' });
const journey = buildSmartProductOrchestration({ scan: result, site, intelligence, offers, source: 'scan' });
let ctaPublication = null;
if (db.settings.ctaAutopublishEnabled) ctaPublication = createCtaPublication(db, result, { autoPublished: true });
db.scans.unshift({ siteId: site.id, subscriptionId: subscription.id, customerId: customerSession?.customer?.id || null, createdAt: nowIso(), intelligence, journey, ...result });
db.scans = db.scans.slice(0, 100);
appendAudit(db, req, 'public.scan.created', { requestId: result.requestId, target: result.target, siteId: site.id, provider: result.provider || SCAN_PROVIDER, linkedCustomer: !!customerSession?.customer, ctaPublicationId: ctaPublication?.id || null, recommendedPlan: intelligence.recommendedPlan });
await writeDb(db);
return json(req, res, 200, { ok: true, result: { ...result, siteId: site.id, guidanceId: guidance.id, autoFixJobsCount: autoFixJobs.length, savedToAccount: !!customerSession?.customer, ctaPublicationId: ctaPublication?.id || null, intelligence, journey, diagnosis: buildPublicDiagnosisPackage(result, { rulesVersion: RULES_VERSION, ctaIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS }) } });
}
if (pathname === '/api/public/checkout-session' && req.method === 'POST') {
if (PRELAUNCH_MODE || PAYMENT_PROVIDER === 'disabled') {
return json(req, res, 503, { ok: false, error: '현재는 고객지원 이메일로 신청을 접수합니다. 결제창 이용이 필요한 경우 고객지원으로 문의해 주세요.', stage: DEPLOYMENT_STAGE, supportEmail: BUSINESS_PROFILE.contactEmail });
}
const rate = await hitRateLimit('checkout-session', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: Math.max(5, Math.floor(PUBLIC_SCAN_LIMIT / 2)) });
if (rate.blocked) {
return json(req, res, 429, { ok: false, error: '결제 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) });
}
const body = normalizeCheckoutPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const idempotencyKey = getIdempotencyKey(req, body);
const requestHash = hashRequestPayload({ plan: body.plan, email: normalizeEmail(body.email || body.buyerEmail || ''), domain: body.domain, siteId: body.siteId });
const db = await readDb();
const replay = findIdempotencyRecord(db, 'checkout', idempotencyKey);
if (replay) {
if (replay.requestHash !== requestHash) return json(req, res, 409, { ok: false, error: '동일 idempotency key로 다른 결제 요청을 재사용할 수 없습니다.' });
return json(req, res, 200, { ok: true, replay: true, ...replay.result });
}
const customerSession = await getCustomerSession(req, db);
if (customerSession?.customer) {
body.customerId = customerSession.customer.id;
body.buyerEmail ||= customerSession.customer.email;
}
if (!isValidEmail(body.buyerEmail || '')) return json(req, res, 400, { ok: false, error: '산출물 수신 이메일이 필요합니다.' });
if (!body.privacyConsent || !body.termsConsent || !body.refundConsent || !body.deliveryConsent) {
return json(req, res, 400, { ok: false, error: '개인정보처리방침, 이용약관, 환불정책, 디지털 산출물 제공 및 청약철회 제한 고지 확인이 필요합니다.' });
}
const lockKey = `checkout:${body.siteId || body.domain || body.buyerEmail || clientIp(req)}`;
if (!await distributedLock.acquire(lockKey, 10)) {
return json(req, res, 409, { ok: false, error: '동일 대상의 결제 세션 생성이 이미 진행 중입니다.' });
}
let created;
try {
created = await createCheckoutOrder(db, body);
} finally {
await distributedLock.release(lockKey);
}
const checkoutResult = { order: { ...created.order, accessToken: generateOrderAccessToken(created.order) }, paymentSession: created.paymentSession, providerMode: PAYMENT_PROVIDER };
storeIdempotencyRecord(db, { scope: 'checkout', key: idempotencyKey, requestHash, result: checkoutResult });
appendAudit(db, req, 'public.checkout.created', { orderId: created.order.id, provider: PAYMENT_PROVIDER, siteId: created.order.siteId || null, plan: created.order.plan, idempotency: !!idempotencyKey });
await writeDb(db);
return json(req, res, 200, { ok: true, ...checkoutResult });
}
if (pathname === '/api/public/payment/retry' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const orderId = String(body.orderId || body.id || '').trim();
const db = await readDb();
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
if (!canAccessOrder(req, order) && !ownsOrder(customerSession?.customer, order)) return json(req, res, 403, { ok: false, error: '결제 재시도 권한이 없습니다.' });
if (order.status === 'paid') return json(req, res, 409, { ok: false, error: '이미 결제 완료된 주문입니다.' });
order.status = 'pending'; order.stage = 'checkout_retry'; order.retryCount = Number(order.retryCount || 0) + 1; order.updatedAt = nowIso();
const paymentSession = { id: uid('pay'), orderId: order.id, provider: PAYMENT_PROVIDER, redirectUrl: null, providerState: PAYMENT_PROVIDER === 'demo' ? 'ready_for_demo_capture' : 'retry_requested', createdAt: nowIso(), retry: true };
db.paymentSessions ||= []; db.paymentSessions.unshift(paymentSession); order.paymentSessionId = paymentSession.id;
appendAudit(db, req, 'public.payment.retry_requested', { orderId: order.id, retryCount: order.retryCount });
await writeDb(db);
return json(req, res, 200, { ok: true, order: { ...sanitizeOrderForPublic(order), accessToken: generateOrderAccessToken(order) }, paymentSession });
}
if (pathname === '/api/public/payment/complete' && req.method === 'POST') {
const rate = await hitRateLimit('payment-complete', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: Math.max(8, PUBLIC_SCAN_LIMIT) });
if (rate.blocked) {
return json(req, res, 429, { ok: false, error: '결제 완료 요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) });
}
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const orderId = String(body.orderId || body.id || '').trim();
if (!orderId) return json(req, res, 400, { ok: false, error: 'orderId가 필요합니다.' });
const lockKey = `payment-complete:${orderId}`;
if (!await distributedLock.acquire(lockKey, 15)) {
return json(req, res, 409, { ok: false, error: '동일 주문의 결제 완료 처리가 이미 진행 중입니다.' });
}
const db = await readDb();
try {
if (PAYMENT_PROVIDER === 'portone_v2') {
const synced = await syncPortOneCheckoutOrder(db, orderId, body.paymentId, 'client_complete');
if (!synced.order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
appendAudit(db, req, synced.ok ? 'public.payment.portone.completed' : 'public.payment.portone.verification_failed', { orderId, paymentId: body.paymentId || orderId, reason: synced.reason || null });
await writeDb(db);
if (!synced.ok && synced.reason !== 'payment_not_completed') {
return json(req, res, 400, { ok: false, error: `결제 검증에 실패했습니다: ${synced.reason}`, order: synced.order, paymentSession: synced.paymentSession });
}
return json(req, res, 200, { ok: true, order: { ...synced.order, accessToken: generateOrderAccessToken(synced.order) }, paymentSession: synced.paymentSession, payment: synced.payment || null, pendingSettlement: !!synced.pendingSettlement });
}
try {
assertCommercialRouteAllowed(PLATFORM, 'demo_payment_complete');
} catch (error) {
return json(req, res, 403, { ok: false, error: '상용 타깃에서는 테스트 결제 완료 라우트를 사용할 수 없습니다.' });
}
if (PAYMENT_PROVIDER === 'external_http') return json(req, res, 400, { ok: false, error: '외부 결제 방식에서는 결제 확인 절차가 필요합니다.' });
const completed = completeCheckoutOrder(db, orderId);
if (!completed) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
appendAudit(db, req, 'public.payment.completed', { orderId: completed.order.id, provider: PAYMENT_PROVIDER });
await writeDb(db);
return json(req, res, 200, { ok: true, order: { ...completed.order, accessToken: generateOrderAccessToken(completed.order) }, paymentSession: completed.paymentSession });
} finally {
await distributedLock.release(lockKey);
}
}
if (pathname === '/api/public/payment/portone/webhook' && req.method === 'POST') {
const raw = await bodyText(req, MAX_JSON_BODY_BYTES);
const rawSha256 = crypto.createHash('sha256').update(raw || '').digest('hex');
const signatureHeader = req.headers['webhook-signature'] || req.headers['x-webhook-signature'] || req.headers['x-portone-signature'] || '';
const webhookVerification = verifyPortOneWebhook({ rawBody: raw, headers: req.headers, secret: PORTONE_WEBHOOK_SECRET });
let payload;
try {
payload = raw ? JSON.parse(raw) : {};
} catch {
const db = await readDb();
appendWebhookInbox(db, {
provider: 'portone_v2',
eventType: 'payment.webhook.invalid_json',
paymentId: null,
signaturePresent: Boolean(signatureHeader),
verified: false,
verificationMode: 'standard_webhooks_v1',
status: 'rejected',
rawSha256,
reason: 'invalid_json',
payload: {}
});
await writeDb(db);
return json(req, res, 400, { ok: false, error: '유효한 JSON 웹훅 본문이 필요합니다.' });
}
const paymentId = PORTONE_CLIENT.extractWebhookPaymentId(payload);
if (!webhookVerification.ok && PORTONE_WEBHOOK_VERIFY_MODE === 'strict') {
const db = await readDb();
appendWebhookInbox(db, {
provider: 'portone_v2',
eventType: String(payload?.type || payload?.eventType || 'payment.webhook').trim() || 'payment.webhook',
paymentId: paymentId || null,
signaturePresent: Boolean(signatureHeader),
verified: false,
verificationMode: 'standard_webhooks_v1',
status: 'rejected',
rawSha256,
reason: webhookVerification.reason,
payload
});
appendAudit(db, req, 'public.payment.portone.webhook_rejected', { paymentId: paymentId || null, reason: webhookVerification.reason, verificationMode: 'standard_webhooks_v1' });
await writeDb(db);
return json(req, res, 401, { ok: false, error: '결제 알림 서명 검증에 실패했습니다.', reason: webhookVerification.reason });
}
if (!paymentId) return json(req, res, 202, { ok: true, ignored: true, reason: 'payment_id_missing' });
const lockKey = `portone-webhook:${paymentId}`;
if (!await distributedLock.acquire(lockKey, 15)) {
return json(req, res, 202, { ok: true, queued: false, reason: 'duplicate_inflight' });
}
try {
const db = await readDb();
appendWebhookInbox(db, {
provider: 'portone_v2',
eventType: String(payload?.type || payload?.eventType || 'payment.webhook').trim() || 'payment.webhook',
paymentId,
signaturePresent: Boolean(signatureHeader),
verified: webhookVerification.ok,
verificationMode: webhookVerification.ok ? 'standard_webhooks_v1' : 'provider_refetch',
status: 'received',
rawSha256,
reason: webhookVerification.reason || null,
payload
});
const synced = await syncPortOneCheckoutOrder(db, paymentId, paymentId, 'webhook');
const inbox = db.webhookInbox?.[0];
if (inbox) {
inbox.status = synced.ok ? 'processed' : 'failed';
inbox.verified = webhookVerification.ok && synced.ok;
inbox.orderId = synced.order?.id || paymentId;
inbox.reason = synced.reason || webhookVerification.reason || null;
}
appendAudit(db, req, synced.ok ? 'public.payment.portone.webhook_synced' : 'public.payment.portone.webhook_failed', { orderId: synced.order?.id || paymentId, paymentId, reason: synced.reason || webhookVerification.reason || null, verificationMode: webhookVerification.ok ? 'standard_webhooks_v1' : 'provider_refetch' });
await writeDb(db);
return json(req, res, 200, { ok: true, synced: synced.ok, reason: synced.reason || webhookVerification.reason || null, verificationMode: webhookVerification.ok ? 'standard_webhooks_v1' : 'provider_refetch' });
} finally {
await distributedLock.release(lockKey);
}
}
  return json(req, res, 404, { ok: false, error: 'Public route not found' });
  };
}

export async function handlePublicRoutes(req, res, ctx, state = {}) {
  return createPublicRouteHandler(ctx)(req, res, state);
}

