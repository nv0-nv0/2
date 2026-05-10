export const PHASE220_SERVICE_QUALITY_VERSION = 'phase220-demo-paid-output-precision-v1';

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
    gate('evidence_separated', findingCount === 0 || evidenceRatio >= 0.45 || s.manualReview >= 1, '근거 항목과 수동확인 항목 분리'),
    gate('manual_review_visible', s.manualReview >= 0 && Boolean(scan.scoreModel || scan.evidenceSummary || scan.automationDisclosure), '수동확인 기준 노출'),
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
      '로그인 후 화면·외부 결제창·업종별 법률 판단은 무료 자동진단에서 수동확인으로 분리합니다.',
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
      '자동 확정 불가 항목이 수동확인으로 남아 있다.',
      '수정 전/후 문구와 적용 위치가 연결된다.',
      '모바일에서 긴 문구와 카드가 겹치지 않는다.',
      '법률 자문·성과 보장 표현이 없다.',
      '재점검 기준과 성공 조건이 포함된다.',
      '결제 후 제공 범위와 환불 제한 고지가 유지된다.',
      '고객이 바로 다음 행동을 선택할 수 있다.'
    ],
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

export function attachPhase220ServiceQuality(scan = {}, options = {}) {
  const plan = text(options.plan || scan.recommendedPlan || scan.intelligence?.recommendedPlan || 'Report', 'Report');
  return {
    ...scan,
    serviceQuality: {
      demoAccuracy: buildDemoAccuracyContract(scan, options),
      paidDeliverableBlueprint: buildPaidDeliverableBlueprint(scan, plan),
      continuity: {
        demoToPaidTraceable: true,
        freeResultFeedsPaidAsset: true,
        manualReviewRemainsVisible: true,
        ctaAutopublishIntervalMinutes: number(options.ctaIntervalMs, 20 * 60_000) / 60_000
      }
    }
  };
}
