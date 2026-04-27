import { escapeAttr, escapeHtml, formatWon, safeUrl } from '/shared/html.js';

const state = document.getElementById('checkoutState');
const targetBox = document.getElementById('checkoutTarget');
const summary = document.getElementById('orderSummary');
const planInput = document.getElementById('plan');
let currentOrder = null;
let currentPaymentSession = null;
let isCreatingSession = false;
let isCompletingPayment = false;

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function requiredConsentReady() {
  return ['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].every(id => !!document.getElementById(id)?.checked);
}

function updateCheckoutButtonState() {
  const btn = document.getElementById('checkoutBtn');
  if (!btn) return;
  const email = document.getElementById('buyerEmail')?.value.trim() || '';
  const ready = requiredConsentReady() && isValidEmail(email);
  btn.disabled = !ready || isCreatingSession;
  btn.setAttribute('aria-disabled', String(btn.disabled));
  btn.textContent = ready ? '결제하기' : '필수 동의 후 결제하기';
}

function getPrefill() {
  const url = new URL(location.href);
  const saved = getSavedScan();
  return {
    siteId: url.searchParams.get('siteId') || saved?.siteId || '',
    plan: url.searchParams.get('plan') || saved?.recommendedPlan || 'Pro',
    domain: saved?.target || ''
  };
}

const prefill = getPrefill();
if (prefill.plan) planInput.value = prefill.plan;
targetBox.textContent = prefill.domain ? `대상 사이트: ${prefill.domain}` : '진단 이력이 없으면 일반 신청으로 진행됩니다.';

function renderOrder(order, paymentSession) {
  currentOrder = order;
  currentPaymentSession = paymentSession;
  const redirectUrl = safeUrl(paymentSession?.redirectUrl || '');
  const provider = paymentSession?.provider || 'demo';
  const portoneHint = provider === 'portone_v2' ? '<div class="notice muted">안전한 결제창으로 결제가 진행됩니다.</div>' : '';
  summary.innerHTML = `
    <div class="result-card stack">
      <strong>신청번호 ${escapeHtml(order.id)}</strong>
      <div class="muted">${escapeHtml(order.plan)} · ${formatWon(order.amount)}원 · ${escapeHtml(order.status)}</div>
      <div>사이트: ${escapeHtml(order.domain || order.siteId || '미연결')}</div>
      <div>결제 방식: ${escapeHtml(provider)}</div>
      ${portoneHint}
      ${redirectUrl ? `<a href="${escapeAttr(redirectUrl)}" target="_blank" rel="noreferrer">결제 완료 후 이동 페이지</a>` : ''}
    </div>`;
  const completeBtn = document.getElementById('completeBtn');
  if (completeBtn) completeBtn.textContent = provider === 'portone_v2' ? '결제 완료 확인' : '결제 확인';
}

async function launchPaymentWindow(paymentSession) {
  if (!window.PortOne?.requestPayment) throw new Error('결제창을 불러오지 못했습니다.');
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
    plan: planInput.value,
    privacyConsent: !!document.getElementById('privacyConsent')?.checked,
    termsConsent: !!document.getElementById('termsConsent')?.checked,
    refundConsent: !!document.getElementById('refundConsent')?.checked,
    deliveryConsent: !!document.getElementById('deliveryConsent')?.checked
  };
  if (!isValidEmail(payload.buyerEmail)) {
    state.textContent = '결제·산출물 수신 이메일을 정확히 입력해 주세요.';
    updateCheckoutButtonState();
    return;
  }
  if (!payload.privacyConsent || !payload.termsConsent || !payload.refundConsent || !payload.deliveryConsent) {
    state.textContent = '결제와 산출물 제공에 필요한 필수 약관 및 디지털 산출물 제공 고지에 동의해 주세요.';
    updateCheckoutButtonState();
    return;
  }
  isCreatingSession = true;
  updateCheckoutButtonState();
  state.textContent = '신청 정보를 확인하는 중...';
  let data;
  try {
    const res = await fetch('/api/public/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      state.textContent = data.error || '신청 정보를 확인하지 못했습니다.';
      isCreatingSession = false;
      updateCheckoutButtonState();
      return;
    }
  } catch (error) {
    state.textContent = `신청 정보를 확인하지 못했습니다: ${error.message}`;
    isCreatingSession = false;
    updateCheckoutButtonState();
    return;
  }
  renderOrder(data.order, data.paymentSession);
  isCreatingSession = false;
  updateCheckoutButtonState();
  if (data.providerMode === 'portone_v2') {
    state.textContent = '신청 정보가 확인되었습니다. 결제를 시작합니다.';
    try {
      const paymentResponse = await launchPaymentWindow(data.paymentSession);
      if (paymentResponse?.paymentId || data.paymentSession?.redirectUrl) {
        state.textContent = '결제창이 열렸습니다. 완료 후 결과를 확인하세요.';
      }
    } catch (error) {
      state.textContent = error.message || '결제를 시작하지 못했습니다.';
    }
    return;
  }
  state.textContent = data.providerMode === 'demo' ? '신청 정보가 확인되었습니다. 결제 확인을 눌러주세요.' : '신청 정보가 확인되었습니다. 결제 안내에 따라 진행하세요.';
}

async function completePayment() {
  if (isCompletingPayment) return;
  if (!currentOrder?.id) {
    state.textContent = '먼저 서비스 신청을 진행하세요.';
    return;
  }
  isCompletingPayment = true;
  document.getElementById('completeBtn')?.setAttribute('disabled', 'true');
  state.textContent = '결제 완료 여부를 확인하는 중...';
  const payload = { orderId: currentOrder.id, paymentId: currentPaymentSession?.providerPaymentId || currentOrder.id };
  let data;
  try {
    const res = await fetch('/api/public/payment/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      state.textContent = data.error || '결제 완료 실패';
      isCompletingPayment = false;
      document.getElementById('completeBtn')?.removeAttribute('disabled');
      return;
    }
  } catch (error) {
    state.textContent = `결제 완료 여부를 확인하지 못했습니다: ${error.message}`;
    isCompletingPayment = false;
    document.getElementById('completeBtn')?.removeAttribute('disabled');
    return;
  }
  renderOrder(data.order, data.paymentSession);
  isCompletingPayment = false;
  document.getElementById('completeBtn')?.removeAttribute('disabled');
  state.textContent = '결제가 완료되었습니다.';
  const anchor = document.createElement('a');
  anchor.href = `/portal?orderId=${encodeURIComponent(data.order.id)}${data.order.accessToken ? `&accessToken=${encodeURIComponent(data.order.accessToken)}` : ''}`;
  anchor.textContent = '내 사이트 관리로 이동';
  state.appendChild(document.createTextNode(' '));
  state.appendChild(anchor);
}

document.getElementById('buyerEmail')?.addEventListener('input', updateCheckoutButtonState);
['privacyConsent', 'termsConsent', 'refundConsent', 'deliveryConsent'].forEach(id => document.getElementById(id)?.addEventListener('change', updateCheckoutButtonState));
updateCheckoutButtonState();
document.getElementById('checkoutBtn')?.addEventListener('click', createSession);
document.getElementById('completeBtn')?.addEventListener('click', completePayment);


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

maybeFinalizeRedirectResult();
