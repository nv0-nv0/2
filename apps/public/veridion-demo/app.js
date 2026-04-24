import { mountTurnstile } from '/shared/turnstile.js';
import { escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const guard = await mountTurnstile({
  containerId: 'turnstileBox',
  tokenInputId: 'turnstileToken',
  noticeId: 'turnstileState'
});

function saveScan(scan) { localStorage.setItem('veridion:lastScan', JSON.stringify(scan)); }
function setNextLinks(scan) {
  document.querySelectorAll('a[href="/plans"]').forEach(a => a.href = `/plans?siteId=${encodeURIComponent(scan.siteId)}&riskScore=${encodeURIComponent(scan.riskScore)}`);
  document.querySelectorAll('a[href="/checkout"]').forEach(a => a.href = `/checkout?siteId=${encodeURIComponent(scan.siteId)}&plan=${encodeURIComponent(scan.recommendedPlan)}`);
  document.querySelectorAll('a[href="/portal"]').forEach(a => a.href = `/portal?siteId=${encodeURIComponent(scan.siteId)}`);
}

function renderResult(scan) {
  const categories = Object.entries(scan.categoryCounts || {});
  const categoryScores = Object.entries(scan.categoryScores || {});
  const details = (scan.detailFindings || []).slice(0, 3).map(item => `
    <div class="result-card stack">
      <div class="meta-row"><strong>${escapeHtml(item.title)}</strong><span class="pill">${escapeHtml(item.priority)}</span></div>
      <div class="muted">${escapeHtml(item.category)} · 예상 최대 ${formatWon(item.estimatedPenaltyMax)}원</div>
      <div>${escapeHtml(item.recommendation)}</div>
    </div>`).join('');
  result.innerHTML = `
    <div class="grid cols-2">
      <div class="result-card stack"><div class="muted">위험도 점수</div><div class="kpi">${escapeHtml(scan.riskScore ?? '-')}</div><div>${escapeHtml(scan.riskLevel || '-')}${scan.cached ? ' · 캐시 재사용' : ''}</div></div>
      <div class="result-card stack"><div class="muted">예상 최대 과태료</div><div class="kpi">${formatWon(scan.estimatedMaxPenalty)}</div><div>${escapeHtml(scan.totalFindings ?? 0)}개 항목 탐지</div></div>
    </div>
    <div class="result-card stack"><strong>사이트 분류</strong><div>${escapeHtml(scan.siteProfile?.industry || scan.industry)} · ${escapeHtml(scan.siteProfile?.siteType || '-')}</div><div class="muted">규칙 버전 ${escapeHtml(scan.ruleVersion || '-')} · 스캔 모드 ${escapeHtml(scan.scanMode || '-')}</div></div>
    <div class="grid cols-2">
      <div class="result-card stack"><strong>카테고리별 탐지 수</strong><ul class="result-list">${renderList(categories, '<li>탐지 항목 없음</li>', ([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(v)}건</li>`)}</ul></div>
      <div class="result-card stack"><strong>카테고리 점수</strong><ul class="result-list">${renderList(categoryScores, '<li>카테고리 점수 없음</li>', ([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(v)}점</li>`)}</ul></div>
    </div>
    <div class="result-card stack"><strong>상위 위험 항목</strong>${renderList(scan.topFindings || [], '<div>상위 위험 항목 없음</div>', (item) => `<div>${escapeHtml(item)}</div>`)}</div>
    <div class="result-card stack"><strong>추천 플랜</strong><div>${escapeHtml(scan.recommendedPlan || '-')}</div><div class="muted">엔진: ${escapeHtml(scan.provider || 'builtin')} · 사이트 ID: ${escapeHtml(scan.siteId || '-')}</div></div>
    <div class="stack">${details || '<div class="result-card">상세 항목 없음</div>'}</div>
    <div class="notice">유료 해금 시 나머지 ${escapeHtml(scan.lockedPreviewCount || 0)}개 세부 항목, 맞춤 지침, 법령 변경 알림, 승인형 자동수정을 사용할 수 있습니다.</div>`;
}

async function runScan() {
  const target = document.getElementById('targetUrl').value.trim();
  if (!/^https?:\/\//.test(target)) { state.textContent = '유효한 URL을 입력하세요.'; return; }
  state.textContent = '스캔 요청 중...';
  result.textContent = '로딩 중';
  try {
    const res = await fetch('/api/public/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, turnstileToken: guard.getToken() }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'scan failed');
    saveScan(data.result);
    setNextLinks(data.result);
    state.textContent = `스캔 완료 · ${data.result.industry} · ${data.result.totalFindings}개 항목`;
    renderResult(data.result);
  } catch (err) {
    state.textContent = '실패: ' + err.message;
    result.textContent = '재시도 가능';
    guard.reset?.();
  }
}

document.getElementById('scanBtn')?.addEventListener('click', runScan);
document.getElementById('retryBtn')?.addEventListener('click', runScan);
