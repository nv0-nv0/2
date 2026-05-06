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
const scoreDesc = document.querySelector('.nv74-score-desc');
const scoreBars = document.getElementById('portalScoreBars');
const scoreMetrics = document.getElementById('portalScoreMetrics');
const nextActionCards = document.getElementById('portalNextActions');

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
function nextActionFromScan(scan = {}) {
  const score = Number(scan?.riskScore);
  const findings = findCountFromScan(scan);
  if (!Number.isFinite(score)) return { title: '새 진단 시작', note: '최근 결과가 없으므로 먼저 검사하세요.' };
  if (score <= 39 || findings >= 6) return { title: '핵심 문구 먼저 보완', note: '결제·문의 직전 안내를 우선 정리하는 편이 좋습니다.' };
  if (score <= 69 || findings >= 3) return { title: '상세 리포트 확인', note: '보완 우선순위와 수정 방향을 함께 확인하세요.' };
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
  if (scoreDesc) {
    scoreDesc.textContent = Number.isFinite(Number(latest?.riskScore))
      ? `${findings ? `최근 검사에서 ${findings}개 항목이 확인되었습니다.` : '최근 검사에서 즉시 보완할 항목은 적었습니다.'} ${nextAction.note}`
      : '진단을 실행하면 최근 점수와 보완 우선순위가 이곳에 정리됩니다.';
  }
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
      body: recentCount ? '진단 기록과 개선 추이를 한눈에 확인하고 다음 작업을 정리합니다.' : '검사 기록이 쌓이면 개선 추이를 카드에서 바로 확인할 수 있습니다.',
      href: '#portalPrimary',
      cta: '성과 확인'
    }
  ];
  nextActionCards.innerHTML = cards.map(item => `<article class="nv191-action-card"><div class="nv191-action-icon">${escapeHtml(item.no)}</div><div class="nv191-action-body"><div class="nv191-action-head"><h2>${escapeHtml(item.title)}</h2><span class="nv191-pill">${escapeHtml(item.pill)}</span></div><p>${escapeHtml(item.body)}</p><a class="btn secondary" href="${escapeAttr(item.href)}">${escapeHtml(item.cta)}</a></div></article>`).join('');
}
function renderBoardHighlights(boards = []) {
  const items = (boards || []).filter(item => item && (item.boardType === 'cta' || item.autoPublished || item.type === 'cta')).slice(0, 3);
  if (!items.length) return '<div class="muted">게시판 연결 글 없음</div>';
  return items.map(item => {
    const tags = Array.isArray(item.tags) ? item.tags.slice(0, 5) : [];
    return `<div class="result-card stack"><div class="meta-row"><strong>${escapeHtml(item.title || '게시글')}</strong><span class="pill">진단 연결</span></div><div class="muted">${escapeHtml(formatDate(item.createdAt || '-'))}</div><p>${escapeHtml(clampText(item.summary || item.body || '', 170))}</p>${tags.length ? `<div class="asset-tags">${tags.map(tag => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('')}</div>` : ''}<div class="topnav"><a class="btn secondary" href="/board">보드에서 보기</a><a class="btn secondary" href="/products/veridion/demo">무료 진단</a></div></div>`;
  }).join('');
}
function renderInsightFeed(boards = []) {
  const items = (boards || []).filter(item => item && item.boardType !== 'cta').slice(0, 4);
  if (!items.length) return '<div class="muted">공지 없음</div>';
  return items.map(item => `<div class="result-card"><div>${escapeHtml(item.title || '공지')}</div><div class="muted">${escapeHtml(formatDate(item.createdAt || '-'))}</div><p>${escapeHtml(clampText(item.summary || item.body || '', 120))}</p></div>`).join('');
}
function renderAsset(asset, order, accessToken) {
  if (!asset) return '';
  const downloadUrl = order?.id && asset.downloadable !== false ? `/api/public/fulfillment-download?orderId=${encodeURIComponent(order.id)}${accessToken ? `&accessToken=${encodeURIComponent(accessToken)}` : ''}` : '';
  const titleCandidates = renderList(asset.titleCandidates || [], '', item => `<li>${escapeHtml(item)}</li>`);
  const executive = asset.executiveBrief ? `<section class="asset-section asset-executive"><h3>핵심 요약</h3><div class="asset-kpi-grid"><article><span>보완 후보 점수</span><b>${escapeHtml(asset.executiveBrief.riskScore ?? '-')} / 100</b></article><article><span>상태</span><b>${escapeHtml(asset.executiveBrief.riskLevel || '확인 필요')}</b></article><article><span>구성 가치</span><b>${escapeHtml(asset.valueStatement || '확인 필요')}</b></article></div><p>${escapeHtml(asset.executiveBrief.purpose || '')}</p></section>` : '';
  const sections = renderList(asset.sections || [], '', item => `<section class="asset-section"><h3>${escapeHtml(item.title)}</h3>${item.objective ? `<p class="muted"><b>목적</b> · ${escapeHtml(item.objective)}</p>` : ''}<pre class="pre-wrap asset-body">${escapeHtml(item.body || '')}</pre>${(item.actionItems || []).length ? `<div class="asset-mini-block"><b>실행 항목</b><ul>${renderList(item.actionItems, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}${(item.acceptanceCriteria || []).length ? `<div class="asset-mini-block"><b>수용 기준</b><ul>${renderList(item.acceptanceCriteria, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}</section>`);
  const fixes = renderList(asset.fixes || [], '', item => `<section class="asset-section asset-fix"><div class="meta-row"><h3>${escapeHtml(item.title)}</h3><span class="pill ${item.priority === 'P0' ? 'gold' : ''}">${escapeHtml(item.priority || 'P2')}</span></div><div class="asset-before-after"><article><span>현재 상태</span><p>${escapeHtml(item.before || '')}</p></article><article><span>수정 문구/방향</span><p>${escapeHtml(item.after || '')}</p></article></div>${item.rationale ? `<p class="muted"><b>이유</b> · ${escapeHtml(item.rationale)}</p>` : ''}${(item.whereToApply || []).length ? `<div class="asset-mini-block"><b>적용 위치</b><ul>${renderList(item.whereToApply, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}${(item.acceptanceCriteria || []).length ? `<div class="asset-mini-block"><b>검수 기준</b><ul>${renderList(item.acceptanceCriteria, '', row => `<li>${escapeHtml(row)}</li>`)}</ul></div>` : ''}</section>`);
  const templates = renderList(asset.templates || [], '', item => `<section class="asset-section"><h3>${escapeHtml(item.title)}</h3>${item.purpose ? `<p class="muted"><b>목적</b> · ${escapeHtml(item.purpose)}</p>` : ''}<pre class="pre-wrap asset-body">${escapeHtml(item.content || '')}</pre>${item.usageNote ? `<p class="muted"><b>사용 전 확인</b> · ${escapeHtml(item.usageNote)}</p>` : ''}</section>`);
  const guide = asset.guide ? `<section class="asset-section"><h3>${escapeHtml(asset.guide.industry || '업종별')} 운영 가이드</h3>${asset.guide.purpose ? `<p>${escapeHtml(asset.guide.purpose)}</p>` : ''}<div class="asset-mini-block"><b>체크리스트</b><ul>${renderList(asset.guide.checklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div>${(asset.guide.sop || []).length ? `<div class="asset-mini-block"><b>실행 SOP</b><ol>${renderList(asset.guide.sop, '', item => `<li>${escapeHtml(item)}</li>`)}</ol></div>` : ''}${(asset.guide.prohibitedExpressions || []).length ? `<div class="asset-mini-block"><b>금지 표현</b><p>${escapeHtml((asset.guide.prohibitedExpressions || []).join(' · '))}</p></div>` : ''}</section>` : '';
  const faqs = renderList(asset.faqs || [], '', item => `<details class="asset-faq"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`);
  const autoPublishing = asset.autoPublishingPlan ? `<section class="asset-section"><h3>자동 발행 콘텐츠 기준</h3><p>${escapeHtml(asset.autoPublishingPlan.purpose || '')}</p><div class="asset-mini-block"><b>필수 구조</b><ul>${renderList(asset.autoPublishingPlan.postStructure || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><p class="muted">권장 분량: ${escapeHtml(asset.autoPublishingPlan.lengthKo || '3,800~4,500자')}</p></section>` : '';
  const purposeOptimization = asset.purposeOptimization ? `<section class="asset-section asset-purpose-optimization"><h3>목적별 최적화</h3><div class="asset-maturity-grid"><article><span>상품 목적</span><b>${escapeHtml(asset.purposeOptimization.productIntent || asset.purposeOptimization.primaryIntent || '')}</b></article><article><span>대상 독자</span><b>${escapeHtml(asset.purposeOptimization.targetReader || '')}</b></article><article><span>사용 장면</span><b>${escapeHtml(asset.purposeOptimization.outputUseCase || '')}</b></article></div><div class="asset-mini-block"><b>최적화 기준</b><ul>${renderList(asset.purposeOptimization.optimizedFor || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><div class="asset-mini-block"><b>성공 기준</b><ul>${renderList(asset.purposeOptimization.successCriteria || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div></section>` : '';
  const deliverableIndex = (asset.deliverableIndex || []).length ? `<section class="asset-section"><h3>산출물 구성표</h3><div class="asset-index-grid">${(asset.deliverableIndex || []).map(item => `<article class="${item.included ? 'included' : 'not-included'}"><span>${escapeHtml(item.included ? '포함' : '범위 외')}</span><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.purpose || '')}</p><small>${escapeHtml(item.depth || '')}</small></article>`).join('')}</div></section>` : '';
  const conversionCopyPack = asset.conversionCopyPack ? `<section class="asset-section"><h3>전환 카피 팩</h3><div class="asset-mini-block"><b>제목 후보</b><ul>${renderList(asset.conversionCopyPack.heroTitles || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></div><p>${escapeHtml(asset.conversionCopyPack.opening || '')}</p><p class="muted"><b>문제 제기</b> · ${escapeHtml(asset.conversionCopyPack.problemStatement || '')}</p><div class="asset-tags">${(asset.conversionCopyPack.ctaButtons || []).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>` : '';
  const acceptanceChecklist = (asset.acceptanceChecklist || []).length ? `<section class="asset-section"><h3>수용 기준 체크리스트</h3><ol class="asset-checklist">${renderList(asset.acceptanceChecklist || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ol></section>` : '';
  const measurementPlan = (asset.measurementPlan || []).length ? `<section class="asset-section"><h3>재점검/성과 관찰 기준</h3><div class="asset-index-grid">${(asset.measurementPlan || []).map(item => `<article class="included"><span>${escapeHtml(item.metric)}</span><b>${escapeHtml(item.afterTarget || '')}</b><p>현재: ${escapeHtml(item.before || '')}</p><small>${escapeHtml(item.checkMethod || '')}</small></article>`).join('')}</div></section>` : '';
  const riskRegister = (asset.riskRegister || []).length ? `<section class="asset-section"><h3>보완 후보 관리표</h3><div class="asset-risk-grid">${(asset.riskRegister || []).map(item => `<article><b>${escapeHtml(item.risk)}</b><p>${escapeHtml(item.mitigation)}</p><small>담당: ${escapeHtml(item.owner || '확인 필요')}</small></article>`).join('')}</div></section>` : '';
  const stakeholderHandoff = asset.stakeholderHandoff ? `<section class="asset-section"><h3>담당자별 실행 메모</h3><div class="asset-handoff-grid">${Object.entries(asset.stakeholderHandoff || {}).map(([role, items]) => `<article><b>${escapeHtml(role)}</b><ul>${renderList(items || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></article>`).join('')}</div></section>` : '';
  const outputPerformanceProfile = asset.outputPerformanceProfile ? `<section class="asset-section"><h3>품질·성능 프로파일</h3><div class="asset-maturity-grid"><article><span>상세도</span><b>${escapeHtml(asset.outputPerformanceProfile.detailDepth || '')}</b></article><article><span>가치 기준</span><b>${escapeHtml(asset.outputPerformanceProfile.valueMultiple || '')}</b></article><article><span>렌더링</span><b>${escapeHtml((asset.outputPerformanceProfile.renderPerformance || []).join(' · '))}</b></article></div></section>` : '';
  const tags = (asset.tags || []).length ? `<div class="asset-tags">${(asset.tags || []).map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}</div>` : '';
  const badge = asset.badgeSnippet ? `<section class="asset-section"><h3>인증 마크 스니펫</h3><pre class="pre-wrap asset-body">${escapeHtml(asset.badgeSnippet)}</pre></section>` : '';
  const entitlement = asset.entitlement ? `<section class="asset-section"><h3>활성 권한</h3><ul class="result-list">${renderList(asset.entitlement.included || [], '', item => `<li>${escapeHtml(item)}</li>`)}</ul></section>` : '';
  return `<div class="card stack asset-delivery"><div class="meta-row"><strong>${escapeHtml(asset.title || asset.productTitle || '구매 산출물')}</strong><span class="pill brand">${escapeHtml(asset.qualityContract?.outputLevel || asset.status || 'ready')}</span></div><div class="notice muted">${escapeHtml(asset.legalDisclaimer || '')}</div>${downloadUrl ? `<a class="btn secondary" href="${escapeAttr(downloadUrl)}">PDF 다운로드</a>` : ''}${titleCandidates ? `<section class="asset-section"><h3>제목 후보</h3><ol>${titleCandidates}</ol></section>` : ''}${executive}${sections}${fixes}${templates}${guide}${entitlement}${purposeOptimization}${deliverableIndex}${conversionCopyPack}${acceptanceChecklist}${measurementPlan}${riskRegister}${stakeholderHandoff}${outputPerformanceProfile}${autoPublishing}${faqs ? `<section class="asset-section"><h3>FAQ</h3>${faqs}</section>` : ''}${badge}${tags}${asset.naturalCta ? `<section class="asset-section asset-final-cta"><h3>다음 행동</h3><p>${escapeHtml(asset.naturalCta)}</p></section>` : ''}</div>`;
}
function renderSavedSites(sites = []) {
  if (!sites.length) {
    return `<div class="portal-empty"><strong>아직 저장된 사이트가 없습니다.</strong><p>무료진단을 실행하거나 아래 입력창에서 사이트를 저장하면 재검사와 최근 내역 관리가 시작됩니다.</p><a class="btn primary" href="/products/veridion/demo">무료진단 시작</a></div>`;
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
function reportRiskCopy(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '확인 필요';
  if (n >= 75) return '즉시 보완 필요';
  if (n >= 55) return '일부 운영 보완 후보 존재';
  return '비교적 안정적';
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
  const checks = ['개인정보 관리','전자상거래 정책','운영 관리 구조','보안 관리'].map((label, index) => ({ label, score: Math.max(25, Math.min(95, Number(scan.riskScore || 0) - index * 7)) }));
  const projected = reportProjectedScore(scan.riskScore, findings.length);
  const riskCopy = reportRiskCopy(scan.riskScore);
  return `<div class="card stack portal-report-example portal-report-clean portal-unified-report"><div class="meta-row"><strong>URL 신뢰도 진단 결과</strong><span class="pill brand">실제 검사 결과</span></div><div class="portal-unified-top"><article class="portal-unified-score"><span>신뢰도 점수</span><strong>${escapeHtml(scan.riskScore ?? '-')}<em>/100</em></strong><small>${escapeHtml(riskCopy)}</small></article><article class="portal-unified-kpi"><span>개선 목표 점수</span><b>${escapeHtml(projected ?? '확인 필요')}</b><small>우선순위 항목 반영 기준</small></article><article class="portal-unified-kpi warn"><span>즉시 확인 필요</span><b>${escapeHtml(findings.length)}</b><small>상세 리포트에서 확인</small></article></div><div class="portal-unified-grid"><section class="portal-unified-box danger"><h4>핵심 문제</h4>${renderList(findings, '<p class="muted">세부 발견 항목 없음</p>', item => `<article><b>${escapeHtml(item.title || item.code || '점검 항목')}</b><small>${escapeHtml(item.recommendation || item.fixTemplate || '수정 방향 확인 필요')}</small></article>`)}</section><section class="portal-unified-box"><h4>항목별 분석</h4>${checks.map(item => `<article><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.score)}점 · ${escapeHtml(reportBars(item.score))}</small></article>`).join('')}</section></div><div class="portal-report-cta-row"><a class="btn primary" href="/checkout?plan=Pro&siteId=${escapeAttr(scan.siteId || '')}">상세 리포트 결제</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(scan.siteId || '')}">플랜 비교</a><a class="btn secondary" href="/products/veridion/demo?target=${escapeAttr(encodeURIComponent(scan.target || ''))}">다시 진단</a></div><p class="muted">점수와 개선 목표는 내부 진단 모델 기준이며 실제 법적 안전성이나 성과를 보장하지 않습니다.</p></div>`;
}
function renderRecentScans(scans = []) {
  if (!scans.length) return '<div class="portal-empty"><strong>지난 검사 내역이 없습니다.</strong><p>검사를 완료하면 최근 5개 결과가 이곳에 저장됩니다.</p></div>';
  return `<div class="card stack"><div class="meta-row"><strong>지난 검사 내역 5개</strong><a class="btn secondary" href="/products/veridion/demo">새 검사</a></div>${scans.map(scan => `<div class="result-card"><div class="meta-row"><strong>${escapeHtml(scan.target || '저장 사이트')}</strong><span class="pill">${escapeHtml(scan.riskLevel || '검사 완료')}</span></div><p class="muted">${escapeHtml(formatDate(scan.createdAt || scan.generatedAt))} · 점수 ${escapeHtml(scan.riskScore ?? '-')} · 발견 ${escapeHtml(scan.totalFindings ?? '-')}개</p><div class="topnav"><button class="btn primary" data-rescan-site="${escapeAttr(scan.siteId || '')}" data-rescan-domain="${escapeAttr(scan.target || '')}" type="button">다시 검사하기</button><a class="btn secondary" href="/checkout?plan=Report&siteId=${escapeAttr(scan.siteId || '')}">상세 리포트 결제</a><a class="btn secondary" href="/plans?siteId=${escapeAttr(scan.siteId || '')}">상품 비교</a></div></div>`).join('')}</div>`;
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
  if (topbarTitle) topbarTitle.textContent = '내 사이트 다음 조치';
  if (topbarCopy) topbarCopy.textContent = authenticated ? '저장한 사이트를 다시 검사하고 최근 결과를 한곳에서 확인하세요.' : '회원가입하면 내 사이트 저장, 원클릭 재검사, 지난 검사 내역 확인을 사용할 수 있습니다.';
  if (scoreNumber) scoreNumber.textContent = latest?.riskScore ?? '-';
  if (scoreStatus) scoreStatus.textContent = latest?.riskLevel || '검사 전';
  if (scoreFooter) scoreFooter.textContent = `최근 진단일: ${formatDate(latest?.createdAt || latest?.generatedAt)}`;
  renderScoreSummary(latest, account, summary);
  renderNextActionCards(latest, account, summary);
  if (workCard) workCard.innerHTML = `<div class="nv74-card-head"><h2>바로 할 수 있는 일</h2><a href="#saveSiteForm">사이트 등록 ›</a></div><div class="nv74-task-list"><div class="nv74-task"><i class="blue">01</i><div><b>내 사이트 저장</b><small>검사할 URL을 계정에 보관합니다.</small></div><progress value="100" max="100"></progress><span class="status ok">기본</span></div><div class="nv74-task"><i class="purple">02</i><div><b>다시 검사하기</b><small>저장된 URL을 바로 재검사합니다.</small></div><progress value="100" max="100"></progress><span class="status ok">기본</span></div><div class="nv74-task"><i class="orange">03</i><div><b>최근 결과 비교</b><small>최근 5개 검사를 한곳에서 확인합니다.</small></div><progress value="100" max="100"></progress><span class="status ok">기본</span></div></div>`;
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
    ${fulfillment?.locked ? `<div class="nv74-state"><strong>산출물 잠금</strong> · 구매한 리포트·수정안·템플릿은 이 영역에 표시됩니다.</div>` : ''}
    ${renderAsset(fulfillment?.asset, fulfillment?.order || summary?.order, accessToken)}
    ${summary?.site ? `<div class="nv74-state"><strong>현재 선택 사이트</strong> · ${escapeHtml(summary.site.domain)} · ${escapeHtml(summary.site.latestRiskLevel || '검사 전')} · 최근 발견 ${escapeHtml(summary.site.latestFindings ?? summary.latestScan?.totalFindings ?? '-')}개</div>` : ''}
`;
  feed.innerHTML = `
    <div class="card stack"><div class="meta-row"><strong>게시판 연결 글</strong><a class="btn secondary" href="/board">게시판 보기</a></div>${renderBoardHighlights(summary?.boards || [])}</div>
    <div class="card stack"><strong>공지·인사이트</strong>${renderInsightFeed(summary?.boards || [])}</div>`;
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

