const DEFAULT_INTERVAL_MS = 20 * 60 * 1000;
const SUITE_VERSION = 'phase280-product-agent-insight-suite-v1.0.0';

export const PRODUCT_AGENT_SUITE_VERSION = SUITE_VERSION;

export const PRODUCT_ENGINE_REGISTRY = Object.freeze([
  { id: 'product-context-engine', layer: 'engine', scope: 'runtime-db', purpose: '사이트·진단·주문·요금제 데이터를 하나의 제품 맥락으로 통합' },
  { id: 'insight-generation-engine', layer: 'engine', scope: 'board-publication', purpose: '제품 맥락 기반 공개 인사이트 초안 생성' },
  { id: 'insight-quality-agent', layer: 'agent', scope: 'content-gate', purpose: '제목·본문·링크·태그·중복·내부 토큰 검수' },
  { id: 'publication-scheduler-agent', layer: 'agent', scope: '20min-autopublish', purpose: '20분 주기 자동 발행 및 수동 트리거 공통 처리' },
  { id: 'board-sync-agent', layer: 'agent', scope: 'public-board', purpose: 'publications와 boards 동기화 및 공개 게시판 노출 보장' },
  { id: 'product-offer-agent', layer: 'agent', scope: 'plans-checkout-report', purpose: '무료 진단·기본 리포트·전문가 리포트와 인사이트 연결' },
  { id: 'package-audit-agent', layer: 'agent', scope: 'package-wide', purpose: 'apps·server·shared·scripts·tests·deploy·docs 구조 검수' }
]);

const TOPICS = [
  {
    key: 'diagnosis-to-report',
    title: '무료 진단 결과를 실제 개선 순서로 바꾸는 방법',
    keyword: '무료 진단 결과 활용',
    audience: '사이트 운영자',
    problem: '무료 진단을 실행했지만 어떤 항목부터 손봐야 하는지 정리하지 못하면 결과 화면은 확인으로 끝납니다.',
    checklist: ['진단 점수보다 발견 항목의 위치를 먼저 확인합니다', '고객 행동 직전 화면을 우선순위로 둡니다', '수정 전후 문구를 기록하고 재진단으로 비교합니다'],
    productPath: '/products/veridion/demo',
    nextAction: '무료 진단을 다시 실행하고 결과를 내 사이트에 저장하세요.'
  },
  {
    key: 'report-product-fit',
    title: '기본 리포트와 전문가 리포트를 나누어 써야 하는 이유',
    keyword: '리포트 상품 선택 기준',
    audience: '구매 검토자',
    problem: '모든 고객에게 같은 산출물을 제공하면 단순 확인이 필요한 사람과 실제 문구 수정이 필요한 사람이 모두 불편해집니다.',
    checklist: ['간단한 위치 확인은 기본 리포트로 시작합니다', '문구 수정과 적용 순서가 필요하면 전문가 리포트를 선택합니다', '반복 관리가 필요하면 사이트 저장과 재진단을 함께 씁니다'],
    productPath: '/plans',
    nextAction: '요금제 화면에서 현재 필요한 산출물 범위를 먼저 비교하세요.'
  },
  {
    key: 'checkout-trust',
    title: '결제 전 안내가 부족하면 좋은 상품도 멈춥니다',
    keyword: '결제 전 안내 점검',
    audience: '커머스 담당자',
    problem: '가격과 혜택은 보이지만 제공 범위, 환불 기준, 고객지원 경로가 약하면 결제 버튼 앞에서 불안이 생깁니다.',
    checklist: ['결제 버튼 주변에 제공 범위를 요약합니다', '환불·청약철회 기준을 같은 흐름에서 연결합니다', '고객지원 이메일과 응답 기준을 보이게 둡니다'],
    productPath: '/checkout?plan=Report',
    nextAction: '결제 화면 기준으로 무료 진단을 돌리고 기본 리포트에서 위치를 확인하세요.'
  },
  {
    key: 'privacy-form',
    title: '문의폼과 개인정보 안내를 함께 봐야 하는 이유',
    keyword: '개인정보 입력폼 점검',
    audience: '문의 전환 담당자',
    problem: '이름, 전화번호, 이메일을 받으면서 수집 목적과 보관 기준이 멀리 있으면 고객은 입력 직전에 멈출 수 있습니다.',
    checklist: ['입력 항목 바로 아래 수집 목적을 둡니다', '개인정보처리방침 링크를 버튼 가까이에 연결합니다', '모바일에서 동의 문구가 너무 작거나 접히지 않는지 봅니다'],
    productPath: '/service',
    nextAction: '문의폼이 있는 공개 URL을 무료 진단에 입력하세요.'
  },
  {
    key: 'saved-site-loop',
    title: '내 사이트 저장은 반복 점검의 시작점입니다',
    keyword: '사이트 반복 관리',
    audience: '운영 매니저',
    problem: '한 번 점검한 결과를 저장하지 않으면 수정 후 좋아졌는지, 어떤 항목이 남았는지 비교하기 어렵습니다.',
    checklist: ['진단한 URL을 내 사이트에 저장합니다', '최근 점수와 발견 항목을 같은 화면에서 확인합니다', '수정 후 재진단으로 변경 결과를 비교합니다'],
    productPath: '/portal',
    nextAction: '내 사이트 메뉴에서 사이트를 등록하고 최근 진단 이력을 묶어 관리하세요.'
  },
  {
    key: 'mobile-readable',
    title: '모바일에서 안 보이는 안내는 고객에게 없는 안내입니다',
    keyword: '모바일 시인성 점검',
    audience: '모바일 유입 사이트 담당자',
    problem: 'PC에서는 보이는 정책 링크와 버튼 문구가 모바일에서는 접히거나 겹쳐 실제 고객이 확인하지 못할 수 있습니다.',
    checklist: ['버튼과 안내 문구가 한 화면에서 같이 보이는지 확인합니다', '긴 URL과 정책 링크가 박스 밖으로 나가지 않게 합니다', '푸터와 상단 메뉴가 모바일에서 겹치지 않는지 봅니다'],
    productPath: '/board',
    nextAction: '모바일 공개 화면 기준으로 다시 진단하고 결과를 비교하세요.'
  },
  {
    key: 'policy-linking',
    title: '정책 페이지는 존재보다 연결 구조가 중요합니다',
    keyword: '정책 링크 구조 점검',
    audience: '서비스 운영자',
    problem: '약관, 환불, 개인정보 문서가 있어도 결제·문의·회원가입 흐름에서 연결되지 않으면 고객은 필요한 순간에 찾지 못합니다.',
    checklist: ['푸터에는 전체 정책 링크를 둡니다', '행동 버튼 주변에는 핵심 요약과 관련 링크를 둡니다', '정책 문서와 실제 판매 문구가 충돌하지 않는지 봅니다'],
    productPath: '/documents',
    nextAction: '문서 초안과 공개 페이지 링크를 함께 정리하세요.'
  },
  {
    key: 'product-scope',
    title: '상품 제공 범위가 명확해야 문의와 환불 부담이 줄어듭니다',
    keyword: '상품 제공 범위 안내',
    audience: '디지털 상품 판매자',
    problem: '리포트, PDF, 템플릿처럼 디지털 산출물을 판매할 때 제공 시점과 포함 범위가 흐리면 결제 후 문의가 늘어납니다.',
    checklist: ['구매 전 제공 범위를 목록으로 보여줍니다', '제공 시작 시점과 확인 가능한 예시를 설명합니다', '환불 제한 가능성이 있으면 결제 전 흐름에서 안내합니다'],
    productPath: '/plans',
    nextAction: '상품 설명과 결제 전 고지를 같은 기준으로 맞추세요.'
  }
];

function nowIsoDefault() {
  return new Date().toISOString();
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeInterval(value, fallback = DEFAULT_INTERVAL_MS) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return clamp(Math.round(n), 60_000, 86_400_000);
}

function unique(items = []) {
  return [...new Set(items.map(item => String(item || '').trim()).filter(Boolean))];
}

function stripUrl(value = '') {
  const raw = normalizeText(value, '등록 사이트');
  try {
    const url = /^https?:\/\//i.test(raw) ? new URL(raw) : null;
    return url?.hostname ? url.hostname.replace(/^www\./i, '') : raw;
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '등록 사이트';
  }
}

function stableHash(value = '') {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickTopic(db = {}, options = {}) {
  const count = list(db.boards).filter(item => item?.agentSuiteVersion === SUITE_VERSION || item?.engine === 'product-agent-insight-v1').length;
  const seed = `${count}:${list(db.scans)[0]?.target || ''}:${list(db.sites)[0]?.domain || ''}:${options.reason || ''}`;
  return TOPICS[(count + stableHash(seed)) % TOPICS.length];
}

function resolveLatestScan(db = {}, fallbackBusinessProfile = {}) {
  return list(db.scans)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || b.generatedAt || 0) - Date.parse(a.createdAt || a.generatedAt || 0))[0] || {
      requestId: 'system-fallback-scan',
      target: fallbackBusinessProfile.domain || 'https://nv0.kr',
      industry: '온라인 사업',
      riskScore: 55,
      totalFindings: 3,
      topFindings: ['고객지원 안내', '환불 기준 위치', '개인정보 링크']
    };
}

export function buildProductRuntimeContext(db = {}, options = {}) {
  const businessProfile = options.businessProfile || db.settings?.businessProfile || {};
  const scans = list(db.scans);
  const sites = list(db.sites);
  const orders = list(db.orders);
  const boards = list(db.boards);
  const publications = list(db.publications);
  const latestScan = resolveLatestScan(db, businessProfile);
  const latestSite = sites.find(site => site.id === latestScan.siteId) || sites[0] || null;
  const target = latestSite?.domain || latestSite?.url || latestScan.target || businessProfile.domain || 'https://nv0.kr';
  const riskScore = Number(latestScan.riskScore ?? latestSite?.latestRiskScore ?? 55);
  const findings = unique([
    ...(Array.isArray(latestScan.topFindings) ? latestScan.topFindings : []),
    ...(Array.isArray(latestScan.detailFindings) ? latestScan.detailFindings.map(item => item.title || item.code) : []),
    '고객지원 안내',
    '환불 기준 위치',
    '개인정보 링크'
  ]).slice(0, 6);
  return {
    version: SUITE_VERSION,
    target,
    targetLabel: stripUrl(target),
    industry: latestScan.industry || latestSite?.industry || '온라인 사업',
    riskScore: Number.isFinite(riskScore) ? riskScore : 55,
    findingCount: Number(latestScan.totalFindings || latestScan.detailFindings?.length || findings.length || 0),
    findings,
    dataSignals: {
      scans: scans.length,
      sites: sites.length,
      orders: orders.length,
      publications: publications.length,
      boards: boards.length
    },
    latestScanId: latestScan.requestId || latestScan.id || null,
    latestSiteId: latestSite?.id || latestScan.siteId || null,
    businessName: businessProfile.tradeName || businessProfile.name || 'VERIDION'
  };
}

function estimateKoreanChars(value = '') {
  return String(value || '').replace(/\s+/g, '').length;
}

function buildBody(topic, context) {
  const findings = context.findings.slice(0, 4);
  const scoreLine = Number.isFinite(context.riskScore)
    ? `${context.targetLabel}의 최근 기준 점수는 ${context.riskScore}점으로 표시되며, 점수 자체보다 고객이 실제로 멈출 수 있는 위치를 함께 봐야 합니다.`
    : `${context.targetLabel}의 최근 기준은 공개 화면에서 고객이 확인해야 하는 안내 위치를 중심으로 봐야 합니다.`;
  const findingText = findings.length ? findings.join(', ') : '고객지원 안내, 환불 기준 위치, 개인정보 링크';
  return [
    `전문가 관점 요약\n${topic.keyword}은 단순한 게시글 주제가 아니라 VERIDION 제품 흐름과 직접 연결되는 운영 점검 항목입니다. ${scoreLine} 이번 인사이트는 ${context.industry} 사이트에서 ${findingText} 같은 항목을 어떻게 정리할지 설명합니다.`,
    `왜 지금 확인해야 하나요\n${topic.problem} 광고비를 늘리거나 상세페이지를 다시 쓰기 전에 고객이 행동 직전에 확인하는 안내가 제대로 보이는지 먼저 점검해야 합니다. 특히 모바일에서는 버튼, 정책 링크, 문의 경로가 좁은 화면 안에서 겹치거나 밀리면 고객 입장에서는 안내가 없는 것처럼 느껴질 수 있습니다.`,
    `제품 데이터로 보는 우선순위\n현재 패키지는 무료 진단, 기본 리포트, 전문가 리포트, 내 사이트 저장, 게시판 인사이트가 하나의 흐름으로 연결되어야 합니다. 진단 결과는 문제 후보를 찾고, 리포트는 근거와 수정 방향을 제공하며, 내 사이트 메뉴는 반복 점검을 관리합니다. 게시판 인사이트는 이 흐름을 고객이 다시 이해하도록 돕는 공개 콘텐츠 역할을 합니다.`,
    `실무 적용 순서\n${topic.checklist.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n4. 관련 화면을 수정한 뒤 같은 URL로 재진단하여 남은 항목을 비교합니다.\n5. 결과가 반복적으로 쌓이면 내 사이트 메뉴에서 우선순위를 다시 정리합니다.`,
    `좋은 문구 구조\n버튼 주변 문구는 짧고 구체적이어야 합니다. 예를 들어 “자세히 보기”보다 “제공 범위와 환불 기준 확인 후 신청하기”처럼 고객이 다음에 확인할 내용을 알려주는 방식이 좋습니다. 환불, 개인정보, 문의 경로는 하단에만 두지 말고 고객 행동이 일어나는 화면 주변에 요약과 링크를 함께 배치해야 합니다.`,
    `자동 발행과 품질 검수 방식\n이 인사이트는 제품 연관 엔진과 에이전트가 20분 주기로 발행 가능 여부를 확인한 뒤 생성합니다. 발행 전에는 제목 길이, 본문 길이, 제품 연결성, 내부 링크, 중복 여부, 공개 금지 토큰, 모바일 가독성 표현을 검수합니다. 검수에 실패한 글은 공개 게시판에 올리지 않는 구조로 설계되어야 합니다.`,
    `다음 행동\n${topic.nextAction} 바로 확인하려면 ${topic.productPath} 경로에서 관련 기능을 실행하면 됩니다. 무료 진단으로 현재 상태를 보고, 필요한 경우 기본 리포트나 전문가 리포트로 실제 수정 기준을 정리하는 흐름이 가장 안정적입니다.`,
    `관련 링크\n무료 진단: /products/veridion/demo\n요금제: /plans\n내 사이트 관리: /portal\n게시판: /board`
  ].join('\n\n');
}

export function buildProductInsightDraft(db = {}, options = {}) {
  const context = buildProductRuntimeContext(db, options);
  const topic = options.topic || pickTopic(db, options);
  const nowIso = options.nowIso || nowIsoDefault;
  const title = `${topic.title} — ${context.targetLabel}`.slice(0, 82);
  const body = buildBody(topic, context);
  const tags = unique([
    topic.keyword,
    topic.audience,
    'VERIDION',
    '무료진단',
    '사이트점검',
    '리포트상품',
    '인사이트자동발행',
    '고객신뢰',
    ...context.findings
  ]).slice(0, 10);
  return {
    title,
    status: 'draft',
    type: 'column',
    boardType: 'insight',
    category: '제품 연동 인사이트',
    primaryKeyword: topic.keyword,
    summary: `${topic.keyword} 관점에서 ${context.targetLabel}의 진단·리포트·내 사이트 관리 흐름을 실제 개선 순서로 정리합니다.`,
    body,
    tags,
    visibility: 'public',
    createdAt: nowIso(),
    publishedAt: null,
    engine: 'product-agent-insight-v1',
    agentSuiteVersion: SUITE_VERSION,
    autoPublished: options.autoPublished === true,
    publicationCadence: '20분마다 1건 발행',
    productContext: context,
    productPath: topic.productPath,
    quality: null
  };
}

export function auditProductInsightDraft(draft = {}, existingItems = []) {
  const body = String(draft.body || '');
  const title = normalizeText(draft.title);
  const tags = list(draft.tags);
  const internalTokens = [/contentFingerprint/i, /combinationMode/i, /publicDisplayVersion/i, /TODO\b/i, /FIXME\b/i, /example\.com/i];
  const duplicateKey = `${title}::${normalizeText(draft.summary)}`.toLowerCase();
  const duplicate = list(existingItems).some(item => `${normalizeText(item.title)}::${normalizeText(item.summary)}`.toLowerCase() === duplicateKey);
  const checks = [
    { key: 'title', pass: title.length >= 18 && title.length <= 90, weight: 12, message: '제목 길이와 의미가 적정해야 합니다.' },
    { key: 'bodyLength', pass: estimateKoreanChars(body) >= 900, weight: 18, message: '본문이 너무 짧지 않아야 합니다.' },
    { key: 'productRelevance', pass: /무료 진단|기본 리포트|전문가 리포트|내 사이트|VERIDION/.test(body), weight: 15, message: '제품 흐름과 직접 연결되어야 합니다.' },
    { key: 'links', pass: /\/products\/veridion\/demo/.test(body) && /\/plans/.test(body) && /\/portal/.test(body), weight: 12, message: '주요 내부 링크가 포함되어야 합니다.' },
    { key: 'tags', pass: tags.length >= 6, weight: 10, message: '검색·분류 태그가 충분해야 합니다.' },
    { key: 'noInternalTokens', pass: !internalTokens.some(rx => rx.test(`${title}\n${body}`)), weight: 15, message: '내부 토큰이나 예시 도메인이 공개되지 않아야 합니다.' },
    { key: 'notDuplicate', pass: !duplicate, weight: 10, message: '동일 제목·요약 중복 발행을 막아야 합니다.' },
    { key: 'readability', pass: body.split('\n\n').length >= 6 && !/[A-Za-z_]{28,}/.test(body), weight: 8, message: '문단 분리와 한글 가독성이 필요합니다.' }
  ];
  const score = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0);
  return {
    ok: checks.every(check => check.pass),
    score,
    maxScore: 100,
    checks,
    failed: checks.filter(check => !check.pass).map(check => check.key),
    auditedAt: nowIsoDefault(),
    suiteVersion: SUITE_VERSION
  };
}

export function ensureProductAgentSettings(db = {}, options = {}) {
  db.settings ||= {};
  db.productAgentState ||= {};
  let changed = false;
  const intervalMs = normalizeInterval(options.intervalMs ?? db.settings.productInsightAutopublishIntervalMs ?? db.settings.ctaAutopublishIntervalMs ?? DEFAULT_INTERVAL_MS);
  const set = (key, value) => {
    if (db.settings[key] !== value) {
      db.settings[key] = value;
      changed = true;
    }
  };
  set('ctaAutopublishEnabled', db.settings.ctaAutopublishEnabled !== false);
  set('ctaAutopublishIntervalMs', intervalMs);
  set('productInsightAutopublishEnabled', db.settings.productInsightAutopublishEnabled !== false);
  set('productInsightAutopublishIntervalMs', intervalMs);
  set('productAgentSuiteVersion', SUITE_VERSION);
  if (db.productAgentState.version !== SUITE_VERSION) {
    db.productAgentState.version = SUITE_VERSION;
    changed = true;
  }
  db.productAgentState.registry = PRODUCT_ENGINE_REGISTRY;
  db.productAgentState.cadence = { intervalMs, intervalMinutes: Math.round(intervalMs / 60000), label: `${Math.round(intervalMs / 60000)}분마다 1건 발행` };
  return { changed, intervalMs, state: db.productAgentState };
}

export function latestProductInsightPublication(db = {}) {
  return [...list(db.publications), ...list(db.boards)]
    .filter(item => item && (item.agentSuiteVersion === SUITE_VERSION || item.engine === 'product-agent-insight-v1' || item.autoPublished === true))
    .sort((a, b) => Date.parse(b.publishedAt || b.createdAt || 0) - Date.parse(a.publishedAt || a.createdAt || 0))[0] || null;
}

export function productInsightDueStatus(db = {}, options = {}) {
  const intervalMs = normalizeInterval(options.intervalMs ?? db.settings?.productInsightAutopublishIntervalMs ?? db.settings?.ctaAutopublishIntervalMs ?? DEFAULT_INTERVAL_MS);
  const last = latestProductInsightPublication(db);
  const lastTime = Date.parse(last?.publishedAt || last?.createdAt || 0);
  if (!last || !Number.isFinite(lastTime)) return { due: true, last: null, remainingMs: 0, elapsedMs: null, intervalMs };
  const nowMs = Number(options.nowMs || Date.now());
  const elapsedMs = nowMs - lastTime;
  const remainingMs = Math.max(0, intervalMs - elapsedMs);
  return { due: elapsedMs >= intervalMs, last, remainingMs, elapsedMs, intervalMs };
}

export function publishProductInsightNow(db = {}, options = {}) {
  db.publications ||= [];
  db.boards ||= [];
  const settings = ensureProductAgentSettings(db, options);
  const uid = typeof options.uid === 'function' ? options.uid : (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = typeof options.nowIso === 'function' ? options.nowIso : nowIsoDefault;
  const existing = [...list(db.publications), ...list(db.boards)];
  const draft = buildProductInsightDraft(db, { ...options, nowIso, autoPublished: options.autoPublished === true });
  const audit = auditProductInsightDraft(draft, existing);
  db.productAgentState ||= {};
  db.productAgentState.lastDraftAudit = audit;
  db.productAgentState.lastRunAt = nowIso();
  if (!audit.ok && options.force !== true) {
    const error = new Error(`인사이트 품질 검수 실패: ${audit.failed.join(', ')}`);
    error.code = 'PRODUCT_INSIGHT_QUALITY_FAILED';
    error.audit = audit;
    throw error;
  }
  const publishedAt = nowIso();
  const record = {
    ...draft,
    id: uid('insight'),
    status: 'published',
    type: 'column',
    boardType: 'insight',
    visibility: 'public',
    autoPublished: options.autoPublished === true,
    createdAt: publishedAt,
    publishedAt,
    quality: audit,
    scheduler: {
      intervalMs: settings.intervalMs,
      intervalMinutes: Math.round(settings.intervalMs / 60000),
      reason: options.reason || 'manual'
    }
  };
  const boardRecord = { ...record, id: uid('board'), publicationId: record.id };
  db.publications.unshift(record);
  db.boards.unshift(boardRecord);
  const seen = new Set();
  const dedupe = item => {
    const key = `${normalizeText(item.title)}::${normalizeText(item.summary)}`.toLowerCase();
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  db.publications = list(db.publications).filter(item => item && item.visibility !== 'private').filter(dedupe).slice(0, 120);
  seen.clear();
  db.boards = list(db.boards).filter(item => item && item.visibility !== 'private').filter(dedupe).slice(0, 120);
  db.productAgentState.lastPublishedAt = publishedAt;
  db.productAgentState.lastPublicationId = record.id;
  db.productAgentState.lastQualityScore = audit.score;
  db.productAgentState.totalPublished = list(db.boards).filter(item => item?.agentSuiteVersion === SUITE_VERSION || item?.engine === 'product-agent-insight-v1').length;
  return record;
}

export function publishProductInsightIfDue(db = {}, options = {}) {
  const settings = ensureProductAgentSettings(db, options);
  if (db.settings?.productInsightAutopublishEnabled === false && options.force !== true) return null;
  const due = productInsightDueStatus(db, { intervalMs: settings.intervalMs, nowMs: options.nowMs });
  db.productAgentState ||= {};
  db.productAgentState.lastDueStatus = { ...due, last: due.last ? { id: due.last.id, title: due.last.title, publishedAt: due.last.publishedAt || due.last.createdAt } : null };
  if (!due.due && options.force !== true) return null;
  return publishProductInsightNow(db, { ...options, intervalMs: settings.intervalMs, autoPublished: true });
}

export function buildProductAgentRuntimeStatus(db = {}, options = {}) {
  const settings = ensureProductAgentSettings(db, options);
  const due = productInsightDueStatus(db, { intervalMs: settings.intervalMs });
  const context = buildProductRuntimeContext(db, options);
  const latest = latestProductInsightPublication(db);
  return {
    ok: true,
    version: SUITE_VERSION,
    registry: PRODUCT_ENGINE_REGISTRY,
    cadence: settings.state.cadence,
    due: {
      due: due.due,
      remainingMs: due.remainingMs,
      elapsedMs: due.elapsedMs,
      lastPublishedAt: latest?.publishedAt || latest?.createdAt || null,
      lastTitle: latest?.title || null
    },
    context,
    quality: db.productAgentState?.lastDraftAudit || null,
    state: {
      lastRunAt: db.productAgentState?.lastRunAt || null,
      lastPublishedAt: db.productAgentState?.lastPublishedAt || null,
      totalPublished: db.productAgentState?.totalPublished || 0
    }
  };
}

export function runProductAgentPackageAudit({ files = [], packageJson = {}, routes = [] } = {}) {
  const requiredScopes = ['apps/', 'server/', 'shared/', 'scripts/', 'tests/', 'deploy/', 'docs/'];
  const hasFile = prefix => files.some(file => String(file).startsWith(prefix));
  const checks = [
    { key: 'registry', pass: PRODUCT_ENGINE_REGISTRY.length >= 7, weight: 12, message: '제품 엔진/에이전트 레지스트리' },
    { key: 'apps', pass: requiredScopes.every(hasFile), weight: 16, message: '패키지 주요 영역 파일 존재' },
    { key: 'script', pass: !!packageJson?.scripts?.['validate:phase280'], weight: 12, message: 'phase280 검증 스크립트 연결' },
    { key: 'finalScript', pass: !!packageJson?.scripts?.['phase280:final'], weight: 12, message: 'phase280 최종 게이트 연결' },
    { key: 'publicStatusRoute', pass: routes.includes('/api/public/product-agent-status'), weight: 12, message: '공개 상태 API' },
    { key: 'adminAuditRoute', pass: routes.includes('/api/admin/product-agents/audit'), weight: 12, message: '관리자 패키지 감사 API' },
    { key: 'cadence', pass: DEFAULT_INTERVAL_MS === 1_200_000, weight: 12, message: '20분 자동 발행 기본값' },
    { key: 'contentAudit', pass: typeof auditProductInsightDraft === 'function', weight: 12, message: '발행 전 품질 게이트' }
  ];
  const score = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0);
  return { ok: score === 100, score, maxScore: 100, version: SUITE_VERSION, checks, failed: checks.filter(check => !check.pass).map(check => check.key) };
}
