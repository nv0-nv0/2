import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const KEYLEN = 64;

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
