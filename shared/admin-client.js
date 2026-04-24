let adminSessionPromise = null;

async function loadAdminSession() {
  const res = await fetch('/api/admin/session');
  if (res.status === 401) {
    location.href = '/admin';
    throw new Error('unauthorized');
  }
  const data = await res.json();
  if (!data.authenticated) {
    location.href = '/admin';
    throw new Error('unauthorized');
  }
  return data;
}

export async function getAdminSession(force = false) {
  if (!adminSessionPromise || force) adminSessionPromise = loadAdminSession();
  return adminSessionPromise;
}

export async function adminFetch(url, options = {}) {
  const session = await getAdminSession();
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('x-nv0-csrf', session.csrfToken || '');
  }
  const res = await fetch(url, { ...options, method, headers });
  if (res.status === 401) {
    location.href = '/admin';
    throw new Error('unauthorized');
  }
  if (res.status === 403) {
    const data = await res.clone().json().catch(() => null);
    throw new Error(data?.error || 'forbidden');
  }
  return res;
}

export async function adminLogout() {
  await adminFetch('/api/admin/logout', { method: 'POST' });
  location.href = '/admin';
}
