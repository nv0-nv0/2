import { escapeHtml, renderList } from '/shared/html.js';

const state = document.getElementById('guideState');
const list = document.getElementById('guideList');

(async()=>{
  try {
    const res = await fetch('/api/public/content');
    const data = await res.json();
    const items = data.items || [];
    state.textContent = `공개 콘텐츠 ${items.length}건`;
    list.innerHTML = renderList(items, '<div class="card stack"><strong>공개 가이드가 아직 표시되지 않았습니다.</strong><p class="muted">운영자는 관리자 자료실에서 신뢰 점검, 환불 정책, 안내 버튼 개선, 게시판 운영 가이드를 발행해야 합니다.</p><a class="btn secondary" href="/products/veridion/demo">무료 진단 먼저 보기</a></div>', (item) => `
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
