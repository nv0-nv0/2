import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml, renderList } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

(async () => {
  try {
    const [statusRes, diagRes] = await Promise.all([
      adminFetch('/api/admin/status'),
      adminFetch('/api/admin/diagnostics')
    ]);
    const status = await statusRes.json();
    const diag = await diagRes.json();
    if (document.getElementById('sitesCount')) document.getElementById('sitesCount').textContent = status?.counts?.sites ?? 0;
    if (document.getElementById('scansCount')) document.getElementById('scansCount').textContent = status?.counts?.scans ?? 0;
    if (document.getElementById('highRiskCount')) document.getElementById('highRiskCount').textContent = status?.counts?.highRiskSites ?? 0;
    if (document.getElementById('subCount')) document.getElementById('subCount').textContent = status?.counts?.subscriptions ?? 0;
    if (document.getElementById('fixCount')) document.getElementById('fixCount').textContent = status?.counts?.pendingAutoFixJobs ?? 0;
    if (document.getElementById('legalCount')) document.getElementById('legalCount').textContent = status?.counts?.legalUpdates ?? 0;
    const scans = Array.isArray(diag?.recentScans) ? diag.recentScans : [];
    if (document.getElementById('recentScans')) document.getElementById('recentScans').innerHTML = renderList(scans, '<div class="muted">최근 스캔이 없습니다. 공개 무료 진단 또는 관리자 재스캔을 먼저 실행하세요.</div>', (item) => `<div class="result-card"><strong>${escapeHtml(item.target || 'URL 알 수 없음')}</strong><div class="muted">${escapeHtml(item.riskScore ?? '-')}점 · ${escapeHtml(item.riskLevel || '상태 미확인')}</div></div>`);
    if (document.getElementById('consoleState')) document.getElementById('consoleState').textContent = JSON.stringify(status, null, 2);
  } catch (error) {
    if (document.getElementById('consoleState')) document.getElementById('consoleState').textContent = `관리자 콘솔을 불러오지 못했습니다: ${error.message}`;
    if (document.getElementById('recentScans')) document.getElementById('recentScans').innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
  }
})();
