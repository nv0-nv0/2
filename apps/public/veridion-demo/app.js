import { mountTurnstile } from '/shared/turnstile.js';
import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const badge = document.getElementById('freeUsageBadge');
const targetInput = document.getElementById('targetUrl');
const scanBtn = document.getElementById('scanBtn');
const retryBtn = document.getElementById('retryBtn');
const unlockBtn = document.getElementById('unlockBtn');
const params = new URLSearchParams(location.search);
if (params.get('target') && targetInput) targetInput.value = params.get('target');

const FREE_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 15000;
const usageKey = `veridion:instantDemoUsage:${new Date().toISOString().slice(0, 10)}`;
let session = { authenticated: false, customer: null };
let lastScan = null;
let isScanning = false;
let guard = { enabled: false, ready: false, getToken: () => '', reset: () => {} };

function setState(message, mode = 'muted') {
  if (!state) return;
  state.className = `notice ${mode}`.trim();
  state.textContent = message;
}
function setResultHtml(html) { if (result) result.innerHTML = html; }
function getUsage() { return Number(localStorage.getItem(usageKey) || '0'); }
function setUsage(n) { localStorage.setItem(usageKey, String(n)); updateBadge(); }
function updateBadge() {
  const freeUsage = Math.max(0, FREE_LIMIT - getUsage());
  if (badge) badge.textContent = session.authenticated ? '회원 전용 전체 결과 활성' : `비회원 즉시 요약 ${freeUsage}회 남음`;
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
  if (score >= 80) return { grade: 'critical', label: '즉시 개선', tone: 'danger', percent: score, headline: '구매 전 신뢰 손실 가능성이 큽니다' };
  if (score >= 60) return { grade: 'risk', label: '위험 높음', tone: 'danger', percent: score, headline: '전환을 막는 핵심 공백이 보입니다' };
  if (score >= 40) return { grade: 'watch', label: '주의', tone: 'warn', percent: score, headline: '신뢰 보강 후 결제 전환이 안정적입니다' };
  return { grade: 'safe', label: '낮음', tone: 'success', percent: score, headline: '큰 위험은 낮지만 정책·결제 고지는 계속 관리해야 합니다' };
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
    priority: item?.priority || (index === 0 ? 'P0' : index === 1 ? 'P1' : 'P2'),
    impact: item?.impact || item?.description || '사용자가 결제 전 확인하려는 신뢰 요소와 연결됩니다.',
    action: item?.recommendation || item?.fixTemplate || '상세 리포트에서 수정 우선순위와 적용 문구를 확인하세요.',
    category: item?.category || item?.code || '신뢰 진단'
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
    ['결제 신뢰', '결제 전 안내와 CTA 흐름 확인'],
    ['환불 정책', '디지털 산출물 제공 전후 기준 확인'],
    ['개인정보', '수집 항목과 동의 흐름 확인'],
    ['모바일 UX', '모바일에서 CTA와 문구 가독성 확인']
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
    recommendedPlan: scan.recommendedPlan || (riskScore !== null && riskScore >= 75 ? 'Auto' : 'Pro'),
    siteId: scan.siteId || '',
    requestId: scan.requestId || '',
    summary: scan.summary || health.headline,
    risks: risks.length ? risks : [normalizeRiskItem('진단 결과가 제한적으로 수신되었습니다. 전체 리포트에서 세부 항목을 확인하세요.', 0)],
    categories,
    recommendedActions,
    lockedCount: Math.max(0, detailRows(scan).length - 2) || 7,
    pages: (scan.diagnosis?.scannedPages || scan.scannedPages || []).slice(0, 8)
  };
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
      <div class="score-ring" aria-label="위험도 ${escapeAttr(scoreText)}점"><em>위험도</em><strong>${escapeHtml(scoreText)}</strong><span>/ 100</span></div>
      <b>${escapeHtml(view.riskLevel)}</b>
    </div>
  </section>`;
}
function renderMetricStrip(view) {
  return `<section class="metric-strip" aria-label="요약 지표">
    <article><span>추천 상품</span><strong>${escapeHtml(view.recommendedPlan)}</strong><small>현재 위험도 기준</small></article>
    <article><span>잠금 해제 항목</span><strong>${escapeHtml(view.lockedCount)}</strong><small>회원/유료 상세에서 확인</small></article>
    <article><span>예상 최대 과태료</span><strong>${escapeHtml(formatPenalty(view.estimatedMaxPenalty))}</strong><small>수신 데이터 기준</small></article>
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
  if (score >= 75) return '즉시 보완이 필요한 리스크가 발견된 단계입니다.';
  if (score >= 55) return '일부 운영 리스크가 존재하는 단계입니다.';
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
function renderSummaryMetricCards(view) {
  const stats = getIssueStats(view);
  const tone = riskToneFromScore(view.riskScore);
  return `<section class="diagnosis-metric-cards" aria-label="진단 핵심 지표">
    <article class="metric-card ${escapeAttr(tone)}"><span>RISK LEVEL</span><strong>${escapeHtml(riskTextFromScore(view.riskScore))}</strong><small>${escapeHtml(riskStatusCopy(view.riskScore))}</small></article>
    <article class="metric-card"><span>ISSUES FOUND</span><strong>${escapeHtml(stats.total)} Detected Issues</strong><small>상위 항목은 아래에서 바로 확인합니다.</small></article>
    <article class="metric-card success"><span>AUTO-FIXABLE</span><strong>${escapeHtml(stats.autoFixable)} / ${escapeHtml(stats.total || 1)} Ready</strong><small>자동 수정 가능 항목은 미리보기로 연결됩니다.</small></article>
  </section>`;
}
function renderDetectedIssueList(view) {
  const stats = getIssueStats(view);
  return `<section class="detected-issues" aria-label="주요 발견 문제">
    <div class="issue-section-head"><h3>Detected Issues</h3><span>${escapeHtml(stats.total)} items</span></div>
    <div class="detected-list">${view.risks.map((item, index) => {
      const code = item.code || item.category || `ISSUE_${String(index + 1).padStart(3, '0')}`;
      const autoFixable = /수정|문구|정리|보완|고지|정책|fix|auto/i.test(`${item.action} ${item.category} ${item.title}`) || index < stats.autoFixable;
      return `<article class="detected-card ${escapeAttr(priorityTone(item.priority))}">
        <div class="detected-title-row"><div><span class="warn-icon" aria-hidden="true">△</span><strong>${escapeHtml(item.title)}</strong></div><code>${escapeHtml(code)}</code></div>
        <p>${escapeHtml(item.impact)}</p>
        <div class="detected-bottom"><span class="fix-ready ${autoFixable ? 'on' : ''}">${autoFixable ? '베리디언 자동 수정 가능' : '수동 검토 필요'}</span><a href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">Preview Fix</a></div>
      </article>`;
    }).join('')}</div>
  </section>`;
}
function renderReportExample(view) {
  const projected = projectedScore(view);
  const categoryRows = view.categories.slice(0, 4).map((item, index) => {
    const score = categoryScoreForReport(item, index, view.riskScore);
    return `<li><span>${escapeHtml(item.label)}</span>${meterBlocks(score)}</li>`;
  }).join('');
  const issues = view.risks.slice(0, 3).map(item => `<article><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.impact)}</p><ul><li>${escapeHtml(item.action)}</li></ul></article>`).join('');
  const actions = view.recommendedActions.slice(0, 4).map((item, index) => `<li>${escapeHtml(index + 1)} ${escapeHtml(item.title)}</li>`).join('');
  const expected = expectedRiskList(view).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<section class="veridion-report-example" aria-label="VERIDION 진단 리포트 예시">
    <div class="report-title"><span class="pill brand">리포트 예시</span><h3>VERIDION 진단 리포트 예시</h3><p>다음은 입력한 사이트와 공개적으로 확인 가능한 신호를 기준으로 구성한 진단 리포트 예시입니다. 확인되지 않은 법률·정책·가격 정보는 단정하지 않습니다.</p></div>
    <div class="report-two-col">
      <article class="report-box"><h4>기본 정보</h4><dl><div><dt>진단 대상</dt><dd>${escapeHtml(view.target)}</dd></div><div><dt>분석 채널</dt><dd>공개 웹페이지 기준</dd></div><div><dt>판매 유형</dt><dd>현재 입력만으로 특정 불가 · 확인 필요</dd></div></dl></article>
      <article class="report-box score"><h4>종합 리스크 점수</h4><strong>${escapeHtml(view.riskScore ?? '-')} / 100</strong><p>${escapeHtml(reportStatusCopy(view.riskScore))}</p></article>
    </div>
    <article class="report-box"><h4>항목별 분석</h4><ul class="category-bars">${categoryRows}</ul><p class="muted">각 항목은 현재 수신 가능한 공개 신호와 내부 진단 규칙을 기준으로 분석됩니다.</p></article>
    <article class="report-box"><h4>주요 발견 문제</h4><div class="report-issue-grid">${issues}</div></article>
    <div class="report-two-col">
      <article class="report-box"><h4>예상 리스크</h4><ul>${expected}</ul><p class="muted">위 항목은 가능성 안내이며 실제 위반 여부는 공식 기준과 운영 자료 확인이 필요합니다.</p></article>
      <article class="report-box"><h4>VERIDION 개선 지원</h4><ul>${actions}</ul><p>문제 발견에서 끝내지 않고 수정 방향, 적용 위치, 재검사 기준까지 이어지도록 설계합니다.</p></article>
    </div>
    <article class="report-box improvement"><h4>개선 후 예상 상태</h4><div><span>현재 점수</span><strong>${escapeHtml(view.riskScore ?? '-')} / 100</strong></div><div><span>개선 목표 점수</span><strong>${escapeHtml(projected ?? '확인 필요')} / 100</strong></div><p class="muted">개선 목표 점수는 내부 진단 모델 기준의 시뮬레이션이며 실제 법적 안전성이나 매출 개선을 보장하지 않습니다.</p></article>
  </section>`;
}

function renderExecutiveSnapshot(view) {
  const firstRisk = view.risks[0] || normalizeRiskItem('필수 고지와 결제 전 안내를 먼저 점검하세요.', 0);
  const firstAction = view.recommendedActions[0] || {
    title: '상세 리포트 확인',
    reason: '무료 요약으로 확인한 위험을 실제 수정 문구와 적용 위치로 전환해야 합니다.',
    nextStep: '상세 리포트에서 우선순위와 수정안을 확인하세요.'
  };
  return `<section class="executive-snapshot" aria-label="3초 요약">
    <article class="snapshot-card focus"><span>지금 막히는 이유</span><h3>${escapeHtml(firstRisk.title)}</h3><p>${escapeHtml(firstRisk.impact)}</p></article>
    <article class="snapshot-card"><span>먼저 할 일</span><h3>${escapeHtml(firstAction.title)}</h3><p>${escapeHtml(firstAction.reason)}</p></article>
    <article class="snapshot-card"><span>구매 전환 포인트</span><h3>${escapeHtml(view.recommendedPlan)}로 연결</h3><p>무료 요약은 방향을 보여주고, 유료 결과는 수정 문구·위치·검증 기준까지 제공합니다.</p></article>
  </section>`;
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

function renderQualityNotice(view) {
  return `<section class="quality-notice" aria-label="결과 신뢰 기준">
    <b>결과 해석 기준</b>
    <p>이 데모는 입력한 URL과 수신 가능한 공개 신호를 기준으로 요약합니다. 실제 법정 정보, 결제 운영키, 외부 스캔 제공자 응답, 사업자 신고번호처럼 운영 환경에서만 확인 가능한 값은 단정하지 않고 확인 필요로 표시합니다.</p>
  </section>`;
}
function renderRiskCards(risks) {
  return `<section class="insight-section"><div class="section-title"><span class="pill gold">상위 위험</span><h3>구매 전 이탈을 만들 수 있는 핵심 항목</h3></div><div class="risk-card-grid">${risks.slice(0, 3).map((item, index) => `<article class="risk-card-pro ${escapeAttr(priorityTone(item.priority))}">
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
function renderValueComparison(view) {
  return `<section class="value-comparison">
    <article><span class="pill gray">무료 요약</span><h4>지금 확인한 내용</h4><ul><li>전체 위험도</li><li>상위 위험 3개</li><li>항목별 상태 요약</li></ul></article>
    <article class="highlight-card"><span class="pill gold">상세 리포트</span><h4>결제 후 확인할 내용</h4><ul><li>페이지별 근거</li><li>수정 문구와 적용 위치</li><li>재검사·내역 관리</li></ul></article>
    <article><span class="pill">다음 행동</span><h4>전환 손실 줄이기</h4><p>결제 전 사용자가 확인하는 신뢰 요소를 먼저 정리하고, 필요한 경우 ${escapeHtml(view.recommendedPlan)} 상품으로 이어갑니다.</p></article>
  </section>`;
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
    ['모바일 UX', 'CTA·표·문구가 작은 화면에서 깨지지 않는지 확인']
  ];
  return `<section class="evidence-checklist"><div class="section-title"><span class="pill">검증 근거</span><h3>무료 결과에서 확인한 신뢰 체크라인</h3></div><div class="evidence-grid">${items.map(([title, text], index) => `<article><span>${escapeHtml(index + 1)}</span><div><b>${escapeHtml(title)}</b><p>${escapeHtml(text)}</p></div></article>`).join('')}</div><p class="evidence-note">실제 법정 정보·운영키·외부 스캔 결과는 운영 환경에서 확인해야 하며, 확인되지 않은 값은 단정하지 않습니다.</p></section>`;
}

function renderFullResult(scan) {
  const view = normalizeScan(scan);
  const findings = detailRows(scan);
  const pages = view.pages;
  return `<div class="card stack full-result"><div class="meta-row"><strong>전체 결과 열람 가능</strong><span class="pill brand">회원 전용</span></div><div class="notice"><strong>${escapeHtml(session.customer?.email || '로그인 계정')}</strong>에 저장되었습니다. 내 사이트 관리에서 원클릭 재검사와 최근 검사 내역 확인이 가능합니다.</div><h3>전체 발견 항목 ${findings.length}개</h3><div class="result-grid">${renderList(findings, '<div class="muted">상세 발견 항목 없음</div>', item => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(item.title || item.code || '점검 항목')}</strong><span class="pill ${item.priority === 'P0' ? 'gold' : ''}">${escapeHtml(item.priority || '확인')}</span></div><p>${escapeHtml(item.recommendation || item.fixTemplate || '권장 조치 확인')}</p><small class="muted">${escapeHtml(item.category || '')} · ${escapeHtml(item.code || '')}</small></div>`)}</div><div class="notice muted">스캔 페이지: ${pages.length ? pages.map(p => escapeHtml(p.finalUrl || p.url || p)).join(' · ') : '기본 URL 중심 분석'}</div><div class="topnav"><a class="btn primary" href="/portal?siteId=${escapeAttr(view.siteId)}">내 사이트 관리</a><a class="btn secondary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">상품 비교</a><a class="btn secondary" href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">상세 리포트 신청</a></div></div>`;
}
function renderLockedResult(scan) {
  const view = normalizeScan(scan);
  return `<div class="result-locked pro-lock"><div class="locked-content"><div class="lock-preview-grid"><span>페이지별 근거</span><span>수정 문구안</span><span>우선순위 로드맵</span><span>재검사 내역</span></div></div><div class="lock-box"><div class="lock-card"><div class="pill">회원가입 후 전체 공개</div><h3>전체 결과 ${escapeHtml(view.lockedCount)}개는 로그인 후 바로 열립니다.</h3><p class="muted">먼저 무료 요약을 확인하고, 전체 발견 항목·수정 문구·내 사이트 저장·원클릭 재검사는 회원 계정에서 이어갑니다.</p><div class="topnav"><a class="primary" href="${escapeAttr(loginUrl(scan))}">로그인·회원가입하고 전체 보기</a><a class="secondary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">상품 비교</a></div></div></div></div>`;
}
function renderPaywall(scan) { return renderLockedResult(scan); }

function renderResult(scan) {
  const view = normalizeScan(scan);
  setResultHtml(`<div class="infographic-result hybrid-diagnosis">
    ${renderSummaryMetricCards(view)}
    ${renderResultHero(view)}
    ${renderExecutiveSnapshot(view)}
    ${renderMetricStrip(view)}
    ${renderDetectedIssueList(view)}
    ${renderReportExample(view)}
    ${renderRiskCards(view.risks)}
    ${renderCategoryBoard(view.categories)}
    ${renderRecommendedActions(view.recommendedActions)}
    ${renderConversionImpact(view)}
    ${renderFixPreview(view.recommendedActions)}
    ${renderReportSample(view)}
    ${renderEvidenceChecklist(view)}
    ${renderValueComparison(view)}
    ${renderQualityNotice(view)}
    <section class="result-cta-panel"><div><span class="pill">다음 단계</span><h3>무료 요약에서 끝내지 말고 실제 수정 흐름으로 이어가세요.</h3><p>상세 리포트는 원인, 수정 문구, 적용 위치를 함께 제공하는 유료 산출물입니다.</p></div><div class="topnav"><a class="btn primary" href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">상세 리포트 신청</a><a class="btn secondary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">전체 상품 비교</a></div></section>
  </div>${session.authenticated ? renderFullResult(scan) : renderPaywall(scan)}`);
}
async function saveCurrentSite(scan) {
  return jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteId: scan.siteId, domain: scan.target, label: scan.target }) });
}
async function unlockSavedScan() {
  const scan = lastScan || getSavedScanFromStorage();
  if (!scan?.siteId && !scan?.requestId) return;
  const detail = await jsonFetch(`/api/public/account/scan-detail?siteId=${encodeURIComponent(scan.siteId || '')}&requestId=${encodeURIComponent(scan.requestId || '')}`);
  saveScan(detail.result || scan);
  renderResult(detail.result || scan);
}
async function runScan() {
  if (isScanning) return;
  setBusy(true);
  await loadSession();
  const normalizedTarget = normalizeTarget(targetInput?.value);
  if (!isValidTarget(normalizedTarget)) { setState('유효한 사이트 주소를 입력하세요. 예: https://your-store.kr', 'warn'); setBusy(false); return; }
  if (!session.authenticated && getUsage() >= FREE_LIMIT) {
    state.innerHTML = `오늘 비회원 즉시 요약 횟수를 모두 사용했습니다. <a href="${escapeAttr(loginUrl())}">로그인·회원가입하면 계속 이용할 수 있습니다.</a>`;
    setResultHtml('<div class="upgrade-box"><strong>비회원 이용 한도 초과</strong><p class="muted">회원가입 후 전체 결과, 저장, 재검사를 계속 사용할 수 있습니다.</p></div>');
    setBusy(false);
    return;
  }
  setState('진단을 실행하고 있습니다.', 'muted');
  setResultHtml('<div class="demo-skeleton"><div></div><div></div><div></div></div><div class="loading-steps"><div>사이트 접근성과 필수 고지 위치를 확인합니다.</div><div>점수·위험·전환 영향·수정 우선순위를 인포그래픽으로 정리하고 리포트 미리보기까지 구성합니다.</div><div>무료 요약과 유료 상세 리포트 차이를 구성합니다.</div></div>');
  try {
    const token = guard.enabled ? guard.getToken() : '';
    const data = await jsonFetch('/api/public/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: normalizedTarget, turnstileToken: token }), timeoutMs: REQUEST_TIMEOUT_MS });
    if (!session.authenticated) setUsage(getUsage() + 1);
    saveScan(data.result || {});
    if (session.authenticated && data.result) { try { await saveCurrentSite(data.result); } catch {} }
    setState(session.authenticated ? '진단 완료 · 전체 결과와 내 사이트 저장이 활성화되었습니다.' : '진단 완료 · 인포그래픽 요약을 먼저 보여드립니다. 전체 결과는 회원가입 후 바로 확인하세요.', 'success');
    renderResult(data.result || {});
  } catch (err) {
    setState(`실패: ${err.message}`, 'warn');
    setResultHtml('<div class="result-error-card"><strong>진단을 완료하지 못했습니다.</strong><p>주소를 확인한 뒤 다시 실행하세요. 문제가 반복되면 서버 상태와 Turnstile 설정을 확인해야 합니다.</p><button class="btn primary" type="button" id="inlineRetryBtn">다시 실행</button></div>');
    document.getElementById('inlineRetryBtn')?.addEventListener('click', runScan);
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
setState('이메일을 먼저 요구하지 않습니다. 사이트 주소를 입력하고 즉시 요약 보기를 누르세요.');

mountTurnstile({ containerId: 'turnstileBox', tokenInputId: 'turnstileToken', noticeId: 'turnstileState' })
  .then((mountedGuard) => { guard = { ready: true, ...mountedGuard }; })
  .catch((error) => {
    guard = { enabled: false, ready: false, getToken: () => '', reset: () => {} };
    const notice = document.getElementById('turnstileState');
    if (notice) notice.textContent = `보안 확인을 불러오지 못했습니다. 설정 확인이 필요하지만 버튼은 계속 동작합니다. (${error.message})`;
  });
loadSession();
window.addEventListener('pageshow', async () => { await loadSession(); if (session.authenticated) unlockSavedScan().catch(() => {}); });

/* PHASE129: result information architecture + infographic cleanup
   Goal: remove crowded / overlapping copy, reorganize the diagnosis into a
   clear purchase-oriented structure, and surface the PortOne + Galaxia CTA. */
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
      <div class="command-score-line"><strong>${escapeHtml(view.riskScore ?? '-')}</strong><span>/ 100</span><small>총 리스크 점수</small></div>
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
        <p>어디가 문제인지, 왜 결제 전환을 막는지, 어떤 순서로 손봐야 하는지를 한 화면으로 정리합니다.</p>
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
        <h4>종합 리스크 점수</h4>
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
        <h4>예상 리스크</h4>
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
          <li>총점과 위험도 확인</li>
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
        <p>포트원 연동 결제창으로 가장 빠르게 진행하고, 운영 단계에서는 갤럭시아 채널로 간편하게 연결할 수 있습니다.</p>
        <div class="payment-badges"><span>PortOne</span><span>Galaxia</span><span>1분 결제</span></div>
      </article>
    </div>
  </section>`;
}

function renderValueComparison(view) {
  return `<section class="value-comparison clean-value-comparison">
    <article><span class="pill gray">1. 문제 파악</span><h4>운영 리스크를 즉시 확인</h4><p>현재 사이트에서 무엇이 빠졌는지, 무엇이 결제를 막는지 빠르게 진단합니다.</p></article>
    <article class="highlight-card"><span class="pill gold">2. 결제 유도</span><h4>상세 리포트 결제로 자연스럽게 연결</h4><p>요약만으로는 수정이 어렵다는 점을 명확히 보여주고, 유료 결과물의 가치를 분명히 전달합니다.</p></article>
    <article><span class="pill">3. 실행</span><h4>${escapeHtml(view.recommendedPlan)} 플랜으로 보완</h4><p>수정 문구, 적용 위치, 재검사 루틴까지 이어서 실제 개선으로 연결합니다.</p></article>
  </section>`;
}

function renderQualityNotice(view) {
  return `<section class="quality-notice clean-quality-notice" aria-label="결과 해석 기준">
    <b>결과 해석 기준</b>
    <p>이 결과는 입력 URL에서 확인 가능한 공개 신호와 내부 진단 규칙을 기반으로 구성됩니다. 실제 법률 판단, 신고번호 진위, 결제 운영키 상태, 외부 보안 스캔 값처럼 운영 환경에서만 확인 가능한 정보는 단정하지 않고 확인 필요로 표시합니다.</p>
  </section>`;
}

function renderResult(scan) {
  const view = normalizeScan(scan);
  setResultHtml(`<div class="infographic-result hybrid-diagnosis phase129-clean">
    ${renderSummaryMetricCards(view)}
    ${renderExecutiveSnapshot(view)}
    ${renderDetectedIssueList(view)}
    ${renderReportExample(view)}
    ${renderCategoryBoard(view.categories)}
    ${renderRecommendedActions(view.recommendedActions)}
    ${renderConversionImpact(view)}
    ${renderFixPreview(view.recommendedActions)}
    ${renderPremiumUpgradePanel(view)}
    ${renderReportSample(view)}
    ${renderEvidenceChecklist(view)}
    ${renderValueComparison(view)}
    ${renderQualityNotice(view)}
    <section class="result-cta-panel clean-result-cta"><div><span class="pill">다음 단계</span><h3>문제만 보지 말고 바로 결제로 넘어가 수정안을 받아보세요.</h3><p>결제는 포트원 기반으로 가장 빠르게 진행하고, 갤럭시아 채널 연동 운영을 전제로 자연스럽게 연결할 수 있습니다.</p></div><div class="topnav"><a class="btn primary" href="/checkout?plan=${escapeAttr(view.recommendedPlan)}&siteId=${escapeAttr(view.siteId)}">포트원으로 상세 리포트 결제</a><a class="btn secondary" href="/plans?riskScore=${escapeAttr(view.riskScore ?? '')}&siteId=${escapeAttr(view.siteId)}">상품 비교</a></div></section>
  </div>${session.authenticated ? renderFullResult(scan) : renderPaywall(scan)}`);
}
