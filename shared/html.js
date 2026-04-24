export function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export function escapeAttr(value = "") {
  return escapeHtml(String(value ?? "").replace(/`/g, '&#96;'));
}

export function formatWon(value = 0) {
  return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

export function renderList(items = [], emptyHtml = '<li>없음</li>', renderItem = (item) => `<li>${escapeHtml(item)}</li>`) {
  if (!Array.isArray(items) || items.length === 0) return emptyHtml;
  return items.map((item, index) => renderItem(item, index)).join('');
}

export function safeUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}
