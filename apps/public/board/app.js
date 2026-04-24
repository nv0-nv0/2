import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
try {
  const res = await fetch('/api/public/board');
  const data = await res.json();
  const posts = (data.posts || []).filter(item => item.visibility !== 'private');
  state.textContent = `공개 게시글 ${posts.length}건 · 자동 발행 주기 2시간`;
  list.innerHTML = renderList(posts, '<div class="muted">게시글이 없습니다.</div>', item => `
    <article class="result-card stack">
      <div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || 'cta')}</span></div>
      <p>${escapeHtml(item.body || '')}</p>
      <div class="muted">${escapeHtml(item.createdAt || '-')}</div>
      <div class="topnav"><a href="/products/veridion/demo">무료진단</a><a href="/plans">유료 플랜 보기</a></div>
    </article>`);
} catch (error) {
  state.textContent = `게시판을 불러오지 못했습니다: ${error.message}`;
  list.innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
}
