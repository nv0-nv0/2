import { escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('portalState');
const primary = document.getElementById('portalPrimary');
const feed = document.getElementById('portalFeed');

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('veridion:lastScan') || 'null'); } catch { return null; }
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

(async()=>{
  try {
    const url = new URL(location.href);
    const saved = getSavedScan();
    if (!url.searchParams.get('siteId') && saved?.siteId) url.searchParams.set('siteId', saved.siteId);
    const res = await fetch(`/api/public/portal-summary?${url.searchParams.toString()}`);
    const data = await res.json();
    const summary = data.summary;
    let fulfillment = null;
    const orderId = url.searchParams.get('orderId') || summary.order?.id || '';
    const accessToken = url.searchParams.get('accessToken') || '';
    if (orderId) {
      const fulfillRes = await fetch(`/api/public/fulfillment?orderId=${encodeURIComponent(orderId)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}`);
      if (fulfillRes.ok) fulfillment = await fulfillRes.json();
    }
    state.textContent = summary.site ? `${summary.site.domain} · 최근 위험도 ${summary.site.latestRiskScore}점` : `공지 ${summary.boards.length}건 · 법령 업데이트 ${summary.legalUpdates.length}건`;
    primary.innerHTML = `
      ${summary.order ? `<div class="card stack"><strong>최근 주문</strong><div>${escapeHtml(summary.order.id)}</div><div class="muted">${escapeHtml(summary.order.plan)} · ${escapeHtml(summary.order.status)}</div></div>` : ''}
      ${fulfillment?.locked ? `<div class="card stack"><strong>산출물 잠금</strong><p class="muted">결제 완료 후 리포트·수정안·템플릿 등 구매 산출물이 표시됩니다.</p></div>` : ''}
      ${renderAsset(fulfillment?.asset, fulfillment?.order || summary.order, accessToken)}
      ${summary.site ? `<div class="card stack"><strong>등록 사이트</strong><div>${escapeHtml(summary.site.domain)}</div><div class="muted">${escapeHtml(summary.site.latestRiskLevel)} · 예상 최대 ${formatWon(summary.site.latestEstimatedMaxPenalty || 0)}원</div></div>` : ''}
      ${summary.subscription ? `<div class="card stack"><strong>구독 상태</strong><div>${escapeHtml(summary.subscription.plan)}</div><div class="muted">${escapeHtml(summary.subscription.status)} · 월 ${formatWon(summary.subscription.monthlyPrice)}원</div></div>` : ''}
      ${summary.latestScan ? `<div class="card stack"><strong>최근 스캔</strong><div>${escapeHtml(summary.latestScan.totalFindings ?? 0)}개 항목 · ${escapeHtml(summary.latestScan.riskScore ?? '-')}점</div><div class="muted">${escapeHtml(summary.latestScan.siteProfile?.industry || summary.latestScan.industry)} · ${escapeHtml(summary.latestScan.siteProfile?.siteType || '-')} · ${escapeHtml((summary.latestScan.topFindings || []).join(' / '))}</div></div>` : ''}
      ${summary.guidance ? `<div class="card stack"><strong>맞춤 지침</strong><pre class="pre-wrap">${escapeHtml(summary.guidance.content)}</pre></div>` : ''}`;
    feed.innerHTML = `
      <div class="card stack"><strong>공지</strong>${renderList(summary.boards || [], '<div class="muted">공지 없음</div>', (item) => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">${escapeHtml(item.createdAt || '-')}</div></div>`)}</div>
      <div class="card stack"><strong>법령 업데이트</strong>${renderList(summary.legalUpdates || [], '<div class="muted">법령 업데이트 없음</div>', (item) => `<div class="result-card"><div>${escapeHtml(item.title)}</div><div class="muted">시행 ${escapeHtml(item.effectiveDate || '-')}</div><div>${escapeHtml(item.summary || '')}</div></div>`)}</div>`;
  } catch (error) {
    state.textContent = `포털 정보를 불러오지 못했습니다: ${error.message}`;
    primary.innerHTML = '<div class="card muted">포털 요약을 불러오지 못했습니다.</div>';
    feed.innerHTML = '<div class="card muted">잠시 후 다시 시도하세요.</div>';
  }
})();
