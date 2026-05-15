import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml, renderList } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

(async()=>{
  try {
    const [statusRes, diagRes] = await Promise.all([
      adminFetch('/api/admin/status'),
      adminFetch('/api/admin/diagnostics')
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
    document.getElementById('consoleState').textContent = JSON.stringify(status, null, 2);
  } catch (error) {
    document.getElementById('consoleState').textContent = `관리자 콘솔을 불러오지 못했습니다: ${error.message}`;
    document.getElementById('recentScans').innerHTML = '<div class="muted">잠시 후 다시 시도하세요.</div>';
  }
})();
