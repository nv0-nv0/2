import http from 'node:http';
import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { lookup } from 'node:dns/promises';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { assertCommercialRouteAllowed, createPlatformProfile } from './core/platform.mjs';
import { PAYMENT_SESSION_TRANSITIONS, ORDER_STATUS_TRANSITIONS, canTransition } from './core/payment-state-machine.mjs';
import { handleAccountRescan, customerRecentScans } from './core/account-rescan.mjs';
import { buildPublicDiagnosisPackage } from './core/diagnosis-report-package.mjs';
import { buildDemoIssueOverview, buildConversionUrgencyModel, buildSiteOperationsDocument } from './core/service-quality-220.mjs';
import { buildPremiumPurchasedAsset, buildPremiumAssetPdfLines } from './core/premium-asset-builder.mjs';
import { buildCtaBoardArticle, chooseCtaVariant, ctaTopicPacks, ctaCombinationStats, rewriteExistingCtaPublication, auditHumanFriendlyCtaArticle, ctaFingerprint } from './core/cta-publication.mjs';
import { buildProductIntelligence, annotateOffersWithIntelligence, buildProductDashboard } from './core/product-intelligence.mjs';
import { buildSmartProductOrchestration, buildSmartPublicSnapshot } from './core/smart-product-orchestrator.mjs';
import { discoverTargetAutomationLinks } from './core/free-auto-discovery.mjs';
import { buildEvidenceSummary, buildScoreModel } from './core/scan-evidence-model.mjs';
import { buildAutomationDisclosure, buildAutomatedActionPlan } from './core/free-auto-disclosure.mjs';
import { buildDiagnosisAccuracyProfile, buildAdminOperatingProfile } from './core/product-quality-engine.mjs';
import { createBackupOperations } from './core/backup-operations.mjs';
import { buildOpenApiSpec as buildOpenApiSpecFromContext, buildHardeningMatrix as buildHardeningMatrixFromContext } from './core/hardening-matrix.mjs';
import { authenticateAdminAccount, ensureAdminCollections, ensureBootstrapAdmin, getAdminPermissions, getAdminRoles } from './core/admin-auth.mjs';
import { hashPassword, verifyPassword } from './core/passwords.mjs';
import { createPersistenceManager } from './infrastructure/persistence/persistence.mjs';
import { createSessionStore } from './infrastructure/session/session-store.mjs';
import { createRateLimitStore } from './infrastructure/ratelimit/rate-limit-store.mjs';
import { createDistributedLock } from './infrastructure/lock/distributed-lock.mjs';
import { createPortOneV2Client, verifyPortOnePaymentAgainstOrder } from './infrastructure/payments/portone-v2.mjs';
import { sanitizeAuditPayload } from './infrastructure/security/secure-record-store.mjs';
import { PRIVACY_COMPLIANCE_GUARD_VERSION, privacyComplianceSummary, privacyHash, pseudonymizeIp, sanitizePrivacyPayload, prunePrivacyRetention } from './core/privacy-compliance-guard.mjs';
import { verifyPortOneWebhook } from './infrastructure/payments/portone-webhook-verify.mjs';
import { createPublicRouteHandler } from './routes/public.mjs';
import { createAdminRouteHandler } from './routes/admin.mjs';
import { validateRuntimeConfig } from './config/validation.mjs';
import { readEnvConfig } from './config/env.mjs';
import { createSecurityMiddleware } from './middleware/security.mjs';
import { resolveNativeRouteState } from './core/native-route-state.mjs';
import { buildWorkOrderPreview } from './core/work-order-generator.mjs';
import { validateCommercialEnv } from './bootstrap/commercial-env.mjs';
import { buildHealthDetails, classifyIncident } from './services/observability.mjs';
import { buildDeploymentRiskGuard, PHASE223_RISK_GUARD_VERSION } from './core/deployment-risk-guard.mjs';
import { timingSafeStringEqual, hasValidOrderAccessToken } from './core/access-token.mjs';
import { putObjectToS3Compatible } from './infrastructure/storage/s3-compatible.mjs';
import { PHASE229_PRICING_VERSION, buildPricingRecalculation } from './core/pricing-conversion-model.mjs';
import { buildCommercialOfferCatalog as buildSharedCommercialOfferCatalog, buildPlanCatalog as buildSharedPlanCatalog, planPrice as sharedPlanPrice } from '../shared/product-catalog.mjs';
import { PHASE313_GOVERNANCE_VERSION, buildPhase313GovernanceSnapshot } from './core/phase313-operations-governance.mjs';
import { buildPublicColumnEnginePosts, publicColumnTypeLabel } from './core/public-column-engine.mjs';
import { PRODUCT_AGENT_SUITE_VERSION, publishProductInsightNow, publishProductInsightIfDue, ensureProductAgentSettings, latestProductInsightPublication, productInsightDueStatus, buildProductAgentRuntimeStatus, runProductAgentPackageAudit } from './core/product-agent-suite.mjs';
import { ENGINE_AGENT_ORCHESTRATOR_VERSION, buildEngineAgentRuntimeStatus, runEngineAgentPackageAudit } from './core/engine-agent-orchestrator.mjs';
import { PHASE287_COMMERCIAL_READINESS_VERSION, buildCommercialReadinessStatus, runPhase287CommercialAudit } from './core/commercial-readiness-287.mjs';
const COMMERCIAL_OFFER_COMPATIBILITY_MARKERS = ['전문가 리포트', 'IndustryGuide', 'Certified'];
const ENV_CONFIG = readEnvConfig(process.env);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
function externalDurableRuntimeMode(env = process.env) {
  const platformTarget = String(env.NV0_PLATFORM_TARGET || 'commercial').trim().toLowerCase();
  const persistenceMode = String(env.NV0_PERSISTENCE_MODE || (platformTarget === 'commercial' ? 'postgres_primary' : 'json')).trim().toLowerCase();
  const storageMode = String(env.NV0_STORAGE_MODE || (platformTarget === 'commercial' ? 's3' : 'local_fs')).trim().toLowerCase();
  return platformTarget === 'commercial' && persistenceMode === 'postgres_primary' && storageMode !== 'local_fs';
}
function persistentRuntimeRequired(env = process.env) {
  const value = String(env.NV0_REQUIRE_PERSISTENT_RUNTIME || 'auto').trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return !externalDurableRuntimeMode(env);
}
function isLegacyRuntimeDir(dir) {
  const normalized = path.resolve(dir || '/app/runtime');
  return normalized === '/app/runtime';
}
function shouldBypassLegacyRuntimeDir(env = process.env, requested) {
  return externalDurableRuntimeMode(env)
    && !persistentRuntimeRequired(env)
    && String(env.NV0_FORCE_RUNTIME_DIR || 'false').trim().toLowerCase() !== 'true'
    && isLegacyRuntimeDir(requested);
}
function runtimeVerbose(env = process.env) {
  return String(env.NV0_RUNTIME_VERBOSE || env.NV0_ENTRYPOINT_VERBOSE || 'false').trim().toLowerCase() === 'true';
}
function tryPrepareRuntimeDirSync(dir) {
  try {
    const reportsDir = path.join(dir, 'reports');
    fsSync.mkdirSync(path.join(dir, 'data'), { recursive: true });
    fsSync.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
    fsSync.mkdirSync(path.join(dir, 'backups'), { recursive: true });
    fsSync.mkdirSync(reportsDir, { recursive: true });
    const probe = path.join(reportsDir, `.runtime-probe-${process.pid}-${Date.now()}`);
    fsSync.writeFileSync(probe, 'ok', { mode: 0o600 });
    fsSync.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}
function resolveRuntimeDir(root, env = process.env) {
  const fallback = path.resolve(env.NV0_FALLBACK_RUNTIME_DIR || '/tmp/vr-runtime');
  const requested = path.resolve(env.NV0_RUNTIME_DIR || path.join(root, 'runtime'));
  const initial = shouldBypassLegacyRuntimeDir(env, requested) ? fallback : requested;
  if (tryPrepareRuntimeDirSync(initial)) {
    if (externalDurableRuntimeMode(env) && initial === fallback) {
      env.NV0_RUNTIME_DIR = fallback;
      env.NV0_RUNTIME_EPHEMERAL = 'true';
    }
    return initial;
  }
  if (externalDurableRuntimeMode(env)) {
    if (tryPrepareRuntimeDirSync(fallback)) {
      env.NV0_RUNTIME_DIR = fallback;
      env.NV0_RUNTIME_EPHEMERAL = 'true';
      if (runtimeVerbose(env) && initial !== fallback) {
        console.info(`VERIDION runtime: using ephemeral scratch runtime '${fallback}' because requested runtime '${initial}' is not writable and durable state is external.`);
      }
      return fallback;
    }
  }
  return initial;
}
const RUNTIME_DIR = resolveRuntimeDir(ROOT);
const DATA_DIR = path.join(RUNTIME_DIR, 'data');
const UPLOADS_DIR = path.join(RUNTIME_DIR, 'uploads');
const BACKUPS_DIR = path.join(RUNTIME_DIR, 'backups');
const REPORTS_DIR = path.join(RUNTIME_DIR, 'reports');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PUBLIC_DIR = path.join(ROOT, 'apps', 'public');
const ADMIN_DIR = path.join(ROOT, 'apps', 'admin');
const BUSINESS_PROFILE = Object.freeze({
tradeName: process.env.NV0_BUSINESS_TRADE_NAME || '엔브이제로(NV0)',
representative: process.env.NV0_BUSINESS_REPRESENTATIVE || '운영자',
registrationNumber: process.env.NV0_BUSINESS_REGISTRATION_NUMBER || '상용 배포 시 환경변수 입력',
address: process.env.NV0_BUSINESS_ADDRESS || '상용 배포 시 환경변수 입력',
businessTypes: ['정보통신업', '소프트웨어 개발 및 공급업', '전자상거래업', '데이터베이스 및 온라인 정보 제공업', '광고 대행업'],
contactEmail: process.env.NV0_SUPPORT_EMAIL || 'ct@nv0.kr',
domain: process.env.NV0_PUBLIC_BASE_URL || 'https://nv0.kr',
mailOrderRegistrationNumber: process.env.NV0_MAIL_ORDER_REGISTRATION_NUMBER || '',
hostingProvider: process.env.NV0_HOSTING_PROVIDER || '',
customerServicePhone: process.env.NV0_CUSTOMER_SERVICE_PHONE || '',
privacyOfficerEmail: process.env.NV0_PRIVACY_OFFICER_EMAIL || process.env.NV0_SUPPORT_EMAIL || 'ct@nv0.kr'
});
const PORT = ENV_CONFIG.port;
const HOST = ENV_CONFIG.host;
const NODE_ENV = ENV_CONFIG.nodeEnv;
const PLATFORM = createPlatformProfile(process.env);
const DEPLOYMENT_STAGE = String(process.env.NV0_DEPLOYMENT_STAGE || (PLATFORM.commercial ? 'prelaunch' : 'mvp')).trim().toLowerCase();
const COMMERCIAL_LAUNCH_READY = process.env.NV0_COMMERCIAL_LAUNCH_READY === 'true' || DEPLOYMENT_STAGE === 'commercial_launch';
const PRELAUNCH_MODE = PLATFORM.commercial && !COMMERCIAL_LAUNCH_READY;

function prelaunchPostgresFallbackAllowed(env = process.env) {
const explicit = String(env.NV0_POSTGRES_FALLBACK_MODE || env.NV0_PRELAUNCH_DB_FALLBACK || env.NV0_ALLOW_DB_FALLBACK || '').trim().toLowerCase();
if (['0', 'false', 'no', 'off', 'strict'].includes(explicit)) return false;
if (['1', 'true', 'yes', 'on', 'fallback'].includes(explicit)) return true;
return PRELAUNCH_MODE || !COMMERCIAL_LAUNCH_READY;
}
const ALLOW_PRELAUNCH_ONLINE_PAYMENT = process.env.NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT === 'true';
const TRUST_PROXY_HEADERS = ENV_CONFIG.trustProxyHeaders;
const ADMIN_KEY = process.env.NV0_ADMIN_KEY || ''; // legacy MVP-only shared key
const SESSION_TTL_MS = Number(process.env.NV0_ADMIN_SESSION_TTL_MS || 1000 * 60 * 60);
const MAX_JSON_BODY_BYTES = Number(process.env.NV0_MAX_JSON_BODY_BYTES || 64 * 1024);
const MAX_MULTIPART_BODY_BYTES = Number(process.env.NV0_MAX_MULTIPART_BODY_BYTES || 5 * 1024 * 1024);
const ENABLE_TURNSTILE = process.env.NV0_ENABLE_TURNSTILE === 'true';
const TURNSTILE_SECRET = process.env.NV0_TURNSTILE_SECRET || '';
const TURNSTILE_SITE_KEY = process.env.NV0_TURNSTILE_SITE_KEY || '';
const TURNSTILE_CONFIGURED = ENABLE_TURNSTILE && !isPlaceholderConfigValue(TURNSTILE_SECRET) && !isPlaceholderConfigValue(TURNSTILE_SITE_KEY);
const TURNSTILE_PUBLIC_ENABLED = ENABLE_TURNSTILE && TURNSTILE_CONFIGURED;
const PUBLIC_SCAN_LIMIT = Number(process.env.NV0_PUBLIC_SCAN_LIMIT || 20);
const PUBLIC_SCAN_WINDOW_MS = Number(process.env.NV0_PUBLIC_SCAN_WINDOW_MS || 60_000);
const ADMIN_AUTH_LIMIT = Number(process.env.NV0_ADMIN_AUTH_LIMIT || 8);
const ADMIN_AUTH_WINDOW_MS = Number(process.env.NV0_ADMIN_AUTH_WINDOW_MS || 10 * 60_000);
const ALLOWED_ADMIN_ORIGINS = ENV_CONFIG.allowedAdminOrigins;
const BACKUP_RETENTION_COUNT = Number(process.env.NV0_BACKUP_RETENTION_COUNT || 20);
const BACKUP_REMOTE_ENABLED = process.env.NV0_BACKUP_REMOTE_ENABLED !== 'false' && ['s3','s3_compatible','object_storage'].includes(String(process.env.NV0_STORAGE_MODE || '').trim() || (PLATFORM.commercial ? 's3' : 'local_fs'));
const BACKUP_REMOTE_PREFIX = String(process.env.NV0_BACKUP_REMOTE_PREFIX || 'backups/nv0').trim().replace(/^\/+|\/+$/g, '') || 'backups/nv0';
const BACKUP_COMPRESS = process.env.NV0_BACKUP_COMPRESS !== 'false';
const BACKUP_ENCRYPTION_SECRET = String(process.env.NV0_BACKUP_ENCRYPTION_SECRET || '').trim();
const BACKUP_REMOTE_REQUIRE_ENCRYPTION = process.env.NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION === 'true';
const AUTO_BACKUP_ENABLED = process.env.NV0_AUTO_BACKUP_ENABLED === 'true' || (PLATFORM.commercial && process.env.NV0_AUTO_BACKUP_ENABLED !== 'false');
const AUTO_BACKUP_ON_STARTUP = process.env.NV0_AUTO_BACKUP_ON_STARTUP !== 'false';
const AUTO_BACKUP_INTERVAL_MS = Number(process.env.NV0_AUTO_BACKUP_INTERVAL_MS || 6 * 60 * 60_000);
const AUDIT_LOG_RETENTION_COUNT = Number(process.env.NV0_AUDIT_LOG_RETENTION_COUNT || 200);
const ADMIN_AUTH_MODE = process.env.NV0_ADMIN_AUTH_MODE || (PLATFORM.commercial ? 'account_rbac' : 'shared_key');
const STORAGE_MODE = process.env.NV0_STORAGE_MODE || (PLATFORM.commercial ? 's3' : 'local_fs');
const PERSISTENCE_MODE = process.env.NV0_PERSISTENCE_MODE || (PLATFORM.commercial ? 'postgres_primary' : 'json');
const DATABASE_URL = process.env.NV0_DATABASE_URL || '';
const SCAN_PROVIDER = process.env.NV0_SCAN_PROVIDER || 'builtin';
const SCAN_PROVIDER_URL = process.env.NV0_SCAN_PROVIDER_URL || '';
const SCAN_PROVIDER_TOKEN = process.env.NV0_SCAN_PROVIDER_TOKEN || '';
const SCAN_PROVIDER_FALLBACK = process.env.NV0_SCAN_PROVIDER_FALLBACK !== 'false' || PRELAUNCH_MODE || DEPLOYMENT_STAGE === 'prelaunch';
const TARGET_FETCH_ENABLED = process.env.NV0_TARGET_FETCH_ENABLED !== 'false';
const PAYMENT_PROVIDER = process.env.NV0_PAYMENT_PROVIDER || (PRELAUNCH_MODE ? 'disabled' : (PLATFORM.commercial ? 'portone_v2' : 'demo'));
const PAYMENT_PROVIDER_URL = process.env.NV0_PAYMENT_PROVIDER_URL || '';
const PAYMENT_PROVIDER_TOKEN = process.env.NV0_PAYMENT_PROVIDER_TOKEN || '';
const PAYMENT_REDIRECT_ALLOWED_HOSTS = String(process.env.NV0_PAYMENT_REDIRECT_ALLOWED_HOSTS || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
const PORTONE_CLIENT = createPortOneV2Client(process.env);
const PORTONE_WEBHOOK_SECRET = process.env.NV0_PORTONE_WEBHOOK_SECRET || '';
const PORTONE_WEBHOOK_VERIFY_MODE = process.env.NV0_PORTONE_WEBHOOK_VERIFY_MODE || (PLATFORM.target === 'commercial' || NODE_ENV === 'production' ? 'strict' : 'optional');
const RULES_VERSION = process.env.NV0_RULES_VERSION || '2026.05.02-phase164-zero-cost-hardening-50';
const SCAN_CACHE_TTL_MS = Number(process.env.NV0_SCAN_CACHE_TTL_MS || 10 * 60_000);
const TARGET_FETCH_TIMEOUT_MS = Number(process.env.NV0_TARGET_FETCH_TIMEOUT_MS || 3000);
const TARGET_FETCH_MAX_BYTES = Math.max(32 * 1024, Math.min(1_048_576, Number(process.env.NV0_TARGET_FETCH_MAX_BYTES || 512 * 1024)));
const TARGET_FETCH_MAX_REDIRECTS = Math.max(0, Math.min(5, Number(process.env.NV0_TARGET_FETCH_MAX_REDIRECTS || 3)));
const SCAN_SOFT_TIMEOUT_MS = Math.max(2500, Math.min(15000, Number(process.env.NV0_SCAN_SOFT_TIMEOUT_MS || 6500)));
const TARGET_FETCH_MAX_PAGES = Math.max(4, Math.min(24, Number(process.env.NV0_TARGET_FETCH_MAX_PAGES || 12)));
const TARGET_FETCH_CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.NV0_TARGET_FETCH_CONCURRENCY || 4)));
const TARGET_FETCH_ROBOTS_ENABLED = process.env.NV0_TARGET_FETCH_ROBOTS_ENABLED !== 'false';
const TARGET_FETCH_SITEMAP_ENABLED = process.env.NV0_TARGET_FETCH_SITEMAP_ENABLED !== 'false';
const TARGET_FETCH_MAX_SITEMAP_URLS = Math.max(0, Math.min(80, Number(process.env.NV0_TARGET_FETCH_MAX_SITEMAP_URLS || 40)));
const TARGET_FETCH_MAX_DISCOVERY_RESOURCES = Math.max(1, Math.min(6, Number(process.env.NV0_TARGET_FETCH_MAX_DISCOVERY_RESOURCES || 4)));
const TARGET_FETCH_AUTOMATION_LEVEL = process.env.NV0_TARGET_FETCH_AUTOMATION_LEVEL || 'maximum_free_safe';
const CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS = 20 * 60_000;
function normalizeCtaAutopublishIntervalMs(_value, fallback = CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS) {
return fallback;
}
const CTA_AUTOPUBLISH_INTERVAL_MS = normalizeCtaAutopublishIntervalMs(process.env.NV0_CTA_AUTOPUBLISH_INTERVAL_MS, CTA_AUTOPUBLISH_DEFAULT_INTERVAL_MS);
const AI_REVIEW_PROVIDER = String(process.env.NV0_AI_REVIEW_PROVIDER || 'disabled').trim().toLowerCase();
const GEMINI_API_KEY = String(process.env.NV0_GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.NV0_GEMINI_MODEL || 'gemini-2.5-flash').trim();
const AI_REVIEW_ENABLED = AI_REVIEW_PROVIDER === 'gemini' && !!GEMINI_API_KEY;
const RELEASE_PHASE = 'commercial-final-phase180-quality-performance-functionality-max-phase181-zero-blocker-closeout';
const LEGAL_EVIDENCE_VERSION = process.env.NV0_LEGAL_EVIDENCE_VERSION || 'phase313-legal-evidence-v1';
const PRIVACY_POLICY_VERSION = process.env.NV0_PRIVACY_POLICY_VERSION || LEGAL_EVIDENCE_VERSION;
const TERMS_VERSION = process.env.NV0_TERMS_VERSION || LEGAL_EVIDENCE_VERSION;
const REFUND_POLICY_VERSION = process.env.NV0_REFUND_POLICY_VERSION || LEGAL_EVIDENCE_VERSION;
const DATA_RETENTION_DAYS = Number(process.env.NV0_DATA_RETENTION_DAYS || 1095);
const REFUND_REQUEST_WINDOW_DAYS = Number(process.env.NV0_REFUND_REQUEST_WINDOW_DAYS || 7);
const OPERATOR_ALERT_EMAIL = process.env.NV0_OPERATOR_ALERT_EMAIL || BUSINESS_PROFILE.contactEmail;
const PAYMENT_IDEMPOTENCY_TTL_MS = Number(process.env.NV0_PAYMENT_IDEMPOTENCY_TTL_MS || 24 * 60 * 60_000);
const EMAIL_MAX_RETRY_COUNT = Number(process.env.NV0_EMAIL_MAX_RETRY_COUNT || 5);
const EMAIL_RETRY_BACKOFF_MS = Number(process.env.NV0_EMAIL_RETRY_BACKOFF_MS || 5 * 60_000);
const ADMIN_IP_ALLOWLIST = ENV_CONFIG.adminIpAllowlist;
const PUBLIC_CACHE_SECONDS = ENV_CONFIG.publicCacheSeconds;
const PUBLIC_ASSET_CACHE_SECONDS = ENV_CONFIG.publicAssetCacheSeconds;
const SERVER_HEADER = 'nv0';
const ALLOWED_HOSTS = ENV_CONFIG.allowedHosts;
const REQUEST_TIMEOUT_MS = ENV_CONFIG.requestTimeoutMs;
const READYZ_REDIS_STRICT = process.env.NV0_READYZ_REDIS_STRICT === 'true' || COMMERCIAL_LAUNCH_READY;
const SLOW_REQUEST_THRESHOLD_MS = ENV_CONFIG.slowRequestThresholdMs;
const ACCESS_LOG_MODE = ENV_CONFIG.accessLogMode || 'normal';
const LOG_HEALTHCHECK_REQUESTS = Boolean(ENV_CONFIG.logHealthcheckRequests) || ACCESS_LOG_MODE === 'verbose';
const LOG_FAVICON_REQUESTS = Boolean(ENV_CONFIG.logFaviconRequests) || ACCESS_LOG_MODE === 'verbose';
const DATA_DESTRUCTION_GRACE_DAYS = Number(process.env.NV0_DATA_DESTRUCTION_GRACE_DAYS || 30);
const SECURITY_POSTURE_VERSION = 'phase164-hardening-matrix-v1';
const DEPLOYMENT_RISK_GUARD = buildDeploymentRiskGuard(process.env, { businessProfile: BUSINESS_PROFILE, publicBaseUrl: BUSINESS_PROFILE.domain });
if (String(process.env.NV0_DEPLOYMENT_RISK_STRICT || 'false').trim().toLowerCase() === 'true' && !DEPLOYMENT_RISK_GUARD.ok) {
throw new Error(`Deployment risk guard blocked startup: ${DEPLOYMENT_RISK_GUARD.blockers.map(item => item.key).join(', ')}`);
}
function assertFiniteConfigNumber(name, value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
if (!Number.isFinite(value) || value < min || value > max) {
throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
}
}
const sessions = new Map();
let sessionsDirty = false;
const sessionStore = createSessionStore(process.env, console);
const rateLimitStore = createRateLimitStore(process.env, console);
const distributedLock = createDistributedLock(process.env, console);
const nowIso = () => new Date().toISOString();
const backupOps = createBackupOperations({ dataDir: DATA_DIR, uploadsDir: UPLOADS_DIR, backupsDir: BACKUPS_DIR, env: process.env, nowIso, logger: console, defaultAutoEnabled: PLATFORM.commercial, dbSnapshotProvider: () => readDb() });
let defaultDb = {
settings: {
autoPublicationEnabled: true,
publicationChannel: 'internal-board',
supportEmail: BUSINESS_PROFILE.contactEmail,
defaultJurisdiction: 'KR',
businessProfile: BUSINESS_PROFILE,
defaultAlertChannel: 'email',
autoFixMode: 'approval_required',
operatorMode: PLATFORM.commercial ? 'multi_operator' : 'solo',
adminAuthMode: ADMIN_AUTH_MODE,
ctaAutopublishEnabled: true,
legalWatchEnabled: true,
maxAutoFixPerRun: 5,
scanProviderMode: SCAN_PROVIDER,
paymentProviderMode: PAYMENT_PROVIDER,
storageMode: STORAGE_MODE,
releasePhase: RELEASE_PHASE,
dataRetentionDays: DATA_RETENTION_DAYS,
refundRequestWindowDays: REFUND_REQUEST_WINDOW_DAYS,
operatorAlertEmail: OPERATOR_ALERT_EMAIL,
ctaAutopublishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS,
ctaTargetLengthKo: '4200-5200'
},
orders: [
{ id: 'ord-1001', customer: 'Acme Co', status: 'paid', stage: 'scan_requested', amount: 79000, createdAt: nowIso() },
{ id: 'ord-1002', customer: 'Beta Labs', status: 'pending', stage: 'draft', amount: sharedPlanPrice('Report'), createdAt: nowIso() }
],
subscriptions: [
{ id: 'sub-1001', siteId: 'site-seed-001', plan: 'Expert', status: 'active', monthlyPrice: sharedPlanPrice('Expert'), createdAt: nowIso() }
],
publications: [
{ id: 'pub-1001', title: '전자상거래 사이트 필수 고지 7가지', status: 'published', type: 'cta', createdAt: nowIso(), ctaType: 'free_scan' }
],
boards: [
{ id: 'board-1001', boardType: 'notice', title: 'NV0 서비스 공지', body: '서비스 안내 게시판입니다.', createdAt: nowIso(), visibility: 'public' }
],
library: [],
scans: [],
sites: [],
legalUpdates: [
{ id: 'law-1001', source: '공정위', title: '전자상거래 고지 점검 기준 업데이트', summary: '필수 고지 위치와 환불 고지 가독성 점검 항목을 재정리합니다.', effectiveDate: '2026-04-01', severity: 'medium', createdAt: nowIso() }
],
systemItems: [],
rules: [],
autoFixJobs: [],
guidanceDocuments: [],
paymentSessions: [],
paymentEvents: [],
webhookInbox: [],
customers: [],
customerSessions: [],
customerSiteLinks: [],
passwordResetTokens: [],
emailOutbox: [],
purchasedAssets: [],
adminUsers: [],
adminRoleBindings: [],
adminSessions: [],
auditLogs: [],
refundRequests: [],
operationalEvents: [],
idempotencyKeys: []
};
if (PLATFORM.commercial) {
defaultDb = {
...defaultDb,
orders: [],
subscriptions: [],
publications: [],
boards: [],
library: [],
scans: [],
sites: [],
legalUpdates: [],
systemItems: [],
rules: [],
autoFixJobs: [],
guidanceDocuments: [],
paymentSessions: [],
paymentEvents: [],
webhookInbox: [],
customers: [],
customerSessions: [],
customerSiteLinks: [],
passwordResetTokens: [],
emailOutbox: [],
purchasedAssets: [],
adminUsers: [],
adminRoleBindings: [],
adminSessions: [],
auditLogs: [],
refundRequests: [],
operationalEvents: [],
idempotencyKeys: []
};
}
function validateConfig() {
validateRuntimeConfig({
env: process.env,
platform: PLATFORM,
port: PORT,
nodeEnv: NODE_ENV,
deploymentStage: DEPLOYMENT_STAGE,
commercialLaunchReady: COMMERCIAL_LAUNCH_READY,
prelaunchMode: PRELAUNCH_MODE,
allowPrelaunchOnlinePayment: ALLOW_PRELAUNCH_ONLINE_PAYMENT,
adminAuthMode: ADMIN_AUTH_MODE,
persistenceMode: PERSISTENCE_MODE,
storageMode: STORAGE_MODE,
scanProvider: SCAN_PROVIDER,
paymentProvider: PAYMENT_PROVIDER,
databaseUrl: DATABASE_URL,
sessionTtlMs: SESSION_TTL_MS,
maxJsonBodyBytes: MAX_JSON_BODY_BYTES,
maxMultipartBodyBytes: MAX_MULTIPART_BODY_BYTES,
publicScanLimit: PUBLIC_SCAN_LIMIT,
publicScanWindowMs: PUBLIC_SCAN_WINDOW_MS,
adminAuthLimit: ADMIN_AUTH_LIMIT,
adminAuthWindowMs: ADMIN_AUTH_WINDOW_MS,
backupRetentionCount: BACKUP_RETENTION_COUNT,
autoBackupIntervalMs: AUTO_BACKUP_INTERVAL_MS,
auditLogRetentionCount: AUDIT_LOG_RETENTION_COUNT,
scanCacheTtlMs: SCAN_CACHE_TTL_MS,
ctaAutopublishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS,
publicCacheSeconds: PUBLIC_CACHE_SECONDS,
requestTimeoutMs: REQUEST_TIMEOUT_MS,
slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
accessLogMode: ACCESS_LOG_MODE,
dataDestructionGraceDays: DATA_DESTRUCTION_GRACE_DAYS,
businessProfile: BUSINESS_PROFILE,
operatorAlertEmail: OPERATOR_ALERT_EMAIL
});
assertFiniteConfigNumber('PORT', PORT, { min: 1, max: 65535 });
assertFiniteConfigNumber('NV0_ADMIN_SESSION_TTL_MS', SESSION_TTL_MS, { min: 60_000, max: 86_400_000 });
assertFiniteConfigNumber('NV0_MAX_JSON_BODY_BYTES', MAX_JSON_BODY_BYTES, { min: 1024, max: 1_048_576 });
assertFiniteConfigNumber('NV0_MAX_MULTIPART_BODY_BYTES', MAX_MULTIPART_BODY_BYTES, { min: 1024, max: 20_971_520 });
assertFiniteConfigNumber('NV0_PUBLIC_SCAN_LIMIT', PUBLIC_SCAN_LIMIT, { min: 1, max: 500 });
assertFiniteConfigNumber('NV0_PUBLIC_SCAN_WINDOW_MS', PUBLIC_SCAN_WINDOW_MS, { min: 1000, max: 3_600_000 });
assertFiniteConfigNumber('NV0_ADMIN_AUTH_LIMIT', ADMIN_AUTH_LIMIT, { min: 1, max: 100 });
assertFiniteConfigNumber('NV0_ADMIN_AUTH_WINDOW_MS', ADMIN_AUTH_WINDOW_MS, { min: 1000, max: 3_600_000 });
assertFiniteConfigNumber('NV0_BACKUP_RETENTION_COUNT', BACKUP_RETENTION_COUNT, { min: 1, max: 500 });
assertFiniteConfigNumber('NV0_AUTO_BACKUP_INTERVAL_MS', AUTO_BACKUP_INTERVAL_MS, { min: 300_000, max: 7 * 24 * 60 * 60_000 });
assertFiniteConfigNumber('NV0_AUDIT_LOG_RETENTION_COUNT', AUDIT_LOG_RETENTION_COUNT, { min: 1, max: 10000 });
assertFiniteConfigNumber('NV0_SCAN_CACHE_TTL_MS', SCAN_CACHE_TTL_MS, { min: 0, max: 86_400_000 });
assertFiniteConfigNumber('NV0_TARGET_FETCH_TIMEOUT_MS', TARGET_FETCH_TIMEOUT_MS, { min: 500, max: 30_000 });
assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_BYTES', TARGET_FETCH_MAX_BYTES, { min: 32 * 1024, max: 1_048_576 });
assertFiniteConfigNumber('NV0_TARGET_FETCH_MAX_REDIRECTS', TARGET_FETCH_MAX_REDIRECTS, { min: 0, max: 10 });
assertFiniteConfigNumber('NV0_CTA_AUTOPUBLISH_INTERVAL_MS', CTA_AUTOPUBLISH_INTERVAL_MS, { min: 60_000, max: 86_400_000 });
assertFiniteConfigNumber('NV0_PUBLIC_CACHE_SECONDS', PUBLIC_CACHE_SECONDS, { min: 0, max: 86_400 });
assertFiniteConfigNumber('NV0_REQUEST_TIMEOUT_MS', REQUEST_TIMEOUT_MS, { min: 1000, max: 120_000 });
assertFiniteConfigNumber('NV0_SLOW_REQUEST_THRESHOLD_MS', SLOW_REQUEST_THRESHOLD_MS, { min: 100, max: 60_000 });
assertFiniteConfigNumber('NV0_DATA_DESTRUCTION_GRACE_DAYS', DATA_DESTRUCTION_GRACE_DAYS, { min: 0, max: 3650 });
if (PLATFORM.commercial && ADMIN_AUTH_MODE === 'shared_key') {
throw new Error('NV0_ADMIN_AUTH_MODE=shared_key is not allowed in production. Use account_rbac.');
}
if (ENABLE_TURNSTILE && COMMERCIAL_LAUNCH_READY && !TURNSTILE_CONFIGURED) {
throw new Error('Real NV0_TURNSTILE_SECRET and NV0_TURNSTILE_SITE_KEY are required when commercial launch is ready.');
}
if (COMMERCIAL_LAUNCH_READY && !TURNSTILE_PUBLIC_ENABLED) {
throw new Error('Commercial launch requires Turnstile public protection: set NV0_ENABLE_TURNSTILE=true and real Turnstile keys.');
}
const commercialFailures = PLATFORM.requireCommercialControls();
if (commercialFailures.length) {
throw new Error(commercialFailures.join(' | '));
}
if (['dual_write', 'postgres_primary'].includes(PERSISTENCE_MODE) && !DATABASE_URL && !prelaunchPostgresFallbackAllowed(process.env)) {
throw new Error('NV0_DATABASE_URL is required when NV0_PERSISTENCE_MODE enables PostgreSQL.');
}
if (BACKUP_REMOTE_REQUIRE_ENCRYPTION && !BACKUP_ENCRYPTION_SECRET) {
throw new Error('NV0_BACKUP_ENCRYPTION_SECRET is required when NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true.');
}
if (PLATFORM.commercial && (!BACKUP_REMOTE_REQUIRE_ENCRYPTION || !BACKUP_ENCRYPTION_SECRET)) {
throw new Error('Commercial launch requires encrypted remote backups: set NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true and NV0_BACKUP_ENCRYPTION_SECRET.');
}
if (PLATFORM.commercial) {
if (PERSISTENCE_MODE !== 'postgres_primary') throw new Error('Commercial launch requires NV0_PERSISTENCE_MODE=postgres_primary.');
if (process.env.NV0_SESSION_STORE !== 'redis') throw new Error('Commercial launch requires NV0_SESSION_STORE=redis.');
if (process.env.NV0_RATE_LIMIT_STORE !== 'redis') throw new Error('Commercial launch requires NV0_RATE_LIMIT_STORE=redis.');
if (process.env.NV0_LOCK_PROVIDER !== 'redis') throw new Error('Commercial launch requires NV0_LOCK_PROVIDER=redis.');
if (!String(process.env.NV0_REDIS_URL || '').trim()) throw new Error('Commercial launch requires NV0_REDIS_URL.');
if (COMMERCIAL_LAUNCH_READY && PAYMENT_PROVIDER !== 'portone_v2') throw new Error('Commercial launch requires NV0_PAYMENT_PROVIDER=portone_v2.');
if (PRELAUNCH_MODE && PAYMENT_PROVIDER === 'portone_v2' && !ALLOW_PRELAUNCH_ONLINE_PAYMENT) throw new Error('Prelaunch mode blocks PortOne unless NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT=true or NV0_COMMERCIAL_LAUNCH_READY=true.');
if (SCAN_PROVIDER !== 'external_http') throw new Error('Commercial launch requires NV0_SCAN_PROVIDER=external_http.');
if (!SCAN_PROVIDER_URL) throw new Error('Commercial launch requires NV0_SCAN_PROVIDER_URL.');
if (!['s3','s3_compatible','object_storage'].includes(STORAGE_MODE)) throw new Error('Commercial launch requires object storage mode, not local_fs.');
for (const key of ['NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY']) {
if (!String(process.env[key] || '').trim()) throw new Error('Commercial launch requires object storage credentials.');
}
const commercialRequiredKeys = ['NV0_PUBLIC_BASE_URL','NV0_SUPPORT_EMAIL','NV0_HOSTING_PROVIDER','NV0_CUSTOMER_SERVICE_PHONE','NV0_PRIVACY_OFFICER_EMAIL','NV0_SMTP_URL','NV0_ADMIN_IP_ALLOWLIST'];
if (COMMERCIAL_LAUNCH_READY) commercialRequiredKeys.push('NV0_MAIL_ORDER_REGISTRATION_NUMBER');
for (const key of commercialRequiredKeys) {
const raw = String(process.env[key] || '').trim();
if (!raw || isPlaceholderConfigValue(raw)) throw new Error('Commercial/prelaunch deployment requires real ' + key + '.');
}
if (!/^https:\/\//.test(String(process.env.NV0_PUBLIC_BASE_URL || ''))) throw new Error('Commercial launch requires HTTPS NV0_PUBLIC_BASE_URL.');
if (!isValidEmail(BUSINESS_PROFILE.contactEmail)) throw new Error('Commercial launch requires valid NV0_SUPPORT_EMAIL.');
if (!isValidEmail(BUSINESS_PROFILE.privacyOfficerEmail)) throw new Error('Commercial launch requires valid NV0_PRIVACY_OFFICER_EMAIL.');
if (!isValidEmail(OPERATOR_ALERT_EMAIL)) throw new Error('Commercial launch requires valid NV0_OPERATOR_ALERT_EMAIL or NV0_SUPPORT_EMAIL.');
}
if (ADMIN_AUTH_MODE === 'account_rbac') {
if (!String(process.env.NV0_BOOTSTRAP_ADMIN_EMAIL || '').trim()) throw new Error('NV0_BOOTSTRAP_ADMIN_EMAIL is required when NV0_ADMIN_AUTH_MODE=account_rbac.');
if (!String(process.env.NV0_BOOTSTRAP_ADMIN_PASSWORD || '')) throw new Error('NV0_BOOTSTRAP_ADMIN_PASSWORD is required when NV0_ADMIN_AUTH_MODE=account_rbac.');
}
if (SCAN_PROVIDER === 'external_http' && !SCAN_PROVIDER_URL) {
throw new Error('NV0_SCAN_PROVIDER_URL is required when NV0_SCAN_PROVIDER=external_http.');
}
if (PAYMENT_PROVIDER === 'external_http' && !PAYMENT_PROVIDER_URL) {
throw new Error('NV0_PAYMENT_PROVIDER_URL is required when NV0_PAYMENT_PROVIDER=external_http.');
}
if (PAYMENT_PROVIDER === 'portone_v2' && !PORTONE_CLIENT.enabled) {
throw new Error('NV0_PORTONE_API_SECRET, NV0_PORTONE_STORE_ID, and NV0_PORTONE_CHANNEL_KEY are required when NV0_PAYMENT_PROVIDER=portone_v2.');
}
if (PAYMENT_PROVIDER === 'portone_v2' && PORTONE_WEBHOOK_VERIFY_MODE === 'strict' && !PORTONE_WEBHOOK_SECRET) {
throw new Error('NV0_PORTONE_WEBHOOK_SECRET is required when PortOne webhook verification is strict.');
}
}
async function ensureRuntime() {
await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(UPLOADS_DIR, { recursive: true });
await fs.mkdir(BACKUPS_DIR, { recursive: true });
await fs.mkdir(REPORTS_DIR, { recursive: true });
if (PERSISTENCE_MODE === 'postgres_primary' && PLATFORM.commercial) return;
const dbPath = path.join(DATA_DIR, 'db.json');
try {
await fs.access(dbPath);
} catch {
await fs.writeFile(dbPath, JSON.stringify(defaultDb, null, 2));
}
try {
await fs.access(SESSIONS_FILE);
} catch {
await fs.writeFile(SESSIONS_FILE, JSON.stringify([], null, 2));
}
}
const persistence = createPersistenceManager({
dataDir: DATA_DIR,
sessionsFile: SESSIONS_FILE,
defaultDb,
ensureRuntime,
ensureAdminCollections
});
function serializeSessions() {
return Array.from(sessions.entries()).map(([sid, session]) => ({ sid, ...session }));
}
async function writeSessionsToDisk() {
const rows = serializeSessions();
await sessionStore.prime(rows);
await persistence.writeSessions(rows);
sessionsDirty = false;
}
async function hydrateSessions() {
const rows = await persistence.readSessions();
const now = Date.now();
sessions.clear();
for (const row of Array.isArray(rows) ? rows : []) {
if (!row?.sid || !row?.expiresAt || row.expiresAt < now) continue;
sessions.set(row.sid, {
createdAt: Number(row.createdAt || now),
lastSeenAt: Number(row.lastSeenAt || now),
expiresAt: Number(row.expiresAt),
csrfToken: String(row.csrfToken || ''),
adminUserId: row.adminUserId ? String(row.adminUserId) : undefined,
email: row.email ? String(row.email) : undefined,
roles: Array.isArray(row.roles) ? row.roles : [],
permissions: Array.isArray(row.permissions) ? row.permissions : []
});
}
await sessionStore.prime(serializeSessions());
await writeSessionsToDisk();
}
function markSessionsDirty() {
sessionsDirty = true;
}
async function cleanupExpiredSessions() {
const now = Date.now();
let changed = false;
for (const [sid, session] of sessions.entries()) {
if (session.expiresAt < now) {
sessions.delete(sid);
await sessionStore.delete(sid);
changed = true;
}
}
if (changed) {
markSessionsDirty();
await writeSessionsToDisk();
}
}
async function readDb() {
return persistence.readDb();
}
async function writeDb(db) {
return persistence.writeDb(db);
}
function isSecureRequest(req) {
if (req.socket.encrypted) return true;
if (!TRUST_PROXY_HEADERS) return false;
return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
function baseHeaders(req, category = 'dynamic') {
const cspParts = [
"default-src 'self'",
"base-uri 'self'",
"frame-ancestors 'none'",
"form-action 'self'",
"img-src 'self' data: blob:",
"object-src 'none'",
`script-src 'self' https://cdn.portone.io https://*.portone.io${TURNSTILE_PUBLIC_ENABLED ? ' https://challenges.cloudflare.com' : ''}`,
"style-src 'self'",
`connect-src 'self' https://cdn.portone.io https://*.portone.io https://api.portone.io${TURNSTILE_PUBLIC_ENABLED ? ' https://challenges.cloudflare.com' : ''}`,
`frame-src https://cdn.portone.io https://*.portone.io${TURNSTILE_PUBLIC_ENABLED ? ' https://challenges.cloudflare.com' : ''}`
];
const headers = {
'x-content-type-options': 'nosniff',
'referrer-policy': 'strict-origin-when-cross-origin',
'x-frame-options': 'DENY',
'permissions-policy': 'geolocation=(), microphone=(), camera=()',
'cross-origin-opener-policy': 'same-origin',
'cross-origin-resource-policy': 'same-origin',
'origin-agent-cluster': '?1',
'x-permitted-cross-domain-policies': 'none',
'x-download-options': 'noopen',
'content-security-policy': cspParts.join('; '),
'content-security-policy-report-only': ["trusted-types vr-default", "require-trusted-types-for 'script'"].join('; ')
};
if (isSecureRequest(req)) {
headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains; preload';
}
if (category === 'dynamic') headers['cache-control'] = 'no-store';
if (category === 'public-page') headers['cache-control'] = PUBLIC_CACHE_SECONDS > 0 ? 'public, max-age=' + PUBLIC_CACHE_SECONDS + ', stale-while-revalidate=300' : 'no-cache, max-age=0, must-revalidate';
if (category === 'static') headers['cache-control'] = PUBLIC_ASSET_CACHE_SECONDS > 0 ? 'public, max-age=' + PUBLIC_ASSET_CACHE_SECONDS + ', stale-while-revalidate=86400' : 'no-cache, max-age=0, must-revalidate';
if (category === 'upload') headers['cache-control'] = 'private, max-age=300';
return headers;
}
function json(req, res, status, payload, extraHeaders = {}) {
res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...baseHeaders(req), ...extraHeaders });
res.end(JSON.stringify(payload, null, 2));
}
function text(req, res, status, payload, extraHeaders = {}) {
res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...baseHeaders(req), ...extraHeaders });
res.end(payload);
}
function noContent(req, res, status = 204, extraHeaders = {}, category = 'static') {
res.writeHead(status, { ...baseHeaders(req, category), ...extraHeaders });
res.end();
}
function buildSecurityTxt() {
const contact = BUSINESS_PROFILE.privacyOfficerEmail || BUSINESS_PROFILE.contactEmail || 'ct@nv0.kr';
const base = String(process.env.NV0_PUBLIC_BASE_URL || BUSINESS_PROFILE.domain || 'https://nv0.kr').replace(/\/+$/, '');
return [
  `Contact: mailto:${contact}`,
  `Policy: ${base}/privacy`,
  `Preferred-Languages: ko, en`,
  `Canonical: ${base}/.well-known/security.txt`,
  `Expires: ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}`
].join('\n') + '\n';
}
function shouldLogRequest(req, res, pathname, elapsedMs) {
const statusCode = Number(res.statusCode || 0);
if (ACCESS_LOG_MODE === 'verbose') return true;
if (statusCode >= 400) return true;
if (elapsedMs >= SLOW_REQUEST_THRESHOLD_MS) return true;
if (isHealthcheckPath(req) && !LOG_HEALTHCHECK_REQUESTS) return false;
if (pathname === '/favicon.ico' && statusCode === 204 && !LOG_FAVICON_REQUESTS) return false;
if (ACCESS_LOG_MODE === 'quiet' && statusCode < 400) return false;
return true;
}
function html(req, res, status, payload, extraHeaders = {}, category = 'public-page') {
res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...baseHeaders(req, category), ...extraHeaders });
res.end(payload);
}
function redirect(req, res, statusOrLocation, maybeLocation) {
const status = Number.isInteger(statusOrLocation) ? statusOrLocation : 302;
const location = Number.isInteger(statusOrLocation) ? maybeLocation : statusOrLocation;
res.writeHead(status, { location, ...baseHeaders(req) });
res.end();
}
function parseCookies(req) {
const raw = req.headers.cookie || '';
const out = {};
for (const part of raw.split(';')) {
const [key, ...rest] = part.trim().split('=');
if (!key) continue;
try { out[key] = decodeURIComponent(rest.join('=')); } catch { out[key] = rest.join('='); }
}
return out;
}
async function getSession(req) {
const sid = parseCookies(req).nv0_admin_sid;
if (!sid) return null;
let session = sessions.get(sid);
if (!session) {
session = await sessionStore.get(sid);
if (session) sessions.set(sid, session);
}
if (!session) return null;
if (session.expiresAt < Date.now()) {
sessions.delete(sid);
await sessionStore.delete(sid);
markSessionsDirty();
return null;
}
session.expiresAt = Date.now() + SESSION_TTL_MS;
session.lastSeenAt = Date.now();
sessions.set(sid, session);
await sessionStore.set(sid, session, Math.floor(SESSION_TTL_MS / 1000));
return { sid, ...session };
}
function normalizeHostValue(value = '') {
const raw=String(value||'').trim().toLowerCase();
if (!raw) return '';
try {
const candidate = raw.includes('://') ? raw : `https://${raw}`;
return new URL(candidate).host.toLowerCase();
} catch {
return raw.split('/')[0].toLowerCase();
}
}
function sameOriginAllowed(req) {
const host=normalizeHostValue(req.headers.host||'');
const acceptedHosts=new Set([host,...ALLOWED_ADMIN_ORIGINS.map(normalizeHostValue)].filter(Boolean));
const origin = String(req.headers.origin || '').trim();
const referer = String(req.headers.referer || '').trim();
const values = [origin, referer].filter(Boolean);
if (!values.length) return true;
for (const value of values) {
try {
const u = new URL(value);
if (acceptedHosts.has(u.host.toLowerCase())) return true;
} catch {}
}
return false;
}
function requireAdminCsrf(req, res, session) {
if (!sameOriginAllowed(req)) {
json(req, res, 403, { ok: false, error: '허용되지 않은 origin 입니다.' });
return false;
}
const csrf = String(req.headers['x-vr-csrf'] || req.headers['x-nv0-csrf'] || '');
if (!csrf || csrf !== session.csrfToken) {
json(req, res, 403, { ok: false, error: 'CSRF 검증에 실패했습니다.' });
return false;
}
return true;
}
function requireAdminPermission(req, res, session, permission) {
const permissions = new Set(session?.permissions || []);
if (permissions.has('*') || permissions.has(permission)) return true;
json(req, res, 403, { ok: false, error: '관리자 권한이 부족합니다.', requiredPermission: permission });
return false;
}
async function requireAdmin(req, res) {
const session = await getSession(req);
if (!session) {
redirect(req, res, '/admin');
return null;
}
return session;
}
async function bodyBuffer(req, limitBytes = MAX_JSON_BODY_BYTES) {
const chunks = [];
let total = 0;
for await (const chunk of req) {
total += chunk.length;
if (total > limitBytes) {
const err = new Error('PAYLOAD_TOO_LARGE');
err.code = 'PAYLOAD_TOO_LARGE';
throw err;
}
chunks.push(chunk);
}
return Buffer.concat(chunks);
}
async function bodyText(req, limitBytes = MAX_JSON_BODY_BYTES) {
const buffer = await bodyBuffer(req, limitBytes);
return buffer.toString('utf8');
}
async function bodyJson(req, limitBytes = MAX_JSON_BODY_BYTES) {
const raw = await bodyText(req, limitBytes);
try {
return raw ? JSON.parse(raw) : {};
} catch {
const err = new Error('INVALID_JSON');
err.code = 'INVALID_JSON';
throw err;
}
}
function uid(prefix = 'id') {
return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}
function clientIp(req) {
if (TRUST_PROXY_HEADERS) {
const value = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
if (value) return value;
}
return req.socket.remoteAddress || 'unknown';
}
function requestPathname(req) {
try {
return new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost')).pathname;
} catch {
return String(req.url || '/').split('?')[0] || '/';
}
}
function isHealthcheckPath(req) {
const pathname = requestPathname(req);
return pathname === '/healthz' || pathname === '/health' || pathname === '/livez' || pathname === '/readyz';
}
function requestHost(req) {
const rawHost = String(req.headers.host || 'localhost').trim().toLowerCase();
if (rawHost.startsWith('[')) return rawHost.slice(1).split(']')[0];
return rawHost.split(':')[0];
}
function isAllowedHost(req) {
if (isHealthcheckPath(req)) return true;
const host = requestHost(req);
if (!host) return false;
if (ALLOWED_HOSTS.includes(host)) return true;
if (NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return true;
return false;
}
function requestUrlFrom(req) {
const proto = isSecureRequest(req) ? 'https' : 'http';
const host = req.headers.host || 'localhost';
return new URL(req.url, (proto + '://' + host));
}
async function hitRateLimit(scope, key, { windowMs, limit }) {
return rateLimitStore.hit(scope, key, { windowMs, limit });
}
function sessionCookie(req, sid, maxAgeSec) {
const parts = [
`nv0_admin_sid=${sid}`,
'HttpOnly',
'Path=/',
'SameSite=Strict',
`Max-Age=${maxAgeSec}`
];
if (isSecureRequest(req) || NODE_ENV === 'production') parts.push('Secure');
return parts.join('; ');
}
function expiredSessionCookie(req) {
const parts = ['nv0_admin_sid=', 'HttpOnly', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
if (isSecureRequest(req) || NODE_ENV === 'production') parts.push('Secure');
return parts.join('; ');
}
function customerSessionCookie(req, sid, maxAgeSec) {
const parts = [`nv0_customer_sid=${sid}`, 'HttpOnly', 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
if (isSecureRequest(req) || NODE_ENV === 'production') parts.push('Secure');
return parts.join('; ');
}
function expiredCustomerSessionCookie(req) {
const parts = ['nv0_customer_sid=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
if (isSecureRequest(req) || NODE_ENV === 'production') parts.push('Secure');
return parts.join('; ');
}
function publicCustomer(db, customer) {
if (!customer) return null;
return { id: customer.id, email: customer.email, emailMasked: maskEmail(customer.email), createdAt: customer.createdAt || null, lastLoginAt: customer.lastLoginAt || null, privacyConsentAt: customer.privacyConsentAt || null, dataMinimizationVersion: customer.dataMinimizationVersion || PRIVACY_COMPLIANCE_GUARD_VERSION, marketingConsentAt: customer.marketingConsentAt || null, dataRetentionDays: DATA_RETENTION_DAYS };
}
function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function maskEmail(value) {
const email = normalizeEmail(value);
if (!email.includes('@')) return email ? '[masked]' : '';
const [local, domain] = email.split('@');
return local.slice(0, 2) + '*'.repeat(Math.max(2, local.length - 2)) + '@' + domain;
}
function maskSensitive(value) {
if (Array.isArray(value)) return value.map(maskSensitive);
if (value && typeof value === 'object') {
const out = {};
for (const [key, val] of Object.entries(value)) {
if (/email|buyerEmail|to/i.test(key)) out[key] = maskEmail(val);
else if (/token|password|secret|authorization|cookie|accessToken/i.test(key)) out[key] = '[redacted]';
else out[key] = maskSensitive(val);
}
return out;
}
return value;
}
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')); }
async function getCustomerSession(req, db = null) {
const sid = parseCookies(req).nv0_customer_sid;
if (!sid) return null;
const ownedDb = db || await readDb();
ownedDb.customerSessions ||= [];
ownedDb.customers ||= [];
const session = ownedDb.customerSessions.find(item => item.sid === sid);
if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
const customer = ownedDb.customers.find(item => item.id === session.customerId && item.status !== 'disabled');
if (!customer) return null;
session.lastSeenAt = nowIso();
return { sid, session, customer };
}
function ownsOrder(customer, order) { return !!customer && !!order && (order.customerId === customer.id || (order.email && normalizeEmail(order.email) === normalizeEmail(customer.email))); }
/**
 * Creates a per-order bearer token only when the order does not already have one.
 * The token gates portal, fulfillment, and refund access for guest checkout flows.
 */
function generateOrderAccessToken(order) { if (!order.accessToken) order.accessToken = crypto.randomBytes(18).toString('base64url'); return order.accessToken; }

/**
 * Authorizes a guest order request using the URL or header token.
 * The comparison is delegated to a Buffer-length-safe helper so malformed UTF-8
 * or multibyte input becomes a clean authorization miss, not a process error.
 */
function canAccessOrder(req, order) {
if (!order) return false;
const url = req._nv0Url || requestUrlFrom(req);
const token = String(url.searchParams.get('accessToken') || req.headers['x-vr-order-token'] || '').trim();
return hasValidOrderAccessToken(order, token);
}
function sanitizeOrderForPublic(order, { includeAccessToken = false } = {}) {
if (!order) return null;
const { accessToken, providerRaw, ...safe } = order;
if (includeAccessToken) safe.accessToken = generateOrderAccessToken(order);
return safe;
}
function enqueueTransactionalEmail(db, { to, subject, body, template, customerId = null, meta = {} }) {
db.emailOutbox ||= [];
const item = { id: uid('mail'), to, subject, body, template, customerId, meta: maskSensitive(meta), status: 'queued', retryCount: 0, lastError: null, createdAt: nowIso() };
db.emailOutbox.unshift(item);
db.emailOutbox = db.emailOutbox.slice(0, 1000);
return item;
}
function dueEmailItems(db, limit = 20) {
db.emailOutbox ||= [];
const now = Date.now();
return db.emailOutbox
.filter(item => ['queued','retry_scheduled'].includes(item.status))
.filter(item => !item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now)
.slice(0, limit);
}
function markEmailAttempt(item, { ok, error = null } = {}) {
item.lastAttemptAt = nowIso();
item.retryCount = Number(item.retryCount || 0) + 1;
if (ok) {
item.status = 'sent';
item.sentAt = nowIso();
item.lastError = null;
return item;
}
item.lastError = String(error || 'delivery_failed').slice(0, 500);
if (item.retryCount >= EMAIL_MAX_RETRY_COUNT) {
item.status = 'failed';
item.failedAt = nowIso();
} else {
item.status = 'retry_scheduled';
const delay = EMAIL_RETRY_BACKOFF_MS * Math.max(1, item.retryCount);
item.nextAttemptAt = new Date(Date.now() + delay).toISOString();
}
return item;
}
function stripHeaderValue(value = '') {
return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}
function normalizeMailRecipients(value) {
return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}
function parseSmtpUrl(rawUrl = '') {
const raw = String(rawUrl || '').trim();
if (!raw) return null;
const parsed = new URL(raw);
const protocol = parsed.protocol.replace(':', '').toLowerCase();
if (!['smtp', 'smtps'].includes(protocol)) throw new Error('NV0_SMTP_URL protocol must be smtp:// or smtps://');
const secure = protocol === 'smtps' || parsed.searchParams.get('secure') === 'true';
const port = Number(parsed.port || (secure ? 465 : 587));
const user = decodeURIComponent(parsed.username || '');
const pass = decodeURIComponent(parsed.password || '');
const from = parsed.searchParams.get('from') ? decodeURIComponent(parsed.searchParams.get('from')) : (process.env.NV0_EMAIL_FROM || user || BUSINESS_PROFILE.contactEmail);
return { host: parsed.hostname, port, secure, user, pass, from, starttls: parsed.searchParams.get('starttls') !== 'false', rejectUnauthorized: parsed.searchParams.get('rejectUnauthorized') !== 'false' };
}
function smtpMessage({ from, to, subject, body, messageId }) {
const recipients = normalizeMailRecipients(to);
const lines = [
`From: ${stripHeaderValue(from)}`,
`To: ${recipients.map(stripHeaderValue).join(', ')}`,
`Subject: ${stripHeaderValue(subject)}`,
`Date: ${new Date().toUTCString()}`,
`Message-ID: <${stripHeaderValue(messageId || uid('mailmsg'))}@VERIDION>`,
'MIME-Version: 1.0',
'Content-Type: text/plain; charset=UTF-8',
'Content-Transfer-Encoding: 8bit',
'',
String(body || '')
];
return lines.join('\r\n').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}
async function sendSmtpMail({ to, subject, body, smtpUrl = process.env.NV0_SMTP_URL }) {
const config = parseSmtpUrl(smtpUrl);
if (!config?.host || !Number.isFinite(config.port)) throw new Error('SMTP configuration is incomplete.');
const recipients = normalizeMailRecipients(to);
if (!recipients.length) throw new Error('SMTP recipient is empty.');
let socket;
let buffer = '';
let current = [];
const responses = [];
const waiters = [];
let closed = false;
function failAll(error) {
closed = true;
while (waiters.length) waiters.shift().reject(error);
}
function completeResponse() {
const lines = current;
current = [];
const first = lines[0] || '';
const code = Number(first.slice(0, 3));
const payload = { code, lines, text: lines.join('\n') };
const waiter = waiters.shift();
if (waiter) waiter.resolve(payload);
else responses.push(payload);
}
function onData(chunk) {
buffer += chunk;
let idx;
while ((idx = buffer.indexOf('\n')) >= 0) {
const line = buffer.slice(0, idx).replace(/\r$/, '');
buffer = buffer.slice(idx + 1);
current.push(line);
if (/^\d{3} /.test(line)) completeResponse();
}
}
function attach(nextSocket) {
if (socket) {
try { socket.removeListener('data', onData); } catch {}
}
 socket = nextSocket;
 socket.setEncoding('utf8');
 socket.setTimeout(15_000, () => failAll(new Error('SMTP request timed out')));
 socket.on('data', onData);
 socket.on('error', failAll);
 socket.on('close', () => { if (!closed) failAll(new Error('SMTP connection closed')); });
}
function readResponse() {
if (responses.length) return Promise.resolve(responses.shift());
if (closed) return Promise.reject(new Error('SMTP connection closed'));
return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
}
async function command(line) {
if (line != null) socket.write(`${line}\r\n`);
return readResponse();
}
function expect(res, codes, label) {
if (!codes.includes(res.code)) throw new Error(`${label} failed: ${res.text}`);
return res;
}
await new Promise((resolve, reject) => {
const creator = config.secure ? tls.connect : net.connect;
const options = config.secure ? { host: config.host, port: config.port, servername: config.host, rejectUnauthorized: config.rejectUnauthorized } : { host: config.host, port: config.port };
const s = creator(options, resolve);
attach(s);
setTimeout(() => reject(new Error('SMTP connect timed out')), 15_000).unref?.();
});
try {
expect(await readResponse(), [220], 'SMTP greeting');
let ehlo = await command(`EHLO ${requestHost({ headers: { host: 'VERIDION' }, socket: { remoteAddress: '127.0.0.1' } }) || 'VERIDION'}`);
if (![250].includes(ehlo.code)) ehlo = await command('HELO VERIDION');
expect(ehlo, [250], 'SMTP EHLO');
if (!config.secure && config.starttls && /STARTTLS/i.test(ehlo.text)) {
expect(await command('STARTTLS'), [220], 'SMTP STARTTLS');
const upgraded = tls.connect({ socket, servername: config.host, rejectUnauthorized: config.rejectUnauthorized });
await new Promise((resolve, reject) => { upgraded.once('secureConnect', resolve); upgraded.once('error', reject); });
attach(upgraded);
expect(await command('EHLO VERIDION'), [250], 'SMTP EHLO after STARTTLS');
}
if (config.user || config.pass) {
const authPlain = Buffer.from(`\0${config.user}\0${config.pass}`).toString('base64');
const auth = await command(`AUTH PLAIN ${authPlain}`);
if (auth.code !== 235) {
expect(await command('AUTH LOGIN'), [334], 'SMTP AUTH LOGIN');
expect(await command(Buffer.from(config.user).toString('base64')), [334], 'SMTP AUTH USER');
expect(await command(Buffer.from(config.pass).toString('base64')), [235], 'SMTP AUTH PASS');
}
}
expect(await command(`MAIL FROM:<${config.from}>`), [250], 'SMTP MAIL FROM');
for (const recipient of recipients) expect(await command(`RCPT TO:<${recipient}>`), [250, 251], 'SMTP RCPT TO');
expect(await command('DATA'), [354], 'SMTP DATA');
socket.write(smtpMessage({ from: config.from, to: recipients.join(','), subject, body, messageId: uid('smtp') }) + '\r\n.\r\n');
expect(await readResponse(), [250], 'SMTP message body');
await command('QUIT').catch(() => null);
return { ok: true, host: config.host, port: config.port, secure: config.secure, recipients: recipients.length, from: maskEmail(config.from) };
} finally {
closed = true;
try { socket.end(); } catch {}
}
}
async function processEmailOutbox(db, { dryRun = true, limit = 20 } = {}) {
const due = dueEmailItems(db, limit);
const results = [];
for (const item of due) {
if (dryRun) {
item.deliveryMode = 'dry_run_preview';
results.push({ id: item.id, ok: true, mode: item.deliveryMode, to: maskEmail(item.to), subject: item.subject });
} else if (!process.env.NV0_SMTP_URL) {
markEmailAttempt(item, { ok: false, error: 'NV0_SMTP_URL is not configured' });
item.deliveryMode = 'blocked_no_smtp_url';
results.push({ id: item.id, ok: false, error: item.lastError });
} else {
try {
const sent = await sendSmtpMail({ to: item.to, subject: item.subject, body: item.body });
markEmailAttempt(item, { ok: true });
item.deliveryMode = 'smtp_live';
item.smtp = sent;
results.push({ id: item.id, ok: true, mode: item.deliveryMode, smtp: sent });
} catch (error) {
markEmailAttempt(item, { ok: false, error: error.message });
item.deliveryMode = 'smtp_live_failed';
results.push({ id: item.id, ok: false, error: item.lastError });
}
}
}
return { ok: true, dryRun, processed: results.length, results };
}
function cleanupIdempotencyKeys(db) {
db.idempotencyKeys ||= [];
const cutoff = Date.now() - PAYMENT_IDEMPOTENCY_TTL_MS;
db.idempotencyKeys = db.idempotencyKeys.filter(item => Date.parse(item.createdAt || 0) >= cutoff);
}

function cleanupDataRetention(db, { dryRun = false } = {}) {
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const retentionCutoff = now - DATA_RETENTION_DAYS * dayMs;
const disabledCutoff = now - DATA_DESTRUCTION_GRACE_DAYS * dayMs;
const summary = { dryRun, retentionDays: DATA_RETENTION_DAYS, destructionGraceDays: DATA_DESTRUCTION_GRACE_DAYS, removed: {}, anonymizedCustomers: 0 };
function pruneArray(key, predicate) {
const before = Array.isArray(db[key]) ? db[key].length : 0;
const next = (db[key] || []).filter(item => !predicate(item));
summary.removed[key] = before - next.length;
if (!dryRun) db[key] = next;
}
pruneArray('customerSessions', item => Date.parse(item.expiresAt || 0) < now);
pruneArray('passwordResetTokens', item => Date.parse(item.expiresAt || 0) < now || (item.usedAt && Date.parse(item.usedAt || 0) < now - 7 * dayMs));
pruneArray('idempotencyKeys', item => Date.parse(item.createdAt || 0) < now - PAYMENT_IDEMPOTENCY_TTL_MS);
pruneArray('emailOutbox', item => ['sent','failed','dry_run_preview'].includes(item.status || item.deliveryMode || '') && Date.parse(item.updatedAt || item.lastAttemptAt || item.createdAt || 0) < retentionCutoff);
pruneArray('operationalEvents', item => Date.parse(item.at || 0) < retentionCutoff);
if (Array.isArray(db.auditLogs)) {
const before = db.auditLogs.length;
const retained = db.auditLogs.filter(item => Date.parse(item.at || 0) >= retentionCutoff).slice(0, AUDIT_LOG_RETENTION_COUNT);
summary.removed.auditLogs = before - retained.length;
if (!dryRun) db.auditLogs = retained;
}
if (!dryRun) {
const privacyRetention = prunePrivacyRetention(db);
summary.privacyRetention = privacyRetention;
for (const [key, value] of Object.entries(privacyRetention.removed || {})) summary.removed[key] = (summary.removed[key] || 0) + value;
}
if (Array.isArray(db.customers)) {
for (const customer of db.customers) {
const disabledAt = Date.parse(customer.disabledAt || 0);
if (customer.status === 'disabled' && disabledAt && disabledAt < disabledCutoff && !customer.anonymizedAt) {
summary.anonymizedCustomers += 1;
if (!dryRun) {
const digest = crypto.createHash('sha256').update(String(customer.email || customer.id || '')).digest('hex').slice(0, 12);
customer.email = `deleted-${digest}@nv0.local`;
customer.displayName = 'Deleted customer';
customer.passwordHash = null;
customer.marketingConsentAt = null;
customer.anonymizedAt = nowIso();
customer.updatedAt = nowIso();
}
}
}
}
return summary;
}
function getIdempotencyKey(req, body = {}) {
return String(req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || body.idempotencyKey || '').trim().slice(0, 120);
}
function findIdempotencyRecord(db, scope, key) {
if (!key) return null;
cleanupIdempotencyKeys(db);
return (db.idempotencyKeys || []).find(item => item.scope === scope && item.key === key) || null;
}
function storeIdempotencyRecord(db, { scope, key, requestHash, result }) {
if (!key) return null;
db.idempotencyKeys ||= [];
const record = { id: uid('idem'), scope, key, requestHash, result: maskSensitive(result), createdAt: nowIso() };
db.idempotencyKeys = db.idempotencyKeys.filter(item => !(item.scope === scope && item.key === key));
db.idempotencyKeys.unshift(record);
db.idempotencyKeys = db.idempotencyKeys.slice(0, 1000);
return record;
}
function hashRequestPayload(value) {
return crypto.createHash('sha256').update(JSON.stringify(value || {})).digest('hex');
}
function adminIpAllowed(req) {
if (!ADMIN_IP_ALLOWLIST.length) return true;
const ip = clientIp(req);
return ADMIN_IP_ALLOWLIST.includes(ip);
}
function xmlEscape(value = '') {
return String(value ?? '').replace(/[<>&'"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]));
}
function seoBaseUrl() {
return BUSINESS_PROFILE.domain.replace(/\/$/, '') || 'https://nv0.kr';
}
function lastmodDate(value) {
const parsed = value ? new Date(value) : new Date();
if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
return parsed.toISOString().slice(0, 10);
}
function buildRobotsTxt() {
const base = seoBaseUrl();
return [
'User-agent: *',
'Allow: /',
'Allow: /apps/public/',
'Allow: /shared/',
'Disallow: /admin',
'Disallow: /auth',
'Disallow: /portal',
'Disallow: /checkout',
'Disallow: /runtime',
'Disallow: /api/',
`Sitemap: ${base}/sitemap.xml`,
`Sitemap: ${base}/feed.xml`,
''
].join('\n');
}
function publicSitemapEntries(db = {}) {
const today = new Date().toISOString().slice(0, 10);
const staticEntries = [
{ path: '/', priority: '1.0', changefreq: 'weekly', lastmod: today },
{ path: '/products/veridion/demo', priority: '0.95', changefreq: 'weekly', lastmod: today },
{ path: '/plans', priority: '0.9', changefreq: 'weekly', lastmod: today },
{ path: '/board', priority: '0.85', changefreq: 'daily', lastmod: today },
{ path: '/insights', priority: '0.84', changefreq: 'daily', lastmod: today },
{ path: '/insights/refund-policy-checklist', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/insights/privacy-policy-checklist', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/insights/ecommerce-trust-checklist', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/insights/conversion-before-payment', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/insights/business-info-display', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/insights/mobile-checkout-trust', priority: '0.8', changefreq: 'monthly', lastmod: today },
{ path: '/documents', priority: '0.82', changefreq: 'weekly', lastmod: today },
{ path: '/guides', priority: '0.78', changefreq: 'weekly', lastmod: today },
{ path: '/solutions', priority: '0.74', changefreq: 'weekly', lastmod: today },
{ path: '/terms', priority: '0.45', changefreq: 'monthly', lastmod: today },
{ path: '/privacy', priority: '0.45', changefreq: 'monthly', lastmod: today },
{ path: '/refund', priority: '0.45', changefreq: 'monthly', lastmod: today },
{ path: '/business-info', priority: '0.55', changefreq: 'monthly', lastmod: today }
];
return staticEntries;
}
function buildSitemapXml(db = {}) {
const base = seoBaseUrl();
const seen = new Set();
const urls = publicSitemapEntries(db).filter(item => item.path && !seen.has(item.path) && seen.add(item.path)).map(item => `<url><loc>${xmlEscape(base + item.path)}</loc><lastmod>${xmlEscape(item.lastmod || lastmodDate())}</lastmod><changefreq>${xmlEscape(item.changefreq)}</changefreq><priority>${xmlEscape(item.priority)}</priority></url>`).join('');
return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
function feedItems(db = {}) {
return buildPublicColumnEnginePosts({ pageSize: 20 });
}
function buildFeedXml(db = {}) {
const base = seoBaseUrl();
const items = feedItems(db).map((item, index) => {
const title = xmlEscape(item.title || `VERIDION 게시판 ${index + 1}`);
const summary = xmlEscape(item.summary || stripHtml(item.body || '').slice(0, 240));
const pubDate = new Date(item.createdAt || Date.now()).toUTCString();
const guid = xmlEscape(item.id ? `${base}/board#${item.id}` : `${base}/board#item-${index + 1}`);
return `<item><title>${title}</title><link>${xmlEscape(base + '/board')}</link><guid isPermaLink="false">${guid}</guid><description>${summary}</description><pubDate>${pubDate}</pubDate></item>`;
}).join('');
return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>VERIDION 게시판</title><link>${xmlEscape(base + '/board')}</link><description>고지·환불·개인정보·전환 구조를 사람이 이해하기 쉬운 칼럼으로 정리한 공개 가이드입니다.</description><language>ko-KR</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}
function createPasswordResetToken(db, customer, req) {
db.passwordResetTokens ||= [];
const rawToken = crypto.randomBytes(24).toString('base64url');
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
db.passwordResetTokens = db.passwordResetTokens.filter(item => item.customerId !== customer.id || item.usedAt);
const record = { id: uid('reset'), customerId: customer.id, tokenHash, createdAt: nowIso(), expiresAt, usedAt: null, ipHash: pseudonymizeIp(clientIp(req)) };
db.passwordResetTokens.unshift(record);
return { rawToken, record };
}
function hashPasswordResetToken(token) { return crypto.createHash('sha256').update(String(token || '')).digest('hex'); }
function customerOrders(db, customer) {
if (!customer) return [];
return (db.orders || []).filter(order => ownsOrder(customer, order)).map(order => sanitizeOrderForPublic(order));
}
function normalizeDomainInput(value) {
const raw = String(value || '').trim();
if (!raw) return '';
try {
const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
return url.origin.replace(/\/$/, '');
} catch {
return raw.replace(/\/$/, '');
}
}
function normalizeSavedSitePayload(body = {}) {
return {
domain: normalizeDomainInput(body.domain || body.target || body.url),
label: asTrimmedString(body.label || body.name || '', { field: 'label', max: 80 }),
industry: asTrimmedString(body.industry || '', { field: 'industry', max: 80 }),
memo: asTrimmedString(body.memo || '', { field: 'memo', max: 500 }),
siteId: asTrimmedString(body.siteId || '', { field: 'siteId', max: 80 })
};
}
function linkCustomerToSite(db, customerId, site, extra = {}) {
if (!customerId || !site) return null;
db.customerSiteLinks ||= [];
const existing = db.customerSiteLinks.find(item => item.customerId === customerId && item.siteId === site.id);
if (existing) {
existing.label = extra.label || existing.label || site.domain;
existing.industry = extra.industry || existing.industry || site.industry || '';
existing.memo = extra.memo ?? existing.memo ?? '';
existing.updatedAt = nowIso();
return existing;
}
const link = { id: uid('csite'), customerId, siteId: site.id, label: extra.label || site.domain, industry: extra.industry || site.industry || '', memo: extra.memo || '', createdAt: nowIso(), updatedAt: nowIso(), pinned: !!extra.pinned };
db.customerSiteLinks.unshift(link);
return link;
}
function customerSavedSites(db, customer) {
if (!customer) return [];
db.customerSiteLinks ||= [];
return db.customerSiteLinks
.filter(link => link.customerId === customer.id)
.map(link => {
const site = findSiteByAny(db, link.siteId) || {};
const latestScan = (db.scans || []).find(item => item.siteId === link.siteId || normalizeDomainInput(item.target) === normalizeDomainInput(site.domain || link.domain));
return { ...link, siteId: link.siteId, domain: site.domain || link.domain || '', status: site.status || 'active', latestRiskScore: site.latestRiskScore ?? latestScan?.riskScore ?? null, latestRiskLevel: site.latestRiskLevel || latestScan?.riskLevel || null, lastScanAt: site.lastScanAt || latestScan?.generatedAt || null, latestFindings: latestScan?.totalFindings ?? null, recommendedPlan: latestScan?.recommendedPlan || null };
});
}
async function serveFile(req, res, absPath, contentType) {
try {
const stat = await fs.stat(absPath);
if (!stat.isFile()) return text(req, res, 404, 'Not found');
const category = absPath.includes('/runtime/uploads/') ? 'upload' : 'static';
const etag = `W/\"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}\"`;
const lastModified = stat.mtime.toUTCString();
if (req.headers['if-none-match'] === etag || req.headers['if-modified-since'] === lastModified) {
res.writeHead(304, { etag, 'last-modified': lastModified, ...baseHeaders(req, category) });
return res.end();
}
const data = await fs.readFile(absPath);
res.writeHead(200, { 'content-type': contentType, etag, 'last-modified': lastModified, ...baseHeaders(req, category) });
if (req.method === 'HEAD') return res.end();
res.end(data);
} catch {
text(req, res, 404, 'Not found');
}
}
function mime(p) {
if (p.endsWith('.css')) return 'text/css; charset=utf-8';
if (p.endsWith('.js')) return 'text/javascript; charset=utf-8';
if (p.endsWith('.json')) return 'application/json; charset=utf-8';
if (p.endsWith('.html')) return 'text/html; charset=utf-8';
if (p.endsWith('.svg')) return 'image/svg+xml';
if (p.endsWith('.txt')) return 'text/plain; charset=utf-8';
if (p.endsWith('.png')) return 'image/png';
if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
if (p.endsWith('.webp')) return 'image/webp';
if (p.endsWith('.pdf')) return 'application/pdf';
return 'application/octet-stream';
}
async function serveStaticRoot(req, res, rootDir, prefix = '') {
if (!['GET', 'HEAD'].includes(req.method)) return text(req, res, 405, 'Method Not Allowed', { allow: 'GET, HEAD' });
let clean;
try { clean = decodeURIComponent(req.url.split('?')[0]); } catch { return text(req, res, 400, 'Bad request path'); }
const rel = prefix ? clean.slice(prefix.length) : clean;
if (rel.includes('\0')) return text(req, res, 400, 'Bad request path');
const abs = path.resolve(rootDir, rel.replace(/^\/+/, ''));
const safeRoot = path.resolve(rootDir) + path.sep;
if (!(abs + path.sep).startsWith(safeRoot) && abs !== path.resolve(rootDir)) return text(req, res, 403, 'Forbidden');
return serveFile(req, res, abs, mime(abs));
}
function pageMap(urlPath) {
const m = {
'/': [PUBLIC_DIR, 'home'],
'/guides': [PUBLIC_DIR, 'guides'],
'/resources': [PUBLIC_DIR, 'guides'],
'/board': [PUBLIC_DIR, 'board'],
'/insights': [PUBLIC_DIR, 'insights'],
'/insights/refund-policy-checklist': [PUBLIC_DIR, 'insights/refund-policy-checklist'],
'/insights/privacy-policy-checklist': [PUBLIC_DIR, 'insights/privacy-policy-checklist'],
'/insights/ecommerce-trust-checklist': [PUBLIC_DIR, 'insights/ecommerce-trust-checklist'],
'/insights/conversion-before-payment': [PUBLIC_DIR, 'insights/conversion-before-payment'],
'/insights/business-info-display': [PUBLIC_DIR, 'insights/business-info-display'],
'/insights/mobile-checkout-trust': [PUBLIC_DIR, 'insights/mobile-checkout-trust'],
'/board/post': [PUBLIC_DIR, 'board'],
'/cases': [PUBLIC_DIR, 'cases'],
'/documents': [PUBLIC_DIR, 'documents'],
'/policy-documents': [PUBLIC_DIR, 'documents'],
'/docs/veridion': [PUBLIC_DIR, 'documents'],
'/solutions': [PUBLIC_DIR, 'solutions'],
'/service': [PUBLIC_DIR, 'service'],
'/products': [PUBLIC_DIR, 'plans'],
'/demo': [PUBLIC_DIR, 'demo'],
'/products/veridion/demo': [PUBLIC_DIR, 'veridion-demo'],
'/plans': [PUBLIC_DIR, 'plans'],
'/checkout': [PUBLIC_DIR, 'checkout'],
'/portal': [PUBLIC_DIR, 'portal'],
'/auth': [PUBLIC_DIR, 'auth'],
'/terms': [PUBLIC_DIR, 'terms'],
'/privacy': [PUBLIC_DIR, 'privacy'],
'/refund': [PUBLIC_DIR, 'refund'],
'/business-info': [PUBLIC_DIR, 'business-info'],
'/risk_result.html': [PUBLIC_DIR, 'demo'],
'/demo_risk_result.html': [PUBLIC_DIR, 'veridion-demo'],
'/service_detail.html': [PUBLIC_DIR, 'service'],
'/pricing.html': [PUBLIC_DIR, 'plans'],
'/insight_board.html': [PUBLIC_DIR, 'board'],
'/mypage.html': [PUBLIC_DIR, 'portal'],
'/auth_management.html': [PUBLIC_DIR, 'auth'],
'/risk-result': [PUBLIC_DIR, 'demo'],
'/insight-board': [PUBLIC_DIR, 'board'],
'/my-page': [PUBLIC_DIR, 'portal'],
'/admin': [ADMIN_DIR, 'gate'],
'/admin/console': [ADMIN_DIR, 'console'],
'/admin/orders': [ADMIN_DIR, 'orders'],
'/admin/publications': [ADMIN_DIR, 'publications'],
'/admin/library': [ADMIN_DIR, 'library'],
'/admin/settings': [ADMIN_DIR, 'settings'],
'/admin/diagnostics': [ADMIN_DIR, 'diagnostics'],
'/admin/console/orders': [ADMIN_DIR, 'orders'],
'/admin/console/publications': [ADMIN_DIR, 'publications'],
'/admin/console/library': [ADMIN_DIR, 'library'],
'/admin/console/settings': [ADMIN_DIR, 'settings'],
'/admin/console/diagnostics': [ADMIN_DIR, 'diagnostics']
};
return m[urlPath] || null;
}
function escapeHtml(value = '') {
return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function canonicalPagePath(urlPath = '/') {
const aliases = {
'/resources': '/guides',
'/products': '/plans',
'/risk_result.html': '/demo',
'/demo_risk_result.html': '/products/veridion/demo',
'/service_detail.html': '/service',
'/pricing.html': '/plans',
'/insight_board.html': '/board',
'/mypage.html': '/portal',
'/auth_management.html': '/auth',
'/risk-result': '/demo',
'/insight-board': '/board',
'/my-page': '/portal'
};
return aliases[urlPath] || urlPath || '/';
}
function routeMeta(urlPath) {
const base = seoBaseUrl();
const canonicalPath = canonicalPagePath(urlPath);
const metas = {
'/': { title: 'VERIDION | 온라인 사업자 고객 신뢰 점검 진단', description: '온라인 사업자가 놓치기 쉬운 전자상거래 고지, 개인정보 안내, 환불·청약철회, 표시광고 표현, 문의·사업자 정보를 공개 화면 기준으로 점검합니다.', keywords: ['고객 신뢰 진단','준법 체크','전자상거래 고지','개인정보 안내','무료 진단'] },
'/products/veridion/demo': { title: '무료 진단 | VERIDION', description: '사이트 주소 하나로 신뢰·준법·전환 보완 후보, 확인 URL, 다음 조치, 유료 리포트 제공 범위를 확인합니다.', keywords: ['무료 진단','신뢰 점검','준법 점검','전환 개선','전자상거래 점검'] },
'/demo': { title: '무료 진단 안내 | VERIDION', description: '최신 무료 진단 화면으로 이동하여 공개 화면 기준의 고객 신뢰 점검 후보를 확인합니다.', keywords: ['무료 진단','사이트 진단'] },
'/plans': { title: '요금제 | VERIDION', description: '무료 진단, 기본 리포트, 전문가 플랜의 제공 범위와 차이를 비교해 필요한 단계만 선택할 수 있습니다.', keywords: ['요금제','무료 진단','기본 리포트','전문가 플랜','사이트 진단 요금'] },
'/products': { title: '요금제 | VERIDION', description: '무료 진단, 기본 리포트, 전문가 플랜의 제공 범위와 가격을 명확하게 비교합니다.', keywords: ['요금제','기본 리포트','전문가 플랜'] },
'/documents': { title: '문서 생성 | VERIDION', description: '고객 안내문, 정책 초안, 개선 요청서를 읽기 쉬운 구조로 정리합니다.', keywords: ['문서 생성','고객 안내문','정책 문서','개선 가이드'] },
'/policy-documents': { title: '문서 생성 | VERIDION', description: '고객 안내문, 정책 초안, 개선 요청서를 읽기 쉬운 구조로 정리합니다.', keywords: ['문서 생성','고객 안내문','정책 문서'] },
'/docs/veridion': { title: '문서 생성 | VERIDION', description: '진단 후 필요한 고객 안내문, 정책 문서, 개선 리포트 초안을 정리하는 문서 허브입니다.', keywords: ['문서 생성','정책 문서','진단 리포트','개선 문구'] },
'/guides': { title: '가이드 | VERIDION', description: '진단 결과를 읽는 법과 전자상거래 고지, 개인정보 안내, 환불·청약철회 기준을 쉽게 안내합니다.', keywords: ['가이드','진단 결과','전자상거래 고지','환불 기준'] },
'/resources': { title: '가이드 | VERIDION', description: '진단 결과를 읽는 법과 전자상거래 고지, 개인정보 안내, 환불·청약철회 기준을 쉽게 안내합니다.', keywords: ['가이드','진단 결과','규제 점검'] },
'/solutions': { title: '분석 프로세스 | VERIDION', description: '입력부터 결과 정리까지 온라인 사업자의 고객 신뢰 점검 후보를 영역·요소·구분별로 분석합니다.', keywords: ['분석 프로세스','고객 신뢰 분석','준법 체크'] },
'/service': { title: '서비스 소개 | VERIDION', description: '온라인 사업자의 고지·환불·개인정보 점검 후보를 줄이기 위해 전자상거래 고지, 개인정보 안내, 환불·청약철회, 표시광고 표현을 점검합니다.', keywords: ['서비스 소개','전자상거래 점검','개인정보 안내 점검'] },
'/cases': { title: '개선 사례 | VERIDION', description: '진단 후 어떤 항목을 먼저 고쳤고 어떤 변화가 생겼는지 사례 형태로 정리했습니다.', keywords: ['개선 사례','고지 보완 사례','정책 안내 사례'] },
'/board': { title: '인사이트 | VERIDION', description: '온라인 사업자를 위한 신뢰·준법·전환 체크리스트와 환불·개인정보·사업자 정보·검색 최적화 실무 인사이트를 제공합니다.', keywords: ['인사이트','신뢰 점검','검색 최적화','환불 정책','개인정보 안내','결제 전환'] },
'/insights': { title: '인사이트 | VERIDION', description: '온라인 사업자를 위한 신뢰·준법·전환 체크리스트 허브입니다.', keywords: ['인사이트','신뢰 점검','환불 정책','개인정보 안내'] },
'/insights/refund-policy-checklist': { title: '쇼핑몰 환불정책 체크리스트 | VERIDION', description: '환불·교환·취소 기준을 결제 전 고객이 이해할 수 있게 정리하는 실무 체크리스트입니다.', keywords: ['환불정책 체크리스트','청약철회','쇼핑몰 환불 안내'] },
'/insights/privacy-policy-checklist': { title: '개인정보처리방침 필수 항목 체크리스트 | VERIDION', description: '수집 항목, 이용 목적, 보관 기간, 파기 기준, 문의 경로를 입력 화면과 정책 페이지에 맞추는 방법입니다.', keywords: ['개인정보처리방침','개인정보 필수 항목','입력폼 고지'] },
'/insights/ecommerce-trust-checklist': { title: '전자상거래 사이트 신뢰 요소 체크리스트 | VERIDION', description: '사업자 정보, 고객지원, 정책 링크, 결제 전 안내 등 고객 신뢰를 만드는 공개 화면 요소를 점검합니다.', keywords: ['전자상거래 신뢰 요소','사업자 정보','고객지원'] },
'/insights/conversion-before-payment': { title: '결제 전환율을 낮추는 불안 요소 | VERIDION', description: '가격·제공 범위·환불 기준·문의 경로가 결제 버튼 주변에서 어떻게 전환 이탈을 줄이는지 설명합니다.', keywords: ['결제 전환율','결제 불안 요소','CTA 개선'] },
'/insights/business-info-display': { title: '사업자 정보 표시 방법 | VERIDION', description: '상호, 대표자, 사업자등록번호, 주소, 이메일 등 사업자 정보를 고객이 찾기 쉬운 구조로 표시하는 방법입니다.', keywords: ['사업자 정보 표시','푸터 사업자 정보','고객지원'] },
'/insights/mobile-checkout-trust': { title: '모바일 결제 페이지 신뢰 개선 | VERIDION', description: '모바일 결제 화면에서 가격, 제공 범위, 환불 기준, 문의 경로를 읽기 쉽게 배치하는 체크리스트입니다.', keywords: ['모바일 결제','신뢰 개선','모바일 CTA'] },
'/business-info': { title: '사업자 정보와 고객지원 안내 | VERIDION', description: '결제 전 확인할 수 있는 VERIDION 사업자 정보와 고객지원 기준입니다.', keywords: ['사업자 정보','고객지원'] },
'/terms': { title: '이용약관 | VERIDION', description: 'VERIDION 서비스 이용 조건과 기본 약관을 안내합니다.', keywords: ['이용약관'] },
'/privacy': { title: '개인정보처리방침 | VERIDION', description: 'VERIDION 서비스의 개인정보 처리 기준과 입력 정보 최소화 원칙입니다.', keywords: ['개인정보처리방침'] },
'/refund': { title: '환불 정책 | VERIDION', description: '디지털 산출물 제공 시점과 환불 기준을 안내합니다.', keywords: ['환불 정책','청약철회'] },
'/auth': { title: '로그인 | VERIDION', description: '저장 사이트와 진단 이력 관리를 위한 로그인 페이지입니다.', keywords: ['로그인','회원가입'] },
'/portal': { title: '고객 포털 | VERIDION', description: '저장 사이트, 최근 진단 결과, 보완 항목, 다음 작업을 한 화면에서 관리합니다.', keywords: ['고객 포털','진단 이력'] },
'/checkout': { title: '결제 확인 | VERIDION', description: '선택한 상품, 금액, 받을 결과물, 동의 항목을 결제 전에 확인합니다.', keywords: ['결제 확인','리포트 결제'] }
};
const meta = metas[canonicalPath] || metas[urlPath] || metas['/'];
return { ...meta, canonicalPath, canonical: `${base}${canonicalPath === '/' ? '/' : canonicalPath}`, locale: 'ko_KR' };
}
function stripManagedSeoTags(body) {
return body
.replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '')
.replace(/<meta\s+name=["']theme-color["'][^>]*>/gi, '')
.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
}
function injectSeoMeta(body, urlPath) {
const meta = routeMeta(urlPath);
const canonicalPath = canonicalPagePath(urlPath);
const privateRoute = canonicalPath.startsWith('/admin') || ['/auth','/portal','/checkout'].includes(canonicalPath);
const robots = privateRoute ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const keywords = (meta.keywords || []).join(', ');
const tags = [
`<meta name="description" content="${escapeHtml(meta.description)}">`,
keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : '',
`<meta name="robots" content="${robots}">`,
`<meta name="googlebot" content="${robots}">`,
`<meta name="naverbot" content="${robots}">`,
`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`,
`<link rel="sitemap" type="application/xml" href="${escapeHtml(seoBaseUrl() + '/sitemap.xml')}">`,
`<link rel="alternate" type="application/rss+xml" title="VERIDION 전문가형 사이트 점검 글" href="${escapeHtml(seoBaseUrl() + '/feed.xml')}">`,
`<meta property="og:locale" content="${escapeHtml(meta.locale)}">`,
`<meta property="og:type" content="website">`,
`<meta property="og:site_name" content="VERIDION">`,
`<meta property="og:title" content="${escapeHtml(meta.title)}">`,
`<meta property="og:description" content="${escapeHtml(meta.description)}">`,
`<meta property="og:url" content="${escapeHtml(meta.canonical)}">`,
`<meta name="twitter:card" content="summary">`,
`<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
`<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
`<meta name="theme-color" content="#0B1D3A">`
].filter(Boolean).join('');
let out = stripManagedSeoTags(body).replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
out = out.replace('</head>', `${tags}</head>`);
return out;
}
function pageFaqStructuredData(urlPath) {
const faqMap = {
'/': [
['VERIDION은 무엇을 점검하나요?', '온라인 사업자가 공개 화면에서 갖춰야 할 전자상거래 고지, 개인정보 안내, 환불·청약철회, 표시광고 표현, 문의·사업자 정보를 쉽게 점검합니다.'],
['무료진단 후 무엇을 보면 되나요?', '탐지 점수가 높은 항목과 먼저 고칠 안내 문구를 확인한 뒤 필요한 상품을 비교하면 됩니다.']
],
'/products/veridion/demo': [
['무료진단은 무엇을 보여주나요?', '사이트의 신뢰 안내 공백과 먼저 고칠 부분을 요약해서 보여줍니다.'],
['로그인하면 무엇이 달라지나요?', '무료진단 횟수 관리, 저장 사이트, 원클릭 재검사, 최근 진단 이력 확인을 이용할 수 있습니다.']
],
'/plans': [
['어떤 상품을 먼저 선택해야 하나요?', '먼저 무료진단을 보고, 근거가 필요하면 기본 리포트, 바로 붙여넣을 문구와 검토 기준이 필요하면 전문가 플랜을 비교하면 됩니다.'],
['결제 전 어떤 내용을 확인해야 하나요?', '제공 범위, 디지털 산출물 제공 시점, 환불 제한, 고객지원 경로를 확인해야 합니다.']
],
'/board': [
['인사이트 글은 어떤 역할을 하나요?', '진단 결과를 실무 체크리스트로 풀어 무료 진단, 요금제, 고객 포털 검토 흐름을 돕습니다.'],
['글의 구성은 어떻게 되어 있나요?', '문제 상황, 고객 신뢰에 미치는 영향, 실무 체크리스트, 문구 개선 예시, 자연스러운 다음 행동 순서로 작성됩니다.']
]
};
return faqMap[urlPath] || [];
}
function buildStructuredData(urlPath) {
if (urlPath.startsWith('/admin')) return '';
const base = seoBaseUrl();
const meta = routeMeta(urlPath);
const pageUrl = meta.canonical;
const graph = [
{ '@type': 'Organization', '@id': `${base}/#organization`, name: BUSINESS_PROFILE.tradeName, url: base, email: BUSINESS_PROFILE.contactEmail },
{ '@type': 'WebSite', '@id': `${base}/#website`, name: 'VERIDION', url: base, inLanguage: 'ko-KR', publisher: { '@id': `${base}/#organization` }, potentialAction: { '@type': 'SearchAction', target: `${base}/board?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
{ '@type': 'SoftwareApplication', '@id': `${base}/#software`, name: 'VERIDION', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: base, description: meta.description, offers: { '@type': 'Offer', priceCurrency: 'KRW', price: '0', availability: 'https://schema.org/InStock' }, provider: { '@id': `${base}/#organization` } },
{ '@type': 'Service', '@id': `${base}/#service`, name: '온라인 사업자 고객 신뢰 점검', serviceType: 'Online business trust, compliance and conversion diagnostic', provider: { '@id': `${base}/#organization` }, areaServed: 'KR', audience: { '@type': 'Audience', audienceType: '온라인 사업자' } },
{ '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: meta.title, description: meta.description, isPartOf: { '@id': `${base}/#website` }, about: { '@id': `${base}/#software` }, inLanguage: 'ko-KR', dateModified: new Date().toISOString().slice(0, 10) },
{ '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: [
{ '@type': 'ListItem', position: 1, name: '홈', item: `${base}/` },
...(urlPath === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: meta.title.replace(/\s*\|\s*(NV0|VERIDION).*/, ''), item: pageUrl }])
] }
];
const faqs = pageFaqStructuredData(urlPath);
if (faqs.length) {
graph.push({ '@type': 'FAQPage', '@id': `${pageUrl}#faq`, mainEntity: faqs.map(([name, answer]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text: answer } })) });
}
return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/<\//g, '<\\/')}</script>`;
}
function injectStructuredData(body, urlPath) {
if (body.includes('application/ld+json')) return body;
const data = buildStructuredData(urlPath);
return data ? body.replace('</head>', `${data}</head>`) : body;
}
function navAttrs(urlPath, href, className = '') {
const pathOnly = href.split('?')[0];
const isCurrent = urlPath === pathOnly || (pathOnly !== '/' && urlPath.startsWith(pathOnly + '/'));
return `${className ? ` class="${className}"` : ''}${isCurrent ? ' aria-current="page"' : ''}`;
}
function publicTopMenuHtml(urlPath = '/') {
return `<a class="skip-link" href="#main">본문 바로가기</a><nav class="site-topbar" aria-label="주요 메뉴"><div class="site-topbar-inner">
<a class="brand" href="/"><span class="brand-mark">VERIDION</span></a>
<div class="site-menu">
<a href="/service"${navAttrs(urlPath, '/service')}>서비스</a>
<a href="/solutions"${navAttrs(urlPath, '/solutions')}>솔루션</a>
<a href="/plans"${navAttrs(urlPath, '/plans')}>요금</a>
<a href="/products/veridion/demo"${navAttrs(urlPath, '/products/veridion/demo')}>진단</a>
<a href="/board"${navAttrs(urlPath, '/board')}>인사이트</a>
<a href="/portal"${navAttrs(urlPath, '/portal')}>고객 포털</a>
</div>
<div class="site-actions"><a class="login-link" href="/auth"${navAttrs(urlPath, '/auth')}>로그인</a><a class="top-cta" href="/products/veridion/demo"${navAttrs(urlPath, '/products/veridion/demo')}>무료 진단 시작</a></div>
</div></nav>`;
}
function ensureMainId(body) {
if (body.includes('<main id="main"')) return body;
return body.replace('<main ', '<main id="main" tabindex="-1" ');
}
function injectNoScriptNotice(body, urlPath) {
return body;
}
function injectPublicTopMenu(body, urlPath) {
if (urlPath.startsWith('/admin')) return body;
let nextBody = body;
nextBody = nextBody.replace(/<header class="vr-topbar">[\s\S]*?<\/header>/, '');
// Native VERIDION pages already ship their own topbar. Do not inject a second header.
if (nextBody.includes('data-veridion-rebrand="clean"') || nextBody.includes('data-vr-page="true"') || nextBody.includes('vr-topbar') || nextBody.includes('site-topbar') || nextBody.includes('vr-topbar')) return nextBody;
return nextBody.replace(/<body\b([^>]*)>/i, `<body$1>${publicTopMenuHtml(urlPath)}`);
}
function isSafePublicOptionalField(value = '', { requireMailOrderShape = false } = {}) {
const textValue = String(value || '').trim();
if (!textValue) return false;
const unfinishedToken = ['TO', 'DO'].join('');
const blocked = new RegExp(`예정|확인|상용|입력|replace|placeholder|sample|example|dummy|xxx|미정|${unfinishedToken}|TBD|운영 인프라|changeme|your-|test_`, 'i');
if (blocked.test(textValue)) return false;
if (/^[\s._\-\/0]+$/.test(textValue)) return false;
if (requireMailOrderShape) {
  // Typical KR mail-order registration strings include a year/serial and often end with 호.
  // This intentionally rejects arbitrary placeholders while allowing real regional formats.
  return /(?:제\s*)?\d{4}[-\s가-힣A-Za-z0-9]{2,40}\d{2,}\s*호?$/.test(textValue);
}
return true;
}
function businessFooterHtml() {
const types = BUSINESS_PROFILE.businessTypes.join(' · ');
const mailOrderNumber = isSafePublicOptionalField(BUSINESS_PROFILE.mailOrderRegistrationNumber, { requireMailOrderShape: true }) ? BUSINESS_PROFILE.mailOrderRegistrationNumber : '';
return '<footer class="business-footer" aria-label="사업자 정보">'
+ '<div class="brand-col"><strong>VERIDION</strong><span>온라인 사업자의 고지·환불·개인정보 점검 후보를 공개 화면 기준으로 줄입니다.</span><span>© 2026 VERIDION. All rights reserved.</span></div>'
+ '<div class="footer-col"><strong>서비스</strong><a href="/service">서비스 소개</a><a href="/solutions">분석 프로세스</a><a href="/plans">요금제</a></div>'
+ '<div class="footer-col"><strong>정보</strong><a href="/board">게시판</a><a href="/service">서비스·가이드</a><a href="/business-info">고객지원</a></div>'
+ '<div class="footer-col"><strong>회사</strong><a href="/business-info">회사 소개</a><a href="/privacy">개인정보처리방침</a><a href="/terms">이용약관</a><a href="/refund">환불 정책</a></div>'
+ `<div class="footer-col"><strong>문의</strong><a href="mailto:${BUSINESS_PROFILE.contactEmail}">${BUSINESS_PROFILE.contactEmail}</a><span class="legal-disclaimer">${BUSINESS_PROFILE.tradeName} · 대표자 ${BUSINESS_PROFILE.representative} · 사업자등록번호 ${BUSINESS_PROFILE.registrationNumber}${mailOrderNumber ? ' · 통신판매업 신고번호 ' + mailOrderNumber : ''}</span><span class="legal-disclaimer">주소: ${BUSINESS_PROFILE.address}</span><span class="legal-disclaimer">업태·종목: ${types}</span><span class="legal-disclaimer">VERIDION은 공개 웹페이지 기반 구조 분석 서비스이며 법률 자문이나 성과 보장을 제공하지 않습니다.</span></div>`
+ '</footer>';
}

function injectBusinessInfoPageProfile(body, urlPath) {
if (urlPath !== '/business-info') return body;
const serviceName = escapeHtml(BUSINESS_PROFILE.tradeName || 'VERIDION');
const tradeName = escapeHtml(BUSINESS_PROFILE.tradeName || '');
const representative = escapeHtml(BUSINESS_PROFILE.representative || '');
const registrationNumber = escapeHtml(BUSINESS_PROFILE.registrationNumber || '');
const address = escapeHtml(BUSINESS_PROFILE.address || '');
const types = escapeHtml(BUSINESS_PROFILE.businessTypes.join(' / '));
const domain = escapeHtml(String(BUSINESS_PROFILE.domain || '').replace(/\/+$/, ''));
const contactEmail = escapeHtml(BUSINESS_PROFILE.contactEmail || '');
const mailOrderNumber = isSafePublicOptionalField(BUSINESS_PROFILE.mailOrderRegistrationNumber, { requireMailOrderShape: true }) ? escapeHtml(BUSINESS_PROFILE.mailOrderRegistrationNumber) : '';
const check = '<span class="check" aria-hidden="true"></span>';
const replaceLine = (source, label, htmlValue) => source.replace(new RegExp(`(<li>${check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${label}:\\s*)(?:<a[^>]*>)?[^<]*(?:</a>)?`), `$1${htmlValue}`);
let next = body;
next = replaceLine(next, '서비스명', serviceName || 'VERIDION');
next = replaceLine(next, '상호', tradeName || '엔브이제로(NV0)');
next = replaceLine(next, '대표자', representative || '');
next = replaceLine(next, '사업자등록번호', registrationNumber || '');
next = replaceLine(next, '주소', address || '');
next = replaceLine(next, '업태·종목', types || '정보통신업 / 소프트웨어 개발 및 공급업');
next = replaceLine(next, '도메인', domain || 'https://nv0.kr');
if (contactEmail) {
  next = next.replace(/이메일:\s*<a href="mailto:[^"]+">[^<]+<\/a>/, `이메일: <a href="mailto:${contactEmail}">${contactEmail}</a>`);
}
const mailOrderLine = mailOrderNumber ? `<li>${check}통신판매업 신고번호: ${mailOrderNumber}</li>` : '';
if (mailOrderLine && !next.includes('통신판매업 신고번호:')) {
  next = next.replace(/(<li><span class="check" aria-hidden="true"><\/span>사업자등록번호:[\s\S]*?<\/li>)/, `$1${mailOrderLine}`);
}
return next;
}

function injectAdoptedUi(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('data-veridion-rebrand="clean"') || body.includes('/shared/veridion-rebrand.css')) return body;
return body.replace('</head>', '<link href="/shared/veridion-rebrand.css" rel="stylesheet"></head>');
}

function injectSiteEnhancementsScript(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('data-veridion-rebrand="clean"') || body.includes('/shared/site-enhancements.js')) return body;
return body.replace('</body>', '<script src="/shared/site-enhancements.js" defer></script></body>');
}
function injectSessionNavScript(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('data-veridion-rebrand="clean"') || body.includes('/shared/session-nav.js')) return body;
return body.replace('</body>', '<script type="module" src="/shared/session-nav.js"></script></body>');
}
function injectClientRiskGuard(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('data-veridion-rebrand="clean"') || body.includes('/shared/client-risk-guard.js')) return body;
return body.replace('</body>', '<script src="/shared/client-risk-guard.js" defer></script></body>');
}
function injectBusinessFooter(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('data-vr-page="true"') || body.includes('data-veridion-rebrand="clean"') || body.includes('vr-footer') || /<footer\b/i.test(body)) return body;
const footer = businessFooterHtml();
const replaced = body.replace(/<footer\b[^>]*class=["'][^"']*\bbusiness-footer\b[^"']*["'][\s\S]*?<\/footer>/i, footer);
if (replaced !== body) return replaced;
return body.replace('</body>', `${footer}</body>`);
}

function wantsHtmlResponse(req) {
const accept = String(req.headers.accept || '');
const pathName = req._nv0RouteState?.pathname || '';
return !pathName.startsWith('/api/') && (accept.includes('text/html') || accept.includes('*/*'));
}
function renderPublicErrorPage(req, res, status, title, message, requestId = '') {
const safeTitle = escapeHtml(title);
const safeMessage = escapeHtml(message);
const safeRequestId = requestId ? escapeHtml(requestId) : '';
const body = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} | VERIDION</title><meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/shared/veridion-rebrand.css"></head><body>${publicTopMenuHtml('/')}<main id="main" tabindex="-1" class="vr-error-page"><section class="vr-error-card"><p class="eyebrow">서비스 안내</p><h1>${safeTitle}</h1><p>${safeMessage}</p>${safeRequestId ? `<p class="vr-error-request">요청 ID: ${safeRequestId}</p>` : ''}<div class="hero-actions"><a class="btn primary" href="/products/veridion/demo">무료 진단으로 이동</a><a class="btn secondary" href="/">홈으로 이동</a></div></section></main>${businessFooterHtml()}<script src="/shared/client-risk-guard.js" defer></script></body></html>`;
return html(req, res, status, body, { 'cache-control': 'no-store' }, 'public-page');
}
function adminNav() {
return `<nav class="admin-nav">
<a href="/admin/console">허브</a>
<a href="/admin/console/orders">구독·사이트</a>
<a href="/admin/console/publications">인사이트 발행</a>
<a href="/admin/console/library">자료실</a>
<a href="/admin/console/settings">설정</a>
<a href="/admin/console/diagnostics">서비스 진단</a>
<button id="logoutBtn" type="button">로그아웃</button>
</nav>`;
}
async function renderPage(urlPath, req, res) {
const mapped = pageMap(urlPath);
if (!mapped) return false;
const [baseDir, slug] = mapped;
if (urlPath.startsWith('/admin/console') || (urlPath.startsWith('/admin/') && urlPath !== '/admin')) {
if (!await requireAdmin(req, res)) return true;
}
const htmlPath = path.join(baseDir, slug, 'index.html');
let body = await fs.readFile(htmlPath, 'utf8');
if (urlPath.startsWith('/admin/console')) body = body.replace('<!--ADMIN_NAV-->', adminNav());
body = injectSeoMeta(body, urlPath);
body = injectStructuredData(body, urlPath);
body = injectAdoptedUi(body, urlPath);
body = ensureMainId(body);
body = injectNoScriptNotice(body, urlPath);
body = injectPublicTopMenu(body, urlPath);
body = injectBusinessInfoPageProfile(body, urlPath);
body = injectSessionNavScript(body, urlPath);
body = injectSiteEnhancementsScript(body, urlPath);
body = injectClientRiskGuard(body, urlPath);
body = injectBusinessFooter(body, urlPath);
const category = urlPath.startsWith('/admin') ? 'dynamic' : 'public-page';
html(req, res, 200, body, {}, category);
return true;
}
function safeUrl(target) {
try {
return new URL(target);
} catch {
return null;
}
}
function ipv4Parts(address = '') {
const raw = String(address || '').trim().toLowerCase();
const mapped = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
const dotted = mapped.split('.');
if (dotted.length === 4 && dotted.every(part => /^\d{1,3}$/.test(part))) {
  const parts = dotted.map(Number);
  return parts.every(value => Number.isInteger(value) && value >= 0 && value <= 255) ? parts : null;
}
if (/^\d+$/.test(mapped)) {
  const value = Number(mapped);
  if (Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}
return null;
}
function isBlockedIpAddress(address = '') {
const normalized = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
const v4 = ipv4Parts(normalized);
if (v4) {
  const [a, b, c] = v4;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}
if (!net.isIP(normalized)) return false;
if (normalized === '::' || normalized === '::1') return true;
if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) return true;
if (normalized.startsWith('ff')) return true;
return false;
}
function isBlockedTargetUrl(url) {
if (!url || !['http:', 'https:'].includes(url.protocol)) return true;
const host = String(url.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
if (!host) return true;
const blockedNames = new Set(['localhost', '0.0.0.0', 'metadata.google.internal']);
if (blockedNames.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
if (isBlockedIpAddress(host)) return true;
return false;
}
async function isBlockedTargetUrlResolved(url) {
if (isBlockedTargetUrl(url)) return true;
const host = String(url.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
if (net.isIP(host)) return isBlockedIpAddress(host);
try {
  const records = await lookup(host, { all: true, verbatim: true });
  if (!Array.isArray(records) || records.length === 0) return true;
  return records.some(record => isBlockedIpAddress(record.address));
} catch {
  return true;
}
}
function toKrw(num) {
return new Intl.NumberFormat('ko-KR').format(Math.round(num || 0));
}
function stripHtml(input = '') {
return String(input).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function clamp(v, min, max) {
return Math.max(min, Math.min(max, v));
}
function hasAny(haystack, terms) {
const value = String(haystack || '').toLowerCase();
return terms.some(term => value.includes(String(term).toLowerCase()));
}
function hasAllGroups(haystack, groups) {
return groups.every(group => hasAny(haystack, group));
}
function hasCommerceSignal(text = '') {
return hasAny(text, ['결제','구매','주문','장바구니','상품','가격','배송','환불','checkout','cart','order','buy','shop','store','subscribe','구독']);
}
function hasBusinessIdentity(text = '') {
return hasAllGroups(text, [
['상호','회사명','법인명','사업자','대표자','대표'],
['사업자등록','사업자 번호','사업자번호','주소','소재지','고객센터','전화','이메일','contact','@']
]);
}
function hasPrivacyNotice(text = '') {
return hasAny(text, ['개인정보처리방침','개인정보 처리방침','privacy policy','privacy']) && hasAny(text, ['수집','이용','보관','파기','처리','동의','보유','제공']);
}
function hasTermsNotice(text = '') {
return hasAny(text, ['이용약관','서비스 약관','terms of use','terms']) && hasAny(text, ['회원','서비스','책임','제한','해지','분쟁']);
}
function hasRefundNotice(text = '') {
return hasAny(text, ['환불','교환','반품','청약철회','취소']) && hasAny(text, ['기간','기준','불가','가능','절차','조건','수수료']);
}
function hasContactChannel(text = '') {
return hasAny(text, ['고객센터','문의','contact','전화','이메일','상담','카카오톡','채널톡','@']) && hasAny(text, ['운영시간','답변','영업일','접수','전화','이메일','@','상담']);
}
function buildRuleCatalog() {
return [
{ code: 'ECOM-BUSINESS-INFO', category: '전자상거래', title: '사업자 정보 고지', severity: 24, penaltyMax: 5000000, match: ({ text }) => hasCommerceSignal(text) && !hasBusinessIdentity(text) },
{ code: 'PRIVACY-POLICY', category: '개인정보', title: '개인정보처리방침 링크 또는 본문', severity: 26, penaltyMax: 10000000, match: ({ text }) => !hasPrivacyNotice(text) },
{ code: 'TERMS-OF-USE', category: '전자상거래', title: '이용약관 링크 또는 본문', severity: 12, penaltyMax: 3000000, match: ({ text }) => hasCommerceSignal(text) && !hasTermsNotice(text) },
{ code: 'REFUND-POLICY', category: '환불·청약철회', title: '환불·교환·청약철회 안내', severity: 18, penaltyMax: 5000000, match: ({ text }) => hasCommerceSignal(text) && !hasRefundNotice(text) },
{ code: 'CONTACT-CHANNEL', category: '지원', title: '고객센터 연락수단', severity: 10, penaltyMax: 2000000, match: ({ text }) => !hasContactChannel(text) },
{ code: 'MARKETING-CLAIM', category: '광고표시', title: '과장·확정형 표현', severity: 16, penaltyMax: 5000000, match: ({ text }) => hasAny(text, ['100%','완치','무조건','guaranteed','최고보장','확정수익','반드시 수익','완전 해결']) },
{ code: 'HTTPS-ONLY', category: '보안', title: 'HTTPS 미사용', severity: 20, penaltyMax: 3000000, match: ({ url }) => url?.protocol !== 'https:' },
{ code: 'TRACKING-CONSENT', category: '개인정보', title: '쿠키/추적 고지 부족', severity: 8, penaltyMax: 2000000, match: ({ html, text }) => hasAny(html, ['gtag(', 'googletagmanager', 'GoogleAnalytics', 'fbq(', 'kakaoPixel', 'naver_']) && !hasAny(text, ['쿠키','cookie','tracking','analytics','광고 식별자']) },
{ code: 'YOUTH-RESTRICTED', category: '청소년보호', title: '연령 제한·주의 문구 부족', severity: 14, penaltyMax: 3000000, match: ({ text }) => hasAny(text, ['주류','술','성인','adult','bet','카지노','담배','vape']) && !hasAny(text, ['19세','성인인증','청소년']) },
{ code: 'PAYMENT-NOTICE-PROXIMITY', category: '결제화면', title: '결제 전 주요 고지 근접 노출 부족', severity: 15, penaltyMax: 3000000, match: ({ text }) => hasAny(text, ['결제','checkout','주문','구매하기','신청하기','구독하기']) && !hasAny(text, ['환불','개인정보처리방침','이용약관','취소 기준']) },
{ code: 'SERVICE-SCOPE', category: '상품·서비스', title: '제공 범위 안내 부족', severity: 13, penaltyMax: 2000000, match: ({ text }) => hasAny(text, ['서비스','상품','리포트','구독','진단','플랜','패키지']) && !hasAny(text, ['제공 범위','제외 범위','산출물','작업 범위','포함 항목']) },
{ code: 'PRICE-TOTAL-COST', category: '가격·비용', title: '총 결제금액·추가비용 안내 부족', severity: 12, penaltyMax: 2000000, match: ({ text }) => hasAny(text, ['원','₩','가격','결제','구매','주문']) && !hasAny(text, ['총 결제금액','부가세','배송비','추가 비용','VAT','vat']) },
{ code: 'SHIPPING-DELIVERY-POLICY', category: '배송·제공', title: '배송·제공 시점 안내 부족', severity: 11, penaltyMax: 2000000, match: ({ text }) => hasCommerceSignal(text) && !hasAny(text, ['배송','제공 시점','납품','발송','영업일','소요 기간','전달 방식']) },
{ code: 'RECURRING-BILLING-NOTICE', category: '구독·자동결제', title: '구독·자동결제 조건 안내 부족', severity: 14, penaltyMax: 3000000, match: ({ text }) => hasAny(text, ['구독','정기결제','자동결제','월간','연간','subscription']) && !hasAny(text, ['해지','갱신','결제 주기','자동결제','정기결제']) },
{ code: 'FORM-CONSENT-PROXIMITY', category: '입력폼', title: '입력폼 주변 동의·안내 부족', severity: 13, penaltyMax: 3000000, match: ({ html, text }) => hasAny(html, ['<input','<textarea','type="email"','type="tel"']) && !hasAny(text, ['개인정보처리방침','수집 목적','보관 기간','동의']) },
{ code: 'LEGAL-ADVICE-DISCLAIMER', category: '고지문구', title: '법률 자문 아님 고지 부족', severity: 9, penaltyMax: 1000000, match: ({ text }) => hasAny(text, ['진단','리포트','수정 문구','약관']) && !hasAny(text, ['법률 자문','법적 자문','변호사 자문']) }
];
}
function classifyIndustry(target, text = '') {
const all = `${target} ${text}`.toLowerCase();
if (hasAny(all, ['clinic','hospital','의원','병원','치과','medical'])) return '의료';
if (hasAny(all, ['food','supplement','건기식','건강기능식품','nutrition'])) return '건기식';
if (hasAny(all, ['cosmetic','beauty','화장품','skincare'])) return '화장품';
if (hasAny(all, ['finance','loan','투자','보험','재테크','증권'])) return '금융';
if (hasAny(all, ['academy','class','course','교육','학원','강의'])) return '교육';
return '일반 이커머스';
}
function hashText(input = '') {
return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 12);
}
function normalizeTargetForCache(input = '') {
const url = safeUrl(String(input || '').trim());
if (!url) return String(input || '').trim();
if (url.pathname === '/') url.pathname = '';
url.hash = '';
return url.toString();
}
function buildSiteProfile(target, text = '') {
const all = `${target} ${text}`.toLowerCase();
const industry = classifyIndustry(target, text);
const siteType = hasAny(all, ['landing','campaign','event','promo','promotion','utm_'])
? '첫 화면'
: hasAny(all, ['product','goods','shop','cart','order','checkout','buy','store','상품','장바구니','주문','결제'])
? '이커머스'
: hasAny(all, ['blog','news','guide','help','notice','콘텐츠','가이드','블로그'])
? '콘텐츠형'
: '일반 웹사이트';
const signals = {
hasSignup: hasAny(all, ['회원가입','sign up','join','회원']),
hasCheckout: hasAny(all, ['결제','checkout','cart','order','주문','장바구니']),
hasProductDetail: hasAny(all, ['상품상세','product detail','option','price','구매하기']),
hasPrivacyPolicy: hasAny(all, ['개인정보처리방침','privacy']),
hasTerms: hasAny(all, ['이용약관','terms']),
hasRefundPolicy: hasAny(all, ['환불','교환','청약철회','취소']),
hasContactInfo: hasAny(all, ['고객센터','문의','contact','전화','이메일','@'])
};
const keyPages = [
'홈',
'푸터',
...(signals.hasSignup ? ['회원가입'] : []),
...(signals.hasProductDetail ? ['상품상세'] : []),
...(signals.hasCheckout ? ['결제/주문'] : []),
...(signals.hasPrivacyPolicy ? ['개인정보처리방침'] : []),
...(signals.hasTerms ? ['이용약관'] : []),
...(signals.hasRefundPolicy ? ['환불/배송/교환'] : [])
];
return {
industry,
siteType,
likelyHighRegulation: ['의료', '건기식', '화장품', '금융', '교육'].includes(industry),
signals,
keyPages
};
}
function buildCategoryScores(findings = []) {
const totals = new Map();
for (const item of findings) {
const score = Math.max(0, Number(item.severity || 0)) * (item.priority === 'P0' ? 1.35 : item.priority === 'P1' ? 1.15 : 1);
totals.set(item.category, (totals.get(item.category) || 0) + score);
}
const entries = Array.from(totals.entries()).map(([category, total]) => ({ category, score: clamp(Math.round(total * 2.1), 0, 100) }));
entries.sort((a, b) => b.score - a.score);
return Object.fromEntries(entries.map(item => [item.category, item.score]));
}
function confidenceLabel(score) {
const value = Number(score);
if (!Number.isFinite(value)) return '확인 필요';
if (value >= 80) return '높음';
if (value >= 55) return '보통';
if (value >= 30) return '낮음';
return '매우 낮음';
}
function normalizeScannedPages(fetched = {}) {
const pages = Array.isArray(fetched.pages) ? fetched.pages : [];
if (pages.length) return pages.map((page) => ({
url: page.url || page.finalUrl || '',
finalUrl: page.finalUrl || page.url || '',
status: Number(page.status || 0),
contentType: page.contentType || '',
contentLength: Number(page.contentLength || 0),
fetched: page.fetched !== false && Number(page.status || 0) > 0,
error: page.error || null,
verifiedBy: page.verifiedBy || 'http_fetch',
renderedByBrowser: page.renderedByBrowser === true,
source: page.source || 'probe'
}));
return [{
url: fetched.finalUrl || '',
finalUrl: fetched.finalUrl || '',
status: Number(fetched.status || 0),
contentType: fetched.contentType || '',
contentLength: stripHtml(fetched.html || '').length,
fetched: fetched.fetched === true,
error: fetched.error || null,
verifiedBy: 'http_fetch',
renderedByBrowser: false,
source: 'primary'
}].filter(item => item.finalUrl || item.url);
}
function rulePageSignals(rule = {}) {
const explicit = Array.isArray(rule.expectedPaths) ? rule.expectedPaths : [];
const fallback = {
'PRIVACY-POLICY': ['/privacy', 'privacy'],
'TERMS-OF-USE': ['/terms', 'terms'],
'REFUND-POLICY': ['/refund', 'refund', 'return', 'exchange', 'cancel'],
'PAYMENT-NOTICE-PROXIMITY': ['/checkout', '/cart', '/order', '/payment'],
'ECOM-BUSINESS-INFO': ['/', '/business-info', '/company', '/about', '/contact'],
'CONTACT-CHANNEL': ['/', '/contact', '/support', '/cs', '/help'],
'TRACKING-CONSENT': ['/', '/privacy', '/cookie'],
'PRICE-TOTAL-COST': ['/product', '/products', '/plans', '/pricing', '/checkout'],
'SHIPPING-DELIVERY-POLICY': ['/shipping', '/delivery', '/guide', '/product'],
'RECURRING-BILLING-NOTICE': ['/plans', '/pricing', '/subscribe', '/checkout'],
'FORM-CONSENT-PROXIMITY': ['/contact', '/signup', '/join', '/checkout', '/order']
}[String(rule.code || '')] || ['/'];
return [...explicit, ...fallback].map(v => String(v || '').toLowerCase()).filter(Boolean);
}
function ruleEvidenceTerms(rule = {}) {
const explicit = Array.isArray(rule.evidenceTerms) ? rule.evidenceTerms : [];
const fallback = {
'ECOM-BUSINESS-INFO': ['사업자', '상호', '대표자', '사업자등록', '주소', '고객센터'],
'PRIVACY-POLICY': ['개인정보', 'privacy', '수집', '보관', '파기'],
'TERMS-OF-USE': ['약관', 'terms', '책임', '해지'],
'REFUND-POLICY': ['환불', '교환', '취소', '청약철회'],
'CONTACT-CHANNEL': ['문의', '고객센터', 'contact', '@'],
'MARKETING-CLAIM': ['100%', '완치', '무조건', '보장', 'guaranteed'],
'TRACKING-CONSENT': ['쿠키', 'cookie', 'analytics'],
'PAYMENT-NOTICE-PROXIMITY': ['결제', '주문', '구매'],
'SERVICE-SCOPE': ['제공 범위', '산출물', '서비스'],
'LEGAL-ADVICE-DISCLAIMER': ['법률 자문', '진단', '약관']
}[String(rule.code || '')] || [rule.title];
return [...explicit, ...fallback].map(v => String(v || '').trim()).filter(Boolean);
}
function evidenceExcerptForRule(rule, text = '') {
const normalized = String(text || '').replace(/\s+/g, ' ').trim();
if (!normalized) return '본문 근거가 제한됩니다.';
const terms = ruleEvidenceTerms(rule);
const lower = normalized.toLowerCase();
let index = -1;
for (const term of terms) {
const found = lower.indexOf(String(term).toLowerCase());
if (found >= 0) { index = found; break; }
}
const start = Math.max(0, index < 0 ? 0 : index - 60);
return normalized.slice(start, start + 240) || normalized.slice(0, 240);
}
function pagesForRule(rule, scannedPages = []) {
const signals = rulePageSignals(rule);
const matched = scannedPages.filter((page) => {
const value = String(page.finalUrl || page.url || '').toLowerCase();
return signals.some(signal => signal === '/' ? value.endsWith('/') || !new URL(value, 'https://fallback.local').pathname.replace(/^\/$/, '') : value.includes(signal));
});
return (matched.length ? matched : scannedPages.slice(0, 3)).map(page => page.finalUrl || page.url).filter(Boolean).slice(0, 5);
}
function pageCoverageForRule(rule, scannedPages = []) {
const signals = rulePageSignals(rule);
const relevant = scannedPages.filter((page) => {
const value = String(page.finalUrl || page.url || '').toLowerCase();
return signals.some(signal => signal === '/' ? true : value.includes(signal));
});
const successful = relevant.filter(page => page.status >= 200 && page.status < 400 && Number(page.contentLength || 0) > 20);
const failed = relevant.filter(page => !(page.status >= 200 && page.status < 400 && Number(page.contentLength || 0) > 20));
return { relevant, successful, failed };
}
function certaintyForRule(rule, fetched = {}, scannedPages = []) {
if (!fetched.fetched) return '낮음';
if (['MARKETING-CLAIM', 'YOUTH-RESTRICTED', 'LEGAL-ADVICE-DISCLAIMER'].includes(rule.code)) return '직접 확인 필요';
const coverage = pageCoverageForRule(rule, scannedPages);
if (coverage.successful.length >= 2) return '높음';
if (coverage.successful.length >= 1) return '보통';
return '낮음';
}
function certaintyWeight(certainty = '') {
const value = String(certainty || '').toLowerCase();
if (value.includes('높음') || value.includes('high')) return 1;
if (value.includes('보통') || value.includes('medium')) return 0.78;
if (value.includes('수동') || value.includes('manual')) return 0.58;
return 0.48;
}
function coverageWeight(coverage = {}) {
const successful = Number(coverage.successful?.length || 0);
const relevant = Number(coverage.relevant?.length || 0);
if (successful >= 2) return 1;
if (successful === 1) return 0.82;
if (relevant > 0) return 0.55;
return 0.5;
}
function priorityForRule(rule = {}, certainty = '', coverage = {}) {
const weightedSeverity = Number(rule.severity || 0) * certaintyWeight(certainty) * coverageWeight(coverage);
if (Number(rule.severity || 0) >= 24 && weightedSeverity >= 16) return 'P0';
if (weightedSeverity >= 13) return 'P1';
return 'P2';
}
function riskContributionForRule(rule = {}, certainty = '', coverage = {}) {
const base = Number(rule.severity || 0) * 1.7;
const contribution = base * certaintyWeight(certainty) * coverageWeight(coverage);
return Math.max(2, Math.round(contribution));
}
function evidenceForFinding(rule, text, scannedPages = [], url = null) {
if (rule.code === 'HTTPS-ONLY') return url?.protocol || 'unknown';
if (['MARKETING-CLAIM', 'YOUTH-RESTRICTED'].includes(rule.code)) return evidenceExcerptForRule(rule, text);
const pages = pagesForRule(rule, scannedPages);
const terms = ruleEvidenceTerms(rule).slice(0, 4).join(', ');
return `${rule.title} 관련 신호(${terms})를 확인한 공개 페이지에서 충분히 찾지 못했습니다. 확인 위치: ${pages.slice(0, 3).join(' · ') || '수집 페이지 제한'}`;
}
function findReusableScan(db, input) {
if (!db || !Array.isArray(db.scans) || !SCAN_CACHE_TTL_MS) return null;
const normalized = normalizeTargetForCache(input);
if (!normalized) return null;
const cutoff = Date.now() - SCAN_CACHE_TTL_MS;
const found = db.scans.find(item => {
const target = normalizeTargetForCache(item.normalizedTarget || item.target || '');
const at = Date.parse(item.generatedAt || item.createdAt || '');
return target === normalized && Number.isFinite(at) && at >= cutoff && item.ruleVersion === RULES_VERSION;
});
if (!found) return null;
return {
...found,
requestId: uid('scan'),
generatedAt: nowIso(),
elapsedMs: 1,
cached: true,
cachedFromRequestId: found.requestId || null,
summary: `${normalized} 최근 분석 결과를 재사용했습니다.`
};
}
function buildSystemItemsFeed(db) {
const items = [];
for (const item of db.legalUpdates || []) items.push({ id: item.id, type: 'legal_update', title: item.title, summary: item.summary, body: item.summary, createdAt: item.createdAt, effectiveDate: item.effectiveDate, source: item.source, visibility: 'public' });
for (const item of db.publications || []) items.push({ id: item.id, type: 'publication', title: item.title, summary: item.body || item.title, body: item.body || '', createdAt: item.createdAt, visibility: 'public' });
for (const item of db.boards || []) items.push({ id: item.id, type: 'board', title: item.title, summary: item.body || item.title, body: item.body || '', createdAt: item.createdAt, visibility: item.visibility || 'public', boardType: item.boardType || 'notice' });
for (const item of db.library || []) items.push({ id: item.id, type: item.type === 'file' ? 'library_file' : 'library_note', title: item.title, summary: item.body || item.filename || item.title, body: item.body || '', createdAt: item.createdAt, visibility: item.visibility || 'private' });
items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
return items;
}
function boardTopicFromItem(item = {}, index = 0) {
const source = [item.title, item.body, item.summary, item.primaryKeyword, item.searchIntent, item.funnelStage].join(' ').toLowerCase();
if (hasAny(source, ['환불','교환','청약','취소','refund'])) return { title: '환불·취소 기준을 고객이 바로 찾게 만드는 방법', keyword: '환불 안내', issue: '환불 기준이 흩어져 있거나 결제 직전에 보이지 않는 상황' };
if (hasAny(source, ['개인정보','privacy','동의','보관','파기'])) return { title: '개인정보 안내를 입력 화면 가까이에 두는 방법', keyword: '개인정보 안내', issue: '개인정보 입력 목적과 보관 기준을 고객이 바로 확인하기 어려운 상황' };
if (hasAny(source, ['사업자','푸터','대표자','고객센터','contact','문의'])) return { title: '사업자 정보와 문의 경로를 믿음직하게 정리하는 방법', keyword: '사업자 정보', issue: '상호, 연락 경로, 답변 기준이 서로 떨어져 있는 상황' };
if (hasAny(source, ['결제','구매','checkout','주문'])) return { title: '결제 버튼 앞에서 고객 불안을 줄이는 안내 정리법', keyword: '결제 전 안내', issue: '결제 버튼 주변에 제공 범위, 환불, 문의 기준이 부족한 상황' };
if (hasAny(source, ['모바일','mobile','가독성'])) return { title: '모바일 화면에서 안내 문구가 잘 보이게 하는 방법', keyword: '모바일 안내', issue: '작은 화면에서 중요한 버튼과 정책 링크가 아래로 밀리는 상황' };
if (hasAny(source, ['광고','표현','보장','무조건','최고'])) return { title: '광고 문구를 과장 없이 믿을 수 있게 바꾸는 방법', keyword: '광고 문구 점검', issue: '강한 표현은 보이지만 근거와 조건이 함께 보이지 않는 상황' };
if (hasAny(source, ['약관','terms','정책'])) return { title: '이용약관과 정책 링크를 고객 흐름에 맞게 연결하는 방법', keyword: '약관 연결', issue: '약관은 있지만 회원가입이나 결제 화면에서 찾기 어려운 상황' };
const fallback = [
{ title: '처음 온 고객이 믿고 읽을 수 있는 사이트 안내 만들기', keyword: '사이트 신뢰 안내', issue: '고객이 필요한 정보를 찾기 위해 여러 화면을 돌아다녀야 하는 상황' },
{ title: '문의와 구매 전에 꼭 보여줘야 할 안내 체크리스트', keyword: '고객 안내 체크리스트', issue: '문의, 결제, 회원가입 직전에 필요한 답이 보이지 않는 상황' },
{ title: '고객이 헷갈리지 않게 사이트 문구를 정리하는 방법', keyword: '사이트 문구 정리', issue: '사이트 담당자에게는 익숙하지만 고객에게는 설명이 부족한 상황' }
];
return fallback[index % fallback.length];
}
function publicBoardBodyFor(item = {}, index = 0) {
const keyword = item.primaryKeyword || item.seo?.primaryKeyword || item.title || '사이트 신뢰 안내';
const source = [keyword, item.title, item.summary, item.body].join(' ');
const target = item.target || item.normalizedTarget || 'VERIDION';
const theme = (() => {
if (/환불|취소|교환|청약/.test(source)) return { label: '환불·청약철회 안내', elements: ['환불 가능 조건', '취소 접수 위치', '처리 기간', '예외 기준', '문의 경로'], buttonCopy: '환불 가능 조건 먼저 확인', risk: '환불 기준이 흐릿하면 고객은 결제보다 분쟁 가능성을 먼저 떠올립니다.', cta: '환불 기준이 페이지마다 다르다면 무료 진단으로 먼저 공백을 확인해 보세요.' };
if (/개인정보|동의|보관|파기|privacy/.test(source)) return { label: '개인정보 안내', elements: ['수집 항목', '수집 목적', '보관 기간', '파기 기준', '문의 이메일'], buttonCopy: '수집 목적과 보관 기간 확인', risk: '개인정보 안내가 입력 화면과 떨어져 있으면 고객은 정보를 남기기 전에 멈춥니다.', cta: '개인정보 안내가 입력 화면과 멀리 떨어져 있다면 위치부터 점검해 보세요.' };
if (/사업자|문의|고객센터|푸터|대표자/.test(source)) return { label: '사업자 정보와 문의 경로', elements: ['상호', '대표자', '사업자번호', '고객지원 이메일', '답변 기준'], buttonCopy: '사이트 담당자 정보와 문의 방법 보기', risk: '사이트 담당자 정보가 모호하면 상품보다 사이트 자체의 신뢰가 먼저 흔들립니다.', cta: '사업자 정보와 문의 경로가 흩어져 있다면 푸터와 문의 버튼 주변부터 정리하세요.' };
if (/결제|구매|주문|가격/.test(source)) return { label: '결제 전 안내', elements: ['제공 범위', '가격 포함 항목', '환불 기준', '결제 후 제공 시점', '고객지원 경로'], buttonCopy: '결제 전 제공 범위 확인', risk: '가격은 보이는데 제공 범위가 안 보이면 고객은 결제 직전에 뒤로 갑니다.', cta: '결제 직전 이탈이 많다면 버튼 바로 위·아래 안내부터 무료 진단으로 확인해 보세요.' };
return { label: '사이트 신뢰 안내', elements: ['사이트 담당자 정보', '문의 경로', '환불 기준', '개인정보 안내', '모바일 표시 상태'], buttonCopy: '필수 안내 먼저 확인', risk: '첫 방문자가 신뢰 확인에 실패하면 좋은 상품 설명도 제대로 읽히지 않습니다.', cta: '사이트 첫인상을 안정적으로 만들고 싶다면 무료 진단으로 주요 공백부터 확인하세요.' };
})();
const checklist = [
`고객 행동 버튼과 같은 화면에서 ${theme.label}을 확인할 수 있는지 점검합니다.`,
`${theme.elements.slice(0, 3).join(', ')} 항목이 약관, 푸터, 결제 화면에서 충돌하지 않는지 비교합니다.`,
'모바일 화면에서 안내 문구와 버튼이 동시에 보이는지 확인합니다.',
'수정 후 같은 주소로 다시 진단해 남은 공백을 비교합니다.'
];
const copyExamples = [
['문의하기', '문의하기 · 평일 기준 1영업일 안에 답변드립니다.'],
['자세히 보기', `${theme.buttonCopy}.`],
['무료 진단', '무료 진단 · 요약 결과까지 바로 확인'],
['서비스 신청', '제공 범위와 환불 기준 확인 후 신청하기']
];
const tags = [`#${String(keyword || theme.label).replace(/[\s·/]+/g, '')}`, `#${String(theme.label).replace(/[\s·/]+/g, '')}`, '#전문가포스팅', '#사이트신뢰진단', '#버튼문구개선', '#무료진단'].join(' ');
return [
`전문가 관점 요약\n${target} 사이트에서 ${theme.label}은 고객 행동 직전의 불확실성을 줄이는 전환 설계입니다. ${theme.risk} 이 글은 단순 홍보가 아니라 실제 화면을 보며 고칠 수 있는 항목을 정리한 전문가형 포스팅입니다.`,
`현장에서 자주 생기는 문제\n사이트 담당자는 푸터나 약관에 이미 적어 두었다고 생각하지만 고객은 결제, 문의, 회원가입, 상담 신청 직전에 답을 찾습니다. 필요한 정보가 그 위치에서 보이지 않으면 상품 설명을 끝까지 읽기 전에 비교 페이지로 이동할 수 있습니다.`,
`매출과 신뢰에 영향을 주는 이유\n광고 유입이 늘수록 안내 공백은 더 빠르게 비용으로 바뀝니다. 고객이 제공 범위, 문의 경로, 예외 기준, 처리 시간을 예측할 수 있어야 무료 진단에서 기본 리포트와 전문가 리포트로 이어지는 결과물 선택 흐름도 자연스럽게 연결됩니다.`,
`실무 적용 순서\n1. 결제 버튼, 문의 버튼, 가격표, 회원가입 화면을 먼저 확인합니다.\n2. ${theme.elements.join(', ')} 중 고객 질문과 직접 연결되는 항목을 버튼 주변에 배치합니다.\n3. 푸터에는 전체 기준을 두고 행동 화면에는 요약 문장을 둡니다.\n4. 모바일에서 문장이 접히거나 버튼 아래로 밀리는지 확인합니다.`,
`문구 개선 예시\n${copyExamples.map(([before, after], idx) => `${idx + 1}. 바꾸기 전: “${before}”\n   바꾼 뒤: “${after}”`).join('\n')}`,
`검증 체크리스트\n${checklist.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}`,
`고객 유입을 고려한 구성\n제목에는 고객이 실제로 찾을 표현을 넣고, 본문에는 문제 상황, 실무 체크리스트, 전후 문구 예시, 연결된 공개 페이지를 순서대로 배치합니다. 키워드 반복보다 독자가 체류할 이유를 만드는 구조가 중요합니다.`,
`자주 묻는 질문\nQ1. 무료 진단만으로 충분한가요?\nA. 무료 진단은 현재 공백을 빠르게 보는 출발점입니다. 실제 반영 문구와 우선순위가 필요하면 기본 리포트나 전문가 리포트로 이어가면 됩니다.\n\nQ2. 자동 글이 반복처럼 보이지 않으려면요?\nA. 주제, 고객 질문, 사례, 체크리스트, 버튼 위치를 함께 바꿔야 합니다. 제목만 바꾸는 방식은 피해야 합니다.`,
`자연스러운 다음 행동\n${theme.cta} 결과를 저장하면 기본 리포트에서 수정 우선순위를 보고, 전문가 리포트에서 실제 개선 방향을 확인할 수 있습니다.`,
`관련 링크\n무료 진단: /products/veridion/demo\n요금제: /plans\n고객 포털: /portal`,
`해시태그\n${tags}`
].join('\n\n');
}


function publicClampText(value = '', max = 190) {
const text = String(value || '').replace(/\s+/g, ' ').trim();
if (text.length <= max) return text;
return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function publicCleanPhrase(value = '') {
return String(value || '')
.replace(/https?:\/\/example\.com/gi, '운영 중인 사이트')
.replace(/\bCTA\b/g, '다음 행동 버튼')
.replace(/\bSEO\b/g, '리스크 점검')
.replace(/\b전문가 리포트\b/g, '전문가 리포트')
.replace(/\bAuto\b/g, '전문가 리포트')
.replace(/자동\s*발행/g, '정기 업데이트')
.replace(/20분에\s*1회|20분\s*주기|20분 공개|20분 발행|20분마다/g, '정기 업데이트')
.replace(/자동 글/g, '정기 칼럼')
.replace(/내 사이트 관리/g, '고객 포털')
.replace(/상품·요금/g, '요금제')
.replace(/고객 단계/g, '고객 단계')
.replace(/첫 화면/g, '첫 화면')
.replace(/메타 설명/g, '요약 설명')
.replace(/contentFingerprint|fingerprint|combinationMode|publicDisplayVersion/gi, '공개 표시 항목')
.replace(/\s+/g, ' ')
.trim();
}
function sanitizePublicBoardBody(body = '') {
const hiddenHeadings = new Set(['제목 후보', '공개 제외 메모', '공개 제외 메모', '공개 제외 메모', '공개 제외 메모']);
const sections = String(body || '')
.replace(/\bcontentFingerprint\b/gi, '중복 확인값')
.replace(/\bfingerprint\b/gi, '중복 확인값')
.replace(/\bcombinationMode\b/gi, '글 구성 방식')
.replace(/\bpublicDisplayVersion\b/gi, '공개 표시 기준')
.replace(/\bphase\d+\b/gi, '')
.replace(/\bCTA\b/g, '다음 행동 버튼')
.replace(/\bSEO\b/g, '리스크 점검')
.replace(/\b전문가 리포트\b/g, '전문가 리포트')
.replace(/\bAuto\b/g, '전문가 리포트')
.replace(/자동\s*발행/g, '정기 업데이트')
.replace(/20분에\s*1회|20분\s*주기|20분 공개|20분 발행|20분마다/g, '정기 업데이트')
.replace(/자동 글/g, '정기 칼럼')
.replace(/내 사이트 관리/g, '고객 포털')
.replace(/상품·요금/g, '요금제')
.replace(/고객 단계/g, '고객 단계')
.replace(/첫 화면/g, '첫 화면')
.split(/\n{2,}/)
.map(part => part.trim())
.filter(Boolean);
return sections.filter(section => {
const [first] = section.split('\n');
const heading = String(first || '').trim().replace(/^#+\s*/, '');
return !hiddenHeadings.has(heading);
}).join('\n\n');
}
function publicBoardLabel(type = '') {
const value = String(type || '').trim();
if (value === 'technical' || value === 'notice') return 'technical';
if (value === 'content' || value === 'case') return 'content';
return 'column';
}
function toPublicBoardPost(item = {}, index = 0) {
const source = item;
const body = sanitizePublicBoardBody(source.body || item.body || publicBoardBodyFor(source, index) || source.summary || item.summary || '');
const tags = Array.isArray(source.tags || item.tags)
  ? (source.tags || item.tags).map(tag => publicCleanPhrase(String(tag || '').replace(/^#/, '').trim())).filter(tag => tag && !/[a-z]+_[a-z]+/i.test(tag)).slice(0, 10)
  : [];
const primaryKeyword = source.seo?.primaryKeyword || source.primaryKeyword || item.primaryKeyword || '사이트 구조';
return {
  id: item.id || source.id || `board-${index + 1}`,
  title: publicCleanPhrase(source.title || item.title || `사이트 구조 칼럼 ${index + 1}`),
  boardType: publicBoardLabel(item.boardType || source.boardType),
  visibility: item.visibility || 'public',
  createdAt: item.createdAt || source.createdAt || nowIso(),
  primaryKeyword: publicCleanPhrase(primaryKeyword),
  summary: publicCleanPhrase(publicClampText(source.seo?.metaDescription || source.summary || item.summary || `${primaryKeyword}을 문제 진단, 실무 체크리스트, 문구 개선 예시, 다음 행동 흐름으로 정리했습니다.`, 190)),
  tags,
  body
};
}


function buildGuidanceForSite(site, scan, settings = {}) {
const operationsDocument = buildSiteOperationsDocument(scan || {}, { site, settings });
return operationsDocument.markdown;
}
function invalidPayload(message) {
const error = new Error(message);
error.code = 'INVALID_PAYLOAD';
return error;
}
function asTrimmedString(value, { field = 'value', required = false, max = 200, pattern = null, enumValues = null } = {}) {
const raw = value == null ? '' : String(value).trim();
if (!raw) {
if (required) throw invalidPayload(`${field} 값이 필요합니다.`);
return '';
}
if (raw.length > max) throw invalidPayload(`${field} 길이가 너무 깁니다.`);
if (pattern && !pattern.test(raw)) throw invalidPayload(`${field} 형식이 올바르지 않습니다.`);
if (enumValues && !enumValues.includes(raw)) throw invalidPayload(`${field} 값이 허용 범위를 벗어났습니다.`);
return raw;
}
function asBoolean(value, fallback = false) {
if (value === true || value === 'true' || value === 'on' || value === 1 || value === '1') return true;
if (value === false || value === 'false' || value === 'off' || value === 0 || value === '0') return false;
return fallback;
}
function asNumber(value, { field = 'value', min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
if (value == null || value === '') return fallback;
const num = Number(value);
if (!Number.isFinite(num)) throw invalidPayload(`${field} 값이 숫자가 아닙니다.`);
if (num < min || num > max) throw invalidPayload(`${field} 값이 허용 범위를 벗어났습니다.`);
return num;
}
function asStringArray(value, { field = 'value', maxItems = 10, maxItemLength = 100 } = {}) {
if (value == null || value === '') return [];
if (!Array.isArray(value)) throw invalidPayload(`${field} 값이 배열이어야 합니다.`);
if (value.length > maxItems) throw invalidPayload(`${field} 항목 수가 너무 많습니다.`);
return value.map((item) => asTrimmedString(item, { field, max: maxItemLength })).filter(Boolean);
}
function normalizeScanPayload(body = {}) {
const targetCandidate = body.target || body.url || body.targetUrl || body.domain;
return {
target: asTrimmedString(targetCandidate, { field: 'target', required: true, max: 2048, pattern: /^https?:\/\//i }),
turnstileToken: asTrimmedString(body.turnstileToken, { field: 'turnstileToken', max: 2048 }),
source: asTrimmedString(body.source, { field: 'source', max: 80 })
};
}
function normalizeCheckoutPayload(body = {}) {
return {
buyerEmail: asTrimmedString(body.buyerEmail, { field: 'buyerEmail', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i }),
siteId: asTrimmedString(body.siteId, { field: 'siteId', max: 64 }),
domain: asTrimmedString(body.domain, { field: 'domain', max: 255 }),
plan: normalizePlanCode(asTrimmedString(body.plan, { field: 'plan', required: true, max: 40 })),
payMethod: asTrimmedString(body.payMethod, { field: 'payMethod', max: 40 }),
privacyConsent: asBoolean(body.privacyConsent, false),
termsConsent: asBoolean(body.termsConsent, false),
refundConsent: asBoolean(body.refundConsent, false),
deliveryConsent: asBoolean(body.deliveryConsent, false)
};
}
function normalizeRefundRequestPayload(body = {}) {
return {
orderId: asTrimmedString(body.orderId || body.id, { field: 'orderId', required: true, max: 80 }),
reason: asTrimmedString(body.reason, { field: 'reason', max: 500 }) || '고객 요청',
accessToken: asTrimmedString(body.accessToken, { field: 'accessToken', max: 120 })
};
}
function normalizeMarketingConsentPayload(body = {}) {
return { marketingConsent: asBoolean(body.marketingConsent, false) };
}
function normalizeEmailDeliveryPayload(body = {}) {
return {
id: asTrimmedString(body.id, { field: 'id', required: true, max: 80 }),
status: asTrimmedString(body.status, { field: 'status', required: true, enumValues: ['sent','failed','queued'] }),
error: asTrimmedString(body.error, { field: 'error', max: 500 })
};
}
function normalizeDocumentPreviewPayload(body = {}) {
return {
documentKind: asTrimmedString(body.documentKind || body.kind || 'policy', { field: 'documentKind', enumValues: ['policy', 'work_order'] }),
sourceInput: asTrimmedString(body.sourceInput || body.input || body.prompt || body.request || body.workOrderInput, { field: 'sourceInput', max: 24000 }),
businessName: asTrimmedString(body.businessName || body.siteName || body.companyName, { field: 'businessName', max: 120 }),
representative: asTrimmedString(body.representative || body.ownerName, { field: 'representative', max: 80 }),
domain: asTrimmedString(body.domain || body.target, { field: 'domain', max: 255 }),
contactEmail: asTrimmedString(body.contactEmail || body.email, { field: 'contactEmail', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i }),
phone: asTrimmedString(body.phone || body.contactPhone, { field: 'phone', max: 40 }),
address: asTrimmedString(body.address, { field: 'address', max: 200 }),
refundWindowDays: asNumber(body.refundWindowDays, { field: 'refundWindowDays', min: 0, max: 365, fallback: 7 }),
shippingLeadDays: asNumber(body.shippingLeadDays, { field: 'shippingLeadDays', min: 0, max: 60, fallback: 3 }),
collectsPersonalData: asBoolean(body.collectsPersonalData, false),
delegatedProcessors: asStringArray(body.delegatedProcessors, { field: 'delegatedProcessors', maxItems: 20, maxItemLength: 80 }),
marketingOptIn: asBoolean(body.marketingOptIn, false),
subscriptionBilling: asBoolean(body.subscriptionBilling, false)
};
}
function normalizeSettingsPayload(body = {}) {
const next = {};
if ('ctaAutopublishEnabled' in body) next.ctaAutopublishEnabled = asBoolean(body.ctaAutopublishEnabled, false);
if ('legalWatchEnabled' in body) next.legalWatchEnabled = asBoolean(body.legalWatchEnabled, false);
if ('autoFixMode' in body) next.autoFixMode = asTrimmedString(body.autoFixMode, { field: 'autoFixMode', enumValues: ['approval_required', 'manual_only'] });
if ('defaultJurisdiction' in body) next.defaultJurisdiction = asTrimmedString(body.defaultJurisdiction, { field: 'defaultJurisdiction', enumValues: ['KR'] });
if ('defaultAlertChannel' in body) next.defaultAlertChannel = asTrimmedString(body.defaultAlertChannel, { field: 'defaultAlertChannel', enumValues: ['email', 'dashboard'] });
if ('supportEmail' in body) next.supportEmail = asTrimmedString(body.supportEmail, { field: 'supportEmail', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i });
if (!Object.keys(next).length) throw invalidPayload('저장할 설정 값이 없습니다.');
return next;
}
function normalizeRulePayload(body = {}) {
return {
code: asTrimmedString(body.code, { field: 'code', required: true, max: 64, pattern: /^[A-Z0-9_-]+$/i }).toUpperCase(),
category: asTrimmedString(body.category, { field: 'category', max: 60 }) || '기타',
title: asTrimmedString(body.title, { field: 'title', max: 120 }) || asTrimmedString(body.code, { field: 'code', required: true, max: 64, pattern: /^[A-Z0-9_-]+$/i }).toUpperCase(),
severity: asNumber(body.severity, { field: 'severity', min: 0, max: 100, fallback: 10 }),
penaltyMax: asNumber(body.penaltyMax, { field: 'penaltyMax', min: 0, max: 1000000000, fallback: 0 }),
fixTemplate: asTrimmedString(body.fixTemplate, { field: 'fixTemplate', max: 1000 })
};
}
function normalizePublicationPayload(body = {}) {
return {
title: asTrimmedString(body.title, { field: 'title', required: true, max: 120 }),
body: asTrimmedString(body.body, { field: 'body', max: 5000 }),
type: asTrimmedString(body.type || 'manual', { field: 'type', enumValues: ['manual', 'cta'] })
};
}
function normalizeRequestIdPayload(body = {}) {
return {
requestId: asTrimmedString(body.requestId, { field: 'requestId', max: 64 })
};
}
function normalizeIdPayload(body = {}, field = 'id') {
return {
id: asTrimmedString(body[field], { field, required: true, max: 64 })
};
}
function normalizeIdStatusPayload(body = {}, { allowStatuses = null } = {}) {
const id = asTrimmedString(body.id, { field: 'id', required: true, max: 64 });
const out = { id };
if (allowStatuses) out.status = asTrimmedString(body.status, { field: 'status', required: true, enumValues: allowStatuses });
return out;
}
function normalizeSubscriptionPayload(body = {}) {
return {
siteId: asTrimmedString(body.siteId, { field: 'siteId', required: true, max: 64 }),
plan: normalizePlanCode(asTrimmedString(body.plan || 'Auto', { field: 'plan', max: 40 }), 'Auto'),
status: asTrimmedString(body.status || 'active', { field: 'status', enumValues: ['active', 'paused', 'cancelled'] })
};
}
function normalizeSystemItemPayload(body = {}) {
const type = asTrimmedString(body.type, { field: 'type', required: true, enumValues: ['legal_update', 'publication', 'board', 'library_note'] });
return {
type,
source: asTrimmedString(body.source, { field: 'source', max: 80 }),
title: asTrimmedString(body.title, { field: 'title', required: true, max: 120 }),
summary: asTrimmedString(body.summary, { field: 'summary', max: 5000 }),
body: asTrimmedString(body.body, { field: 'body', max: 5000 }),
effectiveDate: asTrimmedString(body.effectiveDate, { field: 'effectiveDate', max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ }),
severity: asTrimmedString(body.severity || 'medium', { field: 'severity', enumValues: ['low', 'medium', 'high'] }),
boardType: asTrimmedString(body.boardType || 'notice', { field: 'boardType', enumValues: ['notice', 'legal-update', 'qna', 'case'] }),
visibility: asTrimmedString(body.visibility || 'public', { field: 'visibility', enumValues: ['public', 'private'] }),
publicationType: asTrimmedString(body.publicationType || 'manual', { field: 'publicationType', enumValues: ['manual', 'cta'] })
};
}
function normalizeOpsPayload(body = {}) {
return {
action: asTrimmedString(body.action, { field: 'action', required: true, enumValues: ['backup', 'restore_latest', 'prune', 'report'] })
};
}
function normalizeLibraryNotePayload(body = {}) {
return {
title: asTrimmedString(body.title, { field: 'title', required: true, max: 120 }),
body: asTrimmedString(body.body, { field: 'body', max: 5000 }),
type: asTrimmedString(body.type || 'document', { field: 'type', enumValues: ['document'] })
};
}
function buildPolicyDocumentPreview(payload = {}, settings = {}) {
const businessName = String(payload.businessName || payload.siteName || payload.companyName || '입력한 상호').trim();
const representative = String(payload.representative || payload.ownerName || '대표자 또는 책임자').trim();
const domain = String(payload.domain || payload.target || '').trim() || 'example.com';
const contactEmail = String(payload.contactEmail || payload.email || settings.supportEmail || 'ct@nv0.kr').trim();
const phone = String(payload.phone || payload.contactPhone || '').trim();
const address = String(payload.address || '').trim();
const refundWindowDays = Number(payload.refundWindowDays || 7);
const shippingLeadDays = Number(payload.shippingLeadDays || 3);
const collectsPersonalData = payload.collectsPersonalData !== false;
const delegatedProcessors = Array.isArray(payload.delegatedProcessors) ? payload.delegatedProcessors : [];
const marketingOptIn = payload.marketingOptIn !== false;
const subscriptionBilling = payload.subscriptionBilling === true;
const privacy = [
`# 개인정보처리방침`,
'',
`${businessName}(이하 "회사")는 서비스 제공에 필요한 최소한의 개인정보만 처리하며, 개인정보보호 관련 정책을 준수합니다.`,
'',
`## 1. 수집 항목`,
collectsPersonalData
? `- 필수: 이메일, 주문번호, 결제 식별자, 서비스 제공에 필요한 사이트 진단 식별자`
: `- 개인정보를 별도로 수집하지 않습니다.`,
marketingOptIn ? `- 선택: 마케팅 수신 동의 정보` : `- 마케팅 수신 선택항목 없음`,
'',
`## 2. 처리 목적`,
`- 계정 인증, 주문 처리, 결제 확인, 디지털 산출물 제공, 고객 문의 응답, 보안 감사, 정책상 의무 이행`,
'',
`## 3. 보유 기간 및 파기`,
`- 처리 목적 달성 또는 보유기간 만료 시 지체 없이 파기합니다. 관계 정책상 보존이 필요한 주문·결제 기록은 해당 기간 동안 분리 보관합니다.`,
'',
`## 4. 제3자 제공 및 처리위탁`,
`- 정책상 의무 또는 결제·인프라 처리에 필요한 경우를 제외하고 제3자에게 제공하지 않습니다.`,
delegatedProcessors.length ? `- 처리위탁: ${delegatedProcessors.join(', ')}` : `- 처리위탁 내역 없음`,
'',
`## 5. 정보주체 권리`,
`- 이용자는 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.`,
'',
`## 6. 안전성 확보조치`,
`- 접근권한 관리, 접속기록 관리, 암호화, 로그 마스킹, 보안 업데이트 등 필요한 보호조치를 적용합니다.`,
'',
`## 7. 쿠키 및 자동수집 장치`,
`- 서비스 운영에 필요한 세션 쿠키를 사용할 수 있으며, 광고성 추적 쿠키는 별도 고지와 동의 없이 사용하지 않습니다.`,
'',
`## 8. 문의처`,
`- 담당자: ${representative}`,
`- 이메일: ${contactEmail}`,
phone ? `- 연락처: ${phone}` : `- 연락처: 미수집`
].join('\n');
const terms = [
`# 이용약관`,
'',
`## 1. 사업자 정보`,
`- 상호: ${businessName}`,
`- 대표자: ${representative}`,
address ? `- 주소: ${address}` : `- 주소: 미수집`,
`- 사이트: https://${domain}`,
'',
`## 2. 서비스 개요`,
`- 회사는 재화 또는 서비스의 온라인 판매 및 고객 지원 기능을 제공합니다.`,
'',
`## 3. 주문 및 결제`,
`- 주문 완료 전 상품, 가격, 배송, 환불 기준을 고지합니다.`,
subscriptionBilling ? `- 정기결제 상품은 결제 주기와 해지 방법을 별도 고지합니다.` : `- 정기결제 상품 없음`,
'',
`## 4. 청약철회 및 환불`,
`- 서비스 제공 전 또는 정책상 청약철회가 가능한 경우 환불 요청을 접수합니다.`,
`- 이용자의 명시적 동의에 따라 디지털 산출물 제공이 시작된 뒤에는 제공 범위에 따라 청약철회가 제한될 수 있습니다.`,
`- 표시·광고 또는 계약 내용과 다르게 제공된 경우에는 관련 정책상 권리를 안내합니다.`
].join('\n');
const policy = [
`# 환불·청약철회 정책`,
'',
`## 배송`,
`- 평균 출고 기간: 결제 후 ${shippingLeadDays}영업일 이내`,
'',
`## 환불`,
`- 서비스 제공 전 또는 정책상 청약철회가 가능한 경우 결제일로부터 ${refundWindowDays}일 이내 환불 요청을 접수합니다.`,
`- 이용자의 명시적 동의에 따라 PDF 리포트·템플릿·수정안 등 디지털 산출물 제공이 시작된 경우 제공 범위에 따라 환불이 제한될 수 있습니다.`,
`- 표시·광고 또는 계약 내용과 다르게 제공된 경우에는 관계 정책상 청약철회·환불 권리를 안내하고 처리합니다.`,
'',
`## 교환`,
`- 교환 가능 여부와 비용은 상품 특성 및 관련 정책에 따라 안내합니다.`,
'',
`## 고객센터`,
`- 이메일: ${contactEmail}`,
phone ? `- 연락처: ${phone}` : `- 연락처: 미수집`
].join('\n');
const notices = [
`# 필수 고지 문구`,
'',
`- 상호: ${businessName}`,
`- 대표자: ${representative}`,
address ? `- 주소: ${address}` : `- 주소: 미수집`,
`- 이메일: ${contactEmail}`,
phone ? `- 연락처: ${phone}` : `- 연락처: 미수집`,
`- 개인정보처리방침 / 이용약관 / 환불·청약철회 정책 링크를 홈·결제·회원가입 영역에 노출`,
`- 디지털 산출물 즉시 제공 및 청약철회 제한 가능성은 결제 전 별도 체크박스로 확인`,
subscriptionBilling ? `- 정기결제 및 해지 방법 고지 필수` : `- 정기결제 고지 비대상`
].join('\n');
return {
businessName,
domain,
generatedAt: nowIso(),
documents: [
{ type: 'privacy_policy', title: '개인정보처리방침', content: privacy },
{ type: 'terms_of_service', title: '이용약관', content: terms },
{ type: 'refund_withdrawal_policy', title: '환불·청약철회 정책', content: policy },
{ type: 'required_notices', title: '필수 고지 문구', content: notices }
]
};
}
function pickRecommendedPlan(riskScore) {
if (riskScore >= 45) return 'Expert';
return 'Report';
}
const PHASE255_LEGACY_PRODUCT_ALIASES = ['전문가 리포트'];
function normalizePlanCode(value, fallback = 'Report') {
const raw = String(value || '').trim();
const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
const aliases = {
free: 'Free', trial: 'Free', demo: 'Free',
report: 'Report', basicreport: 'Report', detailedreport: 'Report', proreport: 'Report', pro: 'Report', basic: 'Report',
fixpack: 'FixPack', fix: 'FixPack', copypack: 'FixPack', templatepack: 'FixPack', industryguide: 'FixPack',
monitoring: 'Monitoring', monitor: 'Monitoring', auto: 'Monitoring', watch: 'Monitoring', subscription: 'Monitoring',
expert: 'Expert', expertreport: 'Expert', premium: 'Expert', professional: 'Expert',
agency: 'Agency', whitelabel: 'Agency', b2b: 'Agency'
};
return aliases[key] || (['Free','Report','FixPack','Monitoring','Expert','Agency'].includes(raw) ? raw : fallback);
}
function buildCommercialOfferCatalog() {
return buildSharedCommercialOfferCatalog();
}
function getCommercialOffer(code) { const normalized = normalizePlanCode(code); return buildCommercialOfferCatalog().find(item => item.code === normalized) || null; }
function buildPlanCatalog(recommendedPlan = 'Report') {
return buildSharedPlanCatalog(normalizePlanCode(recommendedPlan));
}
function planPrice(plan) {
return sharedPlanPrice(normalizePlanCode(plan));
}
function findLatestGuidanceForSite(db, siteId) {
return (db.guidanceDocuments || []).find(item => item.siteId === siteId) || null;
}
function findSiteByAny(db, siteId, domain) {
return (db.sites || []).find(item => (siteId && item.id === siteId) || (domain && item.domain === domain)) || null;
}
function normalizeFinding(raw = {}, index = 0) {
return {
id: raw.id || uid(`finding${index}`),
code: String(raw.code || `CUSTOM-${index + 1}`),
category: String(raw.category || '기타'),
title: String(raw.title || raw.code || `탐지 항목 ${index + 1}`),
severity: Number(raw.severity || 10),
priority: raw.priority || (Number(raw.severity || 10) >= 22 ? 'P0' : Number(raw.severity || 10) >= 16 ? 'P1' : 'P2'),
estimatedPenaltyMax: Number(raw.estimatedPenaltyMax || raw.penaltyMax || 0),
evidence: String(raw.evidence || '외부 엔진 제공 근거 없음'),
recommendation: String(raw.recommendation || raw.fixTemplate || '권장 조치를 확인하세요.'),
autoFixEligible: raw.autoFixEligible !== false
};
}
function normalizeExternalScanPayload(payload, input) {
const detailFindings = Array.isArray(payload?.detailFindings) ? payload.detailFindings.map((item, index) => normalizeFinding(item, index)) : [];
const categoryCounts = payload?.categoryCounts && typeof payload.categoryCounts === 'object' ? payload.categoryCounts : detailFindings.reduce((acc, item) => {
acc[item.category] = (acc[item.category] || 0) + 1;
return acc;
}, {});
const riskScore = clamp(Number(payload?.riskScore || 0), 0, 100);
const estimatedMaxPenalty = Number(payload?.estimatedMaxPenalty || detailFindings.reduce((sum, item) => sum + Number(item.estimatedPenaltyMax || 0), 0));
const riskLevel = payload?.riskLevel || (riskScore >= 80 ? '매우 높음' : riskScore >= 60 ? '높음' : riskScore >= 40 ? '주의' : riskScore >= 20 ? '보통' : '낮음');
const recommendedPlan = payload?.recommendedPlan || pickRecommendedPlan(riskScore);
const topFindings = Array.isArray(payload?.topFindings) && payload.topFindings.length ? payload.topFindings : detailFindings.slice(0, 5).map(item => `${item.title} (${item.priority})`);
const autoFixCandidates = Array.isArray(payload?.autoFixCandidates) && payload.autoFixCandidates.length
? payload.autoFixCandidates
: detailFindings.filter(item => item.autoFixEligible).slice(0, 5).map(item => ({ findingCode: item.code, title: item.title, patchSummary: item.recommendation }));
const siteProfile = payload?.siteProfile || buildSiteProfile(input, `${payload?.summary || ''} ${topFindings.join(' ')}`);
const categoryScores = payload?.categoryScores && typeof payload.categoryScores === 'object' ? payload.categoryScores : buildCategoryScores(detailFindings);
const externalPages = Array.isArray(payload?.scannedPages) ? payload.scannedPages : (Array.isArray(payload?.pages) ? payload.pages : []);
const evidenceSummary = payload?.evidenceSummary || {
collectionMethod: payload?.scanMode || 'external_provider',
verifiedBy: 'external_http',
aiReviewProvider: payload?.aiReview?.provider || 'external_provider',
externalMeasurementProviders: payload?.externalMeasurementProviders || {},
coverageScore: Number(payload?.coverageScore || 0),
confidenceScore: Number(payload?.confidenceScore || 70),
confidenceLabel: payload?.confidenceLabel || confidenceLabel(payload?.confidenceScore || 70),
successfulPageCount: externalPages.length,
attemptedPageCount: externalPages.length,
manualReviewCount: Number(payload?.manualReviewCount || 0),
scannedPages: externalPages,
limitations: payload?.limitations || ['외부 제공자 결과 기준이며 법률 판단 확정값이 아닙니다.'],
disclaimer: payload?.disclaimer || '외부 진단 결과도 법률 자문이나 성과 보장을 의미하지 않습니다.'
};
const scoreModel = payload?.scoreModel || buildScoreModel({ riskScore, findings: detailFindings, evidenceSummary });
const accuracyProfile = payload?.accuracyProfile || buildDiagnosisAccuracyProfile({ ...payload, fetched: payload?.fetched !== false, detailFindings, evidenceSummary, scannedPages: externalPages, riskScore });
const demoInput = { ...payload, target: String(input).trim(), normalizedTarget: payload?.normalizedTarget || String(input).trim(), detailFindings, evidenceSummary, scoreModel, riskScore, recommendedPlan };
const demoIssueOverview = buildDemoIssueOverview(demoInput);
const conversionUrgency = buildConversionUrgencyModel(demoInput, { plan: recommendedPlan });
return {
requestId: payload?.requestId || uid('scan'),
provider: 'external_http',
target: String(input).trim(),
normalizedTarget: payload?.normalizedTarget || String(input).trim(),
summary: payload?.summary || `${String(input).trim()} 외부 진단이 완료되었습니다.`,
fetched: payload?.fetched !== false,
fetchStatus: Number(payload?.fetchStatus || 200),
fetchError: payload?.fetchError || null,
industry: payload?.industry || siteProfile.industry || '일반 이커머스',
siteProfile,
scannedPages: externalPages,
probeCount: Number(payload?.probeCount || (Array.isArray(payload?.scannedPages) ? payload.scannedPages.length : Array.isArray(payload?.pages) ? payload.pages.length : 1)),
categoryScores,
ruleVersion: payload?.ruleVersion || RULES_VERSION,
scanMode: payload?.scanMode || 'evidence_first_external',
scanScopeLabel: payload?.scanScopeLabel || '외부 제공자 기반 무료진단',
cached: payload?.cached === true,
riskScore,
riskLevel,
totalFindings: Number(payload?.totalFindings || detailFindings.length),
categoryCounts,
estimatedMaxPenalty,
penaltyEstimateType: 'reference_upper_bound_candidate',
legalConclusion: false,
penaltyDisclaimer: payload?.penaltyDisclaimer || '과태료 상한 후보는 자동진단 기반 참고 정보이며, 실제 부과 여부·금액·적용 법령은 관할기관 판단과 전문가 검토에 따라 달라집니다.',
topFindings,
detailFindings,
evidenceSummary,
scoreModel,
accuracyProfile,
demoIssueOverview,
conversionUrgency,
qualityAssurance: payload?.qualityAssurance || { resultType: 'external_assisted_check', canGuaranteeLegalAccuracy: false, canGuaranteeBusinessOutcome: false, requiresManualReview: true },
aiReview: payload?.aiReview || { enabled: AI_REVIEW_ENABLED, provider: AI_REVIEW_ENABLED ? 'gemini' : 'disabled', model: AI_REVIEW_ENABLED ? GEMINI_MODEL : null, role: '해석 보조 레이어이며 측정 원천이 아닙니다.' },
autoFixCandidates,
recommendedPlan,
lockedPreviewCount: Math.max(0, detailFindings.length - 3),
generatedAt: payload?.generatedAt || nowIso(),
elapsedMs: Number(payload?.elapsedMs || 0),
findings: detailFindings.slice(0, 3).map(item => ({ key: item.code, label: item.title, status: item.priority })),
nextActions: payload?.nextActions || ['/plans', '/checkout', '/portal']
};
}
async function runGeminiEvidenceReview(scan) {
if (!AI_REVIEW_ENABLED) return { enabled: false, provider: 'disabled', model: null, role: '해석 보조 레이어이며 측정 원천이 아닙니다.' };
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 7000);
try {
const findings = (scan.detailFindings || []).slice(0, 8).map(item => ({
code: item.code,
title: item.title,
priority: item.priority,
category: item.category,
certainty: item.certainty,
evidence: String(item.evidence || '').slice(0, 280),
sourcePages: item.sourcePages || [],
recommendation: item.recommendation
}));
const prompt = [
'당신은 웹사이트 공개 페이지 무료진단 결과를 검수하는 보조 분석기입니다.',
'법률 위반, 과태료, 성과를 확정하지 마세요.',
'제공된 근거만 사용하고, 확인되지 않은 내용은 직접 확인 필요로 분리하세요.',
JSON.stringify({ target: scan.target, scoreModel: scan.scoreModel, evidenceSummary: scan.evidenceSummary, findings }, null, 2)
].join('\n\n');
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
const res = await fetch(endpoint, {
method: 'POST',
signal: controller.signal,
headers: { 'content-type': 'application/json' },
body: JSON.stringify({
contents: [{ role: 'user', parts: [{ text: prompt }] }],
generationConfig: {
responseMimeType: 'application/json',
responseSchema: {
type: 'object',
properties: {
summary: { type: 'string' },
manualReviewNeeded: { type: 'array', items: { type: 'string' } },
confidenceNotes: { type: 'array', items: { type: 'string' } },
recommendedNextSteps: { type: 'array', items: { type: 'string' } }
},
required: ['summary', 'manualReviewNeeded', 'confidenceNotes', 'recommendedNextSteps']
}
}
})
});
const data = await res.json().catch(() => null);
if (!res.ok) throw new Error(data?.error?.message || `Gemini review failed: ${res.status}`);
const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '{}';
let parsed = {};
try { parsed = JSON.parse(text); } catch { parsed = { summary: text }; }
return {
enabled: true,
provider: 'gemini',
model: GEMINI_MODEL,
role: '규칙 기반 결과를 사람이 읽기 쉬운 확인·수동검토 항목으로 재정리하는 보조 레이어입니다.',
...parsed,
reviewedAt: nowIso()
};
} catch (error) {
return { enabled: false, provider: 'gemini', model: GEMINI_MODEL, role: '해석 보조 레이어', error: error.message, reviewedAt: nowIso() };
} finally {
clearTimeout(timeout);
}
}
async function enhanceScanWithAiReview(scan) {
const aiReview = await runGeminiEvidenceReview(scan);
if (!aiReview.enabled && !aiReview.error) return { ...scan, aiReview };
return {
...scan,
aiReview,
qualityAssurance: { ...(scan.qualityAssurance || {}), aiReviewed: aiReview.enabled, aiReviewError: aiReview.error || null }
};
}

async function runExternalScan(target) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
const res = await fetch(SCAN_PROVIDER_URL, {
method: 'POST',
signal: controller.signal,
headers: {
'content-type': 'application/json',
...(SCAN_PROVIDER_TOKEN ? { authorization: `Bearer ${SCAN_PROVIDER_TOKEN}` } : {})
},
body: JSON.stringify({ target })
});
const data = await res.json().catch(() => null);
if (!res.ok || !data?.ok) throw new Error(data?.error || `scan provider failed: ${res.status}`);
return normalizeExternalScanPayload(data.result || data, target);
} finally {
clearTimeout(timeout);
}
}
function buildBuiltinScanResult(input, fetched, startedAt) {
const url = safeUrl(String(input).trim());
const html = fetched.html || '';
const text = stripHtml(html);
const rules = buildRuleCatalog();
const scannedPages= normalizeScannedPages(fetched);
const findings = [];
for (const rule of rules) {
let triggered = false;
try {
triggered = !!rule.match({ url, html, text, target: input });
} catch {
triggered = false;
}
if (!triggered) continue;
const sourcePages = pagesForRule(rule, scannedPages);
const certainty = certaintyForRule(rule, fetched, scannedPages);
const coverage = pageCoverageForRule(rule, scannedPages);
const priority = priorityForRule(rule, certainty, coverage);
const riskContribution = riskContributionForRule(rule, certainty, coverage);
findings.push({
id: uid('finding'),
code: rule.code,
category: rule.category,
title: rule.title,
severity: rule.severity,
weightedSeverity: riskContribution,
riskContribution,
priority,
estimatedPenaltyMax: rule.penaltyMax,
impact: rule.impact || '고객 안내와 운영 신뢰에 영향을 줄 수 있는 항목입니다.',
evidence: evidenceForFinding(rule, text, scannedPages, url),
evidenceType: rule.code === 'HTTPS-ONLY' ? 'url_protocol' : (['MARKETING-CLAIM', 'YOUTH-RESTRICTED'].includes(rule.code) ? 'detected_public_html_text' : 'negative_public_html_evidence'),
evidenceStatus: ['MARKETING-CLAIM', 'YOUTH-RESTRICTED', 'HTTPS-ONLY'].includes(rule.code) ? 'detected' : 'not_found_in_scanned_pages',
sourcePages,
certainty,
manualReviewRequired: ['MARKETING-CLAIM', 'YOUTH-RESTRICTED', 'LEGAL-ADVICE-DISCLAIMER'].includes(rule.code) || certainty === '낮음' || coverage.failed.length > 0,
coverage: { relevantPages: coverage.relevant.length, successfulPages: coverage.successful.length, failedPages: coverage.failed.length },
limitation: coverage.failed.length ? '일부 후보 페이지는 직접 확인 필요.' : (sourcePages.length ? '표시된 공개 페이지 기준으로 확인했습니다.' : '확인 범위가 제한적입니다.'),
recommendation: rule.fixTemplate || '필요 안내를 보강합니다.',
autoFixEligible: !['MARKETING-CLAIM', 'YOUTH-RESTRICTED'].includes(rule.code)
});
}
const categoryCounts = {};
for (const item of findings) categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
const estimatedMaxPenalty = findings.reduce((acc, item) => acc + item.estimatedPenaltyMax, 0);
let riskScore = findings.reduce((acc, item) => acc + Number(item.riskContribution || Math.round(item.severity * 1.1)), 0);
if (findings.some(item => item.code === 'HTTPS-ONLY')) riskScore += 6;
if (!fetched.fetched) riskScore += 8;
const siteProfile = buildSiteProfile(input, text);
if (siteProfile.likelyHighRegulation && riskScore > 0) riskScore += 4;
riskScore = findings.length ? clamp(riskScore, 6, 100) : 0;
const riskLevel = riskScore >= 80 ? '즉시 개선' : riskScore >= 60 ? '우선 개선' : riskScore >= 40 ? '점검 필요' : riskScore >= 20 ? '관찰' : '낮음';
const industry = siteProfile.industry;
const recommendedPlan = pickRecommendedPlan(riskScore);
const detailFindings = findings.sort((a, b) => b.severity - a.severity);
const topFindings = detailFindings.slice(0, 5).map(item => `${item.title} (${item.priority} · 신뢰도 ${item.certainty})`);
const autoFixCandidates = detailFindings.filter(item => item.autoFixEligible).slice(0, 5).map(item => ({
findingCode: item.code,
title: item.title,
patchSummary: item.recommendation,
sourcePages: item.sourcePages,
certainty: item.certainty
}));
const categoryScores = buildCategoryScores(detailFindings);
const evidenceSummary = buildEvidenceSummary({ fetched: { ...fetched, pages: scannedPages }, findings: detailFindings, text });
const scoreModel = buildScoreModel({ riskScore, findings: detailFindings, evidenceSummary });
const accuracyProfile = buildDiagnosisAccuracyProfile({ fetched: fetched.fetched, scannedPages, detailFindings, evidenceSummary, riskScore });
const automationDisclosure = buildAutomationDisclosure({ fetched: { ...fetched, pages: scannedPages }, findings: detailFindings, scoreModel });
const automatedActionPlan = buildAutomatedActionPlan({ findings: detailFindings, evidenceSummary, disclosure: automationDisclosure });
const demoInput = { target: String(input).trim(), normalizedTarget: fetched.finalUrl || input, detailFindings, evidenceSummary, scoreModel, riskScore, recommendedPlan };
const demoIssueOverview = buildDemoIssueOverview(demoInput);
const conversionUrgency = buildConversionUrgencyModel(demoInput, { plan: recommendedPlan });
return {
requestId: uid('scan'),
provider: 'builtin',
target: String(input).trim(),
normalizedTarget: fetched.finalUrl || input,
summary: `${String(input).trim()} 무료진단이 완료되었습니다. 자동 확인 근거와 직접 확인 한계를 함께 표시합니다.`,
fetched: fetched.fetched,
fetchStatus: fetched.status,
fetchError: fetched.error || null,
industry,
siteProfile,
categoryScores,
ruleVersion: RULES_VERSION,
scanMode: 'zero_cost_full_auto_disclosure',
scanScopeLabel: '무료 공개 페이지 최대 커버리지 무료진단',
cached: false,
resultStatus: 'completed_builtin_provider',
resultLimitNotice: '내장 공개 페이지 진단 결과이며 법률 자문이나 성과 보장을 의미하지 않습니다.',
riskScore,
detectionScore: riskScore,
riskLevel,
totalFindings: detailFindings.length,
categoryCounts,
estimatedMaxPenalty,
penaltyEstimateType: 'reference_upper_bound_candidate',
legalConclusion: false,
penaltyDisclaimer: '과태료 상한 후보는 자동진단 기반 참고 정보이며, 실제 부과 여부·금액·적용 법령은 관할기관 판단과 전문가 검토에 따라 달라집니다.',
topFindings,
detailFindings,
evidenceSummary,
scoreModel,
accuracyProfile,
demoIssueOverview,
conversionUrgency,
automationDisclosure,
automatedActionPlan,
qualityAssurance: {
resultType: fetched.fetched ? 'live_public_page_check' : 'limited_fallback_check',
canGuaranteeLegalAccuracy: false,
canGuaranteeBusinessOutcome: false,
requiresManualReview: true,
automationPolicy: '자동 확인 가능한 공개 항목은 기본 처리하고, 자동 확정 불가 영역은 명확히 고지합니다.',
recommendedExternalTools: ['Playwright(선택)', 'Lighthouse(선택)', 'Search Console(선택)', 'Gemini(선택)']
},
aiReview: { enabled: AI_REVIEW_ENABLED, provider: AI_REVIEW_ENABLED ? 'gemini' : 'disabled', model: AI_REVIEW_ENABLED ? GEMINI_MODEL : null, role: '해석 보조 레이어이며 측정 원천이 아닙니다.' },
autoFixCandidates,
recommendedPlan,
lockedPreviewCount: Math.max(0, detailFindings.length - 3),
generatedAt: nowIso(),
elapsedMs: Date.now() - startedAt,
findings: detailFindings.slice(0, 3).map(item => ({
key: item.code,
label: item.title,
status: item.priority,
certainty: item.certainty,
sourcePages: item.sourcePages
})),
nextActions: ['/plans', '/checkout', '/portal']
};
}

async function callExternalPaymentSession(payload) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
if (!PAYMENT_PROVIDER_URL) throw new Error('외부 결제 연동 URL이 설정되지 않았습니다.');
const res = await fetch(PAYMENT_PROVIDER_URL, {
method: 'POST',
signal: controller.signal,
headers: {
'content-type': 'application/json',
...(PAYMENT_PROVIDER_TOKEN ? { authorization: `Bearer ${PAYMENT_PROVIDER_TOKEN}` } : {})
},
body: JSON.stringify(payload)
});
const data = await res.json().catch(() => null);
if (!res.ok || !data?.ok) throw new Error(data?.error || `payment provider failed: ${res.status}`);
const session = data.session || data;
if (session?.redirectUrl) {
  try {
    const redirect = new URL(session.redirectUrl);
    if (!['http:', 'https:'].includes(redirect.protocol)) throw new Error('invalid_protocol');
    const host = redirect.hostname.toLowerCase();
    const allowed = PAYMENT_REDIRECT_ALLOWED_HOSTS.some(pattern => pattern === host || (pattern.startsWith('*.') && host.endsWith(pattern.slice(1))) || (pattern.startsWith('.') && host.endsWith(pattern)));
    if (!allowed) throw new Error('host_not_allowlisted');
  } catch {
    throw new Error('Invalid external payment redirectUrl: 허용된 결제 도메인의 URL만 사용할 수 있습니다.');
  }
}
return session;
} catch (error) {
if (error?.name === 'AbortError') throw new Error('외부 결제사 응답 시간이 초과되었습니다.');
throw error;
} finally {
clearTimeout(timeout);
}
}
function buildFixCopyFromScan(scan) {
const findings = Array.isArray(scan?.detailFindings) ? scan.detailFindings.slice(0, 5) : [];
if (!findings.length) return [
{ title: '푸터 사업자 정보', before: '사업자 정보 미노출 또는 위치 불명확', after: `${BUSINESS_PROFILE.tradeName} · 대표 ${BUSINESS_PROFILE.representative} · 지원 ${BUSINESS_PROFILE.contactEmail}` },
{ title: '환불 안내', before: '환불 가능 기간과 제한 조건 미기재', after: '환불·교환 기준은 결제 전 고지하며, 상품 특성 및 관련 정책에 따라 제한될 수 있습니다.' },
{ title: '개인정보 안내', before: '수집 목적과 보유 기간 불명확', after: '문의 응대 및 서비스 제공을 위해 필요한 최소한의 개인정보만 수집·이용합니다.' }
];
return findings.map(item => ({ title: item.title, before: item.evidence || '페이지 내 근거 문구 확인 필요', after: item.recommendation || '필수 고지 문구를 명확한 위치에 추가하세요.', priority: item.priority || 'P2' }));
}
function buildIndustryChecklist(industry = '일반 이커머스') {
const normalized = String(industry || '').trim() || '일반 이커머스';
const common = ['상품·서비스의 핵심 조건은 결제 전 확인 가능한 위치에 배치합니다.', '환불·교환·취소 제한은 버튼 주변 또는 결제 전 단계에 반복 노출합니다.', '후기·성과·효능 표현은 객관적 근거 또는 제한 문구와 함께 사용합니다.', '개인정보 수집 입력폼에는 수집 목적, 항목, 보유기간, 동의 여부를 명확히 표시합니다.'];
const vertical = normalized.includes('건강') || normalized.includes('의료') ? ['질병 예방·치료 효과를 직접 단정하는 표현은 고위험 문구로 분류합니다.', '개인 체험 후기는 일반적 효능처럼 오인되지 않도록 제한 문구를 병기합니다.'] : normalized.includes('교육') ? ['합격률·수익·성과 보장은 근거와 산정 기준을 함께 고지합니다.', '기간 한정 할인은 실제 기간과 조건을 명확히 표시합니다.'] : ['배송비, 추가 비용, 청약철회 제한 조건을 상품 상세와 결제 단계에 모두 표시합니다.', '할인율·정가·비교가 표시는 기준 가격의 산정 근거를 보관합니다.'];
return { industry: normalized, checklist: [...vertical, ...common] };
}
function buildPurchasedAsset(db, order) {
const offer = getCommercialOffer(order.plan) || { title: order.plan, deliverables: [], price: order.amount };
const site = findSiteByAny(db, order.siteId, order.domain);
const scan = (db.scans || []).find(item => item.siteId === order.siteId) || (db.scans || [])[0] || null;
const industryGuide = buildIndustryChecklist(scan?.industry || site?.industry || '일반 이커머스');
const policyDocuments = buildPolicyDocumentPreview({}, db.settings || {}).documents;
const premium = buildPremiumPurchasedAsset({ order, offer, scan, site, businessProfile: BUSINESS_PROFILE, policyDocuments, industryGuide });
const isReportPlan = order.plan === 'Report';
const isExpertPlan = order.plan === 'Expert';
const assetKind = isExpertPlan ? 'expert_report' : isReportPlan ? 'report' : 'expert_report';
const base = {
id: uid('asset'),
assetKind,
orderId: order.id,
siteId: order.siteId || null,
domain: order.domain || site?.domain || null,
plan: order.plan,
productTitle: offer.title,
status: 'ready',
createdAt: nowIso(),
supportEmail: BUSINESS_PROFILE.contactEmail,
legalDisclaimer: premium.legalDisclaimer || '본 산출물은 웹사이트 안내 보완 후보 점검 및 문구 개선 참고 자료이며, 개별 사건에 대한 법률 자문이 아닙니다.'
};
return { ...base, ...premium };
}
function pdfEscape(value) { return String(value || '').replace(/[\\()]/g, '\\$&').replace(/[\r\n]+/g, ' '); }
function buildAssetPdfBuffer(asset, order) {
const lines = buildPremiumAssetPdfLines(asset, order);
const content = ['BT','/F1 12 Tf','50 790 Td',...lines.slice(0, 34).flatMap((line, idx) => [`(${pdfEscape(line).slice(0, 110)}) Tj`, idx === 33 ? '' : '0 -20 Td']),'ET'].join('\n');
const objects = [
'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
'2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
'3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
'4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
`5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`
];
let pdf = '%PDF-1.4\n';
const offsets = [0];
for (const obj of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += obj + '\n'; }
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(n => `${String(n).padStart(10,'0')} 00000 n `).join('\n') + '\n';
pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
return Buffer.from(pdf);
}
function ensureFulfillmentForOrder(db, order) {
db.purchasedAssets ||= [];
const existing = db.purchasedAssets.find(item => item.orderId === order.id);
if (existing) return existing;
const asset = buildPurchasedAsset(db, order);
db.purchasedAssets.unshift(asset);
db.purchasedAssets = db.purchasedAssets.slice(0, 500);
return asset;
}
async function createCheckoutOrder(db, payload = {}) {
db.orders ||= [];
db.paymentSessions ||= [];
const plan = normalizePlanCode(payload.plan, 'Report');
const site = findSiteByAny(db, payload.siteId, payload.domain);
const email = normalizeEmail(payload.email || payload.buyerEmail || '');
const customer = email ? '이메일 고객' : '비회원 고객';
const customerAccount = email ? (db.customers || []).find(item => normalizeEmail(item.email) === email && item.status !== 'disabled') : null;
const order = {
id: uid('ord'),
customer,
email,
customerId: customerAccount?.id || payload.customerId || null,
accessToken: crypto.randomBytes(18).toString('base64url'),
plan,
siteId: site?.id || null,
domain: site?.domain || String(payload.domain || '').trim() || null,
status: 'pending',
stage: 'checkout_ready',
amount: planPrice(plan),
paymentProvider: PAYMENT_PROVIDER,
createdAt: nowIso(),
consent: { privacy: !!payload.privacyConsent, terms: !!payload.termsConsent, refund: !!payload.refundConsent, delivery: !!payload.deliveryConsent, consentedAt: nowIso(), dataMinimizationVersion: RELEASE_PHASE, privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION, refundPolicyVersion: REFUND_POLICY_VERSION, withdrawalNoticeVersion: 'digital-output-v1', evidenceVersion: LEGAL_EVIDENCE_VERSION, ipHash: payload.consentEvidence?.ipHash || '', userAgentHash: payload.consentEvidence?.userAgentHash || '' }
};
let paymentSession;
if (PAYMENT_PROVIDER === 'external_http') {
const external = await callExternalPaymentSession({
orderId: order.id,
plan,
amount: order.amount,
customer,
email,
siteId: order.siteId,
domain: order.domain
});
paymentSession = {
id: external.sessionId || uid('pay'),
orderId: order.id,
provider: 'external_http',
redirectUrl: external.redirectUrl || null,
providerState: external.providerState || 'created',
createdAt: nowIso()
};
} else if (PAYMENT_PROVIDER === 'portone_v2') {
const portoneSession = PORTONE_CLIENT.buildCheckoutSession({
order,
customerName: customer,
email,
domain: order.domain,
payMethod: String(payload.payMethod || '').trim().toUpperCase() || undefined
});
await PORTONE_CLIENT.preRegisterPayment({
paymentId: portoneSession.providerPaymentId,
totalAmount: order.amount,
currency: 'KRW',
orderName: portoneSession.paymentRequest.orderName,
customer: portoneSession.paymentRequest.customer,
customData: portoneSession.paymentRequest.customData
});
paymentSession = portoneSession;
} else {
paymentSession = {
id: uid('pay'),
orderId: order.id,
provider: 'demo',
redirectUrl: null,
providerState: 'ready_for_demo_capture',
createdAt: nowIso()
};
}
order.paymentSessionId = paymentSession.id;
db.orders.unshift(order);
db.paymentSessions.unshift(paymentSession);
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: paymentSession.providerPaymentId || order.id,
providerStatus: paymentSession.providerState,
eventType: 'checkout_session.created',
source: 'checkout_session',
payload: {
amount: order.amount,
plan: order.plan,
provider: paymentSession.provider
}
});
return { order, paymentSession };
}
function completeCheckoutOrder(db, orderId) {
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return null;
if (!canTransition(order.status, 'paid', ORDER_STATUS_TRANSITIONS)) return null;
order.status = 'paid';
order.stage = 'completed';
order.paidAt = nowIso();
const paymentSession = (db.paymentSessions || []).find(item => item.orderId === order.id);
if (paymentSession) {
if (!canTransition(paymentSession.providerState, 'captured', PAYMENT_SESSION_TRANSITIONS)) return null;
paymentSession.providerState = 'captured';
paymentSession.completedAt = nowIso();
}
const offer = getCommercialOffer(order.plan);
if (order.siteId && offer?.billingType === 'subscription') {
const site = findSiteByAny(db, order.siteId);
if (site) {
const sub = ensureSubscriptionForSite(db, site, normalizePlanCode(order.plan, 'Expert'));
sub.status = 'active';
sub.plan = order.plan || sub.plan;
sub.monthlyPrice = planPrice(sub.plan);
sub.activatedAt = nowIso();
sub.renewalMode = offer.renewalMode || 'manual_renewal_until_recurring_billing_enabled';
sub.autoRecurringBilling = offer.autoRecurringBilling === true;
sub.expiresAt = new Date(Date.now() + Number(offer.accessDurationDays || 30) * 24 * 60 * 60 * 1000).toISOString();
}
}
ensureFulfillmentForOrder(db, order);
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: paymentSession?.providerPaymentId || order.id,
providerStatus: paymentSession?.providerState || 'captured',
eventType: 'payment.completed',
source: 'demo_complete',
payload: { provider: paymentSession?.provider || PAYMENT_PROVIDER }
});
return { order, paymentSession };
}
async function syncPortOneCheckoutOrder(db, orderId, paymentId, source = 'manual_complete') {
const order = (db.orders || []).find(item => item.id === orderId);
if (!order) return { ok: false, reason: 'order_not_found' };
const paymentSession = (db.paymentSessions || []).find(item => item.orderId === order.id);
if (!paymentSession || paymentSession.provider !== 'portone_v2') return { ok: false, reason: 'payment_session_not_found' };
const resolvedPaymentId = String(paymentId || paymentSession.providerPaymentId || order.id || '').trim();
if (!resolvedPaymentId) return { ok: false, reason: 'payment_id_required' };
const payment = await PORTONE_CLIENT.getPayment(resolvedPaymentId);
const verification = verifyPortOnePaymentAgainstOrder(payment, order);
const providerStatus = PORTONE_CLIENT.mapPaymentStatus(payment?.status);
paymentSession.providerPaymentId = resolvedPaymentId;
paymentSession.lastVerificationSource = source;
paymentSession.lastSyncedAt = nowIso();
paymentSession.lastProviderSnapshot = {
id: payment?.id || resolvedPaymentId,
status: payment?.status || null,
amountTotal: Number(payment?.amount?.total ?? payment?.amount ?? 0) || 0,
paidAt: payment?.paidAt || null
};
if (!verification.ok) {
order.status = 'failed';
paymentSession.providerState = 'failed';
paymentSession.lastVerificationError = verification.reason;
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: resolvedPaymentId,
providerStatus: 'failed',
eventType: 'payment.provider.verification_failed',
source,
payload: { reason: verification.reason, providerStatusRaw: payment?.status || null }
});
return { ok: false, reason: verification.reason, order, paymentSession, payment };
}
paymentSession.lastVerificationError = null;
if (canTransition(paymentSession.providerState, providerStatus, PAYMENT_SESSION_TRANSITIONS) || paymentSession.providerState === providerStatus) {
paymentSession.providerState = providerStatus;
}
switch (String(payment?.status || '').toUpperCase()) {
case 'PAID': {
if (!canTransition(order.status, 'paid', ORDER_STATUS_TRANSITIONS) && order.status !== 'paid') {
return { ok: false, reason: 'invalid_order_transition', order, paymentSession, payment };
}
order.status = 'paid';
order.stage = 'completed';
order.paidAt = payment?.paidAt || nowIso();
const offer = getCommercialOffer(order.plan);
if (order.siteId && offer?.billingType === 'subscription') {
const site = findSiteByAny(db, order.siteId);
if (site) {
const sub = ensureSubscriptionForSite(db, site, normalizePlanCode(order.plan, 'Expert'));
sub.status = 'active';
sub.plan = order.plan || sub.plan;
sub.monthlyPrice = planPrice(sub.plan);
sub.activatedAt = order.paidAt;
sub.renewalMode = offer.renewalMode || 'manual_renewal_until_recurring_billing_enabled';
sub.autoRecurringBilling = offer.autoRecurringBilling === true;
sub.expiresAt = new Date(Date.parse(order.paidAt || nowIso()) + Number(offer.accessDurationDays || 30) * 24 * 60 * 60 * 1000).toISOString();
}
}
ensureFulfillmentForOrder(db, order);
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: resolvedPaymentId,
providerStatus,
eventType: 'payment.provider.confirmed',
source,
payload: { providerStatusRaw: payment?.status || null, paidAt: order.paidAt }
});
return { ok: true, order, paymentSession, payment };
}
case 'VIRTUAL_ACCOUNT_ISSUED':
case 'READY': {
order.status = 'pending';
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: resolvedPaymentId,
providerStatus,
eventType: 'payment.provider.pending',
source,
payload: { providerStatusRaw: payment?.status || null }
});
return { ok: true, order, paymentSession, payment, pendingSettlement: true };
}
case 'CANCELLED':
case 'PARTIAL_CANCELLED': {
if (canTransition(order.status, 'cancelled', ORDER_STATUS_TRANSITIONS) || order.status === 'cancelled' || order.status === 'paid') {
order.status = 'cancelled';
}
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: resolvedPaymentId,
providerStatus,
eventType: 'payment.provider.cancelled',
source,
payload: { providerStatusRaw: payment?.status || null }
});
return { ok: true, order, paymentSession, payment, cancelled: true };
}
case 'FAILED':
default: {
if (canTransition(order.status, 'failed', ORDER_STATUS_TRANSITIONS) || order.status === 'failed') order.status = 'failed';
paymentSession.providerState = 'failed';
recordPaymentStateEvent(db, {
order,
paymentSession,
paymentId: resolvedPaymentId,
providerStatus: 'failed',
eventType: 'payment.provider.failed',
source,
payload: { providerStatusRaw: payment?.status || null }
});
return { ok: false, reason: 'payment_not_completed', order, paymentSession, payment };
}
}
}
function buildPortalSummary(db, params = {}) {
const orderId = params.orderId ? String(params.orderId) : '';
const siteId = params.siteId ? String(params.siteId) : '';
const order = orderId ? (db.orders || []).find(item => item.id === orderId) : null;
const site = findSiteByAny(db, siteId || order?.siteId, order?.domain);
const subscription = site ? (db.subscriptions || []).find(item => item.siteId === site.id) || null : null;
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || null : null;
const guidance = site ? findLatestGuidanceForSite(db, site.id) : null;
const autoFixJobs = site ? (db.autoFixJobs || []).filter(item => item.siteId === site.id).slice(0, 10) : [];
const persistedBoardItems = [...(db.boards || []), ...(db.publications || [])]
.filter(item => item && item.visibility !== 'private')
.sort((a, b) => Date.parse(b.publishedAt || b.createdAt || 0) - Date.parse(a.publishedAt || a.createdAt || 0));
const boardItems = persistedBoardItems.length
? persistedBoardItems.slice(0, 10)
: buildPublicColumnEnginePosts({ pageSize: 10 }).map((item, index) => ({ ...item, id: item.id || `portal-column-${index + 1}`, type: 'column', visibility: 'public', status: 'published', engine: 'product-agent-insight-v1' }));
const lastPublished = boardItems.find(item => item.autoPublished || item.type === 'column' || item.engine === 'public-column-engine-v1' || item.engine === 'product-agent-insight-v1') || boardItems[0] || null;
return {
order,
site,
subscription,
latestScan: scan,
guidance,
autoFixJobs,
boards: boardItems,
publicationCadence: { label: '정기 업데이트', actualPublishing: true, lastPublishedAt: lastPublished?.publishedAt || lastPublished?.createdAt || null },
legalUpdates: (db.legalUpdates || []).slice(0, 10),
plans: buildPlanCatalog(scan?.recommendedPlan || subscription?.plan || 'Report')
};
}
async function readLimitedResponseText(res, maxBytes = TARGET_FETCH_MAX_BYTES) {
const declaredLength = Number(res.headers.get('content-length') || 0);
if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('target_response_too_large');
if (!res.body || typeof res.body.getReader !== 'function') {
const text = await res.text();
if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('target_response_too_large');
return text;
}
const reader = res.body.getReader();
const decoder = new TextDecoder();
let total = 0;
let text = '';
while (true) {
const { done, value } = await reader.read();
if (done) break;
total += value.byteLength;
if (total > maxBytes) {
try { await reader.cancel(); } catch {}
throw new Error('target_response_too_large');
}
text += decoder.decode(value, { stream: true });
}
text += decoder.decode();
return text;
}
async function fetchTargetHtml(target) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), TARGET_FETCH_TIMEOUT_MS);
let current = safeUrl(String(target || '').trim());
try {
if (!current || await isBlockedTargetUrlResolved(current)) return { fetched: false, error: 'blocked_target_url', html: '', finalUrl: String(target || ''), status: 0, contentType: '' };
for (let redirectCount = 0; redirectCount <= TARGET_FETCH_MAX_REDIRECTS; redirectCount += 1) {
const res = await fetch(current.toString(), {
redirect: 'manual',
signal: controller.signal,
headers: {
'user-agent': 'Mozilla/5.0 (compatible; NV0/0.1; +https://nv0.kr/bot)',
'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6'
}
});
const location = res.headers.get('location');
if ([301, 302, 303, 307, 308].includes(res.status) && location) {
const next = new URL(location, current);
if (await isBlockedTargetUrlResolved(next)) return { fetched: false, error: 'blocked_redirect_target', html: '', finalUrl: next.toString(), status: res.status, contentType: '' };
current = next;
continue;
}
const contentType = String(res.headers.get('content-type') || '');
const html = contentType.includes('text/html') ? await readLimitedResponseText(res, TARGET_FETCH_MAX_BYTES) : '';
return { fetched: true, status: res.status, html, finalUrl: current.toString(), contentType, error: null };
}
return { fetched: false, error: 'too_many_redirects', html: '', finalUrl: current.toString(), status: 0, contentType: '' };
} catch (error) {
return { fetched: false, error: error.message, html: '', finalUrl: current?.toString?.() || target, status: 0, contentType: '' };
} finally {
clearTimeout(timeout);
}
}
function canonicalProbeUrl(target, pathname = '/') {
const url = safeUrl(String(target || '').trim());
if (!url) return null;
const next = new URL(url.toString());
next.pathname = pathname || '/';
next.search = '';
next.hash = '';
return next.toString();
}
function normalizeInternalUrl(href = '', baseUrl = '') {
const raw = String(href || '').trim();
if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) return null;
try {
const base = new URL(baseUrl);
const url = new URL(raw, base);
if (url.origin !== base.origin) return null;
url.hash = '';
url.search = '';
return url.toString();
} catch {
return null;
}
}
function scoreProbeUrl(url = '') {
const value = String(url || '').toLowerCase();
let score = 0;
const rules = [
[120, /privacy|개인정보/],
[112, /terms|약관/],
[108, /refund|return|exchange|cancel|환불|반품|교환|취소/],
[102, /contact|support|cs|help|faq|문의|고객센터/],
[98, /business|company|about|회사|소개|사업자/],
[92, /checkout|cart|order|payment|subscribe|결제|주문|장바구니/],
[84, /shipping|delivery|guide|배송|납품|제공/],
[80, /pricing|plans|price|상품|product|service|서비스|요금/],
[72, /notice|공지|policy|정책/]
];
for (const [weight, pattern] of rules) if (pattern.test(value)) score = Math.max(score, weight);
if (/\/$/.test(value)) score = Math.max(score, 70);
return score;
}
function extractInternalCandidateLinks(html = '', baseUrl = '') {
const links = [];
const source = String(html || '');
const hrefRe = /<a\b[^>]*?href\s*=\s*(['"])(.*?)\1/gi;
let match;
while ((match = hrefRe.exec(source))) {
const url = normalizeInternalUrl(match[2], baseUrl);
if (url) links.push(url);
}
const formRe = /<form\b[^>]*?action\s*=\s*(['"])(.*?)\1/gi;
while ((match = formRe.exec(source))) {
const url = normalizeInternalUrl(match[2], baseUrl);
if (url) links.push(url);
}
return links;
}
function buildProbeUrls(target, discoveredLinks = []) {
const url = safeUrl(String(target || '').trim());
if (!url) return [];
const original = new URL(url.toString());
original.hash = '';
original.search = '';
const home = canonicalProbeUrl(url.toString(), '/');
const staticPaths = [
'/', '/privacy', '/privacy-policy', '/policy/privacy', '/terms', '/terms-of-use', '/policy/terms',
'/refund', '/return', '/exchange', '/cancel', '/shipping', '/delivery', '/business-info', '/company', '/about',
'/contact', '/support', '/cs', '/help', '/faq', '/notice', '/guide', '/pricing', '/plans', '/product', '/products',
'/checkout', '/cart', '/order', '/payment', '/subscribe'
];
const candidates = [original.toString(), home, ...discoveredLinks, ...staticPaths.map(pathname => canonicalProbeUrl(url.toString(), pathname))]
.filter(Boolean)
.map(item => normalizeInternalUrl(item, url.toString()))
.filter(Boolean);
const seen = new Set();
const unique = [];
for (const item of candidates) {
if (seen.has(item)) continue;
seen.add(item);
unique.push(item);
}
const [primary, ...rest] = unique;
const rankedRest = rest.map(item => ({ url: item, score: scoreProbeUrl(item) })).sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).map(item => item.url);
return [primary, ...rankedRest].slice(0, TARGET_FETCH_MAX_PAGES);
}
async function mapWithConcurrency(items, limit, mapper) {
const out = new Array(items.length);
let index = 0;
async function worker() {
while (index < items.length) {
const current = index++;
out[current] = await mapper(items[current], current);
}
}
await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
return out;
}
function compactPageRecord(probeUrl, page, source = 'probe') {
const contentLength = stripHtml(page.html || '').length;
return {
url: probeUrl,
finalUrl: page.finalUrl || probeUrl,
status: Number(page.status || 0),
contentType: page.contentType || '',
contentLength,
fetched: page.fetched === true,
error: page.error || null,
source,
html: page.html || ''
};
}
async function fetchTargetHtmlBundle(target) {
const url = safeUrl(String(target || '').trim());
if (!url) return { fetched: false, error: 'invalid url', html: '', finalUrl: target, status: 0, contentType: '', pages: [], probeCount: 0 };
const primaryUrl = canonicalProbeUrl(url.toString(), url.pathname || '/') || url.toString();
const primaryFetch = await fetchTargetHtml(primaryUrl);
const discovery = await discoverTargetAutomationLinks(url.toString(), primaryFetch, { timeoutMs: TARGET_FETCH_TIMEOUT_MS, concurrency: TARGET_FETCH_CONCURRENCY, robotsEnabled: TARGET_FETCH_ROBOTS_ENABLED, sitemapEnabled: TARGET_FETCH_SITEMAP_ENABLED, maxSitemapUrls: TARGET_FETCH_MAX_SITEMAP_URLS, maxDiscoveryResources: TARGET_FETCH_MAX_DISCOVERY_RESOURCES, maxBytes: TARGET_FETCH_MAX_BYTES, maxRedirects: TARGET_FETCH_MAX_REDIRECTS, automationLevel: TARGET_FETCH_AUTOMATION_LEVEL });
const discovered = discovery.discoveredLinks || [];
const urls = buildProbeUrls(target, discovered);
if (!urls.length) return { fetched: false, error: 'invalid url', html: '', finalUrl: target, status: 0, contentType: '', pages: [], probeCount: 0 };
const primaryRecord = compactPageRecord(primaryUrl, primaryFetch, 'primary');
const remaining = urls.filter(item => item !== primaryUrl).slice(0, Math.max(0, TARGET_FETCH_MAX_PAGES - 1));
const restRecords = await mapWithConcurrency(remaining, TARGET_FETCH_CONCURRENCY, async (probeUrl) => compactPageRecord(probeUrl, await fetchTargetHtml(probeUrl), 'adaptive_probe'));
const allPages = [primaryRecord, ...restRecords];
const successful = allPages.filter(page => page.fetched && page.status >= 200 && page.status < 400 && page.contentLength > 20);
const primary = successful[0] || allPages[0] || primaryRecord;
const combinedHtml = successful.map((page) => '\n<!-- NV0_PAGE:' + (page.finalUrl || page.url) + ' -->\n' + page.html).join('\n');
return {
...primary,
fetched: successful.length > 0,
html: combinedHtml || primary.html || '',
finalUrl: primary.finalUrl || urls[0],
pages: allPages.map(({ url, finalUrl, status, contentType, contentLength, fetched, error, source }) => ({ url, finalUrl, status, contentType, contentLength, fetched, error, source })),
probeCount: urls.length,
coverageStrategy: 'free_auto_home_robots_sitemap_key_path_probe',
discoveredLinkCount: discovered.length,
automationDiscovery: {
level: discovery.level,
capabilities: discovery.capabilities,
htmlLinkCount: discovery.htmlLinkCount,
sitemapLinkCount: discovery.sitemapLinkCount,
robotsEnabled: discovery.robotsEnabled,
sitemapEnabled: discovery.sitemapEnabled,
resourceFetches: discovery.resources
}
};
}
async function buildBuiltinScanResultWithFetchBudget(input, startedAt, provider = 'builtin', upstreamError = '') {
const url = safeUrl(String(input).trim());
let timeoutId = null;
let fetched;
if (!TARGET_FETCH_ENABLED || !url) {
fetched = { fetched: false, html: '', error: TARGET_FETCH_ENABLED ? 'invalid url' : 'target fetch disabled', finalUrl: input, status: 0, pages: [], probeCount: 0 };
} else {
const fetchTask = fetchTargetHtmlBundle(url.toString())
.then(value => ({ ok: true, value }))
.catch(error => ({ ok: false, error }));
const timeoutTask = new Promise(resolve => { timeoutId = setTimeout(() => resolve({ timedOut: true }), SCAN_SOFT_TIMEOUT_MS); });
const settled = await Promise.race([fetchTask, timeoutTask]);
if (timeoutId) clearTimeout(timeoutId);
if (settled?.timedOut) {
fetched = { fetched: false, html: '', error: `scan soft timeout after ${SCAN_SOFT_TIMEOUT_MS}ms`, finalUrl: input, status: 0, pages: [], probeCount: 0, coverageStrategy: 'soft_timeout_safe_fallback' };
} else if (settled?.ok) {
fetched = settled.value;
} else {
fetched = { fetched: false, html: '', error: settled?.error?.message || 'target fetch failed', finalUrl: input, status: 0, pages: [], probeCount: 0, coverageStrategy: 'fetch_error_safe_fallback' };
}
}
const scan = buildBuiltinScanResult(input, fetched, startedAt);
scan.provider = provider;
if (upstreamError) scan.fetchError = upstreamError;
if (fetched?.error) scan.fetchError = scan.fetchError || fetched.error;
if (fetched?.coverageStrategy === 'soft_timeout_safe_fallback') {
scan.summary = `${String(input).trim()} 응답이 지연되어 안전 요약 결과를 먼저 생성했습니다. 다시 실행하면 서버 수집 결과로 갱신됩니다.`;
scan.scoreModel = { ...(scan.scoreModel || {}), confidenceLabel: '시간 제한 안전 결과', manualReviewCount: Math.max(1, Number(scan.scoreModel?.manualReviewCount || 0)) };
}
return scan;
}

async function scanResultFor(input, db = null) {
const startedAt = Date.now();
const cached = findReusableScan(db, input);
if (cached) return cached;
if (SCAN_PROVIDER === 'external_http') {
try {
const external = await runExternalScan(input);
external.elapsedMs = external.elapsedMs || (Date.now() - startedAt);
return await enhanceScanWithAiReview(external);
} catch (error) {
if (!SCAN_PROVIDER_FALLBACK) throw error;
const url = safeUrl(String(input).trim());
if (url && await isBlockedTargetUrlResolved(url)) throw new Error('blocked target url');
const fallback = await buildBuiltinScanResultWithFetchBudget(input, startedAt, 'builtin_fallback', error.message);
fallback.resultStatus = fallback.fetched ? 'completed_live_fetch_after_provider_error' : 'completed_limited_fallback';
fallback.resultLimitNotice = fallback.fetched ? '외부 진단 제공자는 실패했지만 공개 페이지 수집에 성공해 내장 엔진으로 분석했습니다.' : '외부 진단 제공자와 대상 사이트 수집이 모두 제한되어 제한 분석을 수행했습니다.';
fallback.summary = `${String(input).trim()} 외부 진단 실패로 내장 엔진으로 분석했습니다. ${fallback.resultLimitNotice}`;
return await enhanceScanWithAiReview(fallback);
}
}
const url = safeUrl(String(input).trim());
if (url && await isBlockedTargetUrlResolved(url)) {
return await enhanceScanWithAiReview(buildBuiltinScanResult(input, { fetched: false, html: '', error: 'blocked target url', finalUrl: input, status: 0 }, startedAt));
}
const builtin = await buildBuiltinScanResultWithFetchBudget(input, startedAt, 'builtin');
return await enhanceScanWithAiReview(builtin);
}
function backupSecurityConfigSummary() {
return backupOps.securitySummary();
}

function isRefundRequestAllowed(order) {
if (!order || order.status !== 'paid') return false;
const paidAt = Date.parse(order.paidAt || order.createdAt || '');
if (!Number.isFinite(paidAt)) return true;
return Date.now() - paidAt <= REFUND_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}


function hardeningContext(db = {}) {
const backup = backupSecurityConfigSummary();
return {
baseUrl: seoBaseUrl(), releasePhase: RELEASE_PHASE, version: SECURITY_POSTURE_VERSION, checkedAt: nowIso(),
platformCommercial: PLATFORM.commercial, databaseUrl: DATABASE_URL, pgSslMode: process.env.PGSSLMODE || '',
adminAuthLimit: ADMIN_AUTH_LIMIT, adminAuthWindowMs: ADMIN_AUTH_WINDOW_MS, publicScanLimit: PUBLIC_SCAN_LIMIT, publicScanWindowMs: PUBLIC_SCAN_WINDOW_MS,
sessionTtlMs: SESSION_TTL_MS, adminIpAllowlistCount: ADMIN_IP_ALLOWLIST.length, redisConfigured: Boolean(process.env.NV0_REDIS_URL),
slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS, auditLogRetentionCount: AUDIT_LOG_RETENTION_COUNT, dataDestructionGraceDays: DATA_DESTRUCTION_GRACE_DAYS,
backupConfigured: backup.objectStorage?.configured || false, supportMode: BUSINESS_PROFILE.customerServicePhone ? 'phone_or_email' : 'email_only'
};
}
function buildOpenApiSpec() { return buildOpenApiSpecFromContext(hardeningContext()); }
function buildHardeningMatrix(db = {}) { return buildHardeningMatrixFromContext(hardeningContext(db)); }
function buildReleaseReadiness(db) {
const requiredEnv = ['NV0_PUBLIC_BASE_URL','NV0_SUPPORT_EMAIL'];
if (PLATFORM.commercial) {
requiredEnv.push('NV0_DATABASE_URL','NV0_REDIS_URL','NV0_ADMIN_IP_ALLOWLIST','NV0_SMTP_URL');
if (COMMERCIAL_LAUNCH_READY) requiredEnv.push('NV0_TURNSTILE_SECRET','NV0_TURNSTILE_SITE_KEY','NV0_PORTONE_STORE_ID','NV0_PORTONE_CHANNEL_KEY','NV0_PORTONE_API_SECRET','NV0_PORTONE_WEBHOOK_SECRET','NV0_MAIL_ORDER_REGISTRATION_NUMBER');
}
const missingEnv = requiredEnv.filter(name => !String(process.env[name] || '').trim());
const placeholderEnv = PLATFORM.commercial ? requiredEnv.filter(name => isPlaceholderConfigValue(process.env[name])) : [];
const counts = {
orders: (db.orders || []).length,
customers: (db.customers || []).length,
assets: (db.purchasedAssets || []).length,
queuedEmails: (db.emailOutbox || []).filter(item => ['queued','retry_scheduled'].includes(item.status)).length,
failedEmails: (db.emailOutbox || []).filter(item => item.status === 'failed').length,
idempotencyKeys: (db.idempotencyKeys || []).length,
unresolvedRefunds: (db.refundRequests || []).filter(item => ['requested','reviewing'].includes(item.status)).length,
auditLogs: (db.auditLogs || []).length,
expiredCustomerSessions: (db.customerSessions || []).filter(item => Date.parse(item.expiresAt || 0) < Date.now()).length,
expiredPasswordResetTokens: (db.passwordResetTokens || []).filter(item => Date.parse(item.expiresAt || 0) < Date.now()).length
};
const gates = [
{ key: 'privacy_minimized', ok: true, label: '회원가입·결제 최소 개인정보 수집' },
{ key: 'consent_required', ok: true, label: '개인정보·이용약관·환불정책·디지털 산출물 제공 동의 필수' },
{ key: 'mail_order_registration', ok: !COMMERCIAL_LAUNCH_READY || Boolean(BUSINESS_PROFILE.mailOrderRegistrationNumber), label: COMMERCIAL_LAUNCH_READY ? '통신판매업 신고번호 운영환경 입력' : '정식 결제 오픈 전 통신판매업 신고번호 검증 보류' },
{ key: 'secure_headers', ok: true, label: '보안 헤더 기본 적용' },
{ key: 'payment_provider_configured', ok: PRELAUNCH_MODE ? PAYMENT_PROVIDER === 'disabled' : (PAYMENT_PROVIDER !== 'demo' || !PLATFORM.commercial), label: PRELAUNCH_MODE ? '정식 결제 오픈 전 결제 기능 비활성화' : '상용 결제 제공자 사용' },
{ key: 'webhook_signature_strict', ok: !PLATFORM.commercial || (PAYMENT_PROVIDER !== 'portone_v2') || (PORTONE_WEBHOOK_VERIFY_MODE === 'strict' && !!PORTONE_WEBHOOK_SECRET), label: '결제 웹훅 서명 엄격 검증' },
{ key: 'admin_ip_policy_reviewed', ok: ADMIN_IP_ALLOWLIST.length > 0 || !PLATFORM.commercial, label: '관리자 IP 제한 정책 설정' },
{ key: 'missing_env', ok: missingEnv.length === 0, label: '필수 운영 환경변수 설정', missing: missingEnv },
{ key: 'placeholder_env_removed', ok: placeholderEnv.length === 0, label: '운영 환경변수 placeholder 제거', placeholder: placeholderEnv },
{ key: 'https_public_base_url', ok: !PLATFORM.commercial || /^https:\/\//.test(String(process.env.NV0_PUBLIC_BASE_URL || '')), label: '공개 URL HTTPS 사용' },
{ key: 'turnstile_enabled', ok: !COMMERCIAL_LAUNCH_READY || TURNSTILE_PUBLIC_ENABLED, label: COMMERCIAL_LAUNCH_READY ? '상용 봇 방지 Turnstile 활성화' : 'prelaunch Turnstile 선택 적용' },
{ key: 'smtp_configured', ok: !PLATFORM.commercial || !isPlaceholderConfigValue(process.env.NV0_SMTP_URL), label: '거래성 이메일 SMTP 설정' },
{ key: 'support_email', ok: isValidEmail(BUSINESS_PROFILE.contactEmail), label: '지원 이메일 유효성' },
{ key: 'operator_alert_email', ok: isValidEmail(OPERATOR_ALERT_EMAIL), label: '운영 알림 이메일 유효성' },
{ key: 'hardening_matrix_50', ok: buildHardeningMatrix(db).checks.length === 50, label: '50개 보안·운영·QA 하드닝 매트릭스 유지' },
{ key: 'data_retention_cleanup_ready', ok: true, label: '만료 세션·토큰·탈퇴 계정 정리 로직 준비' },
{ key: 'backup_encryption_required', ok: !PLATFORM.commercial || (BACKUP_REMOTE_REQUIRE_ENCRYPTION && !!BACKUP_ENCRYPTION_SECRET), label: '상용 백업 암호화 필수' },
{ key: 'legal_evidence_versioned', ok: true, label: '동의·약관·환불·개인정보 버전 증적 기록' },
{ key: 'governance_snapshot', ok: Boolean(PHASE313_GOVERNANCE_VERSION), label: '운영 거버넌스 기준 적용' }
];
return { phase: RELEASE_PHASE, target: PLATFORM.target, commercial: PLATFORM.commercial, deploymentStage: DEPLOYMENT_STAGE, commercialLaunchReady: COMMERCIAL_LAUNCH_READY, prelaunchMode: PRELAUNCH_MODE, paymentProvider: PAYMENT_PROVIDER, persistenceMode: PERSISTENCE_MODE, storageMode: STORAGE_MODE, secureRecordStore: persistence.secureRecordStore || null, dataRetentionDays: DATA_RETENTION_DAYS, refundRequestWindowDays: REFUND_REQUEST_WINDOW_DAYS, missingEnv, placeholderEnv, counts, gates, ready: gates.every(g => g.ok), checkedAt: nowIso() };
}
function isPlaceholderConfigValue(value) {
const text = String(value || '').trim().toLowerCase();
if (!text) return true;
return ['replace-with', 'example.com', 'localhost', '127.0.0.1', 'changeme', 'your-', 'dummy', 'test_'].some(token => text.includes(token));
}
function buildProductionLaunchChecklist(db) {
const readiness = buildReleaseReadiness(db);
const mustNotBePlaceholder = [
'NV0_PUBLIC_BASE_URL','NV0_SUPPORT_EMAIL','NV0_DATABASE_URL','NV0_REDIS_URL','NV0_TURNSTILE_SECRET',
'NV0_TURNSTILE_SITE_KEY','NV0_ADMIN_IP_ALLOWLIST','NV0_HOSTING_PROVIDER',
'NV0_PRIVACY_OFFICER_EMAIL','NV0_SMTP_URL'
];
if (COMMERCIAL_LAUNCH_READY && PAYMENT_PROVIDER === 'portone_v2') {
mustNotBePlaceholder.push('NV0_PORTONE_STORE_ID','NV0_PORTONE_CHANNEL_KEY','NV0_PORTONE_API_SECRET','NV0_PORTONE_WEBHOOK_SECRET');
}
if (COMMERCIAL_LAUNCH_READY) mustNotBePlaceholder.push('NV0_MAIL_ORDER_REGISTRATION_NUMBER');
const placeholderEnv = PLATFORM.commercial ? mustNotBePlaceholder.filter(name => isPlaceholderConfigValue(process.env[name])) : [];
const checks = [
{ key: 'release_readiness_green', ok: readiness.ready, label: '릴리즈 준비상태 게이트 통과' },
{ key: 'no_placeholder_env', ok: placeholderEnv.length === 0, label: '운영 환경변수 placeholder 제거', details: placeholderEnv },
{ key: 'production_node_env', ok: NODE_ENV === 'production' || !PLATFORM.commercial, label: 'NODE_ENV=production' },
{ key: 'https_public_base_url', ok: /^https:\/\//.test(String(process.env.NV0_PUBLIC_BASE_URL || '')) || !PLATFORM.commercial, label: '공개 URL HTTPS 사용' },
{ key: 'turnstile_enabled', ok: !COMMERCIAL_LAUNCH_READY || TURNSTILE_PUBLIC_ENABLED, label: COMMERCIAL_LAUNCH_READY ? '봇 방지 Turnstile 활성화' : 'prelaunch Turnstile 선택 적용' },
{ key: 'smtp_configured', ok: !isPlaceholderConfigValue(process.env.NV0_SMTP_URL) || !PLATFORM.commercial, label: '거래성 이메일 SMTP 설정' },
{ key: 'strict_webhook', ok: PAYMENT_PROVIDER !== 'portone_v2' || PORTONE_WEBHOOK_VERIFY_MODE === 'strict' || !PLATFORM.commercial, label: PAYMENT_PROVIDER === 'portone_v2' ? 'PortOne 웹훅 strict 검증' : '결제 공급자 비활성/비PortOne 상태' },
{ key: 'admin_ip_allowlist', ok: ADMIN_IP_ALLOWLIST.length > 0 || !PLATFORM.commercial, label: '관리자 IP allowlist 설정' },
{ key: 'runtime_clean_enough', ok: (db.pendingJobs || []).length === 0 && (db.emailOutbox || []).filter(item => item.status === 'sending').length === 0, label: '배포 직전 서비스 환경 미완료 작업 없음' },
{ key: 'unresolved_refunds_empty', ok: (db.refundRequests || []).filter(item => ['requested','reviewing'].includes(item.status)).length === 0, label: '미처리 환불 요청 없음' },
{ key: 'failed_email_reviewed', ok: (db.emailOutbox || []).filter(item => item.status === 'failed').length === 0, label: '실패 이메일 없음' }
];
const blockers = checks.filter(item => !item.ok).map(item => ({ key: item.key, label: item.label, details: item.details || null }));
return { ok: blockers.length === 0, phase: RELEASE_PHASE, checkedAt: nowIso(), readiness, checks, blockers };
}
function buildCommercialFinalGate(db) {
const checklist = buildProductionLaunchChecklist(db);
const readiness = buildReleaseReadiness(db);
const paidWithoutAssets = (db.orders || []).filter(order => order.status === 'paid' && !(db.purchasedAssets || []).some(asset => asset.orderId === order.id));
const pendingWebhooks = (db.webhookInbox || []).filter(item => !['processed','ignored','failed'].includes(item.status || ''));
const settlementBlockers = [];
if (paidWithoutAssets.length) settlementBlockers.push({ key: 'paid_orders_without_assets', count: paidWithoutAssets.length, label: '결제 완료 주문 중 산출물 미발행 항목 존재' });
if (pendingWebhooks.length) settlementBlockers.push({ key: 'unprocessed_webhooks', count: pendingWebhooks.length, label: '처리되지 않은 결제 웹훅 존재' });
const blockers = [...checklist.blockers, ...settlementBlockers];
return {
ok: blockers.length === 0,
phase: RELEASE_PHASE,
checkedAt: nowIso(),
summary: {
remainingMiddleCategories: blockers.length ? 4 : 0,
remainingDetailedItems: blockers.length,
commercialCompletion: blockers.length ? 'blocked' : 'ready_for_cutover'
},
readiness,
checklist,
settlement: {
paidOrdersWithoutAssets: paidWithoutAssets.map(order => ({ id: order.id, plan: order.plan, paidAt: order.paidAt || null })),
pendingWebhooks: pendingWebhooks.map(item => ({ id: item.id, eventType: item.eventType, receivedAt: item.receivedAt, status: item.status }))
},
blockers
};
}
function appendOperationalEvent(db, level, event, meta = {}) {
db.operationalEvents ||= [];
const item = { id: uid('ops'), at: nowIso(), level, event, meta: maskSensitive(meta) };
db.operationalEvents.unshift(item);
db.operationalEvents = db.operationalEvents.slice(0, 500);
return item;
}
function appendAudit(db, req, event, meta = {}) {
db.auditLogs ||= [];
const entry = {
id: uid('audit'),
at: nowIso(),
event,
ipHash: pseudonymizeIp(clientIp(req)),
method: req.method,
path: req._nv0RouteState?.pathname || requestUrlFrom(req).pathname,
meta: sanitizePrivacyPayload(sanitizeAuditPayload(maskSensitive(meta)))
};
db.auditLogs.unshift(entry);
db.auditLogs = db.auditLogs.slice(0, AUDIT_LOG_RETENTION_COUNT);
return entry;
}
function upsertPaymentEvent(db, event) {
db.paymentEvents ||= [];
const normalized = {
id: event.id || uid('pevt'),
at: event.at || nowIso(),
provider: event.provider || PAYMENT_PROVIDER,
eventType: event.eventType || 'unknown',
orderId: event.orderId || null,
paymentSessionId: event.paymentSessionId || null,
paymentId: event.paymentId || null,
providerStatus: event.providerStatus || null,
orderStatus: event.orderStatus || null,
source: event.source || 'system',
payload: sanitizePrivacyPayload(sanitizeAuditPayload(event.payload || {}))
};
const existingIndex = db.paymentEvents.findIndex(item => item.id === normalized.id);
if (existingIndex >= 0) db.paymentEvents.splice(existingIndex, 1);
db.paymentEvents.unshift(normalized);
db.paymentEvents = db.paymentEvents.slice(0, 1000);
return normalized;
}
function appendWebhookInbox(db, record) {
db.webhookInbox ||= [];
const normalized = {
id: record.id || uid('wh'),
provider: record.provider || PAYMENT_PROVIDER,
eventType: record.eventType || 'unknown',
receivedAt: record.receivedAt || nowIso(),
paymentId: record.paymentId || null,
signaturePresent: !!record.signaturePresent,
verified: record.verified === true,
verificationMode: record.verificationMode || 'refetch_only',
status: record.status || 'received',
rawSha256: record.rawSha256 || null,
orderId: record.orderId || null,
reason: record.reason || null,
payload: sanitizePrivacyPayload(sanitizeAuditPayload(record.payload || {}))
};
db.webhookInbox.unshift(normalized);
db.webhookInbox = db.webhookInbox.slice(0, 1000);
return normalized;
}
function recordPaymentStateEvent(db, { order, paymentSession, paymentId, providerStatus, eventType, source, payload }) {
return upsertPaymentEvent(db, {
provider: paymentSession?.provider || PAYMENT_PROVIDER,
eventType,
orderId: order?.id || null,
paymentSessionId: paymentSession?.id || null,
paymentId: paymentId || paymentSession?.providerPaymentId || order?.id || null,
providerStatus: providerStatus || paymentSession?.providerState || null,
orderStatus: order?.status || null,
source,
payload
});
}
async function createBackupSnapshot(options = {}) {
return backupOps.createSnapshot(options);
}
async function listBackupSnapshots() {
return backupOps.listSnapshots();
}
async function pruneBackupSnapshots() {
return backupOps.pruneSnapshots(BACKUP_RETENTION_COUNT);
}
async function restoreBackupSnapshot(name) {
return backupOps.restoreSnapshot(name);
}

function sanitizedEnvSummary() {
return {
NODE_ENV,
PORT,
PLATFORM_TARGET: PLATFORM.target,
COMMERCIAL_TARGET: PLATFORM.commercial,
TRUST_PROXY_HEADERS,
ENABLE_TURNSTILE,
TURNSTILE_CONFIGURED,
TURNSTILE_PUBLIC_ENABLED,
TURNSTILE_SITE_KEY_PRESENT: !!TURNSTILE_SITE_KEY,
TURNSTILE_SECRET_PRESENT: !!TURNSTILE_SECRET,
PUBLIC_SCAN_LIMIT,
PUBLIC_SCAN_WINDOW_MS,
ADMIN_AUTH_LIMIT,
ADMIN_AUTH_WINDOW_MS,
SESSION_TTL_MS,
MAX_JSON_BODY_BYTES,
MAX_MULTIPART_BODY_BYTES,
BACKUP_RETENTION_COUNT,
backupSecurity: backupSecurityConfigSummary(),
AUDIT_LOG_RETENTION_COUNT,
STORAGE_MODE,
RUNTIME_DIR,
RUNTIME_EPHEMERAL: process.env.NV0_RUNTIME_EPHEMERAL === 'true',
SCAN_PROVIDER,
SCAN_PROVIDER_URL_PRESENT: !!SCAN_PROVIDER_URL,
SCAN_PROVIDER_FALLBACK,
TARGET_FETCH_ENABLED,
PAYMENT_PROVIDER,
PAYMENT_PROVIDER_URL_PRESENT: !!PAYMENT_PROVIDER_URL,
ALLOWED_ADMIN_ORIGINS,
ADMIN_AUTH_MODE,
ADMIN_KEY_CONFIGURED: ADMIN_KEY !== 'change-this-key',
BOOTSTRAP_ADMIN_EMAIL_PRESENT: !!String(process.env.NV0_BOOTSTRAP_ADMIN_EMAIL || '').trim(),
BOOTSTRAP_ADMIN_PASSWORD_PRESENT: !!String(process.env.NV0_BOOTSTRAP_ADMIN_PASSWORD || ''),
SMTP_URL_PRESENT: !!String(process.env.NV0_SMTP_URL || '').trim(),
SMTP_LIVE_ADAPTER: true,
EMAIL_FROM_PRESENT: !!String(process.env.NV0_EMAIL_FROM || '').trim()
};
}
async function buildOpsReport() {
const db = await readDb();
const backups = await listBackupSnapshots();
const uploads = await fs.readdir(UPLOADS_DIR).catch(() => []);
const sessionsSummary = serializeSessions().map(({ sid, ...rest }) => ({
sidTail: sid.slice(-8),
...rest
}));
return {
generatedAt: nowIso(),
runtime: {
pid: process.pid,
uptimeSec: Math.round(process.uptime()),
memoryRss: process.memoryUsage().rss,
},
config: sanitizedEnvSummary(),
counts: {
orders: db.orders.length,
subscriptions: db.subscriptions.length,
publications: db.publications.length,
boards: db.boards.length,
library: db.library.length,
scans: db.scans.length,
sites: db.sites.length,
legalUpdates: db.legalUpdates.length,
autoFixJobs: db.autoFixJobs.length,
paymentSessions: db.paymentSessions.length,
paymentEvents: (db.paymentEvents || []).length,
webhookInbox: (db.webhookInbox || []).length,
auditLogs: db.auditLogs.length,
backups: backups.length,
uploads: uploads.length,
sessions: sessionsSummary.length,
adminUsers: db.adminUsers.length,
adminRoleBindings: db.adminRoleBindings.length,
adminSessions: db.adminSessions.length,
},
sessions: sessionsSummary,
backups: backups.slice(0, 20).map(({ name, size, mtime }) => ({ name, size, mtime })),
uploads: uploads.slice(0, 50),
recentAuditLogs: db.auditLogs.slice(0, 25)
};
}
async function writeOpsReportSnapshot() {
await ensureRuntime();
const stamp = nowIso().replace(/[:.]/g, '-');
const report = await buildOpsReport();
const filePath = path.join(REPORTS_DIR, `ops-report-${stamp}.json`);
await fs.writeFile(filePath, JSON.stringify(report, null, 2));
return { filePath, report };
}
async function runAutomaticBackup(reason = 'scheduled') {
return backupOps.runAutomatic(reason);
}
function parseMultipart(rawBuffer, boundary) {
const result = { fields: {}, files: [] };
const textBody = rawBuffer.toString('latin1');
const parts = textBody.split(`--${boundary}`);
for (const part of parts) {
if (!part || part === '--\r\n' || part === '--') continue;
const idx = part.indexOf('\r\n\r\n');
if (idx < 0) continue;
const head = part.slice(0, idx);
let body = part.slice(idx + 4);
body = body.replace(/\r\n$/, '');
const name = /name="([^"]+)"/.exec(head)?.[1];
const filename = /filename="([^"]*)"/.exec(head)?.[1];
const contentType = /Content-Type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() || 'application/octet-stream';
if (!name) continue;
if (filename !== undefined && filename !== '') {
result.files.push({
field: name,
filename,
contentType,
content: Buffer.from(body, 'latin1')
});
} else {
result.fields[name] = body;
}
}
return result;
}
const UPLOAD_MIME_BY_EXT=Object.freeze({
'.txt': new Set(['text/plain', 'application/octet-stream']),
'.md': new Set(['text/markdown', 'text/plain', 'application/octet-stream']),
'.csv': new Set(['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']),
'.json': new Set(['application/json', 'text/plain', 'application/octet-stream']),
'.pdf': new Set(['application/pdf', 'application/octet-stream']),
'.png': new Set(['image/png']),
'.jpg': new Set(['image/jpeg']),
'.jpeg': new Set(['image/jpeg']),
'.webp': new Set(['image/webp'])
});
function sanitizeUploadFilename(filename=''){
const base = path.basename(String(filename || 'upload').replace(/[\/]+/g, '_'));
const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120);
return cleaned&&cleaned!=='.'&&cleaned!=='..'?cleaned:'upload.bin';
}
function isAllowedUpload(file) {
if (!file || !Buffer.isBuffer(file.content)) return false;
if (file.content.length <= 0 || file.content.length > MAX_MULTIPART_BODY_BYTES) return false;
const filename=sanitizeUploadFilename(file.filename);
const ext = path.extname(filename).toLowerCase();
const allowedMime=UPLOAD_MIME_BY_EXT[ext];
if(!allowedMime)return false;
const contentType=String(file.contentType||'').split(';')[0].trim().toLowerCase();
if(contentType&&!allowedMime.has(contentType))return false;
if (ext === '.pdf' && !file.content.subarray(0, 5).equals(Buffer.from('%PDF-'))) return false;
if (ext === '.png' && !file.content.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return false;
if ((ext === '.jpg' || ext === '.jpeg') && !(file.content[0] === 0xff && file.content[1] === 0xd8 && file.content[2] === 0xff)) return false;
if (ext === '.webp' && !(file.content.subarray(0, 4).toString('ascii') === 'RIFF' && file.content.subarray(8, 12).toString('ascii') === 'WEBP')) return false;
return true;
}
async function verifyTurnstile(req, token) {
if (!TURNSTILE_PUBLIC_ENABLED) return { ok: true, skipped: true, reason: ENABLE_TURNSTILE ? 'turnstile_not_configured_or_placeholder' : 'turnstile_disabled' };
const normalizedToken = typeof token === 'string' ? token.trim() : '';
if (!normalizedToken) {
if (PRELAUNCH_MODE) return { ok: true, skipped: true, reason: 'prelaunch_turnstile_token_missing' };
return { ok: false, error: 'turnstile token required' };
}
const form = new URLSearchParams({
secret: TURNSTILE_SECRET,
response: normalizedToken,
remoteip: clientIp(req)
});
try {
const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
method: 'POST',
headers: { 'content-type': 'application/x-www-form-urlencoded' },
body: form.toString()
});
const data = await response.json().catch(() => ({}));
if (data?.success) return { ok: true, raw: data, error: null };
if (PRELAUNCH_MODE) return { ok: true, skipped: true, reason: 'prelaunch_turnstile_verify_soft_fail', raw: data, error: data['error-codes']?.join(', ') || 'turnstile verify failed' };
return { ok: false, raw: data, error: data['error-codes']?.join(', ') || 'turnstile verify failed' };
} catch (error) {
if (PRELAUNCH_MODE) return { ok: true, skipped: true, reason: 'prelaunch_turnstile_network_soft_fail', error: error.message };
return { ok: false, error: error.message || 'turnstile verify request failed' };
}
}
function ensureSiteRecord(db, scan) {
db.sites ||= [];
let site = db.sites.find(item => item.domain === scan.target);
if (!site) {
site = {
id: uid('site'),
domain: scan.target,
industry: scan.industry,
jurisdiction: db.settings.defaultJurisdiction || 'KR',
latestRiskScore: scan.riskScore,
latestRiskLevel: scan.riskLevel,
latestEstimatedMaxPenalty: scan.estimatedMaxPenalty,
lastScanAt: scan.generatedAt,
createdAt: scan.generatedAt,
status: 'active'
};
db.sites.unshift(site);
} else {
site.industry = scan.industry;
site.latestRiskScore = scan.riskScore;
site.latestRiskLevel = scan.riskLevel;
site.latestEstimatedMaxPenalty = scan.estimatedMaxPenalty;
site.lastScanAt = scan.generatedAt;
}
return site;
}
function ensureSubscriptionForSite(db, site, plan) {
db.subscriptions ||= [];
let sub = db.subscriptions.find(item => item.siteId === site.id);
if (!sub) {
sub = { id: uid('sub'), siteId: site.id, plan, status: 'trial', monthlyPrice: planPrice(plan), createdAt: nowIso() };
db.subscriptions.unshift(sub);
} else {
sub.plan = plan || sub.plan;
}
return sub;
}
function createGuidanceDocument(db, site, scan) {
const operationsDocument = buildSiteOperationsDocument(scan || {}, { site, settings: db.settings || {} });
const content = operationsDocument.markdown;
const doc = {
id: uid('guide'),
siteId: site.id,
title: `${site.domain} 맞춤 개선 안내`,
type: 'site_guideline',
version: `v${Date.now()}`,
qualityScore: operationsDocument.qualityScore,
issueAreaCount: operationsDocument.issueAreaCount,
issueElementCount: operationsDocument.issueElementCount,
operationsDocument,
content,
createdAt: nowIso()
};
db.guidanceDocuments ||= [];
db.guidanceDocuments.unshift(doc);
return doc;
}
function seedAutoFixJobs(db, site, scan) {
db.autoFixJobs ||= [];
const jobs = [];
for (const finding of scan.detailFindings.filter(item => item.autoFixEligible).slice(0, db.settings.maxAutoFixPerRun || 5)) {
if (db.autoFixJobs.some(job => job.siteId === site.id && job.findingCode === finding.code && job.status === 'pending')) continue;
const job = {
id: uid('fix'),
siteId: site.id,
findingCode: finding.code,
title: finding.title,
status: 'pending',
mode: db.settings.autoFixMode || 'approval_required',
patchSummary: finding.recommendation,
createdAt: nowIso()
};
db.autoFixJobs.unshift(job);
jobs.push(job);
}
return jobs;
}
function createCtaPublication(db, scan, options = {}) {
return publishProductInsightNow(db, {
  uid,
  nowIso,
  businessProfile: BUSINESS_PROFILE,
  scan,
  intervalMs: CTA_AUTOPUBLISH_INTERVAL_MS,
  autoPublished: options.autoPublished === true,
  reason: options.reason || (options.autoPublished === true ? 'auto_publication' : 'manual_publication'),
  force: options.force === true
});
}

function syncCtaAutopublishSettings(db = {}) {
const result = ensureProductAgentSettings(db, { intervalMs: CTA_AUTOPUBLISH_INTERVAL_MS });
return { changed: result.changed, intervalMs: result.intervalMs };
}
function latestAutoCtaPublication(db = {}) {
return latestProductInsightPublication(db);
}
function ctaAutopublishDueStatus(db = {}, intervalMs = CTA_AUTOPUBLISH_INTERVAL_MS) {
return productInsightDueStatus(db, { intervalMs });
}
function createCtaPublicationIfDue(db, scan, options = {}) {
const settings = db.settings || {};
const { intervalMs } = syncCtaAutopublishSettings(db);
if ((settings.ctaAutopublishEnabled === false || settings.productInsightAutopublishEnabled === false) && options.force !== true) return null;
return publishProductInsightIfDue(db, {
  uid,
  nowIso,
  businessProfile: BUSINESS_PROFILE,
  scan,
  intervalMs,
  autoPublished: true,
  reason: options.reason || 'due_check',
  force: options.force === true
});
}

async function runCtaAutopublish(reason = 'interval') {
const lockKey = 'product-agent-insight-20min';
const locked = await distributedLock.acquire(lockKey, Math.max(30, Math.ceil(CTA_AUTOPUBLISH_INTERVAL_MS / 1000)));
if (!locked) return { ok: true, skipped: 'locked' };
try {
const db = await readDb();
const settings = db.settings || {};
const synced = syncCtaAutopublishSettings(db);
if (settings.ctaAutopublishEnabled === false || settings.productInsightAutopublishEnabled === false) {
if (synced.changed) await writeDb(db);
return { ok: true, skipped: 'disabled' };
}
const due = ctaAutopublishDueStatus(db, synced.intervalMs);
if (!due.due) {
db.productAgentState ||= {};
db.productAgentState.lastDueStatus = { due: false, remainingMs: due.remainingMs, elapsedMs: due.elapsedMs, intervalMs: synced.intervalMs, lastPublishedAt: due.last?.publishedAt || due.last?.createdAt || null };
db.productAgentState.watchdog = { agent: 'cadence-watchdog-agent', decision: 'not-due-yet', remainingMs: due.remainingMs, intervalMs: synced.intervalMs, checkedAt: nowIso() };
await writeDb(db);
return { ok: true, skipped: 'interval', remainingMs: due.remainingMs, intervalMs: synced.intervalMs };
}
const scan = (db.scans || [])[0] || {
requestId: uid('scan'),
target: BUSINESS_PROFILE.domain,
industry: '온라인 사업',
riskScore: 55,
totalFindings: 3,
topFindings: ['지원 고지', '환불 정책 표시', '개인정보 처리방침 위치']
};
let item = null;
try {
  item = publishProductInsightNow(db, { uid, nowIso, businessProfile: BUSINESS_PROFILE, scan, autoPublished: true, intervalMs: synced.intervalMs, reason });
} catch (error) {
  const duplicateOnly = error?.code === 'PRODUCT_INSIGHT_QUALITY_FAILED'
    && Array.isArray(error?.audit?.failed)
    && error.audit.failed.length === 1
    && error.audit.failed[0] === 'notDuplicate';
  db.productAgentState ||= {};
  db.productAgentState.lastRunAt = nowIso();
  db.productAgentState.lastSkippedAt = nowIso();
  if (duplicateOnly) db.productAgentState.lastSkipReason = 'duplicate-insight';
  else db.productAgentState.lastSkipReason = 'quality-gate-failed';
  db.productAgentState.lastDraftAudit = error.audit || null;
  db.productAgentState.lastErrorMessage = error?.message || String(error);
  db.productAgentState.lastErrorCode = error?.code || 'UNKNOWN_PUBLICATION_ERROR';
  db.productAgentState.watchdog = {
    agent: 'cadence-watchdog-agent',
    decision: 'blocked-before-publication',
    intervalMs: synced.intervalMs,
    reason: db.productAgentState.lastSkipReason,
    checkedAt: nowIso()
  };
  appendAudit(db, { headers: {}, socket: {} }, duplicateOnly ? 'system.product_insight.skipped_duplicate' : 'system.product_insight.blocked_quality_gate', {
    reason,
    intervalMs: synced.intervalMs,
    suiteVersion: PRODUCT_AGENT_SUITE_VERSION,
    qualityScore: error.audit?.score,
    failed: error.audit?.failed || [],
    errorCode: error?.code || null
  });
  await writeDb(db);
  if (duplicateOnly) return { ok: true, skipped: 'duplicate-insight', intervalMs: synced.intervalMs, suiteVersion: PRODUCT_AGENT_SUITE_VERSION, audit: error.audit || null };
  return { ok: true, skipped: 'quality-gate-failed', intervalMs: synced.intervalMs, suiteVersion: PRODUCT_AGENT_SUITE_VERSION, audit: error.audit || null };
}
db.productAgentState ||= {};
db.productAgentState.watchdog = { agent: 'cadence-watchdog-agent', decision: 'published', publicationId: item.id, intervalMs: synced.intervalMs, checkedAt: nowIso() };
appendAudit(db, { headers: {}, socket: {} }, 'system.product_insight.published', { id: item.id, reason, intervalMs: synced.intervalMs, suiteVersion: PRODUCT_AGENT_SUITE_VERSION, qualityScore: item.quality?.score });
await writeDb(db);
return { ok: true, publication: item, intervalMs: synced.intervalMs, suiteVersion: PRODUCT_AGENT_SUITE_VERSION };
} finally {
await distributedLock.release(lockKey);
}
}

function createRouteContext() {
return {
ADMIN_AUTH_LIMIT,
ADMIN_AUTH_MODE,
ADMIN_AUTH_WINDOW_MS,
ADMIN_KEY,
AI_REVIEW_ENABLED,
AI_REVIEW_PROVIDER,
AUDIT_LOG_RETENTION_COUNT,
AUTO_BACKUP_ENABLED,
BACKUPS_DIR,
BACKUP_ENCRYPTION_SECRET,
BACKUP_REMOTE_ENABLED,
BACKUP_RETENTION_COUNT,
BUSINESS_PROFILE,
COMMERCIAL_LAUNCH_READY,
CTA_AUTOPUBLISH_INTERVAL_MS,
DATA_DIR,
DEPLOYMENT_RISK_GUARD,
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
RUNTIME_DIR,
SCAN_PROVIDER,
SCAN_PROVIDER_FALLBACK,
SCAN_PROVIDER_URL,
SESSION_TTL_MS,
STORAGE_MODE,
TARGET_FETCH_AUTOMATION_LEVEL,
TARGET_FETCH_ENABLED,
TARGET_FETCH_MAX_DISCOVERY_RESOURCES,
TARGET_FETCH_MAX_BYTES,
TARGET_FETCH_MAX_REDIRECTS,
TARGET_FETCH_MAX_PAGES,
TARGET_FETCH_ROBOTS_ENABLED,
TARGET_FETCH_SITEMAP_ENABLED,
TRUST_PROXY_HEADERS,
TURNSTILE_CONFIGURED,
TURNSTILE_PUBLIC_ENABLED,
TURNSTILE_SITE_KEY,
UPLOADS_DIR,
adminIpAllowed,
annotateOffersWithIntelligence,
appendAudit,
appendWebhookInbox,
asTrimmedString,
assertCommercialRouteAllowed,
authenticateAdminAccount,
backupSecurityConfigSummary,
bodyBuffer,
bodyJson,
bodyText,
baseHeaders,
buildAssetPdfBuffer,
buildAdminOperatingProfile,
buildDiagnosisAccuracyProfile,
buildCommercialFinalGate,
buildCommercialOfferCatalog,
buildPricingRecalculation,
phase229PricingVersion: PHASE229_PRICING_VERSION,
buildFeedXml,
buildHardeningMatrix,
buildOpenApiSpec,
buildOpsReport,
buildPlanCatalog,
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
runProductAgentPackageAudit,
runEngineAgentPackageAudit,
runPhase287CommercialAudit,
buildSitemapXml,
buildSmartProductOrchestration,
buildSmartPublicSnapshot,
buildSystemItemsFeed,
canAccessOrder,
canTransition,
clamp,
cleanupDataRetention,
clientIp,
completeCheckoutOrder,
createBackupSnapshot,
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
ensureBootstrapAdmin,
ensureFulfillmentForOrder,
ensureRuntime,
ensureSiteRecord,
ensureSubscriptionForSite,
expiredCustomerSessionCookie,
expiredSessionCookie,
findIdempotencyRecord,
findLatestGuidanceForSite,
findSiteByAny,
fs,
generateOrderAccessToken,
getCommercialOffer,
getCustomerSession,
getIdempotencyKey,
getSession,
handleAccountRescan,
hashPassword,
hashPasswordResetToken,
hashRequestPayload,
hitRateLimit,
isAllowedUpload,
sanitizeUploadFilename,
isRefundRequestAllowed,
isValidEmail,
json,
linkCustomerToSite,
listBackupSnapshots,
markSessionsDirty,
maskEmail,
normalizeCheckoutPayload,
normalizeDocumentPreviewPayload,
normalizeDomainInput,
normalizeEmail,
normalizeEmailDeliveryPayload,
normalizeIdPayload,
normalizeIdStatusPayload,
normalizeLibraryNotePayload,
normalizeMarketingConsentPayload,
normalizeOpsPayload,
normalizePublicationPayload,
normalizeRefundRequestPayload,
normalizeRequestIdPayload,
normalizeRulePayload,
normalizeSavedSitePayload,
normalizeScanPayload,
normalizeSettingsPayload,
normalizeSubscriptionPayload,
normalizeSystemItemPayload,
nowIso,
ownsOrder,
parseCookies,
parseMultipart,
path,
persistence,
processEmailOutbox,
pruneBackupSnapshots,
publicCustomer,
pseudonymizeIp,
privacyComplianceSummary,
privacyHash,
putObjectToS3Compatible,
rateLimitStore,
readDb,
requireAdminCsrf,
requireAdminPermission,
sameOriginAllowed,
restoreBackupSnapshot,
sanitizeOrderForPublic,
scanResultFor,
seedAutoFixJobs,
sessionCookie,
sessionStore,
sessions,
storeIdempotencyRecord,
syncPortOneCheckoutOrder,
text,
toPublicBoardPost,
uid,
validateConfig,
verifyPassword,
verifyPortOneWebhook,
verifyTurnstile,
writeDb,
writeOpsReportSnapshot,
writeSessionsToDisk
};
}

const routeContext = createRouteContext();
const publicRouteHandler = createPublicRouteHandler(routeContext);
const adminRouteHandler = createAdminRouteHandler(routeContext);

// Canonical URL normalization is enforced in server/middleware/security.mjs with pathname.endsWith("/") before page rendering.
const securityMiddleware = createSecurityMiddleware({ isAllowedHost, text, baseHeaders, requestUrlFrom, redirect, canonicalBaseUrl: seoBaseUrl(), canonicalHostRedirect: process.env.NV0_CANONICAL_HOST_REDIRECT === 'true' });
const READYZ_CACHE_TTL_MS = Math.max(0, Number(process.env.NV0_READYZ_CACHE_TTL_MS || 3000));
let readyzCache = null;
let publicXmlCache = { sitemap: null, feed: null };


async function buildReadyzPayload() {
validateConfig();
await ensureRuntime();
await readDb();
if (!(PERSISTENCE_MODE === 'postgres_primary' && PLATFORM.commercial)) await fs.access(path.join(DATA_DIR, 'db.json'));
if (!PLATFORM.commercial || STORAGE_MODE === 'local_fs') await fs.access(UPLOADS_DIR);
const redisSessionReady = READYZ_REDIS_STRICT ? await sessionStore.ping() : Boolean(sessionStore.redisEnabled);
const redisRateLimitReady = READYZ_REDIS_STRICT ? await rateLimitStore.ping() : Boolean(rateLimitStore.redisEnabled);
const redisLockReady = READYZ_REDIS_STRICT ? await distributedLock.ping() : Boolean(distributedLock.redisEnabled);
const privacy = privacyComplianceSummary(process.env);
const probePath = path.join(REPORTS_DIR, `.readyz-${process.pid}.tmp`);
await fs.writeFile(probePath, JSON.stringify({ checkedAt: nowIso() }));
await fs.unlink(probePath);
if (READYZ_REDIS_STRICT && (!redisSessionReady || !redisRateLimitReady || !redisLockReady)) throw new Error('Strict readiness requires Redis-backed session, rate-limit, and lock providers.');
return {
  ok: true,
  ready: true,
  runtimeWritable: true,
privacy,
  platformTarget: PLATFORM.target,
  deploymentStage: DEPLOYMENT_STAGE,
  commercialLaunchReady: COMMERCIAL_LAUNCH_READY,
  prelaunchMode: PRELAUNCH_MODE,
  persistenceMode: PERSISTENCE_MODE,
  storageMode: STORAGE_MODE,
  runtimeDir: RUNTIME_DIR,
  runtimeEphemeral: process.env.NV0_RUNTIME_EPHEMERAL === 'true',
  turnstileEnabled: TURNSTILE_PUBLIC_ENABLED,
  redis: {
    readinessMode: READYZ_REDIS_STRICT ? 'strict_ping' : 'prelaunch_advisory_no_ping',
    sessionStore: redisSessionReady,
    rateLimitStore: redisRateLimitReady,
    lockProvider: redisLockReady
  },
  paymentProvider: PAYMENT_PROVIDER === 'portone_v2' ? PORTONE_CLIENT.configSummary() : { mode: PAYMENT_PROVIDER },
  secureRecordStore: persistence.secureRecordStore || null,
  commercialEnv: validateCommercialEnv(process.env, { strict: false }),
  deploymentRiskGuard: DEPLOYMENT_RISK_GUARD.public,
  systemLayer: { commercialSystemLayer: true, observabilityReady: true, fulfillmentHardeningReady: true },
  cachedForMs: READYZ_CACHE_TTL_MS
};
}

async function handleReadyz(req, res) {
try {
  const now = Date.now();
  if (readyzCache && READYZ_CACHE_TTL_MS > 0 && readyzCache.expiresAt > now) {
    return json(req, res, 200, { ...readyzCache.payload, cacheHit: true }, { 'cache-control': 'no-store' });
  }
  const payload = await buildReadyzPayload();
  readyzCache = { payload, expiresAt: now + READYZ_CACHE_TTL_MS };
  return json(req, res, 200, { ...payload, cacheHit: false }, { 'cache-control': 'no-store' });
} catch (error) {
  readyzCache = null;
  const message = error?.message || 'readiness check failed';
  console.error(JSON.stringify({ level: 'error', event: 'readyz_failed', message, deploymentStage: DEPLOYMENT_STAGE, commercialLaunchReady: COMMERCIAL_LAUNCH_READY, prelaunchMode: PRELAUNCH_MODE, persistenceMode: PERSISTENCE_MODE, storageMode: STORAGE_MODE, redisStrict: READYZ_REDIS_STRICT }));
  return json(req, res, 503, { ok: false, ready: false, runtimeWritable: false, error: message, stage: DEPLOYMENT_STAGE, prelaunchMode: PRELAUNCH_MODE, commercialLaunchReady: COMMERCIAL_LAUNCH_READY, redisStrict: READYZ_REDIS_STRICT }, { 'cache-control': 'no-store' });
}
}

async function cachedXml(name, ttlMs, builder) {
const now = Date.now();
const cached = publicXmlCache[name];
if (cached && cached.expiresAt > now) return { body: cached.body, cacheHit: true };
const db = await readDb();
const body = builder(db);
publicXmlCache[name] = { body, expiresAt: now + ttlMs };
return { body, cacheHit: false };
}

async function handleApi(req, res, state = {}) {
const routeState = state.requestUrl ? state : resolveNativeRouteState(req);
const { pathname } = routeState;
if (pathname.startsWith('/api/public/') || pathname === '/api/diagnostics/start') return publicRouteHandler(req, res, routeState);
if (pathname.startsWith('/api/admin/')) return adminRouteHandler(req, res, routeState);
if (pathname === '/healthz' || pathname === '/health' || pathname === '/livez') {
return json(req, res, 200, buildHealthDetails({ service: 'veridion', release: 'clean-rebrand', integrations: { process: { ok: true }, commercialEnv: { ok: validateCommercialEnv(process.env, { strict: false }).ok }, deploymentRiskGuard: { ok: DEPLOYMENT_RISK_GUARD.ok, version: PHASE223_RISK_GUARD_VERSION } } }), { 'cache-control': 'no-store' });
}
if (pathname === '/readyz') return handleReadyz(req, res);
if (pathname === '/favicon.ico' && (req.method === 'GET' || req.method === 'HEAD')) {
return noContent(req, res, 204, { 'cache-control': 'public, max-age=86400, immutable' }, 'static');
}
if (pathname === '/.well-known/security.txt' && req.method === 'GET') {
return text(req, res, 200, buildSecurityTxt(), { 'cache-control': 'public, max-age=86400' });
}
if (pathname === '/robots.txt' && req.method === 'GET') {
return text(req, res, 200, buildRobotsTxt(), { 'cache-control': 'public, max-age=3600' });
}
if (pathname === '/sitemap.xml' && req.method === 'GET') {
const cached = await cachedXml('sitemap', 30_000, buildSitemapXml);
return text(req, res, 200, cached.body, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=1800, stale-while-revalidate=3600', 'x-vr-cache': cached.cacheHit ? 'hit' : 'miss' });
}
if (pathname === '/feed.xml' && req.method === 'GET') {
const cached = await cachedXml('feed', 30_000, buildFeedXml);
return text(req, res, 200, cached.body, { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=1800, stale-while-revalidate=3600', 'x-vr-cache': cached.cacheHit ? 'hit' : 'miss' });
}
return false;
}

const server = http.createServer(async (req, res) => {
req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('REQUEST_TIMEOUT')));
const startedAt = Date.now();
const requestId = uid('req');
res.setHeader('x-request-id', requestId);
try {
const gate = securityMiddleware(req, res);
if (gate.handled) return;
const requestState = gate;
const pathname = requestState.pathname;
if (pathname.startsWith('/shared/')) return serveStaticRoot(req, res, ROOT, '/');
if (pathname.startsWith('/apps/public/')) return serveStaticRoot(req, res, ROOT, '/');
if (pathname.startsWith('/apps/admin/gate/')) return serveStaticRoot(req, res, ROOT, '/');
if (pathname.startsWith('/apps/admin/')) {
if (!await getSession(req)) return text(req, res, 403, 'Forbidden');
return serveStaticRoot(req, res, ROOT, '/');
}
if (pathname.startsWith('/runtime/uploads/')) {
const uploadSession = await getSession(req);
if (!uploadSession) return text(req, res, 403, 'Forbidden');
return serveStaticRoot(req, res, ROOT, '/');
}
const apiHandled = await handleApi(req, res, requestState);
if (apiHandled !== false) return;
const rendered = await renderPage(pathname, req, res);
if (rendered) return;
if (wantsHtmlResponse(req)) return renderPublicErrorPage(req, res, 404, '페이지를 찾을 수 없습니다', '주소가 바뀌었거나 접근할 수 없는 페이지입니다. 홈 또는 무료 진단으로 이동해 주세요.', requestId);
text(req, res, 404, 'Not found');
} catch (error) {
const status = error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_JSON', 'INVALID_PAYLOAD'].includes(error?.code) ? 400 : 500;
console.error(JSON.stringify({ level: 'error', event: 'request_error', requestId, statusCode: status, incident: classifyIncident(error, { requestId, route: req._nv0RouteState?.pathname }), message: error?.message || 'unknown error', code: error?.code || null, stack: NODE_ENV === 'production' ? undefined : error?.stack }));
if (wantsHtmlResponse(req) && status >= 500) {
return renderPublicErrorPage(req, res, status, '일시적인 오류가 발생했습니다', '요청을 안전하게 중단했습니다. 잠시 후 다시 시도해 주세요.', requestId);
}
json(req, res, status, { ok: false, error: status === 413 ? '요청 크기가 너무 큽니다.' : status === 400 ? (error.message || '잘못된 요청입니다.') : '서버 오류가 발생했습니다.', requestId });
} finally {
const pathname = req._nv0RouteState?.pathname || (() => { try { return requestUrlFrom(req).pathname; } catch { return 'invalid-url'; } })();
const elapsedMs = Date.now() - startedAt;
if (shouldLogRequest(req, res, pathname, elapsedMs)) {
console.log(JSON.stringify({
level: elapsedMs >= SLOW_REQUEST_THRESHOLD_MS ? 'warn' : 'info',
event: elapsedMs >= SLOW_REQUEST_THRESHOLD_MS ? 'slow_request' : 'request',
requestId,
method: req.method,
path: pathname,
statusCode: res.statusCode,
elapsedMs,
ipHash: pseudonymizeIp(clientIp(req))
}));
}
}
});
const cleanupInterval = setInterval(() => {
cleanupExpiredSessions().catch(error => console.error('session cleanup failed', error));
}, 60_000);
cleanupInterval.unref();
const ctaAutopublishInterval = setInterval(() => {
runCtaAutopublish('interval').catch(error => console.error('cta autopublish failed', error));
}, CTA_AUTOPUBLISH_INTERVAL_MS);
ctaAutopublishInterval.unref();
const ctaAutopublishStartupTimer = setTimeout(() => {
runCtaAutopublish('startup_due_check').catch(error => console.error('cta startup autopublish failed', error));
}, 5_000);
ctaAutopublishStartupTimer.unref();
const autoBackupInterval = setInterval(() => {
runAutomaticBackup('scheduled').catch(error => console.error('automatic backup failed', error));
}, AUTO_BACKUP_INTERVAL_MS);
autoBackupInterval.unref();
async function shutdown() {
clearInterval(cleanupInterval);
clearInterval(ctaAutopublishInterval);
clearTimeout(ctaAutopublishStartupTimer);
clearInterval(autoBackupInterval);
if (sessionsDirty) await writeSessionsToDisk();
const forceExit = setTimeout(() => process.exit(0), 1500);
forceExit.unref();
if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
server.close(() => process.exit(0));
}
process.on('SIGTERM', () => { shutdown().catch(() => process.exit(1)); });
process.on('SIGINT', () => { shutdown().catch(() => process.exit(1)); });
process.on('unhandledRejection', (error) => { console.error('unhandled rejection', error); });
process.on('uncaughtException', (error) => { console.error('uncaught exception', error); shutdown().catch(() => process.exit(1)); });
validateConfig();
ensureRuntime().then(async () => {
await hydrateSessions();
const db = await readDb();
await ensureBootstrapAdmin(db, process.env, uid, nowIso);
await writeDb(db);
try {
  const startupAutopublish = await runCtaAutopublish('startup');
  if (startupAutopublish?.skipped) console.info('startup product insight autopublish skipped', startupAutopublish);
} catch (error) {
  console.error('startup product insight autopublish failed non-fatally', {
    message: error?.message || String(error),
    code: error?.code || null,
    failed: error?.audit?.failed || []
  });
}
if (AUTO_BACKUP_ENABLED && AUTO_BACKUP_ON_STARTUP) {
setTimeout(() => { runAutomaticBackup('startup').catch(error => console.error('startup backup failed', error)); }, 15_000).unref();
}
server.listen(PORT, HOST, () => {
console.log(`VERIDION cleanroom server listening on http://${HOST}:${PORT} target=${PLATFORM.target} stage=${DEPLOYMENT_STAGE} launchReady=${COMMERCIAL_LAUNCH_READY} payment=${PAYMENT_PROVIDER}`);
});
}).catch((error) => {
console.error('server startup failed', error);
process.exit(1);
});
