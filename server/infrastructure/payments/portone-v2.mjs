const DEFAULT_API_BASE = 'https://api.portone.io';

function authHeaders(secret) {
  return {
    authorization: `PortOne ${secret}`,
    'content-type': 'application/json'
  };
}

async function parseJsonSafe(res) {
  return res.json().catch(() => null);
}

async function requestJson(apiBase, secret, pathname, options = {}) {
  const res = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      authorization: `PortOne ${secret}`,
      ...(options.headers || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data?.message || `PORTONE_HTTP_${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function mapPaymentStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return 'captured';
    case 'READY':
      return 'ready_for_payment';
    case 'VIRTUAL_ACCOUNT_ISSUED':
      return 'virtual_account_issued';
    case 'CANCELLED':
      return 'cancelled';
    case 'PARTIAL_CANCELLED':
      return 'refund_partial';
    case 'FAILED':
      return 'failed';
    default:
      return 'ready_for_payment';
  }
}

function normalizeCurrency(value) {
  const code = String(value || 'KRW').toUpperCase();
  return code.startsWith('CURRENCY_') ? code : `CURRENCY_${code}`;
}

function buildNoticeUrls(base) {
  if (!base) return [];
  return [`${base.replace(/\/$/, '')}/api/public/payment/portone/webhook`];
}

export function createPortOneV2Client(env) {
  const apiBase = String(env.NV0_PORTONE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/$/, '');
  const secret = String(env.NV0_PORTONE_API_SECRET || '').trim();
  const storeId = String(env.NV0_PORTONE_STORE_ID || '').trim();
  const channelKey = String(env.NV0_PORTONE_CHANNEL_KEY || '').trim();
  const redirectUrl = String(env.NV0_PORTONE_REDIRECT_URL || '').trim();
  const webhookBaseUrl = String(env.NV0_PUBLIC_BASE_URL || '').trim();
  const webhookSecret = String(env.NV0_PORTONE_WEBHOOK_SECRET || '').trim();
  const defaultPayMethod = String(env.NV0_PORTONE_PAY_METHOD || 'CARD').trim().toUpperCase();
  const customerIdPrefix = String(env.NV0_PORTONE_CUSTOMER_ID_PREFIX || 'customer').trim();

  return {
    enabled: Boolean(secret && storeId && channelKey),
    storeId,
    channelKey,
    webhookSecretConfigured: Boolean(webhookSecret),
    async preRegisterPayment({ paymentId, totalAmount, currency = 'KRW', taxFreeAmount = 0, vatAmount, customer, customData, orderName }) {
      return requestJson(apiBase, secret, `/payments/${encodeURIComponent(paymentId)}/pre-register`, {
        method: 'POST',
        body: JSON.stringify({
          storeId,
          paymentId,
          orderName,
          totalAmount,
          currency: normalizeCurrency(currency),
          taxFreeAmount,
          ...(vatAmount != null ? { vatAmount } : {}),
          ...(customer ? { customer } : {}),
          ...(customData ? { customData } : {})
        })
      });
    },
    buildCheckoutSession({ order, customerName, email, domain, payMethod = defaultPayMethod }) {
      const paymentId = order.id;
      const customer = {
        id: `${customerIdPrefix}-${order.id}`,
        ...(customerName ? { fullName: customerName } : {}),
        ...(email ? { email } : {})
      };
      const paymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: `NV0 ${order.plan} 플랜`,
        totalAmount: order.amount,
        currency: 'CURRENCY_KRW',
        payMethod,
        customer,
        customData: {
          orderId: order.id,
          siteId: order.siteId || '',
          domain: domain || '',
          plan: order.plan,
          amount: order.amount
        },
        ...(redirectUrl ? { redirectUrl, forceRedirect: true } : {}),
        ...(buildNoticeUrls(webhookBaseUrl).length ? { noticeUrls: buildNoticeUrls(webhookBaseUrl) } : {})
      };
      return {
        id: `pay-${paymentId}`,
        orderId: order.id,
        provider: 'portone_v2',
        providerPaymentId: paymentId,
        providerState: 'ready_for_payment',
        redirectUrl: redirectUrl || null,
        checkoutHints: {
          sdk: 'portone_v2',
          requestMode: redirectUrl ? 'redirect' : 'promise',
          webhookConfigured: buildNoticeUrls(webhookBaseUrl).length > 0
        },
        paymentRequest,
        createdAt: new Date().toISOString()
      };
    },
    async getPayment(paymentId) {
      return requestJson(apiBase, secret, `/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
    },
    async cancelPayment(paymentId, { reason, amount, taxFreeAmount } = {}) {
      return requestJson(apiBase, secret, `/payments/${encodeURIComponent(paymentId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          storeId,
          ...(reason ? { reason } : {}),
          ...(amount != null ? { amount } : {}),
          ...(taxFreeAmount != null ? { taxFreeAmount } : {})
        })
      });
    },
    extractWebhookPaymentId(payload) {
      if (!payload || typeof payload !== 'object') return '';
      if (typeof payload.paymentId === 'string' && payload.paymentId) return payload.paymentId;
      if (payload.data && typeof payload.data === 'object' && typeof payload.data.paymentId === 'string') return payload.data.paymentId;
      return '';
    },
    mapPaymentStatus,
    normalizeCurrency,
    configSummary() {
      return {
        enabled: Boolean(secret && storeId && channelKey),
        apiBase,
        storeIdConfigured: Boolean(storeId),
        channelKeyConfigured: Boolean(channelKey),
        apiSecretConfigured: Boolean(secret),
        webhookSecretConfigured: Boolean(webhookSecret),
        redirectUrlConfigured: Boolean(redirectUrl),
        noticeUrlConfigured: buildNoticeUrls(webhookBaseUrl).length > 0,
        defaultPayMethod
      };
    }
  };
}

export function verifyPortOnePaymentAgainstOrder(payment, order) {
  if (!payment || !order) return { ok: false, reason: 'missing_payment_or_order' };
  if (String(payment.id || '') !== String(order.id || '')) return { ok: false, reason: 'payment_id_mismatch' };
  const totalAmount = Number(payment?.amount?.total ?? payment?.amount ?? NaN);
  if (!Number.isFinite(totalAmount) || totalAmount !== Number(order.amount)) {
    return { ok: false, reason: 'amount_mismatch', totalAmount, orderAmount: Number(order.amount) };
  }
  const customData = payment?.customData;
  if (customData && typeof customData === 'object') {
    if (customData.orderId && String(customData.orderId) !== String(order.id)) return { ok: false, reason: 'custom_data_order_mismatch' };
    if (customData.plan && String(customData.plan) !== String(order.plan)) return { ok: false, reason: 'custom_data_plan_mismatch' };
  }
  return { ok: true };
}
