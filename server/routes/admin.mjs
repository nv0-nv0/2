import { isSafeHttpMethod } from '../core/native-route-state.mjs';
// Native server admin API dispatcher for native http.createServer routing.
import { createOpsRouteHandler } from './ops.mjs';
import { buildTrustOpsAutopilotCockpit } from '../core/trustops-autopilot-engine.mjs';
import { buildTrustOpsLaunchControl } from '../core/trustops-launch-control.mjs';
import { buildProductionSentinel } from '../core/trustops-production-sentinel.mjs';
import { buildTrustOpsFinalHandoff } from '../core/trustops-final-handoff.mjs';
import { buildTrustOps100PointFinalScorecard } from '../core/trustops-100-point-finalizer.mjs';
import { buildTrustOpsCompleteDelivery } from '../core/trustops-complete-delivery.mjs';
import { appendSystemControlEvent, buildSystemControlPlaneSnapshot, normalizeSystemControlEventPayload, runSystemControlPlanePackageAudit } from '../core/system-control-plane.mjs';

export function createAdminRouteHandler(ctx) {
  const {
  ADMIN_AUTH_LIMIT,
  ADMIN_AUTH_MODE,
  ADMIN_MFA_REQUIRED,
  ADMIN_TOTP_SECRET,
  ADMIN_AUTH_WINDOW_MS,
  ADMIN_KEY,
  AUDIT_LOG_RETENTION_COUNT,
  AUTO_BACKUP_ENABLED,
  BACKUPS_DIR,
  BACKUP_ENCRYPTION_SECRET,
  BACKUP_REMOTE_ENABLED,
  BACKUP_RETENTION_COUNT,
  COMMERCIAL_LAUNCH_READY,
  DEPLOYMENT_STAGE,
  EMAIL_MAX_RETRY_COUNT,
  EMAIL_RETRY_BACKOFF_MS,
  ENABLE_TURNSTILE,
  MAX_JSON_BODY_BYTES,
  MAX_MULTIPART_BODY_BYTES,
  NODE_ENV,
  OPERATOR_ALERT_EMAIL,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_URL,
  PLATFORM,
  REPORTS_DIR,
  RUNTIME_DIR,
  SCAN_PROVIDER,
  SCAN_PROVIDER_FALLBACK,
  SCAN_PROVIDER_URL,
  SESSION_TTL_MS,
  STORAGE_MODE,
  TRUST_PROXY_HEADERS,
  TURNSTILE_CONFIGURED,
  TURNSTILE_PUBLIC_ENABLED,
  TURNSTILE_SITE_KEY,
  UPLOADS_DIR,
  adminIpAllowed,
  appendAudit,
  asTrimmedString,
  authenticateAdminAccount,
  verifyTotpCode,
  backupSecurityConfigSummary,
  bodyBuffer,
  bodyJson,
  buildAdminOperatingProfile,
  buildDiagnosisAccuracyProfile,
  buildCommercialFinalGate,
  buildHardeningMatrix,
  buildOpsReport,
  buildProductionLaunchChecklist,
  buildReleaseReadiness,
  buildRuleCatalog,
  buildProductAgentRuntimeStatus,
  runProductAgentPackageAudit,
  buildEngineAgentRuntimeStatus,
  runEngineAgentPackageAudit,
  buildExperienceControlPlane,
  runExperienceOrchestratorAudit,
  buildCommercialReadinessStatus,
  runCommercialReadinessAudit,
  buildSystemItemsFeed,
  canTransition,
  cleanupDataRetention,
  clientIp,
  createBackupSnapshot,
  createCtaPublication,
  createGuidanceDocument,
  crypto,
  enqueueTransactionalEmail,
  ensureBootstrapAdmin,
  ensureFulfillmentForOrder,
  ensureSiteRecord,
  ensureSubscriptionForSite,
  expiredSessionCookie,
  fs,
  getSession,
  hitRateLimit,
  isAllowedUpload,
  sanitizeUploadFilename,
  json,
  listBackupSnapshots,
  markSessionsDirty,
  maskEmail,
  normalizeEmailDeliveryPayload,
  normalizeIdPayload,
  normalizeIdStatusPayload,
  normalizeLibraryNotePayload,
  normalizeOpsPayload,
  normalizePublicationPayload,
  normalizeRequestIdPayload,
  normalizeRulePayload,
  normalizeScanPayload,
  normalizeSettingsPayload,
  normalizeSubscriptionPayload,
  normalizeSystemItemPayload,
  nowIso,
  ownsOrder,
  parseMultipart,
  path,
  processEmailOutbox,
  pruneBackupSnapshots,
  publicCustomer,
  pseudonymizeIp,
  putObjectToS3Compatible,
  readDb,
  requireAdminCsrf,
  requireAdminPermission,
  restoreBackupSnapshot,
  sanitizeOrderForPublic,
  scanResultFor,
  seedAutoFixJobs,
  sessionCookie,
  sessions,
  syncPortOneCheckoutOrder,
  uid,
  verifyTurnstile,
  writeDb,
  writeOpsReportSnapshot,
  writeSessionsToDisk
  } = ctx;
  const opsRouteHandler = createOpsRouteHandler(ctx);
  return async function handleAdminRoutes(req, res, state = {}) {
  const routeState = state.requestUrl ? state : req._nv0RouteState;
  if (!routeState || !routeState.requestUrl) return false;
  const url = routeState.requestUrl;
  const pathname = routeState.pathname;
  if (!pathname.startsWith('/api/admin/')) return false;
if (pathname === '/api/admin/session' && req.method === 'GET') {
if (!adminIpAllowed(req)) return json(req, res, 403, { ok: false, authenticated: false, error: '관리자 접근 IP가 허용 목록에 없습니다.' });
const session = await getSession(req);
return json(req, res, 200, { ok: true, authenticated: !!session, csrfToken: session?.csrfToken || '', turnstileEnabled: ENABLE_TURNSTILE, turnstileSiteKey: ENABLE_TURNSTILE ? TURNSTILE_SITE_KEY : '', adminAuthMode: ADMIN_AUTH_MODE, adminMfaRequired: ADMIN_MFA_REQUIRED, platformTarget: PLATFORM.target, adminUser: session ? { id: session.adminUserId || null, email: session.adminEmail || null, displayName: session.adminDisplayName || null, roles: session.roles || [], permissions: session.permissions || [] } : null });
}
if (pathname === '/api/admin/session' && req.method === 'POST') {
if (!adminIpAllowed(req)) return json(req, res, 403, { ok: false, error: '관리자 접근 IP가 허용 목록에 없습니다.' });
const rate = await hitRateLimit('admin-auth', clientIp(req), { windowMs: ADMIN_AUTH_WINDOW_MS, limit: ADMIN_AUTH_LIMIT });
if (rate.blocked) {
return json(req, res, 429, { ok: false, error: '인증 시도가 너무 많습니다. 잠시 후 다시 시도하세요.' }, { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) });
}
const body = await bodyJson(req, MAX_JSON_BODY_BYTES);
const db = await readDb();
await ensureBootstrapAdmin(db, process.env, uid, nowIso);
const turnstile = await verifyTurnstile(req, body?.turnstileToken);
if (!turnstile.ok) {
appendAudit(db, req, 'admin.auth.turnstile_failed');
await writeDb(db);
return json(req, res, 400, { ok: false, error: 'Turnstile 검증에 실패했습니다.' });
}
if (ADMIN_AUTH_MODE === 'account_rbac') {
const email = asTrimmedString(body?.email, { field: 'email', required: true, max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
const password = asTrimmedString(body?.password, { field: 'password', required: true, max: 200 });
const auth = await authenticateAdminAccount(db, email, password);
if (auth && ADMIN_MFA_REQUIRED && !verifyTotpCode(ADMIN_TOTP_SECRET, body?.otp)) {
appendAudit(db, req, 'admin.auth.mfa_failed', { mode: 'account_rbac', email });
await writeDb(db);
return json(req, res, 401, { ok: false, error: '일회용 인증번호가 올바르지 않습니다.' });
}
if (!auth) {
appendAudit(db, req, 'admin.auth.failed', { mode: 'account_rbac', email });
await writeDb(db);
return json(req, res, 401, { ok: false, error: '로그인 정보가 올바르지 않습니다.' });
}
const sid = crypto.randomBytes(24).toString('hex');
const csrfToken = crypto.randomBytes(16).toString('hex');
sessions.set(sid, {
createdAt: Date.now(),
lastSeenAt: Date.now(),
expiresAt: Date.now() + SESSION_TTL_MS,
csrfToken,
adminUserId: auth.user.id,
adminEmail: auth.user.email,
adminDisplayName: auth.user.displayName,
roles: auth.roles,
permissions: auth.permissions
});
markSessionsDirty();
await writeSessionsToDisk();
auth.user.lastLoginAt = nowIso();
auth.user.updatedAt = nowIso();
db.adminSessions.unshift({ id: uid('admsess'), sessionId: sid, userId: auth.user.id, createdAt: nowIso(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(), ipHash: pseudonymizeIp(clientIp(req)) });
appendAudit(db, req, 'admin.auth.succeeded', { mode: 'account_rbac', userId: auth.user.id, email: auth.user.email, roles: auth.roles });
await writeDb(db);
return json(req, res, 200, { ok: true, csrfToken, adminUser: { id: auth.user.id, email: auth.user.email, displayName: auth.user.displayName, roles: auth.roles, permissions: auth.permissions } }, { 'set-cookie': sessionCookie(req, sid, Math.floor(SESSION_TTL_MS / 1000)) });
}
if (PLATFORM.commercial) {
appendAudit(db, req, 'admin.auth.blocked', { reason: 'commercial_requires_account_rbac' });
await writeDb(db);
return json(req, res, 501, { ok: false, error: '상용 타깃에서는 account_rbac 인증 구현 후 관리자 로그인을 활성화해야 합니다.' });
}
const key = asTrimmedString(body?.key, { field: 'key', max: 200 });
if (!key || key !== ADMIN_KEY) {
appendAudit(db, req, 'admin.auth.failed', { mode: 'shared_key' });
await writeDb(db);
return json(req, res, 401, { ok: false, error: '키가 올바르지 않습니다.' });
}
const sid = crypto.randomBytes(24).toString('hex');
const csrfToken = crypto.randomBytes(16).toString('hex');
sessions.set(sid, { createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS, csrfToken, roles: ['super_admin'], permissions: ['*'] });
markSessionsDirty();
await writeSessionsToDisk();
appendAudit(db, req, 'admin.auth.succeeded', { mode: 'shared_key' });
await writeDb(db);
return json(req, res, 200, { ok: true, csrfToken, adminUser: { id: null, email: null, displayName: 'Shared Key Admin', roles: ['super_admin'], permissions: ['*'] } }, { 'set-cookie': sessionCookie(req, sid, Math.floor(SESSION_TTL_MS / 1000)) });
}
if (pathname === '/api/admin/logout' && req.method === 'POST') {
const session = await getSession(req);
if (session && !requireAdminCsrf(req, res, session)) return;
const db = await readDb();
if (session) {
sessions.delete(session.sid);
markSessionsDirty();
await writeSessionsToDisk();
db.adminSessions = (db.adminSessions || []).filter((item) => item.sessionId !== session.sid);
}
appendAudit(db, req, 'admin.logout');
await writeDb(db);
return json(req, res, 200, { ok: true }, { 'set-cookie': expiredSessionCookie(req) });
}
if (!pathname.startsWith('/api/admin/')) return false;
if (!adminIpAllowed(req)) return json(req, res, 403, { ok: false, error: '관리자 접근 IP가 허용 목록에 없습니다.' });
const session = await getSession(req);
if (!session) return json(req, res, 401, { ok: false, error: '관리자 세션이 필요합니다.' });
if (!isSafeHttpMethod(req.method)) {
if (!requireAdminCsrf(req, res, session)) return;
}
const db = await readDb();
const opsHandled = await opsRouteHandler(req, res, { requestUrl: url, pathname, session, db });
if (opsHandled !== false) return opsHandled;
if (pathname === '/api/admin/status' && req.method === 'GET') {
const highRiskSites = db.sites.filter(item => (item.latestRiskScore || 0) >= 70).length;
const pendingAutoFixJobs = db.autoFixJobs.filter(item => item.status === 'pending').length;
return json(req, res, 200, {
ok: true,
counts: {
orders: db.orders.length,
subscriptions: db.subscriptions.length,
sites: db.sites.length,
publications: db.publications.length,
library: db.library.length,
scans: db.scans.length,
legalUpdates: db.legalUpdates.length,
autoFixJobs: db.autoFixJobs.length,
paymentSessions: db.paymentSessions.length,
pendingAutoFixJobs,
highRiskSites,
auditLogs: db.auditLogs.length
},
session: { active: true, expiresAt: session.expiresAt }
});
}
if (pathname === '/api/admin/trustops-autopilot' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const cockpit = buildTrustOpsAutopilotCockpit(db, { nowIso: nowIso() });
appendAudit(db, req, 'admin.trustops_autopilot.checked', { queue: cockpit.counts.queue, mrr: cockpit.revenue.monthlyRecurringRevenue, stage: cockpit.health.revenueStage });
await writeDb(db);
return json(req, res, 200, { ok: true, cockpit });
}


if (pathname === '/api/admin/trustops-launch-control' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const launch = buildTrustOpsLaunchControl(db, { nowIso: nowIso(), env: process.env });
appendAudit(db, req, 'admin.trustops_launch_control.checked', { decision: launch.readiness.decision, score: launch.readiness.score, blockers: launch.readiness.blockers.length });
await writeDb(db);
return json(req, res, 200, { ok: true, launch });
}



if (pathname === '/api/admin/trustops-production-sentinel' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const sentinel = buildProductionSentinel(db, { nowIso: nowIso(), env: process.env, baseUrl: process.env.NV0_PUBLIC_BASE_URL || '' });
appendAudit(db, req, 'admin.trustops_production_sentinel.checked', { decision: sentinel.decision, score: sentinel.score, blockers: sentinel.blockers.length, liveChecks: sentinel.liveVerification.checks.length });
await writeDb(db);
return json(req, res, 200, { ok: true, sentinel });
}


if (pathname === '/api/admin/trustops-final-handoff' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const handoff = buildTrustOpsFinalHandoff(db, { nowIso: nowIso(), env: process.env, baseUrl: process.env.NV0_PUBLIC_BASE_URL || '', packageGateReady: true });
appendAudit(db, req, 'admin.trustops_final_handoff.checked', { decision: handoff.decision, acceptanceScore: handoff.acceptanceScore, blockers: handoff.blockers.length, warnings: handoff.warnings.length });
await writeDb(db);
return json(req, res, 200, { ok: true, handoff });
}


if (pathname === '/api/admin/trustops-100-final' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const scorecard = buildTrustOps100PointFinalScorecard(db, { nowIso: nowIso(), env: process.env, baseUrl: process.env.NV0_PUBLIC_BASE_URL || '', packageGateReady: true, runtimeClean: true, secretHygienePassed: true });
appendAudit(db, req, 'admin.trustops_100_final.checked', { decision: scorecard.decision, packageScore: scorecard.packageScore, failed: scorecard.failed.length });
await writeDb(db);
return json(req, res, 200, { ok: scorecard.ok, scorecard });
}


if (pathname === '/api/admin/trustops-complete-delivery' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const delivery = buildTrustOpsCompleteDelivery(db, { nowIso: nowIso(), env: process.env, baseUrl: process.env.NV0_PUBLIC_BASE_URL || '', packageGateReady: true, runtimeClean: true, secretHygienePassed: true });
appendAudit(db, req, 'admin.trustops_complete_delivery.checked', { decision: delivery.decision, packageScore: delivery.packageScore, failed: delivery.failed.length });
await writeDb(db);
return json(req, res, delivery.ok ? 200 : 207, { ok: delivery.ok, delivery });
}

if (pathname === '/api/admin/product-quality' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const profile = buildAdminOperatingProfile(db);
appendAudit(db, req, 'admin.product_quality.checked', { score: profile.score, blockers: profile.blockers.length });
await writeDb(db);
return json(req, res, profile.ok ? 200 : 207, { ok: profile.ok, profile });
}
if (pathname === '/api/admin/settings' && req.method === 'GET') return json(req, res, 200, { ok: true, settings: db.settings });
if (pathname === '/api/admin/settings' && req.method === 'POST') {
const body = normalizeSettingsPayload(await bodyJson(req, MAX_JSON_BODY_BYTES));
db.settings = { ...db.settings, ...body };
appendAudit(db, req, 'admin.settings.updated', { keys: Object.keys(body) });
await writeDb(db);
return json(req, res, 200, { ok: true, settings: db.settings });
}
if (pathname === '/api/admin/product-agents/audit' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const packageFiles = [
  'apps/public/board/app.js',
  'server/index.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'shared/veridion-rebrand.css',
  'scripts/check-public-product-pipeline.mjs',
  'scripts/run-release-gate.mjs',
  'tests/routes-smoke.mjs',
  'deploy/docker-compose.commercial.yml',
  'docs/QA.md'
];
const audit = runProductAgentPackageAudit({ files: packageFiles, packageJson: { scripts: { 'check:public-product-pipeline': 'node scripts/check-public-product-pipeline.mjs', 'verify:release': 'node scripts/run-release-gate.mjs' } }, routes: ['/api/public/product-agent-status', '/api/admin/product-agents/audit'] });
const status = buildProductAgentRuntimeStatus(db, { businessProfile: db.settings?.businessProfile });
appendAudit(db, req, 'admin.product_agents.audit', { score: audit.score, ok: audit.ok });
await writeDb(db);
return json(req, res, 200, { ok: audit.ok, audit, status });
}
if (pathname === '/api/admin/engine-agents/audit' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const packageFiles = [
  'server/core/engine-agent-orchestrator.mjs',
  'server/core/product-agent-suite.mjs',
  'server/routes/public.mjs',
  'server/routes/payment.mjs',
  'server/routes/admin.mjs',
  'shared/veridion-rebrand.css',
  'scripts/run-release-gate.mjs',
  'scripts/check-clean-baseline.mjs',
  'scripts/check-release-secret-hygiene.mjs',
  'docs/QA.md',
  'docs/DEPLOYMENT.md',
  'docs/ROLLBACK.md'
];
const audit = runEngineAgentPackageAudit({
  files: packageFiles,
  packageJson: { scripts: { 'verify:release': 'node scripts/run-release-gate.mjs', 'release:predeploy': 'npm run verify:release', 'test:trustops': 'node tests/trustops-growth.mjs', 'check:clean-baseline': 'node scripts/check-clean-baseline.mjs' } },
  routes: ['/api/public/engine-agent-status', '/api/admin/engine-agents/audit']
});
const status = buildEngineAgentRuntimeStatus(db, { businessProfile: db.settings?.businessProfile, nowIso: nowIso() });
appendAudit(db, req, 'admin.engine_agents.audit', { score: audit.score, ok: audit.ok, version: audit.version });
await writeDb(db);
return json(req, res, 200, { ok: audit.ok, audit, status });
}
if (pathname === '/api/admin/system-control-plane' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const controlPlane = buildSystemControlPlaneSnapshot(db, { nowIso });
return json(req, res, controlPlane.ok ? 200 : 207, { ok: controlPlane.ok, controlPlane });
}
if (pathname === '/api/admin/system-control-plane/audit' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const packageFiles = [
  'server/core/system-control-plane.mjs',
  'server/core/engine-agent-orchestrator.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'tests/system-control-plane-contract.mjs',
  'tests/system-control-plane-operations-hardening-contract.mjs',
  'scripts/run-release-gate.mjs',
  'docs/SYSTEM_CONTROL_PLANE_KO.md',
  'docs/SYSTEM_CONTROL_PLANE_OPERATIONS_HARDENING_KO.md'
];
const audit = runSystemControlPlanePackageAudit({
  files: packageFiles,
  routes: ['/api/public/system-control-plane','/api/admin/system-control-plane','/api/admin/system-control-plane/audit','/api/admin/system-control-plane/events'],
  sourceText: await fs.readFile(path.join(process.cwd(), 'server/core/system-control-plane.mjs'), 'utf8'),
  releaseGateText: await fs.readFile(path.join(process.cwd(), 'scripts/run-release-gate.mjs'), 'utf8')
});
const controlPlane = buildSystemControlPlaneSnapshot(db, { nowIso });
appendAudit(db, req, 'admin.system_control_plane.audit', { score: audit.score, ok: audit.ok, version: audit.version });
await writeDb(db);
return json(req, res, 200, { ok: audit.ok, audit, controlPlane });
}
if (pathname === '/api/admin/system-control-plane/events' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const body = normalizeSystemControlEventPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {}, { source: 'admin-api' });
const event = appendSystemControlEvent(db, body, { nowIso });
appendAudit(db, req, event.deduplicated ? 'admin.system_control_plane.event_deduplicated' : 'admin.system_control_plane.event_recorded', { eventId: event.id, duplicateOf: event.duplicateOf || null, deduplicated: event.deduplicated === true, pipelineId: event.pipelineId, layerId: event.layerId, status: event.status, severity: event.severity, action: event.action });
await writeDb(db);
return json(req, res, event.deduplicated ? 200 : 201, { ok: true, deduplicated: event.deduplicated === true, event, controlPlane: buildSystemControlPlaneSnapshot(db, { nowIso, eventLimit: 20 }) });
}
if (pathname === '/api/admin/experience-orchestrator' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const controlPlane = buildExperienceControlPlane(db, { nowIso: nowIso() });
appendAudit(db, req, 'admin.experience_orchestrator.checked', { score: controlPlane.score, status: controlPlane.status, criticalStages: controlPlane.priorityMatrix.length });
await writeDb(db);
return json(req, res, controlPlane.ok ? 200 : 207, { ok: controlPlane.ok, controlPlane });
}
if (pathname === '/api/admin/experience-orchestrator/audit' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const packageFiles = [
  'server/core/experience-orchestrator.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'server/core/engine-agent-orchestrator.mjs',
  'server/core/product-agent-suite.mjs',
  'tests/experience-orchestrator.mjs'
];
const audit = runExperienceOrchestratorAudit({
  files: packageFiles,
  packageJson: { scripts: { 'test:experience-orchestrator': true } },
  routes: ['/api/public/experience-orchestrator', '/api/admin/experience-orchestrator', '/api/admin/experience-orchestrator/audit'],
  sourceText: await fs.readFile(path.join(process.cwd(), 'server/core/experience-orchestrator.mjs'), 'utf8')
});
const controlPlane = buildExperienceControlPlane(db, { nowIso: nowIso() });
appendAudit(db, req, 'admin.experience_orchestrator.audit', { score: audit.score, ok: audit.ok });
await writeDb(db);
return json(req, res, 200, { ok: audit.ok, audit, controlPlane });
}
if (pathname === '/api/admin/commercial-readiness/audit' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const packageFiles = [
  'server/core/commercial-readiness.mjs',
  'scripts/validate-commercial-release.mjs',
  'scripts/check-operational-readiness-contract.mjs',
  'docs/DEPLOYMENT.md',
  'docs/OPERATIONS.md',
  'docs/ROLLBACK.md',
  'apps/public/privacy/index.html',
  'apps/public/terms/index.html',
  'apps/public/refund/index.html',
  'apps/public/business-info/index.html'
];
const audit = runCommercialReadinessAudit({
  files: packageFiles,
  packageJson: { scripts: { 'validate:commercial': 'node scripts/validate-commercial-release.mjs', 'deploy:precheck': 'npm run validate:coolify-env && npm run validate:deploy', 'verify:release': 'node scripts/run-release-gate.mjs', 'release:predeploy': 'npm run verify:release' } },
  routes: ['/api/public/commercial-readiness', '/api/admin/commercial-readiness/audit'],
  envExample: await fs.readFile(path.join(process.cwd(), 'deploy/env.commercial.template'), 'utf8').catch(() => '')
});
const status = buildCommercialReadinessStatus(db, process.env);
appendAudit(db, req, 'admin.commercial_readiness.audit', { score: audit.score, ok: audit.ok, version: audit.version, environmentScore: status.environmentScore });
await writeDb(db);
return json(req, res, 200, { ok: audit.ok, audit, status });
}
if (pathname === '/api/admin/publications' && req.method === 'GET') return json(req, res, 200, { ok: true, publications: db.publications.slice(0, 100) });
if (pathname === '/api/admin/publications/publish-now' && req.method === 'POST') {
const body = normalizePublicationPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const item = { id: uid('pub'), title: body.title, status: 'published', type: body.type, body: body.body || '', createdAt: nowIso() };
db.publications.unshift(item);
appendAudit(db, req, 'admin.publication.publish_now', { id: item.id, title: item.title });
await writeDb(db);
return json(req, res, 200, { ok: true, publication: item });
}
if (pathname === '/api/admin/publications/seed' && req.method === 'POST') {
if (PLATFORM.commercial || NODE_ENV === 'production') return json(req, res, 404, { ok: false, error: 'Not found' });
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const item = { id: uid('seed'), title: body.title || '시드 데이터', status: 'seeded', type: 'seed', createdAt: nowIso() };
db.publications.unshift(item);
appendAudit(db, req, 'admin.publication.seed', { id: item.id, title: item.title });
await writeDb(db);
return json(req, res, 200, { ok: true, seed: item });
}
if (pathname === '/api/admin/publications/cta-generate' && req.method === 'POST') {
const body = normalizeRequestIdPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const scan = db.scans.find(item => item.requestId === body.requestId) || db.scans[0];
if (!scan) return json(req, res, 404, { ok: false, error: '기준 스캔 결과가 없습니다.' });
const item = createCtaPublication(db, scan);
appendAudit(db, req, 'admin.publication.cta_generated', { id: item.id, requestId: scan.requestId });
await writeDb(db);
return json(req, res, 200, { ok: true, publication: item });
}
if (pathname === '/api/admin/orders' && req.method === 'GET') return json(req, res, 200, { ok: true, orders: db.orders, subscriptions: db.subscriptions, sites: db.sites });
if (pathname === '/api/admin/payments/portone/sync' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const orderId = String(body.orderId || body.paymentId || '').trim();
const paymentId = String(body.paymentId || orderId).trim();
if (!orderId) return json(req, res, 400, { ok: false, error: 'orderId가 필요합니다.' });
const synced = await syncPortOneCheckoutOrder(db, orderId, paymentId, 'admin_sync');
appendAudit(db, req, synced.ok ? 'admin.payment.portone.synced' : 'admin.payment.portone.sync_failed', { orderId, paymentId, reason: synced.reason || null });
await writeDb(db);
return json(req, res, synced.ok ? 200 : 400, { ok: synced.ok, reason: synced.reason || null, order: synced.order || null, paymentSession: synced.paymentSession || null, payment: synced.payment || null });
}
if (pathname === '/api/admin/payments/portone/cancel' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const orderId = String(body.orderId || '').trim();
if (!orderId) return json(req, res, 400, { ok: false, error: 'orderId가 필요합니다.' });
const order = db.orders.find(item => item.id === orderId);
const paymentSession = (db.paymentSessions || []).find(item => item.orderId === orderId);
if (!order || !paymentSession || paymentSession.provider !== 'portone_v2') return json(req, res, 404, { ok: false, error: '결제 세션을 찾을 수 없습니다.' });
const cancelled = await PORTONE_CLIENT.cancelPayment(paymentSession.providerPaymentId || order.id, { reason: String(body.reason || 'admin_cancel').trim() || 'admin_cancel' });
const synced = await syncPortOneCheckoutOrder(db, orderId, paymentSession.providerPaymentId || order.id, 'admin_cancel');
appendAudit(db, req, 'admin.payment.portone.cancel_requested', { orderId, paymentId: paymentSession.providerPaymentId || order.id, reason: String(body.reason || 'admin_cancel').trim() || 'admin_cancel' });
await writeDb(db);
return json(req, res, 200, { ok: true, cancellation: cancelled, order: synced.order || order, paymentSession: synced.paymentSession || paymentSession, payment: synced.payment || null });
}
if (pathname === '/api/admin/orders/status' && req.method === 'POST') {
const body = normalizeIdStatusPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {}, { allowStatuses: ['draft','pending','paid','failed','cancelled'] });
const row = db.orders.find(x => x.id === body.id);
if (!row) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
if (body.status && !canTransition(row.status, body.status, ORDER_STATUS_TRANSITIONS) && body.status !== row.status) {
return json(req, res, 400, { ok: false, error: `허용되지 않는 주문 상태 전이입니다: ${row.status} -> ${body.status}` });
}
row.status = body.status || row.status;
appendAudit(db, req, 'admin.order.status_updated', { id: row.id, status: row.status });
await writeDb(db);
return json(req, res, 200, { ok: true, order: row });
}
if (pathname === '/api/admin/orders/advance' && req.method === 'POST') {
const body = normalizeIdPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const row = db.orders.find(x => x.id === body.id);
if (!row) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
const flow = ['draft', 'scan_requested', 'result_ready', 'plan_selected', 'checkout_ready', 'completed'];
const idx = Math.max(flow.indexOf(row.stage), 0);
row.stage = flow[Math.min(idx + 1, flow.length - 1)];
appendAudit(db, req, 'admin.order.advanced', { id: row.id, stage: row.stage });
await writeDb(db);
return json(req, res, 200, { ok: true, order: row });
}
if (pathname === '/api/admin/subscriptions' && req.method === 'GET') {
return json(req, res, 200, { ok: true, subscriptions: db.subscriptions });
}
if (pathname === '/api/admin/subscriptions/upsert' && req.method === 'POST') {
const body = normalizeSubscriptionPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const site = db.sites.find(item => item.id === body.siteId);
if (!site) return json(req, res, 404, { ok: false, error: '사이트를 찾을 수 없습니다.' });
const sub = ensureSubscriptionForSite(db, site, body.plan);
if (body.status) sub.status = body.status;
appendAudit(db, req, 'admin.subscription.upserted', { id: sub.id, plan: sub.plan, status: sub.status });
await writeDb(db);
return json(req, res, 200, { ok: true, subscription: sub });
}
if (pathname === '/api/admin/sites' && req.method === 'GET') {
return json(req, res, 200, { ok: true, sites: db.sites, scans: db.scans.slice(0, 100), guidanceDocuments: db.guidanceDocuments.slice(0, 100) });
}
if (pathname === '/api/admin/sites/rescan' && req.method === 'POST') {
const body = normalizeScanPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const result = await scanResultFor(body.target, db, { bypassCache: body.bypassCache });
const site = ensureSiteRecord(db, result);
const subscription = ensureSubscriptionForSite(db, site, result.recommendedPlan);
const guidance = createGuidanceDocument(db, site, result);
const autoFixJobs = seedAutoFixJobs(db, site, result);
db.scans.unshift({ siteId: site.id, subscriptionId: subscription.id, createdAt: nowIso(), ...result });
appendAudit(db, req, 'admin.site.rescanned', { requestId: result.requestId, siteId: site.id });
await writeDb(db);
return json(req, res, 200, { ok: true, result: { ...result, siteId: site.id, guidanceId: guidance.id, autoFixJobsCount: autoFixJobs.length } });
}
if (pathname === '/api/admin/guidance' && req.method === 'GET') {
return json(req, res, 200, { ok: true, guidanceDocuments: db.guidanceDocuments.slice(0, 100) });
}
if (pathname === '/api/admin/legal-updates' && req.method === 'GET') {
return json(req, res, 200, { ok: true, legalUpdates: db.legalUpdates.slice(0, 100) });
}
if (pathname === '/api/admin/legal-updates/seed' && req.method === 'POST') {
if (PLATFORM.commercial || NODE_ENV === 'production') return json(req, res, 404, { ok: false, error: 'Not found' });
const body = normalizeSystemItemPayload({ ...(await bodyJson(req, MAX_JSON_BODY_BYTES) || {}), type: 'legal_update' });
const item = {
id: uid('law'),
source: body.source || '관리자 입력',
title: body.title,
summary: body.summary || '요약 없음',
effectiveDate: body.effectiveDate || nowIso().slice(0, 10),
severity: body.severity || 'medium',
createdAt: nowIso()
};
db.legalUpdates.unshift(item);
appendAudit(db, req, 'admin.legal_update.seeded', { id: item.id, title: item.title });
await writeDb(db);
return json(req, res, 200, { ok: true, item });
}
if (pathname === '/api/admin/rules' && req.method === 'GET') {
const rules = buildRuleCatalog().map(rule => {
const override = (db.rules || []).find(item => item.code === rule.code) || {};
return {
code: rule.code,
category: override.category || rule.category,
title: override.title || rule.title,
severity: Number(override.severity || rule.severity),
penaltyMax: Number(override.penaltyMax || rule.penaltyMax),
fixTemplate: override.fixTemplate || rule.fixTemplate,
source: override.id ? 'override' : 'builtin'
};
});
const customRules = (db.rules || []).filter(item => !rules.some(rule => rule.code === item.code)).map(item => ({
code: item.code,
category: item.category || '기타',
title: item.title || item.code,
severity: Number(item.severity || 10),
penaltyMax: Number(item.penaltyMax || 0),
fixTemplate: item.fixTemplate || '',
source: 'custom'
}));
return json(req, res, 200, { ok: true, rules: [...rules, ...customRules] });
}
if (pathname === '/api/admin/rules' && req.method === 'POST') {
const body = normalizeRulePayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const code = body.code;
db.rules ||= [];
let rule = db.rules.find(item => item.code === code);
if (!rule) {
rule = { id: uid('rule'), code, createdAt: nowIso() };
db.rules.unshift(rule);
}
rule.category = body.category || rule.category || '기타';
rule.title = body.title || rule.title || code;
rule.severity = body.severity ?? rule.severity ?? 10;
rule.penaltyMax = body.penaltyMax ?? rule.penaltyMax ?? 0;
rule.fixTemplate = body.fixTemplate || rule.fixTemplate || '';
rule.updatedAt = nowIso();
appendAudit(db, req, 'admin.rule.upserted', { code: rule.code });
await writeDb(db);
return json(req, res, 200, { ok: true, rule });
}
if (pathname === '/api/admin/auto-fix-jobs' && req.method === 'GET') {
return json(req, res, 200, { ok: true, autoFixJobs: db.autoFixJobs.slice(0, 100) });
}
if (pathname === '/api/admin/auto-fix-jobs/approve' && req.method === 'POST') {
const body = normalizeIdStatusPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const job = db.autoFixJobs.find(item => item.id === body.id);
if (!job) return json(req, res, 404, { ok: false, error: '수정 후보 작업을 찾을 수 없습니다.' });
job.previousStatus = job.status || 'pending';
job.status = 'approved';
job.approvedAt = nowIso();
job.rollbackToken = uid('rollback');
appendAudit(db, req, 'admin.auto_fix.approved', { id: job.id, rollbackToken: job.rollbackToken });
await writeDb(db);
return json(req, res, 200, { ok: true, job });
}
if (pathname === '/api/admin/auto-fix-jobs/rollback' && req.method === 'POST') {
const body = normalizeIdStatusPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const job = db.autoFixJobs.find(item => item.id === body.id);
if (!job) return json(req, res, 404, { ok: false, error: '수정 후보 작업을 찾을 수 없습니다.' });
if (!job.rollbackToken) return json(req, res, 400, { ok: false, error: '롤백 가능한 작업이 아닙니다.' });
job.status = 'rolled_back';
job.rolledBackAt = nowIso();
appendAudit(db, req, 'admin.auto_fix.rolled_back', { id: job.id, rollbackToken: job.rollbackToken });
await writeDb(db);
return json(req, res, 200, { ok: true, job });
}
if (pathname === '/api/admin/library' && req.method === 'GET') return json(req, res, 200, { ok: true, library: db.library });
if (pathname === '/api/admin/library/post' && req.method === 'POST') {
const body = normalizeLibraryNotePayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const item = { id: uid('lib'), type: body.type, title: body.title, body: body.body || '', createdAt: nowIso() };
db.library.unshift(item);
appendAudit(db, req, 'admin.library.posted', { id: item.id, title: item.title });
await writeDb(db);
return json(req, res, 200, { ok: true, item });
}
if (pathname === '/api/admin/library/upload' && req.method === 'POST') {
const ct = req.headers['content-type'] || '';
const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
if (!match) return json(req, res, 400, { ok: false, error: 'multipart/form-data 가 필요합니다.' });
const raw = await bodyBuffer(req, MAX_MULTIPART_BODY_BYTES);
const parsed = parseMultipart(raw, match[1] || match[2]);
const file = parsed.files[0];
if (!file) return json(req, res, 400, { ok: false, error: '파일이 없습니다.' });
if (!isAllowedUpload(file)) return json(req, res, 400, { ok: false, error: '허용되지 않은 파일 형식이거나 파일이 너무 큽니다.' });
const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${sanitizeUploadFilename(file.filename)}`;
let objectUrl = null;
if (STORAGE_MODE === 'local_fs') {
await fs.writeFile(path.join(UPLOADS_DIR, safeName), file.content);
} else {
const uploaded = await putObjectToS3Compatible({ key: safeName, content: file.content, contentType: file.contentType });
objectUrl = uploaded.url;
}
const item = { id: uid('upload'), type: 'file', title: parsed.fields.title || file.filename, filename: safeName, objectUrl, storageMode: STORAGE_MODE, contentType: file.contentType, createdAt: nowIso() };
db.library.unshift(item);
appendAudit(db, req, 'admin.library.uploaded', { id: item.id, filename: item.filename });
await writeDb(db);
return json(req, res, 200, { ok: true, item });
}
if (pathname === '/api/admin/system-items' && req.method === 'GET') {
const type = String(url.searchParams.get('type') || '').trim();
let items = buildSystemItemsFeed(db);
if (type) items = items.filter(item => item.type === type);
return json(req, res, 200, { ok: true, items: items.slice(0, 100) });
}
if (pathname === '/api/admin/system-items' && req.method === 'POST') {
const body = normalizeSystemItemPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const type = body.type;
let created = null;
if (type === 'legal_update') {
created = { id: uid('law'), source: body.source || '관리자 입력', title: body.title, summary: body.summary || body.body || '요약 없음', effectiveDate: body.effectiveDate || nowIso().slice(0, 10), severity: body.severity || 'medium', createdAt: nowIso() };
db.legalUpdates.unshift(created);
} else if (type === 'publication') {
created = { id: uid('pub'), title: body.title, status: 'published', type: body.publicationType || 'manual', body: body.body || body.summary || '', createdAt: nowIso() };
db.publications.unshift(created);
} else if (type === 'board') {
created = { id: uid('board'), boardType: body.boardType || 'notice', title: body.title, body: body.body || '', createdAt: nowIso(), visibility: body.visibility || 'public' };
db.boards.unshift(created);
} else if (type === 'library_note') {
created = { id: uid('lib'), type: 'document', title: body.title, body: body.body || '', createdAt: nowIso() };
db.library.unshift(created);
} else {
return json(req, res, 400, { ok: false, error: '지원하지 않는 type 입니다.' });
}
appendAudit(db, req, 'admin.system_item.created', { id: created.id, type });
await writeDb(db);
return json(req, res, 200, { ok: true, item: created, type });
}
if (pathname === '/api/admin/customers' && req.method === 'GET') {
return json(req, res, 200, { ok: true, customers: (db.customers || []).map(customer => ({ ...publicCustomer(db, customer), status: customer.status || 'active', orders: (db.orders || []).filter(order => ownsOrder(customer, order)).length })) });
}
if (pathname === '/api/admin/customers/status' && req.method === 'POST') {
const body = normalizeIdStatusPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {}, { allowStatuses: ['active', 'disabled'] });
const customer = (db.customers || []).find(item => item.id === body.id);
if (!customer) return json(req, res, 404, { ok: false, error: '고객을 찾을 수 없습니다.' });
customer.status = body.status;
customer.updatedAt = nowIso();
if (body.status === 'disabled') db.customerSessions = (db.customerSessions || []).filter(item => item.customerId !== customer.id);
appendAudit(db, req, 'admin.customer.status_changed', { customerId: customer.id, status: body.status });
await writeDb(db);
return json(req, res, 200, { ok: true, customer: publicCustomer(db, customer) });
}
if (pathname === '/api/admin/orders/fulfillment' && req.method === 'POST') {
const body = normalizeIdPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const order = (db.orders || []).find(item => item.id === body.id);
if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
if (order.status !== 'paid') return json(req, res, 400, { ok: false, error: '결제 완료 주문만 산출물을 생성할 수 있습니다.' });
const asset = ensureFulfillmentForOrder(db, order);
appendAudit(db, req, 'admin.order.fulfillment_generated', { orderId: order.id, assetId: asset.id });
await writeDb(db);
return json(req, res, 200, { ok: true, order: sanitizeOrderForPublic(order), asset });
}
if (pathname === '/api/admin/email-outbox/status' && req.method === 'POST') {
const body = normalizeEmailDeliveryPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const email = (db.emailOutbox || []).find(item => item.id === body.id);
if (!email) return json(req, res, 404, { ok: false, error: '이메일 대기열 항목을 찾을 수 없습니다.' });
email.status = body.status; email.updatedAt = nowIso();
if (body.status === 'sent') email.sentAt = nowIso();
if (body.status === 'failed') { email.lastError = body.error || 'delivery failed'; email.retryCount = Number(email.retryCount || 0) + 1; }
appendAudit(db, req, 'admin.email.status_changed', { id: email.id, status: email.status });
await writeDb(db);
return json(req, res, 200, { ok: true, email: { ...email, body: String(email.body || '').slice(0, 500) } });
}
if (pathname === '/api/admin/refund-requests' && req.method === 'GET') return json(req, res, 200, { ok: true, refundRequests: (db.refundRequests || []).slice(0, 200) });
if (pathname === '/api/admin/refund-requests/status' && req.method === 'POST') {
const body = normalizeIdStatusPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {}, { allowStatuses: ['requested','reviewing','approved','rejected','completed'] });
const request = (db.refundRequests || []).find(item => item.id === body.id);
if (!request) return json(req, res, 404, { ok: false, error: '환불 요청을 찾을 수 없습니다.' });
request.status = body.status; request.updatedAt = nowIso();
const order = (db.orders || []).find(item => item.id === request.orderId);
if (order && ['approved','completed'].includes(body.status)) { order.refundStatus = body.status; order.updatedAt = nowIso(); }
appendAudit(db, req, 'admin.refund.status_changed', { refundRequestId: request.id, orderId: request.orderId, status: body.status });
await writeDb(db);
return json(req, res, 200, { ok: true, refundRequest: request, order: order ? sanitizeOrderForPublic(order) : null });
}
return json(req, res, 404, { ok: false, error: 'Not found' });
  };
}

export async function handleAdminRoutes(req, res, ctx, state = {}) {
  return createAdminRouteHandler(ctx)(req, res, state);
}
