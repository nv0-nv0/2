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

function renderPaidCleanResult(scan) {
  const view = normalizeScan(scan);
  const buckets = countDemoBuckets(view);
  const details = detailRows(scan).map(normalizeRiskItem);
  const actionRows = (view.recommendedActions || []).slice(0, 6);
  return `<section class="paid-result-clean" aria-label="유료 결과 화면">
    <div class="paid-result-hero"><div><span class="pill brand">유료 결과</span><h2>상세 근거와 개선안을 한 화면에서 확인하세요</h2><p>${escapeHtml(view.target)}</p></div><a class="btn secondary" href="/portal?siteId=${escapeAttr(view.siteId)}">고객 포털</a></div>
    <div class="paid-result-kpis"><article><span>종합 우선도</span><strong>${escapeHtml(view.riskScore ?? '-')}</strong><small>/100</small></article><article><span>리스크 영역</span><strong>${escapeHtml(buckets.areaCount)}</strong><small>상세 근거 포함</small></article><article><span>점검 요소</span><strong>${escapeHtml(buckets.totalElements)}</strong><small>수정 위치 포함</small></article><article><span>실행 과제</span><strong>${escapeHtml(actionRows.length)}</strong><small>우선순위 정렬</small></article></div>
    <div class="paid-result-grid"><article class="paid-detail-panel"><h3>페이지별 상세 근거</h3>${details.slice(0, 8).map((item, index) => `<section class="paid-detail-row"><div><b>${index + 1}. ${escapeHtml(item.title)}</b><p>${escapeHtml(item.evidence || item.impact || '공개 페이지 기준 확인 항목입니다.')}</p></div><span class="pill ${priorityTone(item.priority)}">${escapeHtml(item.priority || 'P2')}</span></section>`).join('') || '<p class="muted">상세 항목이 준비되지 않았습니다.</p>'}</article><aside class="paid-action-panel"><h3>권장 실행 순서</h3>${actionRows.map((item, index) => `<div class="paid-action-row"><span>${index + 1}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.nextStep || item.reason || '우선순위에 따라 적용하세요.')}</small></div></div>`).join('')}<div class="notice muted">${escapeHtml(EXPERT_OFFER?.title || '전문가 플랜')}은 수정 문구, 적용 위치, 재검사 기준까지 포함합니다.</div></aside></div>
  </section>`;
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
  if (value >= 72) return '즉시 개선 필요';
  if (value >= 52) return '우선 개선 권장';
  if (value >= 34) return '주의 관찰';
  return '기본 관리';
}

function renderVr360ExecutiveHero(view) {
  const buckets = countDemoBuckets(view);
  const model = conversionUrgencyFor(view);
  const score = normalizePercent(model.crisisScore, normalizePercent(view.riskScore, 0));
  const projected = normalizePercent(model.projectedAfterFixScore, Math.max(8, score - 18));
  const tone = vr360Tone(score);
  const checkout = `/checkout?plan=Report&siteId=${encodeURIComponent(view.siteId || '')}&riskScore=${encodeURIComponent(score)}`;
  const title = score >= 72
    ? '결제 직전 고객이 멈출 수 있는 신뢰 공백이 발견됐습니다.'
    : score >= 52
      ? '구매 결정을 늦추는 안내 공백을 먼저 정리해야 합니다.'
      : '기본 구조는 확인됐지만 구매 전 신뢰 신호를 더 선명하게 만들 수 있습니다.';
  return `<section class="vr360-hero ${escapeAttr(tone)}" aria-label="VERIDION 진단 결과 핵심 요약">
    <div class="vr360-hero-topline"><div><span class="vr360-eyebrow"><i aria-hidden="true"></i> VERIDION TRUST RISK REPORT</span><span class="vr360-scope">공개 화면 기준 무료 진단</span></div><button class="vr360-retry" type="button" id="vr360RetryBtn">다시 점검</button></div>
    <div class="vr360-hero-grid">
      <div class="vr360-hero-copy">
        <span class="vr360-alert-chip">구매 전환 위험 신호 감지</span>
        <h2>${escapeHtml(title)}</h2>
        <p>가격, 환불, 문의, 개인정보 안내가 흐리면 고객은 결제 직전에 멈춥니다. 아래 수치는 법적 판단이나 실제 매출 손실 확정값이 아니라, <b>먼저 해결해야 할 신뢰 공백의 우선순위</b>입니다.</p>
        <div class="vr360-domain">${escapeHtml(view.target)}</div>
        <div class="vr360-hero-actions">
          <a class="btn primary" href="${escapeAttr(checkout)}">${escapeHtml(REPORT_LABEL)} 열기</a>
          <a class="btn secondary" href="/checkout?plan=Expert&siteId=${escapeAttr(view.siteId)}">${escapeHtml(EXPERT_LABEL)} 보기</a>
        </div>
        <small>상세 리포트에서 페이지별 근거, 실제 수정 문구, 적용 위치, 재점검 기준을 확인할 수 있습니다.</small>
      </div>
      <aside class="vr360-gauge-card" aria-label="구매 전환 위기도 ${escapeAttr(score)}점">
        <div class="vr360-gauge ${percentClass(score)}"><div><span>구매 전환<br/>위기도</span><strong>${escapeHtml(score)}</strong><em>/100</em></div></div>
        <div class="vr360-gauge-caption"><b>${escapeHtml(vr360RiskLabel(score))}</b><span>개선 목표 ${escapeHtml(projected)}점 이하</span></div>
        <div class="vr360-gauge-delta"><span>현재</span><strong>${escapeHtml(score)}</strong><i aria-hidden="true">→</i><span>개선 목표</span><strong>${escapeHtml(projected)}</strong></div>
      </aside>
    </div>
    <div class="vr360-kpi-strip" aria-label="핵심 진단 지표">
      <article><span>발견 문제</span><strong>${escapeHtml(buckets.totalIssues)}</strong><small>개</small></article>
      <article><span>리스크 영역</span><strong>${escapeHtml(buckets.areaCount)}</strong><small>개</small></article>
      <article><span>점검 요소</span><strong>${escapeHtml(buckets.totalElements)}</strong><small>개</small></article>
      <article><span>직접 확인 필요</span><strong>${escapeHtml(view.scoreModel?.manualReviewCount ?? buckets.classCounts?.['검토 필요'] ?? 0)}</strong><small>개</small></article>
    </div>
  </section>`;
}

function renderVr360RiskMap(view) {
  const buckets = countDemoBuckets(view);
  const rows = buckets.areas.slice(0, 6);
  const maxIssue = Math.max(1, ...rows.map(row => Number(row.issueCount || 0)));
  const maxElement = Math.max(1, ...rows.map(row => Number(row.elementCount || 0)));
  return `<article class="vr360-card vr360-risk-map">
    <div class="vr360-card-head"><div><span class="vr360-mini-label danger">RISK HEATMAP</span><h3>구매를 막는 영역별 신뢰 공백</h3><p>빨간 막대는 문제 우선도, 금색 막대는 관련 요소 범위입니다.</p></div><small>상대 비교 기준</small></div>
    <div class="vr360-bar-list">${rows.map((row, index) => `<div class="vr360-bar-row">
      <div class="vr360-bar-label"><span>${escapeHtml(String(index + 1).padStart(2, '0'))}</span><b>${escapeHtml(row.area)}</b></div>
      <div class="vr360-bar-track"><i class="${meterWidthClass(clampDashboardWidth(row.issueCount, maxIssue))}"></i><em class="${meterWidthClass(clampDashboardWidth(row.elementCount, maxElement))}"></em></div>
      <div class="vr360-bar-count"><strong>${escapeHtml(row.issueCount)}</strong><small>문제</small></div>
    </div>`).join('') || '<p class="muted">영역별 문제를 정리하고 있습니다.</p>'}</div>
    <div class="vr360-legend"><span><i class="risk"></i>문제 우선도</span><span><i class="scope"></i>관련 요소 범위</span></div>
  </article>`;
}

function renderVr360Journey(view) {
  const buckets = countDemoBuckets(view);
  const model = conversionUrgencyFor(view);
  const score = normalizePercent(model.crisisScore, normalizePercent(view.riskScore, 0));
  const stages = [
    ['01', '사이트 방문', '첫인상과 신뢰 확인', '관심 형성'],
    ['02', '상품 검토', '가격·혜택·제공 범위 비교', '구매 이유 검토'],
    ['03', '결제 직전', '환불·문의·개인정보 확인', `${buckets.totalIssues}개 공백 영향 가능`],
    ['04', '구매 결정', '불안이 남으면 이탈 또는 문의', score >= 52 ? '주의 필요' : '추가 개선 권장']
  ];
  return `<article class="vr360-card vr360-journey-card">
    <div class="vr360-card-head"><div><span class="vr360-mini-label">CUSTOMER JOURNEY</span><h3>고객은 결제 직전에 가장 많이 망설입니다</h3><p>실제 이탈률 측정값이 아니라, 공개 화면에서 확인된 신뢰 공백의 영향 지점을 시각화했습니다.</p></div></div>
    <div class="vr360-journey">${stages.map(([step,title,desc,state], index) => `<div class="vr360-journey-step step-${index + 1}"><span>${escapeHtml(step)}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><em>${escapeHtml(state)}</em></div>`).join('')}</div>
  </article>`;
}

function renderVr360PriorityIssues(view) {
  const rows = (view.risks || []).slice(0, 3);
  return `<section class="vr360-card vr360-priority-section" aria-label="우선 해결 위험 항목">
    <div class="vr360-card-head"><div><span class="vr360-mini-label danger">TOP PRIORITY</span><h3>지금 먼저 해결해야 할 3가지</h3><p>무료 화면에서는 문제의 방향을 보여주고, 결제 후 리포트에서 실제 수정 문구와 적용 위치를 제공합니다.</p></div></div>
    <div class="vr360-priority-grid">${rows.map((item, index) => `<article>
      <div class="vr360-issue-top"><span class="vr360-rank">0${escapeHtml(index + 1)}</span><b class="vr360-priority-pill ${escapeAttr(priorityTone(item.priority))}">${escapeHtml(item.priority || (index === 0 ? 'P0' : 'P1'))}</b></div>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.impact || item.limitation || '고객이 필요한 안내를 바로 확인하기 어려울 수 있습니다.')}</p>
      <div class="vr360-issue-meta"><span>${escapeHtml(item.area || item.category || '점검 영역')}</span><small>${escapeHtml(item.action || '상세 리포트에서 개선 위치 확인')}</small></div>
      <a href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">수정 위치 확인 <i aria-hidden="true">→</i></a>
    </article>`).join('') || '<p class="muted">우선 해결 항목을 정리하고 있습니다.</p>'}</div>
  </section>`;
}

function renderVr360Unlock(view) {
  const locked = Math.max(7, Number(view.lockedCount || 0));
  return `<section class="vr360-unlock" aria-label="유료 리포트 잠금 해제 안내">
    <div class="vr360-unlock-copy"><span class="vr360-mini-label gold">PAID REPORT PREVIEW</span><h3>문제는 확인했습니다. 이제 실제로 고칠 문장과 위치를 여세요.</h3><p>기본 리포트는 무료 요약에서 보이지 않는 상세 근거와 실행 단위를 제공합니다. 팀이 바로 적용할 수 있도록 수정 전후 문구와 페이지별 위치까지 정리합니다.</p><div class="vr360-benefits"><span>페이지별 근거</span><span>수정 전후 문구</span><span>적용 위치</span><span>우선순위 로드맵</span><span>재점검 기준</span></div></div>
    <div class="vr360-lock-sheet" aria-hidden="true"><div><b>01. 결제 전 안내 보완</b><span></span><span></span></div><div><b>02. 환불 기준 문구 수정</b><span></span><span></span></div><div><b>03. 정책 링크 위치 조정</b><span></span><span></span></div><em>상세 해결안 ${escapeHtml(locked)}개 잠금</em></div>
    <div class="vr360-unlock-actions"><a class="btn primary" href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">${escapeHtml(REPORT_LABEL)} 열기</a><a class="btn secondary" href="/checkout?plan=Expert&siteId=${escapeAttr(view.siteId)}">${escapeHtml(EXPERT_LABEL)} 보기</a><small>필요한 결과물만 선택할 수 있습니다.</small></div>
  </section>`;
}

function renderVr360TechnicalDetails(view, scan) {
  return `<details class="vr360-details">
    <summary><div><span class="vr360-mini-label">EVIDENCE DETAILS</span><b>기술 근거·확인 URL·세부 항목 펼쳐보기</b><small>핵심 판단과 구매 선택에 필요한 정보는 위에서 먼저 확인할 수 있습니다.</small></div><i aria-hidden="true">+</i></summary>
    <div class="vr360-detail-stack">
      ${renderResultMetaSummary(view, scan)}
      ${renderDiscoverySummary(view)}
      ${renderEvidenceMatrix(view)}
      ${renderEvidenceFindings(view)}
      ${renderVerifiedPages(view)}
      ${renderAutomationDisclosure(view)}
      ${renderExternalToolPlan(view)}
    </div>
  </details>`;
}

function renderVr360StickyCta(view) {
  return `<aside class="vr360-sticky" aria-label="기본 리포트 구매 안내"><div><span aria-hidden="true"></span><b>신뢰 공백이 발견됐습니다.</b><small>실제 수정 위치와 문구를 열어 바로 보완하세요.</small></div><a class="btn primary" href="/checkout?plan=Report&siteId=${escapeAttr(view.siteId)}">${escapeHtml(REPORT_LABEL)} 열기</a></aside>`;
}

function renderVr360Result(view, scan) {
  const paid = hasPaidAccess(scan);
  return `<div class="vr360-report-shell">
    ${renderResultToolbar(view, scan)}
    ${renderVr360ExecutiveHero(view)}
    <section class="vr360-dashboard-grid" aria-label="진단 인포그래픽">${renderVr360RiskMap(view)}${renderVr360Journey(view)}</section>
    ${renderVr360PriorityIssues(view)}
    ${paid ? renderPaidCleanResult(scan) : renderVr360Unlock(view)}
    ${renderVr360TechnicalDetails(view, scan)}
    ${paid ? '' : renderVr360StickyCta(view)}
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
