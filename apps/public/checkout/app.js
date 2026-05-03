
import { escapeAttr, escapeHtml, formatWon, safeUrl } from '/shared/html.js';

const state = document.getElementById('checkoutState');
const targetBox = document.getElementById('checkoutTarget');
const summary = document.getElementById('orderSummary');
const planInput = document.getElementById('plan');
const checkoutBtn = document.getElementById('checkoutBtn');
const completeBtn = document.getElementById('completeBtn');

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

const fallbackOffers = [
  { code: 'Report', title: '상세 리포트', price: 69000, period: '1회', summary: '근거와 우선순위를 정리한 상세 리포트', targetCustomer: '무엇부터 고칠지 판단해야 하는 운영자' },
  { code: 'FixPack', title: '수정 문구안', price: 99000, period: '1회', summary: '바로 붙여넣기 쉬운 수정 문구 패키지', targetCustomer: '오늘 바로 문구를 정리해야 하는 운영자' },
  { code: 'Basic', title: 'Basic 모니터링', price: 99000, period: '월', summary: '기본 재점검과 결과 이력 확인', targetCustomer: '월 단위 점검이 필요한 운영자' },
  { code: 'Pro', title: 'Pro 정기 개선', price: 199000, period: '월', summary: '정기 점검과 문서·수정 지원을 함께 제공', targetCustomer: '운영 구조를 꾸준히 개선하려는 팀' },
  { code: 'Auto', title: 'Auto 정기 케어', price: 299000, period: '월', summary: '반복 점검과 자동 운영 지원', targetCustomer: '변경이 잦은 팀' },
  { code: 'Agency', title: '대행사 리포트 패키지', price: 399000, period: '월', summary: '여러 고객사 사이트를 반복 점검', targetCustomer: '고객사 운영을 맡는 대행사' }
];
offerMap = new Map(fallbackOffers.map(item => [item.code, item]));

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
function requiredConsentReady() {
  return ['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].every(id => !!document.getElementById(id)?.checked);
}
function providerLabel(provider) {
  return provider === 'portone_v2' ? 'PortOne 안전결제' : provider || '데모 결제';
}
function priceLabel(offer) {
  if (!offer) return '-';
  return `${formatWon(Number(offer.price || 0))}원${offer.period ? ` / ${offer.period}` : ''}`;
}
function renderPriceSummary() {
  const code = planInput?.value || 'Pro';
  const offer = offerMap.get(code) || null;
  if (!offer) {
    summaryPlanName.textContent = '선택한 상품 정보를 확인하는 중입니다.';
    summaryPlanPeriod.textContent = '상품 제공 범위와 가격을 불러오고 있습니다.';
    summaryBasePrice.textContent = '-';
    summaryDelivery.textContent = '내 사이트 관리에서 확인';
    summaryTargetCustomer.textContent = '상품 안내 확인';
    summaryTotal.textContent = '-';
    return;
  }
  summaryPlanName.textContent = offer.title || code;
  summaryPlanPeriod.textContent = offer.summary || `${offer.period || '1회'} 제공 상품`;
  summaryBasePrice.textContent = priceLabel(offer);
  summaryDelivery.textContent = ['Auto','Agency'].includes(code) ? '결제 후 구독 활성화 및 내 사이트 관리 연결' : '결제 후 내 사이트 관리에서 산출물 확인';
  summaryTargetCustomer.textContent = offer.targetCustomer || '운영 상황에 맞는 사용자를 위한 상품';
  summaryTotal.textContent = priceLabel(offer);
}
function updateCheckoutButtonState() {
  if (!checkoutBtn) return;
  const email = document.getElementById('buyerEmail')?.value.trim() || '';
  const ready = requiredConsentReady() && isValidEmail(email);
  checkoutBtn.disabled = !ready || isCreatingSession;
  checkoutBtn.setAttribute('aria-disabled', String(checkoutBtn.disabled));
  checkoutBtn.textContent = ready ? 'PortOne으로 결제 시작' : '필수 동의 후 결제 시작';
}
function getPrefill() {
  const url = new URL(location.href);
  const saved = getSavedScan();
  return {
    siteId: url.searchParams.get('siteId') || saved?.siteId || '',
    plan: url.searchParams.get('plan') || saved?.recommendedPlan || 'Pro',
    domain: url.searchParams.get('domain') || saved?.target || ''
  };
}
const prefill = getPrefill();
if (prefill.plan && planInput) planInput.value = prefill.plan;
targetBox.textContent = prefill.domain ? `대상 사이트: ${prefill.domain}` : '최근 진단 이력이 없으면 일반 신청으로 진행됩니다.';

function renderOrder(order, paymentSession) {
  currentOrder = order;
  currentPaymentSession = paymentSession;
  const redirectUrl = safeUrl(paymentSession?.redirectUrl || '');
  const provider = paymentSession?.provider || 'demo';
  const paymentHint = provider === 'portone_v2'
    ? '<div class="notice muted">PortOne 결제창이 열리면 결제를 진행한 뒤 아래 버튼으로 완료 여부를 확인해 주세요.</div>'
    : '<div class="notice muted">테스트 또는 데모 결제 흐름입니다.</div>';
  summary.innerHTML = `
    <div class="result-card stack checkout-order-card">
      <strong>신청번호 ${escapeHtml(order.id)}</strong>
      <div class="muted">${escapeHtml(order.plan)} · ${formatWon(order.amount)}원 · ${escapeHtml(order.status)}</div>
      <div>대상 사이트: ${escapeHtml(order.domain || order.siteId || '미연결')}</div>
      <div>결제 방식: ${escapeHtml(providerLabel(provider))}</div>
      ${paymentHint}
      ${redirectUrl ? `<a href="${escapeAttr(redirectUrl)}" target="_blank" rel="noreferrer">결제 완료 후 이동 페이지</a>` : ''}
    </div>`;
  if (completeBtn) completeBtn.textContent = provider === 'portone_v2' ? '결제 완료 확인' : '결제 확인';
}
async function launchPaymentWindow(paymentSession) {
  if (!window.PortOne?.requestPayment) throw new Error('결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  const response = await window.PortOne.requestPayment(paymentSession.paymentRequest);
  if (response?.code !== undefined) throw new Error(response.message || '결제 요청이 실패했습니다.');
  return response;
}
async function createSession() {
  if (isCreatingSession) return;
  const payload = {
    buyerEmail: document.getElementById('buyerEmail')?.value.trim() || '',
    siteId: prefill.siteId,
    domain: prefill.domain,
    plan: planInput?.value || 'Pro',
    privacyConsent: !!document.getElementById('privacyConsent')?.checked,
    termsConsent: !!document.getElementById('termsConsent')?.checked,
    refundConsent: !!document.getElementById('refundConsent')?.checked,
    deliveryConsent: !!document.getElementById('deliveryConsent')?.checked
  };
  if (!isValidEmail(payload.buyerEmail)) {
    state.textContent = '결제 결과를 받을 이메일을 정확히 입력해 주세요.';
    updateCheckoutButtonState();
    return;
  }
  if (!payload.privacyConsent || !payload.termsConsent || !payload.refundConsent || !payload.deliveryConsent) {
    state.textContent = '결제를 진행하려면 필수 약관과 디지털 산출물 제공 고지에 동의해 주세요.';
    updateCheckoutButtonState();
    return;
  }
  isCreatingSession = true;
  updateCheckoutButtonState();
  state.textContent = '신청 정보를 확인하고 결제창을 준비하고 있습니다.';
  let data;
  try {
    const res = await fetch('/api/public/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '신청 정보를 확인하지 못했습니다.');
  } catch (error) {
    state.textContent = error.message || '신청 정보를 확인하지 못했습니다.';
    isCreatingSession = false;
    updateCheckoutButtonState();
    return;
  }
  renderOrder(data.order, data.paymentSession);
  isCreatingSession = false;
  updateCheckoutButtonState();
  if (data.providerMode === 'portone_v2') {
    state.textContent = '신청 정보가 확인되었습니다. PortOne 결제창을 시작합니다.';
    try {
      const paymentResponse = await launchPaymentWindow(data.paymentSession);
      if (paymentResponse?.paymentId || data.paymentSession?.redirectUrl) {
        state.textContent = '결제창이 열렸습니다. 결제를 마친 뒤 완료 확인 버튼을 눌러 주세요.';
      }
    } catch (error) {
      state.textContent = error.message || '결제창을 시작하지 못했습니다.';
    }
    return;
  }
  state.textContent = data.providerMode === 'demo' ? '신청 정보가 확인되었습니다. 테스트 결제라면 결제 확인 버튼을 눌러 주세요.' : '신청 정보가 확인되었습니다. 안내에 따라 결제를 진행해 주세요.';
}
async function completePayment() {
  if (isCompletingPayment) return;
  if (!currentOrder?.id) {
    state.textContent = '먼저 결제 신청을 진행해 주세요.';
    return;
  }
  isCompletingPayment = true;
  completeBtn?.setAttribute('disabled', 'true');
  state.textContent = '결제 완료 여부를 확인하는 중입니다.';
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
    state.textContent = '결제가 완료되었습니다.';
    const anchor = document.createElement('a');
    anchor.href = `/portal?orderId=${encodeURIComponent(data.order.id)}${data.order.accessToken ? `&accessToken=${encodeURIComponent(data.order.accessToken)}` : ''}`;
    anchor.textContent = '내 사이트 관리로 이동';
    state.appendChild(document.createTextNode(' '));
    state.appendChild(anchor);
  } catch (error) {
    state.textContent = error.message || '결제 완료 여부를 확인하지 못했습니다.';
  } finally {
    isCompletingPayment = false;
    completeBtn?.removeAttribute('disabled');
  }
}
async function maybeFinalizeRedirectResult() {
  const url = new URL(location.href);
  const paymentId = url.searchParams.get('paymentId');
  const code = url.searchParams.get('code');
  const message = url.searchParams.get('message');
  if (!paymentId) return;
  if (code) {
    state.textContent = message || '결제가 완료되지 않았습니다.';
    return;
  }
  currentOrder = { id: paymentId, amount: 0, plan: prefill.plan || 'Pro', status: 'pending', domain: prefill.domain || '', siteId: prefill.siteId || '' };
  currentPaymentSession = { provider: 'portone_v2', providerPaymentId: paymentId };
  state.textContent = '리디렉트 결제 결과를 검증 중입니다.';
  await completePayment();
}
async function loadOffers() {
  try {
    const res = await fetch('/api/public/products');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !Array.isArray(data.offers)) throw new Error('상품 정보를 불러오지 못했습니다.');
    offerMap = new Map(data.offers.map(item => [item.code, item]));
  } catch {
    offerMap = new Map(fallbackOffers.map(item => [item.code, item]));
  }
  renderPriceSummary();
}

document.getElementById('buyerEmail')?.addEventListener('input', updateCheckoutButtonState);
['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].forEach(id => document.getElementById(id)?.addEventListener('change', updateCheckoutButtonState));
planInput?.addEventListener('change', renderPriceSummary);
checkoutBtn?.addEventListener('click', createSession);
completeBtn?.addEventListener('click', completePayment);

updateCheckoutButtonState();
renderPriceSummary();
loadOffers();
maybeFinalizeRedirectResult();
