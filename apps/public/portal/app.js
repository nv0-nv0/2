import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('portalState');
const primary = document.getElementById('portalPrimary');
const feed = document.getElementById('portalFeed');
const saveForm = document.getElementById('saveSiteForm');
const saveState = document.getElementById('saveSiteState');
const sidebarAccount = document.querySelector('.nv74-account');
const planCard = document.querySelector('.nv74-plan-card');
const topbarTitle = document.querySelector('.nv74-topbar h1');
const topbarCopy = document.querySelector('.nv74-topbar p');
const scoreNumber = document.querySelector('.nv74-score-number');
const scoreStatus = document.querySelector('.nv74-score-card .nv74-status-warning');
const scoreFooter = document.querySelector('.nv74-score-card footer span');
const workCard = document.querySelector('.nv74-work-card');

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
async function jsonFetch(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data;
}
function formatDate(value) {
  if (!value) return '검사 이력 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function latestScanFrom(account, summary) {
  return account?.recentScans?.[0] || summary?.latestScan || null;
}
function renderAsset(asset, order, accessToken) {
  if (!asset) return '';
  const downloadUrl = order?.id && asset.downloadable !== false ? `/api/public/fulfillment-download?orderId=${encodeURIComponent(order.id)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}` : '';
  const sections = renderList(asset.sections || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><pre class="pre-wrap">${escapeHtml(item.body || '')}</pre></div>`);
  const fixes = renderList(asset.fixes || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><div class="muted">수정 전</div><p>${escapeHtml(item.before || '')}</p><div class="muted">수정 후</div><p>${escapeHtml(item.after || '')}</p></div>`);
  const templates = renderList(asset.templates || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><pre class="pre-wrap">${escapeHtml(item.content || '')}</pre></div>`);
  const guide = asset.guide ? `<div class="result-card"><strong>${escapeHtml(asset.guide.industry)} 체크리스트</strong><ul class="result-list">${renderList(asset.guide.checklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>` : '';
  const badge = asset.badgeSnippet ? `<div class="result-card"><strong>인증 마크 스니펫</strong><pre class="pre-wrap">${escapeHtml(asset.badgeSnippet)}</pre></div>` : '';
  const entitlement = asset.entitlement ? `<div class="result-card"><strong>활성 권한</strong><ul class="result-list">${renderList(asset.entitlement.included || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>` : '';
  return `<div class="card stack"><div class="meta-row"><strong>${escapeHtml(asset.title || asset.productTitle || '구매 산출물')}</strong><span class="pill brand">${escapeHtml(asset.status || 'ready')}</span></div><div class="notice muted">${escapeHtml(asset.legalDisclaimer || '')}</div>${downloadUrl ? `<a class="btn secondary" href="${escapeAttr(downloadUrl)}">PDF 다운로드</a>` : ''}${sections}${fixes}${templates}${guide}${badge}${entitlement}</div>`;
}
function renderSavedSites(sites = []) {
  if (!sites.length) {
    return `<div class="portal-empty"><strong>아직 저장된 사이트가 없습니다.</strong><p>무료 진단을 실행하거나 아래 입력창에서 사이트를 저장하면 재검사와 최근 내역 관리가 시작됩니다.</p><a class="btn primary" href="/products/veridion/demo">무료 진단 시작</a></div>`;
  }
  const rows = sites.map(site => `<tr>
    <td><div class="nv74-site-title"><span class="nv74-thumb"></span><div><b>${escapeHtml(site.label || site.domain)}</b><small>${escapeHtml(site.domain || '-')} · ${escapeHtml(site.industry || '업종 미지정')}</small></div></div></td>
    <td><span class="nv74-mini-score">${escapeHtml(site.latestRiskScore ?? '-')}</span> <b class="nv74-status-warning">${escapeHtml(site.latestRiskLevel || '검사 전')}</b></td>
    <td>${escapeHtml(formatDate(site.lastScanAt || site.updatedAt || site.createdAt))}</td>
    <td><span class="nv74-chip">${site.latestRiskScore == null ? '검사 필요' : '관리 중'}</span></td>
    <td><div class="nv74-actions"><button class="btn primary" data-rescan-site="${escapeAttr(site.siteId)}" type="button">다시 검사하기</button><a class="btn secondary" href="/products/veridion/demo?target=${escapeAttr(encodeURIComponent(site.domain || ''))}">진단 화면</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(encodeURIComponent(site.siteId || ''))}">상품 비교</a><button class="btn secondary" data-remove-site="${escapeAttr(site.siteId)}" type="button">삭제</button></div></td>
  </tr>`).join('');
  return `<table class="nv74-site-table"><thead><tr><th>사이트</th><th>최근 점수</th><th>마지막 검사</th><th>상태</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderRecentScans(scans = []) {
  if (!scans.length) return '<div class="portal-empty"><strong>지난 검사 내역이 없습니다.</strong><p>검사를 완료하면 최근 5개 결과가 이곳에 저장됩니다.</p></div>';
  return `<div class="card stack"><div class="meta-row"><strong>지난 검사 내역 5개</strong><a class="btn secondary" href="/products/veridion/demo">새 검사</a></div>${scans.map(scan => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(scan.target || '저장 사이트')}</strong><span class="pill">${escapeHtml(scan.riskLevel || '검사 완료')}</span></div><p class="muted">${escapeHtml(formatDate(scan.createdAt || scan.generatedAt))} · 점수 ${escapeHtml(scan.riskScore ?? '-')} · 발견 ${escapeHtml(scan.totalFindings ?? '-')}개</p><div class="topnav"><button class="btn primary" data-rescan-site="${escapeAttr(scan.siteId || '')}" data-rescan-domain="${escapeAttr(scan.target || '')}" type="button">다시 검사하기</button><a class="btn secondary" href="/plans?siteId=${escapeAttr(scan.siteId || '')}">상품 비교</a></div></div>`).join('')}</div>`;
}
function renderMemberValueBox(session, account) {
  if (!session?.authenticated) {
    return `<div class="card stack"><strong>회원가입하면 바로 쓸 수 있는 기능</strong><ul class="result-list"><li>내 사이트 저장</li><li>클릭 한 번으로 다시 검사</li><li>지난 검사 내역 5개 확인</li><li>검사 결과 자동 저장</li></ul><a class="btn primary" href="/auth?next=/portal">무료로 검사 결과 저장하기</a></div>`;
  }
  return `<div class="card stack"><strong>회원 전용 기능 활성화됨</strong><p class="muted">${escapeHtml(account?.customer?.email || session.customer?.email || '')} 계정으로 사이트 저장, 원클릭 재검사, 최근 내역 관리가 가능합니다.</p></div>`;
}
function updateStaticDashboard(session, account, summary) {
  const authenticated = !!session?.authenticated;
  const latest = latestScanFrom(account, summary);
  const sitesCount = account?.savedSites?.length || 0;
  if (sidebarAccount) sidebarAccount.textContent = authenticated ? (account?.customer?.email || session.customer?.email || '로그인 계정') : '비회원 · 저장 기능 비활성';
  if (planCard) planCard.innerHTML = `<div><b>${authenticated ? '회원 전용 관리' : '무료 계정 필요'}</b><small><span>사이트 ${sitesCount}개</span><span>최근 검사 ${account?.recentScans?.length || 0}개</span></small></div><a class="btn secondary" href="${authenticated ? '/plans' : '/auth?next=/portal'}">${authenticated ? '상품 보기' : '로그인·회원가입'}</a>`;
  if (topbarTitle) topbarTitle.textContent = authenticated ? '내 사이트 관리' : '검사 결과를 저장하려면 로그인하세요';
  if (topbarCopy) topbarCopy.textContent = authenticated ? '저장한 사이트를 다시 검사하고 최근 결과를 한곳에서 확인하세요.' : '회원가입하면 내 사이트 저장, 원클릭 재검사, 지난 검사 내역 확인을 사용할 수 있습니다.';
  if (scoreNumber) scoreNumber.textContent = latest?.riskScore ?? '-';
  if (scoreStatus) scoreStatus.textContent = latest?.riskLevel || '검사 전';
  if (scoreFooter) scoreFooter.textContent = `최근 진단일: ${formatDate(latest?.createdAt || latest?.generatedAt)}`;
  if (workCard) workCard.innerHTML = `<div class="nv74-card-head"><h2>회원 전용 간단 기능</h2><a href="#saveSiteForm">사이트 등록 ›</a></div><div class="nv74-task-list"><div class="nv74-task"><i class="blue">01</i><div><b>내 사이트 저장</b><small>검사할 URL을 계정에 보관</small></div><progress value="100" max="100"></progress><span class="status ok">적용</span></div><div class="nv74-task"><i class="purple">02</i><div><b>다시 검사하기</b><small>저장된 URL을 바로 재검사</small></div><progress value="100" max="100"></progress><span class="status ok">적용</span></div><div class="nv74-task"><i class="orange">03</i><div><b>최근 검사 5개</b><small>지난 결과를 목록으로 확인</small></div><progress value="100" max="100"></progress><span class="status ok">적용</span></div></div>`;
}
async function loadPortal() {
  const url = new URL(location.href);
  const saved = getSavedScan();
  if (!url.searchParams.get('siteId') && saved?.siteId) url.searchParams.set('siteId', saved.siteId);
  const [sessionRes, accountRes, summaryRes] = await Promise.allSettled([
    fetch('/api/public/auth/session').then(r => r.json()),
    fetch('/api/public/account').then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) })),
    fetch(`/api/public/portal-summary?${url.searchParams.toString()}`).then(r => r.json())
  ]);
  const session = sessionRes.status === 'fulfilled' ? sessionRes.value : { authenticated: false };
  const account = accountRes.status === 'fulfilled' && accountRes.value.ok ? accountRes.value.data : null;
  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.summary : {};
  updateStaticDashboard(session, account, summary);
  let fulfillment = null;
  const orderId = url.searchParams.get('orderId') || summary?.order?.id || '';
  const accessToken = url.searchParams.get('accessToken') || '';
  if (orderId) fulfillment = await fetch(`/api/public/fulfillment?orderId=${encodeURIComponent(orderId)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}`).then(r => r.json()).catch(() => null);
  if (!session.authenticated) {
    state.innerHTML = '로그인하면 사이트 저장, 원클릭 재검사, 지난 검사 내역 확인을 사용할 수 있습니다. <a href="/auth?next=/portal">로그인·회원가입</a>';
  } else {
    state.textContent = `${account?.customer?.email || session.customer.email} 계정 · 저장 사이트 ${(account?.savedSites || []).length}개 · 최근 검사 ${(account?.recentScans || []).length}개`;
  }
  primary.innerHTML = `
    ${renderSavedSites(account?.savedSites || [])}
    ${renderRecentScans(account?.recentScans || [])}
    ${renderMemberValueBox(session, account)}
    ${summary?.order ? `<div class="nv74-state"><strong>최근 주문</strong> · ${escapeHtml(summary.order.plan)} · ${escapeHtml(summary.order.status)}</div>` : ''}
    ${fulfillment?.locked ? `<div class="nv74-state"><strong>산출물 잠금</strong> · 결제 완료 후 리포트·수정안·템플릿 등 구매 산출물이 표시됩니다.</div>` : ''}
    ${renderAsset(fulfillment?.asset, fulfillment?.order || summary?.order, accessToken)}
    ${summary?.site ? `<div class="nv74-state"><strong>현재 선택 사이트</strong> · ${escapeHtml(summary.site.domain)} · ${escapeHtml(summary.site.latestRiskLevel || '검사 전')} · 예상 최대 ${formatWon(summary.site.latestEstimatedMaxPenalty || 0)}원</div>` : ''}
    ${summary?.guidance ? `<div class="nv74-state"><strong>맞춤 지침</strong><pre class="pre-wrap">${escapeHtml(summary.guidance.content)}</pre></div>` : ''}`;
  feed.innerHTML = `
    <div class="card stack"><div class="meta-row"><strong>게시판 연결 글</strong><a class="btn secondary" href="/board">게시판 보기</a></div>${renderList((summary?.boards || []).filter(item => item.boardType === 'cta'), '<div class="muted">게시판 연결 글 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div><p>${escapeHtml(item.body || '')}</p></div>`)}</div>
    <div class="card stack"><strong>공지·인사이트</strong>${renderList(summary?.boards || [], '<div class="muted">공지 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div></div>`)}</div>`;
}

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveState.textContent = '사이트를 저장하는 중입니다...';
  try {
    await jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: document.getElementById('saveUrl').value, label: document.getElementById('saveName').value, memo: document.getElementById('saveMemo').value }) });
    saveState.textContent = '저장했습니다. 다음부터 클릭 한 번으로 다시 검사할 수 있습니다.';
    saveForm.reset();
    await loadPortal();
  } catch (error) { saveState.textContent = error.message; }
});
primary?.addEventListener('click', async (event) => {
  const removeId = event.target?.dataset?.removeSite;
  const rescanId = event.target?.dataset?.rescanSite;
  const rescanDomain = event.target?.dataset?.rescanDomain;
  if (removeId) {
    event.preventDefault();
    try { await jsonFetch(`/api/public/account/sites/${encodeURIComponent(removeId)}`, { method: 'DELETE' }); await loadPortal(); } catch (error) { state.textContent = error.message; }
  }
  if (rescanId || rescanDomain) {
    event.preventDefault();
    state.textContent = '저장된 사이트를 다시 검사하는 중입니다...';
    try {
      await jsonFetch('/api/public/account/rescan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteId: rescanId, domain: rescanDomain }) });
      state.textContent = '재검사가 완료되었습니다. 최근 검사 내역을 갱신했습니다.';
      await loadPortal();
    } catch (error) { state.textContent = error.message; }
  }
});

loadPortal().catch(error => {
  state.textContent = `내 사이트 관리 정보를 불러오지 못했습니다: ${error.message}`;
  primary.innerHTML = '<div class="nv74-state">내 사이트 관리 요약을 불러오지 못했습니다.</div>';
  feed.innerHTML = '<div class="nv74-state">잠시 후 다시 시도하세요.</div>';
});
