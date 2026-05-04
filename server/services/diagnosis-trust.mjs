import crypto from 'node:crypto';

export const DIAGNOSIS_RULES_VERSION = 'nv0-rules-2026.05.phase200';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}
function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function confidenceBand(value) {
  const n = Number(value || 0);
  if (n >= 80) return 'high';
  if (n >= 55) return 'medium';
  if (n >= 30) return 'low';
  return 'needs_review';
}
function normalizeUrl(value) {
  try { return new URL(String(value || '').trim()).toString(); } catch { return String(value || '').trim(); }
}

export function createEvidenceSnapshot(input = {}) {
  const pages = Array.isArray(input.pages) ? input.pages : Array.isArray(input.scannedPages) ? input.scannedPages : [];
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const normalizedPages = pages.slice(0, 80).map((page) => {
    const text = String(page.text || page.body || page.html || '').replace(/\s+/g, ' ').trim();
    return {
      url: normalizeUrl(page.url || page.finalUrl || ''),
      status: Number(page.status || 0),
      contentType: String(page.contentType || ''),
      contentLength: Number(page.contentLength || text.length || 0),
      textHash: text ? sha256(text.slice(0, 120000)) : null,
      evidenceExcerpt: text ? text.slice(0, 240) : null,
      fetchedAt: page.fetchedAt || input.fetchedAt || new Date().toISOString()
    };
  });
  return {
    rulesVersion: input.rulesVersion || DIAGNOSIS_RULES_VERSION,
    targetUrl: normalizeUrl(input.targetUrl || input.url || ''),
    createdAt: input.createdAt || new Date().toISOString(),
    pageCount: normalizedPages.length,
    findingCount: findings.length,
    pages: normalizedPages,
    findingCodes: findings.map((item) => item.code || item.id || item.title || 'UNKNOWN').slice(0, 120),
    snapshotHash: sha256(JSON.stringify({ pages: normalizedPages, findingCodes: findings.map((item) => item.code || item.id || item.title || 'UNKNOWN') }))
  };
}

export function scoreDiagnosisConfidence(input = {}) {
  const pages = Array.isArray(input.pages) ? input.pages : Array.isArray(input.scannedPages) ? input.scannedPages : [];
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const evidenceSummary = input.evidenceSummary || {};
  const successful = pages.filter((page) => Number(page.status || 0) >= 200 && Number(page.status || 0) < 400 && Number(page.contentLength || 0) > 20).length;
  const attempted = Math.max(1, pages.length || Number(evidenceSummary.attemptedPageCount || 1));
  const coverage = clamp((successful / attempted) * 100);
  const manualReview = Number(evidenceSummary.manualReviewCount || findings.filter((item) => item.manualReviewRequired).length || 0);
  const explicitEvidence = findings.filter((item) => item.evidence || item.selector || item.url || item.source).length;
  const evidenceRatio = findings.length ? clamp((explicitEvidence / findings.length) * 100) : 100;
  const score = clamp(Math.round((coverage * 0.42) + (evidenceRatio * 0.38) + (Math.min(successful, 6) * 4) - (manualReview * 3)), 5, 96);
  return {
    score,
    band: confidenceBand(score),
    coverageScore: Math.round(coverage),
    evidenceRatio: Math.round(evidenceRatio),
    manualReviewCount: manualReview,
    explanation: score >= 80 ? '수집 범위와 항목별 근거가 충분합니다.' : score >= 55 ? '자동 판정은 가능하지만 일부 수동 확인이 필요합니다.' : '자동 접근 한계가 커서 수동 확인 비중을 높여야 합니다.'
  };
}

export function attachTrustLayer(result = {}, input = {}) {
  const snapshot = createEvidenceSnapshot({ ...input, findings: result.findings || input.findings || [] });
  const confidence = scoreDiagnosisConfidence({ ...input, findings: result.findings || input.findings || [] });
  return {
    ...result,
    trust: {
      rulesVersion: snapshot.rulesVersion,
      confidence,
      evidenceSnapshot: snapshot,
      limitations: [
        '공개 접근 가능한 화면과 제공된 입력값 기준의 자동 진단입니다.',
        '로그인·외부 결제 승인·운영 DB 원장은 별도 연결 후 검증해야 합니다.',
        '법률 위반 여부를 확정하지 않고 보완 우선순위를 제공합니다.'
      ]
    }
  };
}

export function compareDiagnosisResults(previous = {}, current = {}) {
  const prevFindings = new Map((previous.findings || []).map((item) => [item.code || item.id || item.title, item]));
  const currFindings = new Map((current.findings || []).map((item) => [item.code || item.id || item.title, item]));
  const added = [];
  const resolved = [];
  const persisted = [];
  for (const [key, item] of currFindings) {
    if (prevFindings.has(key)) persisted.push(item); else added.push(item);
  }
  for (const [key, item] of prevFindings) {
    if (!currFindings.has(key)) resolved.push(item);
  }
  const previousScore = Number(previous.riskScore ?? previous.score ?? 0);
  const currentScore = Number(current.riskScore ?? current.score ?? 0);
  return {
    previousScore,
    currentScore,
    delta: currentScore - previousScore,
    addedCount: added.length,
    resolvedCount: resolved.length,
    persistedCount: persisted.length,
    added,
    resolved,
    persisted,
    summary: currentScore < previousScore ? '위험 신호가 감소했습니다.' : currentScore > previousScore ? '보완 후보가 증가했습니다.' : '점수 변화가 없습니다.'
  };
}
