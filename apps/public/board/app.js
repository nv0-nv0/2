import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
let posts = [];
let filter = 'all';
function renderPostBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  if (!sections.length) return '<p class="post-paragraph muted">본문이 준비되지 않았습니다.</p>';
  return `<div class="post-body">${sections.map(section => {
    const [first, ...rest] = section.split('\n');
    const headingLike = /^(제목 후보|도입|문제 제기|해결 과정|신뢰 근거|FAQ|자연스러운 CTA|내부링크|태그)$/.test(first.trim());
    if (headingLike) {
      const content = rest.join('\n').trim();
      return `<section class="post-section"><h3>${escapeHtml(first)}</h3>${content ? `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>` : ''}</section>`;
    }
    return `<p class="post-paragraph">${escapeHtml(section).replace(/\n/g, '<br>')}</p>`;
  }).join('')}</div>`;
}
function render(){
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  const shown = posts.filter(item => filter === 'all' || (item.boardType || item.type) === filter || (filter === 'cta' && item.autoPublished));
  const autoCount = posts.filter(item => item.boardType === 'cta' || item.autoPublished).length;
  const variantCount = Number(window.__NV0_BOARD_VARIANT_COUNT__ || 24);
  const comboMode = window.__NV0_BOARD_COMBINATION_MODE__ || 'unbounded_seeded_combinatorial';
  const comboLabel = comboMode === 'unbounded_seeded_combinatorial' ? '무한 조합형 생성' : '주제 순환';
  state.textContent = `공개 게시글 ${posts.length}건 · 현재 ${shown.length}건 표시 · 자동 발행 ${autoCount}건 · 기본 주제팩 ${variantCount}개 · ${comboLabel}`;
  list.innerHTML = renderList(shown, '<div class="empty-state stack"><strong>조건에 맞는 게시글이 없습니다.</strong><p>전체 탭으로 이동하거나 Auto 플랜에서 사이트별 진단 결과 기반 게시글을 발행하세요.</p><a class="btn secondary" href="/plans#subscription">Auto 플랜 확인</a></div>', item => `<article class="result-card stack board-post ${item.boardType === 'cta' || item.autoPublished ? 'cta' : ''}"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || item.type || 'post')}</span></div><div class="post-meta"><span>${item.autoPublished ? '자동 발행' : '수동 발행'}</span><span>${escapeHtml(item.createdAt || '-')}</span><span>${escapeHtml(item.searchIntent || '검색의도 확인')}</span><span>${escapeHtml(item.funnelStage || '고객단계 확인')}</span><span>${escapeHtml(item.primaryKeyword || item.qualityStandard || 'SEO 기준')}</span></div>${renderPostBody(item.body || item.summary || '')}<div class="upgrade-box"><strong>이 글의 목적</strong><ul class="result-list"><li>방문자가 본인 사이트 위험도를 바로 확인하게 만들기</li><li>검색 의도·고객 단계·업종·FAQ·CTA를 조합해 반복 콘텐츠를 줄이기</li><li>게시글 말미에 무료 진단·상품 비교·내 사이트 관리 링크를 상황별로 유지하기</li></ul></div><div class="post-cta"><a class="btn primary" href="/products/veridion/demo">무료 진단</a><a class="btn secondary" href="/plans">상품 비교</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div></article>`);
}
tabs.forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; render(); }));
try {
  const res = await fetch('/api/public/board');
  const data = await res.json();
  window.__NV0_BOARD_VARIANT_COUNT__ = data.variantCount || data.topicPackCount || 24;
  window.__NV0_BOARD_COMBINATION_MODE__ = data.combinationMode || data.combinationStats?.mode || '';
  posts = (data.posts || []).filter(item => item.visibility !== 'private');
  render();
} catch (error) {
  state.textContent = `게시판을 불러오지 못했습니다: ${error.message}`;
  list.innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
}
