// Phase166 payment/commerce route split for the native http.createServer dispatcher.
// Framework-free: the parent public dispatcher calls this handler directly.
/**
 * Builds the commerce route handler used by the public API dispatcher.
 *
 * The handler owns checkout sessions, order lookups, guest fulfillment, refunds,
 * and payment provider callbacks. Keeping these branches in one module avoids
 * duplicated payment logic in the general public route file and makes audit
 * coverage easier to reason about.
 */
export function createPaymentRouteHandler(ctx) {
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
  timingSafeStringEqual,
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
  return async function handlePaymentRoutes(req, res, state = {}) {
    const routeState = state.requestUrl ? state : req._nv0RouteState;
    if (!routeState || !routeState.requestUrl) return false;
    const url = routeState.requestUrl;
    const pathname = routeState.pathname;
    if (!(
      pathname === '/api/public/refund-request' ||
      pathname === '/api/public/portal-summary' ||
      pathname === '/api/public/order' ||
      pathname === '/api/public/fulfillment' ||
      pathname === '/api/public/fulfillment-download' ||
      pathname === '/api/public/product-detail' ||
      pathname === '/api/public/guidance' ||
      pathname === '/api/public/checkout-session' ||
      pathname.startsWith('/api/public/payment/')
    )) return false;
if (pathname === '/api/public/payment/config' && req.method === 'GET') {
const portone = PORTONE_CLIENT?.configSummary ? PORTONE_CLIENT.configSummary() : { enabled: false };
const productCodes = buildCommercialOfferCatalog().map(item => ({ code: item.code, title: item.title, price: item.price, period: item.period, group: item.group }));
const paymentReady = !PRELAUNCH_MODE && PAYMENT_PROVIDER !== 'disabled' && (PAYMENT_PROVIDER !== 'portone_v2' || !!portone.enabled);
const reason = paymentReady ? '' : PRELAUNCH_MODE ? '사전 오픈 모드에서는 결제창을 열지 않습니다.' : PAYMENT_PROVIDER === 'disabled' ? '결제 제공자가 비활성화되어 있습니다.' : PAYMENT_PROVIDER === 'portone_v2' ? 'PortOne 필수 환경값(storeId, channelKey, apiSecret)을 확인해야 합니다.' : '결제 제공자 상태를 확인해야 합니다.';
return json(req, res, 200, {
  ok: true,
  provider: PAYMENT_PROVIDER,
  paymentReady,
  reason,
  prelaunchMode: PRELAUNCH_MODE,
  deploymentStage: DEPLOYMENT_STAGE,
  commercialLaunchReady: COMMERCIAL_LAUNCH_READY,
  endpoints: { checkoutSession: 'POST /api/public/checkout-session', complete: 'POST /api/public/payment/complete', webhook: 'POST /api/public/payment/portone/webhook' },
  productCodes,
  portone: {
    enabled: !!portone.enabled,
    storeIdConfigured: !!portone.storeIdConfigured,
    channelKeyConfigured: !!portone.channelKeyConfigured,
    apiSecretConfigured: !!portone.apiSecretConfigured,
    webhookSecretConfigured: !!portone.webhookSecretConfigured,
    redirectUrlConfigured: !!portone.redirectUrlConfigured,
    noticeUrlConfigured: !!portone.noticeUrlConfigured,
    defaultPayMethod: portone.defaultPayMethod || 'CARD'
  }
});
}
if (pathname === '/api/public/refund-request' && req.method === 'POST') {
const body = normalizeRefundRequestPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const db = await readDb();
db.refundRequests ||= [];
const order = (db.orders || []).find(item => item.id === body.orderId);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const customerSession = await getCustomerSession(req, db);
const tokenAllowed = timingSafeStringEqual(order.accessToken, body.accessToken);
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
ctaPublication = createCtaPublicationIfDue(db, result, { reason: 'scan' });
db.scans.unshift({ siteId: site.id, subscriptionId: subscription.id, customerId: customerSession?.customer?.id || null, createdAt: nowIso(), intelligence, journey, ...result });
db.scans = db.scans.slice(0, 100);
appendAudit(db, req, 'public.scan.created', { requestId: result.requestId, target: result.target, siteId: site.id, provider: result.provider || SCAN_PROVIDER, linkedCustomer: !!customerSession?.customer, ctaPublicationId: ctaPublication?.id || null, recommendedPlan: intelligence.recommendedPlan });
await writeDb(db);
return json(req, res, 200, { ok: true, result: { ...result, siteId: site.id, guidanceId: guidance.id, autoFixJobsCount: autoFixJobs.length, savedToAccount: !!customerSession?.customer, ctaPublicationId: ctaPublication?.id || null, intelligence, journey, diagnosis: buildPublicDiagnosisPackage(result, { rulesVersion: RULES_VERSION, ctaIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS }) } });
}
if (pathname === '/api/public/checkout-session' && req.method === 'POST') {
if (PRELAUNCH_MODE || PAYMENT_PROVIDER === 'disabled') {
return json(req, res, 503, { ok: false, error: '온라인 결제 환경이 아직 활성화되지 않았습니다. NV0_PAYMENT_PROVIDER와 PortOne 환경값을 확인해 주세요.', stage: DEPLOYMENT_STAGE, paymentOnly: true });
}
if (PAYMENT_PROVIDER === 'portone_v2' && !PORTONE_CLIENT?.enabled) {
return json(req, res, 503, { ok: false, error: 'PortOne 결제 환경값이 완성되지 않았습니다. storeId, channelKey, apiSecret 설정을 확인해 주세요.', stage: DEPLOYMENT_STAGE, paymentOnly: true });
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
return json(req, res, 403, { ok: false, error: '상용 타깃에서는 확인용 결제 완료 라우트를 사용할 수 없습니다.' });
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

    return false;
  };
}

export async function handlePaymentRoutes(req, res, ctx, state = {}) {
  return createPaymentRouteHandler(ctx)(req, res, state);
}
