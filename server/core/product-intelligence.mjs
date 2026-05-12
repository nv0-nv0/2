function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(number(value, min))));
}

function text(value, fallback = '') {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function list(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback;
}

function scoreBand(score) {
  if (score >= 80) return { key: 'critical', label: '즉시 개선', urgency: 'P0', tone: 'danger' };
  if (score >= 60) return { key: 'high', label: '높은 위험', urgency: 'P1', tone: 'danger' };
  if (score >= 40) return { key: 'watch', label: '주의 필요', urgency: 'P1', tone: 'warn' };
  return { key: 'managed', label: '관리 가능', urgency: 'P2', tone: 'success' };
}

function findPriorityCounts(scan = {}) {
  const findings = list(scan.detailFindings);
  return findings.reduce((acc, item) => {
    const p = String(item?.priority || '').toUpperCase();
    if (p.includes('P0')) acc.p0 += 1;
    else if (p.includes('P1')) acc.p1 += 1;
    else acc.p2 += 1;
    acc.total += 1;
    return acc;
  }, { p0: 0, p1: 0, p2: 0, total: 0 });
}

function topFindingTitles(scan = {}, limit = 3) {
  const source = list(scan.detailFindings).length
    ? scan.detailFindings
    : list(scan.topFindings).map(title => ({ title }));
  return source.slice(0, limit).map(item => text(item?.title || item?.code || item, '점검 항목'));
}

function recommendedPlanFor(score, scan = {}) {
  const counts = findPriorityCounts(scan);
  if (score >= 45 || counts.p0 >= 1 || counts.p1 >= 1) return 'Expert';
  return 'Report';
}

function actionCopy(plan, scan = {}) {
  const findings = topFindingTitles(scan, 3);
  const problemText = findings.length ? findings.join(', ') : '정책·문의·고지 흐름';
  const copies = {
    Expert: {
      headline: '전문가 해설과 개선안이 필요한 상태입니다.',
      reason: `${problemText} 항목은 단순 점수보다 상세 근거와 구체적인 개선 방향을 함께 확인하는 편이 좋습니다.`,
      primaryCta: '전문가 리포트 보기',
      nextPath: ['/plans', '/checkout', '/portal']
    },
    Report: {
      headline: '먼저 리포트로 기준을 잡는 단계입니다.',
      reason: `큰 위험 신호는 제한적이지만 사이트 담당자가 놓치기 쉬운 ${problemText} 항목은 기본 리포트로 정리해 두면 후속 수정 판단이 쉬워집니다.`,
      primaryCta: '기본 리포트 보기',
      nextPath: ['/plans', '/products/veridion/demo', '/service']
    }
  };
  return copies[plan] || copies.Report;
}
function planFitReason(offer = {}, intelligence = {}) {
  const plan = offer.code;
  const recommended = intelligence.recommendedPlan;
  if (plan === recommended) return intelligence.reason;
  if (plan === 'Report') return '전체 수정 전에 근거와 우선순위를 한 번 정리해야 할 때 적합합니다.';
  if (plan === 'Expert') return '상세 근거와 전문가 해설, 맞춤 개선 방향이 필요할 때 적합합니다.';
  return offer.summary || '상황별 선택지입니다.';
}

export function annotateOffersWithIntelligence(offers = [], intelligence = {}) {
  const recommendedPlan = intelligence.recommendedPlan || 'Report';
  const score = intelligence.riskScore ?? 55;
  return list(offers).map((offer) => {
    let fitScore = 55;
    if (offer.code === recommendedPlan) fitScore = 98;
    else if (recommendedPlan === 'Expert' && offer.code === 'Report') fitScore = 78;
    else if (recommendedPlan === 'Report' && offer.code === 'Expert') fitScore = 72;
    else if (offer.group === 'b2b' || offer.group === 'annual') fitScore = score >= 60 ? 64 : 58;
    return {
      ...offer,
      smartFitScore: fitScore,
      smartRecommended: offer.code === recommendedPlan,
      smartReason: planFitReason(offer, intelligence)
    };
  }).sort((a, b) => {
    const delta = Number(b.smartFitScore || 0) - Number(a.smartFitScore || 0);
    return delta || Number(a.priority || 99) - Number(b.priority || 99);
  });
}

export function buildProductIntelligence({ scan = {}, site = null, riskScore = null, offers = [], source = 'runtime' } = {}) {
  const score = clamp(riskScore ?? scan.riskScore ?? scan.score?.value ?? site?.latestRiskScore ?? 55);
  const band = scoreBand(score);
  const recommendedPlan = recommendedPlanFor(score, scan);
  const copy = actionCopy(recommendedPlan, scan);
  const counts = findPriorityCounts(scan);
  const topFindings = topFindingTitles(scan, 4);
  const domain = text(site?.domain || scan.normalizedTarget || scan.target, '입력 사이트');
  const confidence = counts.total >= 3 ? 'high' : counts.total >= 1 ? 'medium' : 'guarded';
  const immediateActions = [
    topFindings[0] ? `${topFindings[0]} 항목을 가장 먼저 확인` : '푸터 사업자 정보와 고객지원 경로 확인',
    topFindings[1] ? `${topFindings[1]} 항목의 노출 위치와 문구 정리` : '환불·개인정보·이용약관 링크 위치 정리',
    `${recommendedPlan} 기준으로 다음 상품 선택`
  ];
  const intelligence = {
    version: 'p152-smart-product-v1',
    source,
    domain,
    riskScore: score,
    riskBand: band,
    recommendedPlan,
    headline: copy.headline,
    reason: copy.reason,
    primaryCta: copy.primaryCta,
    nextPath: copy.nextPath,
    topFindings,
    priorityCounts: counts,
    immediateActions,
    confidence,
    caveat: 'NV0 진단은 공개 화면과 내부 운영 규칙을 기준으로 한 보조 분석이며 법률 자문, 성과 보장, 외부 인증을 대신하지 않습니다.',
    smartDoD: [
      '사용자가 현재 위험도와 이유를 5초 안에 이해',
      '추천 상품과 다음 행동이 한 화면에서 연결',
      '확인 필요·주의 문구가 과장 없이 표시',
      '무료 진단 → 요금제 → 내 사이트 관리 흐름 유지'
    ]
  };
  intelligence.offerFit = annotateOffersWithIntelligence(offers, intelligence);
  return intelligence;
}

export function buildProductDashboard(db = {}) {
  const scans = list(db.scans);
  const latest = scans[0] || {};
  const score = clamp(latest.riskScore ?? latest.score?.value ?? 55);
  const columnCount = list(db.boards).filter(item => item.type === 'column' || item.engine === 'public-column-engine-v1').length;
  const siteCount = list(db.sites).length;
  const orderCount = list(db.orders).length;
  return {
    ok: true,
    version: 'p152-smart-product-v1',
    productScore: clamp(70 + Math.min(10, siteCount) + Math.min(10, columnCount / 5) + Math.min(10, orderCount / 3)),
    latestRiskScore: score,
    operatingSignals: {
      savedSites: siteCount,
      scans: scans.length,
      columns: columnCount,
      orders: orderCount
    },
    nextProductFocus: score >= 70 ? '고위험 진단 후 전문가 리포트 전환 흐름 강화' : '무료 진단 후 기본 리포트와 전문가 리포트 선택 이유 강화'
  };
}
