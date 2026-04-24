const form=document.getElementById('quickDocForm');
const state=document.getElementById('quickDocState');
form?.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!state)return;
  state.textContent='문서 초안을 생성하는 중입니다.';
  try{
    const fd=new FormData(form);
    const payload=Object.fromEntries(fd.entries());
    payload.subscriptionBilling=fd.get('subscriptionBilling')==='on';
    const res=await fetch('/api/public/document-preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!data.ok){state.textContent=data.error||'필수 정보를 확인한 뒤 다시 시도하세요.';return;}
    sessionStorage.setItem('veridion:documentPreview',JSON.stringify(data.preview));
    state.textContent='문서 초안이 생성되었습니다. 상세 미리보기 화면으로 이동합니다.';
    location.href='/documents';
  }catch(error){state.textContent=`문서 생성 중 오류가 발생했습니다: ${error.message}`;}
});
