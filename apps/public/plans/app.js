import { escapeAttr, escapeHtml, formatWon } from '/shared/html.js';

const state = document.getElementById('plansState');
const planCards = document.getElementById('planCards');
const comparisonRows = document.getElementById('comparisonRows');
const smartPlanAdvice = document.getElementById('smartPlanAdvice');
const recommendedPlanCard = document.getElementById('recommendedPlanCard');
const paymentReadiness = document.getElementById('paymentReadiness');
const paymentProductCodes = document.getElementById('paymentProductCodes');
const oneTimeCards = document.getElementById('oneTimeCards');
const subscriptionCards = document.getElementById('subscriptionCards');
const certCards = document.getElementById('certCards');

const paymentFallback = {
  ok: false,
  provider: 'unknown',
  paymentReady: false,
  supportEmail: 'ct@nv0.kr',
  reason: '결제 상태를 아직 확인하지 못했습니다.'
};

function getSavedScan(){try{return JSON.parse(localStorage.getItem('nv0:lastScan')||'null');}catch{return null;}}
function list(value){return Array.isArray(value)?value:[];}
function won(value){return `${formatWon(Number(value||0))}원`;}
function normalizeCode(value){const key=String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'');const aliases={report:'Report',detailedreport:'Report',proreport:'Report',pro:'Report',basic:'Report',fixpack:'FixPack',fix:'FixPack',copypack:'FixPack',templatepack:'FixPack',industryguide:'FixPack',auto:'Auto',agency:'Auto',subscription:'Auto',free:'Free',freedemo:'Free'};return aliases[key]||String(value||'Report');}
function priceLabel(plan){return plan.price>0?`${won(plan.price)}${plan.period?` / ${escapeHtml(plan.period)}`:''}`:'무료';}
function groupLabel(plan){if(plan.code==='Free')return '입문';if(plan.code==='Report')return '분석';if(plan.code==='FixPack')return '실행';if(plan.code==='Auto')return '반복 관리';return plan.group==='subscription'?'정기':'선택';}
function ctaLabel(plan, paymentConfig=paymentFallback){if(plan.code==='Free')return '무료로 문제 확인하기';if(paymentConfig.paymentReady===false)return '결제 상태 확인하기';if(plan.code==='Report')return '상세 리포트 결제하기';if(plan.code==='FixPack')return '수정안까지 결제하기';if(plan.code==='Auto')return '자동 관리 결제하기';return plan.cta||'결제하기';}
function checkoutHref(plan,siteId='',paymentConfig=paymentFallback){if(plan.code==='Free')return '/products/veridion/demo';if(paymentConfig.paymentReady===false)return `/business-info?reason=payment-not-ready&plan=${encodeURIComponent(plan.code)}`;return `/checkout?plan=${encodeURIComponent(plan.code)}${siteId?`&siteId=${encodeURIComponent(siteId)}`:''}`;}
function normalizeOffer(offer){return {code:normalizeCode(offer.code),title:offer.title,price:Number(offer.price||offer.monthlyPrice||0),period:offer.period||'',summary:offer.summary||'',targetCustomer:offer.targetCustomer||'',deliverables:list(offer.deliverables||offer.features),operations:list(offer.operations),benefits:list(offer.benefits),smartReason:offer.smartReason||'',smartFitScore:offer.smartFitScore||'',group:offer.group||'',recommended:!!offer.recommended, referencePrice:Number(offer.referencePrice||0), valuePackWorth:Number(offer.valuePackWorth||0)};}
function basePlans(offers=[]){
  const paid = list(offers).map(normalizeOffer).filter(item=>['Report','FixPack','Auto'].includes(item.code));
  const free = {code:'Free',title:'Free Demo',price:0,period:'무료',group:'free',summary:'처음 확인하는 사용자를 위한 무료 요약 진단입니다.',targetCustomer:'사이트에 문제가 있는지 먼저 보고 싶은 분',deliverables:['하루 3회 요약 진단','핵심 문제 3개 요약','무료/유료 산출물 차이 안내'],operations:[],benefits:[]};
  const fallback = [
    {code:'Report',title:'Pro Report',price:69000,period:'1회',group:'one_time',summary:'문제의 근거와 우선순위를 정확히 알고 싶을 때 적합합니다.',targetCustomer:'내부 공유용 근거와 조치 순서가 필요한 분',deliverables:['확인 URL·본문 근거','우선순위와 적용 난이도','재점검 체크리스트']},
    {code:'FixPack',title:'FixPack',price:99000,period:'1회',group:'one_time',summary:'진단보다 실제 수정안이 필요한 분에게 가장 적합합니다.',targetCustomer:'오늘 바로 고객 안내 문구를 고치고 싶은 분',deliverables:['복사 가능한 전/후 문구','적용 위치와 주의 표현','FAQ·CTA 문구']},
    {code:'Auto',title:'Auto Care',price:299000,period:'월',group:'subscription',summary:'변경이 잦은 사이트를 계속 점검하고 관리할 때 적합합니다.',targetCustomer:'광고·이벤트·상세페이지 변경이 잦은 팀',deliverables:['정기 재진단','20분 주기 CTA 자동 발행','고위험 항목 우선 알림']}
  ];
  const merged = ['Report','FixPack','Auto'].map(code => paid.find(item=>item.code===code) || fallback.find(item=>item.code===code));
  return [free, ...merged];
}
function planTone(code){if(code==='FixPack')return 'gold';if(code==='Auto')return 'brand';if(code==='Report')return 'green';return 'gray';}
function paymentBadge(plan,paymentConfig){if(plan.code==='Free')return '<span class="pill gray">결제 없음</span>';if(paymentConfig.paymentReady)return '<span class="pill green">결제 가능</span>';return '<span class="pill gold">결제 확인 필요</span>';}
function card(plan,recommended,siteId,paymentConfig){
  const deliverables=list(plan.deliverables).slice(0,3);
  const href=checkoutHref(plan,siteId,paymentConfig);
  return `<article class="clean-plan-card ${recommended?'recommended':''}" data-plan-code="${escapeAttr(plan.code)}" data-price="${escapeAttr(String(plan.price||0))}" data-checkout-href="${escapeAttr(href)}">
    <div class="plan-card-top"><div><span class="pill ${planTone(plan.code)}">${escapeHtml(groupLabel(plan))}</span><h3>${escapeHtml(plan.title)}</h3></div><div class="plan-badges">${recommended?'<span class="pill gold">추천</span>':''}${paymentBadge(plan,paymentConfig)}</div></div>
    <div><div class="plan-price">${priceLabel(plan)}${plan.period&&plan.price>0?` <span>${plan.period==='월'?'월 결제':'1회 제공'}</span>`:''}</div><p class="plan-one-line">${escapeHtml(plan.summary)}</p></div>
    <div class="plan-fit"><b>이런 분께 추천</b><p>${escapeHtml(plan.targetCustomer||'상황에 맞는 결과물을 확인하고 싶은 분')}</p><b>받는 결과물</b><ul class="plan-deliverables">${deliverables.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    <div class="payment-microcopy">${plan.code==='Free'?'무료 진단은 결제 없이 바로 시작합니다.':'결제 버튼은 같은 상품코드와 금액으로 checkout-session API에 연결됩니다.'}</div>
    <div class="offer-actions"><a class="btn primary" href="${escapeAttr(href)}">${escapeHtml(ctaLabel(plan,paymentConfig))}</a>${plan.code!=='Free'?'<a class="btn secondary" href="/products/veridion/demo">먼저 무료 진단</a>':''}</div>
  </article>`;
}
function renderRecommended(plan,siteId,paymentConfig){
  if(!recommendedPlanCard||!plan)return;
  const focus = plan.code==='Auto'?'계속 바뀌는 사이트를 반복 관리해야 할 때 적합합니다.':plan.code==='Report'?'문제의 근거와 우선순위를 먼저 정리해야 할 때 적합합니다.':'문제를 확인하는 데서 끝내지 않고, 실제 고객 안내 문구까지 바로 고칠 때 가장 적합합니다.';
  const points = list(plan.deliverables).slice(0,3);
  recommendedPlanCard.innerHTML=`<span class="pill gold">가장 추천</span><h2>${escapeHtml(plan.title)}</h2><p>${escapeHtml(focus)}</p><ul>${points.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="payment-microcopy">상품코드 <b>${escapeHtml(plan.code)}</b> · 결제금액 <b>${priceLabel(plan)}</b> · 서버 결제 세션과 동일한 카탈로그 기준</div><div class="offer-actions"><a class="btn primary" href="${escapeAttr(checkoutHref(plan,siteId,paymentConfig))}">${escapeHtml(ctaLabel(plan,paymentConfig))}</a><a class="btn secondary" href="/products/veridion/demo">먼저 무료 진단</a></div>`;
}
function comparison(plan){
  const rows={
    Free:['기본 요약','일부 방향','없음','없음'],
    Report:['상세 근거','우선순위 제공','방향 제안','없음'],
    FixPack:['상세 근거','바로 적용형','전/후 문구 포함','없음'],
    Auto:['반복 확인','누적 개선','수정 후보 관리','정기 재진단·CTA 발행']
  };
  const r=rows[plan.code]||['확인','제공','선택','선택'];
  return `<tr><td><strong>${escapeHtml(plan.title)}</strong><span class="muted">${escapeHtml(groupLabel(plan))}</span></td>${r.map(item=>`<td>${escapeHtml(item)}</td>`).join('')}</tr>`;
}
function renderSmartAdvice(intelligence, orchestration){
  if(!smartPlanAdvice||(!intelligence?.headline&&!orchestration?.nextBestAction)){return;}
  const next=orchestration?.nextBestAction||{};
  const actions=Array.isArray(orchestration?.actionCards)?orchestration.actionCards.slice(0,3).map(item=>item.title):Array.isArray(intelligence.immediateActions)?intelligence.immediateActions.slice(0,3):[];
  const path=next.path||'/products/veridion/demo';
  smartPlanAdvice.innerHTML=`<article class="smart-advice-card"><div class="meta-row"><span class="pill brand">스마트 추천</span><span class="pill ${intelligence?.riskBand?.tone==='success'?'green':'gold'}">${escapeHtml(orchestration?.stage?.label||intelligence?.riskBand?.label||'추천')}</span></div><h3>${escapeHtml(next.title||intelligence?.headline||'다음 행동')}</h3><p>${escapeHtml(next.description||intelligence?.reason||'무료진단 결과 기준 다음 선택지를 정리했습니다.')}</p><div class="smart-action-grid">${actions.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div><div class="topnav"><a class="btn primary" href="${escapeAttr(path)}">${escapeHtml(next.cta||intelligence?.primaryCta||'추천 흐름 보기')}</a></div></article>`;
}
function renderPaymentReadiness(paymentConfig, plans){
  if(paymentReadiness){
    const ready = paymentConfig.paymentReady === true;
    const provider = paymentConfig.provider === 'portone_v2' ? 'PortOne' : (paymentConfig.provider || '결제 제공자');
    const label = ready ? `${provider} 결제 가능` : '결제 설정 확인 필요';
    const reason = ready ? '유료 플랜 버튼은 /checkout으로 이동하고, 결제 세션은 서버에서 상품코드·금액을 다시 검증합니다.' : (paymentConfig.reason || '결제 환경값 또는 사전등록 설정을 확인해야 합니다.');
    paymentReadiness.className = `payment-readiness-status ${ready?'is-ready':'is-warning'}`;
    paymentReadiness.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(reason)}</span><small>세션 생성: POST /api/public/checkout-session · 완료 검증: POST /api/public/payment/complete · 상태 확인: GET /api/public/payment/config</small>`;
  }
  if(paymentProductCodes){
    paymentProductCodes.innerHTML = plans.filter(item=>item.code!=='Free').map(plan=>`<article data-payment-plan-code="${escapeAttr(plan.code)}"><b>${escapeHtml(plan.code)}</b><strong>${escapeHtml(plan.title)}</strong><span>${priceLabel(plan)}</span><small>${escapeHtml(list(plan.deliverables)[0]||'결제 후 산출물 제공')}</small></article>`).join('');
  }
}
async function fetchPaymentConfig(){
  try{
    const res=await fetch('/api/public/payment/config');
    const data=await res.json().catch(()=>({}));
    if(!res.ok || data?.ok===false) throw new Error(data.error || '결제 상태를 확인하지 못했습니다.');
    return { ...paymentFallback, ...data };
  }catch(error){
    return { ...paymentFallback, reason:error.message || paymentFallback.reason };
  }
}

(async()=>{
  const paymentConfig = await fetchPaymentConfig();
  try{
    const saved=getSavedScan();
    const qs=new URLSearchParams(location.search);
    const siteId=qs.get('siteId')||saved?.siteId||'';
    const riskScore=Number(qs.get('riskScore')||saved?.riskScore||0);
    const [productsRes,plansRes]=await Promise.all([fetch(`/api/public/products?${qs.toString()}`),fetch(`/api/public/plans?${qs.toString()}`)]);
    const products=await productsRes.json();
    const plans=await plansRes.json();
    if(!products.ok)throw new Error(products.error||'상품 정보를 가져오지 못했습니다.');
    const offers=plans.smartOffers||products.offers||[];
    const intelligence=plans.intelligence||products.intelligence||{};
    const recommendedCode=normalizeCode(plans.recommendedPlan||intelligence.recommendedPlan||qs.get('recommended')||'FixPack');
    const allPlans=basePlans(offers);
    const recommendedPlan=allPlans.find(item=>item.code===recommendedCode)||allPlans.find(item=>item.code==='FixPack');
    renderPaymentReadiness(paymentConfig, allPlans);
    renderSmartAdvice(intelligence,plans.orchestration||products.orchestration);
    renderRecommended(recommendedPlan,siteId,paymentConfig);
    state.textContent=`선택 가능한 플랜 ${allPlans.length}개를 핵심 차이 기준으로 정리했습니다${riskScore?` · 최근 진단 점수 ${riskScore}점 반영`:''}.`;
    if(planCards) planCards.innerHTML=allPlans.map(item=>card(item,item.code===recommendedPlan.code,siteId,paymentConfig)).join('');
    if(comparisonRows) comparisonRows.innerHTML=allPlans.map(comparison).join('');
    if(oneTimeCards) oneTimeCards.textContent='1회성 플랜은 카드형 비교 영역으로 통합했습니다.';
    if(subscriptionCards) subscriptionCards.textContent='정기 점검 플랜은 카드형 비교 영역으로 통합했습니다.';
    if(certCards) certCards.textContent='조직용 플랜은 고객지원 안내로 분리했습니다.';
  }catch(error){
    const allPlans=basePlans([]);
    state.textContent=`상품 정보를 불러오지 못했습니다. 기본 플랜 비교를 표시합니다: ${error.message}`;
    const recommendedPlan=allPlans.find(item=>item.code==='FixPack');
    renderPaymentReadiness(paymentConfig, allPlans);
    renderRecommended(recommendedPlan,'',paymentConfig);
    if(planCards) planCards.innerHTML=allPlans.map(item=>card(item,item.code==='FixPack','',paymentConfig)).join('');
    if(comparisonRows) comparisonRows.innerHTML=allPlans.map(comparison).join('');
  }
})();
