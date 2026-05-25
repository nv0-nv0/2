// Phase166 ops route split for the native http.createServer dispatcher.
// The admin dispatcher performs IP, session, CSRF, and RBAC gate setup before calling this handler.
export function createOpsRouteHandler(ctx) {
  const {
  ADMIN_AUTH_LIMIT,
  ADMIN_AUTH_MODE,
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
  PORTONE_CLIENT,
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
  backupSecurityConfigSummary,
  bodyBuffer,
  bodyJson,
  buildCommercialFinalGate,
  buildHardeningMatrix,
  buildOpsReport,
  buildProductionLaunchChecklist,
  buildReleaseReadiness,
  buildRuleCatalog,
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
  const opsPrefixes = [
    '/api/admin/diagnostics',
    '/api/admin/ops-report',
    '/api/admin/maintenance/',
    '/api/admin/backups',
    '/api/admin/release-readiness',
    '/api/admin/hardening-matrix',
    '/api/admin/launch-checklist',
    '/api/admin/commercial-final-gate',
    '/api/admin/email-outbox',
    '/api/admin/ops'
  ];
  return async function handleOpsRoutes(req, res, state = {}) {
    const routeState = state.requestUrl ? state : req._nv0RouteState;
    if (!routeState || !routeState.requestUrl) return false;
    const url = routeState.requestUrl;
    const pathname = routeState.pathname;
    if (!opsPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix))) return false;
    const session = state.session;
    const db = state.db || await readDb();
if (pathname === '/api/admin/diagnostics' && req.method === 'GET') {
return json(req, res, 200, {
ok: true,
runtime: {
pid: process.pid,
uptimeSec: Math.round(process.uptime()),
memoryRss: process.memoryUsage().rss,
env: NODE_ENV,
turnstileEnabled: TURNSTILE_PUBLIC_ENABLED,
turnstileConfigured: TURNSTILE_CONFIGURED,
trustProxyHeaders: TRUST_PROXY_HEADERS,
csrfProtection: true,
backupRetentionCount: BACKUP_RETENTION_COUNT,
auditLogRetentionCount: AUDIT_LOG_RETENTION_COUNT,
storageMode: STORAGE_MODE,
backupRemoteEnabled: BACKUP_REMOTE_ENABLED,
autoBackupEnabled: AUTO_BACKUP_ENABLED,
backupEncryptionConfigured: !!BACKUP_ENCRYPTION_SECRET,
scanProvider: SCAN_PROVIDER,
paymentProvider: PAYMENT_PROVIDER,
deploymentStage: DEPLOYMENT_STAGE,
commercialLaunchReady: COMMERCIAL_LAUNCH_READY
},
storage: { uploadsDir: UPLOADS_DIR, runtimeDir: RUNTIME_DIR, backupsDir: BACKUPS_DIR, reportsDir: REPORTS_DIR },
integrations: {
scanProvider: { mode: SCAN_PROVIDER, urlConfigured: !!SCAN_PROVIDER_URL, fallbackEnabled: SCAN_PROVIDER_FALLBACK },
paymentProvider: PAYMENT_PROVIDER === 'portone_v2' ? { mode: PAYMENT_PROVIDER, ...PORTONE_CLIENT.configSummary() } : { mode: PAYMENT_PROVIDER, urlConfigured: !!PAYMENT_PROVIDER_URL },
storage: { mode: STORAGE_MODE, uploadsDir: UPLOADS_DIR, remoteBackup: backupSecurityConfigSummary() },
email: { smtpConfigured: !!String(process.env.NV0_SMTP_URL || '').trim(), liveAdapter: true, maxRetryCount: EMAIL_MAX_RETRY_COUNT, retryBackoffMs: EMAIL_RETRY_BACKOFF_MS }
},
readiness: buildReleaseReadiness(db),
launchChecklist: buildProductionLaunchChecklist(db),
emailOutbox: {
queued: (db.emailOutbox || []).filter(item => ['queued','retry_scheduled'].includes(item.status)).length,
failed: (db.emailOutbox || []).filter(item => item.status === 'failed').length,
recent: (db.emailOutbox || []).slice(0, 10).map(item => ({ id: item.id, to: maskEmail(item.to), subject: item.subject, status: item.status, retryCount: item.retryCount, deliveryMode: item.deliveryMode || null, createdAt: item.createdAt }))
},
recentOperationalEvents: (db.operationalEvents || []).slice(0, 10),
recentAuditLogs: db.auditLogs.slice(0, 10),
recentScans: db.scans.slice(0, 5),
pendingAutoFixJobs: db.autoFixJobs.filter(item => item.status === 'pending').slice(0, 10)
});
}
if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
return json(req, res, 200, { ok: true, auditLogs: db.auditLogs.slice(0, 100) });
}
if (pathname === '/api/admin/ops-report' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const report = await buildOpsReport();
return json(req, res, 200, { ok: true, report });
}
if (pathname === '/api/admin/ops-report/run' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const snapshot = await writeOpsReportSnapshot();
const reloaded = await readDb();
const audit = appendAudit(reloaded, req, 'admin.ops_report.created', { filePath: snapshot.filePath });
await writeDb(reloaded);
return json(req, res, 200, { ok: true, snapshot: { filePath: snapshot.filePath }, audit, report: snapshot.report });
}
if (pathname === '/api/admin/maintenance/prune' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const pruned = await pruneBackupSnapshots();
const reloaded = await readDb();
const dataRetention = cleanupDataRetention(reloaded, { dryRun: false });
const audit = appendAudit(reloaded, req, 'admin.maintenance.pruned', { pruned, dataRetention });
await writeDb(reloaded);
return json(req, res, 200, { ok: true, pruned, dataRetention, audit });
}
if (pathname === '/api/admin/backups' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
const backups = await listBackupSnapshots();
return json(req, res, 200, { ok: true, backups });
}
if (pathname === '/api/admin/backups/restore' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const body = { name: asTrimmedString((await bodyJson(req, MAX_JSON_BODY_BYTES) || {}).name, { field: 'name', required: true, max: 255 }) };
const restored = await restoreBackupSnapshot(body.name);
const reloaded = await readDb();
const audit = appendAudit(reloaded, req, 'admin.backup.restored', { name: body.name, ...restored });
await writeDb(reloaded);
return json(req, res, 200, { ok: true, restored, audit });
}
if (pathname === '/api/admin/backups/run' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const backup = await createBackupSnapshot({ reason: 'admin_api' });
const audit = appendAudit(db, req, 'admin.backup.created', { ...backup, remote: backup.remote });
await writeDb(db);
return json(req, res, 200, { ok: true, backup, audit });
}

if (pathname === '/api/admin/release-readiness' && req.method === 'GET') return json(req, res, 200, { ok: true, readiness: buildReleaseReadiness(db), operationalEvents: (db.operationalEvents || []).slice(0, 100) });
if (pathname === '/api/admin/hardening-matrix' && req.method === 'GET') {
if (!requireAdminPermission(req, res, session, 'ops.read')) return;
return json(req, res, 200, buildHardeningMatrix(db));
}
if (pathname === '/api/admin/launch-checklist' && req.method === 'GET') {
const checklist = buildProductionLaunchChecklist(db);
appendAudit(db, req, 'admin.launch_checklist.viewed', { ok: checklist.ok, blockers: checklist.blockers.map(item => item.key) });
await writeDb(db);
return json(req, res, checklist.ok ? 200 : 503, { ok: checklist.ok, checklist });
}
if (pathname === '/api/admin/commercial-final-gate' && req.method === 'GET') {
const gate = buildCommercialFinalGate(db);
appendAudit(db, req, 'admin.commercial_final_gate.viewed', { ok: gate.ok, blockers: gate.blockers.map(item => item.key) });
await writeDb(db);
return json(req, res, gate.ok ? 200 : 503, { ok: gate.ok, gate });
}
if (pathname === '/api/admin/email-outbox' && req.method === 'GET') {
return json(req, res, 200, { ok: true, outbox: (db.emailOutbox || []).map(item => ({ ...item, to: maskEmail(item.to) })).slice(0, 200) });
}
if (pathname === '/api/admin/email-outbox/process' && req.method === 'POST') {
const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
const result = await processEmailOutbox(db, { dryRun: body.dryRun !== false, limit: Math.min(Number(body.limit || 20), 100) });
appendAudit(db, req, 'admin.email_outbox.processed', { processed: result.processed, dryRun: body.dryRun !== false });
await writeDb(db);
return json(req, res, 200, result);
}
if (pathname === '/api/admin/ops/self-test' && req.method === 'POST') {
const readiness = buildReleaseReadiness(db);
const emailProbe = enqueueTransactionalEmail(db, { to: OPERATOR_ALERT_EMAIL, template: 'ops_self_test', subject: '[NV0] 운영 자가 점검', body: '운영 자가 점검 메일 처리 테스트입니다.' });
appendAudit(db, req, 'admin.ops.self_test', { ready: readiness.ready, emailProbeId: emailProbe.id });
await writeDb(db);
return json(req, res, 200, { ok: true, readiness, probes: { emailOutboxId: emailProbe.id, dbWritable: true, runtime: 'ok' } });
}
if (pathname === '/api/admin/ops' && req.method === 'POST') {
if (!requireAdminPermission(req, res, session, 'ops.write')) return;
const body = normalizeOpsPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const action = body.action;
if (action === 'backup') {
const backup = await createBackupSnapshot({ reason: 'admin_ops' });
appendAudit(db, req, 'admin.ops.backup', { target: backup.dbTarget, remote: backup.remote });
await writeDb(db);
return json(req, res, 200, { ok: true, action, backup });
}
if (action === 'restore_latest') {
const backups = await listBackupSnapshots();
if (!backups.length) return json(req, res, 404, { ok: false, error: '복원할 보관본이 없습니다.' });
const restored = await restoreBackupSnapshot(backups[0].name);
const fresh = await readDb();
appendAudit(fresh, req, 'admin.ops.restore_latest', { name: backups[0].name });
await writeDb(fresh);
return json(req, res, 200, { ok: true, action, restored });
}
if (action === 'prune') {
const pruned = await pruneBackupSnapshots();
appendAudit(db, req, 'admin.ops.prune', pruned);
await writeDb(db);
return json(req, res, 200, { ok: true, action, pruned });
}
if (action === 'report') {
const report = await writeOpsReportSnapshot();
appendAudit(db, req, 'admin.ops.report', { filePath: report.filePath });
await writeDb(db);
return json(req, res, 200, { ok: true, action, report });
}
return json(req, res, 400, { ok: false, error: '지원하지 않는 action 입니다.' });
}

    return false;
  };
}

export async function handleOpsRoutes(req, res, ctx, state = {}) {
  return createOpsRouteHandler(ctx)(req, res, state);
}
