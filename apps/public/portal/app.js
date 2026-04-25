import { escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('portalState');
const primary = document.getElementById('portalPrimary');
const feed = document.getElementById('portalFeed');
const saveForm = document.getElementById('saveSiteForm');
const saveState = document.getElementById('saveSiteState');

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
async function jsonFetch(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data;
}
function renderAsset(asset, order, accessToken) {
  if (!asset) return '';
  const downloadUrl = order?.id && asset.downloadable !== false ? `/api/public/fulfillment-download?orderId=${encodeURIComponent(order.id)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}` : '';
  const sections = renderList(asset.sections || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><pre class="pre-wrap">${escapeHtml(item.body || '')}</pre></div>`);
  const fixes = renderList(asset.fixes || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><div class="muted">Before</div><p>${escapeHtml(item.before || '')}</p><div class="muted">After</div><p>${escapeHtml(item.after || '')}</p></div>`);
  const templates = renderList(asset.templates || [], '', item => `<div class="result-card"><strong>${escapeHtml(item.title)}</strong><pre class="pre-wrap">${escapeHtml(item.content || '')}</pre></div>`);
  const guide = asset.guide ? `<div class="result-card"><strong>${escapeHtml(asset.guide.industry)} 체크리스트</strong><ul class="result-list">${renderList(asset.guide.checklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>` : '';
  const badge = asset.badgeSnippet ? `<div class="result-card"><strong>인증 마크 스니펫</strong><pre class="pre-wrap">${escapeHtml(asset.badgeSnippet)}</pre></div>` : '';
  const entitlement = asset.entitlement ? `<div class="result-card"><strong>활성 권한</strong><ul class="result-list">${renderList(asset.entitlement.included || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>` : '';
  return `<div class="card stack"><div class="meta-row"><strong>${escapeHtml(asset.title || asset.productTitle || '구매 산출물')}</strong><span class="pill green">${escapeHtml(asset.status || 'ready')}</span></div><div class="notice muted">${escapeHtml(asset.legalDisclaimer || '')}</div>${downloadUrl ? `<a class="btn secondary" href="${downloadUrl}">PDF 다운로드</a>` : ''}${sections}${fixes}${templates}${guide}${badge}${entitlement}</div>`;
}
function renderSavedSites(sites = []) {
  if (!sites.length) return '<div class="portal-empty">저장된 사이트가 없습니다. 위 입력창에서 사이트를 저장하거나 무료 진단 결과를 로그인 후 연결하세요.</div>';
  return sites.map(site => `<article class="result-card stack site-card">
    <div class="meta-row"><strong>${escapeHtml(site.label || site.domain)}</strong><span class="pill">${escapeHtml(site.status || 'active')}</span></div>
    <div class="muted">${escapeHtml(site.domain || '-')} · ${escapeHtml(site.industry || '업종 미지정')}</div>
    <div class="site-kpi"><div><b>${site.latestRiskScore ?? '-'}</b><span>최근 위험도</span></div><div><b>${escapeHtml(site.latestRiskLevel || '-')}</b><span>위험 등급</span></div><div><b>${site.latestFindings ?? '-'}</b><span>최근 항목 수</span></div></div>
    ${site.memo ? `<p>${escapeHtml(site.memo)}</p>` : ''}
    <div class="site-actions"><a class="btn primary" href="/products/veridion/demo?target=${encodeURIComponent(site.domain)}">재진단</a><a class="btn secondary" href="/plans?siteId=${encodeURIComponent(site.siteId)}">상품 비교</a><a class="btn secondary" href="/checkout?plan=Pro&siteId=${encodeURIComponent(site.siteId)}">상세 리포트 신청</a><button class="btn secondary" data-remove-site="${escapeHtml(site.siteId)}" type="button">저장 해제</button></div>
  </article>`).join('');
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
  let fulfillment = null;
  const orderId = url.searchParams.get('orderId') || summary?.order?.id || '';
  const accessToken = url.searchParams.get('accessToken') || '';
  if (orderId) fulfillment = await fetch(`/api/public/fulfillment?orderId=${encodeURIComponent(orderId)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}`).then(r => r.json()).catch(() => null);

  if (!session.authenticated) {
    state.innerHTML = '로그인하면 사이트 저장, 주문 이력, 산출물, 재진단 바로가기를 사용할 수 있습니다. <a href="/auth?next=/portal">로그인·회원가입</a> 후 무료 진단 결과를 내 사이트에 연결하세요.';
  } else {
    state.textContent = `${session.customer.email} 계정 · 저장 사이트 ${(account?.savedSites || []).length}개 · 주문 ${(account?.orders || []).length}건`;
  }
  primary.innerHTML = `
    <div class="card stack"><div class="meta-row"><strong>저장한 사이트</strong><a class="btn secondary" href="/products/veridion/demo">새 진단</a></div>${renderSavedSites(account?.savedSites || [])}</div>
    ${summary?.order ? `<div class="card stack"><strong>최근 주문</strong><div>${escapeHtml(summary.order.id)}</div><div class="muted">${escapeHtml(summary.order.plan)} · ${escapeHtml(summary.order.status)}</div></div>` : ''}
    ${fulfillment?.locked ? `<div class="card stack"><strong>산출물 잠금</strong><p class="muted">결제 완료 후 리포트·수정안·템플릿 등 구매 산출물이 표시됩니다.</p></div>` : ''}
    ${renderAsset(fulfillment?.asset, fulfillment?.order || summary?.order, accessToken)}
    ${summary?.site ? `<div class="card stack"><strong>현재 선택 사이트</strong><div>${escapeHtml(summary.site.domain)}</div><div class="muted">${escapeHtml(summary.site.latestRiskLevel)} · 예상 최대 ${formatWon(summary.site.latestEstimatedMaxPenalty || 0)}원</div></div>` : ''}
    ${summary?.subscription ? `<div class="card stack"><strong>구독 상태</strong><div>${escapeHtml(summary.subscription.plan)}</div><div class="muted">${escapeHtml(summary.subscription.status)} · 월 ${formatWon(summary.subscription.monthlyPrice)}원</div></div>` : ''}
    ${summary?.latestScan ? `<div class="card stack"><strong>최근 스캔</strong><div>${escapeHtml(summary.latestScan.totalFindings ?? 0)}개 항목 · ${escapeHtml(summary.latestScan.riskScore ?? '-')}점</div><div class="muted">${escapeHtml(summary.latestScan.siteProfile?.industry || summary.latestScan.industry)} · ${escapeHtml(summary.latestScan.siteProfile?.siteType || '-')} · ${escapeHtml((summary.latestScan.topFindings || []).join(' / '))}</div></div>` : ''}
    ${summary?.guidance ? `<div class="card stack"><strong>맞춤 지침</strong><pre class="pre-wrap">${escapeHtml(summary.guidance.content)}</pre></div>` : ''}`;
  feed.innerHTML = `
    <div class="card stack"><div class="meta-row"><strong>게시판 연결 글</strong><a class="btn secondary" href="/board">게시판 보기</a></div>${renderList((summary?.boards || []).filter(item => item.boardType === 'cta'), '<div class="muted">게시판 연결 글 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div><p>${escapeHtml(item.body || '')}</p></div>`)}</div>
    <div class="card stack"><strong>공지·인사이트</strong>${renderList(summary?.boards || [], '<div class="muted">공지 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div></div>`)}</div>
    <div class="card stack"><strong>법령 업데이트</strong>${renderList(summary?.legalUpdates || [], '<div class="muted">법령 업데이트 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">시행 ${escapeHtml(item.effectiveDate || '-')}</div><div>${escapeHtml(item.summary || '')}</div></div>`)}</div>`;
}

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveState.textContent = '사이트를 저장하는 중입니다...';
  try {
    await jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: saveDomain.value, label: saveLabel.value, memo: saveMemo.value }) });
    saveState.textContent = '저장했습니다. 목록을 갱신합니다.';
    saveForm.reset();
    await loadPortal();
  } catch (error) { saveState.textContent = error.message; }
});
primary?.addEventListener('click', async (event) => {
  const id = event.target?.dataset?.removeSite;
  if (!id) return;
  event.preventDefault();
  try { await jsonFetch(`/api/public/account/sites/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadPortal(); } catch (error) { state.textContent = error.message; }
});

loadPortal().catch(error => {
  state.textContent = `내 사이트 관리 정보를 불러오지 못했습니다: ${error.message}`;
  primary.innerHTML = '<div class="card muted">내 사이트 관리 요약을 불러오지 못했습니다.</div>';
  feed.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>';
});
