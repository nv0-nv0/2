const pageName = document.title || location.pathname;
const root = document.querySelector('main');

function normalizePath(path) {
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

function markCurrentLinks() {
  const current = normalizePath(location.pathname);
  document.querySelectorAll('a[href]').forEach(link => {
    try {
      const url = new URL(link.getAttribute('href'), location.origin);
      if (normalizePath(url.pathname) === current) link.setAttribute('aria-current', 'page');
    } catch {}
  });
}

function appendPageStatus() {
  if (!root || document.getElementById('pageReadyStatus')) return;
  const status = document.createElement('div');
  status.id = 'pageReadyStatus';
  status.className = 'sr-only';
  status.textContent = `${pageName} 페이지 콘텐츠와 연결 링크 로딩이 완료되었습니다.`;
  root.appendChild(status);
}

markCurrentLinks();
appendPageStatus();
