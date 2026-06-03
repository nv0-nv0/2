import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeAttr, escapeHtml, renderList } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

function statusLabel(status = 'unknown') {
  return ({ healthy: '정상', recovered: '복구 확인', observing: '관측 중', degraded: '일부 저하', blocked: '차단', standby: '대기' })[status] || status;
}
function textList(items = [], fallback = '-') {
  return Array.isArray(items) && items.length ? items.map((item) => escapeHtml(item)).join(', ') : fallback;
}
function renderPipelineList(controlPlane = {}) {
  const items = Array.isArray(controlPlane.pipelines) ? controlPlane.pipelines : [];
  return renderList(items, '<div class="muted">등록된 파이프라인이 없습니다.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.label)}</strong><div class="muted">${escapeHtml(item.criticality)} · ${escapeHtml(statusLabel(item.status))} · ${escapeHtml(item.stageCount)}단계 · ${escapeHtml(item.agentCount)}개 에이전트</div><div class="muted">선행: ${textList(item.dependencies, '없음')} · fallback: ${escapeHtml(item.fallback || '-')}</div>${Array.isArray(item.blockedBy) && item.blockedBy.length ? `<div class="muted">차단 전파: ${textList(item.blockedBy)}</div>` : ''}</div>`);
}
function renderLayerList(controlPlane = {}) {
  const items = Array.isArray(controlPlane.layers) ? controlPlane.layers : [];
  return renderList(items, '<div class="muted">등록된 레이어가 없습니다.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.label)}</strong><div class="muted">${escapeHtml(statusLabel(item.status))} · 엔진 ${escapeHtml(item.engineCount)}개 · 에이전트 ${escapeHtml(item.agentCount)}개 · 파이프라인 ${escapeHtml(item.pipelineCount)}개</div><div class="muted">${escapeHtml(item.purpose || '')}</div></div>`);
}
function renderRecentControlEvents(controlPlane = {}) {
  const items = Array.isArray(controlPlane.recentEvents) ? controlPlane.recentEvents : [];
  return renderList(items.slice(0, 12), '<div class="muted">최근 운영 이벤트가 없습니다.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.pipelineId)}</strong><div class="muted">${escapeHtml(statusLabel(item.status))} · ${escapeHtml(item.action)} · ${escapeHtml(item.createdAt || '-')}</div><div>${escapeHtml(item.message || '')}</div></div>`);
}
function renderPipelineOptions(controlPlane = {}) {
  const select = document.getElementById('controlPipelineId');
  if (!select) return;
  const previous = select.value;
  const pipelines = Array.isArray(controlPlane.pipelines) ? controlPlane.pipelines : [];
  select.innerHTML = pipelines.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.label)} (${escapeHtml(item.criticality)})</option>`).join('');
  if (pipelines.some((item) => item.id === previous)) select.value = previous;
}
function renderControlPlane(controlPlane = {}) {
  document.getElementById('controlEngineCount').textContent = controlPlane.structure?.engineCount ?? '-';
  document.getElementById('controlAgentCount').textContent = controlPlane.structure?.agentCount ?? '-';
  document.getElementById('controlPipelineCount').textContent = controlPlane.structure?.pipelineCount ?? '-';
  document.getElementById('controlPlaneState').textContent = `상태: ${statusLabel(controlPlane.runtime?.status)} · 레이어 ${controlPlane.structure?.layerCount ?? '-'}개 · 의존성 ${controlPlane.structure?.dependencyCount ?? '-'}개 · 조치 필요 ${controlPlane.runtime?.actionRequiredCount ?? '-'}개`;
  document.getElementById('controlPipelineList').innerHTML = renderPipelineList(controlPlane);
  document.getElementById('controlLayerList').innerHTML = renderLayerList(controlPlane);
  document.getElementById('controlRecentEvents').innerHTML = renderRecentControlEvents(controlPlane);
  renderPipelineOptions(controlPlane);
}
async function refreshControlPlane({ silent = false } = {}) {
  const state = document.getElementById('controlRefreshState');
  if (!silent && state) state.textContent = '제어면 상태를 새로 불러오는 중입니다.';
  const response = await adminFetch('/api/admin/system-control-plane');
  const data = await response.json();
  if (!data.controlPlane) throw new Error(data.error || '제어면 응답이 없습니다.');
  renderControlPlane(data.controlPlane);
  if (!silent && state) state.textContent = `최근 갱신: ${data.controlPlane.checkedAt || '-'}`;
  return data.controlPlane;
}
async function runControlPlaneAudit() {
  const state = document.getElementById('controlAuditState');
  state.textContent = '제어면 구조 감사를 실행하는 중입니다.';
  try {
    const response = await adminFetch('/api/admin/system-control-plane/audit');
    const data = await response.json();
    if (!response.ok || !data.audit) throw new Error(data.error || '제어면 감사에 실패했습니다.');
    renderControlPlane(data.controlPlane);
    state.textContent = `감사 완료: ${data.audit.score}/${data.audit.total}점 · 실패 ${data.audit.failed.length}건`;
  } catch (error) {
    state.textContent = `제어면 감사를 완료하지 못했습니다: ${error.message}`;
  }
}

document.getElementById('controlRefreshBtn')?.addEventListener('click', () => refreshControlPlane().catch((error) => { document.getElementById('controlRefreshState').textContent = `새로고침 실패: ${error.message}`; }));
document.getElementById('controlAuditBtn')?.addEventListener('click', runControlPlaneAudit);
document.getElementById('controlEventForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const state = document.getElementById('controlEventState');
  state.textContent = '운영 이벤트를 저장하는 중입니다.';
  try {
    const response = await adminFetch('/api/admin/system-control-plane/events', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pipelineId: document.getElementById('controlPipelineId').value, status: document.getElementById('controlEventStatus').value, action: document.getElementById('controlEventAction').value, correlationId: document.getElementById('controlEventCorrelationId').value, message: document.getElementById('controlEventMessage').value })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || '운영 이벤트 저장에 실패했습니다.');
    renderControlPlane(data.controlPlane);
    document.getElementById('controlEventMessage').value = '';
    state.textContent = data.deduplicated ? '동일한 운영 이벤트가 이미 기록되어 중복 저장을 생략했습니다.' : '운영 이벤트를 저장했습니다.';
  } catch (error) {
    state.textContent = `운영 이벤트를 저장하지 못했습니다: ${error.message}`;
  }
});

(async()=>{
  try {
    const [statusRes, diagRes, controlPlane] = await Promise.all([adminFetch('/api/admin/status'), adminFetch('/api/admin/diagnostics'), refreshControlPlane()]);
    const status = await statusRes.json();
    const diag = await diagRes.json();
    document.getElementById('sitesCount').textContent = status.counts.sites;
    document.getElementById('scansCount').textContent = status.counts.scans;
    document.getElementById('highRiskCount').textContent = status.counts.highRiskSites;
    document.getElementById('subCount').textContent = status.counts.subscriptions;
    document.getElementById('fixCount').textContent = status.counts.pendingAutoFixJobs;
    document.getElementById('legalCount').textContent = status.counts.legalUpdates;
    document.getElementById('recentScans').innerHTML = renderList(diag.recentScans || [], '<div class="muted">최근 스캔이 없습니다. 공개 무료 진단 또는 관리자 재스캔을 먼저 실행하세요.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.target)}</strong><div class="muted">${escapeHtml(item.riskScore)}점 · ${escapeHtml(item.riskLevel)}</div></div>`);
    document.getElementById('consoleState').textContent = JSON.stringify({ ...status, systemControlPlane: { ok: controlPlane.ok, score: controlPlane.score, runtime: controlPlane.runtime, structure: controlPlane.structure } }, null, 2);
    setInterval(() => { if (!document.hidden) refreshControlPlane({ silent: true }).catch(() => {}); }, 30000);
  } catch (error) {
    document.getElementById('consoleState').textContent = `관리자 콘솔을 불러오지 못했습니다: ${error.message}`;
    document.getElementById('recentScans').innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
    document.getElementById('controlPlaneState').textContent = `제어면을 불러오지 못했습니다: ${error.message}`;
  }
})();
