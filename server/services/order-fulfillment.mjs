import crypto from 'node:crypto';

export const ORDER_FULFILLMENT_TRANSITIONS = Object.freeze({
  created: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'payment_failed', 'cancelled', 'expired'],
  payment_failed: ['pending_payment', 'cancelled'],
  paid: ['generating', 'refunding', 'cancelled'],
  generating: ['fulfilled', 'generation_failed'],
  generation_failed: ['generating', 'refunding'],
  fulfilled: ['refunding', 'refunded_partial', 'refunded_full'],
  refunding: ['refunded_partial', 'refunded_full', 'refund_failed'],
  refund_failed: ['refunding'],
  refunded_partial: ['refunding', 'refunded_full'],
  refunded_full: [],
  cancelled: [],
  expired: []
});

export function canMoveOrderStatus(current, next, graph = ORDER_FULFILLMENT_TRANSITIONS) {
  return Array.isArray(graph[current]) && graph[current].includes(next);
}

export function moveOrderStatus(order = {}, nextStatus, meta = {}) {
  const current = order.status || 'created';
  if (!canMoveOrderStatus(current, nextStatus)) {
    const error = new Error(`Invalid order transition: ${current} -> ${nextStatus}`);
    error.code = 'INVALID_ORDER_TRANSITION';
    error.current = current;
    error.next = nextStatus;
    throw error;
  }
  const event = {
    at: meta.at || new Date().toISOString(),
    from: current,
    to: nextStatus,
    actor: meta.actor || 'system',
    reason: meta.reason || null,
    requestId: meta.requestId || null
  };
  return {
    ...order,
    status: nextStatus,
    updatedAt: event.at,
    statusHistory: [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), event]
  };
}

export function createIdempotencyKey(parts = []) {
  const source = Array.isArray(parts) ? parts.join('|') : String(parts || '');
  return crypto.createHash('sha256').update(source).digest('hex');
}

export function verifyWebhookIdempotency(store = [], event = {}) {
  const key = event.idempotencyKey || createIdempotencyKey([event.provider || 'unknown', event.eventId || event.paymentId || event.orderId || '', event.status || '', event.occurredAt || '']);
  const duplicate = store.some((item) => item.idempotencyKey === key);
  return {
    ok: !duplicate,
    duplicate,
    idempotencyKey: key,
    record: {
      id: `wh_${key.slice(0, 24)}`,
      idempotencyKey: key,
      provider: event.provider || 'unknown',
      orderId: event.orderId || null,
      paymentId: event.paymentId || null,
      status: event.status || null,
      receivedAt: event.receivedAt || new Date().toISOString(),
      replayable: event.replayable !== false
    }
  };
}

export function buildFulfillmentChecklist(order = {}, asset = null) {
  const reportQualityScore = Number(asset?.reportQualityProfile?.score || order.reportQualityScore || 0);
  const fulfillmentQualityScore = Number(asset?.fulfillmentQualityProfile?.score || order.fulfillmentQualityScore || 0);
  const hasStructuredAsset = !asset || Boolean(
    asset.executiveBrief ||
    (Array.isArray(asset.sections) && asset.sections.length >= 6) ||
    (Array.isArray(asset.deliverableIndex) && asset.deliverableIndex.length >= 4)
  );
  const items = [
    { key: 'payment_captured', label: '결제 승인 확인', ok: ['paid','generating','fulfilled','refunded_partial','refunding'].includes(order.status) || !!order.paidAt },
    { key: 'customer_contact', label: '고객 연락처 확보', ok: !!(order.customerEmail || order.email || order.buyerEmail) },
    { key: 'target_url', label: '진단 대상 URL 확보', ok: !!(order.targetUrl || order.url || order.siteUrl || order.domain) },
    { key: 'asset_generated', label: '산출물 생성', ok: order.status === 'fulfilled' || !!order.assetId || !!order.reportPath || !!asset },
    { key: 'download_authorized', label: '다운로드 권한 토큰', ok: !!(order.accessToken || order.downloadToken) },
    { key: 'asset_structured', label: '산출물 구조화 확인', ok: hasStructuredAsset },
    { key: 'report_quality_gate', label: '리포트 검수 기준', ok: !asset || reportQualityScore === 0 || reportQualityScore >= 75 },
    { key: 'fulfillment_quality_gate', label: '납품 가능성 게이트', ok: !asset || fulfillmentQualityScore === 0 || fulfillmentQualityScore >= 75 }
  ];
  return { ok: items.every((item) => item.ok), items, quality: { reportQualityScore, fulfillmentQualityScore } };
}
