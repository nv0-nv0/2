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

function buildFallbackBody(theme, problem, product) {
  return `왜 이 글을 썼나요?
처음 방문한 고객은 상품 설명보다 먼저 “믿고 문의하거나 결제해도 될까?”를 확인합니다. 이 글은 ${theme}을 고객 눈높이로 정리해 고객이 멈추는 지점을 줄이는 방법을 안내합니다. 어려운 정책 설명보다 지금 화면에서 바로 확인할 수 있는 문장, 버튼 주변 안내, 문의 경로를 중심으로 설명합니다.

한눈에 보는 핵심 요약
확인 주제: ${theme}
주요 문제: ${problem}
우선 위치: 첫 화면, 가격표, 문의 버튼, 결제 버튼, 입력 화면, 푸터
권장 흐름: 문제 확인 → 체크리스트 점검 → 문구 수정 → 무료 진단 → 필요한 산출물 선택

지금 보이는 문제
${problem} 고객은 불편하다고 말하지 않고 조용히 이탈하는 경우가 많습니다. 운영자는 디자인, 가격, 광고 소재만 문제라고 보기 쉽지만 실제로는 버튼 주변의 한 줄 안내, 결제 전 제공 범위, 개인정보 입력 목적, 문의 응답 기준이 부족해서 멈추는 경우도 있습니다. 이런 공백이 반복되면 광고비와 운영 시간은 계속 들어가는데 문의나 구매로 이어지는 흐름은 쌓이지 않습니다.

독자가 관심 있어 할 부분
고객은 기능만 비교하지 않습니다. 누가 운영하는지, 문제가 생기면 어디로 연락하는지, 결제 후 무엇을 받는지, 개인정보는 어떻게 쓰이는지까지 함께 확인합니다. 그래서 ${theme}은 단순한 정책 문구가 아니라 구매 판단을 돕는 콘텐츠입니다. 독자가 오래 읽는 글은 상품 자랑보다 “내가 신청해도 안전한가”, “취소나 문의가 가능한가”, “설명이 과장되지 않았는가” 같은 실제 걱정을 먼저 풀어 줍니다.

고객 입장에서 보면
고객은 긴 설명을 모두 읽기보다 필요한 답을 먼저 찾습니다. 환불 가능 여부, 문의 응답 기준, 개인정보 사용 목적, 결제 후 제공 범위가 버튼 가까이에 있으면 다음 행동으로 넘어가기 쉽습니다. 반대로 답이 숨어 있으면 다시 검색하거나 경쟁 사이트로 이동할 가능성이 커집니다.

바로 고칠 수 있는 것
1. ${theme}이 첫 화면, 가격표, 결제 버튼, 문의 버튼 중 어디에서 보이는지 확인합니다.
2. 고객이 버튼을 누르기 직전에 필요한 답을 찾을 수 있는지 확인합니다.
3. 모바일 화면에서 안내 문구가 접히거나 너무 아래로 밀리지 않는지 확인합니다.
4. 약관, 푸터, 결제 안내, 문의 안내가 서로 다른 말을 하지 않는지 비교합니다.
5. 수정한 뒤 같은 주소로 다시 진단해 남은 항목을 확인합니다.

문구를 쉽게 바꾸는 방법
1. “문의하기” → “문의하기 · 평일 기준 1영업일 안에 답변드립니다”
2. “무료” → “무료 진단: 요약 결과까지 무료로 확인”
3. “서비스 신청” → “제공 범위 확인 후 신청하기”
4. “개인정보 동의” → “문의 답변을 위한 수집 목적과 보관 기간 확인”
5. “자세히 보기” → “결제 전 제공 범위와 문의 경로 확인”

독자가 계속 읽는 구성
좋은 유도 글은 처음부터 구매를 강요하지 않습니다. 먼저 독자가 겪는 불편을 보여 주고, 그다음 왜 문제가 되는지 설명하고, 중간에는 바로 확인할 체크리스트를 둡니다. 마지막에는 부담이 낮은 첫 행동을 제안해야 합니다. 무료 진단은 현재 상태를 확인하는 단계이고, 상세 리포트는 근거와 우선순위를 보는 단계이며, ${product}은 실제 수정과 반복 관리를 돕는 단계입니다.

검색에 잘 읽히게 정리하는 방법
제목에는 ${theme}처럼 고객이 실제로 찾는 말을 넣습니다. 본문 첫 문단에는 어떤 문제가 있고 무엇을 확인할 수 있는지 먼저 씁니다. 같은 단어를 억지로 반복하지 말고, 질문과 답변, 예시, 내부 링크를 자연스럽게 이어 주세요. 실제 독자도 제목에서 문제를 이해하고, 중간에서 해결 방법을 확인하고, 마지막에서 다음 행동을 선택합니다.

자주 묻는 질문
Q1. 이런 글이 꼭 판매 글이어야 하나요?
A. 아닙니다. 먼저 독자가 겪는 불안을 설명하고, 마지막에 자연스럽게 해결 방법을 제안하는 편이 더 오래 읽힙니다.

Q2. 무료 진단만으로 충분한가요?
A. 무료 진단은 현재 공백을 빠르게 보는 출발점입니다. 실제 반영 문구, 페이지별 우선순위, 재점검 기준이 필요하면 상세 리포트나 수정 문구안으로 이어가는 것이 좋습니다.

Q3. 글을 자주 발행하면 중복으로 보이지 않나요?
A. 같은 제품을 다루더라도 고객 질문, 사례, 체크리스트, FAQ, CTA 위치를 바꾸면 다른 목적의 글이 됩니다. 핵심은 제목만 바꾸는 것이 아니라 본문 구조와 독자 상황을 함께 바꾸는 것입니다.

다음에 할 일
이 글만으로 법률 판단이나 매출 상승을 단정할 수는 없습니다. 그래도 고객이 어디에서 멈추는지 확인하는 출발점으로는 충분합니다. 먼저 무료 진단으로 현재 사이트의 빠진 안내, 모호한 표현, 버튼 주변 불안 요소를 확인하세요. 결과를 저장하면 상세 리포트에서 페이지별 근거와 수정 우선순위를 보고, ${product}으로 실제 문구안과 반복 관리 흐름까지 이어갈 수 있습니다.`;
}

const FALLBACK_POSTS = [
  {
    id: 'fallback-cta-checkout-friction-4000',
    boardType: 'cta',
    type: 'cta',
    autoPublished: true,
    title: '결제 버튼 앞에서 고객이 멈추는 이유와 안내 정리법',
    primaryKeyword: '결제 전 안내',
    tags: ['결제전안내', '환불정책', '구매전환', '무료진단', '사이트점검'],
    body: buildFallbackBody('결제 전 안내와 환불 기준', '가격과 혜택은 잘 보이는데 제공 범위, 환불 가능 조건, 문의 경로가 버튼 가까이에 없다면 고객은 마지막 순간에 결정을 미룹니다.', 'Pro 리포트 또는 FixPack'),
    summary: '결제 전 안내를 중심으로 고객이 문의·구매 전에 느끼는 불안을 줄이는 방법을 정리했습니다.',
    visibility: 'public',
    createdAt: '2026-05-08T00:00:00+09:00'
  },
  {
    id: 'fallback-cta-privacy-form-4000',
    boardType: 'cta',
    type: 'cta',
    autoPublished: true,
    title: '문의폼 이탈을 줄이는 개인정보 안내와 응답 기준 정리',
    primaryKeyword: '개인정보 안내',
    tags: ['개인정보안내', '문의폼', '고객지원', '무료진단', '사이트점검'],
    body: buildFallbackBody('개인정보 안내와 문의 응답 기준', '문의폼은 짧아 보여도 고객에게는 개인정보를 맡기는 순간입니다. 수집 목적, 보관 기준, 답변 시간이 보이지 않으면 고객은 입력을 멈출 수 있습니다.', 'FixPack'),
    summary: '개인정보 입력 화면과 고객지원 응답 기준을 쉽게 정리하는 방법입니다.',
    visibility: 'public',
    createdAt: '2026-05-08T00:20:00+09:00'
  },
  {
    id: 'fallback-cta-mobile-readability-4000',
    boardType: 'case',
    type: 'cta',
    autoPublished: true,
    title: '모바일 화면에서 CTA와 안내 문구가 밀리지 않게 정리하는 법',
    primaryKeyword: '모바일 CTA 안내',
    tags: ['모바일가독성', 'CTA배치', '무료진단', '전환개선', '사이트점검'],
    body: buildFallbackBody('모바일 가독성과 버튼 주변 안내', 'PC에서는 정돈되어 보이는 카드와 안내문도 모바일에서는 줄바꿈과 여백 때문에 핵심 정보가 아래로 밀릴 수 있습니다.', 'Auto 정기 케어'),
    summary: '모바일 화면에서 고객이 버튼을 누르기 전에 필요한 안내를 바로 보이게 하는 방법입니다.',
    visibility: 'public',
    createdAt: '2026-05-08T00:40:00+09:00'
  },
  {
    id: 'fallback-cta-business-info-4000',
    boardType: 'case',
    type: 'cta',
    autoPublished: true,
    title: '푸터 사업자 정보와 문의 경로를 믿음직하게 정리하는 방법',
    primaryKeyword: '사업자 정보',
    tags: ['사업자정보', '고객지원', '푸터정리', '무료진단', '사이트점검'],
    body: buildFallbackBody('사업자 정보와 문의 경로', '푸터에 상호와 고객지원 메일만 있고 답변 기준이 없다면 고객은 문의해도 답이 올지 걱정하기 쉽습니다.', 'Pro 리포트'),
    summary: '푸터와 문의 버튼 주변에 고객이 확인하는 신뢰 정보를 배치하는 방법입니다.',
    visibility: 'public',
    createdAt: '2026-05-08T01:00:00+09:00'
  },
  {
    id: 'fallback-cta-ad-copy-4000',
    boardType: 'notice',
    type: 'cta',
    autoPublished: true,
    title: '광고 문구를 과장 없이 믿을 수 있게 바꾸는 방법',
    primaryKeyword: '광고 문구 점검',
    tags: ['광고문구', '랜딩페이지', '신뢰안내', '무료진단', '사이트점검'],
    body: buildFallbackBody('광고 문구와 랜딩페이지 신뢰 안내', '강한 표현은 클릭을 만들 수 있지만 근거와 조건 없이 위기감만 강조하면 고객은 오히려 불신할 수 있습니다.', 'FixPack 또는 Auto 정기 케어'),
    summary: '광고 문구와 랜딩페이지 안내를 독자가 이해하기 쉬운 구조로 정리하는 방법입니다.',
    visibility: 'public',
    createdAt: '2026-05-08T01:20:00+09:00'
  }
];
const FALLBACK_ACTIVITIES = FALLBACK_POSTS.slice(0, 3).map((item) => ({
  label: item.autoPublished ? '자동 발행' : '기본 콘텐츠',
  title: item.title,
  type: item.boardType,
  createdAt: item.createdAt
}));
const FALLBACK_STATS = { total: 5, cta: 2, notice: 1, case: 2, autoPublished: 5, recent7d: 5, filteredTotal: 5 };

function fallbackForFilter(value = 'all') {
  return FALLBACK_POSTS.filter((item) => value === 'all' || item.boardType === value);
}
function applyBoardFallback(reason = '') {
  posts = fallbackForFilter(filter);
  stats = { ...FALLBACK_STATS, filteredTotal: posts.length };
  activities = FALLBACK_ACTIVITIES;
  pagination = { page: 1, pageSize: 5, total: posts.length, totalPages: 1 };
  page = 1;
  render();
  if (state) state.textContent = `게시판 API 연결이 지연되어 4천자 내외 기본 포스팅 ${posts.length}건을 먼저 표시합니다. 자동 발행 기본 주기는 20분입니다.${reason ? ` (${reason})` : ''}`;
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
    const headingLike = /^(왜 이 글을 썼나요|한눈에 보는 핵심 요약|지금 보이는 문제|고객 입장에서 보면|실제로 확인할 요소|바로 고칠 수 있는 것|문구를 쉽게 바꾸는 방법|검색에 잘 읽히게 정리하는 방법|제목 후보|자주 묻는 질문|다음에 할 일|관련 링크|이 글에서 바로 얻을 수 있는 것|이런 경우 문제가 됩니다|고객은 이렇게 느낍니다|오늘 바로 확인할 체크리스트|문구를 이렇게 바꿔보세요|마무리|공지|사례|체크리스트|도입|이 글이 도움이 되는 경우|연관 예시|고객이 실제로 확인하는 포인트|바로 적용할 체크리스트|문구 예시|FAQ|자연스러운 CTA|문제 인식과 위기감|독자가 관심 있어 할 부분|독자가 계속 읽는 구성|독자가 관심 있어할 일반 주제|지금 놓치면 생길 수 있는 일|실제 적용 예시|마지막 섹션: 자연스러운 안내|추가 체크리스트|해시태그)[.!?。]?$/.test(first.trim());
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
  const autoCount = Number(stats.autoPublished || window.__NV0_BOARD_AUTO_COUNT__ || 0);
  const visiblePosts = posts.filter(item => postMatchesTopic(item, topic));
  const totalForFilter = Number(pagination.total || stats.filteredTotal || visiblePosts.length || 0);
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const currentCount = visiblePosts.length;
  const topicText = topic ? ` · 현재 페이지 주제 일치 ${currentCount}건` : '';
  state.textContent = `전체 ${Number(stats.total || totalForFilter).toLocaleString('ko-KR')}건 중 현재 ${currentCount.toLocaleString('ko-KR')}건 표시${topicText} · ${pagination.page}/${totalPages}페이지 · 필터 대상 ${totalForFilter.toLocaleString('ko-KR')}건 · 자동 발행 ${autoCount.toLocaleString('ko-KR')}건 · 20분 주기`;
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
    window.__NV0_BOARD_AUTO_COUNT__ = data.autoPublishedCount || data.stats?.autoPublished || 0;
    stats = { ...stats, ...(data.stats || {}), filteredTotal: data.pagination?.total ?? data.stats?.filteredTotal ?? 0 };
    activities = Array.isArray(data.activity) ? data.activity : [];
    posts = (data.posts || []).filter(item => item.visibility !== 'private');
    if (!posts.length) { applyBoardFallback('공개 게시글 없음'); return; }
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
