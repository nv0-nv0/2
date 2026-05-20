import { escapeAttr, escapeHtml, safeLocalPath } from '/shared/html.js';

const REQUEST_TIMEOUT_MS = 18000;
const AUTO_PORTAL_DELAY_MS = 2200;
const SCAN_ENDPOINTS = ['/api/diagnostics/start', '/api/public/diagnose'];
const PROGRESS_STEPS = [
  { percent: 18, label: 'URL 형식 확인', text: '입력한 주소를 공개 진단 형식으로 정리했습니다.' },
  { percent: 38, label: '공개 페이지 수집', text: '공개 페이지와 정책 링크 후보를 확인하고 있습니다.' },
  { percent: 62, label: '신뢰 공백 분류', text: '결제 전 안내, 개인정보, 환불 고지 공백을 분류합니다.' },
  { percent: 82, label: '결과 저장 준비', text: '내 사이트 관리 화면에서 이어 볼 수 있도록 결과를 저장합니다.' },
  { percent: 96, label: '자동 이동 준비', text: '결과창 표시 후 내 사이트 관리 화면으로 연결합니다.' }
];

let progressTimer = null;
let redirectTimer = null;
let redirectInterval = null;
let publicConfig = null;

function normalizeDemoTarget(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  if (/\s/.test(value)) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!url.hostname || !url.hostname.includes('.')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function compactDomain(value = '') {
  return String(value || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || value;
}

function demoPageUrl(target) {
  const url = new URL('/products/veridion/demo', location.origin);
  if (target) url.searchParams.set('target', target);
  return `${url.pathname}${url.search}`;
}

function safePortalPath(value = '/portal') {
  return safeLocalPath(value, '/portal');
}

function setHomeState(message, mode = 'muted') {
  const state = document.getElementById('homeDemoState');
  if (!state) return;
  state.className = `nv0-home-demo-state ${mode}`.trim();
  state.textContent = message;
}

function showInputHint(input, message) {
  if (!input) return;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  let hint = document.getElementById('homeDemoInputHint');
  if (!hint) {
    hint = input.nextElementSibling?.classList?.contains('nv0-input-hint') ? input.nextElementSibling : null;
  }
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'nv0-input-hint';
    hint.id = 'homeDemoInputHint';
    input.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = message || '';
  hint.hidden = !message;
}

function setResultHtml(html) {
  const result = document.getElementById('homeDemoResult');
  if (!result) return;
  result.hidden = !html;
  result.innerHTML = html || '';
  if (html) result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setButtonBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent || '무료 진단 시작';
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = '진단 실행 중';
  } else {
    button.removeAttribute('aria-busy');
    button.disabled = false;
    button.textContent = button.dataset.originalText || '무료 진단 시작';
  }
}

function saveScan(scan = {}, portalUrl = '/portal') {
  const payload = { ...scan, portalUrl, savedAt: new Date().toISOString(), handoffSource: 'home-instant-demo' };
  try { localStorage.setItem('nv0:lastScan', JSON.stringify(payload)); } catch {}
  try { sessionStorage.setItem('lastScan', JSON.stringify(payload)); } catch {}
  try { sessionStorage.setItem('nv0:autoHandoff', JSON.stringify({ portalUrl, requestId: payload.requestId || payload.id || '', siteId: payload.siteId || '', target: payload.target || payload.domain || '', savedAt: payload.savedAt })); } catch {}
}

async function jsonFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...options, signal: controller.signal, credentials: options.credentials || 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || `요청 실패 (${res.status})`);
      error.status = res.status;
      error.payload = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다. 전용 데모 페이지에서 다시 실행해 주세요.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPublicConfig() {
  if (publicConfig) return publicConfig;
  try {
    publicConfig = await jsonFetch('/api/public/config', { method: 'GET', timeoutMs: 4000 });
  } catch {
    publicConfig = { ok: false, turnstileEnabled: false, turnstileConfigured: false };
  }
  return publicConfig;
}

async function startDiagnosis(normalized) {
  let lastError = null;
  for (const endpoint of SCAN_ENDPOINTS) {
    try {
      const data = await jsonFetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: normalized, target: normalized, source: 'home-instant-demo' }),
        timeoutMs: REQUEST_TIMEOUT_MS
      });
      return { data, endpoint };
    } catch (error) {
      lastError = error;
      if (![404, 405].includes(Number(error.status || 0))) break;
    }
  }
  throw lastError || new Error('진단 실행에 실패했습니다.');
}

function progressClass(index, currentIndex) {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'active';
  return '';
}

function renderProgress(target, currentIndex = 0) {
  const domain = compactDomain(target);
  const step = PROGRESS_STEPS[Math.min(currentIndex, PROGRESS_STEPS.length - 1)];
  const steps = PROGRESS_STEPS.slice(0, 4).map((item, index) => `<li class="${progressClass(index, currentIndex)}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(index <= currentIndex ? item.text : '대기 중')}</span></li>`).join('');
  return `<div class="nv0-home-demo-card scanning">
    <div class="nv0-home-demo-card-head"><span>즉시 데모 실행 중</span><strong>${escapeHtml(domain)}</strong></div>
    <div class="nv0-home-demo-progress"><i style="width:${escapeAttr(step.percent)}%"></i></div>
    <ol class="nv0-home-demo-steps">${steps}</ol>
    <p>${escapeHtml(step.text)} 작은 파일의 전체 화면 진행 UX를 함께 적용해 사용자가 빈 화면 이동으로 느끼지 않도록 했습니다.</p>
  </div>`;
}

function renderCompleted(scan = {}, portalUrl = '/portal', endpoint = '') {
  const score = scan.riskScore ?? '-';
  const findings = scan.totalFindings ?? (Array.isArray(scan.detailFindings) ? scan.detailFindings.length : 0);
  const domain = compactDomain(scan.target || scan.targetUrl || scan.domain || '진단 사이트');
  const safePortal = safePortalPath(portalUrl);
  const topFindings = Array.isArray(scan.topFindings) ? scan.topFindings.slice(0, 3) : [];
  const findingList = topFindings.length ? `<ul class="nv0-home-demo-findings">${topFindings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
  return `<div class="nv0-home-demo-card success">
    <div class="nv0-home-demo-card-head"><span>무료 데모 완료</span><strong>${escapeHtml(domain)}</strong></div>
    <div class="nv0-home-demo-progress complete"><i style="width:100%"></i></div>
    <div class="nv0-home-demo-kpis"><article><b>${escapeHtml(score)}</b><small>개선 우선도</small></article><article><b>${escapeHtml(findings)}</b><small>발견/검토 항목</small></article><article><b>자동</b><small>내 사이트 이동</small></article></div>
    <p>결과가 저장되었습니다. <b><span id="homeDemoRedirectCountdown">2</span>초 후</b> 내 사이트 관리 화면에서 같은 결과를 이어서 확인합니다.</p>
    ${findingList}
    <div class="nv0-home-demo-actions"><a class="phase264-btn primary" href="${escapeAttr(safePortal)}">내 사이트에서 보기</a><a class="phase264-btn secondary" href="${escapeAttr(demoPageUrl(scan.target || domain))}">전용 데모로 자세히 보기</a></div>
    ${endpoint ? `<small class="nv0-home-demo-endpoint">실행 API: ${escapeHtml(endpoint)}</small>` : ''}
  </div>`;
}

function renderWarning(message, normalized = '') {
  return `<div class="nv0-home-demo-card warn"><div class="nv0-home-demo-card-head"><span>계속 진행 필요</span><strong>${escapeHtml(compactDomain(normalized || '진단 주소'))}</strong></div><p>${escapeHtml(message)}</p><div class="nv0-home-demo-actions"><a class="phase264-btn primary" href="${escapeAttr(demoPageUrl(normalized))}">전용 데모 페이지에서 계속</a><a class="phase264-btn secondary" href="/service">서비스 범위 보기</a></div></div>`;
}

function overlayHtml(target, currentIndex = 0, done = false) {
  const domain = compactDomain(target);
  const step = done ? { percent: 100, text: '진단 완료 · 결과 저장 후 내 사이트로 이동합니다.' } : PROGRESS_STEPS[Math.min(currentIndex, PROGRESS_STEPS.length - 1)];
  return `<div class="nv0-home-demo-overlay-panel">
    <div class="nv0-home-demo-spinner" aria-hidden="true"><span></span></div>
    <p class="nv0-home-demo-overlay-kicker">서버 기반 안전 진단</p>
    <h2>${done ? '결과 저장 완료' : '진단 실행 중'}</h2>
    <p class="nv0-home-demo-overlay-target">${escapeHtml(domain)}</p>
    <div class="nv0-home-demo-overlay-bar"><i style="width:${escapeAttr(step.percent)}%"></i></div>
    <p class="nv0-home-demo-overlay-text">${escapeHtml(step.text)}</p>
  </div>`;
}

function showOverlay(target) {
  const overlay = document.getElementById('homeDemoOverlay');
  if (!overlay) return;
  overlay.hidden = false;
  overlay.innerHTML = overlayHtml(target, 0, false);
}

function updateOverlay(target, index, done = false) {
  const overlay = document.getElementById('homeDemoOverlay');
  if (!overlay || overlay.hidden) return;
  overlay.innerHTML = overlayHtml(target, index, done);
}

function hideOverlay(delay = 0) {
  const overlay = document.getElementById('homeDemoOverlay');
  if (!overlay) return;
  window.setTimeout(() => {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }, delay);
}

function beginProgress(target) {
  clearInterval(progressTimer);
  let index = 0;
  showOverlay(target);
  setResultHtml(renderProgress(target, index));
  progressTimer = setInterval(() => {
    index = Math.min(index + 1, PROGRESS_STEPS.length - 1);
    setResultHtml(renderProgress(target, index));
    updateOverlay(target, index, false);
    if (index >= PROGRESS_STEPS.length - 1) clearInterval(progressTimer);
  }, 650);
}

function stopProgress() {
  clearInterval(progressTimer);
  progressTimer = null;
}

function beginAutoPortalHandoff(portalUrl) {
  clearTimeout(redirectTimer);
  clearInterval(redirectInterval);
  const safePortal = safePortalPath(portalUrl);
  let remaining = Math.max(1, Math.ceil(AUTO_PORTAL_DELAY_MS / 1000));
  const writeCountdown = () => {
    const node = document.getElementById('homeDemoRedirectCountdown');
    if (node) node.textContent = String(Math.max(0, remaining));
  };
  writeCountdown();
  redirectInterval = setInterval(() => {
    remaining -= 1;
    writeCountdown();
    if (remaining <= 0) clearInterval(redirectInterval);
  }, 1000);
  redirectTimer = setTimeout(() => {
    location.assign(safePortal);
  }, AUTO_PORTAL_DELAY_MS);
}

function updateFallbackHref(input) {
  const fallback = document.getElementById('homeDemoFallbackLink');
  if (!fallback) return;
  const normalized = normalizeDemoTarget(input?.value || '');
  fallback.setAttribute('href', demoPageUrl(normalized));
}

function hydrateInitialTarget(input) {
  const params = new URL(location.href).searchParams;
  const target = params.get('target') || params.get('url') || '';
  if (target && input && !input.value) {
    input.value = target;
    updateFallbackHref(input);
  }
}

async function runHomeInstantDemo(event, input, button) {
  event?.preventDefault?.();
  const raw = String(input?.value || '').trim();
  const normalized = normalizeDemoTarget(raw);
  if (!raw) {
    setHomeState('진단할 사이트 주소를 입력해 주세요. 예: https://your-store.kr', 'warn');
    input?.focus();
    return;
  }
  if (!normalized) {
    showInputHint(input, '도메인 또는 URL 형식을 확인해 주세요. 예: https://example.kr');
    setHomeState('URL 형식이 맞지 않아 실행하지 않았습니다.', 'warn');
    input?.focus();
    return;
  }

  showInputHint(input, '');
  updateFallbackHref(input);
  const config = await loadPublicConfig();
  if (config.turnstileEnabled && config.turnstileConfigured) {
    const url = demoPageUrl(normalized);
    setHomeState('보안 확인이 필요한 환경입니다. 전용 데모 페이지에서 이어서 실행합니다.', 'warn');
    setResultHtml(renderWarning('보안 확인이 활성화되어 있어 홈 즉시 실행 대신 전용 데모 화면으로 연결합니다.', normalized));
    location.assign(url);
    return;
  }

  setButtonBusy(button, true);
  setHomeState('홈 화면에서 즉시 데모 진단을 실행합니다.', 'muted');
  beginProgress(normalized);
  try {
    const { data, endpoint } = await startDiagnosis(normalized);
    const scan = data.scan || data.result || {};
    const portalUrl = safePortalPath(data.portalUrl || data.redirectUrl || scan.portalUrl || '/portal');
    saveScan({ ...scan, target: scan.target || normalized, targetUrl: scan.targetUrl || normalized }, portalUrl);
    stopProgress();
    updateOverlay(normalized, PROGRESS_STEPS.length - 1, true);
    setHomeState('진단 완료 · 결과창을 내 사이트 관리 화면으로 자동 연결합니다.', 'success');
    setResultHtml(renderCompleted({ ...scan, target: scan.target || normalized }, portalUrl, endpoint));
    hideOverlay(700);
    beginAutoPortalHandoff(portalUrl);
  } catch (error) {
    stopProgress();
    hideOverlay(0);
    const message = error?.message || '진단 실행에 실패했습니다.';
    const needsDedicatedDemo = /보안|turnstile|검증|초과|권한|시간이 초과/i.test(message);
    setHomeState(needsDedicatedDemo ? '보안 확인 또는 시간 초과로 전용 데모 페이지에서 이어서 실행합니다.' : message, 'warn');
    setResultHtml(renderWarning(message, normalized));
    if (needsDedicatedDemo) setTimeout(() => { location.assign(demoPageUrl(normalized)); }, 900);
  } finally {
    setButtonBusy(button, false);
  }
}

function bindInlineDemoTargetForwarding() {
  const form = document.getElementById('homeInstantDemoForm');
  const input = document.getElementById('homeTargetUrl');
  const button = document.getElementById('homeInstantDemoBtn');
  hydrateInitialTarget(input);
  updateFallbackHref(input);
  if (form && input && button && form.dataset.nv0ForwardBound !== 'true') {
    form.dataset.nv0ForwardBound = 'true';
    form.addEventListener('submit', (event) => runHomeInstantDemo(event, input, button));
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') runHomeInstantDemo(event, input, button); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') showInputHint(input, '');
      updateFallbackHref(input);
    });
  }

  document.querySelectorAll('.cta-input, .hero-search').forEach((box) => {
    if (box.dataset.instantDemo === 'true' || box.dataset.nv0ForwardBound === 'true') return;
    const localInput = box.querySelector('input');
    const link = box.querySelector('a[href*="/products/veridion/demo"]');
    if (!localInput || !link) return;
    box.dataset.nv0ForwardBound = 'true';
    const go = (event) => {
      const raw = String(localInput.value || '').trim();
      if (!raw) return;
      const normalized = normalizeDemoTarget(raw);
      if (!normalized) {
        event.preventDefault();
        showInputHint(localInput, '도메인 또는 URL 형식을 확인해 주세요. 예: https://example.kr');
        localInput.focus();
        return;
      }
      event.preventDefault();
      showInputHint(localInput, '');
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('target', normalized);
      location.href = `${url.pathname}${url.search}`;
    };
    link.addEventListener('click', go);
    localInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') go(event); });
    localInput.addEventListener('input', () => { if (localInput.getAttribute('aria-invalid') === 'true') showInputHint(localInput, ''); });
  });
}

try {
  document.documentElement.dataset.pageReady = 'true';
  bindInlineDemoTargetForwarding();
  loadPublicConfig().catch(() => {});
} catch {}
