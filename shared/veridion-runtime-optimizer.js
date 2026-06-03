if (!window.__NV0_RUNTIME_OPTIMIZER__) {
  window.__NV0_RUNTIME_OPTIMIZER__ = true;

  const root = document.documentElement;
  const body = document.body;
  const supportsIdle = 'requestIdleCallback' in window;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsPrefetch = !connection?.saveData && !/^(slow-)?2g$/i.test(connection?.effectiveType || '');
  const idle = (fn, timeout = 1200) => supportsIdle ? window.requestIdleCallback(fn, { timeout }) : window.setTimeout(fn, 40);
  const escapeSelector = (value) => window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');

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

  function normalizePrefetchPath(href) {
    if (!supportsPrefetch || !href) return '';
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      if (url.pathname === window.location.pathname && url.search === window.location.search) return '';
      if (/^\/(api|admin)(\/|$)/.test(url.pathname)) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '';
    }
  }

  function prefetch(url) {
    const next = normalizePrefetchPath(url);
    if (!next || !document.head) return;
    if (document.querySelector(`link[rel="prefetch"][href="${escapeSelector(next)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = next;
    link.as = 'document';
    document.head.append(link);
  }

  function enhanceNavigation() {
    const anchors = [...document.querySelectorAll('a[href]')]
      .filter((link) => !link.hasAttribute('download'))
      .map((link) => ({ link, href: normalizePrefetchPath(link.getAttribute('href') || '') }))
      .filter((entry) => entry.href);
    const seen = new Set();
    for (const { link, href } of anchors) {
      if (seen.has(href)) continue;
      seen.add(href);
      link.addEventListener('mouseenter', () => prefetch(href), { once: true, passive: true });
      link.addEventListener('focus', () => prefetch(href), { once: true, passive: true });
    }
    idle(() => anchors.slice(0, 3).forEach(({ href }) => prefetch(href)), 1600);
  }

  function revealCards() {
    const cards = [...document.querySelectorAll('.vr-card,.vr-price-card,.vr-dark-card,.vr-finding,.vr-preview')];
    if (reducedMotion || !('IntersectionObserver' in window)) {
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
    return {
      path: window.location.pathname,
      page: body?.dataset?.page || 'public',
      navigationType: nav?.type || 'navigate',
      loadMs: nav ? Math.round(nav.loadEventEnd || nav.duration || 0) : 0,
      domInteractiveMs: nav ? Math.round(nav.domInteractive || 0) : 0,
      firstContentfulPaintMs: getPaintMetric('first-contentful-paint'),
      largestContentfulPaintMs: 0,
      cumulativeLayoutShift: 0,
      connection: connection?.effectiveType || '',
      reducedMotion,
      visibilityState: document.visibilityState || 'visible',
      userAgentBucket: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'
    };
  }

  function observeVitals(metric) {
    const disposers = [];
    if (!('PerformanceObserver' in window)) return disposers;
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) metric.largestContentfulPaintMs = Math.round(last.startTime || 0);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      disposers.push(() => lcpObserver.disconnect());
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
      disposers.push(() => clsObserver.disconnect());
    } catch {}
    return disposers;
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

  function compactErrorMessage(value) {
    return String(value || '클라이언트 오류')
      .replace(/https?:\/\/[^\s)]+/gi, '[URL]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[EMAIL]')
      .slice(0, 240);
  }

  function sendClientError({ name = 'Error', message = '', sourcePath = '', line = 0, column = 0 } = {}) {
    sendMetric({
      path: window.location.pathname,
      page: body?.dataset?.page || 'public',
      metricType: 'client_error',
      errorName: String(name || 'Error').slice(0, 64),
      errorMessage: compactErrorMessage(message),
      sourcePath: String(sourcePath || '').replace(window.location.origin, '').replace(/[?#].*$/, '').slice(0, 160),
      line: Number(line || 0),
      column: Number(column || 0),
      userAgentBucket: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'
    });
  }

  function initErrorTelemetry() {
    window.addEventListener('error', (event) => {
      const target = event.target;
      if (target && target !== window && (target.src || target.href)) {
        sendClientError({ name: 'ResourceLoadError', message: '정적 자산을 불러오지 못했습니다.', sourcePath: target.src || target.href });
        return;
      }
      sendClientError({ name: event.error?.name || 'Error', message: event.message || event.error?.message || '클라이언트 오류', sourcePath: event.filename || '', line: event.lineno, column: event.colno });
    }, true);
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      sendClientError({ name: reason?.name || 'UnhandledRejection', message: reason?.message || String(reason || '처리되지 않은 비동기 오류') });
    });
  }

  function initMetrics() {
    const metric = collectMetric();
    const disposers = observeVitals(metric);
    let sent = false;
    const flush = () => {
      if (sent) return;
      sent = true;
      disposers.forEach((dispose) => dispose());
      sendMetric(metric);
    };
    window.addEventListener('pagehide', flush, { once: true, passive: true });
    idle(flush, 3000);
  }

  function init() {
    root.dataset.vrRuntime = 'optimized';
    root.dataset.vrPrefetchMode = supportsPrefetch ? 'active' : 'reduced';
    setCurrentNav();
    enhanceFocus();
    enhanceNavigation();
    revealCards();
    initMetrics();
    initErrorTelemetry();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
