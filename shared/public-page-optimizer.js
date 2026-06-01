if (!window.__NV0_PUBLIC_PAGE_OPTIMIZER__) {
  window.__NV0_PUBLIC_PAGE_OPTIMIZER__ = true;

  const READY_FLAG_BY_PAGE = {
    insights: 'insightsHubReady',
    'insight-article': 'insightArticleReady'
  };

  function normalizePath(value) {
    const pathname = String(value || '').trim();
    return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : (pathname || '/');
  }

  function normalizedTargetFromQuery() {
    const raw = new URLSearchParams(location.search).get('target');
    if (!raw) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return url.hostname && url.hostname.includes('.') ? url.toString() : '';
    } catch {
      return '';
    }
  }

  function markCurrentLinks() {
    const current = normalizePath(location.pathname);
    document.querySelectorAll('a[href]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href') || '/', location.origin);
        if (url.origin !== location.origin) return;
        if (normalizePath(url.pathname) === current) link.setAttribute('aria-current', 'page');
      } catch {}
    });
  }

  function hardenBlankLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set(String(link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', Array.from(rel).join(' '));
    });
  }

  function annotateExternalLinks() {
    document.querySelectorAll('a[href]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href') || '', location.origin);
        if (url.origin === location.origin) return;
        link.dataset.externalLink = 'true';
        if (link.target === '_blank' && !/새 창/.test(link.getAttribute('aria-label') || '')) {
          const label = (link.getAttribute('aria-label') || link.textContent || '').trim();
          if (label) link.setAttribute('aria-label', `${label} (새 창)`);
        }
      } catch {}
    });
  }

  function carryTargetToDiagnosisLinks(target) {
    if (!target) return;
    document.querySelectorAll('a[href*="/products/veridion/demo"], a[href="/demo"], a[href^="/demo?"], a[href^="/products/veridion/demo?"]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href') || '', location.origin);
        if (url.origin !== location.origin) return;
        if (!url.searchParams.get('target')) {
          url.searchParams.set('target', target);
          link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
        }
      } catch {}
    });
  }

  function promoteVisiblePrimaryAction() {
    const cards = [...document.querySelectorAll('.vr-card, .vr-price-card, .vr-dark-card, .vr-board-card, .vr-post-cta')];
    cards.forEach((card) => {
      const link = card.querySelector('a[href*="/products/veridion/demo"], a[href="/demo"], a[href^="/demo?"]');
      if (!link || link.dataset.promoted === 'true') return;
      link.dataset.promoted = 'true';
      if (!/\b(vr-button|vr-btn|btn|vr-chip|vr-cta|primary)\b/.test(link.className)) {
        link.className = `${link.className} vr-button`.trim();
      }
    });
  }

  function applyReadyFlags() {
    const page = document.body?.dataset?.page || '';
    document.documentElement.dataset.pageReady = 'true';
    document.documentElement.dataset.nv0PublicPageReady = 'true';
    if (READY_FLAG_BY_PAGE[page]) document.documentElement.dataset[READY_FLAG_BY_PAGE[page]] = 'true';
  }

  function appendPageStatus() {
    const root = document.querySelector('main');
    if (!root || document.getElementById('pageReadyStatus')) return;
    const status = document.createElement('div');
    status.id = 'pageReadyStatus';
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    const pageName = (document.title || location.pathname).split('|')[0].trim() || '현재';
    status.textContent = `${pageName} 페이지 콘텐츠와 연결 링크 로딩이 완료되었습니다.`;
    root.appendChild(status);
  }

  function init() {
    applyReadyFlags();
    markCurrentLinks();
    hardenBlankLinks();
    annotateExternalLinks();
    carryTargetToDiagnosisLinks(normalizedTargetFromQuery());
    promoteVisiblePrimaryAction();
    appendPageStatus();
  }

  try {
    init();
  } catch {}
}
