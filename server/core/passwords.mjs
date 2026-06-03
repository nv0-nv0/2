import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const KEYLEN = 64;
export const MIN_NEW_PASSWORD_LENGTH = 15;
export const MAX_NEW_PASSWORD_LENGTH = 128;
const BLOCKED_PASSWORDS = new Set([
  'password', 'password123', 'qwerty123', '123456789012345', 'veridion123456789', 'admin123456789012'
]);

export function validateNewPassword(password) {
  const normalized = String(password || '');
  if (normalized.length < MIN_NEW_PASSWORD_LENGTH) return { ok: false, error: `비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  if (normalized.length > MAX_NEW_PASSWORD_LENGTH) return { ok: false, error: `비밀번호는 ${MAX_NEW_PASSWORD_LENGTH}자 이하여야 합니다.` };
  const folded = normalized.trim().toLowerCase();
  if (BLOCKED_PASSWORDS.has(folded) || /^(.)\1+$/.test(folded) || /^(0123456789|1234567890|abcdefghijklmnopqrstuvwxyz)+$/i.test(folded)) {
    return { ok: false, error: '추측하기 쉬운 비밀번호는 사용할 수 없습니다.' };
  }
  return { ok: true };
}

export async function hashPassword(password) {
  const normalized = String(password || '');
  if (normalized.length < 12) throw new Error('PASSWORD_TOO_SHORT');
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(normalized, salt, KEYLEN);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const raw = String(encoded || '');
  const [scheme, salt, digest] = raw.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) return false;
  const derived = await scryptAsync(String(password || ''), salt, KEYLEN);
  const expected = Buffer.from(digest, 'hex');
  const actual = Buffer.from(derived);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
