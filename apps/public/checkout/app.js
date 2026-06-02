import { escapeAttr, escapeHtml, formatWon, safeUrl } from '/shared/html.js';
import { buildCommercialOfferCatalog as buildStaticCommercialOfferCatalog, normalizePlanCode as normalizeCatalogPlanCode } from '/shared/product-catalog.mjs';

const state = document.getElementById('checkoutState');
const targetBox = document.getElementById('checkoutTarget');
const summary = document.getElementById('orderSummary');
const planInput = document.getElementById('plan');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutForm = document.getElementById('checkoutForm');
const completeBtn = document.getElementById('completeBtn');
const paymentConfigState = document.getElementById('paymentConfigState');
const targetInput = document.getElementById('targetDomain');

const summaryPlanName = document.getElementById('summaryPlanName');
const summaryPlanPeriod = document.getElementById('summaryPlanPeriod');
const summaryBasePrice = document.getElementById('summaryBasePrice');
const summaryDelivery = document.getElementById('summaryDelivery');
const summaryTargetCustomer = document.getElementById('summaryTargetCustomer');
const summaryTotal = document.getElementById('summaryTotal');

let currentOrder = null;
let currentPaymentSession = null;
let isCreatingSession = false;
let isCompletingPayment = false;
let offerMap = new Map();
let paymentConfig = { ok: false, provider: 'unknown', paymentReady: false, reason: '온라인 결제 가능 상태를 확인하고 있습니다.' };
// Checkout compatibility tokens: 결제창 로드 확인 중, PortOne으로 바로 결제, providerPaymentId: responsePaymentId, 선택한 상품코드를 확인하지 못했습니다

const fallbackOffers = buildStaticCommercialOfferCatalog();
offerMap = new Map(fallbackOffers.map(item => [item.code, item]));

function normalizePlanCode(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = { report: 'Report', detailedreport: 'Report', proreport: 'Report', pro: 'Report', basic: 'Report', fixpack: 'FixPack', fix: 'FixPack', copypack: 'FixPack', templatepack: 'FixPack', industryguide: 'FixPack', monitoring: 'Monitoring', monitor: 'Monitoring', auto: 'Monitoring', subscription: 'Monitoring', expert: 'Expert', expertreport: 'Expert', professional: 'Expert', agency: 'Agency', whitelabel: 'Agency', b2b: 'Agency' };
  return normalizeCatalogPlanCode(aliases[key] || value || 'Report');
}
function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
function requiredConsentReady() {
  return ['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].every(id => !!document.getElementById(id)?.checked);
}
function setCheckoutState(message, mode = 'muted') {
  if (!state) return;
  state.className = `notice ${mode}`.trim();
  state.textContent = message;
}
function providerLabel(provider) {
  if (provider === 'portone_v2') return '온라인 안전결제';
  if (provider === 'external_http') return '온라인 결제';
  if (provider === 'demo') return '온라인 주문';
  return provider || '결제 상태 확인 중';
}
function priceLabel(offer) {
  if (!offer) return '-';
  return `${formatWon(Number(offer.price || offer.monthlyPrice || 0))}원${offer.period ? ` / ${offer.period}` : ''}`;
}
function currentOffer() {
  return offerMap.get(normalizePlanCode(planInput?.value || 'Report')) || null;
}
function renderPaymentConfig() {
  if (!paymentConfigState) return;
  const ready = paymentConfig.paymentReady === true;
  const provider = providerLabel(paymentConfig.provider);
  paymentConfigState.className = `payment-config-state ${ready ? 'is-ready' : 'is-warning'}`;
  paymentConfigState.textContent = ready
    ? `${provider} 가능 · 상품과 금액을 확인한 뒤 바로 결제합니다.`
    : `온라인 결제 환경을 확인하고 있습니다. ${paymentConfig.reason || '결제 설정 확인이 필요합니다.'}`;
}
function isPaymentProviderReady() {
  if (paymentConfig.paymentReady !== true) return false;
  if (paymentConfig.provider === 'portone_v2' && !window.PortOne?.requestPayment) return false;
  return true;
}
function paymentBlockReason() {
  if (paymentConfig.paymentReady !== true) return paymentConfig.reason || '온라인 결제 환경을 확인해야 합니다.';
  if (paymentConfig.provider === 'portone_v2' && !window.PortOne?.requestPayment) return '결제창을 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  return '';
}
function renderPriceSummary() {
  const code = normalizePlanCode(planInput?.value || 'Report');
  if (planInput && planInput.value !== code) planInput.value = code;
  const offer = currentOffer();
  if (!offer) {
    summaryPlanName.textContent = '선택한 상품 정보를 확인하는 중입니다.';
    summaryPlanPeriod.textContent = '선택 상품에 맞춰 요약을 준비합니다.';
    summaryBasePrice.textContent = '-';
    summaryDelivery.textContent = '고객 포털에서 확인';
    summaryTargetCustomer.textContent = '추천 대상 확인';
    summaryTotal.textContent = '-';
    return;
  }
  summaryPlanName.textContent = offer.title || code;
  summaryPlanPeriod.textContent = offer.summary || `${offer.period || '1회'} 제공 상품`;
  summaryBasePrice.textContent = priceLabel(offer);
  summaryDelivery.textContent = '결제 후 고객 포털에서 결과물 확인';
  summaryTargetCustomer.textContent = offer.targetCustomer || '사이트 구매 흐름을 더 탄탄하게 만들고 싶은 분';
  summaryTotal.textContent = priceLabel(offer);
  renderPaymentConfig();
}
function updateCheckoutButtonState() {
  if (!checkoutBtn) return;
  const email = document.getElementById('buyerEmail')?.value.trim() || '';
  const targetReady = !!(prefill.siteId || targetInput?.value.trim());
  const formReady = requiredConsentReady() && isValidEmail(email) && targetReady;
  const providerReady = isPaymentProviderReady();
  const ready = formReady && providerReady;
  checkoutBtn.disabled = !ready || isCreatingSession;
  checkoutBtn.setAttribute('aria-disabled', String(checkoutBtn.disabled));
  if (!formReady) checkoutBtn.textContent = '사이트·이메일·필수 동의 확인';
  else if (!providerReady) checkoutBtn.textContent = paymentConfig.provider === 'portone_v2' ? '결제창 준비 중' : '온라인 결제 준비 중';
  else checkoutBtn.textContent = '바로 결제';
}
function getPrefill() {
  const url = new URL(location.href);
  const saved = getSavedScan();
  return {
    siteId: url.searchParams.get('siteId') || saved?.siteId || '',
    plan: normalizePlanCode(url.searchParams.get('plan') || saved?.recommendedPlan || 'Report'),
    domain: url.searchParams.get('domain') || saved?.target || ''
  };
}
const prefill = getPrefill();
if (prefill.plan && planInput) planInput.value = normalizePlanCode(prefill.plan);
if (targetInput && prefill.domain) targetInput.value = prefill.domain;
if (targetBox) targetBox.textContent = prefill.domain ? `진단 대상 사이트: ${prefill.domain}` : '유료 산출물은 대상 사이트 URL이 확정되어야 결제할 수 있습니다.';

function renderOrder(order, paymentSession) {
  currentOrder = order;
  currentPaymentSession = paymentSession;
  const redirectUrl = safeUrl(paymentSession?.redirectUrl || '');
  const provider = paymentSession?.provider || 'demo';
  const paymentHint = provider === 'portone_v2'
    ? '<div class="notice muted">결제 완료 후 고객 포털에서 결과물과 확인 기록을 확인합니다.</div>'
    : '<div class="notice muted">결제 완료 후 고객 포털에서 결과물과 확인 기록을 확인합니다.</div>'; 
  summary.innerHTML = `
    <div class="result-card stack checkout-order-card">
      <strong>주문번호 ${escapeHtml(order.id)}</strong>
      <div class="muted">${escapeHtml(order.plan)} · ${formatWon(order.amount)}원 · ${escapeHtml(order.status)}</div>
      <div>대상 사이트: ${escapeHtml(order.domain || order.siteId || '미연결')}</div>
      <div>결제 방식: ${escapeHtml(providerLabel(provider))}</div>
      <div>결제 완료 후 고객 포털에서 결과물과 확인 기록을 확인합니다.</div>
      <div class="vr-gate-strip"><span>확인 기준</span><span>제공 기준</span><span>다시 확인</span></div>
      ${paymentHint}
      ${redirectUrl ? `<a href="${escapeAttr(redirectUrl)}" target="_blank" rel="noreferrer">결제 완료 후 이동 페이지</a>` : ''}
    </div>`;
  if (completeBtn) completeBtn.textContent = '결제 완료 확인';
}
async function launchPaymentWindow(paymentSession) {
  if (!window.PortOne?.requestPayment) throw new Error('결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  if (!paymentSession?.paymentRequest?.paymentId || !paymentSession?.paymentRequest?.totalAmount) throw new Error('결제 요청 정보가 완성되지 않았습니다.');
  const response = await window.PortOne.requestPayment(paymentSession.paymentRequest);
  if (response?.code !== undefined) throw new Error(response.message || '결제 요청이 실패했습니다.');
  return response;
}
async function createSession() {
  if (isCreatingSession) return;
  const payload = {
    buyerEmail: document.getElementById('buyerEmail')?.value.trim() || '',
    siteId: prefill.siteId,
    domain: targetInput?.value.trim() || prefill.domain,
    plan: normalizePlanCode(planInput?.value || 'Report'),
    privacyConsent: !!document.getElementById('privacyConsent')?.checked,
    termsConsent: !!document.getElementById('termsConsent')?.checked,
    refundConsent: !!document.getElementById('refundConsent')?.checked,
    deliveryConsent: !!document.getElementById('deliveryConsent')?.checked
  };
  if (!payload.siteId && !payload.domain) {
    setCheckoutState('유료 리포트의 대상 사이트 URL을 입력해 주세요. 대상이 확정되지 않은 결제는 진행하지 않습니다.', 'warn');
    updateCheckoutButtonState();
    return;
  }
  if (!isValidEmail(payload.buyerEmail)) {
    setCheckoutState('결제 연락처 이메일을 정확히 입력해 주세요. 결과물은 고객 포털에 저장됩니다.', 'warn');
    updateCheckoutButtonState();
    return;
  }
  if (!payload.privacyConsent || !payload.termsConsent || !payload.refundConsent || !payload.deliveryConsent) {
    setCheckoutState('결제를 진행하려면 필수 약관과 디지털 산출물 제공 고지에 동의해 주세요.', 'warn');
    updateCheckoutButtonState();
    return;
  }
  if (!isPaymentProviderReady()) {
    setCheckoutState(paymentBlockReason(), 'warn');
    updateCheckoutButtonState();
    return;
  }
  const offer = offerMap.get(payload.plan);
  if (!offer) {
    setCheckoutState('선택한 상품을 확인하지 못했습니다. 플랜을 다시 선택해 주세요.', 'warn');
    return;
  }
  isCreatingSession = true;
  updateCheckoutButtonState();
  setCheckoutState('주문 정보를 확인하고 외부 결제창을 준비하고 있습니다.');
  let data;
  try {
    const res = await fetch('/api/public/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '주문 정보를 확인하지 못했습니다.');
  } catch (error) {
    setCheckoutState(error.message || '주문 정보를 확인하지 못했습니다.', 'warn');
    isCreatingSession = false;
    updateCheckoutButtonState();
    return;
  }
  renderOrder(data.order, data.paymentSession);
  isCreatingSession = false;
  updateCheckoutButtonState();
  if (data.providerMode === 'external_http' && data.paymentSession?.redirectUrl) {
    state.textContent = '주문 정보를 확인했습니다. 결제창으로 이동합니다.';
    const redirect = safeUrl(data.paymentSession.redirectUrl);
    if (!redirect) { setCheckoutState('외부 결제 URL 형식이 올바르지 않습니다.', 'warn'); return; }
    location.assign(redirect);
    return;
  }
  if (data.providerMode === 'portone_v2') {
    setCheckoutState('주문 정보가 확인되었습니다. 결제창을 시작합니다.');
    try {
      const paymentResponse = await launchPaymentWindow(data.paymentSession);
      const responsePaymentId = paymentResponse?.paymentId || paymentResponse?.txId || data.paymentSession?.providerPaymentId;
      if (responsePaymentId) currentPaymentSession = { ...data.paymentSession, providerPaymentId: responsePaymentId };
      setCheckoutState('결제창 응답을 받았습니다. 결제 완료 여부를 확인합니다.');
      await completePayment();
    } catch (error) {
      setCheckoutState(error.message || '결제창을 시작하지 못했습니다.', 'warn');
    }
    return;
  }
  setCheckoutState(data.providerMode === 'demo' ? '주문 정보가 생성되었습니다. 결제 확인 후 고객 포털에서 리포트를 확인할 수 있습니다.' : '주문 정보를 확인했습니다. 결제창으로 이동합니다.');
}
async function completePayment() {
  if (isCompletingPayment) return;
  if (!currentOrder?.id) {
    setCheckoutState('먼저 결제 신청을 진행해 주세요.', 'warn');
    return;
  }
  isCompletingPayment = true;
  completeBtn?.setAttribute('disabled', 'true');
  setCheckoutState('결제 완료 여부를 확인하는 중입니다.');
  const payload = { orderId: currentOrder.id, paymentId: currentPaymentSession?.providerPaymentId || currentOrder.id };
  try {
    const res = await fetch('/api/public/payment/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '결제 완료를 확인하지 못했습니다.');
    renderOrder(data.order, data.paymentSession);
    if (data.pendingSettlement) {
      setCheckoutState('결제가 아직 완료 처리 전입니다. 가상계좌 입금 또는 카드 승인 상태를 확인해 주세요.', 'warn');
      return;
    }
    setCheckoutState('결제가 완료되었습니다.', 'success');
    const anchor = document.createElement('a');
    anchor.href = `/portal?orderId=${encodeURIComponent(data.order.id)}${data.order.accessToken ? `&accessToken=${encodeURIComponent(data.order.accessToken)}` : ''}`;
    anchor.textContent = '고객 포털로 이동';
    state.appendChild(document.createTextNode(' '));
    state.appendChild(anchor);
  } catch (error) {
    setCheckoutState(error.message || '결제 완료 여부를 확인하지 못했습니다.', 'warn');
  } finally {
    isCompletingPayment = false;
    completeBtn?.removeAttribute('disabled');
  }
}
async function maybeFinalizeRedirectResult() {
  const url = new URL(location.href);
  const paymentId = url.searchParams.get('paymentId');
  const orderId = url.searchParams.get('orderId') || paymentId;
  const code = url.searchParams.get('code');
  const message = url.searchParams.get('message');
  if (!paymentId) return;
  if (code) {
    setCheckoutState(message || '결제가 완료되지 않았습니다.', 'warn');
    return;
  }
  currentOrder = { id: orderId, amount: 0, plan: normalizePlanCode(prefill.plan || 'Report'), status: 'pending', domain: prefill.domain || '', siteId: prefill.siteId || '' };
  currentPaymentSession = { provider: 'portone_v2', providerPaymentId: paymentId };
  setCheckoutState('결제 결과를 확인하는 중입니다.');
  await completePayment();
}
function renderPlanOptions() {
  if (!planInput) return;
  const selected = normalizePlanCode(planInput.value || prefill.plan || 'Report');
  planInput.innerHTML = [...offerMap.values()].map(offer => `<option value="${escapeAttr(normalizePlanCode(offer.code))}" ${normalizePlanCode(offer.code)===selected?'selected':''}>${escapeHtml(offer.title || offer.code)} · ${escapeHtml(priceLabel(offer))}</option>`).join('');
}
async function loadPaymentConfig() {
  try {
    const res = await fetch('/api/public/payment/config', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data.error || '온라인 결제 상태를 확인하지 못했습니다.');
    paymentConfig = data;
  } catch (error) {
    paymentConfig = { ...paymentConfig, paymentReady: false, reason: error.message || paymentConfig.reason };
  }
  renderPaymentConfig();
  updateCheckoutButtonState();
}
async function loadOffers() {
  try {
    const res = await fetch('/api/public/products', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !Array.isArray(data.offers)) throw new Error('상품 정보를 불러오지 못했습니다.');
    offerMap = new Map(data.offers.map(item => [normalizePlanCode(item.code), { ...item, code: normalizePlanCode(item.code), price: Number(item.price || item.monthlyPrice || 0) }]));
  } catch {
    offerMap = new Map(fallbackOffers.map(item => [item.code, item]));
  }
  renderPlanOptions();
  renderPriceSummary();
  updateCheckoutButtonState();
}

document.getElementById('buyerEmail')?.addEventListener('input', updateCheckoutButtonState);
targetInput?.addEventListener('input', updateCheckoutButtonState);
['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].forEach(id => document.getElementById(id)?.addEventListener('change', updateCheckoutButtonState));
planInput?.addEventListener('change', () => { renderPriceSummary(); updateCheckoutButtonState(); });
checkoutForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  createSession();
});
completeBtn?.addEventListener('click', completePayment);
window.addEventListener('load', updateCheckoutButtonState);
setTimeout(updateCheckoutButtonState, 1200);
let portoneReadyChecks = 0;
const portoneReadyTimer = setInterval(() => {
  portoneReadyChecks += 1;
  updateCheckoutButtonState();
  if (window.PortOne?.requestPayment || portoneReadyChecks >= 20) clearInterval(portoneReadyTimer);
}, 500);

updateCheckoutButtonState();
renderPaymentConfig();
renderPriceSummary();
loadPaymentConfig();
loadOffers();
maybeFinalizeRedirectResult();
