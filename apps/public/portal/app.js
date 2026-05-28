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
    pill.className = `v311-pill ${risk.className}`.trim();
    pill.textContent = risk.label;
  }
  text('#portalStatusSummary', latest ? `${latest.target || '최근 사이트'} 기준으로 보완 우선순위를 정리했습니다.` : '진단을 실행하면 점수와 보완 우선순위가 표시됩니다.');
  text('#portalStatusDetail', latest ? `발견 항목 ${findings}개, 우선 보완 ${urgent}개를 기준으로 다음 행동을 제안합니다.` : '로그인 후 사이트를 저장하면 반복 점검 이력을 이어서 관리할 수 있습니다.');
}
function renderSites(account = {}) {
  const sites = Array.isArray(account.savedSites) ? account.savedSites : [];
  if (!sites.length) {
    setHtml('#portalAssetList', '<div class="v311-empty"><strong>등록된 사이트가 아직 없습니다.</strong><p>새 사이트를 등록하거나 무료 진단을 실행하면 결과가 이곳에 표시됩니다.</p></div>');
    return;
  }
  const rows = sites.slice(0, 8).map((site) => {
    const score = Number.isFinite(Number(site.latestRiskScore)) ? `${Math.round(Number(site.latestRiskScore))}/100` : '-';
    const risk = riskFromScore(site.latestRiskScore);
    return `<div class="v311-row"><b>${escapeHtml(site.label || site.domain || '저장 사이트')}<small>${escapeHtml(site.domain || '')}</small></b><span>${escapeHtml(site.status || '저장됨')}</span><span>${escapeHtml(formatDate(site.lastScanAt))}</span><strong>${escapeHtml(score)}</strong><span><em class="v311-pill ${risk.className}">${escapeHtml(risk.label)}</em></span><span><a href="/products/veridion/demo?target=${encodeURIComponent(site.domain || '')}">진단</a><a href="/plans">리포트</a></span></div>`;
  }).join('');
  setHtml('#portalAssetList', `<div class="v311-table"><div class="v311-row v311-row-head"><span>사이트</span><span>상태</span><span>최근 진단</span><span>종합 점수</span><span>위험 수준</span><span>관리</span></div>${rows}</div>`);
}
function renderAccountState(accountResponse) {
  const authenticated = accountResponse?.ok === true;
  text('#portalConnectionState', authenticated ? '계정 연결됨' : '로그인 필요');
  text('#portalAccountState', authenticated ? '계정 연결됨' : '로그인 후 확인');
  text('#portalState', authenticated ? '저장 사이트와 최근 진단 이력을 불러왔습니다.' : '로그인하면 저장 사이트와 최근 진단 이력을 이어서 확인할 수 있습니다.');
}
function renderTrustOps(blueprint = {}) {
  const fixPack = blueprint.fixPack || {};
  const monitoring = blueprint.monitoring || {};
  const fixes = Array.isArray(fixPack.fixes) ? fixPack.fixes.slice(0, 5) : [];
  text('#portalFixCount', `${fixes.length || 5}개`);
  text('#portalBacklogCount', `${blueprint.improvementBacklogCount || 100}개`);
  text('#portalMonitoringCadence', monitoring.cadenceLabel || '매주');
  if (fixes.length) {
    setHtml('#portalFixPreview', fixes.slice(0, 4).map((fix, index) => `<article class="v311-action"><span class="v311-action-num">${index + 1}</span><b>${escapeHtml(fix.title || '개선 문구')}</b><span class="v311-pill warn">${escapeHtml(fix.placement || '삽입 위치')}</span></article>`).join(''));
  }
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}
function renderAutopilot(cockpit = {}) {
  const counts = cockpit.counts || {};
  const revenue = cockpit.revenue || {};
  const offer = cockpit.nextBestOffer || {};
  const queue = Array.isArray(cockpit.workQueue) ? cockpit.workQueue.slice(0, 4) : [];
  text('#portalAutopilotQueue', `${counts.queue || 0}개`);
  text('#portalAutopilotP0', `${counts.p0 || 0}개`);
  text('#portalAutopilotMrr', formatWon(revenue.monthlyRecurringRevenue || 0));
  text('#portalAutopilotOffer', offer.title || '기본 리포트');
  if (queue.length) {
    setHtml('#portalAutopilotQueueList', queue.map((item, index) => `<article class="v311-action"><span class="v311-action-num">${index + 1}</span><b>${escapeHtml(item.title || '운영 작업')}</b><span class="v311-pill ${item.priority === 'P0' ? 'danger' : item.priority === 'P1' ? 'warn' : 'success'}">${escapeHtml(item.priority || 'P2')}</span></article>`).join(''));
  }
}


function renderLaunchControl(launch = {}) {
  const readiness = launch.readiness || {};
  const experiments = Array.isArray(launch.experiments) ? launch.experiments : [];
  const playbooks = Array.isArray(launch.incidentPlaybooks) ? launch.incidentPlaybooks : [];
  const sequence = Array.isArray(launch.launchSequence) ? launch.launchSequence.slice(0, 4) : [];
  const decisionLabel = readiness.decision === 'go' ? '오픈 가능' : readiness.decision === 'limited_rollout' ? '제한 공개' : '보류';
  text('#portalLaunchDecision', decisionLabel);
  text('#portalLaunchScore', Number.isFinite(Number(readiness.score)) ? `${Math.round(Number(readiness.score))}점` : '-');
  text('#portalExperimentCount', `${experiments.length}개`);
  text('#portalPlaybookCount', `${playbooks.length}개`);
  if (sequence.length) {
    setHtml('#portalLaunchPlan', sequence.map((item, index) => `<article class="v311-action"><span class="v311-action-num">${index + 1}</span><b>${escapeHtml(item.label || item.name || '배포 단계')}</b><span class="v311-pill ${item.allowed ? 'success' : 'warn'}">${escapeHtml(item.traffic || '0%')}</span></article>`).join(''));
  }
}


function renderProductionSentinel(sentinel = {}) {
  const checks = sentinel.liveVerification?.checks || [];
  const rollback = Array.isArray(sentinel.rollbackMatrix) ? sentinel.rollbackMatrix : [];
  const stages = Array.isArray(sentinel.canaryStages) ? sentinel.canaryStages.slice(0, 4) : [];
  const decisionLabel = sentinel.decision === 'go' ? '배포 가능' : sentinel.decision === 'limited_rollout' ? '제한 공개' : '보류';
  text('#portalSentinelDecision', decisionLabel);
  text('#portalSentinelScore', Number.isFinite(Number(sentinel.score)) ? `${Math.round(Number(sentinel.score))}점` : '-');
  text('#portalLiveCheckCount', `${checks.length || 13}개`);
  text('#portalRollbackCount', `${rollback.length || 7}개`);
  if (stages.length) {
    setHtml('#portalSentinelPlan', stages.map((item, index) => `<article class="v311-action"><span class="v311-action-num">${index + 1}</span><b>${escapeHtml(item.label || item.name || '배포 단계')}</b><span class="v311-pill ${item.allowed ? 'success' : 'warn'}">${escapeHtml(item.traffic || '0%')}</span></article>`).join(''));
  }
}


function renderFinalHandoff(handoff = {}) {
  const summary = handoff.summary || {};
  const checklist = Array.isArray(handoff.acceptanceChecklist) ? handoff.acceptanceChecklist : [];
  const runbook = Array.isArray(handoff.operatorRunbook) ? handoff.operatorRunbook.slice(0, 4) : [];
  const decisionLabel = handoff.decision === 'go' ? '인수 가능' : handoff.decision === 'limited_rollout' ? '제한 인수' : '보류';
  text('#portalFinalDecision', decisionLabel);
  text('#portalFinalScore', Number.isFinite(Number(handoff.acceptanceScore)) ? `${Math.round(Number(handoff.acceptanceScore))}점` : '-');
  text('#portalFinalChecklistCount', `${checklist.length || 15}개`);
  text('#portalFinalBacklogCount', `${summary.phase321BacklogCount || 60}개`);
  if (runbook.length) {
    setHtml('#portalFinalPlan', runbook.map((item, index) => `<article class="v311-action"><span class="v311-action-num">${index + 1}</span><b>${escapeHtml(item.phase || item.id || '운영 단계')}</b><span class="v311-pill success">${escapeHtml(item.id || 'runbook')}</span></article>`).join(''));
  }
}

function renderInsights(board = {}) {
  const posts = Array.isArray(board.posts) ? board.posts.slice(0, 3) : [];
  const cadence = board.publicationCadence || {};
  if (cadence.label) text('#portalPublishCadence', cadence.label);
  text('#portalPublishState', cadence.actualPublishing === false ? '확인 필요' : '20분 주기');
  text('#portalLastPublishedAt', cadence.lastPublishedAt ? formatDate(cadence.lastPublishedAt) : (cadence.label || '20분에 1회 발행'));
  if (!posts.length) return;
  setHtml('#portalFeed', posts.map((post) => `<article><span class="v311-pill">${escapeHtml(post.category || '인사이트')}</span><h3>${escapeHtml(post.title || '고객 신뢰 인사이트')}</h3><p>${escapeHtml(post.summary || '운영 기준에 맞춰 정리한 인사이트입니다.')}</p></article>`).join(''));
}
async function loadPortal() {
  const [account, board, trustOps, autopilot, launchControl, productionSentinel, finalHandoff] = await Promise.allSettled([
    requestJson('/api/public/account'),
    requestJson('/api/public/board?page=1&pageSize=3'),
    requestJson('/api/public/trustops-blueprint'),
    requestJson('/api/public/trustops-autopilot'),
    requestJson('/api/public/trustops-launch-control'),
    requestJson('/api/public/trustops-production-sentinel'),
    requestJson('/api/public/trustops-final-handoff')
  ]);
  const accountResult = account.status === 'fulfilled' ? account.value : { ok: false, data: {} };
  const boardResult = board.status === 'fulfilled' ? board.value : { ok: false, data: {} };
  const trustOpsResult = trustOps.status === 'fulfilled' ? trustOps.value : { ok: false, data: {} };
  const autopilotResult = autopilot.status === 'fulfilled' ? autopilot.value : { ok: false, data: {} };
  const launchResult = launchControl.status === 'fulfilled' ? launchControl.value : { ok: false, data: {} };
  const sentinelResult = productionSentinel.status === 'fulfilled' ? productionSentinel.value : { ok: false, data: {} };
  const finalResult = finalHandoff.status === 'fulfilled' ? finalHandoff.value : { ok: false, data: {} };
  const accountData = accountResult.ok ? accountResult.data : { savedSites: [], recentScans: [] };
  renderSummary(accountData);
  renderSites(accountData);
  renderAccountState(accountResult);
  if (boardResult.ok) renderInsights(boardResult.data);
  if (trustOpsResult.ok) renderTrustOps(trustOpsResult.data.blueprint || {});
  if (autopilotResult.ok) renderAutopilot(autopilotResult.data.cockpit || {});
  if (launchResult.ok) renderLaunchControl(launchResult.data.launch || {});
  if (sentinelResult.ok) renderProductionSentinel(sentinelResult.data.sentinel || {});
  if (finalResult.ok) renderFinalHandoff(finalResult.data.handoff || {});
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
