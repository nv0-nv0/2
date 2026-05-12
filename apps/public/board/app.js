import { escapeHtml, renderList } from '/shared/html.js';

const state = document.getElementById('boardState');
const list = document.getElementById('boardList');
const pager = document.getElementById('boardPagination');
const activity = document.getElementById('boardActivity');
const statNodes = Array.from(document.querySelectorAll('[data-board-stat]'));
const tabs = Array.from(document.querySelectorAll('[data-filter]'));
const topicButtons = Array.from(document.querySelectorAll('[data-topic]'));

let filter = new URLSearchParams(location.search).get('filter') || 'all';
let topic = new URLSearchParams(location.search).get('topic') || '';
let page = Number(new URLSearchParams(location.search).get('page') || 1) || 1;
let posts = [];
let stats = { total: 6, seo: 2, content: 2, technical: 1, recent7d: 6, filteredTotal: 6 };
let pagination = { page: 1, pageSize: 6, total: 6, totalPages: 1 };
let activities = [];

const fallbackPosts = [
  {
    id: 'column-content-structure',
    boardType: 'seo',
    title: '검색 노출을 높이는 콘텐츠 구조 설계 방법',
    primaryKeyword: '콘텐츠 구조 설계',
    createdAt: '2026-05-12',
    summary: '검색 의도 파악부터 제목, 본문, 내부 링크까지 검색 로봇과 독자가 함께 이해할 수 있는 구조를 정리합니다.',
    tags: ['검색의도', '콘텐츠구조', '내부링크'],
    body: '전문가 관점 요약\n콘텐츠는 많이 쓰는 것보다 읽히는 순서가 중요합니다. 검색 로봇은 제목, 소제목, 문단 흐름, 내부 링크를 통해 페이지 주제를 이해하고, 사람은 첫 화면에서 자신에게 필요한 답이 있는지 판단합니다.\n\n실무 적용 순서\n먼저 한 문장으로 페이지의 목적을 정합니다. 다음으로 검색 의도에 맞는 질문을 소제목으로 배치하고, 각 문단은 한 가지 답만 담도록 나눕니다. 마지막에는 관련 페이지와 다음 행동 버튼을 자연스럽게 연결합니다.\n\n검증 체크리스트\n제목에 핵심 주제가 포함되어 있는지, 소제목이 질문에 답하는 구조인지, 본문에 중복 표현이 많은지, 내부 링크가 다음 행동을 돕는지 확인합니다.'
  },
  {
    id: 'column-meta-title',
    boardType: 'seo',
    title: '제목과 메타 설명 최적화로 클릭률을 높이는 방법',
    primaryKeyword: '제목과 메타 설명',
    createdAt: '2026-05-12',
    summary: '검색 결과에서 사용자가 클릭해야 할 이유를 제목과 설명에 분명히 담는 방법을 정리합니다.',
    tags: ['온페이지', '클릭률', '검색결과'],
    body: '전문가 관점 요약\n제목과 메타 설명은 검색 결과에서 처음 만나는 영업 문장입니다. 과장된 표현보다 사용자가 얻을 수 있는 답을 구체적으로 보여주는 문장이 클릭률을 높입니다.\n\n문구 개선 예시\n“서비스 안내”보다 “검색 노출과 전환을 높이는 페이지 구조 진단”이 더 명확합니다. “자세히 보기”보다 “진단 결과 예시 확인하기”가 다음 행동을 더 잘 안내합니다.\n\n검증 체크리스트\n제목이 1개의 핵심 주제를 담고 있는지, 설명이 문제와 해결 방향을 함께 보여주는지, 같은 표현을 여러 페이지에서 반복하지 않는지 확인합니다.'
  },
  {
    id: 'column-eat-content',
    boardType: 'content',
    title: 'E-E-A-T를 반영한 신뢰도 높은 콘텐츠 작성법',
    primaryKeyword: '신뢰도 높은 콘텐츠',
    createdAt: '2026-05-12',
    summary: '경험, 전문성, 권위, 신뢰를 페이지 구조에 반영해 독자가 안심하고 읽을 수 있게 만드는 방법입니다.',
    tags: ['콘텐츠전략', '신뢰도', '전문성'],
    body: '전문가 관점 요약\n신뢰도는 화려한 문장보다 확인 가능한 근거에서 나옵니다. 누가 썼는지, 어떤 기준으로 판단했는지, 어떤 한계가 있는지를 명확히 보여주면 콘텐츠가 더 안정적으로 읽힙니다.\n\n실무 적용 순서\n작성자 또는 검토 기준을 밝히고, 주장에는 근거를 붙입니다. 확정할 수 없는 내용은 확인이 필요하다고 분리합니다. 독자가 다음에 무엇을 하면 되는지도 문장으로 안내합니다.\n\n검증 체크리스트\n작성 기준, 최신성, 출처, 한계, 다음 행동이 페이지 안에서 확인되는지 점검합니다.'
  },
  {
    id: 'column-robots-sitemap',
    boardType: 'technical',
    title: 'robots.txt와 sitemap.xml을 올바르게 설정하기',
    primaryKeyword: 'robots sitemap 설정',
    createdAt: '2026-05-12',
    summary: '검색 로봇이 중요한 페이지를 찾고 불필요한 차단을 피할 수 있게 기본 설정을 점검합니다.',
    tags: ['기술SEO', '색인', '크롤링'],
    body: '전문가 관점 요약\n검색 로봇이 페이지를 찾지 못하면 좋은 콘텐츠도 노출되기 어렵습니다. robots.txt는 접근 허용과 차단을 알려주고, sitemap.xml은 중요한 페이지 목록을 전달합니다.\n\n실무 적용 순서\n먼저 주요 페이지가 차단되어 있지 않은지 확인합니다. 다음으로 sitemap에 실제 공개 페이지가 들어 있는지 점검합니다. 오래된 URL이나 비공개 URL이 섞여 있다면 정리해야 합니다.\n\n검증 체크리스트\n홈, 서비스, 칼럼, 가이드, 요금제 페이지가 접근 가능한지 확인하고, 검색 결과에 보여야 할 페이지가 sitemap에 포함되어 있는지 확인합니다.'
  },
  {
    id: 'column-action-button',
    boardType: 'content',
    title: '전환을 만드는 다음 행동 버튼 배치와 문구 전략',
    primaryKeyword: '다음 행동 버튼',
    createdAt: '2026-05-12',
    summary: '사용자가 망설이지 않고 다음 단계로 이동하도록 버튼 위치와 문구를 자연스럽게 설계하는 방법입니다.',
    tags: ['전환개선', '버튼문구', '사용자흐름'],
    body: '전문가 관점 요약\n버튼은 단순한 장식이 아니라 사용자의 다음 결정을 돕는 안내판입니다. 버튼이 무엇을 의미하는지, 누르면 무엇이 이어지는지 분명해야 합니다.\n\n문구 개선 예시\n“확인”보다 “무료 진단 시작하기”가 구체적입니다. “문의”보다 “상담 내용 남기기 · 평일 기준 순차 확인”이 더 안심됩니다.\n\n검증 체크리스트\n버튼 주변에 제공 범위, 문의 경로, 결과 확인 방법이 있는지 확인합니다. 모바일에서 버튼과 안내 문구가 동시에 읽히는지도 확인합니다.'
  },
  {
    id: 'column-internal-link',
    boardType: 'seo',
    title: '내부 링크 최적화로 사이트 주제성을 강화하는 방법',
    primaryKeyword: '내부 링크 최적화',
    createdAt: '2026-05-12',
    summary: '관련 페이지를 자연스럽게 연결해 검색 로봇의 이해도와 사용자의 이동 흐름을 함께 개선합니다.',
    tags: ['내부링크', '사이트구조', '주제성'],
    body: '전문가 관점 요약\n내부 링크는 검색 로봇에게 사이트의 구조를 알려주고, 사용자에게 다음에 읽을 만한 내용을 안내합니다. 연결이 부족하면 좋은 글도 고립된 페이지가 됩니다.\n\n실무 적용 순서\n먼저 핵심 페이지를 정합니다. 그다음 관련 칼럼, 가이드, 요금제, 무료 진단 화면을 문맥에 맞게 연결합니다. 링크 문구는 “여기”보다 “요금제 비교 보기”처럼 목적이 드러나야 합니다.\n\n검증 체크리스트\n중요 페이지로 향하는 내부 링크가 충분한지, 링크 문구가 구체적인지, 관련성이 낮은 링크가 과도하지 않은지 확인합니다.'
  }
];

function typeLabel(type = '') {
  if (type === 'technical') return '기술 SEO';
  if (type === 'content') return '콘텐츠 전략';
  return 'SEO 전략';
}
function updateUrlState() {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (topic) params.set('topic', topic);
  if (page > 1) params.set('page', String(page));
  history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
}
function matchesTopic(item) {
  if (!topic) return true;
  const query = topic.toLowerCase();
  return [item.title, item.summary, item.body, item.primaryKeyword, ...(item.tags || [])].join(' ').toLowerCase().includes(query);
}
function normalizePost(item = {}) {
  const type = ['seo', 'content', 'technical'].includes(item.boardType) ? item.boardType : (item.boardType === 'case' ? 'content' : item.boardType === 'notice' ? 'technical' : 'seo');
  return {
    id: item.id || `post-${Math.random().toString(36).slice(2)}`,
    boardType: type,
    title: item.title || '전문가 칼럼',
    summary: item.summary || '',
    body: item.body || item.summary || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    primaryKeyword: item.primaryKeyword || '사이트 구조',
    createdAt: item.createdAt || ''
  };
}
function renderPostBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(v => v.trim()).filter(Boolean);
  if (!sections.length) return '';
  return `<div class="post-body">${sections.map(section => {
    const [first, ...rest] = section.split('\n');
    const isHeading = rest.length && first.length <= 30;
    return isHeading ? `<section class="post-section"><h3>${escapeHtml(first)}</h3><p>${escapeHtml(rest.join('\n')).replace(/\n/g, '<br/>')}</p></section>` : `<p class="post-paragraph">${escapeHtml(section).replace(/\n/g, '<br/>')}</p>`;
  }).join('')}</div>`;
}
function renderStats() {
  statNodes.forEach(node => {
    const key = node.dataset.boardStat;
    const value = key === 'cta' ? (stats.seo || 0) : Number(stats[key] ?? 0);
    node.textContent = Number.isFinite(value) ? value.toLocaleString('ko-KR') : '-';
  });
}
function renderActivity() {
  if (!activity) return;
  const items = activities.length ? activities : posts.slice(0, 3).map(item => ({ label: '칼럼 공개', title: item.title, type: typeLabel(item.boardType), createdAt: item.createdAt }));
  activity.innerHTML = items.map((item, index) => `<div class="activity-item"><span class="nv0-avatar">${index + 1}</span><div><strong>${escapeHtml(item.title || '전문가 칼럼')}</strong><div class="muted">${escapeHtml(item.type || '칼럼')} · ${escapeHtml(item.createdAt || '오늘')}</div></div></div>`).join('');
}
function renderPagination() {
  if (pager) pager.innerHTML = '';
}
function render() {
  tabs.forEach(btn => btn.classList.toggle('active', (btn.dataset.filter || 'all') === filter));
  topicButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.topic === topic));
  renderStats();
  renderActivity();
  const visible = posts.filter(item => (filter === 'all' || item.boardType === filter || (filter === 'cta' && item.boardType === 'seo')) && matchesTopic(item));
  if (state) state.textContent = `20분에 1회 공개 · 현재 ${visible.length.toLocaleString('ko-KR')}개 칼럼을 읽기 쉬운 구조로 표시합니다.`;
  if (list) {
    list.innerHTML = renderList(visible, '<div class="empty-state"><strong>조건에 맞는 칼럼이 없습니다.</strong><p>필터를 초기화해 주세요.</p></div>', item => `<article class="article-card board-post"><div class="pill ${item.boardType === 'technical' ? 'green' : item.boardType === 'content' ? 'purple' : 'brand'}">${escapeHtml(typeLabel(item.boardType))}</div><h3>${escapeHtml(item.title)}</h3><p class="post-summary">${escapeHtml(item.summary)}</p>${renderPostBody(item.body)}<div class="post-tags">${(item.tags || []).map(tag => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('')}</div><div class="post-cta"><a class="btn primary" href="/products/veridion/demo">내 사이트 무료 진단</a><a class="btn secondary" href="/guides">관련 가이드 보기</a></div></article>`);
  }
  renderPagination();
}
function applyFallback() {
  posts = fallbackPosts;
  stats = { total: posts.length, filteredTotal: posts.length, seo: posts.filter(p => p.boardType === 'seo').length, content: posts.filter(p => p.boardType === 'content').length, technical: posts.filter(p => p.boardType === 'technical').length, recent7d: posts.length };
  pagination = { page: 1, pageSize: posts.length, total: posts.length, totalPages: 1 };
  activities = [];
  render();
}
async function loadBoard() {
  applyFallback();
  try {
    const res = await fetch(`/api/public/board?page=${page}&pageSize=6&filter=all`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !Array.isArray(data.posts) || !data.posts.length) return;
    posts = data.posts.map(normalizePost);
    stats = { ...stats, ...(data.stats || {}) };
    activities = Array.isArray(data.activity) ? data.activity : [];
    pagination = data.pagination || pagination;
    render();
  } catch {
    render();
  }
}

tabs.forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter || 'all'; topic = ''; page = 1; updateUrlState(); render(); }));
topicButtons.forEach(btn => btn.addEventListener('click', () => { topic = btn.dataset.topic === topic ? '' : (btn.dataset.topic || ''); page = 1; updateUrlState(); render(); }));
loadBoard();
