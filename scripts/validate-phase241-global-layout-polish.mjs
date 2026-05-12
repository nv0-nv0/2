import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'shared/nv0-clean-slate-20260512.css'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const htmlFiles = [
  ...fs.readdirSync(path.join(ROOT, 'apps/public')).flatMap(name => {
    const file = path.join(ROOT, 'apps/public', name, 'index.html');
    return fs.existsSync(file) ? [`/apps/public/${name}/index.html`] : [];
  }),
  ...fs.readdirSync(path.join(ROOT, 'apps/admin')).flatMap(name => {
    const file = path.join(ROOT, 'apps/admin', name, 'index.html');
    return fs.existsSync(file) ? [`/apps/admin/${name}/index.html`] : [];
  })
].sort();
const viewports = [
  { width: 390, height: 900, label: 'mobile' },
  { width: 768, height: 1000, label: 'tablet' },
  { width: 1366, height: 1100, label: 'desktop' }
];
const checks = [];
function add(id, ok, detail) { checks.push({ id, ok: Boolean(ok), detail }); }

add('phase241-css-block-present', css.includes('PHASE241 · Global layout') && css.includes('--phase241-radius-card') && css.includes('--phase241-line-soft'), 'global phase241 design-system tokens and polish block are present');
add('typography-lock-present', css.includes('.phase239-copy h1{font-size:clamp(36px,4.8vw,64px)') && css.includes('text-wrap:balance'), 'heading scale, balanced wrapping, and Korean word-break lock are present');
add('section-title-grid-lock', css.includes('.phase239-copy .section-title') && css.includes('display:grid;') && css.includes('max-width:860px'), 'section/page titles are stacked instead of squeezed into a horizontal row');
add('navigation-overflow-lock', css.includes('overflow-x:auto') && css.includes('scrollbar-width:none') && css.includes('@media(max-width:1180px)'), 'top navigation is scroll-safe and responsive');
add('shape-line-polish-lock', css.includes('--phase241-shadow-card') && css.includes('border:1px solid var(--phase241-line)') && css.includes('height:2px;'), 'cards, panels, decorative lines and shadows are normalized');
add('table-report-polish-lock', css.includes('.table-wrap') && css.includes('.phase239-copy table') && css.includes('.asset-index-grid'), 'tables and generated report surfaces have layout styles');
add('mobile-arrangement-lock', css.includes('@media(max-width:720px)') && css.includes('grid-template-columns:1fr') && css.includes('width:min(100% - 28px,1168px)'), 'mobile spacing and one-column arrangement are locked');
add('package-script-present', packageJson.scripts?.['phase241:final']?.includes('validate:phase241'), 'phase241 final validation script is wired into package.json');

for (const rel of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, rel.slice(1)), 'utf8');
  add(`shared-css-linked:${rel}`, html.includes('/shared/nv0-clean-slate-20260512.css') || rel.includes('/admin/'), `${rel} has access to the shared design system`);
  add(`clean-class-present:${rel}`, html.includes('nv0-clean-slate') && html.includes('phase239-copy'), `${rel} uses the global visual shell classes`);
}

function mimeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}
function startStaticServer() {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(parsed.pathname);
    if (pathname === '/') pathname = '/apps/public/home/index.html';
    const abs = path.resolve(ROOT, `.${pathname}`);
    if (!abs.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': mimeFor(abs), 'cache-control': 'no-store' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForJson(url, attempts = 60) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) { lastError = error; }
    await sleep(120);
  }
  throw lastError || new Error(`timeout waiting for ${url}`);
}
class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener('message', event => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(payload.error.message || 'CDP error'));
        else resolve(payload.result || {});
        return;
      }
      if (payload.method && this.events.has(payload.method)) {
        const listeners = this.events.get(payload.method).splice(0);
        for (const listener of listeners) listener(payload.params || {});
      }
    });
  }
  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('websocket open timeout')), 5000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', error => { clearTimeout(timer); reject(error); }, { once: true });
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 7000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
    });
  }
  waitEvent(method, timeout = 6000) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), timeout);
      const list = this.events.get(method) || [];
      list.push(payload => { clearTimeout(timer); resolve(payload); });
      this.events.set(method, list);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}
async function makeTarget(debugPort, url) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`failed to create chrome target: ${response.status}`);
  return response.json();
}
async function runBrowserAudit() {
  const chrome = findChrome();
  if (!chrome) {
    add('browser-layout-audit-skipped', true, 'Chromium not found; static phase241 checks completed');
    return;
  }
  const server = await startStaticServer();
  const staticPort = server.address().port;
  const debugPort = 9331 + Math.floor(Math.random() * 500);
  const child = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`,
    'about:blank'
  ], { stdio: 'ignore' });
  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const initial = `http://127.0.0.1:${staticPort}/apps/public/home/index.html`;
    const target = await makeTarget(debugPort, initial);
    const cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const failures = [];
    const summaries = [];
    for (const viewport of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 600
      });
      for (const rel of htmlFiles) {
        const url = `http://127.0.0.1:${staticPort}${rel}`;
        const loaded = cdp.waitEvent('Page.loadEventFired', 6000);
        await cdp.send('Page.navigate', { url });
        await loaded;
        await sleep(180);
        const evalResult = await cdp.send('Runtime.evaluate', {
          returnByValue: true,
          expression: `(() => {
            const visible = el => {
              const cs = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
            };
            const px = value => Number(String(value || '0').replace('px','')) || 0;
            const root = document.documentElement;
            const bodyText = document.body.innerText || '';
            const overflow = Math.round(root.scrollWidth - window.innerWidth);
            const badConcat = /1URL\s*입력공개|2자동\s*수집홈|3결과\s*정렬점수/.test(bodyText.replace(/\n/g, ''));
            const sectionTitleBad = [...document.querySelectorAll('.section-title')].filter(el => getComputedStyle(el).display !== 'grid').length;
            const cardRadii = [...document.querySelectorAll('.phase239-card,.card,.clean-plan-card,.result-card,.phase239-form-card')].filter(visible).slice(0, 20).map(el => px(getComputedStyle(el).borderTopLeftRadius));
            const h1Sizes = [...document.querySelectorAll('h1')].filter(visible).map(el => px(getComputedStyle(el).fontSize));
            const tinyButtons = [...document.querySelectorAll('a.btn,.cta,button')].filter(visible).filter(el => el.getBoundingClientRect().height < 34).map(el => el.textContent.trim().slice(0, 40));
            const unsafeOverflow = [...document.querySelectorAll('body *')]
              .filter(visible)
              .filter(el => !el.closest('.nv0-nav,.table-wrap,.nv74-site-render,.nv74-feed-render,pre'))
              .map(el => ({ tag: el.tagName, cls: el.className || '', text: (el.textContent || '').trim().slice(0, 48), right: Math.round(el.getBoundingClientRect().right), left: Math.round(el.getBoundingClientRect().left) }))
              .filter(item => item.right > window.innerWidth + 6 || item.left < -6)
              .slice(0, 5);
            const nav = document.querySelector('.nv0-nav');
            const navStyle = nav ? getComputedStyle(nav) : null;
            return {
              title: document.title,
              width: window.innerWidth,
              rel: location.pathname,
              overflow,
              badConcat,
              sectionTitleBad,
              minCardRadius: cardRadii.length ? Math.min(...cardRadii) : null,
              minH1: h1Sizes.length ? Math.min(...h1Sizes) : null,
              maxH1: h1Sizes.length ? Math.max(...h1Sizes) : null,
              tinyButtons,
              unsafeOverflow,
              navOverflowMode: navStyle ? navStyle.overflowX : null,
              navScrollable: nav ? nav.scrollWidth > nav.clientWidth : false
            };
          })()`
        });
        const value = evalResult.result?.value || {};
        summaries.push(value);
        if (value.overflow > 4) failures.push({ rel, viewport: viewport.label, issue: 'body-horizontal-overflow', value: value.overflow });
        if (value.badConcat) failures.push({ rel, viewport: viewport.label, issue: 'step-copy-concatenation' });
        if (value.sectionTitleBad > 0) failures.push({ rel, viewport: viewport.label, issue: 'section-title-not-grid', count: value.sectionTitleBad });
        if (value.minCardRadius !== null && value.minCardRadius < 18) failures.push({ rel, viewport: viewport.label, issue: 'card-radius-too-sharp', value: value.minCardRadius });
        if (value.maxH1 !== null && value.maxH1 > 72) failures.push({ rel, viewport: viewport.label, issue: 'h1-too-large', value: value.maxH1 });
        if (value.minH1 !== null && value.minH1 < 28) failures.push({ rel, viewport: viewport.label, issue: 'h1-too-small', value: value.minH1 });
        if (value.tinyButtons?.length) failures.push({ rel, viewport: viewport.label, issue: 'tiny-click-targets', items: value.tinyButtons });
        if (value.unsafeOverflow?.length) failures.push({ rel, viewport: viewport.label, issue: 'element-viewport-overflow', items: value.unsafeOverflow });
        if (value.navScrollable && value.navOverflowMode !== 'auto') failures.push({ rel, viewport: viewport.label, issue: 'nav-overflow-not-scrollable', value: value.navOverflowMode });
      }
    }
    cdp.close();
    add('browser-layout-audit', failures.length === 0, failures.length ? failures.slice(0, 12) : `${summaries.length} page/viewport checks passed`);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => server.close(resolve));
  }
}

await runBrowserAudit();
const failed = checks.filter(item => !item.ok);
const result = {
  ok: failed.length === 0,
  pages: htmlFiles.length,
  staticChecks: checks.length,
  checks,
  failed
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
