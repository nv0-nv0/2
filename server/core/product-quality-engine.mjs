const VERSION = 'phase201-product-quality-v1';

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(number(value, min))));
}

function ratio(part, total) {
  const denominator = Math.max(1, number(total, 0));
  return Math.max(0, Math.min(1, number(part, 0) / denominator));
}

function grade(score) {
  const n = clamp(score);
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 68) return 'C';
  if (n >= 55) return 'D';
  return 'E';
}

function labelFor(score) {
  const n = clamp(score);
  if (n >= 90) return '상용 납품 안정권';
  if (n >= 80) return '운영 가능';
  if (n >= 68) return '주의 운영';
  if (n >= 55) return '보완 필요';
  return '출시 전 차단';
}

function findingCertainty(item = {}) {
  return String(item.certainty || item.confidence || item.evidenceStatus || '').trim();
}

function isHighCertainty(item = {}) {
  const c = findingCertainty(item);
  return /높음|high|detected|confirmed/i.test(c);
}

function isMediumCertainty(item = {}) {
  const c = findingCertainty(item);
  return /보통|medium/i.test(c);
}

function isLowCertainty(item = {}) {
  const c = findingCertainty(item);
  return !isHighCertainty(item) && !isMediumCertainty(item);
}

function qualityGate(key, ok, label, details = null) {
  return { key, ok: Boolean(ok), label, details };
}

export function buildDiagnosisAccuracyProfile(scan = {}) {
  const evidence = scan.evidenceSummary || {};
  const findings = list(scan.detailFindings);
  const scannedPages = list(evidence.scannedPages || scan.scannedPages);
  const attemptedPages = number(evidence.attemptedPageCount, scannedPages.length);
  const successfulPages = number(evidence.successfulPageCount, scannedPages.filter(page => number(page.status) >= 200 && number(page.status) < 400 && number(page.contentLength) > 20).length);
  const coverageScore = clamp(evidence.coverageScore ?? (attemptedPages ? successfulPages / Math.max(1, attemptedPages) * 100 : 0));
  const confidenceScore = clamp(evidence.confidenceScore ?? 0);
  const manualReviewCount = number(evidence.manualReviewCount, findings.filter(item => item.manualReviewRequired).length);
  const highCertaintyCount = findings.filter(isHighCertainty).length;
  const mediumCertaintyCount = findings.filter(isMediumCertainty).length;
  const lowCertaintyCount = findings.filter(isLowCertainty).length;
  const manualReviewRatio = ratio(manualReviewCount, Math.max(1, findings.length));
  const lowCertaintyRatio = ratio(lowCertaintyCount, Math.max(1, findings.length));
  const successfulPageRatio = ratio(successfulPages, attemptedPages || scannedPages.length || 1);
  const score = clamp(
    confidenceScore * 0.38 +
    coverageScore * 0.28 +
    successfulPageRatio * 100 * 0.14 +
    ratio(highCertaintyCount + mediumCertaintyCount * 0.65, Math.max(1, findings.length)) * 100 * 0.14 +
    (scan.fetched ? 6 : 0) -
    manualReviewRatio * 16 -
    lowCertaintyRatio * 10
  );
  const gates = [
    qualityGate('target_fetched', scan.fetched === true || successfulPages > 0, '대상 공개 페이지 1개 이상 수집'),
    qualityGate('coverage_usable', coverageScore >= 45, '진단 커버리지 45점 이상', { coverageScore }),
    qualityGate('confidence_usable', confidenceScore >= 45, '근거 신뢰도 45점 이상', { confidenceScore }),
    qualityGate('manual_review_bounded', manualReviewRatio <= 0.65, '수동검토 항목 과다 방지', { manualReviewCount, totalFindings: findings.length }),
    qualityGate('source_pages_recorded', scannedPages.length > 0, '확인 URL 기록 보존', { scannedPages: scannedPages.length })
  ];
  const falsePositiveRisk = lowCertaintyRatio >= 0.55 || coverageScore < 35
    ? 'high'
    : lowCertaintyRatio >= 0.3 || manualReviewRatio >= 0.5
      ? 'medium'
      : 'low';
  return {
    version: VERSION,
    score,
    grade: grade(score),
    label: labelFor(score),
    falsePositiveRisk,
    manualReviewRequired: manualReviewCount > 0 || falsePositiveRisk !== 'low',
    evidenceCoverage: {
      coverageScore,
      confidenceScore,
      attemptedPages,
      successfulPages,
      failedPages: number(evidence.failedPageCount, Math.max(0, attemptedPages - successfulPages)),
      scannedPageCount: scannedPages.length,
      coverageGaps: list(evidence.coverageGaps).slice(0, 8)
    },
    findingReliability: {
      totalFindings: findings.length,
      highCertaintyCount,
      mediumCertaintyCount,
      lowCertaintyCount,
      manualReviewCount,
      manualReviewRatio: Number(manualReviewRatio.toFixed(2))
    },
    gates,
    blockers: gates.filter(item => !item.ok),
    operatingRule: '점수는 법적 결론이 아니라 공개 수집 근거 기반의 개선 우선순위입니다. 낮은 신뢰도 항목은 결제 산출물에서도 확인 필요로 유지합니다.'
  };
}

export function buildReportQualityProfile(assetOrReport = {}, scan = {}) {
  const sections = list(assetOrReport.sections);
  const fixes = list(assetOrReport.fixes);
  const templates = list(assetOrReport.templates);
  const faqs = list(assetOrReport.faqs || assetOrReport.deliverableBundle?.faq);
  const evidenceMatrix = list(assetOrReport.evidenceMatrix || assetOrReport.reportExample?.majorIssues || assetOrReport.topIssues);
  const acceptanceChecklist = list(assetOrReport.acceptanceChecklist);
  const measurementPlan = list(assetOrReport.measurementPlan);
  const deliverableIndex = list(assetOrReport.deliverableIndex);
  const scanFindings = list(scan.detailFindings);
  const requiredBlocks = [
    qualityGate('executive_brief', Boolean(assetOrReport.executiveBrief || assetOrReport.summary), '요약 브리프 포함'),
    qualityGate('sections', sections.length >= 10 || Boolean(assetOrReport.reportExample), '본문 섹션 10개 이상 또는 리포트 예시 포함', { sections: sections.length }),
    qualityGate('evidence', evidenceMatrix.length >= 3 || scanFindings.length >= 3, '발견 근거 3개 이상 구조화', { evidenceItems: evidenceMatrix.length, scanFindings: scanFindings.length }),
    qualityGate('fixes_or_plan', fixes.length >= 3 || list(assetOrReport.fixPlan).length >= 3, '수정안 또는 실행 계획 3개 이상', { fixes: fixes.length, fixPlan: list(assetOrReport.fixPlan).length }),
    qualityGate('faq', faqs.length >= 3, 'FAQ 3개 이상 포함', { faqs: faqs.length }),
    qualityGate('acceptance', acceptanceChecklist.length >= 8 || list(assetOrReport.deliverableBundle?.requiredSections).length >= 8, '수용 기준 또는 필수 섹션 8개 이상', { acceptance: acceptanceChecklist.length }),
    qualityGate('measurement', measurementPlan.length >= 5 || Boolean(assetOrReport.scoreModel), '재점검 지표 또는 점수모델 포함', { measurementItems: measurementPlan.length }),
    qualityGate('safety', Boolean(assetOrReport.legalDisclaimer || assetOrReport.disclaimer || assetOrReport.score?.disclaimer), '법률 자문 아님/성과 보장 아님 고지 포함')
  ];
  const score = clamp(
    requiredBlocks.filter(item => item.ok).length / requiredBlocks.length * 78 +
    Math.min(10, deliverableIndex.filter(item => item.included).length * 1.5) +
    Math.min(7, templates.length * 1.5) +
    Math.min(5, fixes.length)
  );
  return {
    version: VERSION,
    score,
    grade: grade(score),
    label: labelFor(score),
    requiredBlocks,
    blockers: requiredBlocks.filter(item => !item.ok),
    sectionCount: sections.length,
    evidenceItemCount: evidenceMatrix.length || scanFindings.length,
    fixCount: fixes.length,
    templateCount: templates.length,
    faqCount: faqs.length,
    acceptanceCount: acceptanceChecklist.length,
    measurementCount: measurementPlan.length,
    deliveryRule: '결제 산출물은 요약, 근거, 수정안, 적용 위치, FAQ, 수용 기준, 재점검 기준이 함께 있어야 납품 가능으로 봅니다.'
  };
}

export function buildFulfillmentQualityProfile(order = {}, asset = {}, scan = {}) {
  const checklist = [
    qualityGate('paid', ['paid', 'fulfilled', 'generating'].includes(order.status) || Boolean(order.paidAt), '결제 승인 상태 확인', { status: order.status || null }),
    qualityGate('asset_created', Boolean(asset && (asset.id || asset.title || asset.type)), '산출물 객체 생성'),
    qualityGate('customer_reachable', Boolean(order.customerEmail || order.email || order.buyerEmail), '고객 수신 이메일 확보'),
    qualityGate('target_bound', Boolean(order.targetUrl || order.url || order.siteUrl || order.domain || scan.target), '진단 대상과 주문 연결'),
    qualityGate('downloadable_or_review_state', asset.downloadable !== false || asset.certificationStatus === 'pending_operator_review', '다운로드 가능 또는 사이트 담당자 검토 상태 명확화'),
    qualityGate('quality_profile_pass', number(asset.reportQualityProfile?.score, 0) >= 75 || buildReportQualityProfile(asset, scan).score >= 75, '결제 산출물 품질 75점 이상')
  ];
  const score = clamp(checklist.filter(item => item.ok).length / checklist.length * 100);
  return {
    version: VERSION,
    score,
    grade: grade(score),
    label: labelFor(score),
    ok: checklist.every(item => item.ok),
    checklist,
    blockers: checklist.filter(item => !item.ok),
    deliveryState: checklist.every(item => item.ok) ? 'deliverable_ready' : 'operator_review_required'
  };
}

export function buildAdminOperatingProfile(db = {}) {
  const scans = list(db.scans);
  const orders = list(db.orders);
  const assets = list(db.purchasedAssets);
  const refunds = list(db.refundRequests);
  const emails = list(db.emailOutbox);
  const autoFixJobs = list(db.autoFixJobs);
  const latestScan = scans[0] || null;
  const latestAccuracy = latestScan ? buildDiagnosisAccuracyProfile(latestScan) : null;
  const paidOrders = orders.filter(order => order.status === 'paid');
  const paidWithoutAsset = paidOrders.filter(order => !assets.some(asset => asset.orderId === order.id) && !order.assetId && !order.reportPath);
  const failedEmails = emails.filter(item => item.status === 'failed');
  const pendingRefunds = refunds.filter(item => ['requested', 'reviewing'].includes(item.status));
  const pendingAutoFix = autoFixJobs.filter(item => item.status === 'pending');
  const blockers = [
    paidWithoutAsset.length && { key: 'paid_without_asset', label: '결제 완료 후 산출물 미생성', count: paidWithoutAsset.length },
    failedEmails.length && { key: 'failed_email', label: '거래성 이메일 실패', count: failedEmails.length },
    pendingRefunds.length && { key: 'pending_refund', label: '미처리 환불 요청', count: pendingRefunds.length },
    latestAccuracy && latestAccuracy.score < 60 && { key: 'low_diagnosis_accuracy', label: '최근 진단 신뢰도 낮음', score: latestAccuracy.score }
  ].filter(Boolean);
  const warnings = [
    pendingAutoFix.length && { key: 'pending_auto_fix', label: '승인 대기 수정 후보', count: pendingAutoFix.length },
    scans.length === 0 && { key: 'no_scan', label: '누적 진단 없음' },
    orders.length === 0 && { key: 'no_order', label: '누적 주문 없음' }
  ].filter(Boolean);
  const score = clamp(100 - blockers.length * 18 - warnings.length * 7 - Math.min(18, paidWithoutAsset.length * 6) - Math.min(12, failedEmails.length * 4));
  return {
    version: VERSION,
    score,
    grade: grade(score),
    label: labelFor(score),
    ok: blockers.length === 0,
    counts: {
      scans: scans.length,
      orders: orders.length,
      paidOrders: paidOrders.length,
      assets: assets.length,
      paidWithoutAsset: paidWithoutAsset.length,
      failedEmails: failedEmails.length,
      pendingRefunds: pendingRefunds.length,
      pendingAutoFix: pendingAutoFix.length
    },
    latestDiagnosisAccuracy: latestAccuracy,
    blockers,
    warnings,
    queues: {
      fulfillment: paidWithoutAsset.slice(0, 20).map(order => ({ id: order.id, plan: order.plan || null, email: order.email || order.customerEmail || null, createdAt: order.createdAt || null })),
      refunds: pendingRefunds.slice(0, 20).map(item => ({ id: item.id, orderId: item.orderId, status: item.status, requestedAt: item.requestedAt || null })),
      emails: failedEmails.slice(0, 20).map(item => ({ id: item.id, subject: item.subject, retryCount: item.retryCount || 0, createdAt: item.createdAt || null })),
      autoFix: pendingAutoFix.slice(0, 20).map(item => ({ id: item.id, siteId: item.siteId, findingCode: item.findingCode, title: item.title }))
    },
    nextActions: blockers.length ? blockers.map(item => `${item.label} ${item.count ? `${item.count}건` : ''}`.trim()) : ['최근 진단 정확도와 결제 산출물 샘플을 주 1회 검수', 'P0/P1 수정 후보 승인 후 재진단 기록 유지']
  };
}
