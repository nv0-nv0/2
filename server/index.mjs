import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { assertCommercialRouteAllowed, createPlatformProfile } from './core/platform.mjs';
import { PAYMENT_SESSION_TRANSITIONS, ORDER_STATUS_TRANSITIONS, canTransition } from './core/payment-state-machine.mjs';
import { handleAccountRescan, customerRecentScans } from './core/account-rescan.mjs';
import { buildPublicDiagnosisPackage } from './core/diagnosis-report-package.mjs';
import { buildPremiumPurchasedAsset, buildPremiumAssetPdfLines } from './core/premium-asset-builder.mjs';
import { buildCtaBoardArticle, chooseCtaVariant, ctaTopicPacks, ctaCombinationStats } from './core/cta-publication.mjs';
import { buildProductIntelligence, annotateOffersWithIntelligence, buildProductDashboard } from './core/product-intelligence.mjs';
import { buildSmartProductOrchestration, buildSmartPublicSnapshot } from './core/smart-product-orchestrator.mjs';
import { authenticateAdminAccount, ensureAdminCollections, ensureBootstrapAdmin, getAdminPermissions, getAdminRoles } from './core/admin-auth.mjs';
import { hashPassword, verifyPassword } from './core/passwords.mjs';
import { createPersistenceManager } from './infrastructure/persistence/persistence.mjs';
import { createSessionStore } from './infrastructure/session/session-store.mjs';
import { createRateLimitStore } from './infrastructure/ratelimit/rate-limit-store.mjs';
import { createDistributedLock } from './infrastructure/lock/distributed-lock.mjs';
import { createPortOneV2Client, verifyPortOnePaymentAgainstOrder } from './infrastructure/payments/portone-v2.mjs';
import { sanitizeAuditPayload } from './infrastructure/security/secure-record-store.mjs';
import { verifyPortOneWebhook } from './infrastructure/payments/portone-webhook-verify.mjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.resolve(process.env.NV0_RUNTIME_DIR || path.join(ROOT, 'runtime'));
const DATA_DIR = path.join(RUNTIME_DIR, 'data');
const UPLOADS_DIR = path.join(RUNTIME_DIR, 'uploads');
const BACKUPS_DIR = path.join(RUNTIME_DIR, 'backups');
const REPORTS_DIR = path.join(RUNTIME_DIR, 'reports');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PUBLIC_DIR = path.join(ROOT, 'apps', 'public');
const ADMIN_DIR = path.join(ROOT, 'apps', 'admin');
const BUSINESS_PROFILE = Object.freeze({
tradeName: '엔브이제로(NV0)',
representative: '나금상',
registrationNumber: '584-77-00586',
address: '경기도 남양주시 와부읍 덕소로97번길 34, 105동 402호',
businessTypes: ['정보통신업', '소프트웨어 개발 및 공급업', '전자상거래업', '데이터베이스 및 온라인 정보 제공업', '광고 대행업'],
contactEmail: process.env.NV0_SUPPORT_EMAIL || 'ct@nv0.kr',
domain: process.env.NV0_PUBLIC_BASE_URL || 'https://nv0.kr',
mailOrderRegistrationNumber: process.env.NV0_MAIL_ORDER_REGISTRATION_NUMBER || '',
hostingProvider: process.env.NV0_HOSTING_PROVIDER || 'Contabo GmbH',
customerServicePhone: process.env.NV0_CUSTOMER_SERVICE_PHONE || '',
privacyOfficerEmail: process.env.NV0_PRIVACY_OFFICER_EMAIL || process.env.NV0_SUPPORT_EMAIL || 'ct@nv0.kr'
});
const PORT = Number(process.env.PORT || 3210);
const HOST = String(process.env.HOST || process.env.NV0_HOST || '0.0.0.0');
const NODE_ENV = process.env.NODE_ENV || 'development';
const PLATFORM = createPlatformProfile(process.env);
const DEPLOYMENT_STAGE = String(process.env.NV0_DEPLOYMENT_STAGE || (PLATFORM.commercial ? 'prelaunch' : 'mvp')).trim().toLowerCase();
const COMMERCIAL_LAUNCH_READY = process.env.NV0_COMMERCIAL_LAUNCH_READY === 'true' || DEPLOYMENT_STAGE === 'commercial_launch';
const PRELAUNCH_MODE = PLATFORM.commercial && !COMMERCIAL_LAUNCH_READY;
const TRUST_PROXY_HEADERS = process.env.NV0_TRUST_PROXY_HEADERS === 'true';
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
const ALLOWED_ADMIN_ORIGINS = String(process.env.NV0_ALLOWED_ADMIN_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
const BACKUP_RETENTION_COUNT = Number(process.env.NV0_BACKUP_RETENTION_COUNT || 20);
const AUDIT_LOG_RETENTION_COUNT = Number(process.env.NV0_AUDIT_LOG_RETENTION_COUNT || 200);
const ADMIN_AUTH_MODE = process.env.NV0_ADMIN_AUTH_MODE || (PLATFORM.commercial ? 'account_rbac' : 'shared_key');
const STORAGE_MODE = process.env.NV0_STORAGE_MODE || (PLATFORM.commercial ? 's3' : 'local_fs');
const PERSISTENCE_MODE = process.env.NV0_PERSISTENCE_MODE || (PLATFORM.commercial ? 'postgres_primary' : 'json');
const DATABASE_URL = process.env.NV0_DATABASE_URL || '';
const SCAN_PROVIDER = process.env.NV0_SCAN_PROVIDER || (PLATFORM.commercial ? 'external_http' : 'builtin');
const SCAN_PROVIDER_URL = process.env.NV0_SCAN_PROVIDER_URL || '';
const SCAN_PROVIDER_TOKEN = process.env.NV0_SCAN_PROVIDER_TOKEN || '';
const SCAN_PROVIDER_FALLBACK = process.env.NV0_SCAN_PROVIDER_FALLBACK !== 'false';
const TARGET_FETCH_ENABLED = process.env.NV0_TARGET_FETCH_ENABLED !== 'false';
const PAYMENT_PROVIDER = process.env.NV0_PAYMENT_PROVIDER || (PRELAUNCH_MODE ? 'disabled' : (PLATFORM.commercial ? 'portone_v2' : 'demo'));
const PAYMENT_PROVIDER_URL = process.env.NV0_PAYMENT_PROVIDER_URL || '';
const PAYMENT_PROVIDER_TOKEN = process.env.NV0_PAYMENT_PROVIDER_TOKEN || '';
const PORTONE_CLIENT = createPortOneV2Client(process.env);
const PORTONE_WEBHOOK_SECRET = process.env.NV0_PORTONE_WEBHOOK_SECRET || '';
const PORTONE_WEBHOOK_VERIFY_MODE = process.env.NV0_PORTONE_WEBHOOK_VERIFY_MODE || (PLATFORM.target === 'commercial' || NODE_ENV === 'production' ? 'strict' : 'optional');
const RULES_VERSION = process.env.NV0_RULES_VERSION || '2026.04.25-phase68-auto-diagnosis';
const SCAN_CACHE_TTL_MS = Number(process.env.NV0_SCAN_CACHE_TTL_MS || 10 * 60_000);
const CTA_AUTOPUBLISH_INTERVAL_MS = Number(process.env.NV0_CTA_AUTOPUBLISH_INTERVAL_MS || 30 * 60_000);
const RELEASE_PHASE = 'phase157-nonpayment-ops-completion';
const DATA_RETENTION_DAYS = Number(process.env.NV0_DATA_RETENTION_DAYS || 1095);
const REFUND_REQUEST_WINDOW_DAYS = Number(process.env.NV0_REFUND_REQUEST_WINDOW_DAYS || 7);
const OPERATOR_ALERT_EMAIL = process.env.NV0_OPERATOR_ALERT_EMAIL || BUSINESS_PROFILE.contactEmail;
const PAYMENT_IDEMPOTENCY_TTL_MS = Number(process.env.NV0_PAYMENT_IDEMPOTENCY_TTL_MS || 24 * 60 * 60_000);
const EMAIL_MAX_RETRY_COUNT = Number(process.env.NV0_EMAIL_MAX_RETRY_COUNT || 5);
const EMAIL_RETRY_BACKOFF_MS = Number(process.env.NV0_EMAIL_RETRY_BACKOFF_MS || 5 * 60_000);
const ADMIN_IP_ALLOWLIST = String(process.env.NV0_ADMIN_IP_ALLOWLIST || '').split(',').map(v => v.trim()).filter(Boolean);
const PUBLIC_CACHE_SECONDS = Number(process.env.NV0_PUBLIC_CACHE_SECONDS || 0);
const PUBLIC_ASSET_CACHE_SECONDS = Number(process.env.NV0_PUBLIC_ASSET_CACHE_SECONDS || 0);
const SERVER_HEADER = 'nv0';
const ALLOWED_HOSTS = String(process.env.NV0_ALLOWED_HOSTS || 'nv0.kr,www.nv0.kr,localhost,127.0.0.1,0.0.0.0,::1').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
const REQUEST_TIMEOUT_MS = Number(process.env.NV0_REQUEST_TIMEOUT_MS || 15_000);
const READYZ_REDIS_STRICT = process.env.NV0_READYZ_REDIS_STRICT === 'true' || COMMERCIAL_LAUNCH_READY;
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
operatorAlertEmail: OPERATOR_ALERT_EMAIL
},
orders: [
{ id: 'ord-1001', customer: 'Acme Co', status: 'paid', stage: 'scan_requested', amount: 129000, createdAt: nowIso() },
{ id: 'ord-1002', customer: 'Beta Labs', status: 'pending', stage: 'draft', amount: 69000, createdAt: nowIso() }
],
subscriptions: [
{ id: 'sub-1001', siteId: 'site-seed-001', plan: 'Auto', status: 'active', monthlyPrice: 299000, createdAt: nowIso() }
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
assertFiniteConfigNumber('PORT', PORT, { min: 1, max: 65535 });
assertFiniteConfigNumber('NV0_ADMIN_SESSION_TTL_MS', SESSION_TTL_MS, { min: 60_000, max: 86_400_000 });
assertFiniteConfigNumber('NV0_MAX_JSON_BODY_BYTES', MAX_JSON_BODY_BYTES, { min: 1024, max: 1_048_576 });
assertFiniteConfigNumber('NV0_MAX_MULTIPART_BODY_BYTES', MAX_MULTIPART_BODY_BYTES, { min: 1024, max: 20_971_520 });
assertFiniteConfigNumber('NV0_PUBLIC_SCAN_LIMIT', PUBLIC_SCAN_LIMIT, { min: 1, max: 500 });
assertFiniteConfigNumber('NV0_PUBLIC_SCAN_WINDOW_MS', PUBLIC_SCAN_WINDOW_MS, { min: 1000, max: 3_600_000 });
assertFiniteConfigNumber('NV0_ADMIN_AUTH_LIMIT', ADMIN_AUTH_LIMIT, { min: 1, max: 100 });
assertFiniteConfigNumber('NV0_ADMIN_AUTH_WINDOW_MS', ADMIN_AUTH_WINDOW_MS, { min: 1000, max: 3_600_000 });
assertFiniteConfigNumber('NV0_BACKUP_RETENTION_COUNT', BACKUP_RETENTION_COUNT, { min: 1, max: 500 });
assertFiniteConfigNumber('NV0_AUDIT_LOG_RETENTION_COUNT', AUDIT_LOG_RETENTION_COUNT, { min: 1, max: 10000 });
assertFiniteConfigNumber('NV0_SCAN_CACHE_TTL_MS', SCAN_CACHE_TTL_MS, { min: 0, max: 86_400_000 });
assertFiniteConfigNumber('NV0_CTA_AUTOPUBLISH_INTERVAL_MS', CTA_AUTOPUBLISH_INTERVAL_MS, { min: 60_000, max: 86_400_000 });
assertFiniteConfigNumber('NV0_PUBLIC_CACHE_SECONDS', PUBLIC_CACHE_SECONDS, { min: 0, max: 86_400 });
assertFiniteConfigNumber('NV0_REQUEST_TIMEOUT_MS', REQUEST_TIMEOUT_MS, { min: 1000, max: 120_000 });
if (PLATFORM.commercial && ADMIN_AUTH_MODE === 'shared_key') {
throw new Error('NV0_ADMIN_AUTH_MODE=shared_key is not allowed in production. Use account_rbac.');
}
if (ENABLE_TURNSTILE && COMMERCIAL_LAUNCH_READY && !TURNSTILE_CONFIGURED) {
throw new Error('Real NV0_TURNSTILE_SECRET and NV0_TURNSTILE_SITE_KEY are required when commercial launch is ready.');
}
const commercialFailures = PLATFORM.requireCommercialControls();
if (commercialFailures.length) {
throw new Error(commercialFailures.join(' | '));
}
if (['dual_write', 'postgres_primary'].includes(PERSISTENCE_MODE) && !DATABASE_URL) {
throw new Error('NV0_DATABASE_URL is required when NV0_PERSISTENCE_MODE enables PostgreSQL.');
}
if (PLATFORM.commercial) {
if (PERSISTENCE_MODE !== 'postgres_primary') throw new Error('Commercial launch requires NV0_PERSISTENCE_MODE=postgres_primary.');
if (process.env.NV0_SESSION_STORE !== 'redis') throw new Error('Commercial launch requires NV0_SESSION_STORE=redis.');
if (process.env.NV0_RATE_LIMIT_STORE !== 'redis') throw new Error('Commercial launch requires NV0_RATE_LIMIT_STORE=redis.');
if (process.env.NV0_LOCK_PROVIDER !== 'redis') throw new Error('Commercial launch requires NV0_LOCK_PROVIDER=redis.');
if (!String(process.env.NV0_REDIS_URL || '').trim()) throw new Error('Commercial launch requires NV0_REDIS_URL.');
if (COMMERCIAL_LAUNCH_READY && PAYMENT_PROVIDER !== 'portone_v2') throw new Error('Commercial launch requires NV0_PAYMENT_PROVIDER=portone_v2.');
if (PRELAUNCH_MODE && PAYMENT_PROVIDER === 'portone_v2') throw new Error('Prelaunch mode must not enable PortOne payment without NV0_COMMERCIAL_LAUNCH_READY=true.');
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
`script-src 'self' https://cdn.portone.io${TURNSTILE_PUBLIC_ENABLED ? ' https://challenges.cloudflare.com' : ''}`,
"style-src 'self'",
`connect-src 'self' https://cdn.portone.io https://api.portone.io${TURNSTILE_PUBLIC_ENABLED ? ' https://challenges.cloudflare.com' : ''}`,
TURNSTILE_PUBLIC_ENABLED ? 'frame-src https://challenges.cloudflare.com' : "frame-src 'none'"
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
'server': SERVER_HEADER,
'content-security-policy': cspParts.join('; '),
'content-security-policy-report-only': ["trusted-types nv0-default", "require-trusted-types-for 'script'"].join('; ')
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
const csrf = String(req.headers['x-nv0-csrf'] || '');
if (!csrf || csrf !== session.csrfToken) {
json(req, res, 403, { ok: false, error: 'CSRF 검증에 실패했습니다.' });
return false;
}
return true;
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
return pathname === '/healthz' || pathname === '/readyz';
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
return { id: customer.id, email: customer.email, createdAt: customer.createdAt || null, lastLoginAt: customer.lastLoginAt || null, privacyConsentAt: customer.privacyConsentAt || null, dataMinimizationVersion: customer.dataMinimizationVersion || null, marketingConsentAt: customer.marketingConsentAt || null, dataRetentionDays: DATA_RETENTION_DAYS };
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
function generateOrderAccessToken(order) { if (!order.accessToken) order.accessToken = crypto.randomBytes(18).toString('base64url'); return order.accessToken; }
function canAccessOrder(req, order) {
if (!order) return false;
const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
const token = String(url.searchParams.get('accessToken') || req.headers['x-nv0-order-token'] || '').trim();
if (!order.accessToken || !token || token.length !== order.accessToken.length) return false;
return crypto.timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(token));
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
`Message-ID: <${stripHeaderValue(messageId || uid('mailmsg'))}@nv0.kr>`,
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
let ehlo = await command(`EHLO ${requestHost({ headers: { host: 'nv0.kr' }, socket: { remoteAddress: '127.0.0.1' } }) || 'nv0.kr'}`);
if (![250].includes(ehlo.code)) ehlo = await command('HELO nv0.kr');
expect(ehlo, [250], 'SMTP EHLO');
if (!config.secure && config.starttls && /STARTTLS/i.test(ehlo.text)) {
expect(await command('STARTTLS'), [220], 'SMTP STARTTLS');
const upgraded = tls.connect({ socket, servername: config.host, rejectUnauthorized: config.rejectUnauthorized });
await new Promise((resolve, reject) => { upgraded.once('secureConnect', resolve); upgraded.once('error', reject); });
attach(upgraded);
expect(await command('EHLO nv0.kr'), [250], 'SMTP EHLO after STARTTLS');
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
'Allow: /api/public/health',
'Allow: /api/public/board',
'Allow: /api/public/plans',
'Allow: /api/public/smart-product',
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
{ path: '/documents', priority: '0.82', changefreq: 'weekly', lastmod: today },
{ path: '/guides', priority: '0.78', changefreq: 'weekly', lastmod: today },
{ path: '/resources', priority: '0.72', changefreq: 'weekly', lastmod: today },
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
const rows = [...(db.publications || []), ...(db.boards || [])]
.filter(item => item && typeof item === 'object')
.filter(item => item.status === 'published' || item.autoPublished || item.boardType === 'cta' || item.type === 'cta')
.sort((a, b) => String(b.createdAt || b.rewrittenAt || '').localeCompare(String(a.createdAt || a.rewrittenAt || '')))
.slice(0, 30);
return rows;
}
function buildFeedXml(db = {}) {
const base = seoBaseUrl();
const items = feedItems(db).map((item, index) => {
const title = xmlEscape(item.title || `NV0 운영 글 ${index + 1}`);
const summary = xmlEscape(item.summary || item.seo?.metaDescription || stripHtml(item.body || '').slice(0, 240));
const pubDate = new Date(item.createdAt || item.rewrittenAt || Date.now()).toUTCString();
const guid = xmlEscape(item.id ? `${base}/board#${item.id}` : `${base}/board#item-${index + 1}`);
return `<item><title>${title}</title><link>${xmlEscape(base + '/board')}</link><guid isPermaLink="false">${guid}</guid><description>${summary}</description><pubDate>${pubDate}</pubDate></item>`;
}).join('');
return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>NV0 쉬운 사이트 점검 글</title><link>${xmlEscape(base + '/board')}</link><description>고객이 이해하기 쉬운 사이트 점검 글과 운영 가이드입니다.</description><language>ko-KR</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}
function createPasswordResetToken(db, customer, req) {
db.passwordResetTokens ||= [];
const rawToken = crypto.randomBytes(24).toString('base64url');
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
db.passwordResetTokens = db.passwordResetTokens.filter(item => item.customerId !== customer.id || item.usedAt);
const record = { id: uid('reset'), customerId: customer.id, tokenHash, createdAt: nowIso(), expiresAt, usedAt: null, ip: clientIp(req) };
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
'/board/post': [PUBLIC_DIR, 'board'],
'/cases': [PUBLIC_DIR, 'board'],
'/documents': [PUBLIC_DIR, 'documents'],
'/policy-documents': [PUBLIC_DIR, 'documents'],
'/solutions': [PUBLIC_DIR, 'solutions'],
'/service': [PUBLIC_DIR, 'solutions'],
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
function routeMeta(urlPath) {
const base = seoBaseUrl();
const metas = {
'/': { title: '웹사이트 안내·정책 무료 점검 | NV0', description: '쇼핑몰과 서비스 페이지에서 고객이 꼭 확인하는 사업자 정보, 개인정보 안내, 환불 기준, 문의 버튼, 가격 안내를 쉽게 점검합니다.', keywords: ['웹사이트 무료 점검','쇼핑몰 신뢰도 점검','환불 안내 점검','개인정보 안내 점검','문의 버튼 개선'] },
'/products/veridion/demo': { title: 'NV0 무료 진단 | 웹사이트 신뢰 안내 점검', description: '사이트 주소로 고객이 결제나 문의 전에 헷갈릴 수 있는 안내 공백을 확인하고, 먼저 고칠 부분을 쉽게 정리합니다.', keywords: ['무료 사이트 진단','웹사이트 신뢰 점검','문의 구매 흐름 점검','쇼핑몰 안내 점검'] },
'/plans': { title: '상품·요금 | NV0 리포트·FixPack·Auto 비교', description: '무료 진단 이후 상세 리포트, 바로 붙여넣는 수정 문구, 정기 점검 상품을 상황별로 비교합니다.', keywords: ['사이트 진단 요금','FixPack','Auto 정기 점검','정책 문서 템플릿'] },
'/documents': { title: '정책 문서 초안 | 개인정보·이용약관·환불 안내 생성', description: '개인정보처리방침, 이용약관, 환불·배송·교환 정책, 사업자 고지, 고객 안내문 초안을 최소 입력으로 생성합니다.', keywords: ['정책 문서 생성','개인정보처리방침 초안','이용약관 초안','환불 정책 초안'] },
'/policy-documents': { title: '정책 문서 초안 | 개인정보·이용약관·환불 안내 생성', description: '개인정보처리방침, 이용약관, 환불·배송·교환 정책, 사업자 고지, 고객 안내문 초안을 최소 입력으로 생성합니다.', keywords: ['정책 문서 생성','개인정보처리방침 초안','이용약관 초안','환불 정책 초안'] },
'/guides': { title: '운영 가이드 | 쇼핑몰 신뢰도·정책 안내 점검', description: '쇼핑몰 신뢰도, 환불 정책, 구매 안내 버튼, 게시판 자동 발행, 반복 재진단 활용법을 쉬운 말로 정리한 운영 가이드입니다.' },
'/resources': { title: '운영 가이드 | 쇼핑몰 신뢰도·정책 안내 점검', description: '쇼핑몰 신뢰도, 환불 정책, 구매 안내 버튼, 게시판 자동 발행, 반복 재진단 활용법을 쉬운 말로 정리한 운영 가이드입니다.' },
'/solutions': { title: '솔루션 | 웹사이트 안내 고지·정책 문서·문의 흐름 점검', description: '웹사이트 필수 고지, 정책 문서, 결제 전 안내, 고객지원 안내를 한 번에 점검하는 NV0 솔루션입니다.' },
'/board': { title: '운영 게시판 | 쉬운 사이트 점검 글 자동 발행', description: '진단 결과를 자주 묻는 질문, 체크리스트, 사례, 정책 안내, 관련 링크형 글로 쉽게 풀어 재방문과 상품 비교 흐름을 돕습니다.' },
'/business-info': { title: '사업자 정보·고객지원 | NV0', description: 'NV0 서비스 운영자의 사업자 정보, 고객지원 이메일, 서비스 범위, 법률 자문 아님 고지를 확인하세요.' },
'/terms': { title: '이용약관 | NV0', description: 'NV0 서비스 이용약관과 서비스 범위 기준입니다.' },
'/privacy': { title: '개인정보처리방침 | NV0', description: 'NV0 서비스의 개인정보 처리 기준과 입력 정보 최소화 원칙입니다.' },
'/refund': { title: '환불·배송·교환 정책 | NV0', description: '디지털 산출물 제공 시점, 환불 요청 기준, 배송·교환 비대상 안내를 확인하세요.' },
'/auth': { title: '로그인·회원가입 | NV0', description: '진단 결과 저장, 전체 결과 확인, 내 사이트 재진단을 위한 로그인·회원가입 페이지입니다.' },
'/portal': { title: '내 사이트 관리 | NV0', description: '저장한 사이트의 진단 결과, 재검사, 개선 이력, 게시판 발행 상태를 확인합니다.' },
'/checkout': { title: '신청·결제 확인 | NV0', description: '상품 신청 전 제공 범위, 디지털 산출물 환불 제한, 정책 동의 항목을 확인합니다.' }
};
const meta = metas[urlPath] || metas['/'];
return { ...meta, canonical: `${base}${urlPath === '/' ? '/' : urlPath}`, locale: 'ko_KR' };
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
const privateRoute = urlPath.startsWith('/admin') || ['/auth','/portal','/checkout'].includes(urlPath);
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
`<link rel="alternate" type="application/rss+xml" title="NV0 쉬운 사이트 점검 글" href="${escapeHtml(seoBaseUrl() + '/feed.xml')}">`,
`<meta property="og:locale" content="${escapeHtml(meta.locale)}">`,
`<meta property="og:type" content="website">`,
`<meta property="og:site_name" content="NV0">`,
`<meta property="og:title" content="${escapeHtml(meta.title)}">`,
`<meta property="og:description" content="${escapeHtml(meta.description)}">`,
`<meta property="og:url" content="${escapeHtml(meta.canonical)}">`,
`<meta name="twitter:card" content="summary">`,
`<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
`<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
`<meta name="theme-color" content="#0B0F14">`
].filter(Boolean).join('');
let out = stripManagedSeoTags(body).replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
out = out.replace('</head>', `${tags}</head>`);
return out;
}
function pageFaqStructuredData(urlPath) {
const faqMap = {
'/': [
['NV0는 무엇을 점검하나요?', '고객이 문의하거나 결제하기 전에 확인하는 사업자 정보, 개인정보 안내, 환불 기준, 문의 버튼, 가격 안내를 쉽게 점검합니다.'],
['무료 진단 후 무엇을 보면 되나요?', '위험도가 높은 항목과 먼저 고칠 안내 문구를 확인한 뒤 필요한 상품을 비교하면 됩니다.']
],
'/products/veridion/demo': [
['무료 진단은 무엇을 보여주나요?', '사이트의 신뢰 안내 공백과 먼저 고칠 부분을 요약해서 보여줍니다.'],
['로그인하면 무엇이 달라지나요?', '전체 결과 저장, 내 사이트 관리, 재검사 흐름을 이용할 수 있습니다.']
],
'/plans': [
['어떤 상품을 먼저 선택해야 하나요?', '먼저 무료 진단을 보고, 근거가 필요하면 상세 리포트, 바로 붙여넣을 문구가 필요하면 FixPack, 반복 관리가 필요하면 Auto를 비교하면 됩니다.'],
['결제 전 어떤 내용을 확인해야 하나요?', '제공 범위, 디지털 산출물 제공 시점, 환불 제한, 고객지원 경로를 확인해야 합니다.']
],
'/board': [
['게시판 글은 어떤 역할을 하나요?', '진단 결과를 고객이 이해하기 쉬운 말로 풀어 재방문과 상품 비교를 돕습니다.'],
['글이 어렵지 않게 작성되나요?', '중학생도 이해할 수 있는 쉬운 문장과 자주 묻는 질문 중심으로 작성됩니다.']
]
};
return faqMap[urlPath] || [];
}
function buildStructuredData(urlPath) {
if (urlPath.startsWith('/admin') || ['/auth','/portal','/checkout'].includes(urlPath)) return '';
const base = seoBaseUrl();
const meta = routeMeta(urlPath);
const pageUrl = `${base}${urlPath === '/' ? '/' : urlPath}`;
const graph = [
{ '@type': 'Organization', '@id': `${base}/#organization`, name: BUSINESS_PROFILE.tradeName, url: base, email: BUSINESS_PROFILE.contactEmail },
{ '@type': 'WebSite', '@id': `${base}/#website`, name: 'NV0', url: base, inLanguage: 'ko-KR', publisher: { '@id': `${base}/#organization` }, potentialAction: { '@type': 'SearchAction', target: `${base}/board?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
{ '@type': 'SoftwareApplication', '@id': `${base}/#software`, name: 'NV0', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: base, description: meta.description, offers: { '@type': 'Offer', priceCurrency: 'KRW', price: '0', availability: 'https://schema.org/InStock' }, provider: { '@id': `${base}/#organization` } },
{ '@type': 'Service', '@id': `${base}/#service`, name: '웹사이트 안내·정책 점검', serviceType: 'Website trust and policy guidance check', provider: { '@id': `${base}/#organization` }, areaServed: 'KR', audience: { '@type': 'Audience', audienceType: '온라인 사업자' } },
{ '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: meta.title, description: meta.description, isPartOf: { '@id': `${base}/#website` }, about: { '@id': `${base}/#software` }, inLanguage: 'ko-KR', dateModified: new Date().toISOString().slice(0, 10) },
{ '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: [
{ '@type': 'ListItem', position: 1, name: '홈', item: `${base}/` },
...(urlPath === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: meta.title.replace(/\s*\|\s*NV0.*/, ''), item: pageUrl }])
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
return `<a class="skip-link" href="#main">본문 바로가기</a><nav class="site-topbar" aria-label="주요 메뉴">
<a class="brand" href="/"><span class="brand-mark">N</span><span>NV0<small>웹사이트 안내·정책 점검</small></span></a>
<div class="site-menu">
<a href="/products/veridion/demo"${navAttrs(urlPath, '/products/veridion/demo')}>무료 진단</a>
<a href="/portal"${navAttrs(urlPath, '/portal')}>내 사이트</a>
<a href="/board"${navAttrs(urlPath, '/board')}>운영 게시판</a>
<a href="/plans"${navAttrs(urlPath, '/plans')}>요금제</a>
<a href="/documents"${navAttrs(urlPath, '/documents')}>문서 생성</a>
<a href="/business-info"${navAttrs(urlPath, '/business-info')}>고객지원</a>
<a href="/auth"${navAttrs(urlPath, '/auth', 'login-link')}>로그인</a>
<a href="/products/veridion/demo" class="cta">진단 시작</a>
</div>
</nav>`;
}
function ensureMainId(body) {
if (body.includes('<main id="main"')) return body;
return body.replace('<main ', '<main id="main" tabindex="-1" ');
}
function injectNoScriptNotice(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('<noscript>')) return body;
return body.replace('<body>', '<body><noscript><div class="noscript-banner">진단·결제 흐름에 JavaScript가 필요합니다.</div></noscript>');
}
function injectPublicTopMenu(body, urlPath) {
if (urlPath.startsWith('/admin')) return body;
if (body.includes('site-topbar')) return body;
return body.replace('<body>', `<body>${publicTopMenuHtml(urlPath)}`);
}
function businessFooterHtml() {
const types = BUSINESS_PROFILE.businessTypes.join(' · ');
const unfinishedToken = ['TO', 'DO'].join('');
const legalFieldBlockPattern = new RegExp(`예정|확인|상용|입력|${unfinishedToken}|TBD`, 'i');
const hostingBlockPattern = new RegExp(`예정|확인|상용|입력|${unfinishedToken}|TBD|Coolify`, 'i');
return '<footer class="business-footer" aria-label="사업자 정보">'
+ `<strong>${BUSINESS_PROFILE.tradeName}</strong>`
+ `<span>대표자: ${BUSINESS_PROFILE.representative}</span>`
+ `<span>사업자등록번호: ${BUSINESS_PROFILE.registrationNumber}</span>`
+ (BUSINESS_PROFILE.mailOrderRegistrationNumber && !legalFieldBlockPattern.test(BUSINESS_PROFILE.mailOrderRegistrationNumber) ? `<span>통신판매업 신고번호: ${BUSINESS_PROFILE.mailOrderRegistrationNumber}</span>` : '')
+ `<span>주소: ${BUSINESS_PROFILE.address}</span>`
+ `<span>업태·종목: ${types}</span>`
+ `<span>고객지원: ${BUSINESS_PROFILE.contactEmail}${BUSINESS_PROFILE.customerServicePhone ? ' · ' + BUSINESS_PROFILE.customerServicePhone : ' · 이메일 전용 고객지원'}</span>`
+ (BUSINESS_PROFILE.hostingProvider && !hostingBlockPattern.test(BUSINESS_PROFILE.hostingProvider) ? `<span>호스팅 제공자: ${BUSINESS_PROFILE.hostingProvider}</span>` : '')
+ `<span class="legal-disclaimer">본 서비스는 운영 점검 보조도구이며 법률 자문을 제공하지 않습니다.</span>`
+ '<nav><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="/refund">환불·배송·교환 정책</a><a href="/business-info">사업자 정보</a></nav>'
+ '</footer>';
}
function injectSessionNavScript(body, urlPath) {
if (urlPath.startsWith('/admin') || body.includes('/shared/session-nav.js')) return body;
return body.replace('</body>', '<script type="module" src="/shared/session-nav.js"></script></body>');
}
function injectBusinessFooter(body, urlPath) {
if (urlPath.startsWith('/admin')) return body;
if (body.includes('business-footer')) return body;
return body.replace('</body>', `${businessFooterHtml()}</body>`);
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
body = ensureMainId(body);
body = injectNoScriptNotice(body, urlPath);
body = injectPublicTopMenu(body, urlPath);
body = injectSessionNavScript(body, urlPath);
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
function isBlockedTargetUrl(url) {
if (!url || !['http:', 'https:'].includes(url.protocol)) return true;
const host = String(url.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
if (!host) return true;
const blockedNames = new Set(['localhost', '0.0.0.0', 'metadata.google.internal']);
if (blockedNames.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) return true;
if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
const parts = host.split('.').map(v => Number(v));
if (parts.length === 4 && parts.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) {
const [a, b] = parts;
if (a === 10 || a === 127 || a === 0) return true;
if (a === 169 && b === 254) return true;
if (a === 172 && b >= 16 && b <= 31) return true;
if (a === 192 && b === 168) return true;
}
return false;
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
function buildRuleCatalog() {
return [
{ code: 'ECOM-BUSINESS-INFO', category: '전자상거래', title: '사업자 정보 고지', severity: 24, penaltyMax: 5000000, fixTemplate: '푸터에 상호/대표자/사업자등록번호/통신판매신고번호/주소/연락처를 추가합니다.', match: ({ html, text }) => !(hasAny(text, ['사업자등록','통신판매','대표자','상호']) || hasAny(html, ['footer'])) },
{ code: 'PRIVACY-POLICY', category: '개인정보', title: '개인정보처리방침 링크 또는 본문', severity: 26, penaltyMax: 10000000, fixTemplate: '푸터와 회원가입 영역에 개인정보처리방침 링크를 노출합니다.', match: ({ text }) => !hasAny(text, ['개인정보처리방침','privacy']) },
{ code: 'TERMS-OF-USE', category: '전자상거래', title: '이용약관 링크 또는 본문', severity: 12, penaltyMax: 3000000, fixTemplate: '푸터와 가입/결제 구간에 이용약관 링크를 배치합니다.', match: ({ text }) => !hasAny(text, ['이용약관','terms']) },
{ code: 'REFUND-POLICY', category: '환불·청약철회', title: '환불·교환·청약철회 안내', severity: 18, penaltyMax: 5000000, fixTemplate: '상품상세·푸터·정책 페이지에 환불/교환/청약철회 기준을 분리 표기합니다.', match: ({ text }) => !hasAny(text, ['환불','교환','청약철회','취소']) },
{ code: 'CONTACT-CHANNEL', category: '지원', title: '고객센터 연락수단', severity: 10, penaltyMax: 2000000, fixTemplate: '대표 이메일 또는 전화번호를 푸터와 문의영역에 추가합니다.', match: ({ text }) => !hasAny(text, ['고객센터','문의','contact','전화','이메일','@']) },
{ code: 'MARKETING-CLAIM', category: '광고표시', title: '과장·확정형 표현', severity: 16, penaltyMax: 5000000, fixTemplate: '무조건, 100%, 완치, guaranteed 같은 확정형 표현을 완화합니다.', match: ({ text }) => hasAny(text, ['100%','완치','무조건','guaranteed','최고보장','확정수익']) },
{ code: 'HTTPS-ONLY', category: '보안', title: 'HTTPS 미사용', severity: 20, penaltyMax: 3000000, fixTemplate: 'HTTP 접근을 HTTPS로 리다이렉트하고 HSTS를 설정합니다.', match: ({ url }) => url.protocol !== 'https:' },
{ code: 'TRACKING-CONSENT', category: '개인정보', title: '쿠키/추적 고지 부족', severity: 8, penaltyMax: 2000000, fixTemplate: '분석·광고 쿠키 사용 시 배너 또는 정책 내 고지 항목을 추가합니다.', match: ({ text }) => !hasAny(text, ['쿠키','cookie','tracking','analytics']) },
{ code: 'YOUTH-RESTRICTED', category: '청소년보호', title: '연령 제한·주의 문구 부족', severity: 14, penaltyMax: 3000000, fixTemplate: '주류/성인/베팅/흡연 연관 키워드가 있으면 성인 인증 또는 주의문구를 추가합니다.', match: ({ text }) => hasAny(text, ['주류','술','성인','adult','bet','카지노','담배','vape']) && !hasAny(text, ['19세','성인인증','청소년']) },
{ code: 'PAYMENT-NOTICE-PROXIMITY', category: '결제화면', title: '결제 전 주요 고지 근접 노출 부족', severity: 15, penaltyMax: 3000000, fixTemplate: '결제 버튼 주변에 환불 기준, 제공 범위, 약관/개인정보 링크를 한 번 더 배치합니다.', match: ({ text }) => hasAny(text, ['결제','checkout','주문','구매하기']) && !hasAny(text, ['환불','개인정보처리방침','이용약관']) },
{ code: 'SERVICE-SCOPE', category: '상품·서비스', title: '제공 범위 안내 부족', severity: 13, penaltyMax: 2000000, fixTemplate: '상품/서비스 상세에 제공 범위, 제외 범위, 산출물 형태를 분리해 적습니다.', match: ({ text }) => hasAny(text, ['서비스','상품','리포트','구독','진단']) && !hasAny(text, ['제공 범위','제외 범위','산출물','작업 범위']) },
{ code: 'LEGAL-ADVICE-DISCLAIMER', category: '고지문구', title: '법률 자문 아님 고지 부족', severity: 9, penaltyMax: 1000000, fixTemplate: '자동 진단/문구 제안은 법률 자문이 아니며 최종 적용 전 사업자 확인이 필요하다는 고지를 추가합니다.', match: ({ text }) => hasAny(text, ['진단','리포트','수정 문구','약관']) && !hasAny(text, ['법률 자문','법적 자문','변호사 자문']) }
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
? '랜딩페이지'
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
function buildGuidanceForSite(site, scan, settings = {}) {
const mustFix = (scan?.detailFindings || []).filter(item => item.priority === 'P0' || item.priority === 'P1');
const lines = [
`# ${site.domain} 운영 지침 및 맞춤 개선 안내`,
'',
`- 업종: ${site.industry || '일반 이커머스'}`,
`- 관할: ${site.jurisdiction || settings.defaultJurisdiction || 'KR'}`,
`- 최근 위험도: ${scan?.riskScore ?? '-'}점 (${scan?.riskLevel || '-'})`,
`- 예상 최대 과태료 노출: ${toKrw(scan?.estimatedMaxPenalty || 0)}원`,
'',
'## 즉시 수정 우선순위',
...(mustFix.length ? mustFix.map((item, idx) => `${idx + 1}. [${item.priority}] ${item.title} — ${item.recommendation}`) : ['1. 즉시 수정 필요 P0/P1 항목 없음']),
'',
'## 이용 체크리스트',
'- 푸터에 사업자 정보와 고객센터 연락수단 유지',
'- 개인정보처리방침 / 이용약관 / 환불정책 링크를 홈·결제·회원가입에 동시 노출',
'- 광고 문구는 확정형 표현 대신 조건형 표현으로 완화',
'- 법령 변경 알림 수신 시 48시간 안에 재스캔 실행',
settings.autoFixMode === 'approval_required'
? '- 수정 후보는 고객 확인 후 사용하고, 반영 전 변경 내용을 확인'
: '- 수정 후보는 제한적으로 사용하고, 되돌릴 수 있도록 변경 이력을 저장',
'',
'## 고객 안내 콘텐츠 기준',
'- 무료 진단 → 상세 결과 확인 → 수정 후보 검토 흐름 유지',
'- 과태료 공포 과장 금지, 근거 조항과 조치 문구를 함께 노출',
'- 게시글 말미에 무료 진단 버튼 1개만 배치'
];
return lines.join('\n');
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
return {
target: asTrimmedString(body.target, { field: 'target', required: true, max: 2048, pattern: /^https?:\/\//i }),
turnstileToken: asTrimmedString(body.turnstileToken, { field: 'turnstileToken', max: 2048 })
};
}
function normalizeCheckoutPayload(body = {}) {
return {
buyerEmail: asTrimmedString(body.buyerEmail, { field: 'buyerEmail', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i }),
siteId: asTrimmedString(body.siteId, { field: 'siteId', max: 64 }),
domain: asTrimmedString(body.domain, { field: 'domain', max: 255 }),
plan: asTrimmedString(body.plan, { field: 'plan', required: true, enumValues: ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency'] }),
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
plan: asTrimmedString(body.plan || 'Pro', { field: 'plan', enumValues: ['Basic', 'Pro', 'Auto'] }),
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
`${businessName}(이하 "회사")는 서비스 제공에 필요한 최소한의 개인정보만 처리하며, 개인정보보호 관련 법령을 준수합니다.`,
'',
`## 1. 수집 항목`,
collectsPersonalData
? `- 필수: 이메일, 주문번호, 결제 식별자, 서비스 제공에 필요한 사이트 진단 식별자`
: `- 개인정보를 별도로 수집하지 않습니다.`,
marketingOptIn ? `- 선택: 마케팅 수신 동의 정보` : `- 마케팅 수신 선택항목 없음`,
'',
`## 2. 처리 목적`,
`- 계정 인증, 주문 처리, 결제 확인, 디지털 산출물 제공, 고객 문의 응답, 보안 감사, 법령상 의무 이행`,
'',
`## 3. 보유 기간 및 파기`,
`- 처리 목적 달성 또는 보유기간 만료 시 지체 없이 파기합니다. 관계 법령상 보존이 필요한 주문·결제 기록은 해당 기간 동안 분리 보관합니다.`,
'',
`## 4. 제3자 제공 및 처리위탁`,
`- 법령상 의무 또는 결제·인프라 처리에 필요한 경우를 제외하고 제3자에게 제공하지 않습니다.`,
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
`- 서비스 제공 전 또는 법령상 청약철회가 가능한 경우 환불 요청을 접수합니다.`,
`- 이용자의 명시적 동의에 따라 디지털 산출물 제공이 시작된 뒤에는 제공 범위에 따라 청약철회가 제한될 수 있습니다.`,
`- 표시·광고 또는 계약 내용과 다르게 제공된 경우에는 관련 법령상 권리를 안내합니다.`
].join('\n');
const policy = [
`# 환불·배송·교환 정책`,
'',
`## 배송`,
`- 평균 출고 기간: 결제 후 ${shippingLeadDays}영업일 이내`,
'',
`## 환불`,
`- 서비스 제공 전 또는 법령상 청약철회가 가능한 경우 결제일로부터 ${refundWindowDays}일 이내 환불 요청을 접수합니다.`,
`- 이용자의 명시적 동의에 따라 PDF 리포트·템플릿·수정안 등 디지털 산출물 제공이 시작된 경우 제공 범위에 따라 환불이 제한될 수 있습니다.`,
`- 표시·광고 또는 계약 내용과 다르게 제공된 경우에는 관계 법령상 청약철회·환불 권리를 안내하고 처리합니다.`,
'',
`## 교환`,
`- 교환 가능 여부와 비용은 상품 특성 및 관련 법령에 따라 안내합니다.`,
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
`- 개인정보처리방침 / 이용약관 / 환불·배송·교환 정책 링크를 홈·결제·회원가입 영역에 노출`,
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
{ type: 'refund_shipping_exchange', title: '환불·배송·교환 정책', content: policy },
{ type: 'required_notices', title: '필수 고지 문구', content: notices }
]
};
}
function pickRecommendedPlan(riskScore) {
if (riskScore >= 75) return 'Auto';
if (riskScore >= 50) return 'Pro';
return 'Basic';
}
function buildCommercialOfferCatalog() {
const commonAssurance = ['법률 자문이 아닌 운영 참고용 점검 결과입니다.', '결제 후 내 사이트 관리에서 결과 확인', '가격의 3배 구성 가치 기준으로 제공합니다.', 'ct@nv0.kr 문의 연결'];
const kpi = ['신뢰 안내 보강률', '문의·구매 흐름 개선 항목 수', '재점검 시 남은 고위험 항목 수'];
return [
{ code: 'Report', group: 'one_time', title: '상세 리포트', price: 69000, period: '1회', priority: 1, summary: '무료 진단 결과를 더 자세한 리포트로 확장합니다. 위험 항목, 근거, 우선순위, 개선 순서를 한 번에 확인할 수 있습니다.', targetCustomer: '쇼핑몰·랜딩페이지 담당자, 1인 사업자, 외주 제작 완료 후 점검이 필요한 고객', deliverables: ['위험도 점수 해설', '전체 탐지 근거', '페이지별 우선 조치 목록', '공유용 리포트 본문', '재점검 체크리스트', 'FAQ·CTA 요약'], operations: ['결제 확인 후 내 사이트 관리에서 결과 확인', '진단 이력이 없을 경우 기본 점검 양식으로 제공', ...commonAssurance], benefits: ['위험 항목의 근거와 우선순위를 더 명확하게 확인', '개선 순서를 정리해 바로 조치 가능'], cta: '상세 리포트 신청', referencePrice: 100000, valuePackWorth: 207000 },
{ code: 'FixPack', group: 'one_time', title: '수정 문구안', price: 99000, period: '1회', priority: 2, summary: '탐지 항목별로 사이트에 바로 반영 가능한 고지·약관·환불·광고 문구 초안을 제공합니다.', targetCustomer: '사이트 안내 문구를 먼저 정리해야 하는 소상공인·마케터', deliverables: ['푸터 사업자 고지 문안', '환불·교환 안내 문구', '개인정보/약관 노출 가이드', '광고 표현 리스크 완화안', '수정 전/후 예시', 'FAQ·CTA 문구'], operations: ['우선순위가 높은 문구안부터 제공', '주의가 필요한 표현은 별도 표시', ...commonAssurance], benefits: ['사이트에 반영하기 쉬운 문구 예시 제공', '고객 오해 가능성이 있는 표현을 완화'], cta: '수정 문구안 받기', referencePrice: 150000, valuePackWorth: 297000 },
{ code: 'TemplatePack', group: 'one_time', title: '법률 문서 템플릿 팩', price: 69000, period: '1회', priority: 3, summary: '이용약관, 개인정보처리방침, 환불 정책 기본 템플릿을 묶어 제공합니다.', targetCustomer: '신규 사이트 오픈 전 필수 문서가 필요한 고객', deliverables: ['이용약관 템플릿', '개인정보처리방침 템플릿', '환불·배송·교환 정책', '필수 고지 체크리스트', '정기결제 고지 문구', '정책 섹션'], operations: ['문서 화면에서 입력한 정보 활용', '입력한 사업자 정보 기준으로 기본 문안 제공', ...commonAssurance], benefits: ['필수 문서를 빠르게 준비', '신규 사이트 오픈 전 기본 안내 정리'], cta: '템플릿 팩 구매', referencePrice: 100000, valuePackWorth: 207000 },
{ code: 'IndustryGuide', group: 'one_time', title: '업종별 규제 가이드', price: 99000, period: '1회', priority: 4, summary: '쇼핑몰·건기식·화장품·교육·의료 광고 등 업종별 표현 리스크와 필수 고지를 정리합니다.', targetCustomer: '광고 문구와 상세페이지 표현 리스크가 큰 업종 고객', deliverables: ['업종별 금지·주의 표현', '필수 고지 위치', '상세페이지 체크리스트', '광고 문구 점검표', '사전 검수 기준', 'FAQ·CTA 표현'], operations: ['업종 정보에 맞춰 주요 항목 제공', '업종이 정해지지 않은 경우 공통 가이드 제공', ...commonAssurance], benefits: ['업종별 주의 표현을 사전에 확인', '상세페이지와 광고 문구 점검에 활용'], cta: '업종 가이드 받기', referencePrice: 150000, valuePackWorth: 297000 },
{ code: 'Basic', group: 'subscription', title: 'Basic 모니터링', price: 99000, period: '월', priority: 5, summary: '소규모 사이트의 월 1회 리스크 재점검과 기본 이력 확인을 제공합니다.', targetCustomer: '월 1회 정기 점검만 필요한 소규모 사이트 고객', deliverables: ['월 1회 재점검', '전체 탐지 항목 해금', '기본 정책 초안', '이력 저장', '이메일 알림', '월간 요약 리포트'], operations: ['신청 후 사이트 이력 확인 가능', '월간 점검 알림 제공', ...commonAssurance], benefits: ['월 1회 정기 점검으로 변경 사항 확인', '이력 저장으로 이전 결과와 비교 가능'], cta: 'Basic 시작', referencePrice: 140000, valuePackWorth: 297000 },
{ code: 'Pro', group: 'subscription', title: 'Pro 정기 개선', price: 199000, period: '월', priority: 6, summary: '정밀 리포트, 수정 문구안, 법령 변경 알림을 포함한 추천 플랜입니다.', targetCustomer: '사이트 주문·문의가 발생하고 반복 점검이 필요한 고객', deliverables: ['Basic 전체 포함', '정밀 리포트 포함', '수정 문구안', '법령 변경 알림', '재점검 및 개선 추적', '전환용 CTA 포스팅 초안'], operations: ['결제 확인 후 Pro 결과 제공', '다음 조치 항목을 우선순위로 표시', ...commonAssurance], benefits: ['정밀 리포트와 수정 문구안을 함께 확인', '다음 조치 항목을 우선순위로 정리'], cta: 'Pro 시작', referencePrice: 290000, valuePackWorth: 597000 },
{ code: 'Auto', group: 'subscription', title: 'Auto 정기 케어', price: 299000, period: '월', priority: 7, summary: '반복 점검, 고객 안내 인사이트, 게시판 자동 발행으로 사이트 신뢰 관리를 돕습니다.', targetCustomer: '여러 캠페인·랜딩페이지를 꾸준히 점검해야 하는 팀', deliverables: ['Pro 전체 포함', '정기 고객 안내 인사이트', '게시판 자동 발행 상태', '승인 후 반영할 수 있는 수정 후보', '고위험 항목 우선 알림', '내 사이트 관리 대시보드', 'CTA 포스팅'], operations: ['정기 점검 결과 제공', '수정 후보는 확인 후 사용할 수 있도록 제공', ...commonAssurance], benefits: ['반복 점검 부담 완화', '게시판이 비어 보이지 않도록 운영감 유지', '여러 랜딩페이지의 고위험 항목을 우선 확인'], cta: 'Auto 시작', referencePrice: 450000, valuePackWorth: 897000 },
{ code: 'Certified', group: 'annual', title: 'NV0 Certified', price: 199000, period: '연', priority: 8, summary: '점검 완료 사이트에 신뢰 인증 마크와 공개 인증 페이지를 제공합니다.', targetCustomer: '구매 전 신뢰 표시가 필요한 쇼핑몰·B2B 랜딩페이지', deliverables: ['인증 마크 스니펫', '공개 인증 페이지', '연 1회 재검토', '인증 만료일 표기', '고객 신뢰 요소', '인증 안내 FAQ·CTA 문구'], operations: ['인증 검토 진행 상태 제공', '검토 완료 후 사용할 수 있는 표시 제공', ...commonAssurance], benefits: ['구매 전 신뢰 요소로 활용', '점검 완료 여부를 외부에 명확히 표시'], cta: '인증 신청', referencePrice: 290000, valuePackWorth: 597000 },
{ code: 'Agency', group: 'b2b', title: '대행사 리포트 패키지', price: 399000, period: '월', priority: 9, summary: '광고대행사·웹에이전시가 고객사 리스크 리포트를 반복 생성할 수 있는 패키지입니다.', targetCustomer: '고객사 사이트를 제작·지원하는 에이전시와 퍼포먼스 마케팅사', deliverables: ['고객사별 리포트', '고객사 제출용 문구 영역', '월 10개 도메인 기준', '고객 안내 인사이트 제공', '대행사 맞춤 안내 문구', '고객사 CTA 포스팅'], operations: ['서비스 신청 후 고객사별 리포트 구성 지원', '고객사별 결과를 구분해 확인 가능', ...commonAssurance], benefits: ['고객사별 리포트 제공에 활용', '여러 도메인의 점검 결과를 구분해 관리'], cta: '대행사 패키지 시작', referencePrice: 600000, valuePackWorth: 1197000 }
].sort((a, b) => a.priority - b.priority);
}
function getCommercialOffer(code) { return buildCommercialOfferCatalog().find(item => item.code === code) || null; }
function buildPlanCatalog(recommendedPlan = 'Pro') {
const offers = buildCommercialOfferCatalog();
const free = { code: 'Free', monthlyPrice: 0, period: '무료', title: 'Free', group: 'free', summary: '체험용 무료 진단. 위험도와 주요 리스크만 간단히 확인합니다.', features: ['URL 1개 즉시 진단', '위험도 점수', '상위 위험 2개 요약', '상세 근거·페이지별 조치안 잠금', '일일 무료 3회 제한'], recommended: false };
const paid = offers.map(offer => ({ code: offer.code, monthlyPrice: offer.price, period: offer.period, title: offer.title, group: offer.group, summary: offer.summary, features: offer.deliverables, targetCustomer: offer.targetCustomer, referencePrice: offer.referencePrice, valuePackWorth: offer.valuePackWorth, marketPosition: '약 30% 낮은 경쟁가와 실무 산출물 구성 기준', dailyPrice: offer.period === '월' ? Math.ceil(offer.price / 30) : 0, recommended: offer.code === recommendedPlan || (recommendedPlan === 'Pro' && offer.code === 'Pro') }));
return [free, ...paid];
}
function planPrice(plan) {
const offer = getCommercialOffer(plan);
if (offer) return offer.price;
return buildPlanCatalog(plan).find(item => item.code === plan)?.monthlyPrice || 69000;
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
return {
requestId: payload?.requestId || uid('scan'),
provider: 'external_http',
target: String(input).trim(),
normalizedTarget: payload?.normalizedTarget || String(input).trim(),
summary: payload?.summary || `${String(input).trim()} 외부 스캔이 완료되었습니다.`,
fetched: payload?.fetched !== false,
fetchStatus: Number(payload?.fetchStatus || 200),
fetchError: payload?.fetchError || null,
industry: payload?.industry || siteProfile.industry || '일반 이커머스',
siteProfile,
scannedPages: Array.isArray(payload?.scannedPages) ? payload.scannedPages : (Array.isArray(payload?.pages) ? payload.pages : []),
probeCount: Number(payload?.probeCount || (Array.isArray(payload?.scannedPages) ? payload.scannedPages.length : Array.isArray(payload?.pages) ? payload.pages.length : 1)),
categoryScores,
ruleVersion: payload?.ruleVersion || RULES_VERSION,
scanMode: payload?.scanMode || 'focused_key_pages',
cached: payload?.cached === true,
riskScore,
riskLevel,
totalFindings: Number(payload?.totalFindings || detailFindings.length),
categoryCounts,
estimatedMaxPenalty,
topFindings,
detailFindings,
autoFixCandidates,
recommendedPlan,
lockedPreviewCount: Math.max(0, detailFindings.length - 3),
generatedAt: payload?.generatedAt || nowIso(),
elapsedMs: Number(payload?.elapsedMs || 0),
findings: detailFindings.slice(0, 3).map(item => ({ key: item.code, label: item.title, status: item.priority })),
nextActions: payload?.nextActions || ['/plans', '/checkout', '/portal']
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
const findings = [];
for (const rule of rules) {
let triggered = false;
try {
triggered = !!rule.match({ url, html, text, target: input });
} catch {
triggered = false;
}
if (!triggered) continue;
const priority = rule.severity >= 22 ? 'P0' : rule.severity >= 16 ? 'P1' : 'P2';
findings.push({
id: uid('finding'),
code: rule.code,
category: rule.category,
title: rule.title,
severity: rule.severity,
priority,
estimatedPenaltyMax: rule.penaltyMax,
evidence: rule.code === 'HTTPS-ONLY' ? url?.protocol || 'unknown' : (text.slice(0, 160) || '페이지 본문 미수집'),
recommendation: rule.fixTemplate,
autoFixEligible: !['MARKETING-CLAIM', 'YOUTH-RESTRICTED'].includes(rule.code)
});
}
const categoryCounts = {};
for (const item of findings) categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
const estimatedMaxPenalty = findings.reduce((acc, item) => acc + item.estimatedPenaltyMax, 0);
let riskScore = findings.reduce((acc, item) => acc + Math.round(item.severity * 1.7), 0);
if (findings.some(item => item.code === 'HTTPS-ONLY')) riskScore += 6;
if (!fetched.fetched) riskScore += 8;
const siteProfile = buildSiteProfile(input, text);
if (siteProfile.likelyHighRegulation && riskScore > 0) riskScore += 4;
riskScore = clamp(riskScore, 8, 100);
const riskLevel = riskScore >= 80 ? '매우 높음' : riskScore >= 60 ? '높음' : riskScore >= 40 ? '주의' : riskScore >= 20 ? '보통' : '낮음';
const industry = siteProfile.industry;
const recommendedPlan = pickRecommendedPlan(riskScore);
const detailFindings = findings.sort((a, b) => b.severity - a.severity);
const topFindings = detailFindings.slice(0, 5).map(item => `${item.title} (${item.priority})`);
const autoFixCandidates = detailFindings.filter(item => item.autoFixEligible).slice(0, 5).map(item => ({
findingCode: item.code,
title: item.title,
patchSummary: item.recommendation
}));
const categoryScores = buildCategoryScores(detailFindings);
return {
requestId: uid('scan'),
provider: 'builtin',
target: String(input).trim(),
normalizedTarget: fetched.finalUrl || input,
summary: `${String(input).trim()} 핵심 페이지 중심 분석이 완료되었습니다.`,
fetched: fetched.fetched,
fetchStatus: fetched.status,
fetchError: fetched.error || null,
industry,
siteProfile,
categoryScores,
ruleVersion: RULES_VERSION,
scanMode: 'focused_key_pages',
cached: false,
riskScore,
riskLevel,
totalFindings: detailFindings.length,
categoryCounts,
estimatedMaxPenalty,
topFindings,
detailFindings,
autoFixCandidates,
recommendedPlan,
lockedPreviewCount: Math.max(0, detailFindings.length - 3),
generatedAt: nowIso(),
elapsedMs: Date.now() - startedAt,
findings: detailFindings.slice(0, 3).map(item => ({
key: item.code,
label: item.title,
status: item.priority
})),
nextActions: ['/plans', '/checkout', '/portal']
};
}
async function callExternalPaymentSession(payload) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
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
return data.session || data;
} finally {
clearTimeout(timeout);
}
}
function buildFixCopyFromScan(scan) {
const findings = Array.isArray(scan?.detailFindings) ? scan.detailFindings.slice(0, 5) : [];
if (!findings.length) return [
{ title: '푸터 사업자 정보', before: '사업자 정보 미노출 또는 위치 불명확', after: `${BUSINESS_PROFILE.tradeName} · 대표 ${BUSINESS_PROFILE.representative} · 지원 ${BUSINESS_PROFILE.contactEmail}` },
{ title: '환불 안내', before: '환불 가능 기간과 제한 조건 미기재', after: '환불·교환 기준은 결제 전 고지하며, 상품 특성 및 관련 법령에 따라 제한될 수 있습니다.' },
{ title: '개인정보 안내', before: '수집 목적과 보유 기간 불명확', after: '문의 응대 및 서비스 제공을 위해 필요한 최소한의 개인정보만 수집·이용합니다.' }
];
return findings.map(item => ({ title: item.title, before: item.evidence || '페이지 내 근거 문구 확인 필요', after: item.recommendation || '필수 고지 문구를 명확한 위치에 추가하세요.', priority: item.priority || 'P2' }));
}
function buildIndustryGuide(industry = '일반 이커머스') {
const normalized = String(industry || '').trim() || '일반 이커머스';
const common = ['상품·서비스의 핵심 조건은 결제 전 확인 가능한 위치에 배치합니다.', '환불·교환·취소 제한은 버튼 주변 또는 결제 전 단계에 반복 노출합니다.', '후기·성과·효능 표현은 객관적 근거 또는 제한 문구와 함께 사용합니다.', '개인정보 수집 입력폼에는 수집 목적, 항목, 보유기간, 동의 여부를 명확히 표시합니다.'];
const vertical = normalized.includes('건강') || normalized.includes('의료') ? ['질병 예방·치료 효과를 직접 단정하는 표현은 고위험 문구로 분류합니다.', '개인 체험 후기는 일반적 효능처럼 오인되지 않도록 제한 문구를 병기합니다.'] : normalized.includes('교육') ? ['합격률·수익·성과 보장은 근거와 산정 기준을 함께 고지합니다.', '기간 한정 할인은 실제 기간과 조건을 명확히 표시합니다.'] : ['배송비, 추가 비용, 청약철회 제한 조건을 상품 상세와 결제 단계에 모두 표시합니다.', '할인율·정가·비교가 표시는 기준 가격의 산정 근거를 보관합니다.'];
return { industry: normalized, checklist: [...vertical, ...common] };
}
function buildCertificationSnippet(order) {
const domain = order.domain || BUSINESS_PROFILE.domain;
return `<a href="${BUSINESS_PROFILE.domain}/portal?orderId=${order.id}" rel="nofollow noopener" style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #D0D5DD;border-radius:999px;font:600 13px system-ui;color:#101828;text-decoration:none;background:#fff">NV0 Certified · ${domain}</a>`;
}
function buildPurchasedAsset(db, order) {
const offer = getCommercialOffer(order.plan) || { title: order.plan, deliverables: [], price: order.amount };
const site = findSiteByAny(db, order.siteId, order.domain);
const scan = (db.scans || []).find(item => item.siteId === order.siteId) || (db.scans || [])[0] || null;
const industryGuide = buildIndustryGuide(scan?.industry || site?.industry || '일반 이커머스');
const policyDocuments = buildPolicyDocumentPreview({}, db.settings || {}).documents;
const premium = buildPremiumPurchasedAsset({ order, offer, scan, site, businessProfile: BUSINESS_PROFILE, policyDocuments, industryGuide });
const isReportPlan = order.plan === 'Report';
const isFixPackPlan = order.plan === 'FixPack';
const isTemplatePackPlan = order.plan === 'TemplatePack';
const isIndustryGuidePlan = order.plan === 'IndustryGuide';
const isCertifiedPlan = order.plan === 'Certified';
const assetKind = isFixPackPlan ? 'fix_pack' : isTemplatePackPlan ? 'template_pack' : isIndustryGuidePlan ? 'industry_guide' : isCertifiedPlan ? 'certification' : ['Basic','Pro','Auto','Agency'].includes(order.plan) ? 'subscription_entitlement' : isReportPlan ? 'report' : 'report';
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
legalDisclaimer: premium.legalDisclaimer || '본 산출물은 웹사이트 안내 리스크 점검 및 문구 개선 참고 자료이며, 개별 사건에 대한 법률 자문이 아닙니다.'
};
if (isCertifiedPlan) {
return { ...base, ...premium, badgeSnippet: buildCertificationSnippet(order) };
}
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
const plan = ['Report','FixPack','TemplatePack','IndustryGuide','Basic','Pro','Auto','Certified','Agency'].includes(payload.plan) ? payload.plan : 'Pro';
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
consent: { privacy: !!payload.privacyConsent, terms: !!payload.termsConsent, refund: !!payload.refundConsent, delivery: !!payload.deliveryConsent, consentedAt: nowIso(), dataMinimizationVersion: RELEASE_PHASE, withdrawalNoticeVersion: 'digital-output-v1' }
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
if (order.siteId) {
const site = findSiteByAny(db, order.siteId);
if (site) {
const sub = ensureSubscriptionForSite(db, site, order.plan || 'Pro');
sub.status = 'active';
sub.plan = order.plan || sub.plan;
sub.monthlyPrice = planPrice(sub.plan);
sub.activatedAt = nowIso();
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
if (order.siteId) {
const site = findSiteByAny(db, order.siteId);
if (site) {
const sub = ensureSubscriptionForSite(db, site, order.plan || 'Pro');
sub.status = 'active';
sub.plan = order.plan || sub.plan;
sub.monthlyPrice = planPrice(sub.plan);
sub.activatedAt = order.paidAt;
}
}
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
const scan = site ? (db.scans || []).find(item => item.siteId === site.id) || null : (db.scans || [])[0] || null;
const guidance = site ? findLatestGuidanceForSite(db, site.id) : null;
const autoFixJobs = site ? (db.autoFixJobs || []).filter(item => item.siteId === site.id).slice(0, 10) : [];
return {
order,
site,
subscription,
latestScan: scan,
guidance,
autoFixJobs,
boards: (db.boards || []).slice(0, 10),
legalUpdates: (db.legalUpdates || []).slice(0, 10),
plans: buildPlanCatalog(scan?.recommendedPlan || subscription?.plan || 'Pro')
};
}
async function fetchTargetHtml(target) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 4000);
try {
const res = await fetch(target, {
redirect: 'follow',
signal: controller.signal,
headers: {
'user-agent': 'Mozilla/5.0 (compatible; NV0/0.1; +https://nv0.kr/bot)'
}
});
const contentType = String(res.headers.get('content-type') || '');
const html = contentType.includes('text/html') ? await res.text() : '';
return { fetched: true, status: res.status, html, finalUrl: res.url, contentType };
} catch (error) {
return { fetched: false, error: error.message, html: '', finalUrl: target, status: 0, contentType: '' };
} finally {
clearTimeout(timeout);
}
}
function buildProbeUrls(target) {
const url = safeUrl(String(target || '').trim());
if (!url) return [];
const paths = ['/', '/privacy', '/terms', '/refund', '/business-info', '/checkout', '/cart', '/order'];
const seen = new Set();
return paths.map((pathname) => {
const next = new URL(url.toString());
next.pathname = pathname;
next.search = '';
next.hash = '';
return next.toString();
}).filter((item) => {
if (seen.has(item)) return false;
seen.add(item);
return true;
});
}
async function fetchTargetHtmlBundle(target) {
const urls = buildProbeUrls(target);
if (!urls.length) return { fetched: false, error: 'invalid url', html: '', finalUrl: target, status: 0, contentType: '', pages: [], probeCount: 0 };
const pages = [];
for (const probeUrl of urls.slice(0, 8)) {
const page = await fetchTargetHtml(probeUrl);
const contentLength = stripHtml(page.html || '').length;
if (page.fetched && page.status < 400 && contentLength > 20) {
pages.push({ url: probeUrl, finalUrl: page.finalUrl, status: page.status, contentType: page.contentType, contentLength, html: page.html });
}
}
const primary = pages[0] || await fetchTargetHtml(urls[0]);
const combinedHtml = pages.map((page) => '\n<!-- NV0_PAGE:' + (page.finalUrl || page.url) + ' -->\n' + page.html).join('\n');
return {
...primary,
fetched: pages.length > 0 || primary.fetched,
html: combinedHtml || primary.html || '',
finalUrl: primary.finalUrl || urls[0],
pages: pages.map(({ url, finalUrl, status, contentType, contentLength }) => ({ url, finalUrl, status, contentType, contentLength })),
probeCount: urls.length
};
}
async function scanResultFor(input, db = null) {
const startedAt = Date.now();
const cached = findReusableScan(db, input);
if (cached) return cached;
if (SCAN_PROVIDER === 'external_http') {
try {
const external = await runExternalScan(input);
external.elapsedMs = external.elapsedMs || (Date.now() - startedAt);
return external;
} catch (error) {
if (!SCAN_PROVIDER_FALLBACK) throw error;
const url = safeUrl(String(input).trim());
if (url && isBlockedTargetUrl(url)) throw new Error('blocked target url');
const fetched = (TARGET_FETCH_ENABLED && url) ? await fetchTargetHtmlBundle(url.toString()) : { fetched: false, html: '', error: TARGET_FETCH_ENABLED ? 'invalid url' : 'target fetch disabled', finalUrl: input, status: 0 };
const fallback = buildBuiltinScanResult(input, fetched, startedAt);
fallback.provider = 'builtin_fallback';
fallback.fetchError = error.message;
fallback.summary = `${String(input).trim()} 외부 스캔 실패로 내장 엔진으로 분석했습니다.`;
return fallback;
}
}
const url = safeUrl(String(input).trim());
if (url && isBlockedTargetUrl(url)) {
return buildBuiltinScanResult(input, { fetched: false, html: '', error: 'blocked target url', finalUrl: input, status: 0 }, startedAt);
}
const fetched = (TARGET_FETCH_ENABLED && url)
? await fetchTargetHtmlBundle(url.toString())
: { fetched: false, html: '', error: TARGET_FETCH_ENABLED ? 'invalid url' : 'target fetch disabled', finalUrl: input, status: 0 };
return buildBuiltinScanResult(input, fetched, startedAt);
}
function hmac(key, value, encoding) {
return crypto.createHmac('sha256', key).update(value).digest(encoding);
}
function sha256Hex(value) {
return crypto.createHash('sha256').update(value).digest('hex');
}
async function putObjectToS3Compatible({ key, content, contentType }) {
const endpoint = String(process.env.NV0_S3_ENDPOINT || '').replace(/\/$/, '');
const bucket = String(process.env.NV0_S3_BUCKET || '').trim();
const region = String(process.env.NV0_S3_REGION || 'ap-northeast-2').trim();
const accessKey = String(process.env.NV0_S3_ACCESS_KEY_ID || '').trim();
const secretKey = String(process.env.NV0_S3_SECRET_ACCESS_KEY || '').trim();
const publicBaseUrl = String(process.env.NV0_S3_PUBLIC_BASE_URL || '').replace(/\/$/, '');
if (!endpoint || !bucket || !accessKey || !secretKey) throw new Error('S3 compatible storage is not configured.');
const now = new Date();
const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
const dateStamp = amzDate.slice(0, 8);
const encodedKey = key.split('/').map(encodeURIComponent).join('/');
const url = new URL(`${endpoint}/${bucket}/${encodedKey}`);
const host = url.host;
const payloadHash = sha256Hex(content);
const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
const canonicalRequest = ['PUT', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
const kDate = hmac(`AWS4${secretKey}`, dateStamp);
const kRegion = hmac(kDate, region);
const kService = hmac(kRegion, 's3');
const kSigning = hmac(kService, 'aws4_request');
const signature = hmac(kSigning, stringToSign, 'hex');
const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
const response = await fetch(url, {
method: 'PUT',
headers: {
authorization,
'content-type': contentType || 'application/octet-stream',
'x-amz-content-sha256': payloadHash,
'x-amz-date': amzDate
},
body: content
});
if (!response.ok) {
const errorText = await response.text().catch(() => "");
throw new Error(`S3 upload failed: ${response.status} ${errorText}`.trim());
}
return { key, url: publicBaseUrl ? `${publicBaseUrl}/${encodedKey}` : url.toString() };
}
function isRefundRequestAllowed(order) {
if (!order || order.status !== 'paid') return false;
const paidAt = Date.parse(order.paidAt || order.createdAt || '');
if (!Number.isFinite(paidAt)) return true;
return Date.now() - paidAt <= REFUND_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
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
auditLogs: (db.auditLogs || []).length
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
{ key: 'operator_alert_email', ok: isValidEmail(OPERATOR_ALERT_EMAIL), label: '운영 알림 이메일 유효성' }
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
{ key: 'runtime_clean_enough', ok: (db.pendingJobs || []).length === 0 && (db.emailOutbox || []).filter(item => item.status === 'sending').length === 0, label: '배포 직전 런타임 미완료 작업 없음' },
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
ip: clientIp(req),
method: req.method,
path: new URL(req.url, `http://${req.headers.host}`).pathname,
meta: sanitizeAuditPayload(maskSensitive(meta))
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
payload: sanitizeAuditPayload(event.payload || {})
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
payload: sanitizeAuditPayload(record.payload || {})
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
async function createBackupSnapshot() {
await ensureRuntime();
const stamp = nowIso().replace(/[:.]/g, '-');
const dbSource = path.join(DATA_DIR, 'db.json');
const dbTarget = path.join(BACKUPS_DIR, `db-${stamp}.json`);
await fs.copyFile(dbSource, dbTarget);
return { dbTarget };
}
async function listBackupSnapshots() {
await ensureRuntime();
const names = (await fs.readdir(BACKUPS_DIR)).filter(name => name.startsWith('db-') && name.endsWith('.json')).sort().reverse();
const items = [];
for (const name of names) {
const fullPath = path.join(BACKUPS_DIR, name);
const stat = await fs.stat(fullPath);
items.push({ name, fullPath, size: stat.size, mtime: stat.mtime.toISOString() });
}
return items;
}
async function pruneBackupSnapshots() {
const backups = await listBackupSnapshots();
const keep = Math.max(BACKUP_RETENTION_COUNT, 1);
const removed = [];
for (const backup of backups.slice(keep)) {
await fs.unlink(backup.fullPath).catch(() => {});
removed.push(backup.name);
}
return { keep, removed };
}
async function restoreBackupSnapshot(name) {
await ensureRuntime();
if (!/^db-[a-zA-Z0-9T:._-]+\.json$/.test(name)) {
throw new Error('invalid backup name');
}
const source = path.join(BACKUPS_DIR, name);
const normalized = path.normalize(source);
if (!normalized.startsWith(BACKUPS_DIR)) {
throw new Error('invalid backup path');
}
await fs.access(normalized);
await fs.copyFile(normalized, path.join(DATA_DIR, 'db.json'));
return { restoredFrom: normalized };
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
AUDIT_LOG_RETENTION_COUNT,
STORAGE_MODE,
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
if (!token || typeof token !== 'string') return { ok: false, error: 'turnstile token required' };
const form = new URLSearchParams({
secret: TURNSTILE_SECRET,
response: token,
remoteip: clientIp(req)
});
const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
method: 'POST',
headers: { 'content-type': 'application/x-www-form-urlencoded' },
body: form.toString()
});
const data = await response.json();
return { ok: !!data.success, raw: data, error: data['error-codes']?.join(', ') || null };
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
sub = { id: uid('sub'), siteId: site.id, plan, status: 'trial', monthlyPrice: plan === 'Auto' ? 299000 : plan === 'Pro' ? 199000 : 99000, createdAt: nowIso() };
db.subscriptions.unshift(sub);
} else {
sub.plan = plan || sub.plan;
}
return sub;
}
function createGuidanceDocument(db, site, scan) {
const content = buildGuidanceForSite(site, scan, db.settings);
const doc = {
id: uid('guide'),
siteId: site.id,
title: `${site.domain} 맞춤 개선 안내`,
type: 'site_guideline',
version: `v${Date.now()}`,
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
db.publications ||= [];
db.boards ||= [];
let article = null;
const tried = [];
for (let offset = 0; offset < 144; offset += 1) {
const variant = chooseCtaVariant(db, { ...options, sequenceOffset: offset });
const triedKey = variant.combinationKey || variant.ctaType;
if (tried.includes(triedKey)) continue;
tried.push(triedKey);
const draft = buildCtaBoardArticle(scan || {}, variant, options);
const duplicate = [...db.publications, ...db.boards].some(item => item.contentFingerprint === draft.contentFingerprint || (item.title && item.title === draft.title));
if (!duplicate) { article = draft; break; }
}
if (!article) {
const variant = chooseCtaVariant(db, { ...options, sequenceOffset: Date.now() % 144 });
article = buildCtaBoardArticle(scan || {}, variant, { ...options, title: `${variant.headline} · ${new Date().toLocaleDateString('ko-KR')}` });
}
const base = { ctaType: article.ctaType, titleCandidates: article.titleCandidates, tags: article.tags, qualityStandard:'cta-v8-unbounded-seo', seoQualityStandard:'cta-v8-unbounded-seo', wordRangeKo: '900-1500', sections: ['제목 후보', '도입', '문제 제기', '해결 과정', '신뢰 근거', 'FAQ', '자연스러운 CTA', '태그'], diversityKey: article.diversityKey, contentFingerprint: article.contentFingerprint, searchIntent: article.seo?.searchIntent || null, funnelStage: article.seo?.funnelStage || null, primaryKeyword: article.seo?.primaryKeyword || null, secondaryKeywords: article.seo?.secondaryKeywords || [], metaDescription: article.seo?.metaDescription || null, baseCtaType: article.baseCtaType || null, combinationMode: article.combinationMode || null, combinationKey: article.combinationKey || null, contentArchetype: article.contentArchetype || article.seo?.contentArchetype || null, audienceSegment: article.audienceSegment || article.seo?.audienceSegment || null };
const publication = { id: uid('pub'), title: article.title, status: 'published', type: 'cta', boardType: article.boardType, ...base, relatedRequestId: scan?.requestId || null, body: article.body, createdAt: nowIso(), autoPublished: options.autoPublished === true };
db.publications.unshift(publication);
db.boards.unshift({ id: uid('board'), title: article.title, boardType: article.boardType, type: 'cta', ...base, body: article.body, createdAt: nowIso(), visibility: 'public', autoPublished: options.autoPublished === true, publishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS });
db.publications = db.publications.slice(0, 200);
db.boards = db.boards.slice(0, 200);
return publication;
}

async function runCtaAutopublish(reason = 'interval') {
const db = await readDb();
const settings = db.settings || {};
if (settings.ctaAutopublishEnabled === false) return { ok: true, skipped: 'disabled' };
const last = (db.publications || []).find(item => item.type === 'cta' && item.autoPublished);
if (last && Date.now() - Date.parse(last.createdAt || 0) < CTA_AUTOPUBLISH_INTERVAL_MS) {
return { ok: true, skipped: 'interval' };
}
const scan = (db.scans || [])[0] || {
requestId: uid('scan'),
target: BUSINESS_PROFILE.domain,
industry: '온라인 사업',
riskScore: 55,
totalFindings: 3,
topFindings: ['지원 고지', '환불 정책 표시', '개인정보 처리방침 위치']
};
const item = createCtaPublication(db, scan, { autoPublished: true });
appendAudit(db, { headers: {}, socket: {} }, 'system.cta.autopublished', { id: item.id, reason });
await writeDb(db);
return { ok: true, publication: item };
}
async function handleApi(req, res) {
const url = new URL(req.url, `http://${req.headers.host}`);
const pathname = url.pathname;
if (pathname === '/healthz') {
return json(req, res, 200, { ok: true, service: 'nv0-veridion', uptimeSec: Math.round(process.uptime()) });
}
if (pathname === '/api/public/diagnosis-engine' && req.method === 'GET') {
return json(req, res, 200, { ok: true, phase: RELEASE_PHASE, engine: 'NV0 Builtin Diagnosis Engine', rulesVersion: RULES_VERSION, targetFetchEnabled: TARGET_FETCH_ENABLED, scanProvider: SCAN_PROVIDER, endpoints: { scan: 'POST /api/public/scan', diagnose: 'POST /api/public/diagnose', board: 'GET /api/public/system-items', engine: 'GET /api/public/diagnosis-engine', productIntelligence: 'GET /api/public/product-intelligence' }, smartProduct: { version: 'p153-smart-ops-v1', nextBestAction: true, planFitScoring: true, journeyOrchestration: true, smartProductEndpoint: '/api/public/smart-product', userPath: ['무료 진단','스마트 추천','요금제 선택','내 사이트 관리','CTA 재유입'] }, autoPublish: { boardName: '게시판', intervalMs: CTA_AUTOPUBLISH_INTERVAL_MS, intervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), topicPackCount: ctaTopicPacks().length, combinationStats: ctaCombinationStats(), variants: ctaTopicPacks().map(item => item.headline) }, checks: buildRuleCatalog().map(({ code, category, title, severity, penaltyMax }) => ({ code, category, title, severity, penaltyMax })) });
}
if (pathname === '/readyz') {
try {
validateConfig();
await ensureRuntime();
await readDb();
if (!(PERSISTENCE_MODE === 'postgres_primary' && PLATFORM.commercial)) await fs.access(path.join(DATA_DIR, 'db.json'));
if (!PLATFORM.commercial || STORAGE_MODE === 'local_fs') await fs.access(UPLOADS_DIR);
const redisSessionReady = READYZ_REDIS_STRICT ? await sessionStore.ping() : Boolean(sessionStore.redisEnabled);
const redisRateLimitReady = READYZ_REDIS_STRICT ? await rateLimitStore.ping() : Boolean(rateLimitStore.redisEnabled);
const redisLockReady = READYZ_REDIS_STRICT ? await distributedLock.ping() : Boolean(distributedLock.redisEnabled);
const probePath = path.join(REPORTS_DIR, `.readyz-${process.pid}.tmp`);
await fs.writeFile(probePath, JSON.stringify({ checkedAt: nowIso() }));
await fs.unlink(probePath);
if (READYZ_REDIS_STRICT && (!redisSessionReady || !redisRateLimitReady || !redisLockReady)) throw new Error("Strict readiness requires Redis-backed session, rate-limit, and lock providers.");
return json(req, res, 200, { ok: true, ready: true, runtimeWritable: true, platformTarget: PLATFORM.target, deploymentStage: DEPLOYMENT_STAGE, commercialLaunchReady: COMMERCIAL_LAUNCH_READY, prelaunchMode: PRELAUNCH_MODE, persistenceMode: PERSISTENCE_MODE, storageMode: STORAGE_MODE, turnstileEnabled: TURNSTILE_PUBLIC_ENABLED, redis: { readinessMode: READYZ_REDIS_STRICT ? "strict_ping" : "prelaunch_advisory_no_ping", sessionStore: redisSessionReady, rateLimitStore: redisRateLimitReady, lockProvider: redisLockReady }, paymentProvider: PAYMENT_PROVIDER === "portone_v2" ? PORTONE_CLIENT.configSummary() : { mode: PAYMENT_PROVIDER }, secureRecordStore: persistence.secureRecordStore || null });
} catch (error) {
return json(req, res, 503, { ok: false, ready: false, runtimeWritable: false, error: error.message });
}
}
if (pathname === '/robots.txt' && req.method === 'GET') {
return text(req, res, 200, buildRobotsTxt(), { 'cache-control': 'public, max-age=3600' });
}
if (pathname === '/sitemap.xml' && req.method === 'GET') {
const db = await readDb();
return text(req, res, 200, buildSitemapXml(db), { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=1800, stale-while-revalidate=3600' });
}
if (pathname === '/feed.xml' && req.method === 'GET') {
const db = await readDb();
return text(req, res, 200, buildFeedXml(db), { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=1800, stale-while-revalidate=3600' });
}
if (pathname === '/api/public/config' && req.method === 'GET') {
return json(req, res, 200, { ok: true, turnstileEnabled: TURNSTILE_PUBLIC_ENABLED, turnstileConfigured: TURNSTILE_CONFIGURED, prelaunchMode: PRELAUNCH_MODE, turnstileSiteKey: TURNSTILE_PUBLIC_ENABLED ? TURNSTILE_SITE_KEY : '' });
}
if (pathname === '/api/public/health' && req.method === 'GET') {
return json(req, res, 200, { ok: true, area: 'public', time: nowIso(), phase: RELEASE_PHASE, privacy: 'minimum_required_only' });
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
return json(req, res, 200, { ok: true, publishIntervalMs: CTA_AUTOPUBLISH_INTERVAL_MS, publishIntervalMinutes: Math.round(CTA_AUTOPUBLISH_INTERVAL_MS / 60000), variantCount: ctaTopicPacks().length, topicPackCount: ctaTopicPacks().length, combinationMode: 'unbounded_seeded_combinatorial', combinationStats: ctaCombinationStats(), variants: ctaTopicPacks().map(({ ctaType, boardType, primaryKeyword, headline, intent, funnel }) => ({ ctaType, boardType, primaryKeyword, headline, intent, funnel })), posts: db.boards.slice(0, 20) });
}
if (pathname === '/api/public/content' && req.method === 'GET') {
const db = await readDb();
const type = String(url.searchParams.get('type') || '').trim();
let items = buildSystemItemsFeed(db).filter(item => item.visibility !== 'private');
if (type) items = items.filter(item => item.type === type);
return json(req, res, 200, { ok: true, items: items.slice(0, 50) });
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
if (pathname === '/api/admin/session' && req.method === 'GET') {
const session = await getSession(req);
return json(req, res, 200, { ok: true, authenticated: !!session, csrfToken: session?.csrfToken || '', turnstileEnabled: ENABLE_TURNSTILE, turnstileSiteKey: ENABLE_TURNSTILE ? TURNSTILE_SITE_KEY : '', adminAuthMode: ADMIN_AUTH_MODE, platformTarget: PLATFORM.target, adminUser: session ? { id: session.adminUserId || null, email: session.adminEmail || null, displayName: session.adminDisplayName || null, roles: session.roles || [], permissions: session.permissions || [] } : null });
}
if (pathname === '/api/admin/session' && req.method === 'POST') {
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
db.adminSessions.unshift({ id: uid('admsess'), sessionId: sid, userId: auth.user.id, createdAt: nowIso(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(), ip: clientIp(req) });
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
if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
if (!requireAdminCsrf(req, res, session)) return;
}
const db = await readDb();
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
scanProvider: SCAN_PROVIDER,
paymentProvider: PAYMENT_PROVIDER,
deploymentStage: DEPLOYMENT_STAGE,
commercialLaunchReady: COMMERCIAL_LAUNCH_READY
},
storage: { uploadsDir: UPLOADS_DIR, runtimeDir: RUNTIME_DIR, backupsDir: BACKUPS_DIR, reportsDir: REPORTS_DIR },
integrations: {
scanProvider: { mode: SCAN_PROVIDER, urlConfigured: !!SCAN_PROVIDER_URL, fallbackEnabled: SCAN_PROVIDER_FALLBACK },
paymentProvider: PAYMENT_PROVIDER === 'portone_v2' ? { mode: PAYMENT_PROVIDER, ...PORTONE_CLIENT.configSummary() } : { mode: PAYMENT_PROVIDER, urlConfigured: !!PAYMENT_PROVIDER_URL },
storage: { mode: STORAGE_MODE, uploadsDir: UPLOADS_DIR },
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
const report = await buildOpsReport();
return json(req, res, 200, { ok: true, report });
}
if (pathname === '/api/admin/ops-report/run' && req.method === 'POST') {
const snapshot = await writeOpsReportSnapshot();
const reloaded = await readDb();
const audit = appendAudit(reloaded, req, 'admin.ops_report.created', { filePath: snapshot.filePath });
await writeDb(reloaded);
return json(req, res, 200, { ok: true, snapshot: { filePath: snapshot.filePath }, audit, report: snapshot.report });
}
if (pathname === '/api/admin/maintenance/prune' && req.method === 'POST') {
const pruned = await pruneBackupSnapshots();
const reloaded = await readDb();
const audit = appendAudit(reloaded, req, 'admin.maintenance.pruned', pruned);
await writeDb(reloaded);
return json(req, res, 200, { ok: true, pruned, audit });
}
if (pathname === '/api/admin/backups' && req.method === 'GET') {
const backups = await listBackupSnapshots();
return json(req, res, 200, { ok: true, backups });
}
if (pathname === '/api/admin/backups/restore' && req.method === 'POST') {
const body = { name: asTrimmedString((await bodyJson(req, MAX_JSON_BODY_BYTES) || {}).name, { field: 'name', required: true, max: 255 }) };
const restored = await restoreBackupSnapshot(body.name);
const reloaded = await readDb();
const audit = appendAudit(reloaded, req, 'admin.backup.restored', { name: body.name, ...restored });
await writeDb(reloaded);
return json(req, res, 200, { ok: true, restored, audit });
}
if (pathname === '/api/admin/backups/run' && req.method === 'POST') {
const backup = await createBackupSnapshot();
const audit = appendAudit(db, req, 'admin.backup.created', backup);
await writeDb(db);
return json(req, res, 200, { ok: true, backup, audit });
}
if (pathname === '/api/admin/settings' && req.method === 'GET') return json(req, res, 200, { ok: true, settings: db.settings });
if (pathname === '/api/admin/settings' && req.method === 'POST') {
const body = normalizeSettingsPayload(await bodyJson(req, MAX_JSON_BODY_BYTES));
db.settings = { ...db.settings, ...body };
appendAudit(db, req, 'admin.settings.updated', { keys: Object.keys(body) });
await writeDb(db);
return json(req, res, 200, { ok: true, settings: db.settings });
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
const result = await scanResultFor(body.target, db);
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
if (pathname === '/api/admin/email-outbox' && req.method === 'GET') {
return json(req, res, 200, { ok: true, emails: (db.emailOutbox || []).slice(0, 200).map(item => ({ ...item, body: String(item.body || '').slice(0, 500) })) });
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
if (pathname === '/api/admin/release-readiness' && req.method === 'GET') return json(req, res, 200, { ok: true, readiness: buildReleaseReadiness(db), operationalEvents: (db.operationalEvents || []).slice(0, 100) });
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
const emailProbe = enqueueTransactionalEmail(db, { to: OPERATOR_ALERT_EMAIL, template: 'ops_self_test', subject: '[NV0] 운영 자가검수', body: '운영 자가검수 이메일 큐 테스트입니다.' });
appendAudit(db, req, 'admin.ops.self_test', { ready: readiness.ready, emailProbeId: emailProbe.id });
await writeDb(db);
return json(req, res, 200, { ok: true, readiness, probes: { emailOutboxId: emailProbe.id, dbWritable: true, runtime: 'ok' } });
}
if (pathname === '/api/admin/ops' && req.method === 'POST') {
const body = normalizeOpsPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
const action = body.action;
if (action === 'backup') {
const backup = await createBackupSnapshot();
appendAudit(db, req, 'admin.ops.backup', { target: backup.dbTarget });
await writeDb(db);
return json(req, res, 200, { ok: true, action, backup });
}
if (action === 'restore_latest') {
const backups = await listBackupSnapshots();
if (!backups.length) return json(req, res, 404, { ok: false, error: '복원할 백업이 없습니다.' });
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
return json(req, res, 404, { ok: false, error: 'Not found' });
}
const server = http.createServer(async (req, res) => {
req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('REQUEST_TIMEOUT')));
const startedAt = Date.now();
const requestId = uid('req');
res.setHeader('x-request-id', requestId);
try {
if (!isAllowedHost(req)) return text(req, res, 421, 'Misdirected Request');
const requestUrl = requestUrlFrom(req);
const pathname = requestUrl.pathname;
if (req.method === 'OPTIONS') { res.writeHead(204, { allow: 'GET, HEAD, POST, OPTIONS', ...baseHeaders(req) }); return res.end(); }
if (pathname.length > 1 && pathname.endsWith('/')) {
requestUrl.pathname = pathname.replace(/\/+$/, '');
return redirect(req, res, 308, requestUrl.pathname + requestUrl.search);
}
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
const apiHandled = await handleApi(req, res);
if (apiHandled !== false) return;
const rendered = await renderPage(pathname, req, res);
if (rendered) return;
text(req, res, 404, 'Not found');
} catch (error) {
const status = error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_JSON', 'INVALID_PAYLOAD'].includes(error?.code) ? 400 : 500;
json(req, res, status, { ok: false, error: status === 413 ? '요청 크기가 너무 큽니다.' : status === 400 ? (error.message || '잘못된 요청입니다.') : '서버 오류가 발생했습니다.', requestId });
} finally {
const pathname = (() => { try { return requestUrlFrom(req).pathname; } catch { return 'invalid-url'; } })();
console.log(JSON.stringify({
level: 'info',
requestId,
method: req.method,
path: pathname,
statusCode: res.statusCode,
elapsedMs: Date.now() - startedAt,
ip: clientIp(req)
}));
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
async function shutdown() {
clearInterval(cleanupInterval);
clearInterval(ctaAutopublishInterval);
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
await runCtaAutopublish('startup');
await writeDb(db);
server.listen(PORT, HOST, () => {
console.log(`nv0 cleanroom server listening on http://${HOST}:${PORT} target=${PLATFORM.target} stage=${DEPLOYMENT_STAGE} launchReady=${COMMERCIAL_LAUNCH_READY} payment=${PAYMENT_PROVIDER}`);
});
}).catch((error) => {
console.error('server startup failed', error);
process.exit(1);
});

