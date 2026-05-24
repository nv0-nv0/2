/* phase291 validation compatibility: 사이트 저장 / 다시 진단 / 20분에 1회 발행 상태 */
import { escapeAttr, escapeHtml, formatWon, renderList } from '/shared/html.js';

const state = document.getElementById('portalState');
const primary = document.getElementById('portalPrimary');
const feed = document.getElementById('portalFeed');
const saveForm = document.getElementById('saveSiteForm');
const saveState = document.getElementById('saveSiteState');
const portalAccountState = document.getElementById('portalAccountState');
const dashboardTotalSites = document.getElementById('portalTotalSites');
const dashboardCriticalIssues = document.getElementById('portalCriticalIssues');
const dashboardCompliantSites = document.getElementById('portalCompliantSites');
const dashboardAssetList = document.getElementById('portalAssetList');
const addSiteToggle = document.getElementById('addSiteToggle');
const planCard = document.querySelector('.nv74-plan-card');
const topbarTitle = document.querySelector('.nv74-topbar h1');
const topbarCopy = document.querySelector('.nv74-topbar p');
const scoreNumber = document.querySelector('.nv74-score-number');
const scoreStatus = document.querySelector('.nv74-score-card .nv74-status-warning');
const scoreFooter = document.querySelector('.nv74-score-card footer span');
const workCard = document.querySelector('.nv74-work-card');
const scoreDesc = document.querySelector('.nv74-score-desc');
const scoreBars = document.getElementById('portalScoreBars');
const scoreMetrics = document.getElementById('portalScoreMetrics');
const nextActionCards = document.getElementById('portalNextActions');
const portalLatestScanAt = document.getElementById('portalLatestScanAt');
const portalWarningIssues = document.getElementById('portalWarningIssues');
const portalActionRequiredCount = document.getElementById('portalActionRequiredCount');
const portalSummaryDomain = document.getElementById('portalSummaryDomain');
const portalIssueCount = document.getElementById('portalIssueCount');
const portalPriorityCount = document.getElementById('portalPriorityCount');
const portalContentStatus = document.getElementById('portalContentStatus');
const portalPublishCadence = document.getElementById('portalPublishCadence');
const portalLastPublishedAt = document.getElementById('portalLastPublishedAt');
const portalPublishState = document.getElementById('portalPublishState');
const portalRiskGauge = document.getElementById('portalRiskGauge');
const portalRiskMeterFill = document.getElementById('portalRiskMeterFill');
const portalRiskLabelText = document.getElementById('portalRiskLabelText');
const portalRiskMeterCaption = document.getElementById('portalRiskMeterCaption');
const portalStatusBanner = document.getElementById('portalStatusBanner');
const portalStatusSummary = document.getElementById('portalStatusSummary');
const portalStatusDetail = document.getElementById('portalStatusDetail');
const portalShellProfileState = document.getElementById('portalShellProfileState');

function getSavedScan() {
  try { return JSON.parse(localStorage.getItem('nv0:lastScan') || 'null'); } catch { return null; }
}
function getAutoHandoff() {
  try { return JSON.parse(sessionStorage.getItem('nv0:autoHandoff') || 'null'); } catch { return null; }
}
function renderPortalHandoffBanner(handoff, savedScan) {
  const source = handoff || (savedScan?.handoffSource === 'home-instant-demo' ? savedScan : null);
  if (!source) return '';
  const target = readableDomain(source.target || savedScan?.target || savedScan?.domain || '최근 진단 사이트');
  const requestId = source.requestId || savedScan?.requestId || '';
  return `<div class="nv0-portal-handoff-banner" role="status" aria-live="polite"><strong>메인 진단 결과가 내 사이트로 자동 연결되었습니다.</strong><p>${escapeHtml(target)} 결과를 이 화면에서 이어서 확인합니다.${requestId ? ` 요청 ID: ${escapeHtml(requestId)}` : ''}</p></div>`;
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
function clampText(value = '', max = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
function readableDomain(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || raw;
}
function findCountFromScan(scan = {}) {
  const detailCount = Array.isArray(scan?.detailFindings) ? scan.detailFindings.length : 0;
  const numeric = Number(scan?.totalFindings);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : detailCount;
}
function urgentCountFromScan(scan = {}) {
  const details = Array.isArray(scan?.detailFindings) ? scan.detailFindings : [];
  const urgent = details.filter(item => ['P0', 'P1'].includes(String(item?.priority || '').toUpperCase())).length;
  if (urgent) return urgent;
  const total = findCountFromScan(scan);
  return total ? Math.max(1, Math.min(total, Math.ceil(total / 2))) : 0;
}

function numericScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function riskProfileFromScore(score, level = '') {
  const normalizedLevel = String(level || '').trim();
  const n = numericScore(score);
  if (n == null) {
    if (/치명|심각|위험|높음|high|critical/i.test(normalizedLevel)) return { key: 'critical', label: '우선 확인', icon: 'priority_high', border: 'border-error', chip: 'bg-secondary-container text-on-error', action: '우선 확인하기' };
    if (/준수|완료|안전|낮음|safe|ok/i.test(normalizedLevel)) return { key: 'safe', label: '확인 완료', icon: 'verified', border: 'border-tertiary-fixed-dim', chip: 'bg-[#DCFCE7] text-[#166534]', action: '상세 리포트' };
    return { key: 'warning', label: '확인 필요', icon: 'warning', border: 'border-[#F59E0B]', chip: 'bg-[#FEF3C7] text-[#92400E]', action: '수정 방향 보기' };
  }
  if (n >= 75) return { key: 'critical', label: '우선 확인', icon: 'priority_high', border: 'border-error', chip: 'bg-secondary-container text-on-error', action: '우선 확인하기' };
  if (n >= 55) return { key: 'warning', label: '확인 필요', icon: 'warning', border: 'border-[#F59E0B]', chip: 'bg-[#FEF3C7] text-[#92400E]', action: '수정 방향 보기' };
  return { key: 'safe', label: '확인 완료', icon: 'verified', border: 'border-tertiary-fixed-dim', chip: 'bg-[#DCFCE7] text-[#166534]', action: '상세 리포트' };
}
function iconForDomain(domain = '') {
  if (/shop|store|mall|commerce|ecommerce|pay|cart/i.test(domain)) return 'shopping_cart';
  if (/blog|news|post|insight|content/i.test(domain)) return 'article';
  return 'apartment';
}
function assetFromSite(site = {}) {
  const risk = riskProfileFromScore(site.latestRiskScore, site.latestRiskLevel);
  return {
    id: site.siteId || site.id || site.domain || uidFallback(site.domain),
    siteId: site.siteId || site.id || '',
    domain: site.domain || site.label || '저장 사이트',
    label: site.label || site.domain || '저장 사이트',
    score: site.latestRiskScore ?? null,
    findings: site.latestFindings ?? site.totalFindings ?? null,
    lastScanAt: site.lastScanAt || site.updatedAt || site.createdAt || null,
    source: 'site',
    risk
  };
}
function assetFromScan(scan = {}) {
  const target = readableDomain(scan.target || scan.domain || '최근 진단 사이트');
  const risk = riskProfileFromScore(scan.riskScore, scan.riskLevel);
  return {
    id: scan.siteId || scan.requestId || target || 'recent-scan',
    siteId: scan.siteId || '',
    requestId: scan.requestId || '',
    domain: target,
    label: target,
    score: scan.riskScore ?? null,
    findings: findCountFromScan(scan),
    lastScanAt: scan.createdAt || scan.generatedAt || null,
    source: 'scan',
    risk
  };
}
function uidFallback(value = '') {
  return String(value || 'asset').toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || 'asset';
}
function collectDashboardAssets(account, summary, savedScan) {
  const assets = [];
  const seen = new Set();
  const push = (asset) => {
    const key = String(asset.siteId || asset.domain || asset.requestId || '').toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    assets.push(asset);
  };
  for (const site of account?.savedSites || []) push(assetFromSite(site));
  for (const scan of account?.recentScans || []) push(assetFromScan(scan));
  if (summary?.site) push(assetFromSite(summary.site));
  if (summary?.latestScan) push(assetFromScan(summary.latestScan));
  if (savedScan) push(assetFromScan(savedScan));
  return assets.slice(0, 12);
}
function renderDashboardAssets(assets = []) {
  if (!dashboardAssetList) return;
  if (!assets.length) {
    dashboardAssetList.innerHTML = `<div class="portal-empty-card"><strong>등록된 사이트가 없습니다.</strong><p>새 사이트를 추가하거나 무료 진단을 실행하면 실제 자산과 상태가 표시됩니다.</p><div class="portal-dashboard-asset-actions"><a class="btn primary" href="#saveSiteForm">새 사이트 추가</a><a class="btn secondary" href="/products/veridion/demo">무료 진단 시작</a></div></div>`;
    return;
  }
  dashboardAssetList.innerHTML = assets.slice(0, 4).map(asset => {
    const siteParam = asset.siteId ? `siteId=${encodeURIComponent(asset.siteId)}` : '';
    const reportHref = siteParam ? `/portal?${siteParam}#portalPrimary` : `/products/veridion/demo?target=${encodeURIComponent(asset.domain || '')}`;
    const checkoutHref = siteParam ? `/checkout?plan=${asset.risk.key === 'critical' ? 'Expert' : 'Report'}&${siteParam}` : `/plans`;
    const secondaryHref = asset.risk.key === 'safe' ? `/products/veridion/demo?target=${encodeURIComponent(asset.domain || '')}` : checkoutHref;
    const meta = asset.lastScanAt ? `${formatDate(asset.lastScanAt)} · ${asset.source === 'site' ? '저장 사이트' : '최근 진단'}` : (asset.score == null ? '검사 전' : '최근 검사 기준');
    const score = asset.score == null ? '점수 확인 전' : `점수 ${asset.score}${asset.findings != null ? ` · 발견 ${asset.findings}개` : ''}`;
    const actionText = asset.risk.key === 'critical' ? '우선 확인하기' : (asset.risk.key === 'warning' ? '수정 방향 보기' : '다시 진단');
    return `<article class="portal-dashboard-asset"><div class="portal-dashboard-asset-head"><div><h3>${escapeHtml(asset.label || asset.domain)}</h3><p class="domain">${escapeHtml(asset.domain || '-')}</p></div><span class="chip">${escapeHtml(asset.risk.label)}</span></div><p class="meta">${escapeHtml(meta)} · ${escapeHtml(score)}</p><p class="meta">${escapeHtml(asset.domain || '선택 사이트')}의 고지, 환불, 개인정보 안내 상태를 한눈에 확인할 수 있습니다.</p><div class="portal-dashboard-asset-actions"><a class="btn primary" href="${escapeAttr(reportHref)}">기본 리포트 바로 보기</a><a class="btn secondary" href="${escapeAttr(reportHref)}">요약표 보기</a><a class="btn secondary" href="${escapeAttr(secondaryHref)}">${escapeHtml(actionText)}</a></div></article>`;
  }).join('');
}
function updateDashboardSummary(assets = []) {
  const total = assets.length;
  const critical = assets.filter(item => item.risk?.key === 'critical').length;
  const warning = assets.filter(item => item.risk?.key === 'warning').length;
  const compliant = assets.filter(item => item.risk?.key === 'safe').length;
  const findings = assets.reduce((sum, item) => sum + (Number(item.findings) || 0), 0);
  if (dashboardTotalSites) dashboardTotalSites.textContent = `${total}개`;
  if (dashboardCriticalIssues) dashboardCriticalIssues.textContent = `${critical}개`;
  if (portalWarningIssues) portalWarningIssues.textContent = `${warning}개`;
  if (dashboardCompliantSites) dashboardCompliantSites.textContent = `${compliant}개`;
  if (portalIssueCount) portalIssueCount.textContent = `${findings}개`;
  renderDashboardAssets(assets);
}
function nextActionFromScan(scan = {}) {
  const score = Number(scan?.riskScore);
  const findings = findCountFromScan(scan);
  if (!Number.isFinite(score)) return { title: '새 진단 시작', note: '최근 결과가 없으므로 먼저 검사하세요.' };
  if (score >= 75 || findings >= 6) return { title: '핵심 문구 먼저 보완', note: '결제·문의 직전 안내를 우선 확인하는 편이 좋습니다.' };
  if (score >= 55 || findings >= 3) return { title: '상세 리포트 확인', note: '보완 우선순위와 수정 방향을 함께 확인하세요.' };
  return { title: '재검사로 유지 확인', note: '현재 구조를 유지하면서 새 공백이 생기지 않는지 확인하세요.' };
}
function renderScoreSummary(latest, account, summary) {
  const target = readableDomain(latest?.target || summary?.site?.domain || '');
  const findings = findCountFromScan(latest);
  const urgent = urgentCountFromScan(latest);
  const nextAction = nextActionFromScan(latest);
  const cards = [
    { label: '최근 검사 대상', value: target || '검사 전', note: target ? '마지막 실행 기준' : '저장 후 다시 확인 가능' },
    { label: '발견 항목', value: `${findings}개`, note: '최근 검사 기준' },
    { label: '우선 보완', value: `${urgent}개`, note: 'P0·P1 또는 상위 발견' },
    { label: '다음 단계', value: nextAction.title, note: nextAction.note }
  ];
  const metrics = [
    { label: '저장 사이트', value: `${account?.savedSites?.length || 0}개`, note: '계정 기준' },
    { label: '최근 검사', value: `${account?.recentScans?.length || 0}개`, note: '최근 5개 기준' },
    { label: '검토 필요', value: `${findings}개`, note: '최근 검사 발견' }
  ];
  if (scoreBars) scoreBars.innerHTML = cards.map(item => `<article class="nv74-score-chip"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b><small>${escapeHtml(item.note)}</small></article>`).join('');
  if (scoreMetrics) scoreMetrics.innerHTML = metrics.map(item => `<article><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b><small>${escapeHtml(item.note)}</small></article>`).join('');
  if (portalSummaryDomain) portalSummaryDomain.textContent = target || '검사 전';
  if (portalActionRequiredCount) portalActionRequiredCount.textContent = `${urgent}개`;
  if (portalPriorityCount) portalPriorityCount.textContent = `${urgent ? Math.max(1, Math.ceil(urgent / 2)) : 0}개`;
  if (portalContentStatus) portalContentStatus.textContent = nextAction.title;
  if (portalLatestScanAt) portalLatestScanAt.textContent = formatDate(latest?.createdAt || latest?.generatedAt);
  if (portalIssueCount) portalIssueCount.textContent = `${findings}개`;
  if (scoreDesc) {
    scoreDesc.textContent = Number.isFinite(Number(latest?.riskScore))
      ? `${findings ? `최근 검사에서 ${findings}개 항목이 확인되었습니다.` : '최근 검사에서 즉시 보완할 항목은 적었습니다.'} ${nextAction.note}`
      : '진단을 실행하면 최근 점수와 보완 우선순위가 이곳에 확인됩니다.';
  }
  applyScoreInfographic(latest, findings, urgent);
}

function renderNextActionCards(latest, account, summary) {
  if (!nextActionCards) return;
  const target = readableDomain(latest?.target || summary?.site?.domain || '');
  const findings = findCountFromScan(latest);
  const urgent = urgentCountFromScan(latest);
  const nextAction = nextActionFromScan(latest);
  const sitesCount = account?.savedSites?.length || 0;
  const recentCount = account?.recentScans?.length || (latest ? 1 : 0);
  const recentLabel = latest ? `${formatDate(latest.createdAt || latest.generatedAt)} · 발견 ${findings}개` : '검사 이력 없음';
  const targetParam = latest?.target ? `?target=${encodeURIComponent(latest.target)}` : '';
  const siteIdParam = latest?.siteId ? `?siteId=${encodeURIComponent(latest.siteId)}` : '';
  const cards = [
    {
      no: '01',
      title: '최근 진단',
      pill: recentLabel,
      body: target ? `${target} 기준으로 ${nextAction.note}` : '진단을 실행하면 최근 점수와 발견 항목이 이곳에 표시됩니다.',
      href: `/products/veridion/demo${targetParam}`,
      cta: latest ? '다시 진단' : '새 진단 시작'
    },
    {
      no: '02',
      title: '우선 보완 항목',
      pill: `${urgent}개`,
      body: urgent ? `우선 처리할 보완 후보가 ${urgent}개 있습니다. 상세 리포트에서 수정 방향을 확인하세요.` : '최근 결과 기준으로 긴급 보완 항목은 적습니다.',
      href: `/plans${siteIdParam}`,
      cta: '상세 리포트 보기'
    },
    {
      no: '03',
      title: '저장 사이트 관리',
      pill: `${sitesCount}개`,
      body: sitesCount ? '저장한 URL을 재검사하고 최근 결과와 비교해 관리합니다.' : '자주 점검할 URL을 저장하면 다음부터 빠르게 재검사할 수 있습니다.',
      href: sitesCount ? '#portalPrimary' : '#saveSiteForm',
      cta: sitesCount ? '사이트 관리' : '사이트 등록'
    },
    {
      no: '04',
      title: '성과 모니터링',
      pill: `${recentCount}건`,
      body: recentCount ? '진단 기록과 개선 추이를 한눈에 확인하고 다음 작업을 확인합니다.' : '검사 기록이 쌓이면 개선 추이를 카드에서 바로 확인할 수 있습니다.',
      href: '#portalPrimary',
      cta: '성과 확인'
    }
  ];
  nextActionCards.innerHTML = cards.map(item => `<article class="nv191-action-card"><div class="nv191-action-icon">${escapeHtml(item.no)}</div><div class="nv191-action-body"><div class="nv191-action-head"><h2>${escapeHtml(item.title)}</h2><span class="nv191-pill">${escapeHtml(item.pill)}</span></div><p>${escapeHtml(item.body)}</p><a class="btn secondary" href="${escapeAttr(item.href)}">${escapeHtml(item.cta)}</a></div></article>`).join('');
}
function publicBoardItems(items = []) {
  const seen = new Set();
  return (items || []).filter(Boolean).filter((item) => {
    const key = `${item.id || ''}:${item.title || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function isCtaOrColumn(item = {}) {
  const haystack = [item.type, item.boardType, item.boardPurpose, item.engine, item.category, item.source].join(' ');
  return item.autoPublished || /cta|column|public-column|칼럼|진단|리스크/i.test(haystack);
}
function renderPublishStatus(boardApi = {}) {
  const cadence = boardApi?.publicationCadence || {};
  const posts = publicBoardItems(boardApi?.posts || []);
  const latest = posts[0] || null;
  const interval = Number(cadence.intervalMinutes || 20);
  const cadenceLabel = cadence.label || `${interval}분에 1회 발행`;
  const latestAt = latest?.publishedAt || latest?.createdAt || null;
  const latestMs = latestAt ? Date.parse(latestAt) : NaN;
  const isStale = Number.isFinite(latestMs) ? (Date.now() - latestMs > interval * 60000 * 1.35) : true;
  const sourceLabel = cadence.dataSource === 'engine-emergency-fallback' ? '대체 생성 중' : '정상 연결';
  const stateLabel = cadence.actualPublishing === false ? '비활성' : (isStale ? '발행 확인 필요' : '정상 작동');
  if (portalPublishCadence) portalPublishCadence.textContent = cadenceLabel;
  if (portalLastPublishedAt) portalLastPublishedAt.textContent = latestAt ? formatDate(latestAt) : '발행 대기';
  if (portalPublishState) portalPublishState.textContent = stateLabel;
  return `<section class="portal-publish-status-card" aria-label="인사이트 발행 상태"><div class="meta-row"><strong>인사이트 발행 상태</strong><span class="pill brand">${escapeHtml(sourceLabel)}</span></div><div class="status-grid"><article><span>발행 주기</span><b>${escapeHtml(cadenceLabel)}</b></article><article><span>최근 발행</span><b>${escapeHtml(latestAt ? formatDate(latestAt) : '발행 대기')}</b></article><article><span>현재 상태</span><b>${escapeHtml(stateLabel)}</b></article><article><span>표시 글 수</span><b>${escapeHtml(posts.length)}건</b></article></div><p class="muted">최근 발행 시간이 주기를 넘기면 발행 확인 필요 상태로 표시됩니다.</p></section>`;
}
function renderBoardHighlights(items = []) {
  const rows = publicBoardItems(items).filter(isCtaOrColumn).slice(0, 3);
  if (!rows.length) return '<div class="portal-feed-empty"><strong>인사이트 연결 글 없음</strong><p>자동 발행 인사이트가 생성되면 이 영역에 최근 연결 글이 표시됩니다.</p></div>';
  return rows.map(item => {
    const tags = Array.isArray(item.tags || item.hashtags) ? (item.tags || item.hashtags).slice(0, 5) : [];
    return `<article class="portal-feed-highlight result-card stack"><div class="meta-row"><strong>${escapeHtml(item.title || '인사이트 칼럼')}</strong><span class="pill">진단 연결</span></div><div class="portal-feed-meta"><span>${escapeHtml(formatDate(item.publishedAt || item.createdAt || '-'))}</span><span>${escapeHtml(item.category || item.boardType || '칼럼')}</span></div><p>${escapeHtml(clampText(item.summary || item.body || '', 170))}</p>${tags.length ? `<div class="asset-tags">${tags.map(tag => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('')}</div>` : ''}<div class="topnav"><a class="btn secondary" href="/board">인사이트에서 보기</a><a class="btn secondary" href="/products/veridion/demo">무료 진단</a></div></article>`;
  }).join('');
}
function renderInsightFeed(items = []) {
  const rows = publicBoardItems(items).slice(0, 4);
  if (!rows.length) return '<div class="portal-feed-empty"><strong>표시할 인사이트가 없습니다.</strong><p>자동 발행이 완료되면 최근 인사이트 목록이 채워집니다.</p></div>';
  return rows.map(item => `<article class="portal-feed-item result-card"><div class="meta-row"><strong>${escapeHtml(item.title || '인사이트')}</strong><span class="pill">${escapeHtml(item.category || item.boardType || '칼럼')}</span></div><div class="portal-feed-meta"><span>${escapeHtml(formatDate(item.publishedAt || item.createdAt || '-'))}</span><span>${escapeHtml(item.autoPublished ? '자동 발행' : '수동 발행')}</span></div><p>${escapeHtml(clampText(item.summary || item.body || '', 130))}</p><a class="portal-inline-link" href="/board">자세히 보기 →</a></article>`).join('');
}
function renderAsset(asset, order, accessToken) {
  if (!asset) return '';
  const downloadUrl = order?.id && asset.downloadable !== false ? `/api/public/fulfillment-download?orderId=${encodeURIComponent(order.id)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}` : '';
  const titleCandidates = renderList(asset.titleCandidates || [], '', item => `<li>${escapeHtml(item)}</li>`);
  const executive = asset.executiveBrief ? `<section class="asset-section asset-executive"><h3>핵심 요약</h3><div class="asset-kpi-grid"><article><span>보완 후보 점수</span><b>${escapeHtml(asset.executiveBrief.riskScore ?? '-')} / 100</b></article><article><span>상태</span><b>${escapeHtml(asset.executiveBrief.riskLevel || '확인 필요')}</b></article><article><span>구성 가치</span><b>${escapeHtml(asset.valueStatement || '확인 필요')}</b></article></div><p>${escapeHtml(asset.executiveBrief.purpose || '')}</p></section>` : '';
  const sections = renderList(asset.sections || [], '', item => `<section class="asset-section"><h3>${escapeHtml(item.title)}</h3>${item.objective ? `<p class="muted"><b>목적</b> · ${escapeHtml(item.objective)}</p>` : ''}<pre class="pre-wrap asset-body">${escapeHtml(item.body || '')}</pre>${(item.actionItems || []).length ? `<div class="asset-mini-block"><b>실행 항목</b><ul>${renderList(item.actionItems, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}${(item.acceptanceCriteria || []).length ? `<div class="asset-mini-block"><b>수용 기준</b><ul>${renderList(item.acceptanceCriteria, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}</section>`);
  const fixes = renderList(asset.fixes || [], '', item => `<section class="asset-section asset-fix"><div class="meta-row"><h3>${escapeHtml(item.title)}</h3><span class="pill ${item.priority === 'P0' ? 'gold' : ''}">${escapeHtml(item.priority || 'P2')}</span></div><div class="asset-before-after"><article><span>현재 상태</span><p>${escapeHtml(item.before || '')}</p></article><article><span>수정 문구/방향</span><p>${escapeHtml(item.after || '')}</p></article></div>${item.rationale ? `<p class="muted"><b>이유</b> · ${escapeHtml(item.rationale)}</p>` : ''}${(item.whereToApply || []).length ? `<div class="asset-mini-block"><b>적용 위치</b><ul>${renderList(item.whereToApply, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}${(item.acceptanceCriteria || []).length ? `<div class="asset-mini-block"><b>확인 기준</b><ul>${renderList(item.acceptanceCriteria, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}</section>`);
  const templates = renderList(asset.templates || [], '', item => `<section class="asset-section"><h3>${escapeHtml(item.title)}</h3>${item.purpose ? `<p class="muted"><b>목적</b> · ${escapeHtml(item.purpose)}</p>` : ''}<pre class="pre-wrap asset-body">${escapeHtml(item.content || '')}</pre>${item.usageNote ? `<p class="muted"><b>사용 전 확인</b> · ${escapeHtml(item.usageNote)}</p>` : ''}</section>`);
  const guide = asset.guide ? `<section class="asset-section"><h3>${escapeHtml(asset.guide.industry || '업종별')} 관리 가이드</h3>${asset.guide.purpose ? `<p>${escapeHtml(asset.guide.purpose)}</p>` : ''}<div class="asset-mini-block"><b>체크리스트</b><ul>${renderList(asset.guide.checklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>${(asset.guide.sop || []).length ? `<div class="asset-mini-block"><b>실행 SOP</b><ol>${renderList(asset.guide.sop, '', item => `<li>${escapeHtml(item)}</li>`)}</ol></div>` : ''}${(asset.guide.prohibitedExpressions || []).length ? `<div class="asset-mini-block"><b>금지 표현</b><p>${escapeHtml((asset.guide.prohibitedExpressions || []).join(' · '))}</p></div>` : ''}</section>` : '';
  const faqs = renderList(asset.faqs || [], '', item => `<details class="asset-faq"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`);
  const autoPublishing = asset.autoPublishingPlan ? `<section class="asset-section"><h3>콘텐츠 업데이트 콘텐츠 기준</h3><p>${escapeHtml(asset.autoPublishingPlan.purpose || '')}</p><div class="asset-mini-block"><b>필수 구조</b><ul>${renderList(asset.autoPublishingPlan.postStructure || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><p class="muted">권장 분량: ${escapeHtml(asset.autoPublishingPlan.lengthKo || '3,800~4,500자')}</p></section>` : '';
  const purposeOptimization = asset.purposeOptimization ? `<section class="asset-section asset-purpose-optimization"><h3>목적별 최적화</h3><div class="asset-maturity-grid"><article><span>상품 목적</span><b>${escapeHtml(asset.purposeOptimization.productIntent || asset.purposeOptimization.primaryIntent || '')}</b></article><article><span>대상 독자</span><b>${escapeHtml(asset.purposeOptimization.targetReader || '')}</b></article><article><span>사용 장면</span><b>${escapeHtml(asset.purposeOptimization.outputUseCase || '')}</b></article></div><div class="asset-mini-block"><b>최적화 기준</b><ul>${renderList(asset.purposeOptimization.optimizedFor || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><div class="asset-mini-block"><b>성공 기준</b><ul>${renderList(asset.purposeOptimization.successCriteria || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div></section>` : '';
  const deliverableIndex = (asset.deliverableIndex || []).length ? `<section class="asset-section"><h3>산출물 구성표</h3><div class="asset-index-grid">${(asset.deliverableIndex || []).map(item => `<article class="${item.included ? 'included' : 'not-included'}"><span>${escapeHtml(item.included ? '포함' : '범위 외')}</span><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.purpose || '')}</p><small>${escapeHtml(item.depth || '')}</small></article>`).join('')}</div></section>` : '';
  const conversionCopyPack = asset.conversionCopyPack ? `<section class="asset-section"><h3>전환 카피 팩</h3><div class="asset-mini-block"><b>제목 후보</b><ul>${renderList(asset.conversionCopyPack.heroTitles || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><p>${escapeHtml(asset.conversionCopyPack.opening || '')}</p><p class="muted"><b>문제 제기</b> · ${escapeHtml(asset.conversionCopyPack.problemStatement || '')}</p><div class="asset-tags">${(asset.conversionCopyPack.ctaButtons || []).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>` : '';
  const acceptanceChecklist = (asset.acceptanceChecklist || []).length ? `<section class="asset-section"><h3>수용 기준 체크리스트</h3><ol class="asset-checklist">${renderList(asset.acceptanceChecklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ol></section>` : '';
  const measurementPlan = (asset.measurementPlan || []).length ? `<section class="asset-section"><h3>재점검/성과 관찰 기준</h3><div class="asset-index-grid">${(asset.measurementPlan || []).map(item => `<article class="included"><span>${escapeHtml(item.metric)}</span><b>${escapeHtml(item.afterTarget || '')}</b><p>현재: ${escapeHtml(item.before || '')}</p><small>${escapeHtml(item.checkMethod || '')}</small></article>`).join('')}</div></section>` : '';
  const riskRegister = (asset.riskRegister || []).length ? `<section class="asset-section"><h3>보완 후보 관리표</h3><div class="asset-risk-grid">${(asset.riskRegister || []).map(item => `<article><b>${escapeHtml(item.risk)}</b><p>${escapeHtml(item.mitigation)}</p><small>담당: ${escapeHtml(item.owner || '확인 필요')}</small></article>`).join('')}</div></section>` : '';
  const stakeholderHandoff = asset.stakeholderHandoff ? `<section class="asset-section"><h3>담당자별 실행 메모</h3><div class="asset-handoff-grid">${Object.entries(asset.stakeholderHandoff || {}).map(([role, items]) => `<article><b>${escapeHtml(role)}</b><ul>${renderList(items || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></article>`).join('')}</div></section>` : '';
  const outputPerformanceProfile = asset.outputPerformanceProfile ? `<section class="asset-section"><h3>결과물 구성 프로필</h3><div class="asset-maturity-grid"><article><span>상세도</span><b>${escapeHtml(asset.outputPerformanceProfile.detailDepth || '')}</b></article><article><span>가치 기준</span><b>${escapeHtml(asset.outputPerformanceProfile.valueMultiple || '')}</b></article><article><span>렌더링</span><b>${escapeHtml((asset.outputPerformanceProfile.renderPerformance || []).join(' · '))}</b></article></div></section>` : '';

  const phase227DemoOverview = asset.demoIssueOverview ? `<section class="asset-section"><h3>무료 진단 요약</h3><div class="asset-kpi-grid"><article><span>문제 항목</span><b>${escapeHtml(asset.demoIssueOverview.totalIssueCount ?? 0)}</b></article><article><span>문제 영역</span><b>${escapeHtml(asset.demoIssueOverview.areaCount ?? 0)}</b></article><article><span>영향 요소</span><b>${escapeHtml(asset.demoIssueOverview.elementCount ?? 0)}</b></article></div><p class="muted">무료 진단은 문제 영역·요소·갯수만 보여주고, 전체 세부 근거는 유료 리포트에서 발행합니다.</p></section>` : '';
  const phase227PaidContract = asset.paidFullDetailContract ? `<section class="asset-section"><h3>상세 결과 확인 안내</h3><div class="asset-kpi-grid"><article><span>완성도</span><b>${escapeHtml(asset.paidFullDetailContract.completenessScore ?? 0)} / 100</b></article><article><span>상세 제공</span><b>${escapeHtml(asset.paidFullDetailContract.allDetailsVisible ? '제공 가능' : '보완 필요')}</b></article><article><span>상세 항목</span><b>${escapeHtml((asset.paidFullDetailContract.issueDetails || []).length)}</b></article></div><div class="asset-mini-block"><b>상세 문제 내용</b><ol>${renderList(asset.paidFullDetailContract.issueDetails || [], '', item => `<li><b>${escapeHtml(item.title || item.code || '점검 항목')}</b> — ${escapeHtml(item.recommendation || '권장 조치 확인')}</li>`)}</ol></div></section>` : '';
  const phase227OperationsDoc = asset.siteOperationsDocument ? `<section class="asset-section"><h3>${escapeHtml(asset.siteOperationsDocument.title || '사이트 맞춤 운영 지침 문서')}</h3><div class="asset-kpi-grid"><article><span>문서 품질</span><b>${escapeHtml(asset.siteOperationsDocument.qualityScore ?? 100)} / 100</b></article><article><span>문제 영역</span><b>${escapeHtml(asset.siteOperationsDocument.issueAreaCount ?? 0)}</b></article><article><span>영향 요소</span><b>${escapeHtml(asset.siteOperationsDocument.issueElementCount ?? 0)}</b></article></div><div class="asset-mini-block"><b>관리 절차</b><ol>${renderList(asset.siteOperationsDocument.sections || [], '', item => `<li><b>${escapeHtml(item.title || '관리 항목')}</b> — ${escapeHtml(item.body || item.objective || '')}</li>`)}</ol></div></section>` : '';
  const tags = (asset.tags || []).length ? `<div class="asset-tags">${(asset.tags || []).map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}</div>` : '';
  const badge = asset.badgeSnippet ? `<section class="asset-section"><h3>인증 마크 스니펫</h3><pre class="pre-wrap asset-body">${escapeHtml(asset.badgeSnippet)}</pre></section>` : '';
  const entitlement = asset.entitlement ? `<section class="asset-section"><h3>활성 권한</h3><ul class="result-list">${renderList(asset.entitlement.included || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></section>` : '';
  return `<div class="card stack asset-delivery"><div class="meta-row"><strong>${escapeHtml(asset.title || asset.productTitle || '구매 산출물')}</strong><span class="pill brand">${escapeHtml(asset.qualityContract?.outputLevel || asset.status || 'ready')}</span></div><div class="notice muted">${escapeHtml(asset.legalDisclaimer || '')}</div>${downloadUrl ? `<a class="btn secondary" href="${escapeAttr(downloadUrl)}">PDF 다운로드</a>` : ''}${titleCandidates ? `<section class="asset-section"><h3>제목 후보</h3><ol>${titleCandidates}</ol></section>` : ''}${executive}${phase227DemoOverview}${phase227PaidContract}${phase227OperationsDoc}${sections}${fixes}${templates}${guide}${entitlement}${purposeOptimization}${deliverableIndex}${conversionCopyPack}${acceptanceChecklist}${measurementPlan}${riskRegister}${stakeholderHandoff}${outputPerformanceProfile}${autoPublishing}${faqs ? `<section class="asset-section"><h3>FAQ</h3>${faqs}</section>` : ''}${badge}${tags}${asset.naturalCta ? `<section class="asset-section asset-final-cta"><h3>다음 행동</h3><p>${escapeHtml(asset.naturalCta)}</p></section>` : ''}</div>`;
}
function renderSavedSites(sites = []) {
  if (!sites.length) {
    return `<div class="portal-empty"><strong>아직 저장된 사이트가 없습니다.</strong><p>무료 진단을 실행하거나 아래 입력창에서 사이트를 저장하면 재검사와 최근 내역 관리가 시작됩니다.</p><a class="btn primary" href="/products/veridion/demo">무료 진단 시작</a></div>`;
  }
  const total = sites.length;
  const managed = sites.filter(site => site.latestRiskScore != null).length;
  const needScan = sites.filter(site => site.latestRiskScore == null).length;
  const cards = sites.map(site => {
    const score = site.latestRiskScore == null ? '-' : String(site.latestRiskScore);
    const level = site.latestRiskLevel || '검사 전';
    const status = site.latestRiskScore == null ? '검사 필요' : '관리 중';
    return `<article class="portal-site-item"><div class="portal-site-item-head"><div><h3>${escapeHtml(site.label || site.domain)}</h3><p>${escapeHtml(site.domain || '-')} · ${escapeHtml(site.industry || '업종 미지정')}</p></div><div class="portal-site-score"><strong>${escapeHtml(score)}</strong><span>${escapeHtml(level)}</span></div></div><div class="portal-site-item-body"><div class="portal-site-data"><span>마지막 검사</span><b>${escapeHtml(formatDate(site.lastScanAt || site.updatedAt || site.createdAt))}</b></div><div class="portal-site-data"><span>관리 상태</span><b>${escapeHtml(status)}</b></div></div><div class="portal-site-actions"><button class="btn primary" data-rescan-site="${escapeAttr(site.siteId)}" type="button">다시 검사하기</button><a class="btn secondary" href="/products/veridion/demo?target=${escapeAttr(encodeURIComponent(site.domain || ''))}">진단하기</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(encodeURIComponent(site.siteId || ''))}">요금 안내 보기</a><button class="btn secondary" data-remove-site="${escapeAttr(site.siteId)}" type="button">삭제</button></div></article>`;
  }).join('');
  return `<div class="portal-site-summary"><article><span>저장 사이트</span><b>${escapeHtml(total)}개</b></article><article><span>관리 중</span><b>${escapeHtml(managed)}개</b></article><article><span>검사 필요</span><b>${escapeHtml(needScan)}개</b></article></div><div class="portal-site-grid">${cards}</div>`;
}
function reportRiskCopy(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '확인 필요';
  if (n >= 75) return '즉시 보완 필요';
  if (n >= 55) return '일부 운영 보완 후보 존재';
  return '비교적 안정적';
}
function scoreUiState(score, findings = 0, urgent = 0) {
  const n = Number(score);
  if (!Number.isFinite(n)) {
    return {
      key: 'empty',
      label: '검사 전',
      pillClass: '',
      bannerClass: '',
      bannerTitle: '최근 진단 결과를 아직 불러오지 못했습니다.',
      bannerDetail: '새 진단을 시작하면 점수와 보완 우선순위를 한 화면에서 확인할 수 있습니다.',
      meterCaption: '최근 점수 기반 상태'
    };
  }
  if (n >= 75 || findings >= 6 || urgent >= 3) {
    return {
      key: 'critical',
      label: '높음',
      pillClass: 'is-critical',
      bannerClass: 'state-critical',
      bannerTitle: '즉시 보완이 필요한 상태입니다.',
      bannerDetail: '결제·문의·개인정보 안내처럼 핵심 신뢰 구간을 먼저 수정하는 편이 좋습니다.',
      meterCaption: '우선순위 보완이 필요한 상태'
    };
  }
  if (n >= 55 || findings >= 3 || urgent >= 1) {
    return {
      key: 'warning',
      label: '주의',
      pillClass: 'is-warning',
      bannerClass: 'state-warning',
      bannerTitle: '중요 보완 후보가 확인되었습니다.',
      bannerDetail: '급한 항목부터 순서대로 정리하면 전체 구조의 신뢰도를 더 빠르게 끌어올릴 수 있습니다.',
      meterCaption: '관리와 추가 점검이 필요한 상태'
    };
  }
  return {
    key: 'safe',
    label: '낮음',
    pillClass: 'is-safe',
    bannerClass: 'state-safe',
    bannerTitle: '현재 상태는 양호합니다.',
    bannerDetail: '정기적인 관리로 안정적인 구조를 유지하면서 신규 공백이 생기지 않는지 확인하세요.',
    meterCaption: '안정적으로 유지 중인 상태'
  };
}
function applyScoreInfographic(scan, findings = 0, urgent = 0) {
  const score = Number(scan?.riskScore);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const ui = scoreUiState(score, findings, urgent);
  if (portalRiskGauge) portalRiskGauge.style.setProperty('--gauge', `${Math.round(safeScore * 3.6)}deg`);
  if (portalRiskMeterFill) portalRiskMeterFill.style.width = `${safeScore}%`;
  if (portalRiskLabelText) portalRiskLabelText.textContent = ui.label;
  if (portalRiskMeterCaption) portalRiskMeterCaption.textContent = ui.meterCaption;
  if (scoreStatus) {
    scoreStatus.textContent = scan?.riskLevel || ui.label;
    scoreStatus.classList.remove('is-safe','is-warning','is-critical');
    if (ui.pillClass) scoreStatus.classList.add(ui.pillClass);
  }
  if (portalStatusBanner) {
    portalStatusBanner.classList.remove('state-safe','state-warning','state-critical');
    if (ui.bannerClass) portalStatusBanner.classList.add(ui.bannerClass);
  }
  if (portalStatusSummary) portalStatusSummary.textContent = ui.bannerTitle;
  if (portalStatusDetail) portalStatusDetail.textContent = ui.bannerDetail;
}
function reportProjectedScore(score, issueCount = 0) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(n, Math.min(95, n + Math.max(8, Math.min(18, Number(issueCount || 0) * 3 + 6))));
}
function reportBars(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '확인 필요';
  const filled = Math.max(1, Math.min(10, Math.round(n / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
function renderPaidPortalDiagnosisReport(scan) {
  if (!scan) return '';
  const findings = Array.isArray(scan.detailFindings) ? scan.detailFindings.slice(0, 4) : [];
  const checks = ['개인정보 안내','구매·환불 안내','사이트 관리 구조','보안 안내'].map((label, index) => ({ label, score: Math.max(25, Math.min(95, Number(scan.riskScore || 0) - index * 7)) }));
  const projected = reportProjectedScore(scan.riskScore, findings.length);
  const riskCopy = reportRiskCopy(scan.riskScore);
  return `<div class="card stack portal-report-example portal-report-clean portal-unified-report"><div class="meta-row"><strong>URL 신뢰도 진단 결과</strong><span class="pill brand">실제 검사 결과</span></div><div class="portal-unified-top"><article class="portal-unified-score"><span>신뢰도 점수</span><strong>${escapeHtml(scan.riskScore ?? '-')}<em>/100</em></strong><small>${escapeHtml(riskCopy)}</small></article><article class="portal-unified-kpi"><span>개선 목표 점수</span><b>${escapeHtml(projected ?? '확인 필요')}</b><small>우선순위 항목 반영 기준</small></article><article class="portal-unified-kpi warn"><span>즉시 확인 필요</span><b>${escapeHtml(findings.length)}</b><small>상세 리포트에서 확인</small></article></div><div class="portal-unified-grid"><section class="portal-unified-box danger"><h4>핵심 문제</h4>${renderList(findings, '<p class="muted">세부 발견 항목 없음</p>', item => `<article><b>${escapeHtml(item.title || item.code || '점검 항목')}</b><small>${escapeHtml(item.recommendation || item.fixTemplate || '수정 방향 확인 필요')}</small></article>`)}</section><section class="portal-unified-box"><h4>항목별 분석</h4>${checks.map(item => `<article><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.score)}점 · ${escapeHtml(reportBars(item.score))}</small></article>`).join('')}</section></div><div class="portal-report-cta-row"><a class="btn primary" href="/checkout?plan=Expert&siteId=${escapeAttr(scan.siteId || '')}">전문가 리포트 보기</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(scan.siteId || '')}">요금 안내</a><a class="btn secondary" href="/products/veridion/demo?target=${escapeAttr(encodeURIComponent(scan.target || ''))}">다시 진단</a></div><p class="muted">점수와 개선 목표는 진단 기준이며 실제 법적 안전성이나 성과를 보장하지 않습니다.</p></div>`;
}
function renderRecentScans(scans = []) {
  if (!scans.length) return '<div class="portal-empty"><strong>지난 검사 내역이 없습니다.</strong><p>검사를 완료하면 최근 5개 결과가 이곳에 저장됩니다.</p></div>';
  return `<div class="card stack"><div class="meta-row"><strong>지난 검사 내역 5개</strong><a class="btn secondary" href="/products/veridion/demo">새 검사</a></div>${scans.map(scan => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(scan.target || '저장 사이트')}</strong><span class="pill">${escapeHtml(scan.riskLevel || '검사 완료')}</span></div><p class="muted">${escapeHtml(formatDate(scan.createdAt || scan.generatedAt))} · 점수 ${escapeHtml(scan.riskScore ?? '-')} · 발견 ${escapeHtml(scan.totalFindings ?? '-')}개</p><div class="topnav"><button class="btn primary" data-rescan-site="${escapeAttr(scan.siteId || '')}" data-rescan-domain="${escapeAttr(scan.target || '')}" type="button">다시 검사하기</button><a class="btn secondary" href="/checkout?plan=Report&siteId=${escapeAttr(scan.siteId || '')}">전문가 리포트 보기</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(scan.siteId || '')}">요금 안내 보기</a></div></div>`).join('')}</div>`;
}

function renderGuestScan(scan) {
  if (!scan) return '<div class="portal-empty"><strong>최근 진단 기록이 없습니다.</strong><p>무료 진단을 실행하면 이 브라우저의 내 사이트 메뉴에 최근 확인 기록이 저장됩니다.</p><a class="btn primary" href="/products/veridion/demo">무료 진단 시작</a></div>';
  const siteId = scan.siteId || '';
  const target = scan.target || scan.domain || '';
  const findings = scan.totalFindings ?? findCountFromScan(scan);
  return `<div class="card stack guest-history-card"><div class="meta-row"><strong>최근 확인 기록</strong><span class="pill">브라우저에 저장된 기록</span></div><div class="result-card"><div class="meta-row"><strong>${escapeHtml(target || '최근 진단 사이트')}</strong><span class="pill">${escapeHtml(scan.riskLevel || '검사 완료')}</span></div><p class="muted">${escapeHtml(formatDate(scan.createdAt || scan.generatedAt))} · 점수 ${escapeHtml(scan.riskScore ?? '-')} · 발견 ${escapeHtml(findings ?? '-')}개</p><p>${escapeHtml(clampText(scan.summary || scan.diagnosis?.summary || '최근 진단 결과를 내 사이트 메뉴에서 다시 확인할 수 있습니다.', 180))}</p><div class="topnav"><a class="btn primary" href="/checkout?plan=Report${siteId ? `&siteId=${escapeAttr(siteId)}` : ''}">기본 리포트 보기</a><a class="btn secondary" href="/plans${siteId ? `?siteId=${escapeAttr(siteId)}` : ''}">요금 안내 보기</a><a class="btn secondary" href="/products/veridion/demo${target ? `?target=${escapeAttr(encodeURIComponent(target))}` : ''}">다시 진단</a></div></div></div>`;
}

function renderMemberValueBox(session, account) {
  if (!session?.authenticated) {
    return `<div class="card stack"><strong>회원가입하면 바로 쓸 수 있는 기능</strong><ul class="result-list"><li>내 사이트 저장</li><li>클릭 한 번으로 다시 검사</li><li>지난 검사 내역 5개 확인</li><li>검사 결과 자동 저장</li></ul><a class="btn primary" href="/auth?next=/portal">무료로 검사 결과 저장하기</a></div>`;
  }
  return `<div class="card stack"><strong>회원 전용 기능 활성화됨</strong><p class="muted">로그인 계정으로 사이트 저장, 원클릭 재검사, 최근 내역 관리가 가능합니다.</p></div>`;
}
function updateStaticDashboard(session, account, summary) {
  const authenticated = !!session?.authenticated;
  const saved = getSavedScan();
  const latest = latestScanFrom(account, summary) || saved;
  const sitesCount = account?.savedSites?.length || 0;
  const dashboardAssets = collectDashboardAssets(account, summary, saved);
  updateDashboardSummary(dashboardAssets);
  if (portalAccountState) portalAccountState.textContent = authenticated ? '로그인 계정으로 연결됨' : '비회원 · 최근 확인 기록';
  if (portalShellProfileState) portalShellProfileState.textContent = authenticated ? `저장 사이트 ${sitesCount}개 · 최근 검사 ${account?.recentScans?.length || 0}개` : '로그인 후 저장 사이트와 최근 진단을 이어서 확인하세요.';
  if (planCard) planCard.innerHTML = `<div><b>${authenticated ? '회원 전용 관리' : '무료 계정 필요'}</b><small><span>사이트 ${sitesCount}개</span><span>최근 검사 ${account?.recentScans?.length || 0}개</span></small></div><a class="btn secondary" href="${authenticated ? '/plans' : '/auth?next=/portal'}">${authenticated ? '상품 보기' : '로그인·회원가입'}</a>`;
  if (topbarTitle) topbarTitle.textContent = '내 사이트 다음 조치';
  if (topbarCopy) topbarCopy.textContent = authenticated ? '저장한 사이트를 다시 검사하고 최근 결과를 한곳에서 확인하세요.' : '비회원도 이 브라우저의 최근 확인 기록을 볼 수 있고, 회원가입하면 계정에 저장됩니다.';
  if (scoreNumber) scoreNumber.textContent = latest?.riskScore ?? '-';
  if (scoreStatus) scoreStatus.textContent = latest?.riskLevel || '검사 전';
  if (scoreFooter) scoreFooter.textContent = `최근 진단일: ${formatDate(latest?.createdAt || latest?.generatedAt)}`;
  renderScoreSummary(latest, account, summary);
  renderNextActionCards(latest, account, summary);
  if (workCard) workCard.innerHTML = `<div class="portal-card-head"><div><p class="portal-card-kicker">SHORTCUT</p><h2 id="portalQuickTitle">빠른 실행</h2></div></div><div class="portal-quick-grid"><a href="/products/veridion/demo"><i>⌕</i><span>새 진단</span></a><a href="#saveSiteForm"><i>＋</i><span>사이트 저장</span></a><a href="/products/veridion/demo"><i>↻</i><span>재진단</span></a><a href="#portalPrimary"><i>▤</i><span>리포트 보기</span></a><a href="#portalFeedTitle"><i>◇</i><span>인사이트</span></a><a href="/keywords"><i>▥</i><span>키워드</span></a><a href="/compare"><i>≋</i><span>비교 분석</span></a><a href="/auth"><i>⚙</i><span>설정</span></a></div>`
}

saveForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveState.textContent = '사이트를 저장하는 중입니다...';
  try {
    await jsonFetch('/api/public/account/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: document.getElementById('saveUrl').value, label: document.getElementById('saveName').value, memo: document.getElementById('saveMemo').value }) });
    saveState.textContent = '저장했습니다. 다음부터 클릭 한 번으로 다시 검사할 수 있습니다.';
    saveForm.reset();
    await loadPortal();
  } catch (error) {
    const message = error.message || '사이트를 저장하지 못했습니다.';
    if (/로그인/.test(message)) saveState.innerHTML = `${escapeHtml(message)} <a href="/auth?next=/portal">로그인·회원가입</a>`;
    else saveState.textContent = message;
  }
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

