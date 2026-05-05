import { escapeHtml, renderList } from '/shared/html.js';
const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const pager = document.getElementById('boardPagination');
const activity = document.getElementById('boardActivity');
const statNodes = Array.from(document.querySelectorAll('[data-board-stat]'));
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
const topicButtons = Array.from(document.querySelectorAll('[data-topic]'));
let posts = [];
let filter = new URLSearchParams(location.search).get('filter') || 'all';
let topic = new URLSearchParams(location.search).get('topic') || '';
let page = Math.max(1, Number(new URLSearchParams(location.search).get('page') || '1'));
let pagination = { page: 1, pageSize: 5, total: 0, totalPages: 1 };
let stats = { total: 0, cta: 0, notice: 0, case: 0, recent7d: 0, filteredTotal: 0 };
let activities = [];

const FALLBACK_POSTS = [
  {
    id: 'fallback-case-footer',
    boardType: 'case',
    title: '쇼핑몰 푸터 고지 정리 사례',
    summary: '사업자 정보, 고객지원 이메일, 환불 안내 링크를 결제 전 확인 위치에 배치한 예시입니다.',
    body: '사례
사업자 정보는 있었지만 환불·청약철회 안내와 고객지원 이메일이 결제 전 화면에서 분리되어 있었습니다.

바로 고칠 수 있는 것
푸터, 결제 전 확인 박스, 환불·청약철회 정책 링크를 같은 흐름으로 연결하면 고객이 결제 전에 확인할 정보를 놓치지 않습니다.',
    primaryKeyword: '사업자 정보',
    tags: ['사업자정보', '환불안내', '푸터고지'],
    visibility: 'public',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fallback-notice-reading',
    boardType: 'notice',
    title: '무료 진단 결과 해석 기준',
    summary: '자동 확인 가능한 항목과 수동확인 필요 항목을 분리해 과장 없이 표시합니다.',
    body: '공지
무료 진단은 공개 접근 가능한 페이지 기준으로 확인합니다. 로그인 후 화면, 외부 결제창, 행정기관 진위 확인은 자동 단정하지 않습니다.

오늘 바로 확인할 체크리스트
개인정보처리방침, 이용약관, 환불·청약철회 정책, 고객지원 이메일, 사업자 정보를 결제 전 위치에서 확인하세요.',
    primaryKeyword: '무료 진단',
    tags: ['무료진단', '수동확인', '신뢰점검'],
    visibility: 'public',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'fallback-cta-priority',
    boardType: 'cta',
    autoPublished: true,
    title: '상세 리포트로 이어지는 수정 우선순위',
    summary: '확인 URL과 수정 문구안을 함께 제공해 운영자가 바로 조치할 수 있도록 정리합니다.',
    body: '한눈에 보는 핵심 요약
무료 진단에서 확인된 문제는 중요도 순서로 정리되어야 합니다. 단순 목록보다 P0·P1·P2로 나누면 실제 수정이 빨라집니다.

다음에 할 일
먼저 무료 진단을 실행하고, 확인 URL이 있는 항목부터 수정하세요. 자동 단정이 어려운 항목은 별도 확인으로 남겨야 합니다.',
    primaryKeyword: '상세 리포트',
    tags: ['상세리포트', '우선순위', '수정문구'],
    visibility: 'public',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];
const FALLBACK_ACTIVITIES = FALLBACK_POSTS.slice(0, 3).map((item) => ({
  label: item.autoPublished ? '자동 발행' : '기본 콘텐츠',
  title: item.title,
  type: item.boardType,
  createdAt: item.createdAt
}));
const FALLBACK_STATS = { total: 3, cta: 1, notice: 1, case: 1, recent7d: 3, filteredTotal: 3 };

function fallbackForFilter(value = 'all') {
  return FALLBACK_POSTS.filter((item) => value === 'all' || item.boardType === value || (value === 'cta' && item.autoPublished));
}
function applyBoardFallback(reason = '') {
  posts = fallbackForFilter(filter);
  stats = { ...FALLBACK_STATS, filteredTotal: posts.length };
  activities = FALLBACK_ACTIVITIES;
  pagination = { page: 1, pageSize: 5, total: posts.length, totalPages: 1 };
  page = 1;
  render();
  if (state) state.textContent = `게시판 API 연결이 지연되어 기본 콘텐츠 ${posts.length}건을 먼저 표시합니다.${reason ? ` (${reason})` : ''}`;
}


function formatRelativeTime(value) {
  const at = Date.parse(value || '');
  if (!Number.isFinite(at)) return '등록일 확인 중';
  const delta = Math.max(0, Date.now() - at);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return '방금 전';
  if (delta < hour) return `${Math.floor(delta / minute)}분 전`;
  if (delta < day) return `${Math.floor(delta / hour)}시간 전`;
  if (delta < 7 * day) return `${Math.floor(delta / day)}일 전`;
  return new Date(at).toLocaleDateString('ko-KR');
}

function renderStats() {
  statNodes.forEach(node => {
    const key = node.dataset.boardStat;
    const value = Number(stats[key] ?? 0);
    node.textContent = Number.isFinite(value) ? value.toLocaleString('ko-KR') : '-';
  });
}

function renderActivity() {
  if (!activity) return;
  if (!activities.length) {
    activity.innerHTML = '<div class="activity-item"><span class="nv0-avatar">NV</span><div><strong>아직 공개 활동이 없습니다.</strong><div class="muted">무료 진단 또는 관리자 발행 후 여기에 표시됩니다.</div></div></div>';
    return;
  }
  activity.innerHTML = activities.map((item, index) => {
    const initials = index === 0 ? 'UP' : index === 1 ? 'CT' : 'NV';
    return `<div class="activity-item"><span class="nv0-avatar">${initials}</span><div><strong>${escapeHtml(item.label || '공개 게시글')} · ${escapeHtml(item.title || '제목 없음')}</strong><div class="muted">${escapeHtml(item.type || '게시글')} · ${escapeHtml(formatRelativeTime(item.createdAt))}</div></div></div>`;
  }).join('');
}

function renderPostBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  if (!sections.length) return '<p class="post-paragraph muted">본문이 준비되지 않았습니다.</p>';
  return `<div class="post-body">${sections.map(section => {
    const [first, ...rest] = section.split('\n');
    const headingLike = /^(왜 이 글을 썼나요|한눈에 보는 핵심 요약|지금 보이는 문제|고객 입장에서 보면|실제로 확인할 요소|바로 고칠 수 있는 것|문구를 쉽게 바꾸는 방법|검색에 잘 읽히게 정리하는 방법|제목 후보|자주 묻는 질문|다음에 할 일|관련 링크|이 글에서 바로 얻을 수 있는 것|이런 경우 문제가 됩니다|고객은 이렇게 느낍니다|오늘 바로 확인할 체크리스트|문구를 이렇게 바꿔보세요|마무리|공지|사례|체크리스트|도입|이 글이 도움이 되는 경우|연관 예시|고객이 실제로 확인하는 포인트|바로 적용할 체크리스트|문구 예시|FAQ|자연스러운 CTA|해시태그)[.!?。]?$/.test(first.trim());
    if (headingLike) {
      const content = rest.join('\n').trim();
      return `<section class="post-section"><h3>${escapeHtml(first)}</h3>${content ? `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>` : ''}</section>`;
    }
    return `<p class="post-paragraph">${escapeHtml(section).replace(/\n/g, '<br>')}</p>`;
  }).join('')}</div>`;
}

function renderPostTags(tags = []) {
  const items = Array.isArray(tags) ? tags.map(tag => String(tag || '').trim().replace(/^#/, '')).filter(Boolean).slice(0, 10) : [];
  if (!items.length) return '';
  return `<div class="post-tags">${items.map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}</div>`;
}

function postMatchesTopic(item = {}, topicValue = '') {
  const query = String(topicValue || '').trim().toLowerCase();
  if (!query) return true;
  const haystack = [item.title, item.summary, item.body, item.primaryKeyword, item.boardType, ...(Array.isArray(item.tags) ? item.tags : [])]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
  return query.split(/\s+/).filter(Boolean).some(token => haystack.includes(token));
}
function updateUrlState() {
  const next = new URLSearchParams();
  if (filter && filter !== 'all') next.set('filter', filter);
  if (topic) next.set('topic', topic);
  if (page > 1) next.set('page', String(page));
  history.replaceState(null, '', `${location.pathname}${next.toString() ? `?${next.toString()}` : ''}`);
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
  topicButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.topic === topic));
  renderStats();
  renderActivity();
  const autoCount = Number(stats.cta || window.__NV0_BOARD_AUTO_COUNT__ || 0);
  const visiblePosts = posts.filter(item => postMatchesTopic(item, topic));
  const topicText = topic ? ` · 주제 ${topic}` : '';
  state.textContent = `공개 게시글 ${visiblePosts.length}건${topicText} · ${pagination.page}/${pagination.totalPages}페이지 · 한 페이지 5개 · 진단 연결 ${autoCount}건`;
  list.innerHTML = renderList(visiblePosts, '<div class="empty-state stack"><strong>조건에 맞는 게시글이 없습니다.</strong><p>필터를 초기화하거나 무료 진단 후 새 글을 발행하세요.</p><a class="btn secondary" href="/board">필터 초기화</a><a class="btn secondary" href="/products/veridion/demo">무료 진단 시작</a></div>', item => `<article class="result-card stack board-post ${item.boardType === 'cta' || item.autoPublished ? 'cta' : ''}"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || item.type || 'post')}</span></div><div class="post-meta"><span>${item.autoPublished ? '자동 발행' : '운영 글'}</span><span>${escapeHtml(item.createdAt || '-')}</span><span>${escapeHtml(item.primaryKeyword || '고객 안내')}</span></div>${item.summary ? `<p class="post-summary">${escapeHtml(item.summary)}</p>` : ''}${renderPostBody(item.body || item.summary || '')}${renderPostTags(item.tags || [])}<div class="post-cta"><a class="btn primary" href="/products/veridion/demo">내 사이트도 무료 진단</a><a class="btn secondary" href="/plans">플랜 비교</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div></article>`);
  renderPagination();
}

async function loadBoard() {
  state.textContent = '게시글을 불러오는 중입니다.';
  updateUrlState();
  const params = new URLSearchParams({ page: String(page), pageSize: '5', filter });
  try {
    const res = await fetch(`/api/public/board?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `게시판 요청 실패 (${res.status})`);
    window.__NV0_BOARD_AUTO_COUNT__ = data.autoPublishedCount || 0;
    stats = { ...stats, ...(data.stats || {}), filteredTotal: data.pagination?.total ?? data.stats?.filteredTotal ?? 0 };
    activities = Array.isArray(data.activity) ? data.activity : [];
    posts = (data.posts || []).filter(item => item.visibility !== 'private');
    pagination = data.pagination || { page, pageSize: 5, total: posts.length, totalPages: 1 };
    page = pagination.page;
    render();
  } catch (error) {
    applyBoardFallback(error.message || '연결 지연');
  }
}

tabs.forEach(btn => btn.addEventListener('click', () => {
  filter = btn.dataset.filter || 'all';
  topic = '';
  page = 1;
  loadBoard();
}));
topicButtons.forEach(btn => btn.addEventListener('click', () => {
  topic = btn.dataset.topic === topic ? '' : (btn.dataset.topic || '');
  page = 1;
  render();
  updateUrlState();
}));
loadBoard();
