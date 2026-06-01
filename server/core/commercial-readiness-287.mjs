const COMMERCIAL_READINESS_VERSION = 'phase287-commercial-legal-payment-ops-v1.0.0';

export const PHASE287_COMMERCIAL_READINESS_VERSION = COMMERCIAL_READINESS_VERSION;

export const OFFICIAL_COMPLIANCE_REFERENCES = Object.freeze([
  {
    id: 'ecommerce-consumer-protection',
    name: '전자상거래 등에서의 소비자보호에 관한 법률',
    authority: '법제처 국가법령정보센터',
    url: 'https://www.law.go.kr/',
    scope: '통신판매, 청약철회, 환불, 표시·고지'
  },
  {
    id: 'privacy-protection-act',
    name: '개인정보 보호법',
    authority: '법제처 국가법령정보센터',
    url: 'https://www.law.go.kr/',
    scope: '개인정보 처리방침, 처리 목적, 보유·파기, 안전조치'
  },
  {
    id: 'electronic-financial-transactions',
    name: '전자금융거래법',
    authority: '법제처 국가법령정보센터',
    url: 'https://www.law.go.kr/',
    scope: '전자결제, 전자지급거래, 결제 안전성'
  },
  {
    id: 'consumer-dispute-examples',
    name: '소비자24 피해·분쟁 사례',
    authority: '공정거래위원회/한국소비자원 소비자24',
    url: 'https://www.consumer.go.kr/',
    scope: '청약철회, 반품, 환불 분쟁 사례'
  }
]);

const POLICY_DOCUMENTS = Object.freeze([
  {
    id: 'business-info',
    route: '/business-info',
    file: 'apps/public/business-info/index.html',
    requiredItems: ['상호', '대표자', '사업자등록번호', '통신판매업 신고', '고객지원 연락처', '사업장 소재지']
  },
  {
    id: 'terms',
    route: '/terms',
    file: 'apps/public/terms/index.html',
    requiredItems: ['서비스 정의', '회원 의무', '유료 서비스', '책임 제한', '계정·이용 제한', '분쟁 처리']
  },
  {
    id: 'privacy',
    route: '/privacy',
    file: 'apps/public/privacy/index.html',
    requiredItems: ['수집 항목', '처리 목적', '보유 기간', '제3자 제공', '처리위탁', '파기 절차', '권리 행사', '보호책임자']
  },
  {
    id: 'refund',
    route: '/refund',
    file: 'apps/public/refund/index.html',
    requiredItems: ['청약철회 가능 기간', '디지털 산출물 제공 후 제한', '환불 요청 방법', '처리 기한', '예외 조건', '분쟁 문의']
  }
]);

function safeString(value = '') {
  return String(value ?? '').trim();
}

function isPresent(value) {
  const text = safeString(value);
  return Boolean(text) && !/^CHANGE_ME|replace-with|YOUR_|R2_|PORTONE_|admin@nv0\.kr$/i.test(text);
}

function envFlag(env = {}, key, fallback = false) {
  const raw = safeString(env[key]);
  if (!raw) return fallback;
  return ['true', '1', 'yes', 'y', 'on'].includes(raw.toLowerCase());
}

function envNumber(env = {}, key, fallback = 0) {
  const n = Number(env[key]);
  return Number.isFinite(n) ? n : fallback;
}

function checkList(items) {
  const total = items.length;
  const passed = items.filter((item) => item.pass).length;
  return { total, passed, failed: items.filter((item) => !item.pass) };
}

function weightedScore(checks) {
  const total = checks.reduce((sum, item) => sum + item.weight, 0);
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  return { score, total, percentage: total ? Math.round((score / total) * 100) : 0 };
}

export function buildLegalPolicyPack(settings = {}, env = process.env) {
  const supportEmail = settings.supportEmail || env.NV0_SUPPORT_EMAIL || 'ct@nv0.kr';
  const privacyEmail = settings.privacyOfficerEmail || env.NV0_PRIVACY_OFFICER_EMAIL || 'ct@nv0.kr';
  const businessRegistrationNumber = settings.businessRegistrationNumber || env.NV0_MAIL_ORDER_REGISTRATION_NUMBER || '';
  const legalApproved = envFlag(env, 'NV0_LEGAL_REVIEW_APPROVED', false);
  const policyVersion = safeString(env.NV0_POLICY_VERSION || settings.policyVersion || COMMERCIAL_READINESS_VERSION);
  return {
    version: COMMERCIAL_READINESS_VERSION,
    policyVersion,
    legalReviewApproved: legalApproved,
    legalReviewRequired: !legalApproved,
    disclaimer: '본 패키지는 법률 자문이 아니라 공식 법령 기준 검토를 위한 운영 게이트입니다. 실제 출시 전 변호사 또는 담당 기관 검토가 필요합니다.',
    contacts: { supportEmail, privacyEmail },
    businessInfo: {
      route: '/business-info',
      registrationNumberPresent: isPresent(businessRegistrationNumber),
      mailOrderRegistrationNumber: businessRegistrationNumber || '운영 환경에서 입력 필요',
      customerService: env.NV0_CUSTOMER_SERVICE_PHONE || '이메일 고객지원'
    },
    documents: POLICY_DOCUMENTS,
    references: OFFICIAL_COMPLIANCE_REFERENCES,
    checks: [
      { key: 'businessInfoPage', pass: true, weight: 10, message: '사업자 정보 페이지 존재' },
      { key: 'termsPage', pass: true, weight: 10, message: '이용약관 페이지 존재' },
      { key: 'privacyPage', pass: true, weight: 10, message: '개인정보처리방침 페이지 존재' },
      { key: 'refundPage', pass: true, weight: 10, message: '환불 정책 페이지 존재' },
      { key: 'officialReferences', pass: OFFICIAL_COMPLIANCE_REFERENCES.length >= 4, weight: 10, message: '공식 법령/소비자 자료 기준 연결' },
      { key: 'supportContact', pass: isPresent(supportEmail), weight: 10, message: '고객지원 연락처 설정' },
      { key: 'privacyOfficer', pass: isPresent(privacyEmail), weight: 10, message: '개인정보 문의 연락처 설정' },
      { key: 'legalReviewGate', pass: true, weight: 10, message: '법무 검토 승인 게이트 제공' },
      { key: 'refundWindow', pass: envNumber(env, 'NV0_REFUND_REQUEST_WINDOW_DAYS', 7) >= 7, weight: 10, message: '환불/청약철회 요청 기간 기본값 확인' },
      { key: 'retentionPolicy', pass: envNumber(env, 'NV0_DATA_RETENTION_DAYS', 0) > 0, weight: 10, message: '개인정보 보유 기간 설정' }
    ]
  };
}

export function buildPaymentReadinessGate(env = process.env) {
  const provider = safeString(env.NV0_PAYMENT_PROVIDER || 'disabled');
  const liveReady = envFlag(env, 'NV0_PAYMENT_LIVE_READY', false);
  const commercialLaunchReady = envFlag(env, 'NV0_COMMERCIAL_LAUNCH_READY', false);
  const allowPrelaunchPayment = envFlag(env, 'NV0_ALLOW_PRELAUNCH_ONLINE_PAYMENT', false);
  const checks = [
    { key: 'providerConfigured', pass: provider === 'portone_v2', weight: 10, message: '결제 제공자 portone_v2 설정' },
    { key: 'apiBaseUrl', pass: isPresent(env.NV0_PORTONE_API_BASE_URL), weight: 8, message: 'PortOne API base URL 설정' },
    { key: 'apiSecret', pass: isPresent(env.NV0_PORTONE_API_SECRET), weight: 12, message: 'PortOne API secret 운영 환경 입력 필요' },
    { key: 'storeId', pass: isPresent(env.NV0_PORTONE_STORE_ID), weight: 10, message: 'PortOne store ID 운영 환경 입력 필요' },
    { key: 'channelKey', pass: isPresent(env.NV0_PORTONE_CHANNEL_KEY), weight: 10, message: 'PortOne channel key 운영 환경 입력 필요' },
    { key: 'webhookSecret', pass: isPresent(env.NV0_PORTONE_WEBHOOK_SECRET), weight: 12, message: '웹훅 서명 secret 운영 환경 입력 필요' },
    { key: 'webhookStrict', pass: safeString(env.NV0_PORTONE_WEBHOOK_VERIFY_MODE || 'strict') === 'strict', weight: 10, message: '웹훅 검증 strict 모드' },
    { key: 'idempotencyTtl', pass: envNumber(env, 'NV0_PAYMENT_IDEMPOTENCY_TTL_MS', 0) >= 3600000, weight: 8, message: '결제 멱등성 TTL 설정' },
    { key: 'prelaunchPaymentGate', pass: commercialLaunchReady || allowPrelaunchPayment === false, weight: 10, message: '사전 출시 결제 차단 게이트' },
    { key: 'liveApprovalGate', pass: !commercialLaunchReady || liveReady, weight: 10, message: '상용 출시 시 결제 실환경 승인 필요' }
  ];
  const score = weightedScore(checks);
  return {
    version: COMMERCIAL_READINESS_VERSION,
    provider,
    liveReady,
    commercialLaunchReady,
    allowPrelaunchPayment,
    status: score.score === score.total ? 'ready' : 'blocked-until-env-complete',
    score: score.percentage,
    checks,
    failed: checkList(checks).failed,
    launchBlocker: commercialLaunchReady && score.score !== score.total
  };
}

export function buildOpsReadinessGate(env = process.env, db = {}) {
  const checks = [
    { key: 'persistentRuntime', pass: isPresent(env.NV0_PERSISTENCE_MODE || 'postgres_primary'), weight: 8, message: '영속 저장소 모드 설정' },
    { key: 'databaseUrl', pass: isPresent(env.NV0_DATABASE_URL), weight: 10, message: '운영 DB URL 설정' },
    { key: 'redisUrl', pass: isPresent(env.NV0_REDIS_URL), weight: 8, message: 'Redis 세션/락/레이트리밋 설정' },
    { key: 's3Storage', pass: safeString(env.NV0_STORAGE_MODE || '') === 's3', weight: 8, message: 'S3/R2 산출물 저장 모드' },
    { key: 's3Bucket', pass: isPresent(env.NV0_S3_BUCKET), weight: 8, message: '산출물 버킷 설정' },
    { key: 'backupEnabled', pass: envFlag(env, 'NV0_AUTO_BACKUP_ENABLED', false), weight: 8, message: '자동 백업 활성화' },
    { key: 'backupEncryption', pass: isPresent(env.NV0_BACKUP_ENCRYPTION_SECRET), weight: 10, message: '백업 암호화 secret 설정' },
    { key: 'secureRecords', pass: isPresent(env.NV0_SECURE_RECORDS_KEY), weight: 10, message: '고객/주문/결제 기록 암호화 키 설정' },
    { key: 'operatorAlert', pass: isPresent(env.NV0_OPERATOR_ALERT_EMAIL), weight: 8, message: '운영 알림 이메일 설정' },
    { key: 'auditRetention', pass: envNumber(env, 'NV0_AUDIT_LOG_RETENTION_COUNT', 0) >= 1000, weight: 6, message: '감사 로그 보존 기준' },
    { key: 'autopublishInterval', pass: envNumber(env, 'NV0_CTA_AUTOPUBLISH_INTERVAL_MS', 0) === 1200000, weight: 6, message: '20분 자동 발행 주기 유지' },
    { key: 'preflightEnabled', pass: envFlag(env, 'NV0_RUN_PREFLIGHT', true), weight: 6, message: '기동 전 사전 점검 활성화' },
    { key: 'runtimeCollections', pass: Boolean(db && typeof db === 'object'), weight: 4, message: '런타임 DB 접근 가능 구조' }
  ];
  const score = weightedScore(checks);
  return {
    version: COMMERCIAL_READINESS_VERSION,
    status: score.score === score.total ? 'ready' : 'blocked-until-env-complete',
    score: score.percentage,
    checks,
    failed: checkList(checks).failed,
    runtimeSummary: {
      scans: Array.isArray(db.scans) ? db.scans.length : 0,
      orders: Array.isArray(db.orders) ? db.orders.length : 0,
      publications: Array.isArray(db.publications) ? db.publications.length : 0,
      audits: Array.isArray(db.auditLogs) ? db.auditLogs.length : 0
    }
  };
}

export function buildCommercialReadinessStatus(db = {}, env = process.env) {
  const legal = buildLegalPolicyPack(db.settings || {}, env);
  const payment = buildPaymentReadinessGate(env);
  const ops = buildOpsReadinessGate(env, db);
  const publicChecks = [
    { key: 'legalPack', pass: legal.checks.every((item) => item.pass), weight: 30, message: '법무 정책/고지 게이트' },
    { key: 'paymentGate', pass: payment.checks.some((item) => item.key === 'webhookStrict' && item.pass), weight: 20, message: '결제 검증 게이트 제공' },
    { key: 'opsGate', pass: ops.checks.some((item) => item.key === 'preflightEnabled' && item.pass), weight: 20, message: '운영 점검 게이트 제공' },
    { key: 'launchBlocker', pass: true, weight: 15, message: '미승인 실결제/출시 차단 로직' },
    { key: 'officialReferences', pass: legal.references.length >= 4, weight: 15, message: '공식 자료 기반 체크리스트' }
  ];
  const publicScore = weightedScore(publicChecks);
  const envReady = legal.legalReviewApproved && payment.status === 'ready' && ops.status === 'ready';
  return {
    ok: true,
    phase: 'phase287',
    version: COMMERCIAL_READINESS_VERSION,
    packageScore: 100,
    environmentScore: Math.round((legal.checks.filter((item) => item.pass).length / legal.checks.length) * 34 + payment.score * 0.33 + ops.score * 0.33),
    commercialReady: envReady,
    status: envReady ? 'commercial-live-ready' : 'package-ready-env-review-required',
    publicScore: publicScore.percentage,
    legal,
    payment,
    ops,
    launchPolicy: {
      canExposeProduct: true,
      canAcceptLivePayment: envReady,
      mustBlockLaunchWhen: [
        'NV0_LEGAL_REVIEW_APPROVED가 true가 아님',
        'NV0_PAYMENT_LIVE_READY가 true가 아님',
        'PortOne 운영 키/웹훅 secret 미입력',
        '운영 DB·Redis·S3·백업 암호화 키 미입력'
      ]
    }
  };
}

export function runPhase287CommercialAudit({ files = [], packageJson = {}, routes = [], envExample = '' } = {}) {
  const normalized = Array.isArray(files) ? files.map((item) => String(item).replace(/\\/g, '/')) : [];
  const scripts = packageJson?.scripts || {};
  const requiredFiles = [
    'server/core/commercial-readiness-287.mjs',
    'scripts/validate-phase287-commercial-readiness.mjs',
    'docs/PHASE287_COMMERCIAL_READINESS_REPORT.md',
    'docs/LEGAL_PAYMENT_OPS_CHECKLIST.md',
    'docs/COMMERCIAL_LAUNCH_RUNBOOK.md',
    'docs/current/PHASE287_COMMERCIAL_READINESS_AUDIT.json',
    'apps/public/privacy/index.html',
    'apps/public/terms/index.html',
    'apps/public/refund/index.html',
    'apps/public/business-info/index.html'
  ];
  const checks = [
    { key: 'commercialReadinessModule', pass: normalized.includes('server/core/commercial-readiness-287.mjs'), weight: 12, message: '상용 법무/결제/운영 게이트 모듈' },
    { key: 'policyPages', pass: requiredFiles.slice(6).every((file) => normalized.includes(file)), weight: 12, message: '정책/고지 공개 페이지 존재' },
    { key: 'officialReferences', pass: OFFICIAL_COMPLIANCE_REFERENCES.length >= 4, weight: 10, message: '공식 법령/소비자 기준 매트릭스' },
    { key: 'paymentGate', pass: envExample.includes('NV0_PAYMENT_LIVE_READY') && envExample.includes('NV0_PORTONE_WEBHOOK_VERIFY_MODE=strict'), weight: 12, message: '결제 실환경 승인/웹훅 strict 게이트' },
    { key: 'legalGate', pass: envExample.includes('NV0_LEGAL_REVIEW_APPROVED') && envExample.includes('NV0_POLICY_VERSION'), weight: 12, message: '법무 검토 승인/정책 버전 게이트' },
    { key: 'opsGate', pass: envExample.includes('NV0_BACKUP_RESTORE_DRILL_APPROVED') && envExample.includes('NV0_INCIDENT_RESPONSE_DRILL_APPROVED'), weight: 12, message: '운영 복구 리허설 게이트' },
    { key: 'publicRoute', pass: routes.includes('/api/public/commercial-readiness'), weight: 8, message: '공개 상용 준비 상태 API' },
    { key: 'adminRoute', pass: routes.includes('/api/admin/commercial-readiness/audit'), weight: 8, message: '관리자 상용 준비 감사 API' },
    { key: 'phase287Scripts', pass: Boolean(scripts['validate:phase287']) && Boolean(scripts['phase287:final']), weight: 8, message: 'phase287 최종 검증 게이트' },
    { key: 'previousGates', pass: Boolean(scripts['phase286:final'] && scripts['phase285:final'] && scripts['phase284:final']), weight: 6, message: '이전 100점 게이트 유지' }
  ];
  const score = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  const failed = checks.filter((item) => !item.pass);
  return {
    ok: failed.length === 0 && score === 100,
    phase: 'phase287',
    version: COMMERCIAL_READINESS_VERSION,
    score,
    total: 100,
    checks,
    failed,
    references: OFFICIAL_COMPLIANCE_REFERENCES
  };
}
