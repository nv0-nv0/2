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

function firstFinding(scan = {}) {
  const findings = list(scan.detailFindings);
  if (findings.length) return findings[0];
  const top = list(scan.topFindings);
  return top.length ? { title: top[0], priority: 'P1' } : null;
}

function priorityCounts(scan = {}) {
  return list(scan.detailFindings).reduce((acc, item) => {
    const p = String(item?.priority || '').toUpperCase();
    if (p.includes('P0')) acc.p0 += 1;
    else if (p.includes('P1')) acc.p1 += 1;
    else acc.p2 += 1;
    acc.total += 1;
    return acc;
  }, { p0: 0, p1: 0, p2: 0, total: 0 });
}

function planFor(score, counts = {}) {
  if (score >= 75 || counts.p0 >= 2) return 'Auto';
  if (score >= 45 || counts.p0 >= 1 || counts.p1 >= 1) return 'FixPack';
  return 'Report';
}

function riskStage(score) {
  if (score >= 75) return { key: 'urgent', label: '즉시 개선 구간', tone: 'danger', priority: 'P0' };
  if (score >= 55) return { key: 'decision', label: '구매 전 보강 구간', tone: 'warn', priority: 'P1' };
  if (score >= 35) return { key: 'cleanup', label: '문구 정리 구간', tone: 'notice', priority: 'P1' };
  return { key: 'maintain', label: '운영 유지 구간', tone: 'success', priority: 'P2' };
}

function buildPathState({ hasScan = false, hasSite = false, recommendedPlan = 'Report' } = {}) {
  return [
    { key: 'scan', title: '무료 진단', path: '/products/veridion/demo', status: hasScan ? 'done' : 'current', goal: '사이트의 신뢰 공백을 먼저 확인' },
    { key: 'understand', title: '결과 해석', path: '/products/veridion/demo', status: hasScan ? 'current' : 'locked', goal: '위험도·우선순위·근거 파악' },
    { key: 'choose', title: '상품 선택', path: `/plans?recommended=${encodeURIComponent(recommendedPlan)}`, status: hasScan ? 'next' : 'ready', goal: 'Report/FixPack/Auto 중 필요한 산출물 선택' },
    { key: 'manage', title: '내 사이트 관리', path: '/portal', status: hasSite ? 'ready' : 'locked', goal: '저장·재검사·게시판 발행으로 운영 루틴화' }
  ];
}

function buildActionCards({ scan = {}, intelligence = {}, recommendedPlan = 'Report', score = 55, counts = {}, first = null } = {}) {
  const issueTitle = text(first?.title || first?.code, '사업자 정보·환불·개인정보 고지');
  const base = [
    {
      key: 'primary-next',
      priority: score >= 70 ? 'P0' : 'P1',
      title: score >= 70 ? '고위험 항목부터 즉시 정리' : '가장 큰 신뢰 공백부터 확인',
      description: `${issueTitle} 항목을 먼저 확인하고, 고객이 결제 전 보는 위치에 문구를 배치하세요.`,
      path: `/plans?recommended=${encodeURIComponent(recommendedPlan)}&riskScore=${encodeURIComponent(score)}`,
      cta: intelligence.primaryCta || '추천 상품 보기'
    },
    {
      key: 'copy-fix',
      priority: counts.p0 || counts.p1 ? 'P1' : 'P2',
      title: '붙여넣기 가능한 수정 문구 확보',
      description: '푸터·환불·개인정보·광고 표현처럼 고객 오해가 생기는 문구를 바로 바꿀 수 있게 정리합니다.',
      path: '/documents',
      cta: '문서·문구 초안 보기'
    },
    {
      key: 'operating-loop',
      priority: recommendedPlan === 'Auto' ? 'P0' : 'P2',
      title: '재검사·게시판·이력 관리 루틴화',
      description: '한 번 고치고 끝나는 구조가 아니라, 사이트 변경 후 다시 검사하고 게시글로 재유입을 만드는 흐름을 유지합니다.',
      path: '/portal',
      cta: '내 사이트 관리'
    }
  ];
  if (recommendedPlan === 'Auto') {
    base.unshift({
      key: 'auto-loop',
      priority: 'P0',
      title: 'Auto 운영 루프 우선 적용',
      description: '고위험 또는 반복 변경 사이트는 정기 재진단과 CTA 발행을 묶어 운영 신호를 계속 유지하는 편이 효율적입니다.',
      path: '/plans?recommended=Auto',
      cta: 'Auto 보기'
    });
  }
  return base.slice(0, 4);
}

function buildFrictionRemovers(score, counts) {
  const items = [
    { key: 'no-email-first', title: '처음부터 이메일을 요구하지 않기', reason: '무료 요약 결과를 먼저 보여줘야 진단 가치가 바로 전달됩니다.' },
    { key: 'one-primary-cta', title: '한 화면에는 대표 CTA 하나만 강조', reason: '무료 진단, 요금제, 문서 생성이 동시에 강하게 보이면 사용자가 다음 행동을 놓칩니다.' },
    { key: 'plain-risk-copy', title: '위험 표현은 공포보다 실행 순서 중심', reason: '과장 대신 “무엇을 어디서 고칠지”를 보여줘야 신뢰가 유지됩니다.' }
  ];
  if (score >= 70 || counts.p0 > 0) items.push({ key: 'show-proof-before-price', title: '가격보다 근거와 우선순위 먼저 제시', reason: '고위험 결과에서는 요금보다 왜 이 상품이 필요한지 먼저 설명해야 전환이 자연스럽습니다.' });
  return items.slice(0, 4);
}

function buildSmartBacklog(scan = {}, recommendedPlan = 'Report') {
  const findings = list(scan.detailFindings).slice(0, 5);
  if (!findings.length) {
    return [
      { id: 'footer-trust', priority: 'P1', title: '푸터 사업자·고객지원 고지 확인', product: 'FixPack', status: 'ready' },
      { id: 'refund-privacy', priority: 'P1', title: '환불·개인정보·약관 링크 위치 확인', product: 'Report', status: 'ready' },
      { id: 'cta-path', priority: 'P2', title: '무료 진단 → 요금제 → 내 사이트 관리 흐름 확인', product: 'Auto', status: 'ready' }
    ];
  }
  return findings.map((item, index) => ({
    id: text(item.code, `finding-${index + 1}`),
    priority: text(item.priority, index === 0 ? 'P0' : 'P1'),
    title: text(item.title || item.recommendation, '점검 항목'),
    product: index === 0 && recommendedPlan === 'Auto' ? 'Auto' : index < 2 ? 'FixPack' : 'Report',
    status: 'ready'
  }));
}

export function buildSmartProductOrchestration({ scan = {}, site = null, intelligence = {}, offers = [], dashboard = {}, source = 'runtime' } = {}) {
  const counts = priorityCounts(scan);
  const score = clamp(intelligence.riskScore ?? scan.riskScore ?? scan.score?.value ?? site?.latestRiskScore ?? 55);
  const stage = riskStage(score);
  const recommendedPlan = text(intelligence.recommendedPlan, planFor(score, counts));
  const first = firstFinding(scan);
  const hasScan = Boolean(scan.requestId || scan.target || scan.normalizedTarget || counts.total);
  const hasSite = Boolean(site?.id || scan.siteId);
  const domain = text(site?.domain || scan.normalizedTarget || scan.target, '진단 전 사이트');
  const nextBestAction = {
    key: stage.key === 'urgent' ? 'fix-critical-first' : hasScan ? 'choose-product-by-result' : 'start-free-diagnosis',
    priority: stage.priority,
    title: hasScan ? `${recommendedPlan} 기준으로 다음 행동 선택` : '무료 진단으로 먼저 상태 확인',
    description: hasScan
      ? `${domain}의 현재 위험도 ${score}점 기준으로 ${recommendedPlan} 흐름이 가장 자연스럽습니다.`
      : '이메일 입력 없이 무료 요약 결과를 먼저 보여주고, 결과에 따라 리포트·문구안·Auto를 추천합니다.',
    path: hasScan ? `/plans?riskScore=${encodeURIComponent(score)}${hasSite ? `&siteId=${encodeURIComponent(site?.id || scan.siteId)}` : ''}` : '/products/veridion/demo',
    cta: hasScan ? (intelligence.primaryCta || '추천 상품 보기') : '무료 진단 시작'
  };
  const actionCards = buildActionCards({ scan, intelligence, recommendedPlan, score, counts, first });
  const conversionPath = buildPathState({ hasScan, hasSite, recommendedPlan });
  const backlog = buildSmartBacklog(scan, recommendedPlan);
  const frictionRemovers = buildFrictionRemovers(score, counts);
  const offerCodes = list(offers).map(item => item.code).filter(Boolean);
  return {
    ok: true,
    version: 'p153-smart-ops-v1',
    source,
    domain,
    score,
    stage,
    recommendedPlan,
    confidence: counts.total >= 3 ? 'high' : hasScan ? 'medium' : 'pre-scan',
    nextBestAction,
    actionCards,
    conversionPath,
    smartBacklog: backlog,
    frictionRemovers,
    operatingLoop: [
      '무료 진단으로 신뢰 공백 확인',
      '결과에 맞춰 상세 리포트/FixPack/Auto 자동 추천',
      '내 사이트 관리에서 저장·재검사',
      '콘텐츠 보드으로 재유입 콘텐츠 발행'
    ],
    productFit: {
      recommendedPlan,
      availableOfferCount: offerCodes.length,
      offerCodes,
      dashboardScore: dashboard.productScore || null
    },
    caveat: 'NV0는 운영 점검과 문구 정리를 돕는 보조 도구입니다. 법률 자문, 성과 보장, 외부 인증을 대신하지 않습니다.'
  };
}

export function buildSmartPublicSnapshot(db = {}, { offers = [], intelligence = null } = {}) {
  const scans = list(db.scans);
  const sites = list(db.sites);
  const boards = list(db.boards);
  const latestScan = scans[0] || {};
  const latestSite = latestScan.siteId ? sites.find(item => item.id === latestScan.siteId) : sites[0] || null;
  const orchestration = buildSmartProductOrchestration({
    scan: latestScan,
    site: latestSite,
    intelligence: intelligence || {},
    offers,
    dashboard: {
      productScore: clamp(68 + Math.min(12, scans.length) + Math.min(10, boards.length / 3) + Math.min(10, sites.length))
    },
    source: 'public-snapshot'
  });
  const productScore = clamp(68 + Math.min(12, scans.length) + Math.min(10, boards.length / 3) + Math.min(10, sites.length));
  return {
    ok: true,
    version: 'p153-smart-ops-v1',
    productScore,
    signals: {
      scans: scans.length,
      savedSites: sites.length,
      ctaPosts: boards.length,
      hasLatestScan: Boolean(latestScan.requestId || latestScan.target)
    },
    headline: orchestration.nextBestAction.title,
    summary: orchestration.nextBestAction.description,
    quickWins: orchestration.frictionRemovers,
    orchestration
  };
}
