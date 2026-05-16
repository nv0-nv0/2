const byId = id => document.getElementById(id);
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
function targetPortal(){ const url = new URL(location.href); return url.searchParams.get('next') || '/portal'; }
async function postJson(path, payload){ const res = await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const data = await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.'); return data; }
byId('loginForm')?.addEventListener('submit', async (event)=>{ event.preventDefault(); loginState.textContent='로그인 중입니다...'; try{ await postJson('/api/public/auth/login',{email:loginEmail?.value || '',password:loginPassword?.value || ''}); location.href=targetPortal(); }catch(error){ loginState.textContent=error.message; }});
byId('registerForm')?.addEventListener('submit', async (event)=>{ event.preventDefault(); registerState.textContent='계정을 생성하는 중입니다...'; try{ await postJson('/api/public/auth/register',{email:registerEmail?.value || '',password:registerPassword?.value || '',privacyConsent:!!privacyConsent?.checked}); location.href=targetPortal(); }catch(error){ registerState.textContent=error.message; }});
byId('resetRequestForm')?.addEventListener('submit', async (event)=>{ event.preventDefault(); resetRequestState.textContent='재설정 안내를 준비하는 중입니다...'; try{ const data=await postJson('/api/public/auth/request-password-reset',{email:resetEmail?.value || ''}); resetRequestState.textContent=data.message || '가입된 이메일이라면 재설정 안내가 발송됩니다.'; }catch(error){ resetRequestState.textContent=error.message; }});
byId('resetForm')?.addEventListener('submit', async (event)=>{ event.preventDefault(); resetState.textContent='비밀번호를 변경하는 중입니다...'; try{ const data=await postJson('/api/public/auth/reset-password',{email:resetConfirmEmail?.value || '',token:resetToken?.value || '',password:resetPassword?.value || ''}); resetState.textContent=data.message || '비밀번호가 변경되었습니다.'; }catch(error){ resetState.textContent=error.message; }});
function clearEmailDefaults(){
  [loginEmail, registerEmail, resetEmail, resetConfirmEmail].forEach((input)=>{
    if (!input) return;
    input.defaultValue = '';
    input.value = '';
    input.removeAttribute('value');
  });
}
clearEmailDefaults();
setTimeout(clearEmailDefaults, 0);
(()=>{ const url=new URL(location.href); const token=url.searchParams.get('resetToken') || ''; if(token && resetToken) resetToken.value=token; })();
(async()=>{ try{ const res = await fetch('/api/public/auth/session'); const data=await res.json(); if(data.authenticated && loginState) loginState.textContent='이미 로그인된 계정이 있습니다. 내 사이트 관리로 이동할 수 있습니다.'; }catch{} })();
