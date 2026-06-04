const form=document.getElementById("homeDiagnosisForm");const input=document.getElementById("homeTargetUrl");const state=document.getElementById("homeDiagnosisState");
function normalize(raw=""){return String(raw||"").trim().replace(/^https?:\/\//i,"");}
form?.addEventListener("submit",(event)=>{event.preventDefault();const target=normalize(input?.value);if(!target){if(state) state.textContent="진단할 사이트 주소를 입력하세요.";input?.focus();return;}window.location.href=`/products/veridion/demo?target=${encodeURIComponent(target)}`;});

document.documentElement.dataset.homeCompactReady="true";
