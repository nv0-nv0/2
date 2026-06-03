import crypto from 'node:crypto';
import { hashPassword, verifyPassword } from './passwords.mjs';

export const ADMIN_ROLE_CATALOG = Object.freeze({
  super_admin: ['*'],
  operations_admin: ['ops.read', 'ops.write', 'orders.read', 'orders.write', 'sites.read', 'sites.write', 'scans.read', 'scans.write'],
  content_admin: ['content.read', 'content.write', 'legal.read', 'legal.write'],
  support_admin: ['orders.read', 'subscriptions.read', 'sites.read', 'scans.read'],
  readonly_auditor: ['audit.read', 'ops.read', 'orders.read', 'sites.read', 'scans.read', 'content.read', 'legal.read']
});

export function ensureAdminCollections(db) {
  db.adminUsers ||= [];
  db.adminRoleBindings ||= [];
  db.adminSessions ||= [];
  db.auditLogs ||= [];
  return db;
}

export async function ensureBootstrapAdmin(db, env, makeId, nowIso) {
  ensureAdminCollections(db);
  const email = String(env.NV0_BOOTSTRAP_ADMIN_EMAIL || env.NV0_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.NV0_BOOTSTRAP_ADMIN_PASSWORD || env.NV0_ADMIN_PASSWORD || '');
  if (!email || !password) return null;
  let user = db.adminUsers.find((item) => String(item.email || '').toLowerCase() === email);
  if (!user) {
    user = {
      id: makeId('admin'),
      email,
      displayName: String(env.NV0_BOOTSTRAP_ADMIN_NAME || 'Primary Admin').trim() || 'Primary Admin',
      passwordHash: await hashPassword(password),
      status: 'active',
      mfaEnabled: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastLoginAt: null
    };
    db.adminUsers.unshift(user);
  } else if (!user.passwordHash) {
    user.passwordHash = await hashPassword(password);
    user.updatedAt = nowIso();
  }
  if (!db.adminRoleBindings.some((item) => item.userId === user.id && item.role === 'super_admin')) {
    db.adminRoleBindings.unshift({ id: makeId('rolebind'), userId: user.id, role: 'super_admin', createdAt: nowIso() });
  }
  return user;
}

export function getAdminRoles(db, userId) {
  ensureAdminCollections(db);
  return db.adminRoleBindings.filter((item) => item.userId === userId).map((item) => item.role);
}

export function getAdminPermissions(roles = []) {
  const permissions = new Set();
  for (const role of roles) {
    for (const permission of ADMIN_ROLE_CATALOG[role] || []) permissions.add(permission);
  }
  return Array.from(permissions).sort();
}

export async function authenticateAdminAccount(db, email, password) {
  ensureAdminCollections(db);
  const normalized = String(email || '').trim().toLowerCase();
  const user = db.adminUsers.find((item) => String(item.email || '').toLowerCase() === normalized);
  if (!user || user.status !== 'active') return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const roles = getAdminRoles(db, user.id);
  return {
    user,
    roles,
    permissions: getAdminPermissions(roles)
  };
}


function decodeBase32(value = '') {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = ''; for (const char of clean) { const index = alphabet.indexOf(char); if (index < 0) continue; bits += index.toString(2).padStart(5, '0'); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export function verifyTotpCode(secret, code, { now = Date.now(), stepSeconds = 30, window = 1 } = {}) {
  const normalizedCode = String(code || '').trim(); if (!/^\d{6}$/.test(normalizedCode)) return false;
  const key = decodeBase32(secret); if (!key.length) return false;
  const counter = Math.floor(now / 1000 / stepSeconds);
  for (let offset = -window; offset <= window; offset += 1) {
    const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter + offset));
    const digest = crypto.createHmac('sha1', key).update(buffer).digest(); const index = digest[digest.length - 1] & 0x0f;
    const value = ((digest[index] & 0x7f) << 24) | ((digest[index + 1] & 0xff) << 16) | ((digest[index + 2] & 0xff) << 8) | (digest[index + 3] & 0xff);
    if (String(value % 1000000).padStart(6, '0') === normalizedCode) return true;
  }
  return false;
}
