
const byId = (id) => document.getElementById(id);
const loginForm = byId('loginForm');
const registerForm = byId('registerForm');
const resetRequestForm = byId('resetRequestForm');
const resetForm = byId('resetForm');
const loginEmail = byId('loginEmail');
const loginPassword = byId('loginPassword');
const registerEmail = byId('registerEmail');
const registerPassword = byId('registerPassword');
const privacyConsent = byId('privacyConsent');
const resetEmail = byId('resetEmail');
const resetConfirmEmail = byId('resetConfirmEmail');
const resetToken = byId('resetToken');
const resetPassword = byId('resetPassword');
const loginState = byId('loginState');
const registerState = byId('registerState');
const resetRequestState = byId('resetRequestState');
const resetState = byId('resetState');

function clearEmailDefaults() {
  [loginEmail, registerEmail, resetEmail, resetConfirmEmail].forEach((input) => {
    if (!input) return;
    input.defaultValue = '';
    input.value = '';
    input.removeAttribute('value');
    input.setAttribute('autocomplete', 'off');
  });
}
clearEmailDefaults();

async function postJson(path, body){
  const res = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body) });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}
function targetPortal(){ const url = new URL(location.href); return url.searchParams.get('next') || '/portal'; }

loginForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (loginState) loginState.textContent='로그인 중입니다...';
  try{ await postJson('/api/public/auth/login',{email:loginEmail?.value || '',password:loginPassword?.value || ''}); location.href=targetPortal(); }
  catch(error){ if (loginState) loginState.textContent=error.message; }
});
registerForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (registerState) registerState.textContent='계정을 생성하는 중입니다...';
  try{ await postJson('/api/public/auth/register',{email:registerEmail?.value || '',password:registerPassword?.value || '',privacyConsent:!!privacyConsent?.checked}); location.href=targetPortal(); }
  catch(error){ if (registerState) registerState.textContent=error.message; }
});
resetRequestForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (resetRequestState) resetRequestState.textContent='재설정 안내를 준비하는 중입니다...';
  try{ const data=await postJson('/api/public/auth/request-password-reset',{email:resetEmail?.value || ''}); if (resetRequestState) resetRequestState.textContent=data.message || '가입된 이메일이라면 재설정 안내가 발송됩니다.'; }
  catch(error){ if (resetRequestState) resetRequestState.textContent=error.message; }
});
resetForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (resetState) resetState.textContent='비밀번호를 변경하는 중입니다...';
  try{ const data=await postJson('/api/public/auth/reset-password',{email:resetConfirmEmail?.value || '',token:resetToken?.value || '',password:resetPassword?.value || ''}); if (resetState) resetState.textContent=data.message || '비밀번호가 변경되었습니다.'; }
  catch(error){ if (resetState) resetState.textContent=error.message; }
});

(()=>{ const url=new URL(location.href); const token=url.searchParams.get('resetToken') || ''; if(token && resetToken) resetToken.value=token; })();
(async()=>{ try{ const res = await fetch('/api/public/auth/session', { credentials:'same-origin' }); const data=await res.json(); if(data.authenticated && loginState) loginState.textContent='이미 로그인된 계정이 있습니다. 내 사이트 관리로 이동할 수 있습니다.'; }catch{} })();
