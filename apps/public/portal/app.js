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
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return raw;
  }
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
function riskFromScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return { label: '검사 대기', key: 'idle', className: '' };
  if (numeric >= 75) return { label: '높은 위험', key: 'danger', className: 'danger' };
  if (numeric >= 50) return { label: '주의 필요', key: 'warn', className: 'warn' };
  return { label: '안정권', key: 'success', className: 'success' };
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
  const score = Number(latest?.riskScore);
  const hasScore = Number.isFinite(score);
  const findings = latest ? findingCount(latest) : 0;
  const urgent = latest ? urgentCount(latest) : 0;
  const risk = riskFromScore(score);
  text('#portalTotalSites', `${sites.length}개`);
  text('#portalManagedSites', `${sites.length}개`);
  text('#portalRecentScans', `${scans.length}개`);
  text('#portalRecentScanCount', `${scans.length}개`);
  text('#portalIssueCount', `${findings}개`);
  text('#portalWarningIssues', `${Math.max(0, findings - urgent)}개`);
  text('#portalActionRequiredCount', `${urgent}개`);
  text('#portalCriticalIssues', `${urgent}개`);
  text('#portalSummaryDomain', latest?.target || sites[0]?.domain || '진단 전');
  text('#portalLatestScanAt', latest ? formatDate(latest.generatedAt || latest.createdAt || sites[0]?.lastScanAt) : '최근 진단 결과가 아직 없습니다.');
  const gauge = $('#portalRiskGauge');
  if (gauge) gauge.style.setProperty('--gauge', `${hasScore ? Math.max(0, Math.min(100, score)) * 3.6 : 0}deg`);
  text('.nv74-score-number', hasScore ? String(Math.round(score)) : '-');
  const pill = $('#portalRiskPill');
  if (pill) {
    pill.className = `v310-pill ${risk.className}`.trim();
    pill.textContent = risk.label;
  }
  text('#portalStatusSummary', latest ? `${latest.target || '최근 사이트'} 기준으로 보완 우선순위를 정리했습니다.` : '진단을 실행하면 점수와 보완 우선순위가 표시됩니다.');
  text('#portalStatusDetail', latest ? `발견 항목 ${findings}개, 우선 보완 ${urgent}개를 기준으로 다음 행동을 제안합니다.` : '로그인 후 사이트를 저장하면 반복 점검 이력을 이어서 관리할 수 있습니다.');
}
function renderSites(account = {}) {
  const sites = Array.isArray(account.savedSites) ? account.savedSites : [];
  if (!sites.length) {
    setHtml('#portalAssetList', '<div class="v310-empty"><strong>등록된 사이트가 아직 없습니다.</strong><p>새 사이트를 등록하거나 무료 진단을 실행하면 결과가 이곳에 표시됩니다.</p></div>');
    return;
  }
  const rows = sites.slice(0, 8).map((site) => {
    const score = Number.isFinite(Number(site.latestRiskScore)) ? `${Math.round(Number(site.latestRiskScore))}/100` : '-';
    const risk = riskFromScore(site.latestRiskScore);
    return `<div class="v310-row"><b>${escapeHtml(site.label || site.domain || '저장 사이트')}<small>${escapeHtml(site.domain || '')}</small></b><span>${escapeHtml(site.status || '저장됨')}</span><span>${escapeHtml(formatDate(site.lastScanAt))}</span><strong>${escapeHtml(score)}</strong><span><em class="v310-pill ${risk.className}">${escapeHtml(risk.label)}</em></span><span><a href="/products/veridion/demo?target=${encodeURIComponent(site.domain || '')}">진단</a><a href="/plans">리포트</a></span></div>`;
  }).join('');
  setHtml('#portalAssetList', `<div class="v310-table"><div class="v310-row v310-row-head"><span>사이트</span><span>상태</span><span>최근 진단</span><span>종합 점수</span><span>위험 수준</span><span>관리</span></div>${rows}</div>`);
}
function renderAccountState(accountResponse) {
  const authenticated = accountResponse?.ok === true;
  text('#portalConnectionState', authenticated ? '계정 연결됨' : '로그인 필요');
  text('#portalAccountState', authenticated ? '계정 연결됨' : '로그인 후 확인');
  text('#portalState', authenticated ? '저장 사이트와 최근 진단 이력을 불러왔습니다.' : '로그인하면 저장 사이트와 최근 진단 이력을 이어서 확인할 수 있습니다.');
}
function renderInsights(board = {}) {
  const posts = Array.isArray(board.posts) ? board.posts.slice(0, 3) : [];
  const cadence = board.publicationCadence || {};
  if (cadence.label) text('#portalPublishCadence', cadence.label);
  text('#portalPublishState', cadence.actualPublishing === false ? '확인 필요' : '20분 주기');
  text('#portalLastPublishedAt', cadence.lastPublishedAt ? formatDate(cadence.lastPublishedAt) : (cadence.label || '20분에 1회 발행'));
  if (!posts.length) return;
  setHtml('#portalFeed', posts.map((post) => `<article><span class="v310-pill">${escapeHtml(post.category || '인사이트')}</span><h3>${escapeHtml(post.title || '고객 신뢰 인사이트')}</h3><p>${escapeHtml(post.summary || '운영 기준에 맞춰 정리한 인사이트입니다.')}</p></article>`).join(''));
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
    if (!domain) {
      text('#saveSiteState', '저장할 사이트 주소를 입력하세요.');
      return;
    }
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
  text('#portalLastPublishedAt', '20분에 1회 발행');
});
