import { escapeHtml, formatWon, renderList } from '/shared/html.js';
const state = document.getElementById('plansState');
const cards = document.getElementById('planCards');
const timer=document.getElementById('promoTimer');let left=2*60*60;setInterval(()=>{if(!timer)return;left=Math.max(0,left-1);timer.textContent=`${String(Math.floor(left/3600)).padStart(2,'0')}:${String(Math.floor((left%3600)/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')} 남음`;},1000);
function getSavedScan() { try { return JSON.parse(localStorage.getItem('veridion:lastScan') || 'null'); } catch { return null; } }
function priceNote(plan){ if(!plan.monthlyPrice) return '무료'; if(plan.period === '월') return `월 기준 · 하루 약 ${formatWon(Math.ceil(plan.monthlyPrice/30))}원`; return `${plan.period || '1회'} 기준`; }
(async () => {
  try {
    const saved = getSavedScan(); const qs = new URLSearchParams(location.search);
    if (!qs.get('riskScore') && saved?.riskScore) qs.set('riskScore', String(saved.riskScore));
    if (!qs.get('siteId') && saved?.siteId) qs.set('siteId', saved.siteId);
    const res = await fetch(`/api/public/plans?${qs.toString()}`); const data = await res.json();
    const recommended = data.recommendedPlan; state.textContent = `현재 진단 기준 위험도 ${data.riskScore}점 · 추천 플랜 ${recommended}`;
    cards.innerHTML = (data.plans || []).map(plan => `<div class="card stack ${plan.recommended ? 'plan-highlight' : ''}">${plan.recommended ? '<span class="pill recommended-badge">추천</span>' : ''}<div class="meta-row"><h3>${escapeHtml(plan.title)}</h3><span class="pill gray">${escapeHtml(plan.period || '')}</span></div><div><div class="plan-price">${formatWon(plan.monthlyPrice)}원</div><div class="price-note">${priceNote(plan)}</div></div><div class="muted">${escapeHtml(plan.summary)}</div><ul class="result-list">${renderList(plan.features || [], '', (item) => `<li>${escapeHtml(item)}</li>`)}</ul><div class="topnav"><a class="${plan.code === 'Free' ? 'secondary' : 'primary'}" href="${plan.code === 'Free' ? '/products/veridion/demo' : `/checkout?plan=${encodeURIComponent(plan.code)}${(qs.get('siteId') || saved?.siteId) ? `&siteId=${encodeURIComponent(qs.get('siteId') || saved.siteId)}` : ''}`}">${plan.code === 'Free' ? '무료 진단으로 이동' : '이 상품으로 시작'}</a></div></div>`).join('');
  } catch (error) { state.textContent = `플랜 정보를 불러오지 못했습니다: ${error.message}`; cards.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>'; }
})();
