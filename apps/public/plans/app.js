import { escapeAttr, escapeHtml, formatWon } from '/shared/html.js';

const planCards = document.getElementById('planCards');
const comparisonRows = document.getElementById('comparisonRows');
const state = document.getElementById('plansState');

const paymentFallback = {
  ok: false,
  paymentReady: false,
  provider: 'unknown',
  reason: '온라인 결제 환경을 확인하고 있습니다.'
};

function normalizeCode(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    free: 'Free',
    demo: 'Free',
    freedemo: 'Free',
    report: 'Report',
    detailedreport: 'Report',
    proreport: 'Report',
    pro: 'Report',
    basic: 'Report',
    fix: 'FixPack',
    fixpack: 'FixPack',
    copypack: 'FixPack',
    auto: 'Auto',
    autocare: 'Auto',
    agency: 'Auto',
    subscription: 'Auto'
  };
  return aliases[key] || String(value || 'Report');
}
function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
function priceLabel(plan) {
  const price = Number(plan.price || plan.monthlyPrice || 0);
  if (!price) return '무료';
  return `${formatWon(price)}원${plan.period ? ` / ${plan.period}` : ''}`;
}
function groupLabel(plan) {
  if (plan.code === 'Free') return '무료 확인';
  if (plan.code === 'Report') return '원인 정리';
  if (plan.code === 'FixPack') return '오늘 수정';
  if (plan.code === 'Auto') return '정기 케어';
  return plan.group === 'subscription' ? '정기 관리' : '1회 제공';
}
function ctaLabel(plan) {
  if (plan.code === 'Free') return '무료 진단 시작';
  if (plan.code === 'Report') return '상세 리포트 결제';
  if (plan.code === 'FixPack') return 'FixPack 바로 결제';
  if (plan.code === 'Auto') return 'Auto 정기 케어 결제';
  return '온라인 결제';
}
function checkoutHref(plan, siteId) {
  if (plan.code === 'Free') return '/products/veridion/demo';
  const params = new URLSearchParams({ plan: plan.code });
  if (siteId) params.set('siteId', siteId);
  return `/checkout?${params.toString()}`;
}
function planTone(code) {
  if (code === 'FixPack') return 'gold';
  if (code === 'Auto') return 'brand';
  if (code === 'Report') return 'green';
  return 'gray';
}
function paymentBadge(plan, paymentConfig) {
  if (plan.code === 'Free') return '<span class="pill gray">결제 없음</span>';
  return paymentConfig.paymentReady
    ? '<span class="pill green">온라인 결제 가능</span>'
    : '<span class="pill gold">결제 환경 확인 중</span>';
}
function strengthenSalesCopy(plan) {
  const override = {
    Free: {
      title: '무료 진단',
      summary: '고객이 결제 전 불안해할 수 있는 공개 항목을 무료로 확인합니다.',
      targetCustomer: '문제가 있는지 먼저 보고 싶은 분',
      deliverables: ['신뢰를 낮출 수 있는 요소 요약', '상위 개선 포인트 확인', '다음 상품 추천']
    },
    Report: {
      title: '상세 리포트',
      summary: '감으로 고치지 않도록 문제 위치, 이유, 우선순위를 근거와 함께 정리합니다.',
      targetCustomer: '대표님·팀·외주 담당자에게 설명할 자료가 필요한 분',
      deliverables: ['고객이 멈추는 위치', '문제 근거와 우선순위', '공유 가능한 개선 리포트']
    },
    FixPack: {
      title: 'FixPack',
      summary: '진단에서 끝내지 않고 사이트에 바로 넣을 수정 전/후 문장을 제공합니다.',
      targetCustomer: '오늘 바로 푸터·환불·문의·CTA 문구를 고치고 싶은 분',
      deliverables: ['수정 전/후 문장', '붙여넣을 위치 안내', '고객 불안을 줄이는 CTA 문구']
    },
    Auto: {
      title: 'Auto 정기 케어',
      summary: '광고·이벤트·상세페이지가 바뀔 때마다 생기는 안내 공백을 정기적으로 확인합니다.',
      targetCustomer: '랜딩페이지와 이벤트 페이지가 자주 바뀌는 팀',
      deliverables: ['정기 재진단', 'CTA 콘텐츠 흐름 관리', '위험 항목 우선 알림']
    }
  }[normalizeCode(plan.code)] || {};
  return { ...plan, ...override, code: normalizeCode(plan.code), deliverables: override.deliverables || list(plan.deliverables) };
}
function basePlans(offers) {
  const paid = list(offers).map(item => strengthenSalesCopy({ ...item, code: normalizeCode(item.code || item.planCode) }));
  const fallback = [
    { code: 'Report', title: '상세 리포트', price: 39000, period: '1회', group: 'one_time' },
    { code: 'FixPack', title: 'FixPack', price: 79000, period: '1회', group: 'one_time' },
    { code: 'Auto', title: 'Auto 정기 케어', price: 149000, period: '월', group: 'subscription' }
  ].map(strengthenSalesCopy);
  const free = strengthenSalesCopy({ code: 'Free', title: '무료 진단', price: 0, period: '무료' });
  const merged = ['Report', 'FixPack', 'Auto'].map(code => paid.find(item => item.code === code) || fallback.find(item => item.code === code));
  return [free, ...merged];
}
function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
function card(plan, recommended, siteId, paymentConfig) {
  const deliverables = list(plan.deliverables).slice(0, 3);
  const href = checkoutHref(plan, siteId);
  const microcopy = plan.code === 'Free'
    ? '결제 없이 바로 확인합니다.'
    : '기다림 없이 결제 화면에서 상품명, 금액, 받을 결과물을 다시 확인합니다.';
  return `<article class="clean-plan-card ${recommended ? 'recommended' : ''}" data-plan-code="${escapeAttr(plan.code)}" data-price="${escapeAttr(String(plan.price || 0))}" data-checkout-href="${escapeAttr(href)}">
    <div class="plan-card-top"><div><span class="pill ${planTone(plan.code)}">${escapeHtml(groupLabel(plan))}</span><h3>${escapeHtml(plan.title)}</h3></div><div class="plan-badges">${recommended ? '<span class="pill gold">추천</span>' : ''}${paymentBadge(plan, paymentConfig)}</div></div>
    <div><div class="plan-price">${priceLabel(plan)}</div><p class="plan-one-line">${escapeHtml(plan.summary)}</p></div>
    <div class="plan-fit"><b>이런 분께 추천</b><p>${escapeHtml(plan.targetCustomer || '구매 흐름을 더 탄탄하게 만들고 싶은 분')}</p><b>받는 것</b><ul class="plan-deliverables">${deliverables.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    <div class="payment-microcopy">${escapeHtml(microcopy)}</div>
    <div class="offer-actions"><a class="btn primary" href="${escapeAttr(href)}">${escapeHtml(ctaLabel(plan))}</a>${plan.code !== 'Free' ? '<a class="btn secondary" href="/products/veridion/demo">먼저 무료 진단</a>' : ''}</div>
  </article>`;
}
function comparison(plan, paymentConfig) {
  const rows = {
    Free: {
      when: '문제가 있는지 먼저 보고 싶을 때',
      get: '무료 요약 진단과 상위 개선 포인트',
      reason: '구매 전 부담 없이 판단할 수 있습니다.',
      action: '무료 진단 시작'
    },
    Report: {
      when: '대표님·팀에 설명할 근거가 필요할 때',
      get: '문제 위치, 원인, 우선순위가 담긴 리포트',
      reason: '무엇부터 고칠지 회의 없이 정리됩니다.',
      action: '상세 리포트 결제'
    },
    FixPack: {
      when: '오늘 바로 문구를 고쳐야 할 때',
      get: '수정 전/후 문장과 적용 위치',
      reason: '사이트에 바로 반영할 수 있습니다.',
      action: 'FixPack 바로 결제'
    },
    Auto: {
      when: '페이지가 계속 바뀌어 관리가 필요할 때',
      get: '정기 재진단과 CTA 흐름 관리',
      reason: '새로 생기는 안내 공백을 줄입니다.',
      action: 'Auto 정기 케어 결제'
    }
  }[plan.code] || {};
  return `<article class="decision-card" data-decision-plan="${escapeAttr(plan.code)}">
    <div class="decision-head"><span class="pill ${planTone(plan.code)}">${escapeHtml(groupLabel(plan))}</span><strong>${escapeHtml(plan.title)}</strong></div>
    <dl>
      <div><dt>이럴 때</dt><dd>${escapeHtml(rows.when || '상품 선택이 필요할 때')}</dd></div>
      <div><dt>받는 것</dt><dd>${escapeHtml(rows.get || '상황에 맞는 결과물')}</dd></div>
      <div><dt>구매 이유</dt><dd>${escapeHtml(rows.reason || '다음 행동이 명확해집니다.')}</dd></div>
    </dl>
    <a class="btn secondary" href="${escapeAttr(checkoutHref(plan, ''))}">${escapeHtml(rows.action || ctaLabel(plan))}</a>
  </article>`;
}
async function fetchPaymentConfig() {
  try {
    const res = await fetch('/api/public/payment/config');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data.error || '온라인 결제 상태를 확인하지 못했습니다.');
    return { ...paymentFallback, ...data };
  } catch (error) {
    return { ...paymentFallback, reason: error.message || paymentFallback.reason };
  }
}
async function fetchPlans(qs) {
  try {
    const [productsRes, plansRes] = await Promise.all([
      fetch(`/api/public/products?${qs.toString()}`),
      fetch(`/api/public/plans?${qs.toString()}`)
    ]);
    const products = await productsRes.json().catch(() => ({}));
    const plans = await plansRes.json().catch(() => ({}));
    return {
      offers: plans.smartOffers || products.offers || [],
      recommended: normalizeCode(plans.recommendedPlan || products.intelligence?.recommendedPlan || qs.get('recommended') || 'FixPack')
    };
  } catch {
    return { offers: [], recommended: 'FixPack' };
  }
}

(async () => {
  const paymentConfig = await fetchPaymentConfig();
  const saved = getSavedScan();
  const qs = new URLSearchParams(location.search);
  const siteId = qs.get('siteId') || saved?.siteId || '';
  const riskScore = Number(qs.get('riskScore') || saved?.riskScore || 0);
  const fetched = await fetchPlans(qs);
  const allPlans = basePlans(fetched.offers);
  const recommendedCode = ['Report', 'FixPack', 'Auto'].includes(fetched.recommended) ? fetched.recommended : 'FixPack';
  const recommendedPlan = allPlans.find(item => item.code === recommendedCode) || allPlans.find(item => item.code === 'FixPack');
  if (state) {
    const readiness = paymentConfig.paymentReady ? '온라인 결제 가능' : '온라인 결제 환경 확인 중';
    state.textContent = `무료 확인부터 바로 수정까지 ${allPlans.length}가지 선택지를 정리했습니다${riskScore ? ` · 최근 진단 점수 ${riskScore}점 반영` : ''}. ${readiness}`;
  }
  if (planCards) planCards.innerHTML = allPlans.map(item => card(item, item.code === recommendedPlan.code, siteId, paymentConfig)).join('');
  if (comparisonRows) comparisonRows.innerHTML = allPlans.map(item => comparison(item, paymentConfig)).join('');
})();
