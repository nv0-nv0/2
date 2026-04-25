import { escapeAttr, escapeHtml, formatWon, safeUrl } from '/shared/html.js';

const state = document.getElementById('checkoutState');
const targetBox = document.getElementById('checkoutTarget');
const summary = document.getElementById('orderSummary');
const planInput = document.getElementById('plan');
let currentOrder = null;
let currentPaymentSession = null;

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('veridion:lastScan') || 'null'); } catch { return null; }
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
  if (!payload.privacyConsent || !payload.termsConsent || !payload.refundConsent || !payload.deliveryConsent) {
    state.textContent = '결제와 산출물 제공에 필요한 필수 약관 및 디지털 산출물 제공 고지에 동의해 주세요.';
    return;
  }
  state.textContent = '신청 정보를 확인하는 중...';
  const res = await fetch('/api/public/checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    state.textContent = data.error || '신청 정보를 확인하지 못했습니다.';
    return;
  }
  renderOrder(data.order, data.paymentSession);
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
  if (!currentOrder?.id) {
    state.textContent = '먼저 서비스 신청을 진행하세요.';
    return;
  }
  state.textContent = '결제 완료 여부를 확인하는 중...';
  const payload = { orderId: currentOrder.id, paymentId: currentPaymentSession?.providerPaymentId || currentOrder.id };
  const res = await fetch('/api/public/payment/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    state.textContent = data.error || '결제 완료 실패';
    return;
  }
  renderOrder(data.order, data.paymentSession);
  state.textContent = '결제가 완료되었습니다.';
  const anchor = document.createElement('a');
  anchor.href = `/portal?orderId=${encodeURIComponent(data.order.id)}${data.order.accessToken ? `&accessToken=${encodeURIComponent(data.order.accessToken)}` : ''}`;
  anchor.textContent = '고객 포털로 이동';
  state.appendChild(document.createTextNode(' '));
  state.appendChild(anchor);
}

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
