import { getCommercialOffer, formatWon as formatCatalogWon } from '/shared/product-catalog.mjs';

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
function populateCatalogCopy() {
  const ctaCopy = {
    Report: '기본 리포트 구매',
    Expert: '전문가 플랜 시작'
  };
  document.querySelectorAll('[data-plan-code][data-plan-field]').forEach((node) => {
    const code = node.getAttribute('data-plan-code');
    const field = node.getAttribute('data-plan-field');
    const offer = getCommercialOffer(code);
    if (!offer) return;
    if (field === 'title') node.textContent = offer.title;
    if (field === 'priceLabel') node.textContent = `₩${formatCatalogWon(offer.price)}/${offer.period}`;
    if (field === 'cta') node.textContent = ctaCopy[code] || `${offer.title} 시작`;
  });
}
function bindInlineDemoTargetForwarding() {
  document.querySelectorAll('.cta-input, .hero-search').forEach((box) => {
    if (box.dataset.nv0ForwardBound === 'true') return;
    const input = box.querySelector('input');
    const link = box.querySelector('a[href*="/products/veridion/demo"]');
    if (link) link.textContent = '사이트 무료 진단 실행';
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
  populateCatalogCopy();
  bindInlineDemoTargetForwarding();
} catch {}
