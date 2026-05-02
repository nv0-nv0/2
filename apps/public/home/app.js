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

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
const h = escapeHtml;
function smartCardHtml(item){return `<article><b>${h(item.title)}</b><small>${h(item.reason||item.description||'다음 행동을 정리했습니다.')}</small></article>`;}
async function mountSmartProductPanel(){
  if(!root || document.getElementById('smartProductPanel')) return;
  try{
    const res=await fetch('/api/public/smart-product',{credentials:'same-origin'});
    const data=await res.json();
    if(!res.ok || !data?.ok) throw new Error(data?.error||'smart product unavailable');
    const orchestration=data.orchestration||{};
    const action=orchestration.nextBestAction||{};
    const wins=Array.isArray(data.quickWins)?data.quickWins.slice(0,3):[];
    const panel=document.createElement('section');
    panel.id='smartProductPanel';
    panel.className='card stack nv67-section smart-product-panel';
    panel.innerHTML=`<div class="meta-row"><span class="pill brand">Smart NV0</span><span class="pill gray">운영 흐름 추천</span></div><h2>${h(data.headline||action.title||'다음 행동을 정리했습니다.')}</h2><p class="muted">${h(data.summary||action.description||'무료 진단 이후 어떤 상품과 관리 흐름으로 이어질지 자동으로 정리합니다.')}</p><div class="nv67-visual-grid smart-product-grid">${wins.map(smartCardHtml).join('')}</div><div class="topnav"><a class="btn primary" href="${h(action.path||'/products/veridion/demo')}">${h(action.cta||'무료 진단 시작')}</a><a class="btn secondary" href="/plans">요금제 비교</a></div>`;
    const hero=root.querySelector('.nv67-hero')||root.firstElementChild;
    if(hero?.nextSibling) root.insertBefore(panel,hero.nextSibling); else root.appendChild(panel);
  }catch{}
}
mountSmartProductPanel();
