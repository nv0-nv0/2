(function () {
  if (window.__NV0_SITE_ENHANCEMENTS__) return;
  window.__NV0_SITE_ENHANCEMENTS__ = true;

  function normalizeTarget(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
    try {
      var url = new URL(value);
      if (!url.hostname || !url.hostname.includes('.')) return '';
      return url.toString();
    } catch (_) {
      return '';
    }
  }

  function showInputHint(input, message) {
    if (!input) return;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    var id = input.getAttribute('aria-describedby');
    var hint = id ? document.getElementById(id) : null;
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'nv0-input-hint';
      hint.id = 'nv0-input-hint-' + Math.random().toString(36).slice(2, 8);
      input.setAttribute('aria-describedby', hint.id);
      input.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = message || '';
    hint.hidden = !message;
  }

  function hardenUrlInputs(root) {
    (root || document).querySelectorAll('.cta-input input, .hero-search input, input[autocomplete="url"]').forEach(function (input) {
      if (!input.hasAttribute('aria-label')) input.setAttribute('aria-label', '진단할 사이트 주소');
      input.setAttribute('inputmode', 'url');
      input.setAttribute('autocomplete', 'url');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('maxlength', '300');
    });
  }

  function bindDemoTargetForwarding() {
    document.querySelectorAll('.cta-input, .hero-search').forEach(function (box) {
      if (box.dataset.nv0ForwardBound === 'true') return;
      var input = box.querySelector('input');
      var link = box.querySelector('a[href*="/products/veridion/demo"], a[href*="/demo"]');
      if (!input || !link) return;
      box.dataset.nv0ForwardBound = 'true';
      var go = function (event) {
        var normalized = normalizeTarget(input.value);
        if (!String(input.value || '').trim()) return;
        if (!normalized) {
          event.preventDefault();
          showInputHint(input, '도메인 또는 URL 형식을 확인해 주세요. 예: https://example.kr');
          input.focus();
          return;
        }
        event.preventDefault();
        showInputHint(input, '');
        var url = new URL(link.getAttribute('href'), location.origin);
        url.searchParams.set('target', normalized);
        location.href = url.pathname + url.search;
      };
      link.addEventListener('click', go);
      input.addEventListener('keydown', function (event) { if (event.key === 'Enter') go(event); });
      if (box.tagName === 'FORM') box.addEventListener('submit', go);
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') showInputHint(input, ''); });
    });
  }

  function markCurrentLinks() {
    var current = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('nav a[href]').forEach(function (link) {
      try {
        var url = new URL(link.getAttribute('href'), location.origin);
        var target = url.pathname.replace(/\/$/, '') || '/';
        if (target === current) link.setAttribute('aria-current', 'page');
      } catch (_) {}
    });
  }

  function hardenBlankLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      var rel = new Set(String(link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener'); rel.add('noreferrer');
      link.setAttribute('rel', Array.from(rel).join(' '));
    });
  }

  function addReadyStatus() {
    if (document.getElementById('nv0PageReadyStatus')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var status = document.createElement('div');
    status.id = 'nv0PageReadyStatus';
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    status.textContent = '페이지 주요 기능 로딩이 완료되었습니다.';
    main.appendChild(status);
    document.documentElement.dataset.pageReady = 'true';
  }

  function init() {
    hardenUrlInputs(document);
    bindDemoTargetForwarding();
    markCurrentLinks();
    hardenBlankLinks();
    addReadyStatus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
