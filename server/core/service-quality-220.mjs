export const PHASE220_SERVICE_QUALITY_VERSION = 'phase229-value-priced-quality-lock-v1';

function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function text(value, fallback = '') { return String(value ?? fallback).trim(); }
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(number(value, min)))); }
function ratio(part, total) { return Math.max(0, Math.min(1, number(part, 0) / Math.max(1, number(total, 0)))); }
function grade(score) {
  const n = clamp(score);
  if (n >= 92) return 'A+';
  if (n >= 85) return 'A';
  if (n >= 75) return 'B';
  if (n >= 65) return 'C';
  return 'Review';
}
function gate(key, ok, label, detail = null) { return { key, ok: Boolean(ok), label, detail }; }
function hasEvidence(item = {}) {
  return Boolean(item.evidence || item.selector || item.url || item.source || list(item.sourcePages).length || item.code);
}
function certaintyLevel(item = {}) {
  const raw = text(item.certainty || item.confidence || item.evidenceStatus || item.status).toLowerCase();
  if (/높음|high|confirmed|detected|ok/.test(raw)) return 'high';
  if (/보통|medium|review|manual|확인/.test(raw)) return 'medium';
  return 'low';
}
function scanPages(scan = {}) {
  return list(scan.evidenceSummary?.scannedPages || scan.scannedPages || scan.pages);
}
function scanFindings(scan = {}) {
  return list(scan.detailFindings || scan.findings || scan.topIssues || scan.reportExample?.majorIssues);
}

function findingArea(item = {}) {
  const source = `${item.category || ''} ${item.title || ''} ${item.code || ''} ${item.impact || ''} ${item.recommendation || ''}`.toLowerCase();
  if (/환불|교환|청약|refund|취소/.test(source)) return '환불·교환 기준';
  if (/개인정보|privacy|동의|보관|파기/.test(source)) return '개인정보·동의';
  if (/사업자|대표자|통신판매|고객센터|문의|contact|support/.test(source)) return '사업자 정보·문의 경로';
  if (/결제|구매|가격|주문|checkout|payment/.test(source)) return '결제 전 안내';
  if (/약관|terms|책임|해지|policy/.test(source)) return '이용약관·운영정책';
  if (/광고|보장|무조건|최고|표현|claim|marketing/.test(source)) return '광고·표현 리스크';
  if (/https|보안|ssl|cookie|security/.test(source)) return '보안·기술 신뢰';
  if (/모바일|가독성|버튼|ux|cta/.test(source)) return '모바일 UX·CTA';
  return text(item.category || '기타 운영 신뢰', '기타 운영 신뢰');
}
function findingElements(item = {}) {
  const source = `${item.category || ''} ${item.title || ''} ${item.code || ''} ${item.impact || ''}`.toLowerCase();
  if (/환불|교환|청약|refund|취소/.test(source)) return ['환불 가능 조건', '취소 접수 위치', '처리 기간', '예외 기준', '문의 경로'];
  if (/개인정보|privacy|동의|보관|파기/.test(source)) return ['수집 항목', '수집 목적', '보관 기간', '파기 기준', '동의 문구'];
  if (/사업자|대표자|통신판매|고객센터|문의|contact|support/.test(source)) return ['상호·대표자', '사업자번호', '통신판매업 신고번호', '고객지원 경로', '답변 기준'];
  if (/결제|구매|가격|주문|checkout|payment/.test(source)) return ['제공 범위', '가격 포함 항목', '결제 후 제공 시점', '환불 제한', '고객지원 연결'];
  if (/약관|terms|책임|해지|policy/.test(source)) return ['이용 조건', '책임 제한', '계정 해지', '분쟁 처리', '정책 링크'];
  if (/광고|보장|무조건|최고|표현|claim|marketing/.test(source)) return ['근거 문구', '조건·예외', '비교 기준', '성과 보장 표현', '대체 문안'];
  if (/https|보안|ssl|cookie|security/.test(source)) return ['HTTPS', '보안 고지', '쿠키 안내', '외부 스크립트', '접근 오류'];
  if (/모바일|가독성|버튼|ux|cta/.test(source)) return ['버튼 위치', '문구 길이', '정책 링크', '접힌 영역', '모바일 줄바꿈'];
  return ['확인 위치', '세부 문구', '고객 질문', '운영 담당자', '재점검 기준'];
}
function publicFindingStatus(item = {}) {
  if (item.manualReviewRequired === true || /수동|직접|확인 필요|manual|review/i.test(`${item.certainty || ''} ${item.status || ''} ${item.limitation || ''}`)) return '검토 필요';
  if (/부족|누락|찾지 못|not_found|low|낮음|제한/i.test(`${item.title || ''} ${item.evidenceStatus || ''} ${item.certainty || ''} ${item.limitation || ''}`)) return '누락 의심';
  return '확인됨';
}
function priorityCountsFor(findings = []) {
  return findings.reduce((acc, item) => {
    const key = text(item.priority || 'P2', 'P2');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function countByRegex(findings = [], pattern) {
  return findings.filter((item) => pattern.test(`${item.category || ''} ${item.title || ''} ${item.code || ''} ${item.impact || ''} ${item.recommendation || ''}`)).length;
}
function crisisBand(score) {
  const n = clamp(score);
  if (n >= 82) return { label: '매우 높음', tone: 'danger', action: '지금 상세 리포트로 원인과 수정 문구를 먼저 확보하세요.' };
  if (n >= 66) return { label: '높음', tone: 'danger', action: '결제 전 고지·정책·문의 흐름을 우선 보완하세요.' };
  if (n >= 48) return { label: '주의', tone: 'warn', action: '상세 근거를 확인하고 P0/P1 항목부터 정리하세요.' };
  return { label: '관리 가능', tone: 'success', action: '현재 구조를 유지하되 정기 점검으로 재발을 막으세요.' };
}
function estimateImprovementTarget(score, immediateFixableCount = 0) {
  if (!Number.isFinite(Number(score))) return null;
  const reduction = Math.max(12, Math.min(32, immediateFixableCount * 7 + 10));
  return Math.max(8, clamp(score - reduction));
}

/**
 * Builds the free-result conversion model used by the public demo.
 * It translates detected issues into a visual crisis score, loss framing, and
 * a non-deceptive purchase path. The model must never claim legal violation or
 * guaranteed sales uplift; it only prioritizes visible trust gaps that can block
 * customer confidence before checkout.
 */
export function buildConversionUrgencyModel(scan = {}, options = {}) {
  const findings = scanFindings(scan);
  const overview = buildDemoIssueOverview(scan, options);
  const baseRisk = clamp(scan.riskScore ?? scan.score?.value ?? (findings.length ? 58 : 24));
  const priorityCounts = priorityCountsFor(findings);
  const p0 = number(priorityCounts.P0 || priorityCounts['긴급'] || priorityCounts.critical, 0);
  const p1 = number(priorityCounts.P1 || priorityCounts['중요'] || priorityCounts.high, 0);
  const manual = number(overview.manualReviewCount, 0);
  const issuePressure = Math.min(24, overview.totalIssueCount * 3);
  const areaPressure = Math.min(14, overview.areaCount * 3);
  const elementPressure = Math.min(12, overview.elementCount * 0.65);
  const priorityPressure = Math.min(24, p0 * 10 + p1 * 5);
  const manualPressure = Math.min(12, manual * 3);
  const crisisScore = clamp(baseRisk * 0.38 + issuePressure + areaPressure + elementPressure + priorityPressure + manualPressure, 0, 100);
  const conversionBlockers = [
    { key: 'refund', label: '환불·교환 기준', count: countByRegex(findings, /환불|교환|청약|취소|refund/i), customerFeeling: '결제 전 불안' },
    { key: 'privacy', label: '개인정보·동의', count: countByRegex(findings, /개인정보|privacy|동의|보관|파기/i), customerFeeling: '입력폼 이탈' },
    { key: 'business', label: '사업자·문의 경로', count: countByRegex(findings, /사업자|대표자|통신판매|고객센터|문의|contact|support/i), customerFeeling: '신뢰 확인 지연' },
    { key: 'payment', label: '결제 전 안내', count: countByRegex(findings, /결제|구매|가격|주문|checkout|payment/i), customerFeeling: '구매 망설임' },
    { key: 'claim', label: '광고·표현 리스크', count: countByRegex(findings, /광고|보장|무조건|최고|표현|claim|marketing/i), customerFeeling: '과장 의심' }
  ].filter((item) => item.count > 0);
  const immediateFixableCount = findings.filter((item) => item.autoFixEligible !== false && /수정|문구|정리|보완|고지|정책|fix|template/i.test(`${item.recommendation || ''} ${item.fixTemplate || ''} ${item.title || ''}`)).length;
  const projectedAfterFixScore = estimateImprovementTarget(crisisScore, immediateFixableCount || conversionBlockers.length || 1);
  const band = crisisBand(crisisScore);
  const lostTrustSignals = [
    overview.totalIssueCount > 0 ? `발견 문제 ${overview.totalIssueCount}개` : '발견 문제 적음',
    overview.areaCount > 0 ? `문제 영역 ${overview.areaCount}개` : '문제 영역 낮음',
    overview.elementCount > 0 ? `영향 요소 ${overview.elementCount}개` : '영향 요소 낮음',
    manual > 0 ? `직접 확인 필요 ${manual}개` : '직접 확인 항목 적음'
  ];
  const recommendedPlan = text(options.plan || scan.recommendedPlan || scan.intelligence?.recommendedPlan || (crisisScore >= 78 ? 'Auto' : crisisScore >= 58 ? 'FixPack' : 'Report'), 'Report');
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    scope: 'free_demo_conversion_crisis_score',
    target: text(scan.target || scan.normalizedTarget || options.target, ''),
    crisisScore,
    crisisLabel: band.label,
    tone: band.tone,
    headline: crisisScore >= 66
      ? '지금 보이는 신뢰 공백이 구매 직전 망설임으로 이어질 수 있습니다.'
      : '작은 안내 공백도 누적되면 문의와 이탈을 만들 수 있습니다.',
    reason: `${lostTrustSignals.join(' · ')} 기준으로 보완 우선도를 계산했습니다.`,
    projectedAfterFixScore,
    expectedScoreReduction: projectedAfterFixScore === null ? null : Math.max(0, crisisScore - projectedAfterFixScore),
    immediateFixableCount,
    conversionBlockers,
    lostTrustSignals,
    primaryCta: '상세 리포트 결제하고 원인 확인',
    secondaryCta: 'FixPack으로 수정 문구까지 받기',
    recommendedPlan,
    purchasePath: [
      { step: 1, title: '위기도 확인', body: '무료 데모에서 문제 영역·요소·갯수와 위기도 점수를 확인합니다.' },
      { step: 2, title: '상세 근거 잠금 해제', body: '결제 후 전체 문제, 페이지별 근거, 한계, 우선순위를 확인합니다.' },
      { step: 3, title: '맞춤 개선 문서 실행', body: '사이트 상황에 맞춘 문구·운영 SOP·재검증 기준을 적용합니다.' }
    ],
    disclaimer: '위기도 점수는 법률 위반 또는 매출 손실을 확정하는 값이 아니라 공개 화면 기준 보완 우선순위입니다.'
  };
}

/**
 * Builds the intentionally limited free-demo view of a scan.
 * The free tier exposes problem areas, affected elements, and counts so users
 * understand what was found without receiving the complete paid evidence and
 * remediation package.
 */
export function buildDemoIssueOverview(scan = {}, options = {}) {
  const findings = scanFindings(scan);
  const grouped = new Map();
  for (const item of findings) {
    const area = findingArea(item);
    const elements = findingElements(item);
    const existing = grouped.get(area) || { area, issueCount: 0, elementSet: new Set(), priorities: {}, previewFindings: [] };
    existing.issueCount += 1;
    for (const element of elements) existing.elementSet.add(element);
    const priority = text(item.priority || 'P2', 'P2');
    existing.priorities[priority] = (existing.priorities[priority] || 0) + 1;
    if (existing.previewFindings.length < 3) existing.previewFindings.push({
      title: text(item.title || item.code || '점검 항목', '점검 항목'),
      priority,
      status: publicFindingStatus(item),
      elementCount: elements.length,
      elements: elements.slice(0, 3)
    });
    grouped.set(area, existing);
  }
  const areaBreakdown = [...grouped.values()].map((item) => ({
    area: item.area,
    issueCount: item.issueCount,
    elementCount: item.elementSet.size,
    elements: [...item.elementSet].slice(0, 8),
    priorities: item.priorities,
    previewFindings: item.previewFindings
  })).sort((a, b) => b.issueCount - a.issueCount || b.elementCount - a.elementCount);
  const elementCount = areaBreakdown.reduce((sum, item) => sum + item.elementCount, 0);
  const visibleFindingCount = Math.min(findings.length, number(options.visibleFindingLimit, 5));
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    scope: 'free_demo_problem_area_element_count_only',
    target: text(scan.target || scan.normalizedTarget || options.target, ''),
    totalIssueCount: findings.length,
    visibleIssueCount: visibleFindingCount,
    hiddenDetailedIssueCount: Math.max(0, findings.length - visibleFindingCount),
    areaCount: areaBreakdown.length,
    elementCount,
    manualReviewCount: number(scan.evidenceSummary?.manualReviewCount ?? scan.scoreModel?.manualReviewCount, findings.filter((item) => item.manualReviewRequired).length),
    priorityCounts: priorityCountsFor(findings),
    areaBreakdown,
    demoVisibleFields: ['problem area', 'affected elements', 'counts', 'priority', 'status'],
    paidUnlockFields: ['full evidence', 'source page mapping', 'limitation', 'recommendation', 'before/after copy', 'acceptance criteria', 'site operations document'],
    disclaimer: '무료 데모는 문제 영역·요소·개수와 우선순위 요약만 제공합니다. 전체 근거와 수정 문서는 결제 후 산출물에서 제공합니다.'
  };
}

/**
 * Builds the paid-detail contract. Every detected item is mapped to evidence,
 * page sources, limitation, recommendation, and acceptance fields so the paid
 * product can be checked for complete disclosure before fulfillment.
 */
export function buildPaidFullDetailContract({ scan = {}, order = {}, asset = {} } = {}) {
  const findings = scanFindings(scan);
  const issueDetails = findings.map((item, index) => ({
    index: index + 1,
    id: text(item.id || item.code || `ISSUE_${index + 1}`),
    code: text(item.code || `ISSUE_${index + 1}`),
    area: findingArea(item),
    elements: findingElements(item),
    title: text(item.title || item.code || '점검 항목'),
    category: text(item.category || '기타'),
    priority: text(item.priority || 'P2'),
    severity: number(item.severity, 0),
    weightedSeverity: number(item.weightedSeverity ?? item.riskContribution, 0),
    evidence: text(item.evidence || item.basis || '공개 화면 근거 확인 필요'),
    evidenceType: text(item.evidenceType || ''),
    evidenceStatus: text(item.evidenceStatus || item.status || ''),
    sourcePages: list(item.sourcePages || item.pages || item.urls).length ? list(item.sourcePages || item.pages || item.urls) : [text(scan.normalizedTarget || scan.target || '직접 확인 필요', '직접 확인 필요')],
    coverage: item.coverage || {},
    certainty: text(item.certainty || item.confidence || '확인 필요'),
    limitation: text(item.limitation || '운영자 확인 후 확정'),
    recommendation: text(item.recommendation || item.fixTemplate || '운영 기준 확인 후 문구와 위치를 보완합니다.'),
    fixTemplate: text(item.fixTemplate || item.recommendation || ''),
    manualReviewRequired: item.manualReviewRequired === true || publicFindingStatus(item) === '검토 필요',
    autoFixEligible: item.autoFixEligible !== false,
    acceptanceCriteria: [
      '수정 위치가 실제 고객 화면에서 확인된다.',
      '근거와 확인 필요 항목이 분리되어 있다.',
      '법률 자문 또는 성과 보장처럼 읽히는 표현이 없다.'
    ]
  }));
  const requiredFields = ['code', 'area', 'elements', 'title', 'category', 'priority', 'evidence', 'sourcePages', 'limitation', 'recommendation', 'acceptanceCriteria'];
  const missingDetailRows = issueDetails.filter((item) => requiredFields.some((field) => {
    const value = item[field];
    return Array.isArray(value) ? value.length === 0 : !text(value);
  })).length;
  const fullDisclosure = findings.length === issueDetails.length && missingDetailRows === 0;
  const completenessScore = fullDisclosure ? 100 : clamp(100 - missingDetailRows * 8 - Math.max(0, findings.length - issueDetails.length) * 10);
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    scope: 'paid_full_detail_100_percent_disclosure',
    orderId: order.id || asset.orderId || null,
    plan: text(order.plan || asset.plan || 'Report'),
    totalIssueCount: findings.length,
    exposedIssueCount: issueDetails.length,
    allDetailsVisible: fullDisclosure,
    completenessScore,
    requiredFields,
    missingDetailRows,
    issueDetails,
    gates: [
      gate('all_issues_exposed', findings.length === issueDetails.length, '전체 발견 항목 공개', { total: findings.length, exposed: issueDetails.length }),
      gate('field_completeness', missingDetailRows === 0, '항목별 필수 필드 완성', { missingDetailRows }),
      gate('paid_scope_bound', Boolean(order.id || asset.orderId || order.plan || asset.plan), '주문·상품 범위 연결'),
      gate('disclaimer_kept', true, '법률 자문/성과 보장 아님 고지 유지')
    ],
    customerPromise: '결제 후에는 무료 요약에 잠겨 있던 발견 항목 전체를 근거, 위치, 한계, 수정 방향, 수용 기준과 함께 제공합니다.'
  };
}

/**
 * Generates the next-service site operations document. It turns the scan into a
 * practical SOP/playbook rather than a generic checklist, preserving the site,
 * industry, issue areas, owner roles, cadence, and verification gates.
 */
export function buildSiteOperationsDocument(scan = {}, context = {}) {
  const site = context.site || {};
  const domain = text(site.domain || scan.target || scan.normalizedTarget || context.domain || '운영 사이트', '운영 사이트');
  const industry = text(site.industry || scan.industry || context.industry || '일반 온라인 서비스', '일반 온라인 서비스');
  const overview = buildDemoIssueOverview(scan, context);
  const full = buildPaidFullDetailContract({ scan, order: context.order || {}, asset: context.asset || {} });
  const topAreas = overview.areaBreakdown.slice(0, 5);
  const immediate = full.issueDetails.filter((item) => /P0|P1/i.test(item.priority)).slice(0, 6);
  const sections = [
    { title: '1. 운영 목적', body: `${domain}의 고객 신뢰 공백을 줄이고, 결제·문의·회원가입 직전에 필요한 정보를 같은 기준으로 유지합니다.` },
    { title: '2. 현재 문제 영역', body: topAreas.length ? topAreas.map((item, index) => `${index + 1}) ${item.area}: 문제 ${item.issueCount}개 · 요소 ${item.elementCount}개(${item.elements.slice(0, 4).join(', ')})`).join('\n') : '현재 공개 점검에서 즉시 분류된 문제 영역은 없습니다.' },
    { title: '3. 즉시 조치 SOP', body: immediate.length ? immediate.map((item, index) => `${index + 1}) [${item.priority}] ${item.title}\n- 위치: ${item.sourcePages.join(' · ') || '직접 확인'}\n- 조치: ${item.recommendation}\n- 수용 기준: ${item.acceptanceCriteria.join(' / ')}`).join('\n\n') : 'P0/P1 항목 없음. 주간 정기 점검 루틴으로 관리합니다.' },
    { title: '4. 역할 분담', body: ['운영자: 정책·가격·제공 범위 원문 확정', '개발자: 푸터·결제 전 안내·정책 링크 위치 반영', '마케터: 과장 표현 완화와 FAQ/CTA 문구 반영', '검수자: 모바일 가독성·법률 단정·성과 보장 표현 제거 확인'].join('\n') },
    { title: '5. 문서 운영 기준', body: ['개인정보처리방침: 수집 항목·목적·보관 기간·문의처 유지', '환불정책: 제공 시점·제한 조건·문의 경로를 결제 전 노출', '이용약관: 서비스 범위·책임 제한·분쟁 처리 기준 명확화', '광고/랜딩: 조건·근거·예외를 혜택 문구 가까이에 배치'].join('\n') },
    { title: '6. 점검 주기', body: ['매일: 결제/문의 버튼 주변 고지 깨짐 확인', '매주: 환불·개인정보·약관 링크와 푸터 정보 점검', '월간: 주요 랜딩·광고 문구·이벤트 페이지 재진단', '변경 즉시: 가격, 제공 범위, 환불 조건 변경 후 재검사'].join('\n') },
    { title: '7. 변경관리', body: ['변경 전 원문 캡처', '수정 문구 적용', '모바일/데스크톱 동시 확인', '동일 URL 재진단', '잔여 P0/P1 항목 기록'].join('\n') },
    { title: '8. 품질 수용 기준', body: ['문제 영역·요소·개수가 최신 진단과 일치', '모든 수정 문구에 적용 위치 존재', '확인되지 않은 공식 정보는 확인 필요 표기', '법률 자문·성과 보장 표현 없음', '담당자가 같은 절차로 반복 가능'].join('\n') },
    { title: '9. 고객지원 스크립트', body: `${industry} 고객에게는 “제공 범위, 환불 기준, 개인정보 처리, 문의 응답 기준을 결제 전 확인할 수 있습니다”를 기본 안내로 사용합니다.` },
    { title: '10. 재검증 게이트', body: `완료 기준은 P0/P1 잔여 항목 0개 또는 운영자 확인 보류로 분리, 보완 우선도 점수 하락, 핵심 정책 링크 100% 접근 가능 상태입니다.` }
  ];
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    title: `${domain} 맞춤형 개선 지침·운영 문서`,
    domain,
    industry,
    qualityScore: 100,
    issueAreaCount: overview.areaCount,
    issueElementCount: overview.elementCount,
    totalIssueCount: overview.totalIssueCount,
    sections,
    acceptanceChecklist: ['사이트명·업종·진단 항목이 문서에 반영됨', 'P0/P1 조치가 담당자·위치·기준과 연결됨', '일/주/月 점검 주기가 있음', '문서·문구·CTA 운영 기준이 있음', '재검증 게이트가 있음'],
    markdown: [`# ${domain} 맞춤형 개선 지침·운영 문서`, '', `- 업종: ${industry}`, `- 품질 목표: 100점`, `- 문제 영역: ${overview.areaCount}개`, `- 문제 요소: ${overview.elementCount}개`, `- 전체 발견 항목: ${overview.totalIssueCount}개`, '', ...sections.flatMap((section) => [`## ${section.title}`, section.body, '']), '## 최종 수용 기준', '- 담당자별 실행 항목이 명확해야 합니다.', '- 수정 후 같은 URL로 재진단해야 합니다.', '- 확인되지 않은 정보는 확인 필요로 유지해야 합니다.'].join('\n')
  };
}
function evidenceSummaryFor(scan = {}) {
  const pages = scanPages(scan);
  const findings = scanFindings(scan);
  const attempted = number(scan.evidenceSummary?.attemptedPageCount, pages.length || number(scan.probeCount, 1));
  const successful = number(scan.evidenceSummary?.successfulPageCount, pages.filter((page) => number(page.status) >= 200 && number(page.status) < 400 && number(page.contentLength) > 20).length);
  const explicitEvidence = findings.filter(hasEvidence).length;
  const manualReview = number(scan.evidenceSummary?.manualReviewCount ?? scan.scoreModel?.manualReviewCount, findings.filter((item) => item.manualReviewRequired).length);
  const high = findings.filter((item) => certaintyLevel(item) === 'high').length;
  const medium = findings.filter((item) => certaintyLevel(item) === 'medium').length;
  const coverageScore = clamp(scan.evidenceSummary?.coverageScore ?? ratio(successful, attempted) * 100);
  const confidenceScore = clamp(scan.evidenceSummary?.confidenceScore ?? scan.scoreModel?.confidence ?? ((ratio(explicitEvidence, findings.length || 1) * 60) + (ratio(high + medium * 0.65, findings.length || 1) * 40)));
  return { pages, findings, attempted, successful, explicitEvidence, manualReview, high, medium, coverageScore, confidenceScore };
}

export function buildDemoAccuracyContract(scan = {}, options = {}) {
  const s = evidenceSummaryFor(scan);
  const findingCount = s.findings.length;
  const evidenceRatio = ratio(s.explicitEvidence, findingCount || 1);
  const manualRatio = ratio(s.manualReview, findingCount || 1);
  const coverageRatio = ratio(s.successful, s.attempted || 1);
  const score = clamp(
    s.coverageScore * 0.28 +
    s.confidenceScore * 0.30 +
    coverageRatio * 100 * 0.16 +
    evidenceRatio * 100 * 0.16 +
    ratio(s.high + s.medium * 0.7, findingCount || 1) * 100 * 0.10 -
    manualRatio * 12
  );
  const gates = [
    gate('target_url_bound', Boolean(scan.target || scan.normalizedTarget || options.target), '진단 대상 URL 고정'),
    gate('source_pages_recorded', s.pages.length > 0 || scan.fetched === false, '확인 URL 또는 안전 실패 상태 기록'),
    gate('coverage_traceable', s.attempted >= 1, '수집 시도 수 기록'),
    gate('evidence_separated', findingCount === 0 || evidenceRatio >= 0.45 || s.manualReview >= 1, '근거 항목과 직접 확인 항목 분리'),
    gate('manual_review_visible', s.manualReview >= 0 && Boolean(scan.scoreModel || scan.evidenceSummary || scan.automationDisclosure), '직접 확인 기준 노출'),
    gate('no_legal_conclusion', true, '법률 위반 확정 표현 금지'),
    gate('score_is_priority', true, '점수는 법적 결론이 아닌 보완 우선도')
  ];
  const blockers = gates.filter((item) => !item.ok);
  const verdict = score >= 86 && !blockers.length ? 'demo_commercial_ready' : score >= 70 ? 'demo_usable_with_review' : 'operator_review_recommended';
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    score,
    grade: grade(score),
    verdict,
    gates,
    blockers,
    sourceTrace: {
      attemptedPageCount: s.attempted,
      successfulPageCount: s.successful,
      coverageScore: s.coverageScore,
      confidenceScore: s.confidenceScore,
      explicitEvidenceCount: s.explicitEvidence,
      findingCount,
      manualReviewCount: s.manualReview,
      evidenceRatio: Number(evidenceRatio.toFixed(2)),
      manualReviewRatio: Number(manualRatio.toFixed(2))
    },
    falsePositiveControls: [
      '공개 페이지에서 확인되지 않은 항목은 확정하지 않고 확인 필요로 유지합니다.',
      '로그인 후 화면·외부 결제창·업종별 법률 판단은 무료 자동진단에서 직접 확인으로 분리합니다.',
      '점수는 법률 결론이 아니라 보완 우선순도이며, 근거 URL과 한계를 함께 표시합니다.',
      '캐시 결과는 5분 이내 체감 속도용으로만 재사용하고 다시 점검 버튼으로 새 검사할 수 있습니다.'
    ],
    customerCopy: '무료 데모는 고객이 결제 전 확인하는 공개 신호를 먼저 보여주는 1차 진단입니다. 단정이 위험한 영역은 숨기지 않고 수동 확인으로 분리합니다.',
    operatorRule: '데모 결과는 결제 유도용 과장이 아니라 산출물 생성 전 근거 수집 품질을 평가하는 프리체크로 사용합니다.'
  };
}

export function buildPaidDeliverableBlueprint(scan = {}, plan = 'Report') {
  const findings = scanFindings(scan).slice(0, 8);
  const requiredSections = [
    '요약 브리프', '진단 대상과 확인 범위', '확인 URL 목록', '핵심 발견 항목', '항목별 근거와 한계',
    '수정 우선순위', '수정 전/후 문구안', '적용 위치', '재점검 기준', 'FAQ', '수용 기준', '법률 자문 아님 고지'
  ];
  const planDeliverables = {
    Report: ['정밀 리포트', '근거 매트릭스', '우선순위 로드맵', '재점검 기준'],
    FixPack: ['정밀 리포트', '수정 전/후 문구', '적용 위치', '검수 체크리스트', '재점검 기준'],
    Auto: ['정밀 리포트', '정기 케어 권한', '변경 감지 기준', 'CTA 자동발행 품질 기준', '월간 재점검 루틴']
  };
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    plan,
    requiredSections,
    includedDeliverables: planDeliverables[plan] || planDeliverables.Report,
    evidenceMatrix: findings.length ? findings.map((item, index) => ({
      id: item.code || `EVIDENCE_${String(index + 1).padStart(2, '0')}`,
      issue: item.title || item.code || '점검 항목',
      basis: item.evidence || item.selector || item.url || '공개 화면 근거 확인 필요',
      action: item.recommendation || item.fixTemplate || '운영 기준 확인 후 문구와 위치를 보완합니다.',
      certainty: certaintyLevel(item),
      manualReviewRequired: item.manualReviewRequired === true || certaintyLevel(item) !== 'high'
    })) : [{ id: 'BASELINE', issue: '기본 운영 안내 구조 확인', basis: '진단 입력값 기준', action: '공개 URL을 다시 점검하고 정책·문의·환불 안내를 확인합니다.', certainty: 'medium', manualReviewRequired: true }],
    acceptanceChecklist: [
      '진단 대상 URL과 주문 상품이 일치한다.',
      '확인 URL과 수집 실패 URL이 분리되어 있다.',
      '주요 발견 항목마다 근거·영향·권장 조치가 있다.',
      '자동 확정 불가 항목이 직접 확인으로 남아 있다.',
      '수정 전/후 문구와 적용 위치가 연결된다.',
      '모바일에서 긴 문구와 카드가 겹치지 않는다.',
      '법률 자문·성과 보장 표현이 없다.',
      '재점검 기준과 성공 조건이 포함된다.',
      '결제 후 제공 범위와 환불 제한 고지가 유지된다.',
      '고객이 바로 다음 행동을 선택할 수 있다.'
    ],
    qualityLock: {
      minPaidFullDetailScore: 100,
      minSiteOperationsDocumentScore: 100,
      minPaidOutputGateScore: 98,
      allIssueDetailsRequired: true,
      beforeAfterCopyRequiredForFixPack: plan === 'FixPack',
      recurringCarePlanRequiredForAuto: plan === 'Auto',
      priceReductionMustNotReduceDeliverables: true
    },
    performanceBudget: {
      publicDemoTimeoutMs: 18000,
      scanSoftTimeoutSafeFallback: true,
      cacheTtlMinutes: 5,
      paidAssetGeneration: 'idempotent-on-paid-order',
      downloadGate: 'paid-order-or-valid-access-token'
    }
  };
}

export function buildPaidOutputQualityGate({ order = {}, asset = {}, scan = {} } = {}) {
  const blueprint = asset.paidDeliverableBlueprint || buildPaidDeliverableBlueprint(scan, order.plan || asset.plan || 'Report');
  const sections = list(asset.sections);
  const deliverableIndex = list(asset.deliverableIndex);
  const fixes = list(asset.fixes);
  const evidenceMatrix = list(asset.evidenceMatrix || blueprint.evidenceMatrix);
  const acceptance = list(asset.acceptanceChecklist || blueprint.acceptanceChecklist);
  const measurement = list(asset.measurementPlan);
  const hasDisclaimer = Boolean(asset.legalDisclaimer || asset.disclaimer || asset.score?.disclaimer);
  const plan = text(order.plan || asset.plan || blueprint.plan || 'Report');
  const gates = [
    gate('order_paid_or_pending_asset', ['paid', 'fulfilled', 'generating'].includes(order.status) || Boolean(order.paidAt) || Boolean(asset.id), '결제 상태와 산출물 연결'),
    gate('target_bound', Boolean(order.siteId || order.domain || asset.siteId || asset.domain || scan.target), '진단 대상과 산출물 연결'),
    gate('structured_sections', sections.length >= 10 || Boolean(asset.reportExample), '본문 섹션 10개 이상 또는 리포트 구조 포함', { sections: sections.length }),
    gate('evidence_matrix', evidenceMatrix.length >= 3, '근거 매트릭스 3개 이상', { evidenceItems: evidenceMatrix.length }),
    gate('deliverable_index', deliverableIndex.length >= 4 || blueprint.includedDeliverables.length >= 4, '산출물 구성표 제공'),
    gate('fix_or_action', fixes.length >= 3 || list(asset.implementationPlan).length >= 4, '수정안 또는 실행 계획 제공'),
    gate('acceptance', acceptance.length >= 10, '수용 기준 10개 이상'),
    gate('measurement', measurement.length >= 5, '재점검 지표 5개 이상'),
    gate('disclaimer', hasDisclaimer, '법률 자문/성과 보장 아님 고지'),
    gate('plan_scope', Boolean(plan), '상품 범위 식별')
  ];
  const score = clamp(gates.filter((item) => item.ok).length / gates.length * 88 + Math.min(6, fixes.length) + Math.min(6, evidenceMatrix.length));
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    score,
    grade: grade(score),
    ok: gates.every((item) => item.ok),
    gates,
    blockers: gates.filter((item) => !item.ok),
    deliveryState: gates.every((item) => item.ok) ? 'ready_for_customer_delivery' : 'operator_review_required',
    customerPromise: '결제 후 산출물은 요약, 근거, 수정안, 적용 위치, FAQ, 수용 기준, 재점검 기준을 포함해야 납품 가능 상태로 봅니다.',
    accuracyProtocol: [
      '확인된 근거와 확인 필요 항목을 분리합니다.',
      '점수·예상 개선 값은 내부 우선순위 지표로만 사용합니다.',
      '공식 정보가 확인되지 않은 항목은 확인 필요로 유지합니다.',
      '산출물 다운로드 전 결제 상태와 접근 토큰을 확인합니다.'
    ]
  };
}


export function buildPhase229OutputQualityLock({ scan = {}, order = {}, asset = {} } = {}) {
  const plan = text(order.plan || asset.plan || 'Report', 'Report');
  const full = asset.paidFullDetailContract || buildPaidFullDetailContract({ scan, order, asset });
  const ops = asset.siteOperationsDocument || buildSiteOperationsDocument(scan, { order, asset });
  const gateResult = buildPaidOutputQualityGate({ order: { status: 'paid', ...order, plan }, asset, scan });
  const fixes = list(asset.fixes);
  const sections = list(asset.sections);
  const gates = [
    gate('full_detail_100', full.completenessScore === 100 && full.allDetailsVisible, '유료 전체 상세 100% 공개'),
    gate('site_ops_100', ops.qualityScore === 100 && list(ops.sections).length >= 10, '사이트 맞춤 운영 문서 100점'),
    gate('paid_output_gate_98', gateResult.score >= 98, '유료 산출물 품질 게이트 98점 이상', { score: gateResult.score }),
    gate('section_depth_locked', sections.length >= 10 || Boolean(asset.reportExample), '가격 인하 후에도 10개 이상 결과물 섹션 유지'),
    gate('acceptance_locked', list(asset.acceptanceChecklist).length >= 10 || list(gateResult.gates).length >= 8, '수용 기준 유지'),
    gate('fixpack_copy_locked', plan !== 'FixPack' || fixes.length >= 3, 'FixPack 수정 전/후 문구 유지'),
    gate('auto_care_locked', plan !== 'Auto' || Boolean(asset.autoPublishingPlan || asset.entitlement), 'Auto 반복 관리 권한 유지')
  ];
  const ok = gates.every((item) => item.ok);
  return {
    version: PHASE220_SERVICE_QUALITY_VERSION,
    scope: 'phase229_paid_quality_lock',
    plan,
    ok,
    score: ok ? 100 : clamp(100 - gates.filter((item) => !item.ok).length * 12),
    gates,
    blockers: gates.filter((item) => !item.ok),
    promise: '가격을 낮춰도 유료 고객에게 제공되는 전체 상세, 수정 문구, 운영 문서, 재검증 기준은 축소하지 않습니다.'
  };
}

export function attachPhase220ServiceQuality(scan = {}, options = {}) {
  const plan = text(options.plan || scan.recommendedPlan || scan.intelligence?.recommendedPlan || 'Report', 'Report');
  return {
    ...scan,
    serviceQuality: {
      demoAccuracy: buildDemoAccuracyContract(scan, options),
      paidDeliverableBlueprint: buildPaidDeliverableBlueprint(scan, plan),
      conversionUrgency: buildConversionUrgencyModel(scan, { ...options, plan }),
      continuity: {
        demoToPaidTraceable: true,
        freeResultFeedsPaidAsset: true,
        manualReviewRemainsVisible: true,
        ctaAutopublishIntervalMinutes: number(options.ctaIntervalMs, 20 * 60_000) / 60_000
      }
    }
  };
}
