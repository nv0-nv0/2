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
  return `전문가 관점 요약
처음 방문한 고객은 상품 설명보다 먼저 “이 사이트에서 문의하거나 결제해도 되는가”를 판단합니다. ${theme}은 단순 안내문이 아니라 고객 행동 직전의 불확실성을 줄이는 전환 설계 요소입니다. 이 글은 ${problem} 같은 상황을 기준으로 운영자가 바로 확인할 수 있는 화면 위치, 문구 방향, 내부 링크 흐름을 전문가형 포스팅 구조로 정리합니다.

현장에서 자주 생기는 문제
${problem} 운영자는 정책 문서나 푸터에 이미 내용을 적어 두었다고 생각하지만, 고객은 결제 버튼, 문의 버튼, 회원가입 화면, 상담 신청 화면에서 바로 답을 찾습니다. 필요한 답이 고객 행동과 떨어져 있으면 상품력이 좋아도 마지막 단계에서 멈출 수 있습니다.

매출과 신뢰에 영향을 주는 이유
광고 유입이 많아질수록 안내 공백은 더 빠르게 비용으로 바뀝니다. 고객은 불편하다고 말하기보다 조용히 다른 선택지로 이동합니다. ${theme}을 버튼 주변에 배치하면 고객은 제공 범위, 문의 경로, 예외 조건, 처리 시간을 예측할 수 있습니다. 예측 가능성이 높아질수록 무료 진단에서 상세 리포트, FixPack, Auto 정기 케어로 이어지는 결과물 선택 흐름도 자연스러워집니다.

실무 적용 순서
1. 결제 버튼, 문의 버튼, 가격표, 회원가입 화면, 신청 완료 화면을 먼저 확인합니다.
2. 고객이 그 순간 궁금해할 질문 3개를 적습니다.
3. 푸터와 정책 문서에는 전체 기준을 두고, 행동 화면에는 요약 문장을 배치합니다.
4. 모바일 화면에서 문장과 버튼이 동시에 보이는지 확인합니다.
5. 수정 후 같은 URL로 재진단해 이전 상태와 달라진 항목을 비교합니다.

문구 개선 예시
1. 바꾸기 전: “문의하기”
   바꾼 뒤: “문의하기 · 평일 기준 1영업일 안에 답변합니다”
2. 바꾸기 전: “무료”
   바꾼 뒤: “무료 진단 · 요약 결과까지 바로 확인”
3. 바꾸기 전: “서비스 신청”
   바꾼 뒤: “제공 범위와 환불 기준 확인 후 신청하기”
4. 바꾸기 전: “자세히 보기”
   바꾼 뒤: “결제 전 제공 범위와 문의 경로 확인”
5. 바꾸기 전: “개인정보 동의”
   바꾼 뒤: “문의 답변을 위한 수집 목적과 보관 기간 확인”

검증 체크리스트
1. ${theme}이 버튼과 같은 화면 안에 있는지 확인합니다.
2. 약관, 푸터, 상세페이지, 결제 화면의 표현이 서로 충돌하지 않는지 봅니다.
3. 예외 조건이 작은 글씨나 접힌 영역에만 숨어 있지 않은지 확인합니다.
4. 모바일에서 링크와 버튼을 손쉽게 누를 수 있는지 확인합니다.
5. 수정 후 무료 진단 또는 내부 재진단으로 남은 공백을 비교합니다.

검색 유입을 고려한 구성
전문가처럼 보이는 게시글은 키워드만 반복하지 않습니다. 제목에는 고객이 실제로 찾는 표현을 넣고, 첫 문단에는 문제 상황과 해결 방향을 함께 제시합니다. 중간에는 체크리스트와 전후 문구 예시를 넣어 체류 시간을 확보하고, 마지막에는 무료 진단, 상품·요금, 내 사이트 관리처럼 행동 단계를 명확히 연결합니다.

자주 묻는 질문
Q1. 이런 글이 꼭 판매 글이어야 하나요?
A. 아닙니다. 먼저 문제를 정확히 설명하고, 마지막에 해결 흐름을 자연스럽게 안내하는 편이 더 전문적으로 보입니다.

Q2. 무료 진단만으로 충분한가요?
A. 무료 진단은 현재 공백을 빠르게 보는 출발점입니다. 실제 반영 문구, 페이지별 우선순위, 재점검 기준이 필요하면 ${product}으로 이어가는 것이 좋습니다.

Q3. 20분마다 발행하면 중복으로 보이지 않나요?
A. 제목만 바꾸면 중복처럼 보입니다. 그래서 주제, 고객 질문, 사례, 체크리스트, FAQ, CTA 위치를 함께 바꿔야 합니다.

자연스러운 다음 행동
이 글은 법률 판단이나 매출 상승을 보장하지 않습니다. 다만 고객이 어디에서 멈추는지 확인하고 판매 흐름을 정리하는 실무 기준으로 사용할 수 있습니다. 먼저 무료 진단으로 안내 공백을 확인하고, 결과를 저장한 뒤 상세 리포트에서 근거와 우선순위를 확인하세요. 문구 교체가 필요하면 FixPack, 반복 관리가 필요하면 Auto 정기 케어로 연결하면 됩니다. 자동 발행 주기는 기존 조건대로 20분 1회입니다.`;
}

const FALLBACK_POSTS = [
  {
    id: 'fallback-cta-checkout-friction-4000',
    boardType: 'cta',
    type: 'cta',
    autoPublished: true,
    title: '결제 버튼 앞에서 고객이 멈추는 이유와 전환 개선 구조',
    primaryKeyword: '결제 전 안내',
    tags: ['결제전안내', '환불정책', '구매전환', '무료진단', '사이트점검'],
    body: buildFallbackBody('결제 전 안내와 환불 기준', '가격과 혜택은 잘 보이는데 제공 범위, 환불 가능 조건, 문의 경로가 버튼 가까이에 없다면 고객은 마지막 순간에 결정을 미룹니다.', '상세 리포트 또는 FixPack'),
    summary: '결제 전 안내를 전문가형 문제 진단, 문구 예시, 검증 체크리스트로 정리했습니다.',
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
    summary: '개인정보 입력 화면과 고객지원 응답 기준을 전문가형 포스팅 구조로 정리했습니다.',
    visibility: 'public',
    createdAt: '2026-05-08T00:20:00+09:00'
  },
  {
    id: 'fallback-cta-mobile-readability-4000',
    boardType: 'case',
    type: 'cta',
    autoPublished: true,
    title: '모바일 화면에서 CTA와 정책 링크를 전문가처럼 배치하는 법',
    primaryKeyword: '모바일 CTA 안내',
    tags: ['모바일가독성', 'CTA배치', '무료진단', '전환개선', '사이트점검'],
    body: buildFallbackBody('모바일 가독성과 버튼 주변 안내', 'PC에서는 정돈되어 보이는 카드와 안내문도 모바일에서는 줄바꿈과 여백 때문에 핵심 정보가 아래로 밀릴 수 있습니다.', 'Auto 정기 케어'),
    summary: '모바일 화면에서 CTA와 정책 링크를 동시에 보이게 하는 실무 구조입니다.',
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
    body: buildFallbackBody('사업자 정보와 문의 경로', '푸터에 상호와 고객지원 메일만 있고 답변 기준이 없다면 고객은 문의해도 답이 올지 걱정하기 쉽습니다.', '상세 리포트'),
    summary: '푸터와 문의 버튼 주변에 신뢰 정보를 배치하는 전문가형 실무 가이드입니다.',
    visibility: 'public',
    createdAt: '2026-05-08T01:00:00+09:00'
  },
  {
    id: 'fallback-cta-ad-copy-4000',
    boardType: 'notice',
    type: 'cta',
    autoPublished: true,
    title: '광고 문구를 신뢰 잃지 않게 설계하는 전문가식 구조',
    primaryKeyword: '광고 문구 점검',
    tags: ['광고문구', '랜딩페이지', '신뢰안내', '무료진단', '사이트점검'],
    body: buildFallbackBody('광고 문구와 랜딩페이지 신뢰 안내', '강한 표현은 클릭을 만들 수 있지만 근거와 조건 없이 위기감만 강조하면 고객은 오히려 불신할 수 있습니다.', 'FixPack 또는 Auto 정기 케어'),
    summary: '광고 문구와 랜딩페이지 신뢰 안내를 전문가형 문제 제기 구조로 정리했습니다.',
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
  if (state) state.textContent = `게시판 API 연결이 지연되어 전문가형 기본 포스팅 ${posts.length}건을 먼저 표시합니다. 자동 발행 기본 주기는 20분입니다.${reason ? ` (${reason})` : ''}`;
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
    const headingLike = /^(전문가 관점 요약|현장에서 자주 생기는 문제|매출과 신뢰에 영향을 주는 이유|실무 적용 순서|문구 개선 예시|검증 체크리스트|검색 유입을 고려한 구성|제목 후보|자주 묻는 질문|자연스러운 다음 행동|관련 링크|왜 이 글을 썼나요|한눈에 보는 핵심 요약|지금 보이는 문제|고객 입장에서 보면|실제로 확인할 요소|바로 고칠 수 있는 것|문구를 쉽게 바꾸는 방법|검색에 잘 읽히게 정리하는 방법|다음에 할 일|이 글에서 바로 얻을 수 있는 것|이런 경우 문제가 됩니다|고객은 이렇게 느낍니다|오늘 바로 확인할 체크리스트|문구를 이렇게 바꿔보세요|마무리|공지|사례|체크리스트|도입|이 글이 도움이 되는 경우|연관 예시|고객이 실제로 확인하는 포인트|바로 적용할 체크리스트|문구 예시|FAQ|자연스러운 CTA|문제 인식과 위기감|독자가 관심 있어 할 부분|독자가 계속 읽는 구성|독자가 관심 있어할 일반 주제|지금 놓치면 생길 수 있는 일|실제 적용 예시|마지막 섹션: 자연스러운 안내|추가 체크리스트|해시태그)[.!?。]?$/.test(first.trim());
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
  list.innerHTML = renderList(visiblePosts, '<div class="empty-state stack"><strong>조건에 맞는 게시글이 없습니다.</strong><p>필터를 초기화하거나 무료 진단 후 새 글을 발행하세요.</p><a class="btn secondary" href="/board">필터 초기화</a><a class="btn secondary" href="/products/veridion/demo">무료 진단 시작</a></div>', item => `<article class="result-card stack board-post ${item.boardType === 'cta' || item.autoPublished ? 'cta' : ''}"><div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.boardType || item.type || 'post')}</span></div><div class="post-meta"><span>${item.autoPublished ? '자동 발행' : '운영 글'}</span><span>${escapeHtml(item.createdAt || '-')}</span><span>${escapeHtml(item.primaryKeyword || '고객 안내')}</span></div>${item.summary ? `<p class="post-summary">${escapeHtml(item.summary)}</p>` : ''}${renderPostBody(item.body || item.summary || '')}${renderPostTags(item.tags || [])}<div class="post-cta"><a class="btn primary" href="/products/veridion/demo">내 사이트도 무료 진단</a><a class="btn secondary" href="/plans">상품·요금</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div></article>`);
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
