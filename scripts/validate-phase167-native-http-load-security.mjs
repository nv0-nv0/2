import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
async function read(rel) { return fs.readFile(path.join(root, rel), 'utf8'); }
function pass(name, details = {}) { return { name, ok: true, ...details }; }
function fail(name, message, details = {}) { return { name, ok: false, message, ...details }; }
function assert(cond, name, message, details = {}) { return cond ? pass(name, details) : fail(name, message, details); }

const files = {
  index: await read('server/index.mjs'),
  public: await read('server/routes/public.mjs'),
  admin: await read('server/routes/admin.mjs'),
  payment: await read('server/routes/payment.mjs'),
  account: await read('server/routes/account.mjs'),
  ops: await read('server/routes/ops.mjs'),
  security: await read('server/middleware/security.mjs'),
  state: await read('server/core/native-route-state.mjs')
};
const allServerText = Object.values(files).join('\n');
const checks = [];
checks.push(assert(files.index.includes('phase167-native-http-load-security-50'), 'release phase updated', 'RELEASE_PHASE must identify phase167'));
checks.push(assert(files.index.includes('async function buildReadyzPayload') && files.index.includes('READYZ_CACHE_TTL_MS'), 'readyz ttl cache implemented', 'readyz should be split and cached'));
checks.push(assert(files.index.includes("pathname.startsWith('/api/public/')") && files.index.includes('publicRouteHandler(req, res, routeState)'), 'public native dispatch retained', 'public routes must dispatch through native handler'));
checks.push(assert(files.index.includes("pathname.startsWith('/api/admin/')") && files.index.includes('adminRouteHandler(req, res, routeState)'), 'admin native dispatch retained', 'admin routes must dispatch through native handler'));
const postDispatchTail = files.index.slice(files.index.indexOf('async function handleApi'));
checks.push(assert(!postDispatchTail.includes("if (pathname === '/api/public/config'"), 'dead public route branches removed from index', 'index must not keep duplicated /api/public branches after dispatch'));
checks.push(assert(!postDispatchTail.includes("if (pathname === '/api/admin/status'"), 'dead admin route branches removed from index', 'index must not keep duplicated /api/admin branches after dispatch'));
checks.push(assert(files.security.includes('req._nv0RouteState') && files.security.includes('routeKey'), 'single URL parse state attached', 'security middleware must attach native route state'));
checks.push(assert(['public','admin','payment','account','ops'].every(k => !files[k].includes('resolveNativeRouteState(req)')), 'route modules avoid URL reparse', 'route modules must consume the pre-parsed native state from security middleware/parent dispatcher'));
checks.push(assert(!files.public.includes("pathname === '/readyz'") && !files.public.includes("pathname === '/sitemap.xml'") && !files.public.includes("pathname === '/feed.xml'"), 'public route duplicate root branches removed', 'root health/robots/sitemap/feed branches must stay in index only'));
checks.push(assert(files.public.includes('accountRouteHandler(req, res, { requestUrl: url, pathname })') && files.public.includes('paymentRouteHandler(req, res, { requestUrl: url, pathname })'), 'child route state forwarding', 'public handler must forward parsed URL state to child handlers'));
checks.push(assert(!/new URL\(req\.url/.test(files.public + files.admin + files.payment + files.account + files.ops), 'route modules do not create URL objects', 'route modules must not call new URL(req.url...)'));
checks.push(assert(files.admin.includes('isSafeHttpMethod(req.method)'), 'admin CSRF safe-method helper', 'admin CSRF check should use centralized safe method helper'));
checks.push(assert(files.index.includes('cachedXml') && files.index.includes('x-nv0-cache'), 'sitemap feed xml cache', 'sitemap/feed should use short cache headers and runtime cache'));
checks.push(assert(!/from ['"]express['"]/.test(allServerText) && !/Router\(/.test(allServerText), 'express router not introduced', 'must not introduce Express Router style'));
checks.push(assert(files.index.includes('req._nv0RouteState?.pathname') && files.index.includes('req._nv0Url || requestUrlFrom(req)'), 'internal helpers reuse parsed URL', 'audit/order access helpers should reuse native route state where possible'));

const failed = checks.filter(c => !c.ok);
const result = { ok: failed.length === 0, phase: 'phase167-native-http-load-security', checkedAt: new Date().toISOString(), checks, failed };
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
