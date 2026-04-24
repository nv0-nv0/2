import { escapeHtml, formatWon, renderList } from '/shared/html.js';
const state = document.getElementById('solutionState');
const grid = document.getElementById('offerGrid');
const groupLabel = { one_time: '1회성 상품', subscription: '구독형', annual: '연간 인증', b2b: 'B2B 확장' };
try {
  const res = await fetch('/api/public/products');
  const data = await res.json();
  const offers = data.offers || [];
  state.textContent = `상용화 우선 상품 ${offers.length}개 · 난이도 낮음~중하 · 결제 후 산출물 자동 생성 기준`;
  grid.innerHTML = offers.map(offer => `<article class="card stack ${offer.code === 'Pro' ? 'plan-highlight' : ''}">${offer.code === 'Pro' ? '<span class="pill recommended-badge">추천</span>' : ''}<div class="meta-row"><span class="pill ${offer.group === 'subscription' ? 'green' : offer.group === 'b2b' ? 'gold' : 'gray'}">${escapeHtml(groupLabel[offer.group] || offer.group)}</span><span class="muted">${escapeHtml(offer.difficulty)}</span></div><h3>${escapeHtml(offer.title)}</h3><div><div class="plan-price">${formatWon(offer.price)}원</div><div class="price-note">${escapeHtml(offer.period)} 기준 · ${offer.period === '월' ? `하루 약 ${formatWon(Math.ceil(offer.price/30))}원` : '즉시 구매형'}</div></div><p class="muted">${escapeHtml(offer.summary)}</p><div class="notice muted"><strong>대상:</strong> ${escapeHtml(offer.targetCustomer || '')}</div><strong>제공 산출물</strong><ul class="result-list">${renderList(offer.deliverables || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul><strong>운영 방식</strong><ul class="result-list">${renderList(offer.operations || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul><strong>확인 지표</strong><ul class="result-list">${renderList(offer.kpi || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul><a class="btn primary" href="/checkout?plan=${encodeURIComponent(offer.code)}">${escapeHtml(offer.cta)}</a></article>`).join('');
} catch (error) {
  state.textContent = `상품 구성을 불러오지 못했습니다: ${error.message}`;
  grid.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>';
}
