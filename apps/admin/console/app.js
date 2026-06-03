import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeAttr, escapeHtml, renderList } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

function renderPipelineList(controlPlane = {}) {
  const items = Array.isArray(controlPlane.pipelines) ? controlPlane.pipelines : [];
  return renderList(items, '<div class="muted">등록된 파이프라인이 없습니다.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.label)}</strong><div class="muted">${escapeHtml(item.criticality)} · ${escapeHtml(item.status)} · ${escapeHtml(item.stageCount)}단계 · ${escapeHtml(item.agentCount)}개 에이전트</div></div>`);
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
  document.getElementById('controlPlaneState').textContent = `상태: ${controlPlane.runtime?.status || 'unknown'} · 레이어 ${controlPlane.structure?.layerCount ?? '-'}개 · 차단 ${controlPlane.runtime?.blockedPipelineCount ?? '-'}개 · 저하 ${controlPlane.runtime?.degradedPipelineCount ?? '-'}개`;
  document.getElementById('controlPipelineList').innerHTML = renderPipelineList(controlPlane);
  renderPipelineOptions(controlPlane);
}

async function refreshControlPlane() {
  const response = await adminFetch('/api/admin/system-control-plane');
  const data = await response.json();
  if (!data.controlPlane) throw new Error(data.error || '제어면 응답이 없습니다.');
  renderControlPlane(data.controlPlane);
  return data.controlPlane;
}

document.getElementById('controlEventForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const state = document.getElementById('controlEventState');
  state.textContent = '운영 이벤트를 저장하는 중입니다.';
  try {
    const response = await adminFetch('/api/admin/system-control-plane/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pipelineId: document.getElementById('controlPipelineId').value,
        status: document.getElementById('controlEventStatus').value,
        action: document.getElementById('controlEventAction').value,
        message: document.getElementById('controlEventMessage').value
      })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || '운영 이벤트 저장에 실패했습니다.');
    renderControlPlane(data.controlPlane);
    document.getElementById('controlEventMessage').value = '';
    state.textContent = '운영 이벤트를 저장했습니다.';
  } catch (error) {
    state.textContent = `운영 이벤트를 저장하지 못했습니다: ${error.message}`;
  }
});

(async()=>{
  try {
    const [statusRes, diagRes, controlPlane] = await Promise.all([
      adminFetch('/api/admin/status'),
      adminFetch('/api/admin/diagnostics'),
      refreshControlPlane()
    ]);
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
  } catch (error) {
    document.getElementById('consoleState').textContent = `관리자 콘솔을 불러오지 못했습니다: ${error.message}`;
    document.getElementById('recentScans').innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
    document.getElementById('controlPlaneState').textContent = `제어면을 불러오지 못했습니다: ${error.message}`;
  }
})();
