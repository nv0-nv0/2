import { mountTurnstile } from '/shared/turnstile.js';
import { escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const guard = await mountTurnstile({ containerId: 'turnstileBox', tokenInputId: 'turnstileToken', noticeId: 'turnstileState' });

function saveScan(scan) { localStorage.setItem('veridion:lastScan', JSON.stringify(scan)); }
function setNextLinks(scan) {
  document.querySelectorAll('a[href="/plans"]').forEach(a => a.href = `/plans?siteId=${encodeURIComponent(scan.siteId)}&riskScore=${encodeURIComponent(scan.riskScore)}`);
  document.querySelectorAll('a[href="/checkout"]').forEach(a => a.href = `/checkout?siteId=${encodeURIComponent(scan.siteId)}&plan=${encodeURIComponent(scan.recommendedPlan)}`);
  document.querySelectorAll('a[href="/portal"]').forEach(a => a.href = `/portal?siteId=${encodeURIComponent(scan.siteId)}`);
}
function renderResult(scan) {
  const topFindings = (scan.topFindings || []).slice(0, 3);
  result.innerHTML = `
    <div class="result-card stack">
      <div class="meta-row"><strong>${escapeHtml(scan.target || '')}</strong><span class="pill">${escapeHtml(scan.riskLevel || '-')}</span></div>
      <div class="grid cols-2">
        <div><div class="muted">위험도</div><div class="kpi">${escapeHtml(scan.riskScore ?? '-')}</div></div>
        <div><div class="muted">예상 최대 과태료</div><div class="kpi">${formatWon(scan.estimatedMaxPenalty)}</div></div>
      </div>
      <div class="notice">무료 데모는 핵심 요약만 제공합니다. 전체 근거, 페이지별 조치안, 자동수정은 유료 플랜에서 해금됩니다.</div>
      <strong>상위 위험 3개</strong>
      <ul class="result-list">${renderList(topFindings, '<li>상위 위험 항목 없음</li>', item => `<li>${escapeHtml(item)}</li>`)}</ul>
      <p>추천 플랜: <strong>${escapeHtml(scan.recommendedPlan || '-')}</strong></p>
    </div>`;
}
async function runScan() {
  const target = document.getElementById('targetUrl').value.trim();
  if (!/^https?:\/\//.test(target)) { state.textContent = '유효한 URL을 입력하세요.'; return; }
  state.textContent = '스캔 요청 중...';
  result.textContent = '로딩 중';
  try {
    const res = await fetch('/api/public/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, turnstileToken: guard.getToken() }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'scan failed');
    saveScan(data.result || {}); setNextLinks(data.result || {});
    state.textContent = `스캔 완료 · ${data.result?.totalFindings || 0}개 항목 감지`;
    renderResult(data.result || {});
  } catch (err) {
    state.textContent = '실패: ' + err.message;
    result.textContent = '재시도 가능'; guard.reset?.();
  }
}
document.getElementById('scanBtn')?.addEventListener('click', runScan);
document.getElementById('retryBtn')?.addEventListener('click', runScan);
