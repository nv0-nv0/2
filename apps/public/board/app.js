const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const formatDate = (value) => {
  if (!value) return '발행 시간 확인 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '발행 시간 확인 중';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
let state = { page: 1, filter: 'all', query: '' };
let controller = null;
function fallbackPosts() {
  return [{
    title: '정기 업데이트로 관리되는 고객 신뢰 인사이트 운영 방식',
    category: '운영 인사이트',
    summary: '목록 연결이 지연되어도 페이지가 비어 보이지 않도록 검수된 기본 인사이트를 먼저 표시합니다.',
    body: '인사이트는 제목, 본문, 내부 링크, 중복 여부, 오탈자, 깨진 문자를 검수한 뒤 공개합니다.',
    tags: ['점검 의도: 고객 신뢰 점검', '핵심 주제: 정기 업데이트', '분류 태그 5개'],
    publishedAt: new Date().toISOString()
  }];
}
function renderPosts(posts) {
  const safePosts = posts.length ? posts : fallbackPosts();
  $('#boardList').innerHTML = safePosts.map((post) => {
    const tags = [post.primaryKeyword, ...(post.tags || []), ...(post.hashtags || [])].filter(Boolean).slice(0, 5);
    const body = String(post.body || '').replace(/<script[\s\S]*?<\/script>/gi, '').slice(0, 1200);
    return `<article class="vr-board-card"><div class="vr-board-card-head"><span class="vr-pill">${escapeHtml(post.category || '인사이트')}</span><span class="vr-pill success">${escapeHtml(formatDate(post.publishedAt || post.createdAt))}</span></div><h2>${escapeHtml(post.title || '고객 신뢰 인사이트')}</h2><p>${escapeHtml(post.summary || '운영 기준에 맞춰 정리한 인사이트입니다.')}</p><div class="vr-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div><div class="vr-post-body">${body}</div><div class="vr-post-cta"><a class="vr-btn primary" href="/products/veridion/demo">무료 진단</a><a class="vr-btn" href="/portal">고객 포털</a></div></article>`;
  }).join('');
}
function renderPagination(pagination = {}) {
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const page = Math.max(1, Number(pagination.page || 1));
  if (totalPages <= 1) {
    $('#boardPagination').innerHTML = '';
    return;
  }
  const buttons = [];
  for (let i = 1; i <= Math.min(totalPages, 7); i += 1) buttons.push(`<button type="button" data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`);
  $('#boardPagination').innerHTML = buttons.join('');
  $$('#boardPagination button').forEach((button) => button.addEventListener('click', () => {
    state.page = Number(button.dataset.page || 1);
    loadBoard();
  }));
}
function renderActivity(activity = []) {
  const items = activity.length ? activity : fallbackPosts().map((item) => ({ title: item.title, createdAt: item.publishedAt, type: '운영 인사이트' }));
  $('#boardActivity').innerHTML = items.slice(0, 5).map((item) => `<a href="/board"><b>${escapeHtml(item.title || '인사이트')}</b><span>${escapeHtml(item.type || '발행')} · ${escapeHtml(formatDate(item.createdAt || item.publishedAt))}</span></a>`).join('');
}
async function loadBoard() {
  if (controller) controller.abort();
  controller = new AbortController();
  const params = new URLSearchParams({ page: String(state.page), pageSize: '10', filter: state.filter, q: state.query });
  $('#boardState').textContent = '인사이트 목록을 불러오고 있습니다.';
  try {
    const res = await fetch(`/api/public/board?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'board_failed');
    renderPosts(Array.isArray(data.posts) ? data.posts : []);
    renderPagination(data.pagination || {});
    renderActivity(data.activity || []);
    $('#boardCadence').textContent = '정기 업데이트';
    const total = data.pagination?.total ?? (data.posts || []).length;
    $('#boardState').textContent = `총 ${total}개 인사이트를 표시합니다. 정기 업데이트 기준입니다.`;
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderPosts(fallbackPosts());
    renderPagination({ totalPages: 1, page: 1 });
    renderActivity([]);
    $('#boardState').textContent = '서버 연결이 지연되어 검수된 기본 인사이트를 표시합니다.';
  }
}
$$('.vr-tabs button').forEach((button) => button.addEventListener('click', () => {
  $$('.vr-tabs button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  state.filter = button.dataset.filter || 'all';
  state.page = 1;
  loadBoard();
}));
$('#boardSearchForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = $('#boardSearch')?.value?.trim() || '';
  state.page = 1;
  loadBoard();
});
loadBoard();
