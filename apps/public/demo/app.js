import { mountTurnstile } from '/shared/turnstile.js';
import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';
import { getCommercialOffer } from '/shared/product-catalog.mjs';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const badge = document.getElementById('freeUsageBadge');
const badgeLead = document.getElementById('freeUsageLead');
const targetInput = document.getElementById('targetUrl');
const scanBtn = document.getElementById('scanBtn');
const retryBtn = document.getElementById('retryBtn');
const unlockBtn = document.getElementById('unlockBtn');
const cancelScanBtn = document.getElementById('cancelScanBtn');
const clearRecentBtn = document.getElementById('clearRecentBtn');
const presetTargets = document.getElementById('demoPresetTargets');
const recentTargetList = document.getElementById('recentTargetList');
const targetPreview = document.getElementById('targetPreview');
const unifiedDiagnosisForm = document.getElementById('unifiedDiagnosisForm');
const resultActionHint = document.getElementById('resultActionHint');
const resultActionGroup = retryBtn?.closest('.bridge-actions') || unlockBtn?.closest('.bridge-actions') || null;
const initialResultHtml = result?.innerHTML || '';
const params = new URLSearchParams(location.search);
if (params.get('target') && targetInput) targetInput.value = params.get('target');

const DIAGNOSIS_CTA_COPY = '사이트 무료 진단 실행';
const DIAGNOSIS_BUSY_COPY = '무료 진단 분석 중...';
const FREE_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 18000;
const DEMO_CACHE_TTL_MS = 5 * 60 * 1000;
const RECENT_TARGET_LIMIT = 6;
const PROGRESS_TICK_MS = 900;
const RECENT_TARGETS_KEY = 'veridion:recent-targets:v1';
const PROGRESS_STEPS = [
  { title: 'URL 입력', detail: '주소 형식과 공개 접근 가능 여부 확인' },
  { title: '자동 수집', detail: '홈·정책·문의·robots·sitemap 후보 확인' },
  { title: '고객 안내 신호 분류', detail: '전자상거래·개인정보·환불·표시광고 후보 확인' },
  { title: '수동확인 분리', detail: '자동 단정하면 보완한 항목은 따로 표시' },
  { title: '결과 정렬', detail: '점수·근거·다음 행동을 읽기 쉬운 순서로 확인' }
];
const usageKey = `veridion:instantDemoUsage:v2:${new Date().toISOString().slice(0, 10)}`;
const previousUsageKey = `veridion:instantDemoUsage:${new Date().toISOString().slice(0, 10)}`;
let session = { authenticated: false, customer: null };
let lastScan = null;
let isScanning = false;
let guard = { enabled: false, ready: false, getToken: () => '', reset: () => {} };
let progressTimer = null;
let progressStartedAt = 0;
let progressIndex = 0;
let activeScanAbort = null;
let targetAssessment = { valid: false, normalized: '', issues: ['사이트 주소를 입력하세요.'], warnings: [] };
const REPORT_OFFER = getCommercialOffer('Report');
const EXPERT_OFFER = getCommercialOffer('Expert');
const REPORT_LABEL = REPORT_OFFER ? `${REPORT_OFFER.title} ${formatWon(REPORT_OFFER.price)}원` : '기본 리포트 49,000원';
const EXPERT_LABEL = EXPERT_OFFER ? `${EXPERT_OFFER.title} ${formatWon(EXPERT_OFFER.price)}원` : '전문가 플랜 149,000원';

function setState(message, mode = 'muted') {
  if (!state) return;
  state.className = `notice ${mode}`.trim();
  state.textContent = message;
}
function setResultHtml(html) { if (result) result.innerHTML = html; }
function clampVisualPercent(value = 0) {
  const numeric = Number(value);
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(numeric) ? numeric : 0)));
}
function percentClass(value = 0) { return `vr-pct-${clampVisualPercent(value)}`; }
function meterWidthClass(value = 0) { return `vr-meter-width ${percentClass(value)}`; }
function sanitizeTargetInput(raw = '') {
  return String(raw || '').trim().replace(/\s+/g, '').replace(/[)>.,;!?]+$/g, '');
}
function isPrivateHost(host = '') {
  const normalized = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized) return true;
  if (['localhost', '0.0.0.0'].includes(normalized) || normalized.endsWith('.local') || normalized.endsWith('.internal') || normalized.endsWith('.localhost')) return true;
  if (/^(10|127)\./.test(normalized)) return true;
  if (/^169\.254\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(normalized)) return true;
  if (/^\[?::1\]?$/.test(normalized) || /^fc|^fd|^fe80/i.test(normalized)) return true;
  return false;
}
function assessTarget(raw = '') {
  const source = sanitizeTargetInput(raw);
  const issues = [];
  const warnings = [];
  if (!source) return { valid: false, normalized: '', issues: ['사이트 주소를 입력하세요.'], warnings };
  const prefixed = /^[a-z][a-z0-9+.-]*:\/\//i.test(source) ? source : `https://${source}`;
  let url = null;
  try { url = new URL(prefixed); } catch { return { valid: false, normalized: '', issues: ['도메인 또는 URL 형식이 올바르지 않습니다.'], warnings }; }
  if (!['http:', 'https:'].includes(url.protocol)) issues.push('http 또는 https 주소만 진단할 수 있습니다.');
  if (url.username || url.password) issues.push('계정 정보가 포함된 주소는 진단할 수 없습니다.');
  if (!url.hostname || (!url.hostname.includes('.') && !isPrivateHost(url.hostname))) issues.push('공개 도메인 형식의 주소를 입력하세요.');
  if (url.hash) warnings.push('주소의 해시 값은 제외하고 진단합니다.');
  if (url.search) warnings.push('쿼리 파라미터는 유지하지만 핵심 공개 페이지 위주로 진단합니다.');
  if (isPrivateHost(url.hostname)) warnings.push('로컬 또는 사설 주소는 제한 결과만 제공될 수 있습니다.');
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  return { valid: issues.length === 0, normalized: url.toString(), issues, warnings };
}
function getRecentTargets() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_TARGETS_KEY) || '[]');
    return Array.isArray(value) ? value.filter(Boolean).slice(0, RECENT_TARGET_LIMIT) : [];
  } catch {
    return [];
  }
}
function saveRecentTarget(target = '') {
  const normalized = assessTarget(target).normalized || normalizeTarget(target);
  if (!normalized) return;
  const next = [normalized, ...getRecentTargets().filter((item) => item !== normalized)].slice(0, RECENT_TARGET_LIMIT);
  try { localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(next)); } catch {}
}
function clearRecentTargets() {
  try { localStorage.removeItem(RECENT_TARGETS_KEY); } catch {}
  renderRecentTargets();
}
function renderRecentTargets() {
  if (!recentTargetList) return;
  const items = getRecentTargets();
  const hasItems = items.length > 0;
  recentTargetList.hidden = !hasItems;
  recentTargetList.setAttribute('aria-hidden', hasItems ? 'false' : 'true');
  recentTargetList.innerHTML = items.map((item) => `<button type="button" data-target-recent="${escapeAttr(item)}">${escapeHtml(item)}</button>`).join('');
  if (clearRecentBtn) {
    clearRecentBtn.hidden = !hasItems;
    clearRecentBtn.disabled = !hasItems;
    clearRecentBtn.setAttribute('aria-hidden', hasItems ? 'false' : 'true');
  }
}
function updateTargetPreview(mode = 'muted') {
  targetAssessment = assessTarget(targetInput?.value || '');
  if (!targetPreview) return targetAssessment;
  targetPreview.className = `notice ${mode}`.trim();
  targetPreview.classList.remove('vr-target-preview-blocked');
  if (!targetAssessment.valid) {
    targetPreview.textContent = targetAssessment.issues[0] || '사이트 주소 형식을 확인하세요.';
    targetPreview.classList.add('warn');
  } else {
    targetPreview.textContent = targetAssessment.warnings.length
      ? `${targetAssessment.normalized} · ${targetAssessment.warnings[0]}`
      : `${targetAssessment.normalized} 기준으로 공개 페이지를 진단합니다.`;
    if (targetAssessment.warnings.some((item) => /사설|로컬/.test(item))) targetPreview.classList.add('vr-target-preview-blocked');
  }
  if (scanBtn && !isScanning) scanBtn.disabled = !targetAssessment.valid;
  return targetAssessment;
}
async function copyTextToClipboard(text, successMessage = '복사했습니다.') {
  try {
    await navigator.clipboard.writeText(String(text || ''));
    setState(successMessage, 'success');
  } catch {
    setState('복사에 실패했습니다. 브라우저 권한을 확인하세요.', 'warn');
  }
}
function downloadScanJson(scan) {
  const blob = new Blob([JSON.stringify(scan || {}, null, 2)], { type: 'application/json;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `veridion-diagnosis-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
function resetRenderedResult() {
  setResultHtml(initialResultHtml);
  updateResultActions(Boolean(lastScan || getSavedScanFromStorage()));
  setState('진단 대기 상태로 화면을 초기화했습니다.', 'muted');
}
function renderResultToolbar(view, scan) {
  return `<section class="vr-result-toolbar" aria-label="결과 도구">
    <button id="resultCopySummaryBtn" type="button">요약 복사</button>
    <button id="resultCopyJsonBtn" type="button">JSON 복사</button>
    <button id="resultDownloadJsonBtn" type="button">JSON 다운로드</button>
    <button id="resultShareBtn" type="button">공유 링크 복사</button>
    <button id="resultResetBtn" type="button">결과 영역 초기화</button>
    ${view.siteId ? `<a class="primary" href="/portal?siteId=${escapeAttr(view.siteId)}">고객 포털 열기</a>` : ''}
  </section>`;
}
function renderResultMetaSummary(view, scan) {
  const sourceTone = scan?.fallback ? 'fallback' : scan?.cached ? 'cached' : 'live';
  const sourceLabel = scan?.fallback ? '안전 결과' : scan?.cached ? '캐시 재사용' : '실시간 진단';
  return `<section class="vr-result-meta-grid" aria-label="진단 메타 정보">
    <article><span>결과 출처</span><strong><span class="vr-result-source-badge ${escapeAttr(sourceTone)}">${escapeHtml(sourceLabel)}</span></strong><small>${escapeHtml(scan?.provider || 'builtin')}</small></article>
    <article><span>진단 시각</span><strong>${escapeHtml(formatDate(view.generatedAt))}</strong><small>${escapeHtml(view.scanScopeLabel || '공개 페이지 기준')}</small></article>
    <article><span>신뢰도</span><strong>${escapeHtml(view.scoreModel?.confidenceLabel || '확인 필요')}</strong><small>수동 확인 ${escapeHtml(view.scoreModel?.manualReviewCount ?? 0)}개</small></article>
    <article><span>문의 코드</span><strong>${escapeHtml(view.requestId || '정상')}</strong><small>${escapeHtml(view.riskLevel || '상태 확인')}</small></article>
  </section>`;
}
function resultShareUrl(scan) {
  const url = new URL(location.href);
  const shareTarget = scan?.target || targetAssessment.normalized || normalizeTarget(targetInput?.value || '');
  if (shareTarget) url.searchParams.set('target', shareTarget);
  return url.toString();
}
function buildSummaryText(view) {
  return [
    `VERIDION 무료 진단 요약`,
    `대상: ${view.target}`,
    `점수: ${view.riskScore ?? '확인 필요'} / 100`,
    `리스크 영역: ${view.demoIssueOverview?.areaCount ?? view.risks.length}`,
    `문제 개수: ${view.demoIssueOverview?.totalIssueCount ?? view.risks.length}`,
    `우선 조치: ${view.recommendedActions?.[0]?.title || '정책·문의·환불 고지 확인'}`,
    `문의 코드: ${view.requestId || '정상'}`
  ].join('\n');
}
function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
function revealResultSurface() {
  if (!result) return;
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  requestAnimationFrame(() => {
    result.scrollIntoView({ behavior, block: 'start' });
    result.focus({ preventScroll: true });
  });
}

function stopProgress() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
  if (result) result.dataset.demoProgress = 'idle';
  document.body.dataset.diagnosisScanning = 'false';
}
function demoCacheKey(target) { return `veridion:instantDemoCache:${String(target || '').toLowerCase()}`; }
function getCachedDemoResult(target) {
  try {
    const cached = JSON.parse(localStorage.getItem(demoCacheKey(target)) || 'null');
    if (!cached?.result || Date.now() - Number(cached.savedAt || 0) > DEMO_CACHE_TTL_MS) return null;
    return cached.result;
  } catch { return null; }
}
function setCachedDemoResult(target, scan) {
  try { localStorage.setItem(demoCacheKey(target), JSON.stringify({ savedAt: Date.now(), result: scan })); } catch {}
}
function renderProgress(index = 0) {
  const elapsed = progressStartedAt ? Math.max(0, Math.round((Date.now() - progressStartedAt) / 1000)) : 0;
  const active = Math.max(0, Math.min(PROGRESS_STEPS.length - 1, index));
  const percent = Math.max(12, Math.round(((active + 1) / PROGRESS_STEPS.length) * 100));
  return `<section class="demo-progress-panel" aria-live="polite">
    <div class="demo-progress-head"><span class="pill brand">실시간 무료 진단</span><b>${elapsed}초 경과</b></div>
    <div class="demo-progress-rail" aria-hidden="true"><i class="${meterWidthClass(percent)}"></i></div>
    <div class="notice muted">진단 대상: ${escapeHtml(targetAssessment.normalized || normalizeTarget(targetInput?.value || '') || '입력 대기')}</div>
    <h3>결과 화면을 먼저 준비하면서 공개 페이지를 확인하고 있습니다</h3>
    <p class="muted">응답이 느린 사이트도 빈 화면으로 기다리게 하지 않고, 현재 처리 단계를 계속 보여줍니다.</p>
    <ol class="demo-progress-steps vr-readable-steps">${PROGRESS_STEPS.map((step, stepIndex) => `<li class="${stepIndex < active ? 'done' : stepIndex === active ? 'active' : ''}"><span aria-hidden="true">${stepIndex + 1}</span><div><b>${escapeHtml(step.title)}</b><p>${escapeHtml(step.detail)}</p></div></li>`).join('')}</ol>
    <div class="demo-progress-note">반복 실행 시 최근 5분 이내 동일 URL 결과는 즉시 재사용해 체감 대기시간을 줄입니다. 진행 중에는 진단 중단 버튼으로 요청을 멈출 수 있습니다.</div>
  </section>`;
}
function startProgress() {
  stopProgress();
  progressStartedAt = Date.now();
  progressIndex = 0;
  if (result) result.dataset.demoProgress = 'active';
  document.body.dataset.diagnosisScanning = 'true';
  setResultHtml(renderProgress(progressIndex));
  revealResultSurface();
  progressTimer = setInterval(() => {
    progressIndex = Math.min(PROGRESS_STEPS.length - 1, progressIndex + 1);
    setResultHtml(renderProgress(progressIndex));
  }, PROGRESS_TICK_MS);
}
function getUsage() {
  const previousUsage = localStorage.getItem(previousUsageKey);
  if (previousUsage !== null && localStorage.getItem(usageKey) === null) localStorage.setItem(usageKey, '0');
  const n = Number(localStorage.getItem(usageKey) || '0');
  return Math.max(0, Math.min(FREE_LIMIT, Number.isFinite(n) ? n : 0));
}
function setUsage(n) { localStorage.setItem(usageKey, String(Math.max(0, Math.min(FREE_LIMIT, Number(n) || 0)))); updateBadge(); }
function updateBadge() {
  const freeUsage = Math.max(0, FREE_LIMIT - getUsage());
  if (session.authenticated) {
    if (badgeLead) badgeLead.innerHTML = '<strong>회원 기능 활성</strong>';
    if (badge) badge.textContent = '무료진단 횟수 관리, 저장 사이트, 원클릭 재검사, 최근 진단 이력 확인을 이용할 수 있습니다.';
    return;
  }
  if (badgeLead) badgeLead.innerHTML = `<strong>오늘 남은 비회원 무료 진단 ${freeUsage}회</strong>`;
  if (badge) badge.textContent = `비회원은 하루 최대 ${FREE_LIMIT}회까지 이용할 수 있습니다.`;
}
function setActionEnabled(button, enabled, enabledText, disabledText) {
  if (!button) return;
  button.disabled = !enabled;
  button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  if (enabledText && disabledText) button.textContent = enabled ? enabledText : disabledText;
}
function updateResultActions(hasResult = Boolean(lastScan || getSavedScanFromStorage())) {
  const showActions = Boolean(hasResult) && !isScanning;
  if (resultActionGroup) {
    resultActionGroup.hidden = !showActions;
    resultActionGroup.setAttribute('aria-hidden', showActions ? 'false' : 'true');
  }
  if (resultActionHint) {
    resultActionHint.hidden = showActions;
    resultActionHint.setAttribute('aria-hidden', showActions ? 'true' : 'false');
  }
  setActionEnabled(retryBtn, showActions, '다시 진단하기', '다시 진단하기');
  setActionEnabled(unlockBtn, showActions, '결과 저장하고 이어보기', '결과 저장하고 이어보기');
}
function setBusy(flag) {
  isScanning = flag;
  document.body.dataset.diagnosisScanning = flag ? 'true' : 'false';
  if (scanBtn) {
    scanBtn.disabled = flag || !targetAssessment.valid;
    scanBtn.setAttribute('aria-busy', flag ? 'true' : 'false');
    scanBtn.textContent = flag ? DIAGNOSIS_BUSY_COPY : DIAGNOSIS_CTA_COPY;
  }
  if (targetInput) {
    targetInput.readOnly = flag;
    targetInput.setAttribute('aria-busy', flag ? 'true' : 'false');
  }
  if (cancelScanBtn) {
    cancelScanBtn.hidden = !flag;
    cancelScanBtn.setAttribute('aria-hidden', flag ? 'false' : 'true');
    cancelScanBtn.disabled = !flag;
  }
  if (retryBtn) retryBtn.setAttribute('aria-busy', flag ? 'true' : 'false');
  updateResultActions();
}
function saveScan(scan) { localStorage.setItem('nv0:lastScan', JSON.stringify(scan)); lastScan = scan; updateResultActions(true); }
function getSavedScanFromStorage() { try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; } }
async function jsonFetch(path, options = {}) {
  const controller = new AbortController();
  const signal = options.signal
    ? (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([controller.signal, options.signal])
        : controller.signal)
    : controller.signal;
  if (options.signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
    options.signal.addEventListener('abort', () => controller.abort(options.signal.reason), { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...options, signal, credentials: options.credentials || 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverError = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || `요청 실패 (${res.status})`);
      const requestId = data.requestId || data.meta?.requestId || data.error?.requestId || '';
      const err = new Error(requestId ? `${serverError} · 오류코드 ${requestId}` : serverError);
      err.status = res.status;
      err.code = data.code || data.error?.code || '';
      err.requestId = requestId;
      throw err;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다. 네트워크 또는 서버 상태를 확인한 뒤 다시 실행하세요.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
async function loadSession() {
  try {
    const data = await jsonFetch('/api/public/auth/session', { timeoutMs: 5000 });
    session = data || session;
  } catch {
    session = { authenticated: false, customer: null };
  }
  updateBadge();
}

function normalizeTarget(raw) {
  return assessTarget(raw).normalized || '';
}
function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function scoreHealth(score) {
  if (score === null) return { grade: 'unknown', label: '확인 필요', tone: 'muted', percent: 0, headline: '진단 데이터 확인 필요' };
  if (score >= 80) return { grade: 'critical', label: '즉시 개선', tone: 'danger', percent: score, headline: '공개 페이지에서 우선 보완할 항목이 많이 발견됐습니다' };
  if (score >= 60) return { grade: 'risk', label: '보완 높음', tone: 'danger', percent: score, headline: '확인 가능한 페이지 기준으로 보완 후보가 보입니다' };
  if (score >= 40) return { grade: 'watch', label: '주의', tone: 'warn', percent: score, headline: '일부 항목은 수동 확인과 보완이 필요합니다' };
  return { grade: 'safe', label: '낮음', tone: 'success', percent: score, headline: '수집 범위 안에서는 큰 보완 후보가 적습니다' };
}
function loginUrl(scan = lastScan) {
  const next = scan?.siteId ? `/portal?siteId=${encodeURIComponent(scan.siteId)}` : '/portal';
  return `/auth?next=${encodeURIComponent(next)}`;
}
function detailRows(scan) { return Array.isArray(scan.detailFindings) ? scan.detailFindings : []; }
function formatDate(value) {
  if (!value) return new Date().toLocaleString('ko-KR');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ko-KR');
}
function normalizePercent(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function priorityTone(priority = '') {
  if (/P0|긴급|high|높음/i.test(priority)) return 'danger';
  if (/P1|중요|medium|주의/i.test(priority)) return 'warn';
  return 'muted';
}
function normalizeRiskItem(item, index) {
  if (typeof item === 'string') {
    return {
      title: item,
      priority: index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2',
      impact: '결제 전 신뢰 판단을 지연시킬 수 있는 항목입니다.',
      action: '기본 리포트에서 원인과 수정 문구를 확인하세요.',
      category: '요약 진단'
    };
  }
  return {
    title: item?.title || item?.code || '점검 항목',
    code: item?.code || '',
    priority: item?.priority || (index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2'),
    impact: item?.impact || item?.description || '수집된 공개 화면에서 고객 안내 보완 후보로 분류된 항목입니다.',
    action: item?.recommendation || item?.fixTemplate || '확인 URL과 근거를 보고 수정 우선순위와 적용 문구를 검토하세요.',
    category: item?.category || item?.code || '신뢰 무료진단',
    area: item?.area || item?.category || item?.code || '신뢰 무료진단',
    elements: Array.isArray(item?.elements) ? item.elements : (Array.isArray(item?.affectedElements) ? item.affectedElements : []),
    evidence: item?.evidence || '',
    certainty: item?.certainty || '확인 필요',
    sourcePages: Array.isArray(item?.sourcePages) ? item.sourcePages : [],
    manualReviewRequired: item?.manualReviewRequired === true,
    limitation: item?.limitation || ''
  };
}
function normalizeChecks(scan) {
  const diagnosis = scan.diagnosis || {};
  const source = Array.isArray(diagnosis.mainChecks) ? diagnosis.mainChecks : [];
  if (source.length) {
    return source.slice(0, 7).map((item) => ({
      label: item.label || item.title || '점검 항목',
      score: clampScore(item.score ?? (item.status === 'attention' ? 62 : 28)),
      status: item.status === 'attention' ? 'warning' : 'good',
      message: item.priority || item.message || '확인 완료'
    }));
  }
  const defaults = [
    ['사업자 정보', '사이트 담당자 정보와 고객지원 고지 확인'],
    ['결제 신뢰', '결제 전 안내와 버튼 안내 흐름 확인'],
    ['환불 정책', '디지털 산출물 제공 전후 기준 확인'],
    ['개인정보', '수집 항목과 동의 흐름 확인'],
    ['모바일 UX', '모바일에서 안내 버튼과 문구 가독성 확인']
  ];
  const score = clampScore(scan.riskScore);
  return defaults.map(([label, message], index) => ({
    label,
    score: score === null ? null : Math.min(100, Math.max(0, score - index * 8)),
    status: score !== null && score >= 60 && index < 3 ? 'warning' : 'good',
    message
  }));
}
function normalizeActions(scan, risks) {
  const fixes = (scan.diagnosis?.fixPlan || []).slice(0, 3);
  if (fixes.length) {
    return fixes.map((item, index) => ({
      priority: index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2',
      title: item.target || '개선 항목',
      reason: item.action || '사용자 신뢰 판단에 필요한 항목입니다.',
      nextStep: '기본 리포트에서 수정 문구와 적용 위치를 확인하세요.'
    }));
  }
  return risks.slice(0, 3).map((item, index) => ({
    priority: item.priority || (index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2'),
    title: item.title,
    reason: item.impact,
    nextStep: item.action
  }));
}
function normalizeScan(scan = {}) {
  const overviewSource = scan.demoIssueOverview || scan.diagnosis?.demoIssueOverview || scan.diagnosis?.freeDemoContract || null;
  const details = detailRows(scan).slice(0, 6).map(normalizeRiskItem);
  const top = (Array.isArray(scan.topFindings) ? scan.topFindings : []).slice(0, 5).map(normalizeRiskItem);
  const risks = (details.length ? details : top).slice(0, 5);
  const riskScore = clampScore(scan.riskScore ?? scan.score?.value);
  const health = scoreHealth(riskScore);
  const categories = normalizeChecks(scan);
  const recommendedActions = normalizeActions(scan, risks.length ? risks : [normalizeRiskItem('필수 고지와 정책 링크를 먼저 확인하세요.', 0)]);
  const fallbackOverview = buildDemoIssueOverviewFromRisks(risks, scan);
  const demoIssueOverview = overviewSource?.areaBreakdown ? overviewSource : { ...fallbackOverview, ...(overviewSource || {}) };
  return {
    raw: scan,
    target: scan.target || scan.normalizedTarget || targetInput?.value || '입력한 사이트',
    generatedAt: scan.generatedAt || scan.createdAt || new Date().toISOString(),
    riskScore,
    health,
    riskLevel: scan.riskLevel || health.label,
    estimatedPriorityScore: scan.estimatedPriorityScore,
    priorityDisclaimer: scan.priorityDisclaimer || scan.diagnosis?.priorityDisclaimer || '이 값은 공개 화면 기준 보완 우선순위입니다. 법률 판단이나 성과 보장을 의미하지 않습니다.',
    evidenceSummary: scan.evidenceSummary || {},
    scoreModel: scan.scoreModel || {},
    qualityAssurance: scan.qualityAssurance || {},
    aiReview: scan.aiReview || {},
    automationDisclosure: scan.automationDisclosure || scan.evidenceSummary?.automationDisclosure || {},
    automatedActionPlan: scan.automatedActionPlan || {},
    scanScopeLabel: scan.scanScopeLabel || '공개 페이지 기준 무료진단',
    recommendedPlan: scan.intelligence?.recommendedPlan || scan.recommendedPlan || (riskScore !== null && riskScore >= 45 ? 'Expert' : 'Report'),
    intelligence: scan.intelligence || scan.diagnosis?.intelligence || null,
    journey: scan.journey || scan.orchestration || scan.diagnosis?.journey || null,
    siteId: scan.siteId || '',
    requestId: scan.requestId || '',
    summary: scan.intelligence?.headline || scan.summary || health.headline,
    serviceQuality: scan.serviceQuality || scan.diagnosis?.serviceQuality || {},
    conversionUrgency: scan.conversionUrgency || scan.diagnosis?.conversionUrgency || scan.diagnosis?.serviceQuality?.conversionUrgency || scan.serviceQuality?.conversionUrgency || null,
    demoAccuracyContract: scan.demoAccuracyContract || scan.diagnosis?.demoAccuracyContract || scan.diagnosis?.serviceQuality?.demoAccuracy || scan.serviceQuality?.demoAccuracy || null,
    paidDeliverableBlueprint: scan.paidDeliverableBlueprint || scan.diagnosis?.paidDeliverableBlueprint || scan.diagnosis?.serviceQuality?.paidDeliverableBlueprint || scan.serviceQuality?.paidDeliverableBlueprint || null,
    demoIssueOverview,
    paidFullDetailContract: scan.paidFullDetailContract || scan.asset?.paidFullDetailContract || null,
    siteOperationsDocument: scan.siteOperationsDocument || scan.asset?.siteOperationsDocument || scan.guidance?.operationsDocument || null,
    risks: risks.length ? risks : [normalizeRiskItem('진단 결과가 제한적으로 수신되었습니다. 전체 리포트에서 세부 항목을 확인하세요.', 0)],
    categories,
    recommendedActions,
    lockedCount: Number(demoIssueOverview.hiddenDetailedIssueCount ?? Math.max(0, detailRows(scan).length - 2)) || 7,
    pages: (scan.evidenceSummary?.scannedPages || scan.diagnosis?.scannedPages || scan.scannedPages || []).slice(0, 12)
  };
}
function buildDemoIssueOverviewFromRisks(risks = [], scan = {}) {
  const areaMap = new Map();
  (risks || []).forEach((item, index) => {
    const area = item.area || item.category || '점검 영역';
    const elements = (Array.isArray(item.elements) && item.elements.length ? item.elements : [item.code, item.title].filter(Boolean)).slice(0, 3);
    const current = areaMap.get(area) || { area, issueCount: 0, elements: new Set(), previewFindings: [] };
    current.issueCount += 1;
    elements.forEach((el) => current.elements.add(String(el)));
    current.previewFindings.push({ title: item.title, priority: item.priority || (index < 2 ? 'P1' : 'P2'), publicStatus: item.manualReviewRequired ? 'manual_review' : 'detected' });
    areaMap.set(area, current);
  });
  const areaBreakdown = [...areaMap.values()].map((row) => ({
    area: row.area,
    issueCount: row.issueCount,
    elementCount: row.elements.size,
    elements: [...row.elements].slice(0, 6),
    previewFindings: row.previewFindings.slice(0, 3)
  }));
  const elementCount = areaBreakdown.reduce((sum, row) => sum + Number(row.elementCount || 0), 0);
  return {
    scope: 'free_demo_problem_area_element_count_only',
    totalIssueCount: Number(scan.totalFindings || risks.length || areaBreakdown.reduce((sum, row) => sum + row.issueCount, 0)),
    visibleIssueCount: areaBreakdown.reduce((sum, row) => sum + row.issueCount, 0),
    hiddenDetailedIssueCount: Math.max(0, Number(scan.totalFindings || risks.length || 0) - 3),
    areaCount: areaBreakdown.length,
    elementCount,
    manualReviewCount: (risks || []).filter((item) => item.manualReviewRequired).length,
    priorityCounts: (risks || []).reduce((acc, item) => { const key = item.priority || 'P2'; acc[key] = (acc[key] || 0) + 1; return acc; }, {}),
    areaBreakdown,
    paidUnlockFields: ['전체 근거', '상세 권장 조치', '수정 전후 문구', '적용 위치', '재점검 기준']
  };
}

function evidencePagesText(pages = []) {
  const list = (pages || []).slice(0, 3).map(page => typeof page === 'string' ? page : (page.finalUrl || page.url || '')).filter(Boolean);
  return list.length ? list.join(' · ') : '수집 페이지 제한';
}
function confidenceBadge(score, label = '') {
  const n = clampScore(score);
  const text = label || (n === null ? '확인 필요' : n >= 80 ? '높음' : n >= 55 ? '보통' : '낮음');
  return `${text}${n === null ? '' : ` · ${n}점`}`;
}

function topicElementsFor(value = '') {
  const source = String(value || '').toLowerCase();
  if (/환불|취소|교환|청약|refund/.test(source)) return ['환불 가능 조건', '취소 접수 위치', '처리 기간', '예외 기준'];
  if (/개인정보|privacy|동의|보관|파기/.test(source)) return ['수집 항목', '수집 목적', '보관 기간', '파기 기준'];
  if (/사업자|대표자|통신판매|고객센터|문의|contact/.test(source)) return ['상호·대표자', '사업자번호', '고객지원 경로', '답변 기준'];
  if (/약관|terms|책임|해지/.test(source)) return ['이용 조건', '제한 사항', '해지 기준', '분쟁 처리'];
  if (/결제|구매|가격|주문|checkout/.test(source)) return ['제공 범위', '결제 전 안내', '가격 포함 항목', '결제 후 제공 시점'];
  if (/광고|보장|무조건|최고|표현/.test(source)) return ['혜택 조건', '근거 문구', '예외 기준', '비교 표현'];
  if (/모바일|가독성|버튼/.test(source)) return ['버튼 위치', '문구 크기', '접힌 영역', '정책 링크'];
  return ['확인 위치', '세부 문구', '고객 질문', '다음 조치'];
}
function statusLabelForFinding(item = {}) {
  const text = `${item.title || ''} ${item.category || ''} ${item.impact || ''} ${item.action || ''}`;
  if (item.manualReviewRequired || /수동|확인 필요|로그인|외부|차단|timeout/i.test(text)) return '검토 필요';
  if (/부족|누락|낮음|찾지 못|제한|보완|보완/i.test(text)) return '누락 의심';
  return '확인됨';
}
function resultStats(view) {
  const risks = Array.isArray(view.risks) ? view.risks : [];
  const manual = Number(view.scoreModel?.manualReviewCount ?? 0) || risks.filter(item => statusLabelForFinding(item) === '검토 필요').length;
  const suspected = risks.filter(item => statusLabelForFinding(item) === '누락 의심').length;
  const confirmed = Math.max(0, (view.evidenceSummary?.successfulPageCount ?? view.pages.length ?? 0) + Math.max(0, risks.length - suspected - manual));
  const autoDrafts = Array.isArray(view.automatedActionPlan?.automaticFixes) ? view.automatedActionPlan.automaticFixes.length : view.recommendedActions.length;
  return { confirmed, suspected, manual, autoDrafts };
}
function manualReasonFor(item = '') {
  const text = String(item || '수동 확인 항목');
  if (/로그인/i.test(text)) return `${text} — 비공개 화면이라 공개 수집에서 제외했습니다.`;
  if (/결제/i.test(text)) return `${text} — 외부 결제창 또는 결제 완료 화면은 별도 확인이 필요합니다.`;
  if (/법률|업종|신고|행정/i.test(text)) return `${text} — 자동 판단보다 직접 확인이 안전합니다.`;
  if (/자바|렌더|스크립트/i.test(text)) return `${text} — 브라우저 렌더링 기준 재확인이 필요합니다.`;
  if (/차단|timeout|접근/i.test(text)) return `${text} — 접근 제한 또는 응답 지연으로 직접 확인이 필요합니다.`;
  return `${text} — 직접 확인이 필요한 항목으로 분리했습니다.`;
}
function externalToolStatus(view) {
  const providers = view.evidenceSummary?.externalMeasurementProviders || {};
  const rows = [
    ['브라우저 렌더링', providers.browserRendering ? '연결됨' : '미연결'],
    ['Lighthouse', providers.lighthouse ? '연결됨' : '미연결'],
    ['Search Console', providers.searchConsole ? '연결됨' : '미연결'],
    ['Gemini 보조 확인', view.aiReview?.enabled ? '사용됨' : (view.aiReview?.provider === 'gemini' ? '설정 필요' : '미사용')]
  ];
  return rows;
}

function fallbackConversionUrgency(view) {
  const overview = view.demoIssueOverview || {};
  const base = normalizePercent(view.riskScore, 52);
  const issue = Number(overview.totalIssueCount || view.risks?.length || 0);
  const area = Number(overview.areaCount || 0);
  const elements = Number(overview.elementCount || 0);
  const manual = Number(overview.manualReviewCount || view.scoreModel?.manualReviewCount || 0);
  const crisisScore = Math.max(0, Math.min(100, Math.round(base * 0.48 + Math.min(24, issue * 4) + Math.min(14, area * 3) + Math.min(12, elements * 0.55) + Math.min(10, manual * 3))));
  const projectedAfterFixScore = Math.max(8, crisisScore - Math.max(12, Math.min(30, view.recommendedActions.length * 7 + 10)));
  const blockers = (view.risks || []).slice(0, 4).map((item) => ({ label: item.area || item.category || item.title, count: 1, customerFeeling: '구매 망설임' }));
  return {
    scope: 'free_demo_conversion_crisis_score',
    crisisScore,
    crisisLabel: crisisScore >= 82 ? '매우 높음' : crisisScore >= 66 ? '높음' : crisisScore >= 48 ? '주의' : '관리 가능',
    tone: crisisScore >= 66 ? 'danger' : crisisScore >= 48 ? 'warn' : 'success',
    headline: crisisScore >= 66 ? '지금 보이는 신뢰 공백이 구매 직전 망설임으로 이어질 수 있습니다.' : '작은 안내 공백도 누적되면 문의와 이탈을 만들 수 있습니다.',
    reason: `발견 문제 ${issue}개 · 리스크 영역 ${area}개 · 점검 요소 ${elements}개 기준`,
    projectedAfterFixScore,
    expectedScoreReduction: Math.max(0, crisisScore - projectedAfterFixScore),
    conversionBlockers: blockers,
    lostTrustSignals: [`발견 문제 ${issue}개`, `리스크 영역 ${area}개`, `점검 요소 ${elements}개`, `직접 확인 필요 ${manual}개`],
    primaryCta: '기본 리포트 결제하고 원인 확인',
    secondaryCta: `${EXPERT_OFFER?.title || '전문가 플랜'}으로 수정 문구까지 받기`,
    recommendedPlan: view.recommendedPlan,
    disclaimer: '리스크 점수는 법률 위반이나 법적 판단을 확정하는 값이 아니라 공개 화면 기준 보완 우선순위입니다.'
  };
}
function conversionUrgencyFor(view) {
  return view.conversionUrgency || fallbackConversionUrgency(view);
}

function hasPaidAccess(scan) {
  return scan?.paidAccess === true || scan?.entitlement?.paid === true || scan?.access === 'paid' || scan?.orderStatus === 'paid' || scan?.subscriptionStatus === 'active';
}

async function saveCurrentSite(scan) {
  return jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteId: scan.siteId, domain: scan.target, label: scan.target }) });
}
async function unlockSavedScan() {
  const scan = lastScan || getSavedScanFromStorage();
  if (scan) {
    renderResult(scan);
    setState('저장된 최근 진단 결과를 같은 화면에 다시 표시했습니다.', 'success');
    updateResultActions(true);
    return;
  }
  setState('먼저 사이트 주소를 입력해 무료 진단을 실행하세요. 결과가 생성된 뒤 저장 결과를 다시 볼 수 있습니다.', 'warn');
  updateResultActions(false);
}

function buildLocalFallbackScan(target, message = '') {
  const now = new Date().toISOString();
  const normalized = normalizeTarget(target || targetInput?.value || '');
  const reason = String(message || '서버 응답 지연').slice(0, 180);
  const detailFindings = [
    {
      code: 'LOCAL-FALLBACK-001',
      category: '진단 연결',
      priority: 'P0',
      title: '서버 응답 지연으로 공개 페이지 전체 수집을 완료하지 못함',
      impact: '사용자에게 빈 화면이나 오류 카드만 보여주지 않도록 로컬 안전 결과로 전환했습니다.',
      recommendation: '다시 실행하면 서버 진단 결과로 갱신됩니다. 반복되면 관리 화면에서 진단 공급자와 프록시 제한 시간을 확인하세요.',
      manualReviewRequired: true,
      status: 'manual_review',
      evidence: reason
    },
    {
      code: 'LOCAL-FALLBACK-002',
      category: '공개 페이지 기준',
      priority: 'P1',
      title: 'URL 접근·정책 링크·문의 경로는 직접 확인 필요',
      impact: '자동 수집이 완료되지 않았으므로 점수는 보수적으로 표시됩니다.',
      recommendation: '홈, 푸터, 환불·개인정보·문의 안내 링크가 실제 고객 화면에서 보이는지 확인하세요.',
      manualReviewRequired: true,
      status: 'manual_review',
      evidence: normalized
    },
    {
      code: 'LOCAL-FALLBACK-003',
      category: '다음 행동',
      priority: 'P2',
      title: '결과 저장 전 재진단 권장',
      impact: '이번 결과는 장애 상황에서도 화면 흐름을 유지하기 위한 안전 요약입니다.',
      recommendation: '네트워크가 안정된 상태에서 다시 실행 후 리포트 또는 수정 문구안으로 연결하세요.',
      manualReviewRequired: false,
      status: 'review',
      evidence: 'client_fallback'
    }
  ];
  return {
    ok: true,
    provider: 'client_safe_fallback',
    requestId: `local-${Date.now()}`,
    target: normalized,
    normalizedTarget: normalized,
    generatedAt: now,
    riskScore: 48,
    riskLevel: '점검 필요',
    summary: '서버 응답이 지연되어 로컬 안전 결과를 표시했습니다. 고정 예시 점수가 아니라 이번 실행 상태를 기준으로 한 임시 점검 결과입니다.',
    scanScopeLabel: '공개 페이지 기준 로컬 안전 결과',
    totalFindings: detailFindings.length,
    topFindings: detailFindings.map(item => item.title),
    detailFindings,
    evidenceSummary: {
      fetched: false,
      fetchStatus: 0,
      fetchError: reason,
      scannedPages: [],
      successfulPageCount: 0,
      manualReviewNotes: ['서버 진단 응답 지연', '재실행 시 서버 결과로 교체'],
      automationDisclosure: {
        autoChecked: ['URL 형식', '화면 흐름 유지'],
        manualReviewRequired: ['공개 페이지 실제 수집', '외부 결제·로그인 화면', '정책 링크 세부 내용']
      }
    },
    scoreModel: {
      confidence: 35,
      confidenceLabel: '임시 결과',
      manualReviewCount: 2,
      detectedIssueCount: detailFindings.length,
      scoringNote: '서버 오류 시에도 빈 화면·ERR 카드만 노출되지 않도록 보수 점수로 표시합니다.'
    },
    automationDisclosure: {
      autoChecked: ['입력 URL 형식', '진단 화면 상태'],
      manualReviewRequired: ['공개 페이지 수집 결과', '정책/결제/문의 세부 근거']
    },
    automatedActionPlan: {
      immediateActions: detailFindings.map(item => item.recommendation).slice(0, 3),
      automaticFixes: [],
      manualActions: ['다시 실행', '관리 점검에서 진단 공급자/저장소/프록시 상태 확인']
    },
    recommendedPlan: 'Report',
    fallback: true,
    error: reason
  };
}
function cancelActiveScan() {
  if (!activeScanAbort) return;
  activeScanAbort.abort(new Error('scan_cancelled'));
}
async function runScan() {
  if (isScanning) return;
  setBusy(true);
  await loadSession();
  const assessment = updateTargetPreview('muted');
  const normalizedTarget = assessment.normalized;
  if (!assessment.valid) { setState(assessment.issues[0] || '유효한 사이트 주소를 입력하세요. 예: https://your-store.kr', 'warn'); setBusy(false); return; }
  if (!session.authenticated && getUsage() >= FREE_LIMIT) {
    if (state) state.innerHTML = `오늘 비회원 요약 결과 횟수를 모두 사용했습니다. <a href="${escapeAttr(loginUrl())}">로그인·회원가입하면 계속 이용할 수 있습니다.</a>`;
    setResultHtml('<div class="upgrade-box"><strong>비회원 이용 한도 초과</strong><p class="muted">로그인하면 무료진단 횟수 관리, 저장, 재검사를 계속 사용할 수 있습니다. 상세 결과는 결제 후 공개됩니다.</p></div>');
    setBusy(false);
    return;
  }
  saveRecentTarget(normalizedTarget);
  renderRecentTargets();
  const cachedResult = getCachedDemoResult(normalizedTarget);
  if (cachedResult) {
    saveScan(cachedResult);
    setState('최근 5분 이내 동일 URL 진단 결과를 즉시 불러왔습니다. 다시 점검을 누르면 새로 검사합니다.', 'success');
    renderResult(cachedResult);
    revealResultSurface();
    setBusy(false);
    return;
  }
  setState(assessment.warnings[0] ? `${assessment.warnings[0]} 공개 페이지·연결된 공개 페이지·robots.txt·sitemap.xml을 순서대로 확인합니다.` : '공개 페이지·연결된 공개 페이지·robots.txt·sitemap.xml을 자동 수집하고 확인 근거를 확인하고 있습니다.', 'muted');
  activeScanAbort = new AbortController();
  startProgress();
  try {
    const token = guard.enabled ? guard.getToken() : '';
    const data = await jsonFetch('/api/public/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: normalizedTarget, turnstileToken: token }), timeoutMs: REQUEST_TIMEOUT_MS, signal: activeScanAbort.signal });
    stopProgress();
    if (!session.authenticated) setUsage(getUsage() + 1);
    setCachedDemoResult(normalizedTarget, data.result || {});
    saveScan(data.result || {});
    if (session.authenticated && data.result) { try { await saveCurrentSite(data.result); } catch {} }
    setState(session.authenticated ? '무료진단 완료 · 저장 사이트와 최근 이력 관리가 활성화되었습니다. 상세 결과는 결제 후 공개됩니다.' : '무료진단 완료 · 확인 근거와 한계를 먼저 보여드립니다. 상세 결과는 결제 후 공개됩니다.', 'success');
    renderResult(data.result || {});
    revealResultSurface();
  } catch (err) {
    stopProgress();
    if (activeScanAbort?.signal?.aborted) {
      setState('진단 요청을 중단했습니다. 주소를 유지한 채 다시 실행할 수 있습니다.', 'warn');
      setResultHtml('<div class="vr-result-surface-empty"><strong>진단을 중단했습니다.</strong><p>입력한 주소는 그대로 유지했습니다. 준비가 되면 다시 실행하세요.</p></div>');
      return;
    }
    const message = err?.message || '알 수 없는 오류';
    const isTurnstile = /turnstile|보안|검증/i.test(message);
    const isServer = /500|502|503|서버|timeout|초과/i.test(message);
    const fallback = buildLocalFallbackScan(normalizedTarget, message);
    fallback.requestId = err?.requestId || fallback.requestId;
    fallback.errorCode = err?.code || '';
    if (!session.authenticated) setUsage(getUsage() + 1);
    setCachedDemoResult(normalizedTarget, fallback);
    saveScan(fallback);
    const supportCode = fallback.requestId ? ` · 문의 코드 ${fallback.requestId}` : '';
    setState(`${isServer ? '서버 응답이 지연되어' : isTurnstile ? '보안 확인이 완료되지 않아' : '요청 처리 중 문제가 있어'} 로컬 안전 결과를 표시했습니다.${supportCode} 다시 실행하면 서버 결과로 갱신됩니다.`, 'warn');
    renderResult(fallback);
    revealResultSurface();
    guard.reset?.();
  } finally {
    activeScanAbort = null;
    setBusy(false);
  }
}
window.__veridionRunScan = runScan;

// P0 safety: listeners are attached synchronously before Turnstile/session bootstrapping.
unifiedDiagnosisForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  runScan();
});
targetInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !unifiedDiagnosisForm) {
    event.preventDefault();
    runScan();
  }
});
targetInput?.addEventListener('input', () => updateTargetPreview('muted'));
targetInput?.addEventListener('paste', () => setTimeout(() => {
  if (targetInput) targetInput.value = sanitizeTargetInput(targetInput.value);
  updateTargetPreview('muted');
}, 0));
retryBtn?.addEventListener('click', runScan);
unlockBtn?.addEventListener('click', unlockSavedScan);
cancelScanBtn?.addEventListener('click', cancelActiveScan);
clearRecentBtn?.addEventListener('click', clearRecentTargets);
presetTargets?.addEventListener('click', (event) => {
  const value = event.target?.closest?.('[data-target-preset]')?.getAttribute?.('data-target-preset');
  if (!value || !targetInput) return;
  targetInput.value = value;
  updateTargetPreview('muted');
  targetInput.focus();
});
recentTargetList?.addEventListener('click', (event) => {
  const value = event.target?.closest?.('[data-target-recent]')?.getAttribute?.('data-target-recent');
  if (!value || !targetInput) return;
  targetInput.value = value;
  updateTargetPreview('muted');
  targetInput.focus();
});
updateBadge();
updateResultActions();
renderRecentTargets();
updateTargetPreview('muted');
setState('이메일을 먼저 요구하지 않습니다. 가능한 공개 항목은 자동 확인하고, 자동 확정 불가 영역은 명확히 표시합니다.');

mountTurnstile({ containerId: 'turnstileBox', tokenInputId: 'turnstileToken', noticeId: 'turnstileState' })
  .then((mountedGuard) => { guard = { ready: true, ...mountedGuard }; })
  .catch((error) => {
    guard = { enabled: false, ready: false, getToken: () => '', reset: () => {} };
    const notice = document.getElementById('turnstileState');
    if (notice) notice.textContent = `보안 확인을 불러오지 못했습니다. 설정 확인이 필요하지만 버튼은 계속 동작합니다. (${error.message})`;
  });
loadSession();
window.addEventListener('pageshow', async () => { await loadSession(); });
function renderDiscoverySummary(view) {
  const stats = resultStats(view);
  const attempted = view.evidenceSummary?.attemptedPageCount ?? (view.pages.length || 1);
  const success = view.evidenceSummary?.successfulPageCount ?? view.pages.length;
  const items = [
    ['확인된 요소', `${stats.confirmed}개`, '공개 페이지에서 실제 신호를 찾은 항목입니다.'],
    ['누락 의심', `${stats.suspected}개`, '고객이 바로 찾기 어려운 보완 후보입니다.'],
    ['검토 필요', `${stats.manual}개`, '로그인, 외부 결제, 업종 판단처럼 자동 확정하지 않은 항목입니다.'],
    ['자동 초안', `${stats.autoDrafts}개`, '문구·위치·정책 링크 보완 후보를 바로 만들 수 있습니다.']
  ];
  return `<section class="discovery-summary"><div class="section-title"><span class="pill gold">결과 요약</span><h3>먼저 무엇이 보였고, 무엇이 부족한지 보여드립니다</h3><p>전체 ${escapeHtml(attempted)}개 후보 중 ${escapeHtml(success)}개 공개 페이지를 확인했습니다. 점검 방식보다 고객이 바로 이해할 수 있는 발견 결과를 앞에 배치했습니다.</p></div><div class="discovery-kpi-grid">${items.map(([title, value, desc]) => `<article><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(desc)}</p></article>`).join('')}</div></section>`;
}
function renderEvidenceMatrix(view) {
  const pages = view.evidenceSummary?.successfulPageCount ?? view.pages.length;
  const attempted = view.evidenceSummary?.attemptedPageCount ?? (view.pages.length || 1);
  const confidence = confidenceBadge(view.evidenceSummary?.confidenceScore, view.evidenceSummary?.confidenceLabel);
  const items = [
    ['실제 확인 페이지', `${pages}/${attempted}개`, '홈, 연결된 공개 페이지, robots.txt, sitemap.xml에서 접근 가능한 공개 페이지를 확인했습니다.'],
    ['찾은 신호', evidencePagesText(view.pages), '확인된 URL을 남겨 사용자가 근거를 직접 따라갈 수 있게 했습니다.'],
    ['검토 분리', `${view.scoreModel?.manualReviewCount ?? 0}개`, '로그인 후 화면, 외부 결제창, 업종별 판단은 결과에서 따로 표시합니다.'],
    ['수집 신뢰도', confidence, '점수는 법적 결론이 아니라 공개 페이지에서 발견한 신호의 강도입니다.']
  ];
  return `<section class="evidence-matrix"><div class="section-title"><span class="pill">점검 근거</span><h3>근거는 남기고, 어려운 처리 설명은 뒤로 뺐습니다</h3></div><div class="evidence-matrix-grid">${items.map(([title, value, desc]) => `<article><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(desc)}</p></article>`).join('')}</div></section>`;
}

function renderAutomationDisclosure(view) {
  const disclosure = view.automationDisclosure || {};
  const plan = view.automatedActionPlan || {};
  const autoChecks = Array.isArray(disclosure.automatedChecks) ? disclosure.automatedChecks : [];
  const manualBoundaries = Array.isArray(disclosure.manualBoundaries) ? disclosure.manualBoundaries : [];
  const fixes = Array.isArray(plan.automaticFixes) ? plan.automaticFixes : [];
  const manual = Array.isArray(plan.manualReviews) ? plan.manualReviews : [];
  const visibleAuto = autoChecks.length ? autoChecks.slice(0, 6) : ['홈 HTML 확인', '연결된 공개 페이지 후보 추출', 'robots.txt에서 sitemap 위치 확인', 'sitemap.xml에서 주요 공개 URL 추출'];
  const visibleManual = (manualBoundaries.length ? manualBoundaries : manual.map(item => item.title || item.reason)).slice(0, 6);
  return `<section class="automation-disclosure" aria-label="자동화와 검토 기준">
    <div class="section-title"><span class="pill green">처리 기준</span><h3>자동으로 확인한 것과 사람이 봐야 할 것을 나눴습니다</h3><p class="muted">가능한 것은 자동 처리하고, 불가능한 것은 숨기지 않습니다. 다만 화면에는 처리 방식보다 사용자가 고칠 수 있는 결과를 먼저 보여줍니다.</p></div>
    <div class="evidence-matrix-grid">
      <article><span>확인됨</span><strong>${escapeHtml(visibleAuto.length)}개 흐름</strong><p>${escapeHtml(disclosure.clearNotice || '공개 접근 가능한 페이지와 링크 후보를 확인했습니다.')}</p></article>
      <article><span>보완 초안</span><strong>${escapeHtml(fixes.length || 0)}개</strong><p>환불, 문의, 개인정보, 결제 전 안내처럼 바로 고칠 문구 후보를 만듭니다.</p></article>
      <article><span>검토 필요</span><strong>${escapeHtml(manual.length || disclosure.manualFindingCount || 0)}개</strong><p>로그인 후 화면, 외부 결제창, 업종별 판단은 자동으로 단정하지 않습니다.</p></article>
      <article><span>탐색 출처</span><strong>홈·링크·robots·sitemap</strong><p>무료 공개 접근 가능한 후보 URL을 우선 확인합니다.</p></article>
    </div>
    <div class="tool-status-grid automation-list">
      ${visibleAuto.map(item => `<article><b>확인됨</b><span>${escapeHtml(item)}</span></article>`).join('')}
      ${visibleManual.map(item => `<article><b>검토 필요</b><span>${escapeHtml(manualReasonFor(item))}</span></article>`).join('')}
    </div>
    <p class="muted">${escapeHtml(disclosure.principle || '자동 확인 가능한 공개 신호는 우선 수집하고, 자동 확정이 보완한 항목은 검토 필요로 분리합니다.')}</p>
  </section>`;
}
function renderVerifiedPages(view) {
  const pages = view.pages.length ? view.pages : [];
  return `<section class="verified-pages"><div class="section-title"><span class="pill gray">확인 URL</span><h3>실제로 수집한 공개 페이지</h3></div>${pages.length ? `<div class="page-chip-list">${pages.map(page => { const label = page.finalUrl || page.url || String(page); const status = page.status ? `HTTP ${page.status}` : '상태 미확인'; return `<span><b>${escapeHtml(status)}</b>${escapeHtml(label)}</span>`; }).join('')}</div>` : '<p class="muted">확인 가능한 공개 페이지를 충분히 수집하지 못했습니다. JS 렌더링 또는 접근 제한 여부를 확인하세요.</p>'}</section>`;
}
function renderEvidenceFindings(view) {
  const items = view.risks.slice(0, 5);
  return `<section class="evidence-findings clean-detected"><div class="section-title"><span class="pill gold">발견 결과</span><h3>고객이 궁금해할 항목을 세부 요소로 풀었습니다</h3><p>고객이 바로 이해할 수 있도록, 어느 항목을 봤고 어떤 요소가 부족해 보이는지 바로 확인할 수 있게 확인할 수 있습니다.</p></div><div class="evidence-finding-list">${items.map((item, index) => {
    const label = statusLabelForFinding(item);
    const elements = topicElementsFor(`${item.title} ${item.category} ${item.impact}`).slice(0, 4);
    return `<article class="evidence-finding ${escapeAttr(priorityTone(item.priority))}">
      <div class="evidence-finding-head"><span>0${escapeHtml(index + 1)}</span><div><b>${escapeHtml(item.title)}</b><small><em class="result-label">${escapeHtml(label)}</em> ${escapeHtml(item.category)} · ${escapeHtml(item.priority)} · 신뢰도 ${escapeHtml(item.certainty)}</small></div></div>
      <p>${escapeHtml(item.impact)}</p>
      <div class="detected-element-list">${elements.map(element => `<span>${escapeHtml(element)}</span>`).join('')}</div>
      <dl>
        <div><dt>근거</dt><dd>${escapeHtml(item.evidence || '표시 가능한 본문 근거가 제한적입니다.')}</dd></div>
        <div><dt>확인 위치</dt><dd>${escapeHtml(evidencePagesText(item.sourcePages))}</dd></div>
        <div><dt>부족해 보이는 점</dt><dd>${escapeHtml(item.limitation || (item.manualReviewRequired ? '공개 화면만으로는 확정하기 어렵습니다.' : '고객이 바로 찾기 쉬운 위치인지 추가 확인이 필요합니다.'))}</dd></div>
        <div><dt>다음 조치</dt><dd>${escapeHtml(item.action)}</dd></div>
      </dl>
    </article>`;
  }).join('')}</div></section>`;
}

function renderExternalToolPlan(view) {
  const rows = externalToolStatus(view);
  return `<section class="external-tool-plan"><div class="section-title"><span class="pill green">정밀도 고도화</span><h3>추가 비용 없이 기본 탐지, 필요할 때만 외부 측정 연결</h3></div><div class="tool-status-grid">${rows.map(([name, status]) => `<article><b>${escapeHtml(name)}</b><span>${escapeHtml(status)}</span></article>`).join('')}</div><p class="muted">기본 구조는 무료 HTTP 수집과 내장 규칙입니다. Playwright, Lighthouse, Search Console, Gemini는 필요할 때만 켜는 보조 계층입니다. AI는 해석 보조이며 측정 원천은 아닙니다.</p></section>`;
}

function countDemoBuckets(view) {
  const overview = view.demoIssueOverview || {};
  const risks = Array.isArray(view.risks) ? view.risks : [];
  const areas = Array.isArray(overview.areaBreakdown) && overview.areaBreakdown.length
    ? overview.areaBreakdown.map((row, index) => ({
        area: row.area || `리스크 영역 ${index + 1}`,
        issueCount: Number(row.issueCount || 0),
        elementCount: Number(row.elementCount || (Array.isArray(row.elements) ? row.elements.length : 0)),
        classification: row.classification || '누락 의심'
      }))
    : risks.slice(0, 6).map((item, index) => ({
        area: item.area || item.category || `리스크 영역 ${index + 1}`,
        issueCount: 1,
        elementCount: Math.max(1, (item.elements || []).length || topicElementsFor(item.title || item.category).length),
        classification: item.manualReviewRequired ? '검토 필요' : statusLabelForFinding(item)
      }));
  const classCounts = areas.reduce((acc, row) => {
    const key = row.classification || '누락 의심';
    acc[key] = (acc[key] || 0) + Number(row.issueCount || 0);
    return acc;
  }, {});
  const totalIssues = Number(overview.totalIssueCount || areas.reduce((sum, row) => sum + Number(row.issueCount || 0), 0) || risks.length || 0);
  const totalElements = Number(overview.elementCount || areas.reduce((sum, row) => sum + Number(row.elementCount || 0), 0) || 0);
  return { areas, classCounts, totalIssues, totalElements, areaCount: Number(overview.areaCount || areas.length || 0) };
}


function clampDashboardWidth(value, max = 100) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 8;
  return Math.max(8, Math.min(100, Math.round((number / Math.max(1, Number(max || 1))) * 100)));
}

function vr360Tone(score) {
  const value = normalizePercent(score, 0);
  if (value >= 72) return 'critical';
  if (value >= 52) return 'danger';
  if (value >= 34) return 'watch';
  return 'stable';
}

function vr360RiskLabel(score) {
  const value = normalizePercent(score, 0);
  if (value >= 72) return '즉시 개선 검토';
  if (value >= 52) return '우선 개선 권고';
  if (value >= 34) return '주의 관찰';
  return '기본 관리';
}

function vr360RiskGrade(score) {
  const value = normalizePercent(score, 0);
  if (value >= 82) return 'GRADE E';
  if (value >= 68) return 'GRADE D';
  if (value >= 48) return 'GRADE C';
  if (value >= 28) return 'GRADE B';
  return 'GRADE A';
}

function executiveReportModel(view) {
  const buckets = countDemoBuckets(view);
  const urgency = conversionUrgencyFor(view);
  const score = normalizePercent(urgency.crisisScore, normalizePercent(view.riskScore, 0));
  const visibleIssueCount = Math.min(2, Math.max(0, buckets.totalIssues));
  const manualReviewCount = Number(view.scoreModel?.manualReviewCount ?? buckets.classCounts?.['검토 필요'] ?? 0);
  const confirmedPageCount = Number(view.evidenceSummary?.successfulPageCount ?? view.pages.length ?? 0);
  const attemptedPageCount = Number(view.evidenceSummary?.attemptedPageCount ?? Math.max(confirmedPageCount, view.pages.length, 1));
  const lockedItemCount = Math.max(0, Number(view.lockedCount || 0), buckets.totalElements - visibleIssueCount, buckets.totalIssues - visibleIssueCount);
  const reportSeed = String(view.siteId || view.target || 'FREE-PREVIEW').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'FREEPREVIEW';
  const confidenceLabel = view.scoreModel?.confidenceLabel || (confirmedPageCount >= 4 ? '중간 이상' : '예비 진단');
  const headline = score >= 72
    ? '구매 직전 확인해야 할 신뢰 공백이 우선 조치 대상으로 분류되었습니다.'
    : score >= 52
      ? '구매 결정을 지연시킬 수 있는 안내 공백이 확인되었습니다.'
      : '기본 구조는 확인됐지만 구매 전 신뢰 신호를 더 선명하게 만들 수 있습니다.';
  const decision = score >= 72
    ? '상세 근거를 열어 결제 전 안내와 복구 경로부터 우선 정비하는 편이 좋습니다.'
    : score >= 52
      ? '상세 근거를 열어 우선순위가 높은 영역부터 수정 위치를 확인하는 편이 좋습니다.'
      : '상세 근거를 열어 개선 효율이 높은 항목부터 선별 적용하는 편이 좋습니다.';
  return {
    buckets,
    urgency,
    score,
    tone: vr360Tone(score),
    riskLabel: vr360RiskLabel(score),
    riskGrade: vr360RiskGrade(score),
    visibleIssueCount,
    manualReviewCount,
    confirmedPageCount,
    attemptedPageCount,
    lockedItemCount,
    reportId: `VRD-${reportSeed}`,
    confidenceLabel,
    generatedAt: formatDate(view.generatedAt),
    headline,
    decision
  };
}

function renderVr360DocumentControl(view, model, paid = false) {
  return `<section class="vrd-document-control" aria-label="리포트 통제 정보">
    <div><span>REPORT ID</span><strong>${escapeHtml(model.reportId)}</strong></div>
    <div><span>REPORT CLASS</span><strong>${paid ? 'CLIENT CONFIDENTIAL' : 'FREE PREVIEW · CONTROLLED DISCLOSURE'}</strong></div>
    <div><span>SCOPE</span><strong>PUBLIC WEB SIGNALS</strong></div>
    <div><span>ISSUED</span><strong>${escapeHtml(model.generatedAt)}</strong></div>
  </section>`;
}

function renderVr360ExecutiveHero(view, model = executiveReportModel(view), paid = false) {
  const checkout = `/checkout?plan=Report&siteId=${encodeURIComponent(view.siteId || '')}&riskScore=${encodeURIComponent(model.score)}`;
  return `<section class="vrd-cover ${escapeAttr(model.tone)}" aria-label="VERIDION 신뢰 리스크 경영진 요약 보고서">
    <div class="vrd-cover-bar"><span>VERIDION · DIGITAL TRUST ADVISORY</span><strong>${paid ? 'FULL REPORT · 100% OPEN' : 'FREE EXECUTIVE BRIEF · 25% OPEN'}</strong></div>
    ${renderVr360DocumentControl(view, model, paid)}
    <div class="vrd-cover-grid">
      <div class="vrd-cover-copy">
        <div class="vrd-report-meta"><span>공개 웹페이지 자동 진단</span><span>의사결정용 예비 보고서</span><span>${paid ? '상세 근거 공개' : '상세 분석 75% 잠금'}</span></div>
        <p class="vrd-report-code">EXECUTIVE TRUST RISK BRIEF</p>
        <h2>${escapeHtml(model.headline)}</h2>
        <p>고객은 가격, 환불, 문의, 개인정보, 사업자 안내를 찾기 어려우면 결제 직전에 추가 확인을 시작합니다. 이 보고서는 법률 판단이나 실제 매출 손실 확정값이 아니라, <b>공개 화면에서 우선 점검해야 할 신뢰 공백의 상대 강도</b>를 정리한 의사결정 자료입니다.</p>
        <div class="vrd-executive-callout"><span>MANAGEMENT DECISION</span><strong>${escapeHtml(model.decision)}</strong></div>
        <div class="vrd-target"><span>분석 대상</span><strong>${escapeHtml(view.target)}</strong></div>
        <div class="vrd-cover-actions"><a class="btn primary" href="${escapeAttr(checkout)}">${escapeHtml(REPORT_LABEL)} 열기</a><a class="btn secondary" href="/checkout?plan=Expert&siteId=${escapeAttr(view.siteId)}">${escapeHtml(EXPERT_LABEL)} 보기</a><button class="vrd-retry" type="button" id="vr360RetryBtn">다시 점검</button></div>
      </div>
      <aside class="vrd-score-card" aria-label="신뢰 리스크 지수 ${escapeAttr(model.score)}점">
        <div class="vrd-score-head"><span>TRUST EXPOSURE INDEX</span><b>${escapeHtml(model.riskLabel)}</b></div>
        <div class="vrd-score-grade">${escapeHtml(model.riskGrade)}</div>
        <div class="vrd-score-number"><strong>${escapeHtml(model.score)}</strong><em>/100</em></div>
        <div class="vrd-score-track"><i class="${meterWidthClass(model.score)}"></i></div>
        <div class="vrd-score-scale"><span>낮은 위험</span><span>즉시 점검</span></div>
        <dl class="vrd-score-facts"><div><dt>진단 신뢰도</dt><dd>${escapeHtml(model.confidenceLabel)}</dd></div><div><dt>확인 페이지</dt><dd>${escapeHtml(model.confirmedPageCount)}/${escapeHtml(model.attemptedPageCount)}</dd></div><div><dt>산정 방식</dt><dd>공개 신호 상대 비교</dd></div></dl>
      </aside>
    </div>
    <div class="vrd-kpi-strip" aria-label="경영진 요약 핵심 지표">
      <article><span>발견 문제</span><strong>${escapeHtml(model.buckets.totalIssues)}</strong><small>개</small></article>
      <article><span>리스크 영역</span><strong>${escapeHtml(model.buckets.areaCount)}</strong><small>개</small></article>
      <article><span>무료 공개</span><strong>${escapeHtml(model.visibleIssueCount)}</strong><small>개 항목</small></article>
      <article class="locked"><span>상세 잠금</span><strong>${escapeHtml(model.lockedItemCount)}</strong><small>개 분석</small></article>
      <article><span>직접 확인</span><strong>${escapeHtml(model.manualReviewCount)}</strong><small>개</small></article>
    </div>
  </section>`;
}

function renderVr360ReportIndex(view, paid = false, model = executiveReportModel(view)) {
  const chapters = [
    ['01', 'Executive Decision', '공개'],
    ['02', 'Trust Exposure Map', '일부'],
    ['03', 'Buyer Friction Path', '공개'],
    ['04', 'Priority Register', '일부'],
    ['05', 'Evidence Ledger', paid ? '공개' : '잠금'],
    ['06', 'Fix Specification', paid ? '공개' : '잠금'],
    ['07', '14-Day Roadmap', paid ? '공개' : '잠금'],
    ['08', 'Recheck Protocol', paid ? '공개' : '잠금']
  ];
  return `<aside class="vrd-index" aria-label="리포트 목차">
    <div class="vrd-index-title"><span>REPORT NAVIGATION</span><strong>${paid ? '상세 실행 리포트' : '경영진 무료 요약'}</strong><small>${paid ? '실행 가능한 전체 보고서' : '유료 리포트 전체 구성의 약 25%'}</small></div>
    <div class="vrd-open-meter"><div><b>공개 범위</b><strong>${paid ? '100%' : '25%'}</strong></div><span><i class="${paid ? 'vr-meter-width vr-pct-100' : 'vr-meter-width vr-pct-25'}"></i></span></div>
    <nav aria-label="리포트 섹션">${chapters.map(([no, title, status], index) => `<a href="#${['vrdDecision','vrdRiskMap','vrdJourney','vrdPriority','vrdEvidence','vrdFixPlan','vrdRoadmap','vrdProtocol'][index]}"><b>${escapeHtml(no)}</b><span>${escapeHtml(title)}</span><em class="${status === '잠금' ? 'lock' : ''}">${escapeHtml(status)}</em></a>`).join('')}</nav>
    <div class="vrd-index-lock"><span>CONTROLLED DISCLOSURE</span><strong>${escapeHtml(model.lockedItemCount)}개 상세 분석 잠금</strong><p>근거 URL, 정확한 위치, 수정 전후 문구, 실행 순서, 재점검 기준이 잠겨 있습니다.</p></div>
    <a class="btn primary" href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">상세 실행 리포트 열기</a>
  </aside>`;
}

function renderVr360ExecutiveBrief(view, model = executiveReportModel(view)) {
  const issueLead = model.buckets.totalIssues > 0 ? `${model.buckets.totalIssues}개 문제 후보가 ${model.buckets.areaCount}개 영역에 걸쳐 있습니다.` : '공개 화면에서 즉시 확인되는 중대 문제 후보는 제한적입니다.';
  return `<section class="vrd-card vrd-decision" id="vrdDecision" aria-label="경영진 판단 요약">
    <header class="vrd-section-head"><div><span>01 · EXECUTIVE DECISION</span><h3>지금 경영진이 알아야 할 세 가지</h3><p>무료 화면은 의사결정에 필요한 방향만 공개하고 실행 명세는 잠급니다.</p></div><em>BOARD BRIEF</em></header>
    <div class="vrd-decision-grid">
      <article><b>01</b><span>WHY IT MATTERS</span><strong>${escapeHtml(issueLead)}</strong><p>신뢰 정보 탐색이 길어지면 고객은 구매보다 추가 확인을 선택할 수 있습니다.</p></article>
      <article><b>02</b><span>WHAT IS VERIFIED</span><strong>공개 페이지 ${escapeHtml(model.confirmedPageCount)}개를 우선 확인했습니다.</strong><p>로그인 이후 화면과 외부 결제창은 자동 확정하지 않고 직접 확인 대상으로 분리합니다.</p></article>
      <article class="locked"><b>03</b><span>WHAT TO DO NEXT</span><strong>정확한 수정 위치와 문구는 잠겨 있습니다.</strong><p>상세 리포트에서 적용 순서, 수정 전후 문구, 재점검 기준을 확인합니다.</p></article>
    </div>
  </section>`;
}

function renderVr360RiskMap(view, model = executiveReportModel(view)) {
  const rows = model.buckets.areas.slice(0, 6);
  const maxIssue = Math.max(1, ...rows.map(row => Number(row.issueCount || 0)));
  const maxElement = Math.max(1, ...rows.map(row => Number(row.elementCount || 0)));
  const visibleRows = rows.slice(0, 2);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length, model.buckets.areaCount - visibleRows.length);
  return `<article class="vrd-card vrd-risk-card" id="vrdRiskMap">
    <header class="vrd-section-head"><div><span>02 · TRUST EXPOSURE MAP</span><h3>구매 검토를 늦출 수 있는 신뢰 공백</h3><p>영역별 문제 신호와 관련 요소 범위를 상대 비교합니다.</p></div><em>PARTIAL OPEN</em></header>
    <div class="vrd-heatmap">${visibleRows.map((row, index) => `<div class="vrd-heat-row">
      <div class="vrd-heat-label"><b>${escapeHtml(String(index + 1).padStart(2, '0'))}</b><span>${escapeHtml(row.area)}</span></div>
      <div class="vrd-heat-track"><i class="${meterWidthClass(clampDashboardWidth(row.issueCount, maxIssue))}"></i><em class="${meterWidthClass(clampDashboardWidth(row.elementCount, maxElement))}"></em></div>
      <div class="vrd-heat-count"><strong>${escapeHtml(row.issueCount)}</strong><small>신호</small></div>
    </div>`).join('') || '<p class="muted">영역별 위험 신호를 정리하고 있습니다.</p>'}
    ${hiddenCount > 0 ? `<div class="vrd-heat-locked"><span>LOCKED EXPOSURE AREAS</span><strong>추가 위험 영역 ${escapeHtml(hiddenCount)}개</strong><p>영역별 근거 URL, 페이지 위치, 관련 요소는 상세 리포트에서 공개됩니다.</p></div>` : ''}</div>
    <footer class="vrd-card-foot"><span><i class="risk"></i>문제 신호</span><span><i class="scope"></i>관련 요소 범위</span><small>공개 페이지 기준 상대 비교</small></footer>
  </article>`;
}

function renderVr360Journey(view, model = executiveReportModel(view)) {
  const stages = [
    ['01', '첫 방문', '사업자와 브랜드 신뢰 신호 확인', '초기 판단'],
    ['02', '상품 검토', '가격·혜택·제공 범위 비교', '구매 이유 검토'],
    ['03', '결제 직전', '환불·문의·개인정보 안내 재확인', `${model.buckets.totalIssues}개 공백 영향 가능`],
    ['04', '결정 또는 이탈', '불안이 남으면 문의·보류·이탈', model.score >= 52 ? '우선 점검' : '개선 권장']
  ];
  return `<article class="vrd-card vrd-journey-card" id="vrdJourney">
    <header class="vrd-section-head"><div><span>03 · BUYER FRICTION PATH</span><h3>고객의 망설임은 결제 직전에 커집니다</h3><p>실제 이탈률 측정값이 아니라, 확인된 신뢰 공백이 영향을 줄 수 있는 지점을 표시합니다.</p></div></header>
    <div class="vrd-journey">${stages.map(([step,title,desc,state], index) => `<div class="vrd-journey-step step-${index + 1}"><b>${escapeHtml(step)}</b><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(desc)}</small></div><em>${escapeHtml(state)}</em></div>`).join('')}</div>
  </article>`;
}

function renderVr360ControlSnapshot(view, model = executiveReportModel(view)) {
  const controls = [
    ['신뢰 정보 발견성', '고객이 필요한 안내를 빠르게 찾을 수 있는가', model.buckets.totalIssues > 0 ? 'GAP SIGNAL' : 'BASELINE'],
    ['구매 전 고지 일관성', '가격·환불·제공 범위가 연결돼 있는가', model.score >= 52 ? 'REVIEW' : 'WATCH'],
    ['문의·복구 경로', '문제가 생겼을 때 다음 행동이 선명한가', model.manualReviewCount > 0 ? 'VERIFY' : 'WATCH'],
    ['개인정보 안내 연결성', '수집·이용 안내가 구매 흐름에서 확인되는가', 'DETAIL LOCKED']
  ];
  return `<section class="vrd-card vrd-control-snapshot" aria-label="신뢰 통제 스냅샷">
    <header class="vrd-section-head"><div><span>CONTROL SNAPSHOT</span><h3>무료 요약에서 확인되는 통제 상태</h3><p>판단 방향은 공개하지만 페이지별 판정 근거는 잠급니다.</p></div><em>4 CONTROLS</em></header>
    <div class="vrd-control-grid">${controls.map(([title, desc, state], index) => `<article class="${index === 3 ? 'locked' : ''}"><b>${escapeHtml(String(index + 1).padStart(2, '0'))}</b><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(desc)}</p></div><em>${escapeHtml(state)}</em></article>`).join('')}</div>
  </section>`;
}

function renderVr360PriorityIssues(view, model = executiveReportModel(view)) {
  const rows = (view.risks || []).slice(0, 4);
  const visible = rows.slice(0, 2);
  const hidden = Math.max(1, rows.length - visible.length, model.buckets.totalIssues - visible.length);
  return `<section class="vrd-card vrd-priority" id="vrdPriority" aria-label="무료 공개 우선 조치 원장">
    <header class="vrd-section-head"><div><span>04 · PRIORITY REGISTER</span><h3>먼저 해결해야 할 조치 후보</h3><p>무료 화면은 문제 방향과 영향 가능성만 공개합니다. 정확한 위치, 근거 URL, 수정 전후 문구는 잠급니다.</p></div><em>TOP ACTIONS</em></header>
    <div class="vrd-priority-table-head"><span>RANK</span><span>ISSUE DIRECTION</span><span>DISCLOSURE</span></div>
    <div class="vrd-priority-list">${visible.map((item, index) => `<article>
      <div class="vrd-priority-rank"><b>${escapeHtml(String(index + 1).padStart(2, '0'))}</b><span>${escapeHtml(item.priority || (index === 0 ? 'P1' : 'P2'))}</span></div>
      <div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.impact || item.limitation || '고객이 필요한 안내를 바로 확인하기 어려울 수 있습니다.')}</p><small>${escapeHtml(item.area || item.category || '신뢰 안내 영역')} · 근거 확인됨 · 수정 위치 잠금</small></div>
      <a href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">상세 열기 <i aria-hidden="true">→</i></a>
    </article>`).join('') || '<p class="muted">우선 조치 후보를 정리하고 있습니다.</p>'}
      <article class="vrd-priority-locked"><div class="vrd-priority-rank"><b>+</b><span>LOCKED</span></div><div><h4>추가 조치 후보 ${escapeHtml(hidden)}개</h4><p>근거 URL, 페이지 내 정확한 위치, 수정 문구 초안과 적용 순서는 상세 리포트에서 공개됩니다.</p><small>실행 명세 잠금</small></div><a href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">잠금 해제 <i aria-hidden="true">→</i></a></article>
    </div>
  </section>`;
}

function renderVr360DecisionMemo(view, model = executiveReportModel(view)) {
  return `<section class="vrd-decision-memo" aria-label="결정 메모">
    <div><span>DECISION MEMO</span><h3>무료 요약으로 방향을 확인하고, 상세 리포트로 실행 단위를 여세요.</h3><p>지금 필요한 것은 막연한 문제 목록이 아니라 무엇을, 어느 페이지에서, 어떤 문장으로, 어떤 순서로 고칠지 결정할 수 있는 실행 명세입니다.</p></div>
    <dl><div><dt>무료 공개</dt><dd>위험 방향 · 상대 강도 · 우선 조치 일부</dd></div><div><dt>상세 공개</dt><dd>근거 URL · 정확한 위치 · 수정 전후 문구 · 14일 로드맵</dd></div><div><dt>전문가 플랜</dt><dd>검토 노트 · 적용 지원 · 재점검 기준</dd></div></dl>
  </section>`;
}

function renderVr360Unlock(view, model = executiveReportModel(view)) {
  const outline = [
    ['05', 'Evidence Ledger', '페이지별 근거 URL과 확인 상태'],
    ['06', 'Fix Specification', '정확한 위치와 수정 전후 문구'],
    ['07', '14-Day Roadmap', '영향도·난이도 기반 적용 순서'],
    ['08', 'Recheck Protocol', '적용 후 재점검 체크리스트'],
    ['09', 'Executive Appendix', '판단 한계와 직접 확인 항목'],
    ['10', 'Expert Review Notes', '전문가 플랜 전용 검토 노트']
  ];
  return `<section class="vrd-premium" id="vrdEvidence" aria-label="유료 리포트 잠금 미리보기">
    <div class="vrd-premium-copy"><span>CONTROLLED DISCLOSURE · 75% LOCKED</span><h3>문제의 방향은 확인했습니다.<br/>이제 실행 가능한 근거 원장을 여세요.</h3><p>상세 리포트는 단순 문제 목록이 아닙니다. 페이지별 근거, 정확한 수정 위치, 수정 전후 문구, 적용 순서, 재점검 기준을 하나의 실행 문서로 묶습니다.</p><div class="vrd-premium-benefits"><b>Evidence Ledger</b><b>Fix Specification</b><b>14-Day Roadmap</b><b>Recheck Protocol</b><b>Executive Appendix</b></div><small>잠금된 상세 분석 ${escapeHtml(model.lockedItemCount)}개 · 필요한 산출물만 선택할 수 있습니다.</small></div>
    <div class="vrd-premium-sheet" aria-label="상세 리포트 목차 미리보기">${outline.map(([no,title,desc]) => `<div class="locked"><b>${escapeHtml(no)}</b><span>${escapeHtml(title)}</span><em>${escapeHtml(desc)}</em></div>`).join('')}</div>
    <div class="vrd-premium-actions"><a class="btn primary" href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">${escapeHtml(REPORT_LABEL)} 열기</a><a class="btn secondary" href="/checkout?plan=Expert&siteId=${escapeAttr(view.siteId)}">${escapeHtml(EXPERT_LABEL)} 보기</a><small>결과를 검토한 뒤 필요한 플랜만 선택하세요.</small></div>
  </section>`;
}

function renderPaidExecutiveReport(scan, model) {
  const view = normalizeScan(scan);
  const details = detailRows(scan).map(normalizeRiskItem).slice(0, 10);
  const actions = (view.recommendedActions || []).slice(0, 8);
  return `<section class="vrd-paid-report" id="vrdEvidence" aria-label="상세 실행 리포트">
    <header class="vrd-section-head"><div><span>05 · EVIDENCE LEDGER & FIX SPECIFICATION</span><h3>페이지별 근거와 실행 명세</h3><p>유료 리포트에서 확인 가능한 상세 근거와 우선 조치입니다.</p></div><em>100% OPEN</em></header>
    <div class="vrd-paid-grid"><article><h4>Evidence Ledger</h4>${details.map((item, index) => `<section class="vrd-paid-row"><b>${escapeHtml(String(index + 1).padStart(2, '0'))}</b><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.evidence || item.impact || '공개 페이지 기준 확인 항목입니다.')}</p><small>${escapeHtml(item.action || '적용 위치를 확인하고 우선순위에 따라 수정하세요.')}</small></div><em>${escapeHtml(item.priority || 'P2')}</em></section>`).join('') || '<p class="muted">상세 근거를 정리하고 있습니다.</p>'}</article><aside id="vrdRoadmap"><h4>14-Day Roadmap</h4>${actions.map((item, index) => `<div class="vrd-roadmap-row"><b>DAY ${escapeHtml(String(index + 1).padStart(2, '0'))}</b><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.nextStep || item.reason || '우선순위에 따라 적용하세요.')}</small></div></div>`).join('') || '<p class="muted">실행 순서를 정리하고 있습니다.</p>'}<div class="vrd-paid-note" id="vrdProtocol">적용 후 재점검 체크리스트와 전문가 검토 노트는 고객 포털에서 확인할 수 있습니다.</div></aside></div>
  </section>`;
}

function renderPaidCleanResult(scan, model) {
  return renderPaidExecutiveReport(scan, model || executiveReportModel(normalizeScan(scan)));
}

function renderVr360TechnicalDetails(view, scan, paid = false, model = executiveReportModel(view)) {
  if (paid) return `<details class="vrd-details" id="vrdProtocol"><summary><div><span>APPENDIX · METHODOLOGY</span><b>기술 근거·확인 URL·진단 한계 펼쳐보기</b><small>결제된 상세 리포트의 근거 자료를 확인합니다.</small></div><i aria-hidden="true">+</i></summary><div class="vrd-detail-stack">${renderResultMetaSummary(view, scan)}${renderDiscoverySummary(view)}${renderEvidenceMatrix(view)}${renderEvidenceFindings(view)}${renderVerifiedPages(view)}${renderAutomationDisclosure(view)}${renderExternalToolPlan(view)}</div></details>`;
  return `<details class="vrd-details" id="vrdProtocol"><summary><div><span>APPENDIX · METHODOLOGY & LIMITS</span><b>무료 진단의 확인 범위와 판단 한계</b><small>무료 화면은 전체 리포트의 약 25%만 공개합니다.</small></div><i aria-hidden="true">+</i></summary><div class="vrd-free-method"><article><span>확인 범위</span><strong>${escapeHtml(model.confirmedPageCount)}/${escapeHtml(model.attemptedPageCount)}개 공개 페이지</strong><p>공개 접근 가능한 URL과 기본 안내 신호를 우선 확인했습니다.</p></article><article><span>자동 확정 제외</span><strong>로그인·외부 결제·업종별 판단</strong><p>공개 화면만으로 단정하기 어려운 영역은 직접 확인 대상으로 분리합니다.</p></article><article class="locked"><span>상세 근거 원장</span><strong>75% CONTROLLED DISCLOSURE</strong><p>근거 URL, 페이지별 위치, 수정 문구, 실행 순서, 재점검 기준은 상세 리포트에서 공개됩니다.</p></article></div></details>`;
}

function renderVr360StickyCta(view, model = executiveReportModel(view)) {
  return `<aside class="vrd-sticky" aria-label="상세 실행 리포트 구매 안내"><div><span aria-hidden="true"></span><b>무료 공개 25% · 상세 분석 ${escapeHtml(model.lockedItemCount)}개 잠금</b><small>근거 URL, 정확한 수정 위치, 적용 문구, 14일 로드맵을 여세요.</small></div><a class="btn primary" href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">상세 실행 리포트 열기</a></aside>`;
}

function renderVr360Result(view, scan) {
  const paid = hasPaidAccess(scan);
  const model = executiveReportModel(view);
  return `<div class="vrd-report-shell">
    ${renderResultToolbar(view, scan)}
    ${renderVr360ExecutiveHero(view, model, paid)}
    <div class="vrd-report-layout" id="vrdOverview">
      ${renderVr360ReportIndex(view, paid, model)}
      <main class="vrd-report-main">
        ${renderVr360ExecutiveBrief(view, model)}
        <section class="vrd-dashboard-grid" aria-label="진단 인포그래픽">${renderVr360RiskMap(view, model)}${renderVr360Journey(view, model)}</section>
        ${renderVr360ControlSnapshot(view, model)}
        ${renderVr360PriorityIssues(view, model)}
        ${renderVr360DecisionMemo(view, model)}
        ${paid ? renderPaidCleanResult(scan, model) : renderVr360Unlock(view, model)}
        ${renderVr360TechnicalDetails(view, scan, paid, model)}
      </main>
    </div>
    ${paid ? '' : renderVr360StickyCta(view, model)}
  </div>`;
}


function renderResult(scan) {
  const view = normalizeScan(scan);
  setResultHtml(renderVr360Result(view, scan));
  document.getElementById('vr360RetryBtn')?.addEventListener('click', runScan);
  document.getElementById('resultCopySummaryBtn')?.addEventListener('click', () => copyTextToClipboard(buildSummaryText(view), '진단 요약을 복사했습니다.'));
  document.getElementById('resultCopyJsonBtn')?.addEventListener('click', () => copyTextToClipboard(JSON.stringify(scan || {}, null, 2), '진단 JSON을 복사했습니다.'));
  document.getElementById('resultDownloadJsonBtn')?.addEventListener('click', () => {
    downloadScanJson(scan);
    setState('진단 JSON 파일을 다운로드했습니다.', 'success');
  });
  document.getElementById('resultShareBtn')?.addEventListener('click', () => copyTextToClipboard(resultShareUrl(scan), '공유 링크를 복사했습니다.'));
  document.getElementById('resultResetBtn')?.addEventListener('click', resetRenderedResult);
}
