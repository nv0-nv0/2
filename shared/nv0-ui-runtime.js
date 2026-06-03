/* NV0 UI Runtime v1.0.0: mobile navigation, portal drawer and safe copy normalization. */
if (!window.__NV0_UI_RUNTIME__) {
  window.__NV0_UI_RUNTIME__ = true;
  const body = document.body;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const closeOnEscape = [];
  const current = (href) => {
    try {
      const target = new URL(href || '/', window.location.origin).pathname.replace(/\/$/, '') || '/';
      return target === path || (target !== '/' && path.startsWith(target));
    } catch { return false; }
  };
  const setExpanded = (button, panel, expanded) => {
    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    if (expanded) panel.querySelector('a')?.focus();
  };
  function initPublicMobileMenu() {
    const topbar = document.querySelector('.vr-topbar[data-public-nav="true"]');
    const inner = topbar?.querySelector('.vr-topbar-inner');
    const nav = topbar?.querySelector('.vr-nav');
    if (!inner || !nav || inner.querySelector('.nv0-mobile-menu-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nv0-mobile-menu-button';
    button.setAttribute('aria-label', '모바일 메뉴 열기');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'nv0MobileMenu');
    button.textContent = '☰';
    inner.append(button);
    const panel = document.createElement('div');
    panel.id = 'nv0MobileMenu';
    panel.className = 'nv0-mobile-menu';
    panel.hidden = true;
    const panelNav = document.createElement('nav');
    panelNav.setAttribute('aria-label', '모바일 주요 메뉴');
    const links = [
      ['진단', '/products/veridion/demo'],
      ['인사이트', '/board'],
      ['요금제', '/plans'],
      ['고객 포털', '/portal'],
      ['로그인', '/auth']
    ];
    for (const [label, href] of links) {
      const link = document.createElement('a');
      link.href = href; link.textContent = label;
      if (current(href)) link.setAttribute('aria-current', 'page');
      panelNav.append(link);
    }
    const actions = document.createElement('div');
    actions.className = 'nv0-mobile-actions';
    const cta = document.createElement('a');
    cta.href = '/products/veridion/demo';
    cta.textContent = '무료 사이트 진단 시작';
    actions.append(cta); panelNav.append(actions); panel.append(panelNav); topbar.after(panel);
    button.addEventListener('click', () => setExpanded(button, panel, button.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (event) => { if (event.target.closest('a')) setExpanded(button, panel, false); });
    closeOnEscape.push(() => { if (button.getAttribute('aria-expanded') === 'true') { setExpanded(button, panel, false); button.focus(); } });
  }
  function initPortalDrawer() {
    const side = document.querySelector('.vr-side');
    const top = document.querySelector('.vr-dashboard-top');
    if (!side || !top || top.querySelector('.nv0-portal-menu-button')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'nv0-portal-menu-button'; button.textContent = '포털 메뉴';
    button.setAttribute('aria-controls', 'nv0PortalSide'); button.setAttribute('aria-expanded', 'false');
    side.id = side.id || 'nv0PortalSide'; top.prepend(button);
    const close = () => { side.dataset.open = 'false'; button.setAttribute('aria-expanded', 'false'); };
    button.addEventListener('click', () => { const open = side.dataset.open !== 'true'; side.dataset.open = String(open); button.setAttribute('aria-expanded', String(open)); if (open) side.querySelector('a')?.focus(); });
    side.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
    closeOnEscape.push(() => { if (side.dataset.open === 'true') { close(); button.focus(); } });
  }
  function normalizePrimaryCtas() {
    const variants = new Set(['사이트 무료 진단 실행','무료 진단 시작','지금 무료 진단','현재 사이트 무료 진단']);
    document.querySelectorAll('a,button').forEach((element) => {
      if (variants.has((element.textContent || '').trim())) element.textContent = '무료 사이트 진단 시작';
    });
  }
  function init() {
    normalizePrimaryCtas();
    initPublicMobileMenu();
    initPortalDrawer();
    document.documentElement.dataset.nv0UiFoundation = 'active';
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeOnEscape.forEach((close) => close()); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
}
