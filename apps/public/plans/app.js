function normalizeDemoTarget(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!url.hostname || !url.hostname.includes('.')) return '';
    return url.toString();
  } catch { return ''; }
}
function showInputHint(input, message) {
  if (!input) return;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  let hint = input.nextElementSibling?.classList?.contains('vr-input-hint') ? input.nextElementSibling : null;
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'vr-input-hint';
    input.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = message || '';
  hint.hidden = !message;
}
function bindInlineDemoTargetForwarding() {
  document.querySelectorAll('.cta-input, .hero-search').forEach((box) => {
    if (box.dataset.nv0ForwardBound === 'true') return;
    const input = box.querySelector('input');
    const link = box.querySelector('a[href*="/products/veridion/demo"]');
    if (!input || !link) return;
    box.dataset.nv0ForwardBound = 'true';
    const go = (event) => {
      const raw = String(input.value || '').trim();
      if (!raw) return;
      const normalized = normalizeDemoTarget(raw);
      if (!normalized) {
        event.preventDefault();
        showInputHint(input, '도메인 또는 URL 형식을 확인해 주세요. 예: https://example.kr');
        input.focus();
        return;
      }
      event.preventDefault();
      showInputHint(input, '');
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('target', normalized);
      location.href = `${url.pathname}${url.search}`;
    };
    link.addEventListener('click', go);
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') go(event); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showInputHint(input, ''); });
  });
}
try {
  document.documentElement.dataset.pageReady = 'true';
  bindInlineDemoTargetForwarding();
} catch {}
