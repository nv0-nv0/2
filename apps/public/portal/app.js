import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

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
  return `<div class="card stack"><div class="meta-row"><strong>${escapeHtml(asset.title || asset.productTitle || '구매 산출물')}</strong><span class="pill brand">${escapeHtml(asset.status || 'ready')}</span></div><div class="notice muted">${escapeHtml(asset.legalDisclaimer || '')}</div>${downloadUrl ? `<a class="btn secondary" href="${escapeAttr(downloadUrl)}">PDF 다운로드</a>` : ''}${sections}${fixes}${templates}${guide}${badge}${entitlement}</div>`;
}
function renderSavedSites(sites = []) {
  const fallback = [{ siteId: 'demo', label: 'nv0 demo site', domain: 'https://nv0demo.com', latestRiskScore: 72, latestRiskLevel: '보통', latestFindings: 15, status: '정상 운영', industry: '메인', createdAt: '2026.04.25' }];
  const rows = (sites.length ? sites : fallback).map(site => `<tr>
    <td><div class="nv74-site-title"><span class="nv74-thumb"></span><div><b>${escapeHtml(site.label || site.domain)}</b><small>${escapeHtml(site.domain || '-')} · ${escapeHtml(site.industry || '업종 미지정')}</small></div></div></td>
    <td><span class="nv74-mini-score">${escapeHtml(site.latestRiskScore ?? '72')}</span> <b class="nv74-status-warning">${escapeHtml(site.latestRiskLevel || '보통')}</b></td>
    <td>${escapeHtml(site.updatedAt || site.createdAt || '2026.04.25')}<br><small>13:51</small></td>
    <td><span class="nv74-chip">${escapeHtml(site.status || '정상 운영')}</span></td>
    <td><div class="nv74-actions"><a class="btn secondary" href="/products/veridion/demo?target=${escapeAttr(encodeURIComponent(site.domain || ''))}">상세 보기</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(encodeURIComponent(site.siteId || ''))}">리포트</a>${site.siteId && site.siteId !== 'demo' ? `<button class="btn secondary" data-remove-site="${escapeAttr(site.siteId)}" type="button">…</button>` : ''}</div></td>
  </tr>`).join('');
  return `<table class="nv74-site-table"><thead><tr><th>사이트</th><th>최근 점수</th><th>진단일</th><th>상태</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    ${renderSavedSites(account?.savedSites || [])}
    ${summary?.order ? `<div class="nv74-state"><strong>최근 주문</strong> · ${escapeHtml(summary.order.plan)} · ${escapeHtml(summary.order.status)}</div>` : ''}
    ${fulfillment?.locked ? `<div class="nv74-state"><strong>산출물 잠금</strong> · 결제 완료 후 리포트·수정안·템플릿 등 구매 산출물이 표시됩니다.</div>` : ''}
    ${renderAsset(fulfillment?.asset, fulfillment?.order || summary?.order, accessToken)}
    ${summary?.site ? `<div class="nv74-state"><strong>현재 선택 사이트</strong> · ${escapeHtml(summary.site.domain)} · ${escapeHtml(summary.site.latestRiskLevel)} · 예상 최대 ${formatWon(summary.site.latestEstimatedMaxPenalty || 0)}원</div>` : ''}
    ${summary?.subscription ? `<div class="nv74-state"><strong>구독 상태</strong> · ${escapeHtml(summary.subscription.plan)} · ${escapeHtml(summary.subscription.status)} · 월 ${formatWon(summary.subscription.monthlyPrice)}원</div>` : ''}
    ${summary?.latestScan ? `<div class="nv74-state"><strong>최근 스캔</strong> · ${escapeHtml(summary.latestScan.totalFindings ?? 0)}개 항목 · ${escapeHtml(summary.latestScan.riskScore ?? '-')}점 · ${escapeHtml((summary.latestScan.topFindings || []).join(' / '))}</div>` : ''}
    ${summary?.guidance ? `<div class="nv74-state"><strong>맞춤 지침</strong><pre class="pre-wrap">${escapeHtml(summary.guidance.content)}</pre></div>` : ''}`;
  feed.innerHTML = `
    <div class="card stack"><div class="meta-row"><strong>게시판 연결 글</strong><a class="btn secondary" href="/board">게시판 보기</a></div>${renderList((summary?.boards || []).filter(item => item.boardType === 'cta'), '<div class="muted">게시판 연결 글 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div><p>${escapeHtml(item.body || '')}</p></div>`)}</div>
    <div class="card stack"><strong>공지·인사이트</strong>${renderList(summary?.boards || [], '<div class="muted">공지 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div></div>`)}</div>
    <div class="card stack"><strong>법령 업데이트</strong>${renderList(summary?.legalUpdates || [], '<div class="muted">법령 업데이트 없음</div>', item => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">시행 ${escapeHtml(item.effectiveDate || '-')}</div><div>${escapeHtml(item.summary || '')}</div></div>`)}</div>`;
}

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveState.textContent = '사이트를 저장하는 중입니다...';
  try {
    await jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: document.getElementById('saveUrl').value, label: document.getElementById('saveName').value, memo: document.getElementById('saveMemo').value }) });
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
  primary.innerHTML = '<div class="nv74-state">내 사이트 관리 요약을 불러오지 못했습니다.</div>';
  feed.innerHTML = '<div class="nv74-state">잠시 후 다시 시도하세요.</div>';
});
