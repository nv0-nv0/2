import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
let posts = [];
let filter = 'all';
function render(){
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  const shown = posts.filter(item => filter === 'all' || (item.boardType || item.type) === filter || (filter === 'cta' && item.autoPublished));
  state.textContent = `공개 게시글 ${posts.length}건 · 현재 ${shown.length}건 표시 · 자동 발행 ${posts.filter(item => item.boardType === 'cta' || item.autoPublished).length}건`;
  list.innerHTML = renderList(shown, '<div class="muted">게시글이 없습니다.</div>', item => `<article class="result-card stack board-post ${item.boardType === 'cta' || item.autoPublished ? 'cta' : ''}"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || item.type || 'post')}</span></div><div class="post-meta"><span>${item.autoPublished ? '자동 발행' : '수동 발행'}</span><span>${escapeHtml(item.createdAt || '-')}</span></div><p>${escapeHtml(item.body || item.summary || '')}</p><div class="upgrade-box"><strong>이 글의 목적</strong><ul class="result-list"><li>방문자가 본인 사이트 위험도를 바로 확인하게 만들기</li><li>무료 요약에서 상세 리포트·수정안·정기 점검으로 자연스럽게 이어지게 하기</li><li>게시글 말미에 무료 진단·상품 비교·내 사이트 관리 링크 유지하기</li></ul></div><div class="post-cta"><a class="btn primary" href="/products/veridion/demo">무료 진단</a><a class="btn secondary" href="/plans">상품 비교</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div></article>`);
}
tabs.forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; render(); }));
try { const res = await fetch('/api/public/board'); const data = await res.json(); posts = (data.posts || []).filter(item => item.visibility !== 'private'); render(); } catch (error) { state.textContent = `게시판을 불러오지 못했습니다: ${error.message}`; list.innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>'; }
