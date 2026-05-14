const MENU_SELECTOR = '.site-menu, .nv0-nav, .nv0-top-actions';
const LOGIN_SELECTOR = '.login-link, a[href="/auth"].nv0-icon-link';
const LOGOUT_CLASS = 'nav-logout-button';

function makeStatus(menu) {
  let status = document.getElementById('sessionNavStatus');
  if (!status) {
    status = document.createElement('span');
    status.id = 'sessionNavStatus';
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    menu.append(status);
  }
  return status;
}

function sameOriginFetch(url, options = {}) {
  return fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });
}

function buildLogoutButton(loginLink, customer, status) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${LOGOUT_CLASS} login-link nv0-icon-link`;
  button.textContent = '로그아웃';
  button.dataset.sessionState = 'authenticated';
  const email = customer?.email ? String(customer.email) : '';
  button.setAttribute('aria-label', email ? `${email} 계정 로그아웃` : '로그아웃');
  if (email) button.title = `${email} 계정`;
  button.addEventListener('click', async () => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = '로그아웃 중';
    status.textContent = '로그아웃을 처리하고 있습니다.';
    try {
      const res = await sameOriginFetch('/api/public/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('로그아웃 요청이 실패했습니다.');
      status.textContent = '로그아웃되었습니다.';
      const next = location.pathname === '/portal' ? '/' : location.href;
      location.assign(next);
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      status.textContent = error.message || '로그아웃을 완료하지 못했습니다.';
    }
  });
  loginLink.replaceWith(button);
  return button;
}

async function syncSessionNav() {
  const menu = document.querySelector(MENU_SELECTOR);
  const loginLink = document.querySelector(LOGIN_SELECTOR);
  if (!menu || !loginLink) return;
  const status = makeStatus(menu);
  try {
    const res = await sameOriginFetch('/api/public/auth/session');
    if (!res.ok) throw new Error('세션 확인 실패');
    const data = await res.json();
    if (data?.authenticated) {
      buildLogoutButton(loginLink, data.customer, status);
      status.textContent = '로그인 상태입니다. 메뉴에 로그아웃 버튼을 표시했습니다.';
    } else {
      loginLink.textContent = '로그인';
      loginLink.setAttribute('href', loginLink.getAttribute('href') || '/auth');
      loginLink.dataset.sessionState = 'anonymous';
    }
  } catch {
    loginLink.textContent = '로그인';
    loginLink.dataset.sessionState = 'unknown';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncSessionNav, { once: true });
} else {
  syncSessionNav();
}
