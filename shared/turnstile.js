let scriptPromise = null;

function loadScript(timeoutMs = 8000) {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector('script[data-turnstile="1"]');
    let timeoutId = null;
    const settle = (fn, value) => {
      if (timeoutId) clearTimeout(timeoutId);
      fn(value);
    };
    timeoutId = setTimeout(() => {
      reject(new Error('Cloudflare Turnstile 스크립트 로딩 시간이 초과되었습니다.'));
    }, timeoutMs);
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

export async function mountTurnstile({ containerId, tokenInputId, noticeId, configUrl = '/api/public/config' }) {
  const container = document.getElementById(containerId);
  const tokenInput = document.getElementById(tokenInputId);
  const notice = noticeId ? document.getElementById(noticeId) : null;
  if (!container || !tokenInput) return { enabled: false, getToken: () => '' };

  let config;
  try {
    const configRes = await fetch(configUrl, { credentials: 'same-origin' });
    config = await configRes.json();
  } catch (error) {
    if (notice) notice.textContent = `Turnstile 설정을 확인하지 못했습니다: ${error.message}`;
    return { enabled: false, getToken: () => '' };
  }
  if (!config.turnstileEnabled) {
    container.classList.add('hidden');
    tokenInput.value = '';
    if (notice) notice.textContent = '추가 봇 검증 없이 진행 가능합니다.';
    return { enabled: false, getToken: () => '' };
  }

  if (notice) notice.textContent = 'Cloudflare Turnstile 검증 후 진행됩니다.';
  container.classList.remove('hidden');
  const turnstile = await loadScript();
  const widgetId = turnstile.render(`#${containerId}`, {
    sitekey: config.turnstileSiteKey,
    callback(token) {
      tokenInput.value = token;
    },
    'expired-callback'() {
      tokenInput.value = '';
    },
    'error-callback'() {
      tokenInput.value = '';
      if (notice) notice.textContent = 'Turnstile 로딩에 실패했습니다. 새로고침 후 다시 시도하세요.';
    }
  });
  return {
    enabled: true,
    getToken: () => tokenInput.value,
    reset: () => turnstile.reset(widgetId)
  };
}
