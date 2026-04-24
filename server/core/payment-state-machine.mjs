export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  draft: ['pending', 'cancelled'],
  pending: ['paid', 'failed', 'cancelled'],
  paid: ['cancelled'],
  failed: ['pending', 'cancelled'],
  cancelled: []
});

export const PAYMENT_SESSION_TRANSITIONS = Object.freeze({
  created: ['ready_for_payment', 'failed'],
  ready_for_demo_capture: ['captured', 'failed'],
  ready_for_payment: ['authorized', 'captured', 'virtual_account_issued', 'failed', 'cancelled'],
  virtual_account_issued: ['captured', 'cancelled', 'failed'],
  authorized: ['captured', 'cancelled', 'failed'],
  captured: ['refund_partial', 'refund_full'],
  refund_partial: ['refund_full'],
  refund_full: [],
  failed: [],
  cancelled: []
});

export function canTransition(current, next, graph) {
  const allowed = graph[current] || [];
  return allowed.includes(next);
}
