
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

const SAFE_AUTH_NEXT_PATHS = new Set(['/portal', '/checkout', '/products/veridion/demo', '/plans']);
function targetPortal() {
  const fallback = '/portal';
  const raw = new URL(location.href).searchParams.get('next');
  if (!raw) return fallback;
  try {
    const target = new URL(raw, location.origin);
    if (target.origin !== location.origin || !SAFE_AUTH_NEXT_PATHS.has(target.pathname)) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
function setFormBusy(form, busy) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = Boolean(busy);
  button.setAttribute('aria-busy', String(Boolean(busy)));
}

async function postJson(path, body){
  const res = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body) });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}
function validateCommercialPassword(password) {
  const value = String(password || '');
  if (value.length < 15) return '비밀번호는 15자 이상이어야 합니다.';
  if (value.length > 128) return '비밀번호는 128자 이하여야 합니다.';
  if (/^(.)\1+$/.test(value) || /^(0123456789|1234567890|abcdefghijklmnopqrstuvwxyz)+$/i.test(value)) return '추측하기 쉬운 비밀번호는 사용할 수 없습니다.';
  return '';
}

loginForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (loginState) loginState.textContent='로그인 중입니다...';
  setFormBusy(loginForm, true);
  try{ await postJson('/api/public/auth/login',{email:loginEmail?.value || '',password:loginPassword?.value || ''}); location.href=targetPortal(); }
  catch(error){ if (loginState) loginState.textContent=error.message; }
  finally { setFormBusy(loginForm, false); }
});
registerForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  const passwordError=validateCommercialPassword(registerPassword?.value || '');
  if(passwordError){ if(registerState) registerState.textContent=passwordError; return; }
  if(!privacyConsent?.checked){ if(registerState) registerState.textContent='개인정보처리방침 동의가 필요합니다.'; return; }
  if (registerState) registerState.textContent='계정을 생성하는 중입니다...';
  setFormBusy(registerForm, true);
  try{ await postJson('/api/public/auth/register',{email:registerEmail?.value || '',password:registerPassword?.value || '',privacyConsent:true}); location.href=targetPortal(); }
  catch(error){ if (registerState) registerState.textContent=error.message; }
  finally { setFormBusy(registerForm, false); }
});
resetRequestForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  if (resetRequestState) resetRequestState.textContent='재설정 안내를 준비하는 중입니다...';
  setFormBusy(resetRequestForm, true);
  try{ const data=await postJson('/api/public/auth/request-password-reset',{email:resetEmail?.value || ''}); if (resetRequestState) resetRequestState.textContent=data.message || '가입된 이메일이라면 재설정 안내가 발송됩니다.'; }
  catch(error){ if (resetRequestState) resetRequestState.textContent=error.message; }
  finally { setFormBusy(resetRequestForm, false); }
});
resetForm?.addEventListener('submit', async (event)=>{
  event.preventDefault();
  const passwordError=validateCommercialPassword(resetPassword?.value || '');
  if(passwordError){ if(resetState) resetState.textContent=passwordError; return; }
  if (resetState) resetState.textContent='비밀번호를 변경하는 중입니다...';
  setFormBusy(resetForm, true);
  try{ const data=await postJson('/api/public/auth/reset-password',{email:resetConfirmEmail?.value || '',token:resetToken?.value || '',password:resetPassword?.value || ''}); if (resetState) resetState.textContent=data.message || '비밀번호가 변경되었습니다.'; }
  catch(error){ if (resetState) resetState.textContent=error.message; }
  finally { setFormBusy(resetForm, false); }
});

(()=>{ const url=new URL(location.href); const token=url.searchParams.get('resetToken') || ''; if(token && resetToken) resetToken.value=token; if(token){ url.searchParams.delete('resetToken'); history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`); } })();
(async()=>{ try{ const res = await fetch('/api/public/auth/session', { credentials:'same-origin' }); const data=await res.json(); if(data.authenticated && loginState) loginState.textContent='이미 로그인된 계정이 있습니다. 고객 포털로 이동할 수 있습니다.'; }catch{} })();
