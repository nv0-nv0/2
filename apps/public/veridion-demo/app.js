import { mountTurnstile } from '/shared/turnstile.js';
import { escapeHtml, formatWon, renderList } from '/shared/html.js';
const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const badge = document.getElementById('freeUsageBadge');
const guard = await mountTurnstile({ containerId: 'turnstileBox', tokenInputId: 'turnstileToken', noticeId: 'turnstileState' });
const params = new URLSearchParams(location.search);
const targetInput = document.getElementById('targetUrl');
if (params.get('target') && targetInput) targetInput.value = params.get('target');
const usageKey = `veridion:freeUsage:${new Date().toISOString().slice(0,10)}`;
function getUsage(){ return Number(localStorage.getItem(usageKey) || '0'); }
function setUsage(n){ localStorage.setItem(usageKey, String(n)); updateBadge(); }
function updateBadge(){ const left=Math.max(0,3-getUsage()); if(badge) badge.textContent=`오늘 남은 무료 진단 ${left}회`; }
function saveScan(scan) { localStorage.setItem('nv0:lastScan', JSON.stringify(scan)); }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function renderPaywall(scan){
  const hidden = (scan.detailFindings || scan.topFindings || []).slice(2, 7);
  return `<div class="result-locked"><div class="locked-content"><ul class="result-list">${renderList(hidden, '<li>상세 근거 항목</li>', item => `<li>${escapeHtml(item.title || item)}</li>`)}</ul><p>페이지별 근거, 관련 기준, 조치 문안, 수정 후보가 이어집니다.</p></div><div class="lock-box"><div class="lock-card"><div class="pill">상세 상품에서 확인</div><h3>전체 진단 결과는 상세 상품에서 확인하세요.</h3><p class="muted">무료 진단은 상위 2개 요약까지만 보여줍니다. 전체 근거와 실행 문안은 상세 상품에서 확인할 수 있습니다.</p><div class="topnav"><a class="primary" href="/plans?riskScore=${encodeURIComponent(scan.riskScore || '')}&siteId=${encodeURIComponent(scan.siteId || '')}">상품 비교</a><a class="secondary" href="/portal?siteId=${encodeURIComponent(scan.siteId || '')}">내 사이트에 저장/관리</a><a class="secondary" href="/checkout?plan=${encodeURIComponent(scan.recommendedPlan || 'Pro')}&siteId=${encodeURIComponent(scan.siteId || '')}">상세 리포트 신청</a></div></div></div></div>`;
}
function renderResult(scan) {
  const topFindings = (scan.topFindings || []).slice(0, 2);
  const diagnosis = scan.diagnosis || {};
  const pages = (diagnosis.scannedPages || []).slice(0, 4);
  const checks = (diagnosis.mainChecks || []).slice(0, 5);
  result.innerHTML = `<div class="result-card stack compact-result"><div class="meta-row"><strong>${escapeHtml(scan.target || '')}</strong><span class="pill gold">${escapeHtml(scan.riskLevel || '-')}</span></div><div class="grid cols-2"><div><div class="muted">위험도</div><div class="kpi">${escapeHtml(scan.riskScore ?? '-')}</div></div><div><div class="muted">예상 최대 과태료</div><div class="kpi">${formatWon(scan.estimatedMaxPenalty)}</div></div></div><div class="notice">무료 진단은 핵심 요약만 제공합니다. 전체 근거, 페이지별 조치안, 정책 문안, 수정 후보는 유료 상품에서 제공됩니다.</div><strong>상위 위험 2개</strong><ul class="result-list">${renderList(topFindings, '<li>상위 위험 항목 없음</li>', item => `<li>${escapeHtml(item)}</li>`)}</ul><div class="diagnosis-grid">${renderList(checks, '', item => `<span class=\"diag-chip ${item.status === 'attention' ? 'warn' : 'ok'}\"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.priority)}</small></span>`)}</div><div class="notice muted">스캔 페이지: ${pages.length ? pages.map(p => escapeHtml(p.finalUrl || p.url)).join(' · ') : '기본 URL 중심 분석'}</div><div class="upgrade-box"><strong>추천 상품: ${escapeHtml(scan.recommendedPlan || 'Pro')}</strong><p class="muted">상세 리포트와 실행 문안이 필요하면 알맞은 상품으로 이어서 진행하세요.</p><div class="topnav"><a class="btn primary" href="/plans?riskScore=${encodeURIComponent(scan.riskScore || '')}&siteId=${encodeURIComponent(scan.siteId || '')}">무료 결과와 상품 비교</a><a class="btn secondary" href="/portal?siteId=${encodeURIComponent(scan.siteId || '')}">내 사이트 관리</a></div></div></div>${renderPaywall(scan)}`;
}
async function runScan() {
  const email = document.getElementById('leadEmail').value.trim();
  const target = document.getElementById('targetUrl').value.trim();
  if (!validEmail(email)) { state.textContent = '결과 안내를 받을 이메일을 먼저 입력하세요.'; return; }
  let normalizedTarget = target;
  if (target && !/^https?:\/\//.test(target)) normalizedTarget = `https://${target}`;
  if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(normalizedTarget)) { state.textContent = '유효한 사이트 주소를 입력하세요. 예: https://your-store.kr'; return; }
  if (getUsage() >= 3) { state.innerHTML = '오늘 무료 이용 횟수를 모두 사용했습니다. <a href="/plans">상세 상품으로 계속 이용하세요.</a>'; result.innerHTML = '<div class="upgrade-box"><strong>무료 이용 한도 초과</strong><p class="muted">상세 진단과 반복 점검은 유료 상품에서 이용할 수 있습니다.</p><a class="btn primary" href="/plans">상품 비교하기</a></div>'; return; }
  state.textContent = '진단을 실행하고 있습니다.';
  result.innerHTML = '<div class="loading-steps"><div>사이트 접근성을 확인합니다.</div><div>필수 고지와 정책 요소를 점검합니다.</div><div>요약 결과를 정리합니다.</div></div>';
  try {
    const res = await fetch('/api/public/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: normalizedTarget, email, turnstileToken: guard.getToken() }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'scan failed');
    setUsage(getUsage()+1); saveScan(data.result || {});
    state.textContent = '스캔 완료 · 무료 요약 결과가 준비되었습니다. 로그인 상태라면 내 사이트에 자동 연결됩니다.';
    renderResult(data.result || {});
  } catch (err) { state.textContent = '실패: ' + err.message; result.textContent = '재시도 가능'; guard.reset?.(); }
}
updateBadge();
document.getElementById('scanBtn')?.addEventListener('click', runScan);
document.getElementById('retryBtn')?.addEventListener('click', runScan);
