# Commercial Target Interface Contracts

## PaymentProvider
- createSession({ orderId, amount, currency, customer, returnUrl, webhookContext })
- confirmPayment({ providerPaymentId, orderId, idempotencyKey })
- cancelPayment({ providerPaymentId, amount, reason, idempotencyKey })
- refundPayment({ providerPaymentId, amount, reason, idempotencyKey })
- parseWebhook({ headers, rawBody })
- verifyWebhookSignature({ headers, rawBody })

## ScanProvider
- requestScan({ target, siteId, correlationId })
- getScanResult({ requestId })
- normalizeResult(providerPayload)

## SessionStore
- createSession({ actorId, csrfToken, expiresAt, metadata })
- getSession(sessionId)
- revokeSession(sessionId)
- revokeSessionsByActor(actorId)

## StorageProvider
- putObject({ key, body, contentType, metadata })
- getObject({ key })
- getSignedUploadUrl({ key, contentType, expiresInSec })
- deleteObject({ key })
