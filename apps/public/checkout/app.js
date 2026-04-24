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
targetBox.textContent = prefill.domain ? `대상 사이트: ${prefill.domain}` : '스캔 이력이 없으면 일반 주문으로 생성됩니다.';

function renderOrder(order, paymentSession) {
  currentOrder = order;
  currentPaymentSession = paymentSession;
  const redirectUrl = safeUrl(paymentSession?.redirectUrl || '');
  const provider = paymentSession?.provider || 'demo';
  const portoneHint = provider === 'portone_v2' ? '<div class="notice muted">포트원 브라우저 SDK로 결제가 진행됩니다.</div>' : '';
  summary.innerHTML = `
    <div class="result-card stack">
      <strong>주문 ${escapeHtml(order.id)}</strong>
      <div class="muted">${escapeHtml(order.plan)} · ${formatWon(order.amount)}원 · ${escapeHtml(order.status)}</div>
      <div>사이트: ${escapeHtml(order.domain || order.siteId || '미연결')}</div>
      <div>결제 수단 모드: ${escapeHtml(provider)}</div>
      ${portoneHint}
      ${redirectUrl ? `<a href="${escapeAttr(redirectUrl)}" target="_blank" rel="noreferrer">리디렉트 완료 URL</a>` : ''}
    </div>`;
  const completeBtn = document.getElementById('completeBtn');
  if (completeBtn) completeBtn.textContent = provider === 'portone_v2' ? '포트원 결제 완료 확인' : '가상 결제 완료';
}

async function launchPortOneCheckout(paymentSession) {
  if (!window.PortOne?.requestPayment) throw new Error('포트원 브라우저 SDK를 불러오지 못했습니다.');
  const response = await window.PortOne.requestPayment(paymentSession.paymentRequest);
  if (response?.code !== undefined) throw new Error(response.message || '포트원 결제 요청이 실패했습니다.');
  return response;
}

async function createSession() {
  const payload = {
    buyerName: document.getElementById('buyerName').value.trim(),
    buyerEmail: document.getElementById('buyerEmail').value.trim(),
    siteId: prefill.siteId,
    domain: prefill.domain,
    plan: planInput.value
  };
  state.textContent = '주문 생성 중...';
  const res = await fetch('/api/public/checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    state.textContent = data.error || '주문 생성 실패';
    return;
  }
  renderOrder(data.order, data.paymentSession);
  if (data.providerMode === 'portone_v2') {
    state.textContent = '주문이 생성되었습니다. 포트원 결제를 시작합니다.';
    try {
      const paymentResponse = await launchPortOneCheckout(data.paymentSession);
      if (paymentResponse?.paymentId || data.paymentSession?.redirectUrl) {
        state.textContent = '포트원 결제창이 열렸습니다. 완료 후 결과를 확인하세요.';
      }
    } catch (error) {
      state.textContent = error.message || '포트원 결제를 시작하지 못했습니다.';
    }
    return;
  }
  state.textContent = data.providerMode === 'demo' ? '주문이 생성되었습니다. 가상 결제 완료를 누르세요.' : '주문이 생성되었습니다. 외부 결제 링크를 진행하세요.';
}

async function completePayment() {
  if (!currentOrder?.id) {
    state.textContent = '먼저 주문을 생성하세요.';
    return;
  }
  state.textContent = '결제 완료 처리 중...';
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
  anchor.href = `/portal?orderId=${encodeURIComponent(data.order.id)}`;
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
    state.textContent = message || '포트원 결제가 완료되지 않았습니다.';
    return;
  }
  currentOrder = { id: paymentId, amount: 0, plan: prefill.plan || 'Pro', status: 'pending', domain: prefill.domain || '', siteId: prefill.siteId || '' };
  currentPaymentSession = { provider: 'portone_v2', providerPaymentId: paymentId };
  state.textContent = '리디렉트 결제 결과를 검증 중입니다.';
  await completePayment();
}

maybeFinalizeRedirectResult();
