import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertCommercialRouteAllowed, createPlatformProfile } from './core/platform.mjs';
import { PAYMENT_SESSION_TRANSITIONS, ORDER_STATUS_TRANSITIONS, canTransition } from './core/payment-state-machine.mjs';
import { authenticateAdminAccount, ensureAdminCollections, ensureBootstrapAdmin, getAdminPermissions, getAdminRoles } from './core/admin-auth.mjs';
import { createPersistenceManager } from './infrastructure/persistence/persistence.mjs';
import { createSessionStore } from './infrastructure/session/session-store.mjs';
import { createRateLimitStore } from './infrastructure/ratelimit/rate-limit-store.mjs';
import { createDistributedLock } from './infrastructure/lock/distributed-lock.mjs';
import { createPortOneV2Client, verifyPortOnePaymentAgainstOrder } from './infrastructure/payments/portone-v2.mjs';
import { verifyPortOneWebhook } from './infrastructure/payments/portone-webhook-verify.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'runtime');
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
  contactEmail: process.env.NV0_SUPPORT_EMAIL || 'support@nv0.kr',
  domain: process.env.NV0_PUBLIC_BASE_URL || 'https://nv0.kr'
});

const PORT = Number(process.env.PORT || 3210);
const HOST = String(process.env.HOST || process.env.NV0_HOST || '0.0.0.0');
const NODE_ENV = process.env.NODE_ENV || 'development';
const PLATFORM = createPlatformProfile(process.env);
const TRUST_PROXY_HEADERS = process.env.NV0_TRUST_PROXY_HEADERS === 'true';
const ADMIN_KEY = process.env.NV0_ADMIN_KEY || ''; // legacy MVP-only shared key
const SESSION_TTL_MS = Number(process.env.NV0_ADMIN_SESSION_TTL_MS || 1000 * 60 * 60);
const MAX_JSON_BODY_BYTES = Number(process.env.NV0_MAX_JSON_BODY_BYTES || 64 * 1024);
const MAX_MULTIPART_BODY_BYTES = Number(process.env.NV0_MAX_MULTIPART_BODY_BYTES || 5 * 1024 * 1024);
const ENABLE_TURNSTILE = process.env.NV0_ENABLE_TURNSTILE === 'true';
const TURNSTILE_SECRET = process.env.NV0_TURNSTILE_SECRET || '';
const TURNSTILE_SITE_KEY = process.env.NV0_TURNSTILE_SITE_KEY || '';
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
const PAYMENT_PROVIDER = process.env.NV0_PAYMENT_PROVIDER || (PLATFORM.commercial ? 'portone_v2' : 'demo');
const PAYMENT_PROVIDER_URL = process.env.NV0_PAYMENT_PROVIDER_URL || '';
const PAYMENT_PROVIDER_TOKEN = process.env.NV0_PAYMENT_PROVIDER_TOKEN || '';
const PORTONE_CLIENT = createPortOneV2Client(process.env);
const PORTONE_WEBHOOK_SECRET = process.env.NV0_PORTONE_WEBHOOK_SECRET || '';
const PORTONE_WEBHOOK_VERIFY_MODE = process.env.NV0_PORTONE_WEBHOOK_VERIFY_MODE || (PLATFORM.target === 'commercial' || NODE_ENV === 'production' ? 'strict' : 'optional');
const RULES_VERSION = process.env.NV0_RULES_VERSION || '2026.04.23-core3';
const SCAN_CACHE_TTL_MS = Number(process.env.NV0_SCAN_CACHE_TTL_MS || 10 * 60_000);

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
    storageMode: STORAGE_MODE
  },
  orders: [
    { id: 'ord-1001', customer: 'Acme Co', status: 'paid', stage: 'scan_requested', amount: 129000, createdAt: nowIso() },
    { id: 'ord-1002', customer: 'Beta Labs', status: 'pending', stage: 'draft', amount: 59000, createdAt: nowIso() }
  ],
  subscriptions: [
    { id: 'sub-1001', siteId: 'site-seed-001', plan: 'Auto', status: 'active', monthlyPrice: 149000, createdAt: nowIso() }
  ],
  publications: [
    { id: 'pub-1001', title: '전자상거래 사이트 필수 고지 7가지', status: 'published', type: 'cta', createdAt: nowIso(), ctaType: 'free_scan' }
  ],
  boards: [
    { id: 'board-1001', boardType: 'notice', title: 'Veridion 운영 공지', body: '1인 운영 최적화형 공지 게시판입니다.', createdAt: nowIso(), visibility: 'public' }
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
  adminUsers: [],
  adminRoleBindings: [],
  adminSessions: [],
  auditLogs: []
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
    adminUsers: [],
    adminRoleBindings: [],
    adminSessions: [],
    auditLogs: []
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
  if (PLATFORM.commercial && ADMIN_AUTH_MODE === 'shared_key') {
    throw new Error('NV0_ADMIN_AUTH_MODE=shared_key is not allowed in production. Use account_rbac.');
  }
  if (ENABLE_TURNSTILE && !TURNSTILE_SECRET) {
    throw new Error('NV0_TURNSTILE_SECRET is required when NV0_ENABLE_TURNSTILE=true.');
  }
  if (ENABLE_TURNSTILE && !TURNSTILE_SITE_KEY) {
    throw new Error('NV0_TURNSTILE_SITE_KEY is required when NV0_ENABLE_TURNSTILE=true.');
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
    if (PAYMENT_PROVIDER !== 'portone_v2') throw new Error('Commercial launch requires NV0_PAYMENT_PROVIDER=portone_v2.');
    if (SCAN_PROVIDER !== 'external_http') throw new Error('Commercial launch requires NV0_SCAN_PROVIDER=external_http.');
    if (!SCAN_PROVIDER_URL) throw new Error('Commercial launch requires NV0_SCAN_PROVIDER_URL.');
    if (!['s3','s3_compatible','object_storage'].includes(STORAGE_MODE)) throw new Error('Commercial launch requires object storage mode, not local_fs.');
    for (const key of ['NV0_S3_ENDPOINT','NV0_S3_BUCKET','NV0_S3_ACCESS_KEY_ID','NV0_S3_SECRET_ACCESS_KEY']) {
      if (!String(process.env[key] || '').trim()) throw new Error('Commercial launch requires object storage credentials.');
    }
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
    `script-src 'self'${ENABLE_TURNSTILE ? ' https://challenges.cloudflare.com' : ''}`,
    "style-src 'self'",
    `connect-src 'self'${ENABLE_TURNSTILE ? ' https://challenges.cloudflare.com' : ''}`,
    ENABLE_TURNSTILE ? 'frame-src https://challenges.cloudflare.com' : "frame-src 'none'",
    "require-trusted-types-for 'script'"
  ];
  const headers = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
    'permissions-policy': 'geolocation=(), microphone=(), camera=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'content-security-policy': cspParts.join('; ')
  };
  if (isSecureRequest(req)) {
    headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  if (category === 'dynamic') headers['cache-control'] = 'no-store';
  if (category === 'public-page') headers['cache-control'] = 'public, max-age=60, stale-while-revalidate=300';
  if (category === 'static') headers['cache-control'] = 'public, max-age=31536000, immutable';
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

function redirect(req, res, location) {
  res.writeHead(302, { location, ...baseHeaders(req) });
  res.end();
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    out[key] = decodeURIComponent(rest.join('='));
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

function sameOriginAllowed(req) {
  const host = String(req.headers.host || '').trim().toLowerCase();
  const acceptedHosts = new Set([host, ...ALLOWED_ADMIN_ORIGINS.map(v => v.toLowerCase())]);
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

async function serveFile(req, res, absPath, contentType) {
  try {
    const data = await fs.readFile(absPath);
    const category = absPath.includes('/runtime/uploads/') ? 'upload' : 'static';
    res.writeHead(200, { 'content-type': contentType, ...baseHeaders(req, category) });
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
  const clean = decodeURIComponent(req.url.split('?')[0]);
  const rel = prefix ? clean.slice(prefix.length) : clean;
  const abs = path.normalize(path.join(rootDir, rel));
  if (!abs.startsWith(rootDir)) return text(req, res, 403, 'Forbidden');
  return serveFile(req, res, abs, mime(abs));
}

function pageMap(urlPath) {
  if (PLATFORM.commercial && ['/demo', '/products/veridion/demo'].includes(urlPath)) return null;
  const m = {
    '/': [PUBLIC_DIR, 'home'],
    '/guides': [PUBLIC_DIR, 'guides'],
    '/documents': [PUBLIC_DIR, 'documents'],
    '/demo': [PUBLIC_DIR, 'demo'],
    '/products/veridion/demo': [PUBLIC_DIR, 'veridion-demo'],
    '/plans': [PUBLIC_DIR, 'plans'],
    '/checkout': [PUBLIC_DIR, 'checkout'],
    '/portal': [PUBLIC_DIR, 'portal'],
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

function businessFooterHtml() {
  const types = BUSINESS_PROFILE.businessTypes.join(' · ');
  return '<footer class="business-footer" aria-label="사업자 정보">'
    + `<strong>${BUSINESS_PROFILE.tradeName}</strong>`
    + `<span>대표자: ${BUSINESS_PROFILE.representative}</span>`
    + `<span>사업자등록번호: ${BUSINESS_PROFILE.registrationNumber}</span>`
    + `<span>주소: ${BUSINESS_PROFILE.address}</span>`
    + `<span>업태·종목: ${types}</span>`
    + `<span>고객지원: ${BUSINESS_PROFILE.contactEmail}</span>`
    + '<nav><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="/refund">환불·배송·교환 정책</a><a href="/business-info">사업자 정보</a></nav>'
    + '</footer>';
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
  <a href="/admin/console/publications">CTA 발행</a>
  <a href="/admin/console/library">자료실</a>
  <a href="/admin/console/settings">설정</a>
  <a href="/admin/console/diagnostics">운영 진단</a>
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
    { code: 'CONTACT-CHANNEL', category: '고객지원', title: '고객센터 연락수단', severity: 10, penaltyMax: 2000000, fixTemplate: '대표 이메일 또는 전화번호를 푸터와 문의영역에 추가합니다.', match: ({ text }) => !hasAny(text, ['고객센터','문의','contact','전화','이메일','@']) },
    { code: 'MARKETING-CLAIM', category: '광고표시', title: '과장·확정형 표현', severity: 16, penaltyMax: 5000000, fixTemplate: '무조건, 100%, 완치, guaranteed 같은 확정형 표현을 완화합니다.', match: ({ text }) => hasAny(text, ['100%','완치','무조건','guaranteed','최고보장','확정수익']) },
    { code: 'HTTPS-ONLY', category: '보안', title: 'HTTPS 미사용', severity: 20, penaltyMax: 3000000, fixTemplate: 'HTTP 접근을 HTTPS로 리다이렉트하고 HSTS를 설정합니다.', match: ({ url }) => url.protocol !== 'https:' },
    { code: 'TRACKING-CONSENT', category: '개인정보', title: '쿠키/추적 고지 부족', severity: 8, penaltyMax: 2000000, fixTemplate: '분석·광고 쿠키 사용 시 배너 또는 정책 내 고지 항목을 추가합니다.', match: ({ text }) => !hasAny(text, ['쿠키','cookie','tracking','analytics']) },
    { code: 'YOUTH-RESTRICTED', category: '청소년보호', title: '연령 제한·주의 문구 부족', severity: 14, penaltyMax: 3000000, fixTemplate: '주류/성인/베팅/흡연 연관 키워드가 있으면 성인 인증 또는 주의문구를 추가합니다.', match: ({ text }) => hasAny(text, ['주류','술','성인','adult','bet','카지노','담배','vape']) && !hasAny(text, ['19세','성인인증','청소년']) }
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
    `# ${site.domain} 맞춤 운영 지침`,
    '',
    `- 업종: ${site.industry || '일반 이커머스'}`,
    `- 관할: ${site.jurisdiction || settings.defaultJurisdiction || 'KR'}`,
    `- 최근 위험도: ${scan?.riskScore ?? '-'}점 (${scan?.riskLevel || '-'})`,
    `- 예상 최대 과태료 노출: ${toKrw(scan?.estimatedMaxPenalty || 0)}원`,
    '',
    '## 즉시 수정 우선순위',
    ...(mustFix.length ? mustFix.map((item, idx) => `${idx + 1}. [${item.priority}] ${item.title} — ${item.recommendation}`) : ['1. 즉시 수정 필요 P0/P1 항목 없음']),
    '',
    '## 운영 체크리스트',
    '- 푸터에 사업자 정보와 고객센터 연락수단 유지',
    '- 개인정보처리방침 / 이용약관 / 환불정책 링크를 홈·결제·회원가입에 동시 노출',
    '- 광고 문구는 확정형 표현 대신 조건형 표현으로 완화',
    '- 법령 변경 알림 수신 시 48시간 안에 재스캔 실행',
    settings.autoFixMode === 'approval_required'
      ? '- 자동수정은 승인형으로 유지하고, 승인 전 diff를 확인'
      : '- 자동수정은 제한 모드로 운용하고, 롤백 토큰을 저장',
    '',
    '## CTA 콘텐츠 운영 기준',
    '- 무료 진단 → 상세 결과 해금 → 자동수정 체험 흐름 유지',
    '- 과태료 공포 과장 금지, 근거 조항과 조치 문구를 함께 노출',
    '- 게시글 말미에 무료 진단 CTA 1개만 배치'
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
    buyerName: asTrimmedString(body.buyerName, { field: 'buyerName', max: 80 }),
    buyerEmail: asTrimmedString(body.buyerEmail, { field: 'buyerEmail', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i }),
    siteId: asTrimmedString(body.siteId, { field: 'siteId', max: 64 }),
    domain: asTrimmedString(body.domain, { field: 'domain', max: 255 }),
    plan: asTrimmedString(body.plan, { field: 'plan', required: true, enumValues: ['Basic', 'Pro', 'Auto'] }),
    payMethod: asTrimmedString(body.payMethod, { field: 'payMethod', max: 40 })
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
    collectsPersonalData: asBoolean(body.collectsPersonalData, true),
    delegatedProcessors: asStringArray(body.delegatedProcessors, { field: 'delegatedProcessors', maxItems: 20, maxItemLength: 80 }),
    marketingOptIn: asBoolean(body.marketingOptIn, true),
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
  const businessName = String(payload.businessName || payload.siteName || payload.companyName || '상호 미입력').trim();
  const representative = String(payload.representative || payload.ownerName || '대표자 미입력').trim();
  const domain = String(payload.domain || payload.target || '').trim() || 'example.com';
  const contactEmail = String(payload.contactEmail || payload.email || settings.supportEmail || 'contact@example.com').trim();
  const phone = String(payload.phone || payload.contactPhone || '고객센터 미입력').trim();
  const address = String(payload.address || '사업장 주소 미입력').trim();
  const refundWindowDays = Number(payload.refundWindowDays || 7);
  const shippingLeadDays = Number(payload.shippingLeadDays || 3);
  const collectsPersonalData = payload.collectsPersonalData !== false;
  const delegatedProcessors = Array.isArray(payload.delegatedProcessors) ? payload.delegatedProcessors : [];
  const marketingOptIn = payload.marketingOptIn !== false;
  const subscriptionBilling = payload.subscriptionBilling === true;

  const privacy = [
    `# 개인정보처리방침`,
    '',
    `${businessName}(이하 "회사")는 개인정보보호 관련 법령을 준수합니다.`,
    '',
    `## 1. 수집 항목`,
    collectsPersonalData
      ? `- 필수: 이름, 연락처, 이메일, 주문정보`
      : `- 개인정보를 별도로 수집하지 않습니다.`,
    marketingOptIn ? `- 선택: 마케팅 수신 동의 정보` : `- 마케팅 수신 선택항목 없음`,
    '',
    `## 2. 보유 및 이용 목적`,
    `- 주문 처리, 고객 문의 응답, 법령상 의무 이행`,
    '',
    `## 3. 보유 기간`,
    `- 관련 법령에 따른 보존 기간 또는 처리 목적 달성 시까지`,
    '',
    `## 4. 문의처`,
    `- 담당자: ${representative}`,
    `- 이메일: ${contactEmail}`,
    `- 연락처: ${phone}`,
    delegatedProcessors.length ? `- 처리위탁: ${delegatedProcessors.join(', ')}` : `- 처리위탁 내역 없음`
  ].join('\n');

  const terms = [
    `# 이용약관`,
    '',
    `## 1. 사업자 정보`,
    `- 상호: ${businessName}`,
    `- 대표자: ${representative}`,
    `- 주소: ${address}`,
    `- 사이트: https://${domain}`,
    '',
    `## 2. 서비스 개요`,
    `- 회사는 재화 또는 서비스의 온라인 판매 및 고객 지원 기능을 제공합니다.`,
    '',
    `## 3. 주문 및 결제`,
    `- 주문 완료 전 상품, 가격, 배송, 환불 기준을 고지합니다.`,
    subscriptionBilling ? `- 정기결제 상품은 결제 주기와 해지 방법을 별도 고지합니다.` : `- 정기결제 상품 없음`,
    '',
    `## 4. 청약철회`,
    `- 관련 법령 및 개별 상품 안내에 따라 청약철회가 제한될 수 있습니다.`
  ].join('\n');

  const policy = [
    `# 환불·배송·교환 정책`,
    '',
    `## 배송`,
    `- 평균 출고 기간: 결제 후 ${shippingLeadDays}영업일 이내`,
    '',
    `## 환불`,
    `- 단순 변심 환불 요청 가능 기간: 수령 후 ${refundWindowDays}일 이내`,
    `- 상품 하자/오배송은 회사 기준에 따라 추가 비용 없이 처리합니다.`,
    '',
    `## 교환`,
    `- 교환 가능 여부와 비용은 상품 특성 및 관련 법령에 따라 안내합니다.`,
    '',
    `## 고객센터`,
    `- 이메일: ${contactEmail}`,
    `- 연락처: ${phone}`
  ].join('\n');

  const notices = [
    `# 필수 고지 문구`,
    '',
    `- 상호: ${businessName}`,
    `- 대표자: ${representative}`,
    `- 주소: ${address}`,
    `- 이메일: ${contactEmail}`,
    `- 연락처: ${phone}`,
    `- 개인정보처리방침 / 이용약관 / 환불·배송·교환 정책 링크를 홈·결제·회원가입 영역에 노출`,
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

function buildPlanCatalog(recommendedPlan = 'Pro') {
  const rows = [
    { code: 'Basic', monthlyPrice: 49000, title: 'Basic', summary: '월 정기 스캔과 상세 결과 해금', features: ['월 정기 스캔', '상세 결과', '위험도 변화 추적'] },
    { code: 'Pro', monthlyPrice: 89000, title: 'Pro', summary: '상세 결과 + 맞춤 지침 + 법령 변경 알림', features: ['상세 결과 전체 공개', '사이트 맞춤 지침', '법령 변경 알림'] },
    { code: 'Auto', monthlyPrice: 149000, title: 'Auto', summary: 'Pro + 승인형 자동수정 + 자동 발행', features: ['승인형 자동수정', 'CTA 자동발행', '운영 진단/복구 보조'] }
  ];
  return rows.map(item => ({ ...item, recommended: item.code === recommendedPlan }));
}

function planPrice(plan) {
  return buildPlanCatalog(plan).find(item => item.code === plan)?.monthlyPrice || 49000;
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

async function createCheckoutOrder(db, payload = {}) {
  db.orders ||= [];
  db.paymentSessions ||= [];
  const plan = ['Basic', 'Pro', 'Auto'].includes(payload.plan) ? payload.plan : 'Pro';
  const site = findSiteByAny(db, payload.siteId, payload.domain);
  const customer = String(payload.customer || payload.buyerName || '').trim() || '고객';
  const email = String(payload.email || payload.buyerEmail || '').trim();
  const order = {
    id: uid('ord'),
    customer,
    email,
    plan,
    siteId: site?.id || null,
    domain: site?.domain || String(payload.domain || '').trim() || null,
    status: 'pending',
    stage: 'checkout_ready',
    amount: planPrice(plan),
    paymentProvider: PAYMENT_PROVIDER,
    createdAt: nowIso()
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
        'user-agent': 'Mozilla/5.0 (compatible; NV0-Veridion/0.1; +https://nv0.local)'
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
      const fetched = (TARGET_FETCH_ENABLED && url) ? await fetchTargetHtml(url.toString()) : { fetched: false, html: '', error: TARGET_FETCH_ENABLED ? 'invalid url' : 'target fetch disabled', finalUrl: input, status: 0 };
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
    ? await fetchTargetHtml(url.toString())
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

function appendAudit(db, req, event, meta = {}) {
  db.auditLogs ||= [];
  const entry = {
    id: uid('audit'),
    at: nowIso(),
    event,
    ip: clientIp(req),
    method: req.method,
    path: new URL(req.url, `http://${req.headers.host}`).pathname,
    meta
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
    payload: event.payload || {}
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
    payload: record.payload || {}
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
    BOOTSTRAP_ADMIN_PASSWORD_PRESENT: !!String(process.env.NV0_BOOTSTRAP_ADMIN_PASSWORD || '')
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

function isAllowedUpload(file) {
  const ext = path.extname(file.filename || '').toLowerCase();
  const allowedExt = new Set(['.txt', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.json', '.csv', '.md']);
  return allowedExt.has(ext) && file.content.length <= MAX_MULTIPART_BODY_BYTES;
}

async function verifyTurnstile(req, token) {
  if (!ENABLE_TURNSTILE) return { ok: true, skipped: true };
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
    sub = { id: uid('sub'), siteId: site.id, plan, status: 'trial', monthlyPrice: plan === 'Auto' ? 149000 : plan === 'Pro' ? 89000 : 49000, createdAt: nowIso() };
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
    title: `${site.domain} 맞춤 운영 지침`,
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

function createCtaPublication(db, scan) {
  const title = `${scan.industry} 사이트 법률 리스크 진단: ${scan.totalFindings}개 항목 점검`;
  const publication = {
    id: uid('pub'),
    title,
    status: 'published',
    type: 'cta',
    ctaType: 'free_scan',
    relatedRequestId: scan.requestId,
    body: `${scan.target} 스캔 결과 위험도 ${scan.riskScore}점. 상위 이슈는 ${scan.topFindings.join(', ')} 입니다. 무료 진단 후 상세 리포트와 자동수정까지 연결하세요.`,
    createdAt: nowIso()
  };
  db.publications.unshift(publication);
  db.boards.unshift({
    id: uid('board'),
    boardType: 'legal-update',
    title,
    body: publication.body,
    createdAt: nowIso(),
    visibility: 'public'
  });
  return publication;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/healthz') {
    return json(req, res, 200, { ok: true, service: 'nv0-veridion', uptimeSec: Math.round(process.uptime()) });
  }

  if (pathname === '/readyz') {
    try {
      validateConfig();
      await ensureRuntime();
      await readDb();
      if (!(PERSISTENCE_MODE === 'postgres_primary' && PLATFORM.commercial)) await fs.access(path.join(DATA_DIR, 'db.json'));
      if (!PLATFORM.commercial || STORAGE_MODE === 'local_fs') await fs.access(UPLOADS_DIR);
      const redisSessionReady = await sessionStore.ping();
      const redisRateLimitReady = await rateLimitStore.ping();
      const redisLockReady = await distributedLock.ping();
      const probePath = path.join(REPORTS_DIR, `.readyz-${process.pid}.tmp`);
      await fs.writeFile(probePath, JSON.stringify({ checkedAt: nowIso() }));
      await fs.unlink(probePath);
      if (PLATFORM.commercial && (!redisSessionReady || !redisRateLimitReady || !redisLockReady)) throw new Error('Commercial readiness requires Redis-backed session, rate-limit, and lock providers.');
      return json(req, res, 200, { ok: true, ready: true, platformTarget: PLATFORM.target, persistenceMode: PERSISTENCE_MODE, storageMode: STORAGE_MODE, turnstileEnabled: ENABLE_TURNSTILE, redis: { sessionStore: redisSessionReady, rateLimitStore: redisRateLimitReady, lockProvider: redisLockReady }, paymentProvider: PAYMENT_PROVIDER === 'portone_v2' ? PORTONE_CLIENT.configSummary() : { mode: PAYMENT_PROVIDER } });
    } catch (error) {
      return json(req, res, 503, { ok: false, ready: false, runtimeWritable: false, error: error.message });
    }
  }

  if (pathname === '/api/public/config' && req.method === 'GET') {
    return json(req, res, 200, { ok: true, turnstileEnabled: ENABLE_TURNSTILE, turnstileSiteKey: ENABLE_TURNSTILE ? TURNSTILE_SITE_KEY : '' });
  }

  if (pathname === '/api/public/health' && req.method === 'GET') {
    return json(req, res, 200, { ok: true, area: 'public', time: nowIso() });
  }

  if (pathname === '/api/public/plans' && req.method === 'GET') {
    const db = await readDb();
    const requestedRiskScore = Number(url.searchParams.get('riskScore') || 0);
    const siteId = url.searchParams.get('siteId') || '';
    const site = siteId ? findSiteByAny(db, siteId) : null;
    const riskScore = requestedRiskScore || site?.latestRiskScore || db.scans[0]?.riskScore || 55;
    const recommendedPlan = pickRecommendedPlan(riskScore);
    return json(req, res, 200, { ok: true, recommendedPlan, plans: buildPlanCatalog(recommendedPlan), riskScore });
  }

  if (pathname === '/api/public/document-preview' && req.method === 'POST') {
    const body = normalizeDocumentPreviewPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
    const db = await readDb();
    const preview = buildPolicyDocumentPreview(body, db.settings || {});
    return json(req, res, 200, { ok: true, preview });
  }

  if (pathname === '/api/public/board' && req.method === 'GET') {
    const db = await readDb();
    return json(req, res, 200, { ok: true, posts: db.boards.slice(0, 20) });
  }

  if (pathname === '/api/public/content' && req.method === 'GET') {
    const db = await readDb();
    const type = String(url.searchParams.get('type') || '').trim();
    let items = buildSystemItemsFeed(db).filter(item => item.visibility !== 'private');
    if (type) items = items.filter(item => item.type === type);
    return json(req, res, 200, { ok: true, items: items.slice(0, 50) });
  }

  if (pathname === '/api/public/portal-summary' && req.method === 'GET') {
    const db = await readDb();
    const summary = buildPortalSummary(db, { orderId: url.searchParams.get('orderId'), siteId: url.searchParams.get('siteId') });
    return json(req, res, 200, { ok: true, summary });
  }

  if (pathname === '/api/public/order' && req.method === 'GET') {
    const db = await readDb();
    const orderId = String(url.searchParams.get('orderId') || '');
    const order = (db.orders || []).find(item => item.id === orderId);
    if (!order) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
    const paymentSession = (db.paymentSessions || []).find(item => item.orderId === order.id) || null;
    return json(req, res, 200, { ok: true, order, paymentSession });
  }

  if (pathname === '/api/public/guidance' && req.method === 'GET') {
    const db = await readDb();
    const siteId = String(url.searchParams.get('siteId') || '');
    const guidance = siteId ? findLatestGuidanceForSite(db, siteId) : db.guidanceDocuments[0] || null;
    if (!guidance) return json(req, res, 404, { ok: false, error: '지침 문서를 찾을 수 없습니다.' });
    return json(req, res, 200, { ok: true, guidance });
  }

  if (pathname === '/api/public/scan' && req.method === 'POST') {
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
    const subscription = ensureSubscriptionForSite(db, site, result.recommendedPlan);
    const guidance = createGuidanceDocument(db, site, result);
    const autoFixJobs = seedAutoFixJobs(db, site, result);
    if (db.settings.ctaAutopublishEnabled) createCtaPublication(db, result);
    db.scans.unshift({ siteId: site.id, subscriptionId: subscription.id, createdAt: nowIso(), ...result });
    db.scans = db.scans.slice(0, 100);
    appendAudit(db, req, 'public.scan.created', { requestId: result.requestId, target: result.target, siteId: site.id, provider: result.provider || SCAN_PROVIDER });
    await writeDb(db);
    return json(req, res, 200, { ok: true, result: { ...result, siteId: site.id, guidanceId: guidance.id, autoFixJobsCount: autoFixJobs.length } });
  }

  if (pathname === '/api/public/checkout-session' && req.method === 'POST') {
    const rate = await hitRateLimit('checkout-session', clientIp(req), { windowMs: PUBLIC_SCAN_WINDOW_MS, limit: Math.max(5, Math.floor(PUBLIC_SCAN_LIMIT / 2)) });
    if (rate.blocked) {
      return json(req, res, 429, { ok: false, error: '결제 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, { 'retry-after': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) });
    }
    const body = normalizeCheckoutPayload(await bodyJson(req, MAX_JSON_BODY_BYTES) || {});
    const db = await readDb();
    const lockKey = `checkout:${body.siteId || body.domain || clientIp(req)}`;
    if (!await distributedLock.acquire(lockKey, 10)) {
      return json(req, res, 409, { ok: false, error: '동일 대상의 결제 세션 생성이 이미 진행 중입니다.' });
    }
    let created;
    try {
      created = await createCheckoutOrder(db, body);
    } finally {
      await distributedLock.release(lockKey);
    }
    appendAudit(db, req, 'public.checkout.created', { orderId: created.order.id, provider: PAYMENT_PROVIDER, siteId: created.order.siteId || null, plan: created.order.plan });
    await writeDb(db);
    return json(req, res, 200, { ok: true, order: created.order, paymentSession: created.paymentSession, providerMode: PAYMENT_PROVIDER });
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
          return json(req, res, 400, { ok: false, error: `포트원 결제 검증에 실패했습니다: ${synced.reason}`, order: synced.order, paymentSession: synced.paymentSession });
        }
        return json(req, res, 200, { ok: true, order: synced.order, paymentSession: synced.paymentSession, payment: synced.payment || null, pendingSettlement: !!synced.pendingSettlement });
      }
      try {
        assertCommercialRouteAllowed(PLATFORM, 'demo_payment_complete');
      } catch (error) {
        return json(req, res, 403, { ok: false, error: '상용 타깃에서는 데모 결제 완료 라우트를 사용할 수 없습니다.' });
      }
      if (PAYMENT_PROVIDER === 'external_http') return json(req, res, 400, { ok: false, error: '외부 결제 모드에서는 공급자 콜백 또는 운영 확인이 필요합니다.' });
      const completed = completeCheckoutOrder(db, orderId);
      if (!completed) return json(req, res, 404, { ok: false, error: '주문을 찾을 수 없습니다.' });
      appendAudit(db, req, 'public.payment.completed', { orderId: completed.order.id, provider: PAYMENT_PROVIDER });
      await writeDb(db);
      return json(req, res, 200, { ok: true, order: completed.order, paymentSession: completed.paymentSession });
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
      return json(req, res, 401, { ok: false, error: '포트원 웹훅 서명 검증에 실패했습니다.', reason: webhookVerification.reason });
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
        return json(req, res, 401, { ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
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
        turnstileEnabled: ENABLE_TURNSTILE,
        trustProxyHeaders: TRUST_PROXY_HEADERS,
        csrfProtection: true,
        backupRetentionCount: BACKUP_RETENTION_COUNT,
        auditLogRetentionCount: AUDIT_LOG_RETENTION_COUNT,
        storageMode: STORAGE_MODE,
        scanProvider: SCAN_PROVIDER,
        paymentProvider: PAYMENT_PROVIDER
      },
      storage: { uploadsDir: UPLOADS_DIR, runtimeDir: RUNTIME_DIR, backupsDir: BACKUPS_DIR, reportsDir: REPORTS_DIR },
      integrations: {
        scanProvider: { mode: SCAN_PROVIDER, urlConfigured: !!SCAN_PROVIDER_URL, fallbackEnabled: SCAN_PROVIDER_FALLBACK },
        paymentProvider: PAYMENT_PROVIDER === 'portone_v2' ? { mode: PAYMENT_PROVIDER, ...PORTONE_CLIENT.configSummary() } : { mode: PAYMENT_PROVIDER, urlConfigured: !!PAYMENT_PROVIDER_URL },
        storage: { mode: STORAGE_MODE, uploadsDir: UPLOADS_DIR }
      },
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
    if (!order || !paymentSession || paymentSession.provider !== 'portone_v2') return json(req, res, 404, { ok: false, error: '포트원 결제 세션을 찾을 수 없습니다.' });
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
    if (!job) return json(req, res, 404, { ok: false, error: '자동수정 작업을 찾을 수 없습니다.' });
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
    if (!job) return json(req, res, 404, { ok: false, error: '자동수정 작업을 찾을 수 없습니다.' });
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
    const match = /boundary=(.+)$/.exec(ct);
    if (!match) return json(req, res, 400, { ok: false, error: 'multipart/form-data 가 필요합니다.' });
    const raw = await bodyBuffer(req, MAX_MULTIPART_BODY_BYTES);
    const parsed = parseMultipart(raw, match[1]);
    const file = parsed.files[0];
    if (!file) return json(req, res, 400, { ok: false, error: '파일이 없습니다.' });
    if (!isAllowedUpload(file)) return json(req, res, 400, { ok: false, error: '허용되지 않은 파일 형식이거나 파일이 너무 큽니다.' });
    const safeName = `${Date.now()}-${path.basename(file.filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
  const startedAt = Date.now();
  const requestId = uid('req');
  res.setHeader('x-request-id', requestId);
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (pathname.startsWith('/shared/')) return serveStaticRoot(req, res, ROOT, '/');
    if (pathname.startsWith('/apps/public/')) return serveStaticRoot(req, res, ROOT, '/');
    if (pathname.startsWith('/apps/admin/gate/')) return serveStaticRoot(req, res, ROOT, '/');
    if (pathname.startsWith('/apps/admin/')) {
      if (!await getSession(req)) return text(req, res, 403, 'Forbidden');
      return serveStaticRoot(req, res, ROOT, '/');
    }
    if (pathname.startsWith('/runtime/uploads/')) return serveStaticRoot(req, res, ROOT, '/');
    const apiHandled = await handleApi(req, res);
    if (apiHandled !== false) return;
    const rendered = await renderPage(pathname, req, res);
    if (rendered) return;
    text(req, res, 404, 'Not found');
  } catch (error) {
    const status = error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_JSON', 'INVALID_PAYLOAD'].includes(error?.code) ? 400 : 500;
    json(req, res, status, { ok: false, error: status === 413 ? '요청 크기가 너무 큽니다.' : status === 400 ? (error.message || '잘못된 요청입니다.') : '서버 오류가 발생했습니다.', requestId });
  } finally {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
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

async function shutdown() {
  clearInterval(cleanupInterval);
  if (sessionsDirty) await writeSessionsToDisk();
  const forceExit = setTimeout(() => process.exit(0), 1500);
  forceExit.unref();
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => { shutdown().catch(() => process.exit(1)); });
process.on('SIGINT', () => { shutdown().catch(() => process.exit(1)); });

validateConfig();
ensureRuntime().then(async () => {
  await hydrateSessions();
  const db = await readDb();
  await ensureBootstrapAdmin(db, process.env, uid, nowIso);
  await writeDb(db);
  server.listen(PORT, HOST, () => {
    console.log(`nv0 cleanroom server listening on http://${HOST}:${PORT}`);
  });
}).catch((error) => {
  console.error('server startup failed', error);
  process.exit(1);
});
