const $ = (selector) => document.querySelector(selector);
const text = (selector, value) => {
  const el = $(selector);
  if (el) el.textContent = value;
};
const setHtml = (selector, value) => {
  const el = $(selector);
  if (el) el.innerHTML = value;
};
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const normalizeUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin; } catch { return raw; }
};
const formatDate = (value) => {
  if (!value) return '진단 실행 후 표시';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '진단 실행 후 표시';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
async function requestJson(path, options = {}) {
  const res = await fetch(path, { cache: 'no-store', ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, status: res.status, data };
}
function healthFromScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return { label: '샘플 보기', className: 'success' };
  if (numeric >= 80) return { label: '양호', className: 'success' };
  if (numeric >= 60) return { label: '보통', className: 'warn' };
  return { label: '주의', className: 'danger' };
}
function findingCount(scan = {}) {
  if (Number.isFinite(Number(scan.totalFindings))) return Number(scan.totalFindings);
  if (Array.isArray(scan.detailFindings)) return scan.detailFindings.length;
  if (Array.isArray(scan.topFindings)) return scan.topFindings.length;
  return 0;
}
function urgentCount(scan = {}) {
  const items = [...(scan.detailFindings || []), ...(scan.topFindings || [])];
  return items.filter((item) => /critical|high|p0|p1|우선|중요|높음/i.test([item.severity, item.priority, item.title, item.category].join(' '))).length;
}
function renderSummary(account = {}) {
  const sites = Array.isArray(account.savedSites) ? account.savedSites : [];
  const scans = Array.isArray(account.recentScans) ? account.recentScans : [];
  const latest = scans[0] || null;
  const sampleMode = !latest;
  const score = Number(sampleMode ? 82 : latest?.riskScore);
  const hasScore = Number.isFinite(score);
  const findings = latest ? findingCount(latest) : 7;
  const urgent = latest ? urgentCount(latest) : 3;
  const health = healthFromScore(score);
  text('#portalTotalSites', `${sites.length}개`);
  text('#portalManagedSites', sampleMode ? '예시 1개' : `${sites.length}개`);
  text('#portalRecentScans', sampleMode ? '샘플' : `${scans.length}개`);
  text('#portalRecentScanCount', sampleMode ? '샘플' : `${scans.length}개`);
  text('#portalIssueCount', `${findings}개`);
  text('#portalWarningIssues', `${Math.max(0, findings - urgent)}개`);
  text('#portalActionRequiredCount', `${urgent}개`);
  text('#portalCriticalIssues', `${urgent}개`);
  text('#portalSummaryDomain', latest?.target || sites[0]?.domain || '샘플 사이트');
  text('#portalLatestScanAt', latest ? formatDate(latest.generatedAt || latest.createdAt || sites[0]?.lastScanAt) : '무료 진단 후 실제 이력으로 전환됩니다.');
  text('.vr-score-number', String(Math.round(score))); 
  const pill = $('#portalRiskPill');
  if (pill) {
    pill.className = `vr-chip ${health.className}`.trim();
    pill.textContent = health.label;
  }
  text('#portalStatusSummary', latest ? `${latest.target || '최근 사이트'} 기준으로 보완 우선순위를 정리했습니다.` : '샘플 리포트 기준으로 포털에서 확인할 수 있는 정보를 먼저 보여드립니다.');
  text('#portalStatusDetail', latest ? `발견 항목 ${findings}개, 우선 조치 ${urgent}개를 기준으로 다음 행동을 제안합니다.` : '무료 진단을 실행하면 샘플 수치가 실제 사이트 결과로 바뀝니다.');
}
function renderSites(account = {}) {
  const sites = Array.isArray(account.savedSites) ? account.savedSites : [];
  if (!sites.length) {
    setHtml('#portalAssetList', '<div class="vr-dark-table"><div class="vr-dark-row vr-dark-row-head"><span>사이트</span><span>URL</span><span>최근 진단일</span><span>종합 점수</span><span>상태</span><span>관리</span></div><div class="vr-dark-row"><b>샘플 쇼핑몰</b><span>https://example-store.kr</span><span>무료 진단 후 표시</span><strong>82/100</strong><span><em class="vr-chip success">샘플</em></span><span><a href="/products/veridion/demo">진단</a></span></div></div>');
    return;
  }
  const rows = sites.slice(0, 8).map((site) => {
    const score = Number.isFinite(Number(site.latestRiskScore)) ? `${Math.round(Number(site.latestRiskScore))}/100` : '-';
    const health = healthFromScore(site.latestRiskScore);
    return `<div class="vr-dark-row"><b>${escapeHtml(site.label || site.domain || '저장 사이트')}</b><span>${escapeHtml(site.domain || '')}</span><span>${escapeHtml(formatDate(site.lastScanAt))}</span><strong>${escapeHtml(score)}</strong><span><em class="vr-chip ${health.className}">${escapeHtml(health.label)}</em></span><span><a href="/products/veridion/demo?target=${encodeURIComponent(site.domain || '')}">진단</a></span></div>`;
  }).join('');
  setHtml('#portalAssetList', `<div class="vr-dark-table"><div class="vr-dark-row vr-dark-row-head"><span>사이트</span><span>URL</span><span>최근 진단일</span><span>종합 점수</span><span>상태</span><span>관리</span></div>${rows}</div>`);
}
function renderAccountState(accountResponse) {
  const authenticated = accountResponse?.ok === true;
  text('#portalConnectionState', authenticated ? '계정 연결됨' : '로그인 필요');
  text('#portalAccountState', authenticated ? '계정 연결됨' : '로그인');
  text('#portalState', authenticated ? '저장 사이트와 최근 진단 이력을 불러왔습니다.' : '로그인 전에도 샘플 리포트로 확인 가능한 정보와 유료 전환 흐름을 먼저 볼 수 있습니다.');
}
function renderInsights(board = {}) {
  const posts = Array.isArray(board.posts) ? board.posts.slice(0, 3) : [];
  const cadence = board.publicationCadence || {};
  text('#portalPublishCadence', '정기 업데이트');
  text('#portalPublishState', '정기 업데이트');
  text('#portalLastPublishedAt', cadence.lastPublishedAt ? formatDate(cadence.lastPublishedAt) : '정기 업데이트');
  if (!posts.length) return;
  setHtml('#portalFeed', posts.map((post) => `<article><span class="vr-chip">${escapeHtml(post.category || '인사이트')}</span><h3>${escapeHtml(post.title || '고객 신뢰 인사이트')}</h3><p>${escapeHtml(post.summary || '운영 기준에 맞춰 정리한 인사이트입니다.')}</p></article>`).join(''));
}
async function loadPortal() {
  const [account, board] = await Promise.allSettled([
    requestJson('/api/public/account'),
    requestJson('/api/public/board?page=1&pageSize=3')
  ]);
  const accountResult = account.status === 'fulfilled' ? account.value : { ok: false, data: {} };
  const boardResult = board.status === 'fulfilled' ? board.value : { ok: false, data: {} };
  const accountData = accountResult.ok ? accountResult.data : { savedSites: [], recentScans: [] };
  renderSummary(accountData);
  renderSites(accountData);
  renderAccountState(accountResult);
  if (boardResult.ok) renderInsights(boardResult.data);
}
function bindSiteForm() {
  const form = $('#saveSiteForm');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const domain = normalizeUrl($('#saveUrl')?.value);
    const label = String($('#saveName')?.value || '').trim();
    const memo = String($('#saveMemo')?.value || '').trim();
    if (!domain) { text('#saveSiteState', '저장할 사이트 주소를 입력하세요.'); return; }
    text('#saveSiteState', '사이트를 저장하는 중입니다.');
    const result = await requestJson('/api/public/account/sites', { method: 'POST', body: JSON.stringify({ domain, label, memo }) });
    if (!result.ok) {
      text('#saveSiteState', result.status === 401 ? '로그인 후 사이트를 저장할 수 있습니다.' : (result.data.error || '저장하지 못했습니다. 다시 시도하세요.'));
      return;
    }
    text('#saveSiteState', '사이트를 저장했습니다. 목록을 다시 불러옵니다.');
    await loadPortal();
  });
}
bindSiteForm();
loadPortal().catch(() => {
  renderSummary({ savedSites: [], recentScans: [] });
  renderSites({ savedSites: [] });
  renderAccountState({ ok: false });
  text('#portalLastPublishedAt', '정기 업데이트');
});
