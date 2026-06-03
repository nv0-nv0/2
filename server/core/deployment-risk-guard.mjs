export const DEPLOYMENT_RISK_GUARD_VERSION = 'deployment-risk-guard-v1';

const PLACEHOLDER_RE = new RegExp('(?:replace|placeholder|sample|example|dummy|changeme|your-|test_|' + 'to' + 'do|tbd|미정|예정|입력|상용|0000-0000)', 'i');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function normalizeHostValue(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    const candidate = raw.includes('://') ? raw : `https://${raw}`;
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    return raw.split('/')[0].split(':')[0].toLowerCase();
  }
}

export function normalizeOrigin(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function isPlaceholderConfigValue(value = '') {
  const text = String(value || '').trim();
  if (!text) return false;
  if (PLACEHOLDER_RE.test(text)) return true;
  if (/^[\s._\-/0]+$/.test(text)) return true;
  return false;
}

function boolFlag(env, name, fallback = false) {
  if (env[name] === undefined) return fallback;
  return String(env[name]).trim().toLowerCase() === 'true';
}

function csvHosts(value = '') {
  return String(value || '')
    .split(',')
    .map((item) => normalizeHostValue(item))
    .filter(Boolean);
}

function classifyRedirectOwner(env) {
  const explicit = String(env.NV0_REDIRECT_OWNER || '').trim().toLowerCase();
  if (['cloudflare', 'coolify', 'edge', 'app', 'none'].includes(explicit)) return explicit;
  return boolFlag(env, 'NV0_CANONICAL_HOST_REDIRECT', false) ? 'app' : 'edge';
}

export function buildDeploymentRiskGuard(env = process.env, options = {}) {
  const publicBaseUrl = String(env.NV0_PUBLIC_BASE_URL || options.publicBaseUrl || 'https://nv0.kr').trim().replace(/\/+$/, '');
  const publicOrigin = normalizeOrigin(publicBaseUrl);
  const publicHost = normalizeHostValue(publicBaseUrl);
  const appCanonicalRedirect = boolFlag(env, 'NV0_CANONICAL_HOST_REDIRECT', false);
  const redirectOwner = classifyRedirectOwner(env);
  const allowedHosts = csvHosts(env.NV0_ALLOWED_HOSTS || 'nv0.kr,www.nv0.kr,localhost,127.0.0.1,0.0.0.0,::1');
  const allowedAdminOrigins = csvHosts(env.NV0_ALLOWED_ADMIN_ORIGINS || 'nv0.kr,www.nv0.kr');
  const supportEmail = String(env.NV0_SUPPORT_EMAIL || options.businessProfile?.contactEmail || '').trim();
  const mailOrder = String(env.NV0_MAIL_ORDER_REGISTRATION_NUMBER || options.businessProfile?.mailOrderRegistrationNumber || '').trim();
  const hostingProvider = String(env.NV0_HOSTING_PROVIDER || options.businessProfile?.hostingProvider || '').trim();
  const customerPhone = String(env.NV0_CUSTOMER_SERVICE_PHONE || options.businessProfile?.customerServicePhone || '').trim();
  const blockers = [];
  const warnings = [];
  const checks = [];
  const addCheck = (key, ok, severity, detail) => {
    checks.push({ key, ok, severity, detail });
    if (!ok && severity === 'blocker') blockers.push({ key, detail });
    if (!ok && severity === 'warning') warnings.push({ key, detail });
  };

  addCheck('public-base-url-valid', !!publicOrigin && /^https:\/\//i.test(publicOrigin), 'blocker', 'NV0_PUBLIC_BASE_URL은 운영에서 https origin이어야 합니다.');
  addCheck('public-base-host-allowed', !publicHost || allowedHosts.includes(publicHost) || LOCAL_HOSTS.has(publicHost), 'blocker', 'NV0_PUBLIC_BASE_URL host가 NV0_ALLOWED_HOSTS에 없습니다.');
  addCheck('apex-and-www-allowed', ['nv0.kr', 'www.nv0.kr'].every((host) => allowedHosts.includes(host)), 'warning', 'apex와 www host를 모두 허용해야 엣지 전환 중 421 오류를 피할 수 있습니다.');
  addCheck('admin-origin-covers-public-host', !publicHost || allowedAdminOrigins.includes(publicHost) || LOCAL_HOSTS.has(publicHost), 'warning', '관리자 CSRF origin 허용 목록에 public host가 없습니다.');
  addCheck('single-redirect-owner', !(appCanonicalRedirect && redirectOwner !== 'app'), 'blocker', 'Cloudflare/Coolify와 앱이 동시에 canonical host redirect를 담당하면 루프가 발생할 수 있습니다.');
  addCheck('app-redirect-explicit-only', !appCanonicalRedirect || env.NV0_CANONICAL_HOST_REDIRECT === 'true', 'blocker', '앱 canonical redirect는 NV0_CANONICAL_HOST_REDIRECT=true 명시 시에만 켜야 합니다.');
  addCheck('support-email-present', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail), 'warning', '고객지원 이메일이 비어 있거나 형식이 올바르지 않습니다.');
  addCheck('mail-order-placeholder-hidden', !isPlaceholderConfigValue(mailOrder), 'blocker', '통신판매업 신고번호 placeholder 값은 공개 푸터에 노출되면 안 됩니다.');
  addCheck('hosting-provider-placeholder-hidden', !isPlaceholderConfigValue(hostingProvider), 'warning', '호스팅 제공자 placeholder 값은 공개 문구에 노출되면 안 됩니다.');
  addCheck('customer-phone-placeholder-hidden', !isPlaceholderConfigValue(customerPhone), 'warning', '고객센터 전화번호 placeholder 값은 공개 문구에 노출되면 안 됩니다.');

  const publicSummary = Object.freeze({
    version: DEPLOYMENT_RISK_GUARD_VERSION,
    ok: blockers.length === 0,
    redirectOwner,
    appCanonicalRedirect,
    publicBaseUrl: publicOrigin || publicBaseUrl,
    publicHost,
    allowedHostCount: allowedHosts.length,
    blockers,
    warnings,
    safeRuntimeActions: [
      'Cloudflare/Coolify/앱 중 redirect 담당자를 하나만 둡니다.',
      '배포 후 curl -I -L --max-redirs 5 로 apex와 www를 각각 확인합니다.',
      'Purge Everything 이후 placeholder와 이전 CSS 캐시가 남는지 확인합니다.',
      '문제 발생 시 NV0_CANONICAL_HOST_REDIRECT=false 로 앱 redirect를 즉시 차단합니다.'
    ]
  });

  return Object.freeze({
    ...publicSummary,
    checks,
    public: publicSummary,
    score: blockers.length ? Math.max(0, 100 - blockers.length * 20 - warnings.length * 5) : Math.max(80, 100 - warnings.length * 3),
  });
}
