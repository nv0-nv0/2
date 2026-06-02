import { buildDemoIssueOverview, buildConversionUrgencyModel } from '../core/service-quality.mjs';
// Native server account route split for the native http.createServer dispatcher.
// Framework-free: the parent public dispatcher calls this handler directly.
export function createAccountRouteHandler(ctx) {
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
  sanitizeOrderForPublic,
  rateLimitStore,
  readDb,
  scanResultFor,
  seedAutoFixJobs,
  sameOriginAllowed,
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

  return async function handleAccountRoutes(req, res, state = {}) {
    const routeState = state.requestUrl ? state : req._nv0RouteState;
    if (!routeState || !routeState.requestUrl) return false;
    const url = routeState.requestUrl;
    const pathname = routeState.pathname;
    if (!(pathname.startsWith('/api/public/auth/') || pathname === '/api/public/account' || pathname.startsWith('/api/public/account/'))) return false;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET') && typeof sameOriginAllowed === 'function' && !sameOriginAllowed(req)) {
      return json(req, res, 403, { ok: false, error: '허용되지 않은 origin 입니다.' }, { 'cache-control': 'no-store' });
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
return json(req, res, 200, { ok: true, result: { ...scan, diagnosis: buildPublicDiagnosisPackage(scan), demoIssueOverview: scan.demoIssueOverview || buildDemoIssueOverview(scan), conversionUrgency: scan.conversionUrgency || buildConversionUrgencyModel(scan, { plan: scan.recommendedPlan || 'Report' }), savedToAccount: true, paidAccess: true }, locked: false });
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

    return false;
  };
}

export async function handleAccountRoutes(req, res, ctx, state = {}) {
  return createAccountRouteHandler(ctx)(req, res, state);
}
