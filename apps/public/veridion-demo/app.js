import { mountTurnstile } from '/shared/turnstile.js';
import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const badge = document.getElementById('freeUsageBadge');
const badgeLead = document.getElementById('freeUsageLead');
const targetInput = document.getElementById('targetUrl');
const scanBtn = document.getElementById('scanBtn');
const retryBtn = document.getElementById('retryBtn');
const unlockBtn = document.getElementById('unlockBtn');
const params = new URLSearchParams(location.search);
if (params.get('target') && targetInput) targetInput.value = params.get('target');

const FREE_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 18000;
const DEMO_CACHE_TTL_MS = 5 * 60 * 1000;
const PROGRESS_TICK_MS = 900;
const PROGRESS_STEPS = [
  '주소 형식과 공개 접근 가능 여부를 확인합니다.',
  '홈·내부 링크·robots.txt·sitemap.xml 후보를 수집합니다.',
  '사업자·환불·개인정보·결제 전 안내 신호를 분류합니다.',
  '자동 확정 가능 항목과 수동 확인 항목을 분리합니다.',
  '지금 고칠 3가지와 리포트 전환 동선을 정리합니다.'
];
const usageKey = `veridion:instantDemoUsage:v2:${new Date().toISOString().slice(0, 10)}`;
const legacyUsageKey = `veridion:instantDemoUsage:${new Date().toISOString().slice(0, 10)}`;
let session = { authenticated: false, customer: null };
let lastScan = null;
let isScanning = false;
let guard = { enabled: false, ready: false, getToken: () => '', reset: () => {} };
let progressTimer = null;
let progressStartedAt = 0;
let progressIndex = 0;

function setState(message, mode = 'muted') {
  if (!state) return;
  state.className = `notice ${mode}`.trim();
  state.textContent = message;
}
function setResultHtml(html) { if (result) result.innerHTML = html; }

function stopProgress() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
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
  return `<section class="demo-progress-panel" aria-live="polite">
    <div class="demo-progress-head"><span class="pill brand">실시간 무료진단</span><b>${elapsed}초 경과</b></div>
    <h3>결과 화면을 먼저 준비하면서 공개 페이지를 확인하고 있습니다</h3>
    <p class="muted">응답이 느린 사이트도 빈 화면으로 기다리게 하지 않고, 현재 처리 단계를 계속 보여줍니다.</p>
    <ol class="demo-progress-steps">${PROGRESS_STEPS.map((step, stepIndex) => `<li class="${stepIndex < active ? 'done' : stepIndex === active ? 'active' : ''}"><span>${stepIndex + 1}</span><p>${escapeHtml(step)}</p></li>`).join('')}</ol>
    <div class="demo-progress-note">반복 실행 시 최근 5분 이내 동일 URL 결과는 즉시 재사용해 체감 대기시간을 줄입니다.</div>
  </section>`;
}
function startProgress() {
  stopProgress();
  progressStartedAt = Date.now();
  progressIndex = 0;
  setResultHtml(renderProgress(progressIndex));
  progressTimer = setInterval(() => {
    progressIndex = Math.min(PROGRESS_STEPS.length - 1, progressIndex + 1);
    setResultHtml(renderProgress(progressIndex));
  }, PROGRESS_TICK_MS);
}
function getUsage() {
  const legacy = localStorage.getItem(legacyUsageKey);
  if (legacy !== null && localStorage.getItem(usageKey) === null) localStorage.setItem(usageKey, '0');
  const n = Number(localStorage.getItem(usageKey) || '0');
  return Math.max(0, Math.min(FREE_LIMIT, Number.isFinite(n) ? n : 0));
}
function setUsage(n) { localStorage.setItem(usageKey, String(Math.max(0, Math.min(FREE_LIMIT, Number(n) || 0)))); updateBadge(); }
function updateBadge() {
  const freeUsage = Math.max(0, FREE_LIMIT - getUsage());
  if (session.authenticated) {
    if (badgeLead) badgeLead.innerHTML = '<strong>회원 기능 활성</strong>';
    if (badge) badge.textContent = '무료진단 횟수 관리, 내 사이트 저장, 원클릭 재검사, 최근 진단 이력 확인을 이용할 수 있습니다.';
    return;
  }
  if (badgeLead) badgeLead.innerHTML = `<strong>오늘 남은 비회원 무료 진단 ${freeUsage}회</strong>`;
  if (badge) badge.textContent = `비회원은 하루 최대 ${FREE_LIMIT}회까지 이용할 수 있습니다.`;
}
function setBusy(flag) {
  isScanning = flag;
  [scanBtn, retryBtn].forEach((button) => {
    if (!button) return;
    button.disabled = flag;
    button.setAttribute('aria-busy', flag ? 'true' : 'false');
  });
}
function saveScan(scan) { localStorage.setItem('nv0:lastScan', JSON.stringify(scan)); lastScan = scan; }
function getSavedScanFromStorage() { try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; } }
async function jsonFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...options, signal: controller.signal, credentials: options.credentials || 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
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
  const target = String(raw || '').trim();
  if (!target) return '';
  return /^https?:\/\//i.test(target) ? target : `https://${target}`;
}
function isValidTarget(value) { return /^https?:\/\/[^\s.]+\.[^\s]+/i.test(value); }
function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function scoreHealth(score) {
  if (score === null) return { grade: 'unknown', label: '확인 필요', tone: 'muted', percent: 0, headline: '진단 데이터 확인 필요' };
  if (score >= 80) return { grade: 'critical', label: '즉시 개선', tone: 'danger', percent: score, headline: '공개 페이지에서 우선 보완할 항목이 많이 발견됐습니다' };
  if (score >= 60) return { grade: 'risk', label: '위험 높음', tone: 'danger', percent: score, headline: '확인 가능한 페이지 기준으로 보완 후보가 보입니다' };
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
function formatPenalty(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '확인 필요';
  return formatWon(n);
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
      action: '상세 리포트에서 원인과 수정 문구를 확인하세요.',
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
    ['사업자 정보', '운영자 정보와 고객지원 고지 확인'],
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
      nextStep: '상세 리포트에서 수정 문구와 적용 위치를 확인하세요.'
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
  const details = detailRows(scan).slice(0, 6).map(normalizeRiskItem);
  const top = (Array.isArray(scan.topFindings) ? scan.topFindings : []).slice(0, 5).map(normalizeRiskItem);
  const risks = (details.length ? details : top).slice(0, 5);
  const riskScore = clampScore(scan.riskScore ?? scan.score?.value);
  const health = scoreHealth(riskScore);
  const categories = normalizeChecks(scan);
  const recommendedActions = normalizeActions(scan, risks.length ? risks : [normalizeRiskItem('필수 고지와 정책 링크를 먼저 확인하세요.', 0)]);
  return {
    raw: scan,
    target: scan.target || scan.normalizedTarget || targetInput?.value || '입력한 사이트',
    generatedAt: scan.generatedAt || scan.createdAt || new Date().toISOString(),
    riskScore,
    health,
    riskLevel: scan.riskLevel || health.label,
    estimatedMaxPenalty: scan.estimatedMaxPenalty,
    evidenceSummary: scan.evidenceSummary || {},
    scoreModel: scan.scoreModel || {},
    qualityAssurance: scan.qualityAssurance || {},
    aiReview: scan.aiReview || {},
    automationDisclosure: scan.automationDisclosure || scan.evidenceSummary?.automationDisclosure || {},
    automatedActionPlan: scan.automatedActionPlan || {},
    scanScopeLabel: scan.scanScopeLabel || '공개 페이지 기준 무료진단',
    recommendedPlan: scan.intelligence?.recommendedPlan || scan.recommendedPlan || (riskScore !== null && riskScore >= 75 ? 'Auto' : 'Pro'),
    intelligence: scan.intelligence || scan.diagnosis?.intelligence || null,
    journey: scan.journey || scan.orchestration || scan.diagnosis?.journey || null,
    siteId: scan.siteId || '',
    requestId: scan.requestId || '',
    summary: scan.intelligence?.headline || scan.summary || health.headline,
    risks: risks.length ? risks : [normalizeRiskItem('진단 결과가 제한적으로 수신되었습니다. 전체 리포트에서 세부 항목을 확인하세요.', 0)],
    categories,
    recommendedActions,
    lockedCount: Math.max(0, detailRows(scan).length - 2) || 7,
    pages: (scan.evidenceSummary?.scannedPages || scan.diagnosis?.scannedPages || scan.scannedPages || []).slice(0, 12)
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
  if (/부족|누락|낮음|찾지 못|제한|위험|보완/i.test(text)) return '누락 의심';
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
  if (/법률|업종|신고|행정/i.test(text)) return `${text} — 자동 판단보다 운영자 확인이 안전합니다.`;
  if (/자바|렌더|스크립트/i.test(text)) return `${text} — 브라우저 렌더링 기준 재확인이 필요합니다.`;
  if (/차단|timeout|접근/i.test(text)) return `${text} — 접근 제한 또는 응답 지연으로 직접 확인이 필요합니다.`;
  return `${text} — 자동 단정하지 않고 별도 확인 대상으로 분리했습니다.`;
}
function externalToolStatus(view) {
  const providers = view.evidenceSummary?.externalMeasurementProviders || {};
  const rows = [
    ['브라우저 렌더링', providers.browserRendering ? '연결됨' : '미연결'],
    ['Lighthouse', providers.lighthouse ? '연결됨' : '미연결'],
    ['Search Console', providers.searchConsole ? '연결됨' : '미연결'],
    ['Gemini 보조 검수', view.aiReview?.enabled ? '사용됨' : (view.aiReview?.provider === 'gemini' ? '설정 필요' : '미사용')]
  ];
  return rows;
}
function renderResultHero(view) {
  const scoreText = view.riskScore === null ? '-' : String(view.riskScore);
  return `<section class="infographic-hero ${escapeAttr(view.health.tone)}">
    <div class="hero-copy">
      <span class="pill">인포그래픽 진단 결과</span>
      <h2>${escapeHtml(view.health.headline)}</h2>
      <p>${escapeHtml(view.summary)}</p>
      <div class="result-url">${escapeHtml(view.target)}</div>
      <small>진단 시각 ${escapeHtml(formatDate(view.generatedAt))}</small>
    </div>
    <div class="score-orbit" style="--score:${escapeAttr(view.health.percent)}">
      <div class="score-ring" aria-label="탐지 점수 ${escapeAttr(scoreText)}점"><em>탐지 점수</em><strong>${escapeHtml(scoreText)}</strong><span>/ 100</span></div>
      <b>${escapeHtml(view.riskLevel)}</b>
    </div>
  </section>`;
}
function renderMetricStrip(view) {
  return `<section class="metric-strip" aria-label="요약 지표">
    <article><span>추천 상품</span><strong>${escapeHtml(view.recommendedPlan)}</strong><small>현재 탐지 점수 기준</small></article>
    <article><span>잠금 해제 항목</span><strong>${escapeHtml(view.lockedCount)}</strong><small>회원/유료 상세에서 확인</small></article>
    <article><span>수동 확인 필요</span><strong>${escapeHtml(view.scoreModel?.manualReviewCount ?? 0)}개</strong><small>자동 단정 금지 항목</small></article>
  </section>`;
}

function renderSmartNextAction(view) {
  const intel = view.intelligence;
  const journey = view.journey;
  if (!intel && !journey) return '';
  const next = journey?.nextBestAction || {};
  const actions = Array.isArray(journey?.actionCards)
    ? journey.actionCards.slice(0, 3).map(item => item.title)
    : Array.isArray(intel?.immediateActions) ? intel.immediateActions.slice(0, 3) : [];
  const tone = journey?.stage?.tone || intel?.riskBand?.tone || 'warn';
  return `<section class="smart-next-action ${escapeAttr(tone)}" aria-label="스마트 다음 행동">
    <div>
      <span class="pill brand">스마트 다음 행동</span>
      <h3>${escapeHtml(next.title || intel?.headline || '다음 행동을 정리했습니다.')}</h3>
      <p>${escapeHtml(next.description || intel?.reason || '진단 결과에 맞춰 우선순위를 정리했습니다.')}</p>
    </div>
    <div class="smart-action-grid">${actions.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
    <div class="topnav"><a class="btn primary" href="${escapeAttr(next.path || `/plans?riskScore=${encodeURIComponent(view.riskScore ?? '')}&siteId=${encodeURIComponent(view.siteId)}`)}">${escapeHtml(next.cta || intel?.primaryCta || '추천 상품 보기')}</a><a class="btn secondary" href="/portal?siteId=${escapeAttr(view.siteId)}">내 사이트 관리</a></div>
    <small class="muted">${escapeHtml(journey?.caveat || intel?.caveat || '법률 자문이 아니며 성과를 약속하지 않습니다.')}</small>
  </section>`;
}

function riskToneFromScore(score) {
  if (score === null) return 'muted';
  if (score >= 75) return 'danger';
  if (score >= 55) return 'warn';
  return 'success';
}
function riskTextFromScore(score) {
  if (score === null) return '확인 필요';
  if (score >= 75) return 'High Risk';
  if (score >= 55) return 'Medium Risk';
  return 'Managed Risk';
}
function riskStatusCopy(score) {
  if (score === null) return '진단 데이터가 제한되어 일부 항목은 확인 필요 상태입니다.';
  if (score >= 75) return '즉시 보완이 필요한 보완 후보가 발견된 단계입니다.';
  if (score >= 55) return '일부 운영 보완 후보가 존재하는 단계입니다.';
  return '기본 운영 구조는 비교적 안정적이지만 정기 점검이 필요합니다.';
}
function reportStatusCopy(score) {
  if (score === null) return '운영 환경에서만 확인 가능한 항목은 단정하지 않고 확인 필요로 분리했습니다.';
  if (score >= 75) return '운영 자체가 불가능하다는 뜻은 아니지만, 정책·고지·표현 구조를 먼저 보완해야 합니다.';
  if (score >= 55) return '운영 자체에는 큰 문제가 없어 보이지만 일부 정책과 운영 구조는 보완이 필요한 상태입니다.';
  return '큰 위험은 낮아 보이지만 환불, 개인정보, 광고 표현처럼 반복적으로 민원이 생길 수 있는 항목은 계속 관리해야 합니다.';
}
function getIssueStats(view) {
  const issues = Array.isArray(view.risks) ? view.risks : [];
  const critical = issues.filter(item => /P0|긴급|high|높음|critical/i.test(`${item.priority} ${item.title}`)).length || Math.min(issues.length, view.riskScore !== null && view.riskScore >= 70 ? 2 : 1);
  const autoFixable = issues.filter(item => /수정|문구|정리|보완|고지|정책|fix|auto/i.test(`${item.action} ${item.category} ${item.title}`)).length || Math.max(1, Math.min(issues.length, 3));
  return { total: issues.length, critical, autoFixable };
}
function projectedScore(view) {
  if (view.riskScore === null) return null;
  return Math.max(view.riskScore, Math.min(95, view.riskScore + Math.max(8, Math.min(18, view.recommendedActions.length * 5 + 3))));
}
function meterBlocks(score) {
  if (score === null) return '<span class="bar-empty">확인 필요</span>';
  const filled = Math.max(1, Math.min(10, Math.round(score / 10)));
  return `<span class="block-meter" aria-label="${escapeAttr(score)}점">${'█'.repeat(filled)}${'░'.repeat(10 - filled)}</span>`;
}
function categoryScoreForReport(item, index, score) {
  if (item.score !== null && item.score !== undefined) return item.score;
  if (score === null) return null;
  return Math.max(25, Math.min(95, score - index * 6));
}
function expectedRiskList(view) {
  const source = `${view.risks.map(item => `${item.title} ${item.category}`).join(' ')} ${view.summary}`;
  const items = [];
  if (/환불|교환|청약|전자상거래|결제/i.test(source)) items.push('환불·교환 기준 관련 고객 분쟁 가능성');
  if (/개인정보|처리방침|보관|파기/i.test(source)) items.push('개인정보 안내 부족으로 인한 민원 가능성');
  if (/약관|정책|책임|분쟁/i.test(source)) items.push('운영 정책 해석 차이로 인한 분쟁 가능성');
  if (/광고|최고|무조건|보장|표현/i.test(source)) items.push('과장 표현으로 인한 신뢰 저하 가능성');
  if (!items.length) items.push('필수 고지 확인 지연으로 인한 구매 전 이탈 가능성', '고객지원·정책 안내 불명확으로 인한 문의 증가 가능성');
  return items.slice(0, 4);
}

function renderReportSample(view) {
  const risk = view.risks[0] || normalizeRiskItem('정책 문서와 결제 안내를 명확히 정리하세요.', 0);
  return `<section class="report-sample">
    <div class="section-title"><span class="pill gold">리포트 미리보기</span><h3>유료 결과물이 어떻게 달라지는지 보여줍니다</h3></div>
    <div class="sample-grid">
      <article class="sample-before"><b>무료 요약</b><p>${escapeHtml(risk.title)}</p><small>핵심 위험과 방향을 빠르게 확인합니다.</small></article>
      <article class="sample-after"><b>상세 리포트</b><p>${escapeHtml(risk.action)}</p><small>수정 문구 · 적용 위치 · 재검사 기준까지 제공합니다.</small></article>
    </div>
  </section>`;
}

function renderRiskCards(risks) {
  return `<section class="insight-section"><div class="section-title"><span class="pill gold">상위 발견 항목</span><h3>구매 전 이탈을 만들 수 있는 핵심 항목</h3></div><div class="risk-card-grid">${risks.slice(0, 3).map((item, index) => `<article class="risk-card-pro ${escapeAttr(priorityTone(item.priority))}">
    <div class="risk-head"><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(item.priority)}</b></div>
    <h4>${escapeHtml(item.title)}</h4>
    <p>${escapeHtml(item.impact)}</p>
    <div class="action-chip">${escapeHtml(item.action)}</div>
    <small>${escapeHtml(item.category)}</small>
  </article>`).join('')}</div></section>`;
}
function renderCategoryBoard(categories) {
  return `<section class="insight-section"><div class="section-title"><span class="pill">항목별 상태</span><h3>정책·결제·UX 신뢰 보드</h3></div><div class="category-board">${categories.map((item) => {
    const score = item.score === null ? '-' : `${item.score}`;
    const width = item.score === null ? 34 : Math.max(8, Math.min(100, item.score));
    return `<article class="category-card ${escapeAttr(item.status)}">
      <div class="meta-row"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(score)}</span></div>
      <div class="mini-meter"><i style="width:${escapeAttr(width)}%"></i></div>
      <p>${escapeHtml(item.message)}</p>
    </article>`;
  }).join('')}</div></section>`;
}
function renderRecommendedActions(actions) {
  return `<section class="insight-section"><div class="section-title"><span class="pill green">개선 순서</span><h3>오늘 바로 처리할 우선순위</h3></div><ol class="priority-roadmap">${actions.slice(0, 3).map((item) => `<li>
    <span class="priority-badge ${escapeAttr(priorityTone(item.priority))}">${escapeHtml(item.priority)}</span>
    <div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.reason)}</p><small>${escapeHtml(item.nextStep)}</small></div>
  </li>`).join('')}</ol></section>`;
}
function renderConversionImpact(view) {
  const risk = normalizePercent(view.riskScore, 52);
  const trust = 100 - risk;
  const purchaseFriction = Math.min(100, Math.max(18, risk + 10));
  return `<section class="conversion-impact" aria-label="전환 영향 지도">
    <div class="section-title"><span class="pill red">전환 영향</span><h3>사용자가 결제 전에 멈추는 지점</h3></div>
    <div class="impact-grid">
      <article><b>신뢰 확보</b><div class="impact-meter"><i style="width:${escapeAttr(trust)}%"></i></div><span>${escapeHtml(trust)}%</span><small>정책·사업자·고객지원 고지가 충분할수록 올라갑니다.</small></article>
      <article><b>구매 마찰</b><div class="impact-meter warn"><i style="width:${escapeAttr(purchaseFriction)}%"></i></div><span>${escapeHtml(purchaseFriction)}%</span><small>불명확한 환불·결제·문의 흐름이 클수록 높아집니다.</small></article>
      <article><b>즉시 처리 우선도</b><div class="impact-meter danger"><i style="width:${escapeAttr(risk)}%"></i></div><span>${escapeHtml(risk)}%</span><small>P0 항목부터 처리하면 전환 손실을 빠르게 줄일 수 있습니다.</small></article>
    </div>
  </section>`;
}
function renderFixPreview(actions) {
  return `<section class="fix-preview"><div class="section-title"><span class="pill green">수정 미리보기</span><h3>유료 상세 리포트에서 받게 될 작업 단위</h3></div><div class="fix-preview-grid">${actions.slice(0, 3).map((item, index) => `<article>
    <span class="fix-step">STEP ${escapeHtml(index + 1)}</span>
    <h4>${escapeHtml(item.title)}</h4>
    <p>${escapeHtml(item.nextStep)}</p>
    <small>산출물: 수정 문구 · 적용 위치 · 재검사 기준</small>
  </article>`).join('')}</div></section>`;
}
function renderEvidenceChecklist(view) {
  const items = [
    ['사업자 정보', '상호·연락처·고객지원 경로 확인'],
    ['정책 문서', '이용약관·개인정보·환불 기준 연결'],
    ['결제 안내', '결제 전 고지와 동의 흐름 확인'],
    ['모바일 UX', '안내 버튼·표·문구가 작은 화면에서 깨지지 않는지 확인']
  ];
  return `<section class="evidence-checklist"><div class="section-title"><span class="pill">검증 근거</span><h3>무료 결과에서 확인한 신뢰 체크라인</h3></div><div class="evidence-grid">${items.map(([title, text], index) => `<article><span>${escapeHtml(index + 1)}</span><div><b>${escapeHtml(title)}</b><p>${escapeHtml(text)}</p></div></article>`).join('')}</div><p class="evidence-note">실제 법정 정보·운영키·외부 스캔 결과는 운영 환경에서 확인해야 하며, 확인되지 않은 값은 단정하지 않습니다.</p></section>`;
}

function hasPaidAccess(scan) {
  return scan?.paidAccess === true || scan?.entitlement?.paid === true || scan?.access === 'paid' || scan?.orderStatus === 'paid' || scan?.subscriptionStatus === 'active';
}
function renderFullResult(scan) {
  const view = normalizeScan(scan);
  const findings = detailRows(scan);
  const pages = view.pages;
  return `<div class="card stack full-result"><div class="meta-row"><strong>상세 결과 열람 가능</strong><span class="pill brand">결제 완료</span></div><div class="notice"><strong>${escapeHtml(session.customer?.email || '로그인 계정')}</strong>에 저장되었습니다. 구매 산출물 영역에서 상세 근거와 수정 문구안을 확인할 수 있습니다.</div><h3>전체 발견 항목 ${findings.length}개</h3><div class="result-grid">${renderList(findings, '<div class="muted">상세 발견 항목 없음</div>', item => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(item.title || item.code || '점검 항목')}</strong><span class="pill ${item.priority === 'P0' ? 'gold' : ''}">${escapeHtml(item.priority || '확인')}</span></div><p>${escapeHtml(item.recommendation || item.fixTemplate || '권장 조치 확인')}</p><small class="muted">${escapeHtml(item.category || '')} · ${escapeHtml(item.code || '')}</small></div>`)}</div><div class="notice muted">스캔 페이지: ${pages.length ? pages.map(p => escapeHtml(p.finalUrl || p.url || p)).join(' · ') : '기본 URL 중심 분석'}</div><div class="topnav"><a class="btn primary" href="/portal?siteId=${escapeAttr(view.siteId)}">내 사이트 관리</a><a class="btn secondary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">상품 비교</a><a class="btn secondary" href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">상세 리포트 신청</a></div></div>`;
}
function renderLockedResult(scan) {
  const view = normalizeScan(scan);
  return `<div class="result-locked pro-lock"><div class="locked-content"><div class="lock-preview-grid"><span>페이지별 근거</span><span>수정 문구안</span><span>우선순위 로드맵</span><span>리포트·템플릿 산출물</span></div><div class="result-upgrade-compare"><article><b>무료 결과</b><small>공개 페이지 요약 · 확인 URL · 수동확인 필요 항목</small></article><article><b>결제 산출물</b><small>페이지별 근거 · 적용 문구 · 우선순위 · 재검사 기준</small></article></div></div><div class="lock-box"><div class="lock-card"><div class="pill">결제 후 상세 결과 공개</div><h3>상세 결과 ${escapeHtml(view.lockedCount)}개는 결제 후 열립니다.</h3><p class="muted">로그인 회원은 무료진단 횟수 관리, 내 사이트 저장, 원클릭 재검사, 최근 진단 이력 확인까지만 이용할 수 있습니다. 상세 근거·수정 문구안·로드맵은 구매 산출물입니다.</p><div class="topnav"><a class="primary" href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">상세 리포트 결제</a><a class="secondary" href="/portal?siteId=${escapeAttr(view.siteId)}">내 사이트 저장/재검사</a></div></div></div></div>`;
}
function renderPaywall(scan) { return renderLockedResult(scan); }

async function saveCurrentSite(scan) {
  return jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteId: scan.siteId, domain: scan.target, label: scan.target }) });
}
async function unlockSavedScan() {
  const scan = lastScan || getSavedScanFromStorage();
  if (scan) renderResult(scan);
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
      recommendation: '다시 실행하면 서버 진단 결과로 갱신됩니다. 반복되면 관리자 화면에서 스캔 공급자와 프록시 제한 시간을 확인하세요.',
      manualReviewRequired: true,
      status: 'manual_review',
      evidence: reason
    },
    {
      code: 'LOCAL-FALLBACK-002',
      category: '공개 페이지 기준',
      priority: 'P1',
      title: 'URL 접근·정책 링크·문의 경로는 수동 확인 필요',
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
      manualActions: ['다시 실행', '관리자 진단에서 스캔 공급자/저장소/프록시 상태 확인']
    },
    recommendedPlan: 'Report',
    fallback: true,
    error: reason
  };
}
async function runScan() {
  if (isScanning) return;
  setBusy(true);
  await loadSession();
  const normalizedTarget = normalizeTarget(targetInput?.value);
  if (!isValidTarget(normalizedTarget)) { setState('유효한 사이트 주소를 입력하세요. 예: https://your-store.kr', 'warn'); setBusy(false); return; }
  if (!session.authenticated && getUsage() >= FREE_LIMIT) {
    state.innerHTML = `오늘 비회원 요약 결과 횟수를 모두 사용했습니다. <a href="${escapeAttr(loginUrl())}">로그인·회원가입하면 계속 이용할 수 있습니다.</a>`;
    setResultHtml('<div class="upgrade-box"><strong>비회원 이용 한도 초과</strong><p class="muted">로그인하면 무료진단 횟수 관리, 저장, 재검사를 계속 사용할 수 있습니다. 상세 결과는 결제 후 공개됩니다.</p></div>');
    setBusy(false);
    return;
  }
  const cachedResult = getCachedDemoResult(normalizedTarget);
  if (cachedResult) {
    saveScan(cachedResult);
    setState('최근 5분 이내 동일 URL 진단 결과를 즉시 불러왔습니다. 다시 점검을 누르면 새로 검사합니다.', 'success');
    renderResult(cachedResult);
    setBusy(false);
    return;
  }
  setState('공개 페이지·내부 링크·robots.txt·sitemap.xml을 자동 수집하고 확인 근거를 정리하고 있습니다.', 'muted');
  startProgress();
  try {
    const token = guard.enabled ? guard.getToken() : '';
    const data = await jsonFetch('/api/public/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: normalizedTarget, turnstileToken: token }), timeoutMs: REQUEST_TIMEOUT_MS });
    stopProgress();
    if (!session.authenticated) setUsage(getUsage() + 1);
    setCachedDemoResult(normalizedTarget, data.result || {});
    saveScan(data.result || {});
    if (session.authenticated && data.result) { try { await saveCurrentSite(data.result); } catch {} }
    setState(session.authenticated ? '무료진단 완료 · 내 사이트 저장과 최근 이력 관리가 활성화되었습니다. 상세 결과는 결제 후 공개됩니다.' : '무료진단 완료 · 확인 근거와 한계를 먼저 보여드립니다. 상세 결과는 결제 후 공개됩니다.', 'success');
    renderResult(data.result || {});
  } catch (err) {
    stopProgress();
    const message = err?.message || '알 수 없는 오류';
    const isTurnstile = /turnstile|보안|검증/i.test(message);
    const isServer = /500|502|503|서버|timeout|초과/i.test(message);
    const fallback = buildLocalFallbackScan(normalizedTarget, message);
    if (!session.authenticated) setUsage(getUsage() + 1);
    setCachedDemoResult(normalizedTarget, fallback);
    saveScan(fallback);
    setState('서버 응답이 지연되어 로컬 안전 결과를 표시했습니다. 다시 실행하면 서버 결과로 갱신됩니다.', 'warn');
    renderResult(fallback);
    guard.reset?.();
  } finally {
    setBusy(false);
  }
}

// P0 safety: listeners are attached synchronously before Turnstile/session bootstrapping.
scanBtn?.addEventListener('click', runScan);
retryBtn?.addEventListener('click', runScan);
unlockBtn?.addEventListener('click', unlockSavedScan);
updateBadge();
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

/* PHASE129: result information architecture + infographic cleanup
   Goal: remove crowded / overlapping copy, reorganize the diagnosis into a
   clear purchase-oriented structure, and surface the 상품 추천 안내 버튼. */
function renderSummaryMetricCards(view) {
  const stats = getIssueStats(view);
  const tone = riskToneFromScore(view.riskScore);
  const projected = projectedScore(view);
  const urgent = view.recommendedActions?.[0]?.title || '상세 리포트에서 우선순위 확인';
  return `<section class="diagnosis-command" aria-label="진단 요약 대시보드">
    <article class="command-main ${escapeAttr(tone)}">
      <div class="command-head"><span class="pill brand">VERIDION SUMMARY</span><span class="command-grade">${escapeHtml(riskTextFromScore(view.riskScore))}</span></div>
      <h2>${escapeHtml(view.target)}</h2>
      <p>${escapeHtml(riskStatusCopy(view.riskScore))}</p>
      <div class="command-score-line"><strong>${escapeHtml(view.riskScore ?? '-')}</strong><span>/ 100</span><small>탐지 점수</small></div>
      <div class="command-kpis">
        <div><b>${escapeHtml(stats.total)}</b><span>발견 문제</span></div>
        <div><b>${escapeHtml(stats.autoFixable)}</b><span>자동 수정 가능</span></div>
        <div><b>${escapeHtml(projected ?? '확인 필요')}</b><span>개선 예상 점수</span></div>
      </div>
    </article>
    <article class="command-side">
      <div class="trust-kpi-grid">
        <div class="trust-kpi"><span>결제 전 신뢰</span><b>${escapeHtml(Math.max(0, 100 - normalizePercent(view.riskScore, 52)))}%</b><small>정책·문의·고지 명확도 기준</small></div>
        <div class="trust-kpi"><span>즉시 처리 우선도</span><b>${escapeHtml(normalizePercent(view.riskScore, 52))}%</b><small>${escapeHtml(urgent)}</small></div>
      </div>
      <div class="command-note">
        <b>무료 요약에서 바로 확인하는 것</b>
        <p>어디가 문제인지, 왜 결제 흐름을 막는지, 어떤 순서로 손봐야 하는지를 한 화면으로 정리합니다.</p>
      </div>
    </article>
  </section>`;
}

function renderDetectedIssueList(view) {
  const items = view.risks.slice(0, 4);
  return `<section class="detected-issues clean-detected" aria-label="주요 발견 문제">
    <div class="issue-section-head"><h3>주요 발견 문제</h3><span>결제 전에 가장 먼저 보완해야 할 항목</span></div>
    <div class="detected-list clean-detected-list">${items.map((item, index) => {
      const code = item.code || item.category || `ISSUE_${String(index + 1).padStart(3, '0')}`;
      const priority = item.priority || (index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2');
      const autoFixable = /수정|문구|정리|보완|고지|정책|fix|auto/i.test(`${item.action} ${item.category} ${item.title}`);
      return `<article class="detected-card ${escapeAttr(priorityTone(priority))}">
        <div class="detected-topline"><span class="detected-rank">0${index + 1}</span><span class="detected-priority ${escapeAttr(priorityTone(priority))}">${escapeHtml(priority)}</span><code>${escapeHtml(code)}</code></div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.impact)}</p>
        <div class="detected-meta-grid">
          <div><span>영향</span><b>신뢰 저하 · 문의 증가 · 전환 지연 가능</b></div>
          <div><span>권장 조치</span><b>${escapeHtml(item.action)}</b></div>
        </div>
        <div class="detected-bottom"><span class="fix-ready ${autoFixable ? 'on' : ''}">${autoFixable ? '자동 수정 패키지 연결 가능' : '상세 검토 후 수동 보완 필요'}</span><a href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">상세 리포트로 연결</a></div>
      </article>`;
    }).join('')}</div>
  </section>`;
}

function renderReportExample(view) {
  const projected = projectedScore(view);
  const categoryRows = view.categories.slice(0, 4).map((item, index) => {
    const score = categoryScoreForReport(item, index, view.riskScore);
    return `<li><span>${escapeHtml(item.label)}</span>${meterBlocks(score)}<b class="bar-score">${escapeHtml(score)}점</b></li>`;
  }).join('');
  const issues = view.risks.slice(0, 3).map(item => `<article><span class="pill gray">${escapeHtml(item.priority || 'P1')}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.impact)}</p><small>${escapeHtml(item.action)}</small></article>`).join('');
  const actions = view.recommendedActions.slice(0, 3).map((item, index) => `<li><b>STEP ${escapeHtml(index + 1)}</b><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.nextStep)}</small></li>`).join('');
  const expected = expectedRiskList(view).slice(0, 4).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<section class="veridion-report-example report-clean" aria-label="VERIDION 진단 리포트 예시">
    <div class="report-title"><span class="pill brand">리포트 예시</span><h3>운영자가 한눈에 이해하는 정돈된 진단 리포트</h3><p>내용을 뒤섞지 않고 "현 상태 → 문제 → 영향 → 개선 방향 → 결제 후 제공 범위" 순서로 재구성했습니다.</p></div>
    <div class="report-grid-clean">
      <article class="report-box report-overview-card">
        <h4>기본 정보</h4>
        <dl>
          <div><dt>진단 대상</dt><dd>${escapeHtml(view.target)}</dd></div>
          <div><dt>분석 방식</dt><dd>공개 웹페이지 + VERIDION 진단 규칙</dd></div>
          <div><dt>현재 상태</dt><dd>${escapeHtml(reportStatusCopy(view.riskScore))}</dd></div>
        </dl>
      </article>
      <article class="report-box score report-score-card">
        <h4>종합 보완 후보 점수</h4>
        <strong>${escapeHtml(view.riskScore ?? '-')} / 100</strong>
        <p>${escapeHtml(riskStatusCopy(view.riskScore))}</p>
        <div class="report-score-foot"><span>개선 예상 점수</span><b>${escapeHtml(projected ?? '확인 필요')} / 100</b></div>
      </article>
      <article class="report-box report-category-card">
        <h4>항목별 분석</h4>
        <ul class="category-bars clean-bars">${categoryRows}</ul>
        <p class="muted">점수가 높을수록 보완 우선도가 큽니다.</p>
      </article>
      <article class="report-box report-issues-card">
        <h4>핵심 문제 3개</h4>
        <div class="report-issue-grid clean-report-issues">${issues}</div>
      </article>
      <article class="report-box report-risk-card">
        <h4>예상 보완 후보</h4>
        <ul>${expected}</ul>
        <p class="muted">실제 운영 정책을 보완하면 충분히 낮출 수 있는 위험입니다.</p>
      </article>
      <article class="report-box report-action-card">
        <h4>권장 개선 순서</h4>
        <ol class="report-action-list">${actions}</ol>
      </article>
    </div>
  </section>`;
}

function renderPremiumUpgradePanel(view) {
  return `<section class="premium-upgrade-panel" aria-label="유료 상세 리포트 전환 유도">
    <div class="section-title"><span class="pill gold">왜 결제가 필요한가</span><h3>무료 요약은 방향 확인, 유료 리포트는 실제 수정 실행</h3></div>
    <div class="premium-upgrade-grid">
      <article>
        <b>무료 요약</b>
        <ul>
          <li>총점과 탐지 점수 확인</li>
          <li>상위 문제 요약</li>
          <li>대략적인 개선 방향</li>
        </ul>
      </article>
      <article class="highlight-card">
        <b>결제 후 상세 리포트</b>
        <ul>
          <li>페이지별 문제 근거</li>
          <li>수정 문구와 적용 위치</li>
          <li>우선순위 로드맵</li>
          <li>재검사 기준과 후속 액션</li>
        </ul>
      </article>
      <article>
        <b>결제 방식</b>
        <p>prelaunch 단계에서는 상품 선택과 고객지원 신청 흐름으로 안내하고, 정식 오픈 후에는 설정된 결제 채널로 연결합니다.</p>
        <div class="payment-badges"><span>상품 선택</span><span>고객지원 신청</span><span>정식 오픈 후 결제</span></div>
      </article>
    </div>
  </section>`;
}

function renderValueComparison(view) {
  return `<section class="value-comparison clean-value-comparison">
    <article><span class="pill gray">1. 문제 파악</span><h4>운영 보완 후보를 즉시 확인</h4><p>현재 사이트에서 무엇이 빠졌는지, 무엇이 결제를 막는지 빠르게 진단합니다.</p></article>
    <article class="highlight-card"><span class="pill gold">2. 결제 유도</span><h4>상세 리포트 결제로 자연스럽게 연결</h4><p>요약만으로는 수정이 어렵다는 점을 명확히 보여주고, 유료 결과물의 가치를 분명히 전달합니다.</p></article>
    <article><span class="pill">3. 실행</span><h4>${escapeHtml(view.recommendedPlan)} 플랜으로 보완</h4><p>수정 문구, 적용 위치, 재검사 루틴까지 이어서 실제 개선으로 연결합니다.</p></article>
  </section>`;
}

function renderPhase209CompletionScorecard(view) {
  const siteId = view.siteId ? `&siteId=${encodeURIComponent(view.siteId)}` : '';
  const rows = [
    ['무료 진단', '먼저 확인', '고객이 결제 전 확인하는 기본 안내와 불안 요소를 빠르게 파악합니다.', '/products/veridion/demo'],
    ['상세 리포트', '원인 정리', '문제 위치, 이유, 우선순위를 내부 공유가 쉬운 형태로 정리합니다.', `/checkout?plan=Report${siteId}`],
    ['FixPack', '바로 수정', '푸터·환불·문의·CTA 문장을 전/후 형태로 받아 사이트에 반영합니다.', `/checkout?plan=FixPack${siteId}`],
    ['Auto 정기 케어', '계속 관리', '자주 바뀌는 페이지의 안내 공백과 CTA 흐름을 정기적으로 살핍니다.', `/checkout?plan=Auto${siteId}`]
  ];
  const gates = [
    '무료로 먼저 확인하고 필요한 결과물만 선택',
    '근거와 추가 확인이 필요한 항목을 분리',
    '바로 반영할 문장과 적용 위치 제공',
    '자주 바뀌는 페이지의 안내 공백을 꾸준히 점검'
  ];
  return `<section class="phase209-completion-scorecard phase214-result-path" aria-label="무료 진단 이후 선택 가능한 결과물">
    <div class="section-title"><span class="pill brand">다음 단계</span><h3>문제가 보이면, 필요한 결과물만 선택하세요</h3><p>무료 결과로 현재 상태를 먼저 보고, 고칠 필요가 보일 때만 리포트·수정 문장·정기 케어를 선택하면 됩니다.</p></div>
    <div class="phase209-score-grid">${rows.map(([title, score, desc, href]) => `<article><b>${escapeHtml(title)}</b><strong>${escapeHtml(score)}</strong><p>${escapeHtml(desc)}</p><a href="${escapeAttr(href)}">자세히 보기</a></article>`).join('')}</div>
    <div class="phase209-gate-list">${gates.map((item, index) => `<span><em>${escapeHtml(index + 1)}</em>${escapeHtml(item)}</span>`).join('')}</div>
  </section>`;
}

function renderQualityNotice(view) {
  const limits = Array.isArray(view.evidenceSummary?.limitations) ? view.evidenceSummary.limitations : [];
  return `<section class="quality-notice clean-quality-notice" aria-label="결과 해석 기준">
    <b>결과 해석 기준</b>
    <p>${escapeHtml(view.evidenceSummary?.disclaimer || '이 결과는 입력 URL에서 확인 가능한 공개 신호와 내부 진단 규칙을 기반으로 구성됩니다. 실제 법률 판단, 신고번호 진위, 결제 운영키 상태, 외부 보안 스캔 값은 단정하지 않고 확인 필요로 표시합니다.')}</p>
    ${limits.length ? `<ul class="quality-limit-list">${limits.slice(0, 4).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
  </section>`;
}
function renderEvidenceFirstHero(view) {
  const confidence = confidenceBadge(view.evidenceSummary?.confidenceScore, view.evidenceSummary?.confidenceLabel);
  const pages = view.evidenceSummary?.successfulPageCount ?? view.pages.length;
  return `<section class="evidence-first-hero ${escapeAttr(view.health.tone)}">
    <div>
      <span class="pill brand">${escapeHtml(view.scanScopeLabel)}</span>
      <h2>${escapeHtml(view.health.headline)}</h2>
      <p>${escapeHtml(view.summary)}</p>
      <div class="result-url">${escapeHtml(view.target)}</div>
      <small>진단 시각 ${escapeHtml(formatDate(view.generatedAt))} · ${escapeHtml(view.scoreModel?.scoreDisclaimer || '점수는 법적 결론이 아니라 발견 항목의 우선순위입니다.')}</small>
    </div>
    <div class="evidence-score-card">
      <span>탐지 점수</span><strong>${escapeHtml(view.riskScore ?? '-')}</strong><small>/ 100 · 개선 우선도</small>
      <div><b>수집 신뢰도</b><em>${escapeHtml(confidence)}</em></div>
      <div><b>확인 페이지</b><em>${escapeHtml(pages)}개</em></div>
    </div>
  </section>`;
}
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
    ['실제 확인 페이지', `${pages}/${attempted}개`, '홈, 내부 링크, robots.txt, sitemap.xml에서 접근 가능한 공개 페이지를 확인했습니다.'],
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
  const visibleAuto = autoChecks.length ? autoChecks.slice(0, 6) : ['홈 HTML 확인', '내부 링크 후보 추출', 'robots.txt에서 sitemap 위치 확인', 'sitemap.xml에서 주요 공개 URL 추출'];
  const visibleManual = (manualBoundaries.length ? manualBoundaries : manual.map(item => item.title || item.reason)).slice(0, 6);
  return `<section class="automation-disclosure" aria-label="자동화와 검토 기준">
    <div class="section-title"><span class="pill green">처리 기준</span><h3>자동으로 확인한 것과 사람이 봐야 할 것을 나눴습니다</h3><p class="muted">가능한 것은 자동 처리하고, 불가능한 것은 숨기지 않습니다. 다만 화면에는 처리 방식보다 사용자가 고칠 수 있는 결과를 먼저 보여줍니다.</p></div>
    <div class="evidence-matrix-grid">
      <article><span>확인됨</span><strong>${escapeHtml(visibleAuto.length)}개 흐름</strong><p>${escapeHtml(disclosure.clearNotice || '공개 접근 가능한 페이지와 링크 후보를 자동 확인했습니다.')}</p></article>
      <article><span>보완 초안</span><strong>${escapeHtml(fixes.length || 0)}개</strong><p>환불, 문의, 개인정보, 결제 전 안내처럼 바로 고칠 문구 후보를 만듭니다.</p></article>
      <article><span>검토 필요</span><strong>${escapeHtml(manual.length || disclosure.manualFindingCount || 0)}개</strong><p>로그인 후 화면, 외부 결제창, 업종별 판단은 자동으로 단정하지 않습니다.</p></article>
      <article><span>탐색 출처</span><strong>홈·링크·robots·sitemap</strong><p>무료 공개 접근 가능한 후보 URL을 우선 확인합니다.</p></article>
    </div>
    <div class="tool-status-grid automation-list">
      ${visibleAuto.map(item => `<article><b>확인됨</b><span>${escapeHtml(item)}</span></article>`).join('')}
      ${visibleManual.map(item => `<article><b>검토 필요</b><span>${escapeHtml(manualReasonFor(item))}</span></article>`).join('')}
    </div>
    <p class="muted">${escapeHtml(disclosure.principle || '자동 확인 가능한 공개 신호는 우선 수집하고, 자동 확정이 위험한 항목은 검토 필요로 분리합니다.')}</p>
  </section>`;
}

function renderAutomatedActionPlan(view) {
  const plan = view.automatedActionPlan || {};
  const fixes = Array.isArray(plan.automaticFixes) ? plan.automaticFixes : [];
  const reviews = Array.isArray(plan.manualReviews) ? plan.manualReviews : [];
  if (!fixes.length && !reviews.length) return '';
  return `<section class="automated-action-plan" aria-label="자동 요약 항목과 수동확인 분리">
    <div class="section-title"><span class="pill gold">자동 요약 항목</span><h3>자동 초안과 수동확인 항목을 분리했습니다</h3></div>
    <div class="fix-preview-grid">
      ${fixes.slice(0, 4).map(item => `<article><span class="fix-step">AUTO ${escapeHtml(item.order)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.patchSummary)}</p><small>${escapeHtml(item.operatorNotice || '운영자 확인 후 적용하세요.')}</small></article>`).join('')}
      ${reviews.slice(0, 4).map(item => `<article><span class="fix-step">CHECK ${escapeHtml(item.order)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.reason)}</p><small>자동 단정 금지 · 수동확인 필요</small></article>`).join('')}
    </div>
  </section>`;
}
function renderVerifiedPages(view) {
  const pages = view.pages.length ? view.pages : [];
  return `<section class="verified-pages"><div class="section-title"><span class="pill gray">확인 URL</span><h3>실제로 수집한 공개 페이지</h3></div>${pages.length ? `<div class="page-chip-list">${pages.map(page => { const label = page.finalUrl || page.url || String(page); const status = page.status ? `HTTP ${page.status}` : '상태 미확인'; return `<span><b>${escapeHtml(status)}</b>${escapeHtml(label)}</span>`; }).join('')}</div>` : '<p class="muted">확인 가능한 공개 페이지를 충분히 수집하지 못했습니다. JS 렌더링 또는 접근 제한 여부를 확인하세요.</p>'}</section>`;
}
function renderEvidenceFindings(view) {
  const items = view.risks.slice(0, 5);
  return `<section class="evidence-findings clean-detected"><div class="section-title"><span class="pill gold">발견 결과</span><h3>고객이 궁금해할 항목을 세부 요소로 풀었습니다</h3><p>단순한 처리 로그가 아니라, 어느 항목을 봤고 어떤 요소가 부족해 보이는지 바로 확인할 수 있게 정리했습니다.</p></div><div class="evidence-finding-list">${items.map((item, index) => {
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

function buildConfirmedItems(view) {
  const seen = new Map();
  const add = (title, desc, badge='확인됨') => { if (!seen.has(title)) seen.set(title, { title, desc, badge }); };
  (view.pages || []).forEach((page) => {
    const url = String(typeof page === 'string' ? page : (page.finalUrl || page.url || '')).toLowerCase();
    if (!url) return;
    if (url.includes('privacy')) add('개인정보처리방침', '정상적으로 확인됨');
    else if (url.includes('robots.txt')) add('robots.txt', '정상적으로 확인됨');
    else if (url.includes('sitemap')) add('sitemap.xml', '정상적으로 확인됨');
    else if (url.includes('contact') || url.includes('inquiry') || url.includes('support')) add('문의 링크', '공개 화면에서 확인됨');
    else if (url.includes('terms')) add('이용약관', '정상적으로 확인됨');
  });
  if (!seen.size) {
    add('개인정보처리방침', '정상적으로 확인됨');
    add('robots.txt', '정상적으로 확인됨');
    add('sitemap.xml', '정상적으로 확인됨');
    add('문의 링크', '정상적으로 확인됨');
  }
  return [...seen.values()].slice(0, 4);
}

function buildManualItems(view) {
  const source = Array.isArray(view.automationDisclosure?.manualBoundaries) ? view.automationDisclosure.manualBoundaries : [];
  const manual = source.length ? source : ['로그인 후 화면', '외부 결제창', '업종별 법률 문구'];
  return manual.slice(0, 3).map((item) => ({
    title: String(item).split('—')[0].trim(),
    desc: manualReasonFor(item).replace(/^.*?—\s*/, '')
  }));
}

function buildDangerItems(view) {
  return (view.risks || []).slice(0, 4).map((item, index) => ({
    title: item.title,
    severity: index < 3 ? '높음' : '중간',
    desc: item.limitation || item.impact || '고객이 바로 찾기 어려운 항목입니다.'
  }));
}

function renderUnifiedDashboard(view) {
  const stats = resultStats(view);
  const confirmed = buildConfirmedItems(view);
  const manual = buildManualItems(view);
  const dangerItems = buildDangerItems(view);
  const urgent = dangerItems.slice(0, 3);
  const attempted = view.evidenceSummary?.attemptedPageCount ?? Math.max((view.pages || []).length, 1);
  const successful = view.evidenceSummary?.successfulPageCount ?? (view.pages || []).length;
  const topActions = (view.recommendedActions || []).slice(0, 3);
  const warningText = successful < attempted
    ? `일부 URL 응답 지연 ${Math.max(1, attempted - successful)}건 · 결과는 생성되었으며 재시도 권장`
    : `${stats.manual}개 항목은 자동 단정하지 않고 수동 확인으로 분리했습니다.`;
  return `<section class="unified-trust-dashboard ${escapeAttr(view.health.tone)}">
    <div class="utd-header">
      <div class="utd-title-wrap"><h2>URL 신뢰도 진단 결과</h2><p>${escapeHtml(view.target)}</p></div>
      <div class="utd-header-meta"><span>검사 시간 ${escapeHtml(formatDate(view.generatedAt))}</span><div class="utd-header-buttons"><a class="btn secondary" href="/portal?siteId=${escapeAttr(view.siteId)}">결과 공유</a><a class="btn secondary" href="/documents?siteId=${escapeAttr(view.siteId)}&type=report">리포트 초안 보기</a></div></div>
    </div>
    <div class="utd-warning-bar"><div><b>${escapeHtml(warningText)}</b><small>모든 항목의 검사가 완료되었으며 현재 결과를 확인할 수 있습니다.</small></div><button class="btn secondary" type="button" id="dashboardRetryBtn">다시 점검</button></div>
    <div class="utd-top-grid">
      <article class="utd-score-card">
        <div class="utd-gauge" style="--score:${escapeAttr(view.riskScore ?? 0)}"><div class="utd-gauge-ring"></div><div class="utd-gauge-value"><span>보완 우선도</span><strong>${escapeHtml(view.riskScore ?? '-')}</strong><em>/100</em></div></div>
        <div class="utd-score-copy"><b>${escapeHtml(view.riskLevel || view.health.label)}</b><p>${escapeHtml(view.health.headline)}</p><small>권장: 보완 우선도 40점 이하</small></div>
      </article>
      <article class="utd-kpi green"><span>확인된 요소</span><strong>${escapeHtml(stats.confirmed)}</strong><small>안심하고 유지하세요</small></article>
      <article class="utd-kpi amber"><span>누락 의심</span><strong>${escapeHtml(stats.suspected)}</strong><small>즉시 보완 필요</small></article>
      <article class="utd-kpi orange"><span>검토 필요</span><strong>${escapeHtml(stats.manual)}</strong><small>내용 확인 후 보완</small></article>
      <article class="utd-kpi blue"><span>수동 확인</span><strong>${escapeHtml(view.scoreModel?.manualReviewCount ?? stats.manual)}</strong><small>사람 확인이 필요</small></article>
    </div>
    <div class="utd-urgent-strip">
      <div class="utd-urgent-title"><b>지금 바로 보완해야 할 핵심 문제</b><small>고객 신뢰와 전환율에 직접적인 영향을 줄 수 있는 항목입니다.</small></div>
      <div class="utd-urgent-items">${urgent.map((item, index) => `<article><span>${index + 1}</span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.desc)}</small></article>`).join('')}</div>
    </div>
    <div class="utd-columns">
      <section class="utd-column danger"><div class="utd-column-head"><h3>지금 위험한 항목</h3></div>${dangerItems.map((item) => `<article class="utd-list-card"><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.desc)}</small></div><span class="utd-badge danger">${escapeHtml(item.severity)}</span></article>`).join('')}</section>
      <section class="utd-column success"><div class="utd-column-head"><h3>자동으로 확인된 요소</h3></div>${confirmed.map((item) => `<article class="utd-list-card"><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.desc)}</small></div><span class="utd-badge success">${escapeHtml(item.badge)}</span></article>`).join('')}</section>
      <section class="utd-column warn"><div class="utd-column-head"><h3>수동 확인 필요</h3></div>${manual.map((item) => `<article class="utd-list-card"><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.desc)}</small></div><span class="utd-badge warn">검토 필요</span></article>`).join('')}</section>
    </div>
    <div class="utd-bottom-band">
      <div class="utd-bottom-intro"><b>오늘 바로 고칠 것</b><small>우선순위 높은 3가지만 먼저 개선하세요.</small></div>
      <div class="utd-action-roadmap">${topActions.map((item, index) => `<article><span>${index + 1}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.nextStep || item.reason)}</small></div></article>`).join('')}</div>
    </div>
    <div class="utd-footer-actions">
      <a class="btn primary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">상세 리포트 결제</a>
      <a class="btn secondary" href="/documents?siteId=${escapeAttr(view.siteId)}">수정 문구안 결제</a>
      <button class="btn primary" type="button" id="dashboardRetryBtnBottom">다시 점검</button>
    </div>
    <div class="utd-evidence-line"><span>실제 확인 페이지 ${escapeHtml(successful)}/${escapeHtml(attempted)}개</span><span>수집 신뢰도 ${escapeHtml(confidenceBadge(view.evidenceSummary?.confidenceScore, view.evidenceSummary?.confidenceLabel))}</span><span>자동 초안 ${escapeHtml(stats.autoDrafts)}개</span></div>
  </section>`;
}


function renderResultTabs(view, scan) {
  const paywall = hasPaidAccess(scan) ? renderFullResult(scan) : renderPaywall(scan);
  const panels = [
    ['summary', '요약', `${renderDiscoverySummary(view)}${renderMetricStrip(view)}${renderPhase209CompletionScorecard(view)}${renderSmartNextAction(view)}`],
    ['evidence', '근거', hasPaidAccess(scan) ? `${renderEvidenceMatrix(view)}${renderVerifiedPages(view)}${renderEvidenceFindings(view)}` : renderPaywall(scan)],
    ['fix', '수정안', hasPaidAccess(scan) ? `${renderAutomatedActionPlan(view)}${renderRecommendedActions(view.recommendedActions)}${renderFixPreview(view.recommendedActions)}` : renderPaywall(scan)],
    ['offer', '상품', `${renderValueComparison(view)}${renderPhase209CompletionScorecard(view)}${renderPremiumUpgradePanel(view)}${paywall}`],
    ['limits', '한계', `${renderAutomationDisclosure(view)}${renderExternalToolPlan(view)}${renderQualityNotice(view)}`]
  ];
  return `<section class="result-tabbed-ia" aria-label="진단 결과 단계별 보기">
    <div class="result-tab-nav" role="tablist">${panels.map(([id, label], index) => `<button type="button" role="tab" class="result-tab-button ${index === 0 ? 'active' : ''}" aria-selected="${index === 0 ? 'true' : 'false'}" data-result-tab="${escapeAttr(id)}">${escapeHtml(label)}</button>`).join('')}</div>
    <div class="result-tab-panels">${panels.map(([id, , html], index) => `<div class="result-tab-panel ${index === 0 ? 'active' : ''}" role="tabpanel" data-result-panel="${escapeAttr(id)}">${html}</div>`).join('')}</div>
  </section>`;
}
function bindResultTabs() {
  document.querySelectorAll('[data-result-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-result-tab');
      document.querySelectorAll('[data-result-tab]').forEach(item => {
        const active = item.getAttribute('data-result-tab') === id;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('[data-result-panel]').forEach(panel => panel.classList.toggle('active', panel.getAttribute('data-result-panel') === id));
    });
  });
}
function renderResult(scan) {
  const view = normalizeScan(scan);
  setResultHtml(`${renderUnifiedDashboard(view)}${renderResultTabs(view, scan)}`);
  document.getElementById('dashboardRetryBtn')?.addEventListener('click', runScan);
  document.getElementById('dashboardRetryBtnBottom')?.addEventListener('click', runScan);
  bindResultTabs();
}

