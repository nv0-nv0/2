import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const pager = document.getElementById('boardPagination');
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
let posts = [];
let filter = new URLSearchParams(location.search).get('filter') || 'all';
let page = Math.max(1, Number(new URLSearchParams(location.search).get('page') || '1'));
let pagination = { page: 1, pageSize: 5, total: 0, totalPages: 1 };

function renderPostBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  if (!sections.length) return '<p class="post-paragraph muted">본문이 준비되지 않았습니다.</p>';
  return `<div class="post-body">${sections.map(section => {
    const [first, ...rest] = section.split('\n');
    const headingLike = /^(이 글에서 바로 얻을 수 있는 것|이런 경우 문제가 됩니다|고객은 이렇게 느낍니다|오늘 바로 확인할 체크리스트|문구를 이렇게 바꿔보세요|자주 묻는 질문|마무리|관련 링크|공지|사례|체크리스트)$/.test(first.trim());
    if (headingLike) {
      const content = rest.join('\n').trim();
      return `<section class="post-section"><h3>${escapeHtml(first)}</h3>${content ? `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>` : ''}</section>`;
    }
    return `<p class="post-paragraph">${escapeHtml(section).replace(/\n/g, '<br>')}</p>`;
  }).join('')}</div>`;
}

function renderPagination() {
  if (!pager) return;
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  const buttons = [];
  for (let i = 1; i <= totalPages; i += 1) {
    buttons.push(`<button type="button" data-page="${i}" class="${i === pagination.page ? 'active' : ''}" aria-current="${i === pagination.page ? 'page' : 'false'}">${i}</button>`);
  }
  pager.innerHTML = buttons.join('');
  pager.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
    page = Number(btn.dataset.page || '1');
    loadBoard();
  }));
}

function render(){
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  const autoCount = Number(window.__NV0_BOARD_AUTO_COUNT__ || 0);
  state.textContent = `공개 게시글 ${pagination.total}건 · ${pagination.page}/${pagination.totalPages}페이지 · 한 페이지 5개 · 자동 발행 ${autoCount}건`;
  list.innerHTML = renderList(posts, '<div class="empty-state stack"><strong>조건에 맞는 게시글이 없습니다.</strong><p>전체 탭으로 이동하거나 무료 진단 후 새 글을 발행하세요.</p><a class="btn secondary" href="/products/veridion/demo">무료 진단 시작</a></div>', item => `<article class="result-card stack board-post ${item.boardType === 'cta' || item.autoPublished ? 'cta' : ''}"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || item.type || 'post')}</span></div><div class="post-meta"><span>${item.autoPublished ? '자동 발행' : '운영 글'}</span><span>${escapeHtml(item.createdAt || '-')}</span><span>${escapeHtml(item.primaryKeyword || '고객 안내')}</span></div>${renderPostBody(item.body || item.summary || '')}<div class="post-cta"><a class="btn primary" href="/products/veridion/demo">무료 진단</a><a class="btn secondary" href="/plans">상품 비교</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div></article>`);
  renderPagination();
}

async function loadBoard() {
  state.textContent = '게시글을 불러오는 중입니다.';
  const params = new URLSearchParams({ page: String(page), pageSize: '5', filter });
  try {
    const res = await fetch(`/api/public/board?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `게시판 요청 실패 (${res.status})`);
    window.__NV0_BOARD_AUTO_COUNT__ = data.autoPublishedCount || 0;
    posts = (data.posts || []).filter(item => item.visibility !== 'private');
    pagination = data.pagination || { page, pageSize: 5, total: posts.length, totalPages: 1 };
    page = pagination.page;
    render();
  } catch (error) {
    state.textContent = `게시판을 불러오지 못했습니다: ${error.message}`;
    list.innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
    if (pager) pager.innerHTML = '';
  }
}

tabs.forEach(btn => btn.addEventListener('click', () => {
  filter = btn.dataset.filter;
  page = 1;
  loadBoard();
}));
loadBoard();
