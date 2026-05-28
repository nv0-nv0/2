// VERIDION runtime optimizer: customer-facing performance, UX, and quality loop.
const root = document.documentElement;
const body = document.body;
const supportsIdle = 'requestIdleCallback' in window;
const idle = (fn, timeout = 1200) => supportsIdle ? window.requestIdleCallback(fn, { timeout }) : window.setTimeout(fn, 40);

function setCurrentNav() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.vr-nav a,.vr-side-nav a').forEach((link) => {
    try {
      const target = new URL(link.getAttribute('href') || '/', window.location.origin).pathname.replace(/\/$/, '') || '/';
      const exact = target === path || (target !== '/' && path.startsWith(target));
      if (exact) link.setAttribute('aria-current', 'page');
    } catch {}
  });
}

function enhanceFocus() {
  let usingKeyboard = false;
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      usingKeyboard = true;
      body?.setAttribute('data-keyboard-focus', 'true');
    }
  }, { passive: true });
  window.addEventListener('pointerdown', () => {
    if (usingKeyboard) {
      usingKeyboard = false;
      body?.removeAttribute('data-keyboard-focus');
    }
  }, { passive: true });
}

function prefetch(url) {
  if (!url || document.querySelector(`link[rel="prefetch"][href="${CSS.escape(url)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'document';
  document.head.append(link);
}

function enhanceNavigation() {
  const anchors = [...document.querySelectorAll('a[href^="/"]')]
    .filter((link) => !link.hasAttribute('download') && !link.getAttribute('href').startsWith('/api/'));
  const seen = new Set();
  for (const link of anchors) {
    const href = link.getAttribute('href');
    if (!href || seen.has(href)) continue;
    seen.add(href);
    link.addEventListener('mouseenter', () => prefetch(href), { once: true, passive: true });
    link.addEventListener('focus', () => prefetch(href), { once: true, passive: true });
  }
  idle(() => anchors.slice(0, 4).forEach((link) => prefetch(link.getAttribute('href'))), 1600);
}

function revealCards() {
  const cards = [...document.querySelectorAll('.vr-card,.vr-price-card,.vr-dark-card,.vr-finding,.vr-preview')];
  if (!('IntersectionObserver' in window)) {
    cards.forEach((el) => el.setAttribute('data-vr-visible', 'true'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-vr-visible', 'true');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '120px 0px', threshold: 0.02 });
  cards.forEach((el) => {
    el.setAttribute('data-vr-observed', 'true');
    io.observe(el);
  });
}

function getPaintMetric(name) {
  const entry = performance.getEntriesByType('paint').find((item) => item.name === name);
  return entry ? Math.round(entry.startTime) : 0;
}

function collectMetric() {
  const nav = performance.getEntriesByType('navigation')[0];
  const metric = {
    path: window.location.pathname,
    page: body?.dataset?.page || 'public',
    navigationType: nav?.type || 'navigate',
    loadMs: nav ? Math.round(nav.loadEventEnd || nav.duration || 0) : 0,
    domInteractiveMs: nav ? Math.round(nav.domInteractive || 0) : 0,
    firstContentfulPaintMs: getPaintMetric('first-contentful-paint'),
    largestContentfulPaintMs: 0,
    cumulativeLayoutShift: 0,
    connection: navigator.connection?.effectiveType || '',
    userAgentBucket: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'
  };
  return metric;
}

function observeVitals(metric) {
  if (!('PerformanceObserver' in window)) return;
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) metric.largestContentfulPaintMs = Math.round(last.startTime || 0);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value || 0;
      }
      metric.cumulativeLayoutShift = Number(cls.toFixed(4));
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {}
}

function sendMetric(metric) {
  const payload = JSON.stringify(metric);
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/public/client-metric', new Blob([payload], { type: 'application/json' }));
    if (sent) return;
  }
  fetch('/api/public/client-metric', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function initMetrics() {
  const metric = collectMetric();
  observeVitals(metric);
  const flush = () => sendMetric(metric);
  window.addEventListener('pagehide', flush, { once: true, passive: true });
  idle(flush, 3000);
}

function init() {
  root.dataset.vrRuntime = 'optimized';
  setCurrentNav();
  enhanceFocus();
  enhanceNavigation();
  revealCards();
  initMetrics();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
