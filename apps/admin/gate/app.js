import { mountTurnstile } from '/shared/turnstile.js';

const state = document.getElementById('gateState');
const keyInput = document.getElementById('adminKey');
keyInput.value = '';

const guard = await mountTurnstile({
  containerId: 'turnstileBox',
  tokenInputId: 'turnstileToken',
  noticeId: 'turnstileState',
  configUrl: '/api/admin/session'
});

async function login() {
  const key = keyInput.value;
  const turnstileToken = guard.getToken();
  state.textContent = '인증 중...';
  let data;
  try {
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, turnstileToken })
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      state.textContent = data.error || '실패';
      keyInput.value = '';
      guard.reset?.();
      return;
    }
  } catch (error) {
    state.textContent = `인증 요청을 완료하지 못했습니다: ${error.message}`;
    keyInput.value = '';
    guard.reset?.();
    return;
  }
  location.href = '/admin/console';
}

document.getElementById('loginBtn').addEventListener('click', login);
keyInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});
