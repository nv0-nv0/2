const ICON_MAP = { arrow_forward:'→', menu:'☰', add:'+', content_copy:'⧉', check_circle:'✓', warning:'⚠', error:'!', shield:'◆', analytics:'◈', search:'⌕', lock:'🔒' };
function normalizeUrl(raw){let value=String(raw||'').trim(); if(!value) return ''; if(!/^https?:\/\//i.test(value)) value=`https://${value}`; try{const url=new URL(value); if(!url.hostname.includes('.')) return ''; return url.toString();}catch{return '';}}
function showToast(message){const old=document.querySelector('.nv0n-copy-toast'); if(old) old.remove(); const el=document.createElement('div'); el.className='nv0n-copy-toast'; el.textContent=message; document.body.appendChild(el); setTimeout(()=>el.remove(),1800);}
function hrefForAction(action){
  const map={home:'/',diagnose:'/products/veridion/demo',service:'/service',plans:'/plans',contact:'/business-info',portal:'/portal',login:'/auth',privacy:'/privacy',terms:'/terms',business:'/business-info',board:'/board',checkoutReport:'/checkout?plan=Report',checkoutExpert:'/checkout?plan=Expert',checkoutSubscription:'/checkout?plan=Subscription'};
  return map[action] || '#';
}
function bindActionButtons(){
  document.querySelectorAll('[data-nv0n-action]').forEach((el)=>{
    if(el.dataset.nv0nBound==='true') return; el.dataset.nv0nBound='true';
    const action=el.dataset.nv0nAction;
    el.addEventListener('click', async (event)=>{
      if(action==='copySnippet'){
        event.preventDefault();
        const box=el.closest('section,article,div')?.querySelector('pre,code') || document.querySelector('pre,code');
        const text=box?.innerText?.trim() || 'nv0 점검 스니펫';
        try{await navigator.clipboard.writeText(text); showToast('복사했습니다.');}catch{showToast('복사할 내용을 선택해 복사하세요.');}
        return;
      }
      if(action==='scrollSaveSite'){
        event.preventDefault(); const target=document.getElementById('saveSiteForm'); if(target) target.scrollIntoView({behavior:'smooth',block:'start'}); return;
      }
      const href=hrefForAction(action);
      if(href && href!=='#'){ event.preventDefault(); location.href=href; }
    });
  });
}
function bindDiagnosisInputs(){
  const buttons=[...document.querySelectorAll('button,a')].filter(el=>/무료 진단|진단 시작|시작하기/.test(el.textContent||'') || el.dataset.nv0nAction==='diagnose');
  buttons.forEach((button)=>{
    const root=button.closest('section,div,form') || document;
    const input=root.querySelector('input[placeholder*="도메인"],input[placeholder*="URL"],input[placeholder*="사이트"]');
    if(!input || button.dataset.nv0nInputBound==='true') return; button.dataset.nv0nInputBound='true';
    const go=(event)=>{ const raw=input.value; if(!raw) return; const normalized=normalizeUrl(raw); if(!normalized){ event.preventDefault(); input.setAttribute('aria-invalid','true'); let hint=input.parentElement?.querySelector('.nv0n-input-hint'); if(!hint){hint=document.createElement('small'); hint.className='nv0n-input-hint'; input.insertAdjacentElement('afterend',hint);} hint.textContent='도메인 또는 URL 형식을 확인해 주세요. 예: https://example.kr'; input.focus(); return; } event.preventDefault(); location.href=`/products/veridion/demo?target=${encodeURIComponent(normalized)}`; };
    button.addEventListener('click',go); input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') go(e); }); input.addEventListener('input',()=>input.removeAttribute('aria-invalid'));
  });
}
function patchIcons(){document.querySelectorAll('.material-symbols-outlined').forEach((el)=>{const key=(el.textContent||'').trim(); if(ICON_MAP[key]) el.textContent=ICON_MAP[key];});}
function activateMobileMenu(){document.querySelectorAll('button').forEach((btn)=>{if((btn.textContent||'').trim()==='☰' && !btn.dataset.nv0nMenuBound){btn.dataset.nv0nMenuBound='true';btn.addEventListener('click',()=>{const nav=document.querySelector('header nav'); if(nav) nav.classList.toggle('hidden');});}})}
function ensureSafeBlankLinks(){document.querySelectorAll('a[href="#"]').forEach(a=>{a.setAttribute('href','/');});}
document.addEventListener('DOMContentLoaded',()=>{patchIcons();bindActionButtons();bindDiagnosisInputs();activateMobileMenu();ensureSafeBlankLinks();document.documentElement.dataset.nv0nRuntime='ready';});
