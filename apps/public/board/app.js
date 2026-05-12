import { escapeHtml, renderList } from '/shared/html.js';

const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const pager = document.getElementById('boardPagination');
const activity = document.getElementById('boardActivity');
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
const searchInput = document.getElementById('boardSearch');
const searchBtn = document.getElementById('boardSearchBtn');

let filter = new URLSearchParams(location.search).get('filter') || 'all';
let query = new URLSearchParams(location.search).get('q') || '';
let page = Number(new URLSearchParams(location.search).get('page') || 1) || 1;
let posts = [];
let pagination = { page: 1, pageSize: 6, total: 0, totalPages: 1 };
let activities = [];

if (searchInput) searchInput.value = query;

function typeLabel() {
  return 'CTA 목적 칼럼';
}
function pillClass() {
  return 'brand';
}
function updateUrlState() {
  const next = new URLSearchParams();
  if (filter && filter !== 'all') next.set('filter', filter);
  if (query) next.set('q', query);
  if (page > 1) next.set('page', String(page));
  history.replaceState(null, '', `${location.pathname}${next.toString() ? `?${next.toString()}` : ''}`);
}
function matchesQuery(item) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return [item.title, item.summary, item.body, item.primaryKeyword, ...(item.tags || [])].join(' ').toLowerCase().includes(needle);
}
function renderPostBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  return `<div class="post-body">${sections.map(section => {
    const [first, ...rest] = section.split('\n');
    const content = rest.join('\n').trim();
    return content ? `<section class="post-section"><h3>${escapeHtml(first)}</h3><p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p></section>` : `<p class="post-paragraph">${escapeHtml(first)}</p>`;
  }).join('')}</div>`;
}
function renderActivity() {
  if (!activity) return;
  const items = activities.length ? activities : posts.slice(0, 3).map(item => ({ title: item.title, type: typeLabel(item.boardType), createdAt: item.createdAt }));
  activity.innerHTML = items.map((item, index) => `<div class="activity-item"><span class="nv0-avatar">${index + 1}</span><div><strong>${escapeHtml(item.title || '게시글')}</strong><div class="muted">${escapeHtml(item.type || '게시글')} · ${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : '공개')}</div></div></div>`).join('');
}
function renderPagination() {
  if (!pager) return;
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  pager.innerHTML = Array.from({ length: totalPages }, (_, idx) => {
    const n = idx + 1;
    return `<button type="button" data-page="${n}" class="${n === pagination.page ? 'active' : ''}">${n}</button>`;
  }).join('');
  pager.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => { page = Number(btn.dataset.page || 1); loadBoard(); }));
}
function render() {
  tabs.forEach(btn => btn.classList.toggle('active', (btn.dataset.filter || 'all') === filter));
  const visible = posts.filter(matchesQuery);
  if (state) state.textContent = `CTA 목적 게시판 · 현재 ${visible.length.toLocaleString('ko-KR')}개 글을 표시합니다. 모든 글은 흥미·문제 인식 60%, CTA 설득 20%, 보조 정보 20% 구조입니다.`;
  if (list) {
    list.innerHTML = renderList(visible, '<div class="empty-state"><strong>조건에 맞는 칼럼이 없습니다.</strong><p>검색어를 줄이거나 전체 탭을 선택해 주세요.</p></div>', item => {
      const tagItems = (item.tags || item.hashtags || []).slice(0, 10).map(tag => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('');
      const checklist = Array.isArray(item.checklist) && item.checklist.length ? `<section class="seo-meta-card"><h4>빠른 체크리스트</h4><ul class="check-list">${item.checklist.slice(0, 6).map(point => `<li><span class="check">✓</span>${escapeHtml(point)}</li>`).join('')}</ul></section>` : '';
      const faq = Array.isArray(item.faq) && item.faq.length ? `<section class="seo-meta-card"><h4>자주 묻는 질문</h4>${item.faq.slice(0, 3).map(entry => `<details class="faq-item"><summary>${escapeHtml(entry.question || '')}</summary><div class="faq-content">${escapeHtml(entry.answer || '')}</div></details>`).join('')}</section>` : '';
      const links = Array.isArray(item.internalLinks) && item.internalLinks.length ? `<nav class="internal-link-row" aria-label="관련 링크">${item.internalLinks.slice(0, 4).map(link => `<a class="btn secondary" href="${escapeHtml(link.href || '#')}">${escapeHtml(link.label || '관련 링크')}</a>`).join('')}</nav>` : '';
      const seoSummary = `<div class="seo-meta-strip"><span>검색 의도: ${escapeHtml(item.searchIntent || item.primaryKeyword || '법률·규제 리스크 점검')}</span><span>주요 키워드: ${escapeHtml(item.primaryKeyword || '')}</span><span>해시태그 ${Math.min(10, (item.tags || []).length)}개</span></div>`;
      return `<article class="article-card board-post" id="${escapeHtml(item.slug || item.id || '')}"><div class="pill ${pillClass(item.boardType)}">${escapeHtml(item.category || typeLabel(item.boardType))}</div><h3>${escapeHtml(item.title)}</h3><p class="post-summary">${escapeHtml(item.summary || '')}</p>${seoSummary}${renderPostBody(item.body || '')}${checklist}${faq}<div class="post-tags">${tagItems}</div>${links}<div class="post-cta"><a class="btn primary" href="/products/veridion/demo">내 사이트 무료 진단</a><a class="btn secondary" href="/plans">요금제 확인</a><a class="btn secondary" href="/service">서비스·가이드 보기</a></div></article>`;
    });
  }
  renderActivity();
  renderPagination();
}
async function loadBoard() {
  updateUrlState();
  if (state) state.textContent = '새 칼럼 엔진이 공개한 글을 불러오는 중입니다.';
  try {
    const res = await fetch(`/api/public/board?page=${page}&pageSize=10&filter=${encodeURIComponent(filter)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !Array.isArray(data.posts)) throw new Error('칼럼을 불러오지 못했습니다.');
    posts = data.posts;
    activities = Array.isArray(data.activity) ? data.activity : [];
    pagination = data.pagination || pagination;
    render();
  } catch (error) {
    if (state) state.textContent = error.message || '칼럼을 불러오지 못했습니다.';
  }
}

tabs.forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter || 'all'; page = 1; loadBoard(); }));
searchBtn?.addEventListener('click', () => { query = searchInput?.value.trim() || ''; page = 1; updateUrlState(); render(); });
searchInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { query = searchInput.value.trim(); page = 1; updateUrlState(); render(); } });
loadBoard();
