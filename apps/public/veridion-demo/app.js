import { mountTurnstile } from '/shared/turnstile.js';
import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('demoState');
const result = document.getElementById('demoResult');
const badge = document.getElementById('freeUsageBadge');
const targetInput = document.getElementById('targetUrl');
const guard = await mountTurnstile({ containerId: 'turnstileBox', tokenInputId: 'turnstileToken', noticeId: 'turnstileState' });
const params = new URLSearchParams(location.search);
if (params.get('target') && targetInput) targetInput.value = params.get('target');

const FREE_LIMIT = 2;
const usageKey = `veridion:instantDemoUsage:${new Date().toISOString().slice(0,10)}`;
let session = { authenticated: false, customer: null };
let lastScan = null;

function getUsage(){ return Number(localStorage.getItem(usageKey) || '0'); }
function setUsage(n){ localStorage.setItem(usageKey, String(n)); updateBadge(); }
function updateBadge(){ const left=Math.max(0,FREE_LIMIT-getUsage()); if(badge) badge.textContent=session.authenticated ? '회원 전용 전체 결과 활성' : `비회원 즉시 요약 ${left}회 남음`; }
function saveScan(scan) { localStorage.setItem('nv0:lastScan', JSON.stringify(scan)); lastScan = scan; }
function getSavedScanFromStorage() { try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; } }
async function jsonFetch(path, options = {}) { const res = await fetch(path, options); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.'); return data; }
async function loadSession(){ try { const data = await jsonFetch('/api/public/auth/session'); session = data || session; } catch { session = { authenticated: false, customer: null }; } updateBadge(); }

function normalizeTarget(raw) {
  const target = String(raw || '').trim();
  if (!target) return '';
  return /^https?:\/\//i.test(target) ? target : `https://${target}`;
}
function isValidTarget(value) { return /^https?:\/\/[^\s.]+\.[^\s]+/i.test(value); }
function loginUrl(scan = lastScan) {
  const next = scan?.siteId ? `/portal?siteId=${encodeURIComponent(scan.siteId)}` : '/portal';
  return `/auth?next=${encodeURIComponent(next)}`;
}
function detailRows(scan) {
  return Array.isArray(scan.detailFindings) ? scan.detailFindings : [];
}
function renderFullResult(scan) {
  const findings = detailRows(scan);
  const fixes = (scan.diagnosis?.fixPlan || []).slice(0, 5);
  const pages = (scan.diagnosis?.scannedPages || scan.scannedPages || []).slice(0, 8);
  return `<div class="card stack full-result"><div class="meta-row"><strong>전체 결과 열람 가능</strong><span class="pill brand">회원 전용</span></div><div class="notice"><strong>${escapeHtml(session.customer?.email || '로그인 계정')}</strong>에 저장되었습니다. 내 사이트 관리에서 원클릭 재검사와 최근 검사 내역 확인이 가능합니다.</div><h3>전체 발견 항목 ${findings.length}개</h3><div class="result-grid">${renderList(findings, '<div class="muted">상세 발견 항목 없음</div>', item => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(item.title || item.code || '점검 항목')}</strong><span class="pill ${item.priority === 'P0' ? 'gold' : ''}">${escapeHtml(item.priority || '확인')}</span></div><p>${escapeHtml(item.recommendation || item.fixTemplate || '권장 조치 확인')}</p><small class="muted">${escapeHtml(item.category || '')} · ${escapeHtml(item.code || '')}</small></div>`)}</div><h3>수정 순서</h3><ol class="result-list">${renderList(fixes, '<li>자동 수정 후보 없음</li>', item => `<li><b>${escapeHtml(item.target || '')}</b><br><span class="muted">${escapeHtml(item.action || '')}</span></li>`)}</ol><div class="notice muted">스캔 페이지: ${pages.length ? pages.map(p => escapeHtml(p.finalUrl || p.url || p)).join(' · ') : '기본 URL 중심 분석'}</div><div class="topnav"><a class="btn primary" href="/portal?siteId=${escapeAttr(scan.siteId || '')}">내 사이트 관리</a><a class="btn secondary" href="/plans?riskScore=${escapeAttr(scan.riskScore || '')}&siteId=${escapeAttr(scan.siteId || '')}">상품 비교</a><a class="btn secondary" href="/checkout?plan=${escapeAttr(scan.recommendedPlan || 'Pro')}&siteId=${escapeAttr(scan.siteId || '')}">상세 리포트 신청</a></div></div>`;
}
function renderLockedResult(scan) {
  const hiddenCount = Math.max(0, detailRows(scan).length - 2);
  return `<div class="result-locked"><div class="locked-content"><ul class="result-list"><li>페이지별 근거와 실제 발견 항목</li><li>수정 우선순위와 실행 문안</li><li>내 사이트 저장, 원클릭 재검사, 최근 검사 이력</li></ul></div><div class="lock-box"><div class="lock-card"><div class="pill">회원가입 후 전체 공개</div><h3>전체 결과 ${hiddenCount || '상세'}개는 로그인 후 바로 열립니다.</h3><p class="muted">결과를 보기 전에 이메일만 받는 방식은 제거했습니다. 먼저 즉시 요약을 보여주고, 전체 결과와 저장 기능은 회원 계정에서 제공합니다.</p><div class="topnav"><a class="primary" href="${escapeAttr(loginUrl(scan))}">로그인·회원가입하고 전체 보기</a><a class="secondary" href="/plans?riskScore=${escapeAttr(scan.riskScore || '')}&siteId=${escapeAttr(scan.siteId || '')}">상품 비교</a></div></div></div></div>`;
}
function renderResult(scan) {
  const topFindings = (scan.topFindings || []).slice(0, 2);
  const diagnosis = scan.diagnosis || {};
  const checks = (diagnosis.mainChecks || []).slice(0, 5);
  result.innerHTML = `<div class="result-card stack compact-result"><div class="meta-row"><strong>${escapeHtml(scan.target || '')}</strong><span class="pill gold">${escapeHtml(scan.riskLevel || '-')}</span></div><div class="grid cols-2"><div><div class="muted">위험도</div><div class="kpi">${escapeHtml(scan.riskScore ?? '-')}</div></div><div><div class="muted">예상 최대 과태료</div><div class="kpi">${formatWon(scan.estimatedMaxPenalty)}</div></div></div><div class="notice"><strong>즉시 요약 결과</strong> 이메일 입력 없이 바로 생성했습니다. 전체 결과와 저장/재검사는 로그인 후 이용합니다.</div><strong>상위 위험 2개</strong><ul class="result-list">${renderList(topFindings, '<li>상위 위험 항목 없음</li>', item => `<li>${escapeHtml(item)}</li>`)}</ul><div class="diagnosis-grid">${renderList(checks, '', item => `<span class="diag-chip ${item.status === 'attention' ? 'warn' : 'ok'}"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.priority)}</small></span>`)}</div><div class="upgrade-box"><strong>추천 상품: ${escapeHtml(scan.recommendedPlan || 'Pro')}</strong><p class="muted">무료 요약으로 신뢰를 확인한 뒤, 회원 계정에서 전체 결과·저장·재검사를 이어갑니다.</p></div></div>${session.authenticated ? renderFullResult(scan) : renderLockedResult(scan)}`;
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
  await loadSession();
  const normalizedTarget = normalizeTarget(targetInput?.value);
  if (!isValidTarget(normalizedTarget)) { state.textContent = '유효한 사이트 주소를 입력하세요. 예: https://your-store.kr'; return; }
  if (!session.authenticated && getUsage() >= FREE_LIMIT) { state.innerHTML = `오늘 비회원 즉시 요약 횟수를 모두 사용했습니다. <a href="${escapeAttr(loginUrl())}">로그인·회원가입하면 계속 이용할 수 있습니다.</a>`; result.innerHTML = '<div class="upgrade-box"><strong>비회원 이용 한도 초과</strong><p class="muted">회원가입 후 전체 결과, 저장, 재검사를 계속 사용할 수 있습니다.</p></div>'; return; }
  state.textContent = '진단을 실행하고 있습니다.';
  result.innerHTML = '<div class="loading-steps"><div>사이트 접근성을 확인합니다.</div><div>필수 고지와 정책 요소를 점검합니다.</div><div>즉시 요약 결과를 정리합니다.</div></div>';
  try {
    const data = await jsonFetch('/api/public/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: normalizedTarget, turnstileToken: guard.getToken() }) });
    if (!session.authenticated) setUsage(getUsage()+1);
    saveScan(data.result || {});
    if (session.authenticated && data.result) {
      try { await saveCurrentSite(data.result); } catch {}
    }
    state.textContent = session.authenticated ? '진단 완료 · 전체 결과와 내 사이트 저장이 활성화되었습니다.' : '진단 완료 · 즉시 요약을 먼저 보여드립니다. 전체 결과는 회원가입 후 바로 확인하세요.';
    renderResult(data.result || {});
  } catch (err) { state.textContent = '실패: ' + err.message; result.textContent = '재시도 가능'; guard.reset?.(); }
}

await loadSession();
updateBadge();
document.getElementById('scanBtn')?.addEventListener('click', runScan);
document.getElementById('retryBtn')?.addEventListener('click', runScan);
document.getElementById('unlockBtn')?.addEventListener('click', unlockSavedScan);
window.addEventListener('pageshow', async () => { await loadSession(); if (session.authenticated) unlockSavedScan().catch(() => {}); });
