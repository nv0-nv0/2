import crypto from 'node:crypto';

/**
 * Compares two externally supplied token strings without leaking the matching
 * prefix length and without throwing on UTF-8 byte-length mismatches.
 *
 * Node's `crypto.timingSafeEqual` requires equal Buffer byte lengths. Directly
 * checking JavaScript string length before calling it is unsafe because a string
 * can have the same UTF-16 length but a different UTF-8 byte length. This helper
 * centralizes the Buffer-length check so malformed or non-ASCII user input is
 * treated as a normal authorization miss instead of becoming a 500 response.
 *
 * @param {string} expected - Server-issued secret token.
 * @param {string} candidate - User-supplied token from query, header, or body.
 * @returns {boolean} true only when both tokens are byte-identical.
 */
export function timingSafeStringEqual(expected, candidate) {
  if (!expected || !candidate) return false;
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  const candidateBuffer = Buffer.from(String(candidate), 'utf8');
  if (expectedBuffer.length === 0 || expectedBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

/**
 * Checks an order access token with the same semantics used by public order,
 * fulfillment, and refund routes.
 *
 * @param {{ accessToken?: string } | null | undefined} order - Order-like record.
 * @param {string} candidate - User-supplied access token.
 * @returns {boolean} whether the supplied token authorizes access to the order.
 */
export function hasValidOrderAccessToken(order, candidate) {
  return timingSafeStringEqual(order?.accessToken, String(candidate || '').trim());
}
