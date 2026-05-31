function normalizedTargetFromQuery() {
  const raw = new URLSearchParams(location.search).get('target');
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.toString();
  } catch {
    return '';
  }
}

function carryTargetToDiagnosisLinks(target) {
  if (!target) return;
  document.querySelectorAll('a[href^="/products/veridion/demo"]').forEach((link) => {
    try {
      const url = new URL(link.getAttribute('href'), location.origin);
      if (!url.searchParams.get('target')) {
        url.searchParams.set('target', target);
        link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {}
  });
}

function promoteVisiblePrimaryAction() {
  const cards = [...document.querySelectorAll('.vr-card, .vr-price-card, .vr-dark-card')];
  cards.forEach((card) => {
    const link = card.querySelector('a[href^="/products/veridion/demo"]');
    if (!link || link.dataset.promoted === 'true') return;
    link.dataset.promoted = 'true';
    if (!/\b(vr-button|vr-btn|btn|vr-chip|vr-cta)\b/.test(link.className)) {
      link.className = `${link.className} vr-button`.trim();
    }
  });
}

try {
  document.documentElement.dataset.pageReady = 'true';
  const target = normalizedTargetFromQuery();
  carryTargetToDiagnosisLinks(target);
  promoteVisiblePrimaryAction();
} catch {}
