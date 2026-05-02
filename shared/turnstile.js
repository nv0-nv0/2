let scriptPromise = null;

function timeoutError(label, timeoutMs) {
  return new Error(`${label} 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
}

async function fetchJsonWithTimeout(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
    return await res.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw timeoutError('Turnstile 설정 확인', timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function loadScript(timeoutMs = 5000) {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector('script[data-turnstile="1"]');
    let settled = false;
    let timeoutId = null;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      fn(value);
    };
    timeoutId = setTimeout(() => settle(reject, timeoutError('Cloudflare Turnstile 로딩', timeoutMs)), timeoutMs);
    if (existing) {
      existing.addEventListener('load', () => settle(resolve, window.turnstile));
      existing.addEventListener('error', () => settle(reject, new Error('Cloudflare Turnstile 스크립트를 불러오지 못했습니다.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = '1';
    script.onload = () => settle(resolve, window.turnstile);
    script.onerror = () => settle(reject, new Error('Cloudflare Turnstile 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function disabledGuard() {
  return { enabled: false, ready: true, getToken: () => '', reset: () => {} };
}

export async function mountTurnstile({ containerId, tokenInputId, noticeId, configUrl = '/api/public/config' }) {
  const container = document.getElementById(containerId);
  const tokenInput = document.getElementById(tokenInputId);
  const notice = noticeId ? document.getElementById(noticeId) : null;
  if (!container || !tokenInput) return disabledGuard();

  const continueWithoutChallenge = (message) => {
    container.classList.add('hidden');
    tokenInput.value = '';
    if (notice) notice.textContent = message || '추가 보안 확인 없이 무료 진단을 계속 진행할 수 있습니다.';
    return disabledGuard();
  };

  let config;
  try {
    config = await fetchJsonWithTimeout(configUrl, 3500);
  } catch (error) {
    return continueWithoutChallenge(`보안 확인 설정 응답이 지연되어 생략합니다. 무료 진단은 계속 사용할 수 있습니다. (${error.message})`);
  }

  if (!config?.turnstileEnabled || !config?.turnstileSiteKey) {
    return continueWithoutChallenge('현재는 추가 보안 확인 없이 무료 진단을 진행합니다.');
  }

  if (notice) notice.textContent = 'Cloudflare Turnstile 확인을 준비하고 있습니다. 지연되면 자동으로 일반 진단 모드로 전환됩니다.';
  container.classList.remove('hidden');
  try {
    const turnstile = await loadScript(5000);
    if (!turnstile?.render) return continueWithoutChallenge('Turnstile 객체를 확인하지 못해 일반 진단 모드로 전환합니다.');
    const widgetId = turnstile.render(`#${containerId}`, {
      sitekey: config.turnstileSiteKey,
      callback(token) {
        tokenInput.value = token;
        if (notice) notice.textContent = '보안 확인이 완료되었습니다. 무료 진단을 실행할 수 있습니다.';
      },
      'expired-callback'() {
        tokenInput.value = '';
        if (notice) notice.textContent = '보안 확인이 만료되었습니다. 다시 확인하거나 그대로 재시도하세요.';
      },
      'error-callback'() {
        tokenInput.value = '';
        if (notice) notice.textContent = 'Turnstile 확인에 실패했습니다. 무료 진단은 일반 모드로 계속 시도할 수 있습니다.';
      }
    });
    return {
      enabled: true,
      ready: true,
      getToken: () => tokenInput.value,
      reset: () => turnstile.reset(widgetId)
    };
  } catch (error) {
    return continueWithoutChallenge(`보안 확인을 불러오지 못해 일반 진단 모드로 전환합니다. (${error.message})`);
  }
}
