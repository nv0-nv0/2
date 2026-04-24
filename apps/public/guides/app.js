import { escapeHtml, renderList } from '/shared/html.js';

const state = document.getElementById('guideState');
const list = document.getElementById('guideList');

(async()=>{
  try {
    const res = await fetch('/api/public/content');
    const data = await res.json();
    const items = data.items || [];
    state.textContent = `공개 콘텐츠 ${items.length}건`;
    list.innerHTML = renderList(items, '<div class="card muted">표시할 콘텐츠가 없습니다.</div>', (item) => `
      <div class="result-card stack">
        <div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.type)}</span></div>
        <div class="muted">${escapeHtml(item.createdAt || '-')}${item.effectiveDate ? ` · 시행 ${escapeHtml(item.effectiveDate)}` : ''}</div>
        <div>${escapeHtml(item.summary || item.body || '')}</div>
      </div>
    `);
  } catch (error) {
    state.textContent = `가이드 콘텐츠를 불러오지 못했습니다: ${error.message}`;
    list.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>';
  }
})();
