function stripHtml(input = '') {
  return String(input).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function confidenceLabel(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return '확인 필요';
  if (value >= 80) return '높음';
  if (value >= 55) return '보통';
  if (value >= 30) return '낮음';
  return '매우 낮음';
}
function normalizeScannedPages(fetched = {}) {
  const pages = Array.isArray(fetched.pages) ? fetched.pages : [];
  if (pages.length) return pages.map((page) => ({
    url: page.url || page.finalUrl || '',
    finalUrl: page.finalUrl || page.url || '',
    status: Number(page.status || 0),
    contentType: page.contentType || '',
    contentLength: Number(page.contentLength || 0),
    fetched: page.fetched !== false && Number(page.status || 0) > 0,
    error: page.error || null,
    verifiedBy: page.verifiedBy || 'http_fetch',
    renderedByBrowser: page.renderedByBrowser === true,
    source: page.source || 'probe'
  }));
  return [{
    url: fetched.finalUrl || '',
    finalUrl: fetched.finalUrl || '',
    status: Number(fetched.status || 0),
    contentType: fetched.contentType || '',
    contentLength: stripHtml(fetched.html || '').length,
    fetched: fetched.fetched === true,
    error: fetched.error || null,
    verifiedBy: 'http_fetch',
    renderedByBrowser: false,
    source: 'primary'
  }].filter(item => item.finalUrl || item.url);
}
function highSignalCoverageGaps(scannedPages = []) {
  const important = ['privacy','terms','refund','return','exchange','contact','support','business','company','about','checkout','cart','order','shipping','delivery','pricing','plans','faq'];
  return scannedPages
    .filter(page => important.some(key => String(page.url || page.finalUrl || '').toLowerCase().includes(key)))
    .filter(page => !(page.status >= 200 && page.status < 400 && Number(page.contentLength || 0) > 20))
    .map(page => ({ url: page.url || page.finalUrl, status: page.status || 0, error: page.error || null }))
    .slice(0, 8);
}
export function buildEvidenceSummary({ fetched = {}, findings = [], text = '' }) {
  const maxPages = Math.max(4, Math.min(24, Number(process.env.NV0_TARGET_FETCH_MAX_PAGES || 12)));
  const aiReviewEnabled = String(process.env.NV0_AI_REVIEW_PROVIDER || 'disabled').trim().toLowerCase() === 'gemini' && !!String(process.env.NV0_GEMINI_API_KEY || '').trim();
  const scannedPages = normalizeScannedPages(fetched);
  const successfulPages = scannedPages.filter(page => page.status >= 200 && page.status < 400 && page.contentLength > 20);
  const failedPages = scannedPages.filter(page => !(page.status >= 200 && page.status < 400 && page.contentLength > 20));
  const expectedPages = Math.max(1, Number(fetched.probeCount || scannedPages.length || 1));
  const coverageScore = clamp(Math.round((successfulPages.length / Math.min(expectedPages, maxPages)) * 100), 0, 100);
  const contentScore = clamp(Math.round(Math.min(1, String(text || '').length / 2400) * 100), 0, 100);
  const confidenceScore = clamp(Math.round(coverageScore * 0.58 + contentScore * 0.32 + (fetched.fetched ? 10 : 0) - 12), 5, 92);
  const coverageGaps = highSignalCoverageGaps(scannedPages);
  const manualReviewCount = findings.filter(item => item.manualReviewRequired || ['MARKETING-CLAIM', 'YOUTH-RESTRICTED', 'LEGAL-ADVICE-DISCLAIMER'].includes(item.code)).length + (!fetched.fetched ? 2 : 0) + coverageGaps.length;
  return {
    collectionMethod: 'zero_cost_full_auto_public_probe',
    collectionStrategy: '홈→내부 후보링크→robots.txt→sitemap.xml→무료 HTTP 병렬수집→규칙판정→자동초안/수동확인 분리',
    verifiedBy: 'builtin_rules_full_auto_public_probe',
    aiReviewProvider: aiReviewEnabled ? 'gemini' : 'disabled',
    externalMeasurementProviders: { lighthouse: false, searchConsole: false, browserRendering: false },
    automationDiscovery: fetched.automationDiscovery || null,
    automationCapabilities: fetched.automationDiscovery?.capabilities || [],
    coverageScore,
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    successfulPageCount: successfulPages.length,
    failedPageCount: failedPages.length,
    attemptedPageCount: scannedPages.length,
    expectedProbeCount: expectedPages,
    maxProbePages: maxPages,
    manualReviewCount,
    scannedPages,
    coverageGaps,
    limitations: ['무료 공개 URL·내부 링크·robots.txt·sitemap.xml 기준입니다.', '자동 접근 가능한 공개 화면은 최대한 수집하지만 로그인·외부 결제·차단·JS 전용 화면은 수동확인입니다.', '미연결 외부 측정값은 확정하지 않습니다.', '법률 위반·처분 가능성은 확정하지 않습니다.'],
    disclaimer: '무료 전자동 공개 페이지 예비 점검입니다. 자동 확정 불가 항목은 수동확인 필요로 분리합니다.'
  };
}
export function buildScoreModel({ riskScore, findings = [], evidenceSummary = {} }) {
  return {
    primaryLabel: '개선 우선도',
    riskScoreLabel: '탐지 점수',
    riskScoreMeaning: '수집된 공개 페이지에서 보완 후보가 얼마나 많이 발견됐는지 나타내는 내부 지표입니다.',
    confidenceScore: evidenceSummary.confidenceScore || 0,
    confidenceLabel: evidenceSummary.confidenceLabel || '확인 필요',
    detectedFindings: findings.length,
    manualReviewCount: evidenceSummary.manualReviewCount || 0,
    notLegalConclusion: true,
    scoreDisclaimer: '점수는 법적 위험 확정값이 아니라 발견 항목의 우선순위 지표입니다.',
    weightedSignals: ['필수 고지 노출', '정책 링크 확인', '고객지원 경로', '결제 전 안내', '과장 표현 후보', '수집 범위 신뢰도']
  };
}
