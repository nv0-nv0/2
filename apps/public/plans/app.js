import { escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('plansState');
const cards = document.getElementById('planCards');

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('veridion:lastScan') || 'null'); } catch { return null; }
}

(async () => {
  try {
    const saved = getSavedScan();
    const qs = new URLSearchParams();
    if (saved?.riskScore) qs.set('riskScore', String(saved.riskScore));
    if (saved?.siteId) qs.set('siteId', saved.siteId);
    const res = await fetch(`/api/public/plans?${qs.toString()}`);
    const data = await res.json();
    const recommended = data.recommendedPlan;
    state.textContent = `현재 기준 위험도 ${data.riskScore}점 · 추천 플랜 ${recommended}`;
    cards.innerHTML = (data.plans || []).map(plan => `
      <div class="card stack">
        <div class="meta-row"><h3>${escapeHtml(plan.title)}</h3>${plan.recommended ? '<span class="pill">추천</span>' : ''}</div>
        <div class="kpi">${formatWon(plan.monthlyPrice)}원</div>
        <div class="muted">${escapeHtml(plan.summary)}</div>
        <ul class="result-list">${renderList(plan.features || [], '', (item) => `<li>${escapeHtml(item)}</li>`)}</ul>
        <a class="topnav" href="/checkout?plan=${encodeURIComponent(plan.code)}${saved?.siteId ? `&siteId=${encodeURIComponent(saved.siteId)}` : ''}"><span class="topnav">이 플랜으로 진행</span></a>
      </div>
    `).join('');
  } catch (error) {
    state.textContent = `플랜 정보를 불러오지 못했습니다: ${error.message}`;
    cards.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>';
  }
})();
