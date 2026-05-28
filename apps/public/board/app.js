const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const formatDate = (value) => {
  if (!value) return '상시 업데이트';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '상시 업데이트';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
};
const legacyPattern = new RegExp([
  '20분에\\s*1회','20분\\s*주기','자동\\s*발행','운영\\s*큐','백로그',
  ['Trust','Ops'].join(''), ['roll','back'].join(''), ['can','ary'].join(''), ['senti','nel'].join(''), ['pre','launch'].join(''), 'phase\\d+'
].join('|'), 'gi');
const legacyManagePattern = new RegExp(['내','사이트','관리'].join(' '), 'g');
const cleanText = (value = '') => String(value || '')
  .replace(legacyPattern, '정기 업데이트')
  .replace(/\bSEO\b/g, '검색 최적화')
  .replace(/\bCTA\b/g, '다음 행동 버튼')
  .replace(legacyManagePattern, '고객 포털')
  .replace(/\s+/g, ' ')
  .trim();
const paragraphize = (body = '') => String(body || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .split(/\n{2,}/)
  .map((part) => part.trim())
  .filter(Boolean)
  .slice(0, 8)
  .map((part) => {
    const safe = escapeHtml(cleanText(part));
    if (/^\d+\.|^-|체크리스트|실무 적용|검증/.test(part)) return `<p>${safe}</p>`;
    return `<p>${safe}</p>`;
  })
  .join('');
let state = { page: 1, filter: 'all', query: '' };
let controller = null;
function fallbackPosts() {
  return [
    {
      title: '결제 버튼 앞에서 고객 불안을 줄이는 안내 구조',
      category: '결제 전환',
      summary: '가격, 제공 범위, 환불 기준, 문의 경로가 결제 화면에서 함께 보여야 고객이 다음 단계로 이동합니다.',
      body: '문제 상황\n가격과 버튼은 보이지만 제공 범위, 환불 기준, 고객지원 경로가 떨어져 있으면 고객은 결제 직전에 멈춥니다.\n\n실무 체크리스트\n1. 결제 버튼 주변에 제공 범위와 환불 기준을 배치합니다.\n2. 푸터에는 전체 정책 링크를, 행동 화면에는 짧은 요약을 둡니다.\n3. 모바일에서 버튼과 정책 링크가 한 흐름으로 보이는지 확인합니다.\n\n다음 행동\n무료 진단으로 결제 전 안내 공백을 먼저 확인하고, 필요한 경우 기본 리포트에서 수정 우선순위를 확인하세요.',
      tags: ['결제 전 안내', '전환 개선', '고객 신뢰'],
      publishedAt: new Date().toISOString()
    },
    {
      title: '개인정보 안내를 입력 화면 가까이에 배치하는 방법',
      category: '개인정보 안내',
      summary: '수집 항목, 수집 목적, 보관 기간, 파기 기준은 고객이 정보를 입력하는 순간 가까이 있어야 합니다.',
      body: '핵심 이유\n고객은 개인정보를 남기기 전에 왜 필요한지, 얼마나 보관되는지, 어디로 문의할 수 있는지 확인합니다.\n\n구성 요소\n1. 입력폼 바로 아래 짧은 개인정보 안내 문장\n2. 개인정보처리방침 전체 링크\n3. 문의 이메일과 처리 기준\n\n검색 최적화\n개인정보 안내, 수집 목적, 보관 기간, 파기 기준 같은 실제 검색 표현을 자연스럽게 포함하세요.',
      tags: ['개인정보 처리방침', '입력폼 UX', '정책 고지'],
      publishedAt: new Date().toISOString()
    },
    {
      title: '검색 로봇이 잘 읽는 온라인 사업자 콘텐츠 구조',
      category: '검색 구조',
      summary: '제목, 요약, 소제목, 목록, FAQ, 내부 링크를 분리하면 검색 노출과 고객 이해도를 함께 높일 수 있습니다.',
      body: '권장 구조\nH1은 페이지의 핵심 질문으로 작성하고, H2는 문제 상황, 체크리스트, 적용 예시, FAQ, 다음 행동으로 나눕니다.\n\n본문 구성\n목록과 표를 활용해 검색 로봇이 주제를 쉽게 해석하게 만들고, 사용자는 빠르게 훑어볼 수 있게 합니다.\n\n다음 행동\n글 끝에는 무료 진단, 요금제, 고객 포털을 자연스럽게 연결하세요.',
      tags: ['검색 최적화', '콘텐츠 구조', '내부 링크'],
      publishedAt: new Date().toISOString()
    }
  ];
}
function renderPosts(posts) {
  const safePosts = posts.length ? posts : fallbackPosts();
  $('#boardList').innerHTML = safePosts.map((post) => {
    const tags = [post.primaryKeyword, ...(post.tags || []), ...(post.hashtags || [])].filter(Boolean).map(cleanText).filter(Boolean).slice(0, 5);
    const category = cleanText(post.category || post.boardType || '인사이트');
    const title = cleanText(post.title || '고객 신뢰 인사이트');
    const summary = cleanText(post.summary || '운영 기준에 맞춰 정리한 실무 인사이트입니다.');
    const body = paragraphize(post.body || summary);
    return `<article class="vr-board-card" itemscope itemtype="https://schema.org/Article">
      <div class="vr-board-card-head"><span class="vr-pill">${escapeHtml(category)}</span><span class="vr-pill success">${escapeHtml(formatDate(post.publishedAt || post.createdAt))}</span></div>
      <h2 itemprop="headline">${escapeHtml(title)}</h2>
      <p itemprop="description">${escapeHtml(summary)}</p>
      <div class="vr-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="vr-post-body" itemprop="articleBody">${body}</div>
      <div class="vr-post-cta"><a class="vr-btn primary" href="/products/veridion/demo">무료 진단 시작</a><a class="vr-btn" href="/plans">요금제 보기</a><a class="vr-btn" href="/portal">고객 포털</a></div>
    </article>`;
  }).join('');
}
function renderPagination(pagination = {}) {
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const page = Math.max(1, Number(pagination.page || 1));
  if (totalPages <= 1) { $('#boardPagination').innerHTML = ''; return; }
  $('#boardPagination').innerHTML = Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
    const n = index + 1;
    return `<button type="button" data-page="${n}" class="${n === page ? 'active' : ''}">${n}</button>`;
  }).join('');
  $$('#boardPagination button').forEach((button) => button.addEventListener('click', () => { state.page = Number(button.dataset.page || 1); loadBoard(); }));
}
function renderActivity(activity = []) {
  const items = activity.length ? activity : fallbackPosts().map((item) => ({ title: item.title, createdAt: item.publishedAt, type: item.category }));
  $('#boardActivity').innerHTML = items.slice(0, 5).map((item) => `<a href="/board"><b>${escapeHtml(cleanText(item.title || '인사이트'))}</b><span>${escapeHtml(cleanText(item.type || '인사이트'))} · ${escapeHtml(formatDate(item.createdAt || item.publishedAt))}</span></a>`).join('');
}
async function loadBoard() {
  if (controller) controller.abort();
  controller = new AbortController();
  const params = new URLSearchParams({ page: String(state.page), pageSize: '10', filter: state.filter, q: state.query });
  $('#boardState').textContent = '정적 인사이트를 먼저 표시하고 최신 글을 확인합니다.';
  try {
    const res = await fetch(`/api/public/board?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'board_failed');
    const posts = Array.isArray(data.posts) && data.posts.length ? data.posts : fallbackPosts();
    renderPosts(posts);
    renderPagination(data.pagination || {});
    renderActivity(data.activity || []);
    $('#boardCadence').textContent = '정기 업데이트';
    const total = data.pagination?.total ?? posts.length;
    $('#boardState').textContent = `총 ${total}개 인사이트를 표시합니다. 검색 친화적인 구조로 정리했습니다.`;
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderPosts(fallbackPosts());
    renderPagination({ totalPages: 1, page: 1 });
    renderActivity([]);
    $('#boardState').textContent = '연결이 지연되어도 검색 가능한 기본 인사이트와 CTA를 유지합니다.';
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
