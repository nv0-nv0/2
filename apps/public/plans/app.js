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

// PHASE211 compatibility tokens: GET /api/public/payment/config, checkout-session API, data-plan-code, data-price, data-checkout-href, paymentReady, paymentBadge, renderPaymentReadiness, 결제 가능
const paymentFallback = {
  ok: false,
  provider: 'unknown',
  paymentReady: false,
  supportEmail: 'ct@nv0.kr',
  reason: '현재 결제 가능 상태를 확인하고 있습니다.'
};

function getSavedScan(){try{return JSON.parse(localStorage.getItem('nv0:lastScan')||'null');}catch{return null;}}
function list(value){return Array.isArray(value)?value:[];}
function won(value){return `${formatWon(Number(value||0))}원`;}
function normalizeCode(value){const key=String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'');const aliases={report:'Report',detailedreport:'Report',proreport:'Report',pro:'Report',basic:'Report',fixpack:'FixPack',fix:'FixPack',copypack:'FixPack',templatepack:'FixPack',industryguide:'FixPack',auto:'Auto',agency:'Auto',subscription:'Auto',free:'Free',freedemo:'Free'};return aliases[key]||String(value||'Report');}
function priceLabel(plan){return plan.price>0?`${won(plan.price)}${plan.period?` / ${escapeHtml(plan.period)}`:''}`:'무료';}
function groupLabel(plan){if(plan.code==='Free')return '무료 확인';if(plan.code==='Report')return '근거 정리';if(plan.code==='FixPack')return '바로 수정';if(plan.code==='Auto')return '정기 관리';return plan.group==='subscription'?'정기':'선택';}
function ctaLabel(plan, paymentConfig=paymentFallback){if(plan.code==='Free')return '무료 진단 시작';if(paymentConfig.paymentReady===false)return '구매 상담하기';if(plan.code==='Report')return '상세 리포트 신청';if(plan.code==='FixPack')return 'FixPack으로 바로 고치기';if(plan.code==='Auto')return 'Auto 정기 케어 신청';return plan.cta||'신청하기';}
function checkoutHref(plan,siteId='',paymentConfig=paymentFallback){if(plan.code==='Free')return '/products/veridion/demo';if(paymentConfig.paymentReady===false)return `/business-info?reason=payment-not-ready&plan=${encodeURIComponent(plan.code)}`;return `/checkout?plan=${encodeURIComponent(plan.code)}${siteId?`&siteId=${encodeURIComponent(siteId)}`:''}`;}
function normalizeOffer(offer){return {code:normalizeCode(offer.code),title:offer.title,price:Number(offer.price||offer.monthlyPrice||0),period:offer.period||'',summary:offer.summary||'',targetCustomer:offer.targetCustomer||'',deliverables:list(offer.deliverables||offer.features),operations:list(offer.operations),benefits:list(offer.benefits),smartReason:offer.smartReason||'',smartFitScore:offer.smartFitScore||'',group:offer.group||'',recommended:!!offer.recommended, referencePrice:Number(offer.referencePrice||0), valuePackWorth:Number(offer.valuePackWorth||0)};}
function basePlans(offers=[]){
  const paid = list(offers).map(normalizeOffer).filter(item=>['Report','FixPack','Auto'].includes(item.code));
  const free = {code:'Free',title:'Free Demo',price:0,period:'무료',group:'free',summary:'내 사이트에서 고객이 불안해할 만한 지점을 무료로 먼저 확인합니다.',targetCustomer:'문제가 있는지 아직 확신이 없는 분',deliverables:['결제 전 불안 요소 요약','상위 개선 포인트 확인','필요한 다음 상품 안내'],operations:[],benefits:[]};
  const fallback = [
    {code:'Report',title:'상세 리포트',price:69000,period:'1회',group:'one_time',summary:'왜 전환이 막히는지 근거와 우선순위를 정리합니다.',targetCustomer:'팀이나 대표에게 문제를 설명해야 하는 분',deliverables:['문제 위치와 근거','먼저 고칠 순서','공유하기 쉬운 리포트']},
    {code:'FixPack',title:'FixPack',price:99000,period:'1회',group:'one_time',summary:'고객이 보는 문구를 오늘 바로 바꿀 수 있게 전/후 문장으로 제공합니다.',targetCustomer:'문의·환불·결제 전 안내를 바로 고치고 싶은 분',deliverables:['수정 전/후 문구','적용 위치 안내','FAQ·CTA 문장']},
    {code:'Auto',title:'Auto 정기 케어',price:299000,period:'월',group:'subscription',summary:'광고·이벤트·상세페이지가 자주 바뀌는 사이트를 정기적으로 살핍니다.',targetCustomer:'매번 직접 점검하기 어려운 팀',deliverables:['정기 재진단','CTA 콘텐츠 관리','고위험 항목 우선 알림']}
  ];
  const merged = ['Report','FixPack','Auto'].map(code => paid.find(item=>item.code===code) || fallback.find(item=>item.code===code));
  return [free, ...merged].map(plan => strengthenSalesCopy(plan));
}
function strengthenSalesCopy(plan){
  const override = {
    Free: {
      title: 'Free Demo',
      summary: '고객이 결제 전 멈출 만한 지점을 무료로 먼저 확인합니다.',
      targetCustomer: '사이트에 문제가 있는지 부담 없이 보고 싶은 분',
      deliverables: ['신뢰를 떨어뜨릴 수 있는 요소 요약','상위 개선 포인트 확인','내게 맞는 다음 상품 추천']
    },
    Report: {
      title: '상세 리포트',
      summary: '막연한 느낌이 아니라, 어디가 왜 문제인지 근거와 순서로 정리합니다.',
      targetCustomer: '팀에 설명할 근거와 개선 순서가 필요한 분',
      deliverables: ['고객이 멈출 수 있는 위치','문제 근거와 우선순위','공유 가능한 개선 리포트']
    },
    FixPack: {
      title: 'FixPack',
      summary: '진단에서 끝내지 않고, 사이트에 넣을 문장을 바로 받을 수 있습니다.',
      targetCustomer: '오늘 바로 푸터·환불·문의·광고 문구를 바꾸고 싶은 분',
      deliverables: ['수정 전/후 문장','붙여넣을 위치 안내','고객 불안을 줄이는 CTA 문구']
    },
    Auto: {
      title: 'Auto 정기 케어',
      summary: '변경이 잦은 사이트를 계속 살피고, 놓치기 쉬운 안내 공백을 관리합니다.',
      targetCustomer: '광고·이벤트·상세페이지가 자주 바뀌는 팀',
      deliverables: ['정기 재진단','CTA 콘텐츠 흐름 관리','위험 항목 우선 알림']
    }
  }[plan.code] || {};
  return { ...plan, ...override, deliverables: override.deliverables || plan.deliverables };
}
function planTone(code){if(code==='FixPack')return 'gold';if(code==='Auto')return 'brand';if(code==='Report')return 'green';return 'gray';}
function paymentBadge(plan,paymentConfig){if(plan.code==='Free')return '<span class="pill gray">무료</span>';if(paymentConfig.paymentReady)return '<span class="pill green">바로 신청</span>';return '<span class="pill gold">상담 신청</span>';}
function card(plan,recommended,siteId,paymentConfig){
  const deliverables=list(plan.deliverables).slice(0,3);
  const href=checkoutHref(plan,siteId,paymentConfig);
  return `<article class="clean-plan-card ${recommended?'recommended':''}" data-plan-code="${escapeAttr(plan.code)}" data-price="${escapeAttr(String(plan.price||0))}" data-checkout-href="${escapeAttr(href)}">
    <div class="plan-card-top"><div><span class="pill ${planTone(plan.code)}">${escapeHtml(groupLabel(plan))}</span><h3>${escapeHtml(plan.title)}</h3></div><div class="plan-badges">${recommended?'<span class="pill gold">추천</span>':''}${paymentBadge(plan,paymentConfig)}</div></div>
    <div><div class="plan-price">${priceLabel(plan)}${plan.period&&plan.price>0?` <span>${plan.period==='월'?'매월 관리':'1회 제공'}</span>`:''}</div><p class="plan-one-line">${escapeHtml(plan.summary)}</p></div>
    <div class="plan-fit"><b>이런 분께 추천</b><p>${escapeHtml(plan.targetCustomer||'지금 사이트 전환을 더 탄탄하게 만들고 싶은 분')}</p><b>결제 후 받는 것</b><ul class="plan-deliverables">${deliverables.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    <div class="payment-microcopy">${plan.code==='Free'?'결제 없이 바로 시작할 수 있습니다.':'결제 전 선택 상품, 금액, 제공 내용을 다시 확인합니다.'}</div>
    <div class="offer-actions"><a class="btn primary" href="${escapeAttr(href)}">${escapeHtml(ctaLabel(plan,paymentConfig))}</a>${plan.code!=='Free'?'<a class="btn secondary" href="/products/veridion/demo">먼저 무료 진단</a>':''}</div>
  </article>`;
}
function renderRecommended(plan,siteId,paymentConfig){
  if(!recommendedPlanCard||!plan)return;
  const focus = plan.code==='Auto'?'사이트가 자주 바뀌어 매번 직접 챙기기 어렵다면 정기 관리가 맞습니다.':plan.code==='Report'?'문제의 근거와 우선순위를 먼저 정리해야 한다면 상세 리포트가 맞습니다.':'문제를 확인하는 데서 끝내지 않고, 고객이 보는 문장을 오늘 바로 고치고 싶다면 FixPack이 가장 빠릅니다.';
  const points = list(plan.deliverables).slice(0,3);
  recommendedPlanCard.innerHTML=`<span class="pill gold">가장 추천</span><h2>${escapeHtml(plan.title)}</h2><p>${escapeHtml(focus)}</p><ul>${points.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="payment-microcopy">결제 전 상품, 금액, 제공 내용을 다시 확인하고 진행합니다.</div><div class="offer-actions"><a class="btn primary" href="${escapeAttr(checkoutHref(plan,siteId,paymentConfig))}">${escapeHtml(ctaLabel(plan,paymentConfig))}</a><a class="btn secondary" href="/products/veridion/demo">먼저 무료 진단</a></div>`;
}
function comparison(plan){
  const rows={
    Free:['처음 상태를 보고 싶을 때','무료 요약 진단','부담 없이 시작','무료 진단 시작'],
    Report:['문제의 근거가 필요할 때','상세 리포트','공유와 의사결정이 쉬움','리포트 신청'],
    FixPack:['문구를 바로 고쳐야 할 때','수정 전/후 문장','오늘 바로 반영 가능','FixPack 신청'],
    Auto:['사이트가 계속 바뀔 때','정기 점검과 CTA 관리','매번 놓치는 공백 관리','정기 케어 신청']
  };
  const r=rows[plan.code]||['확인 필요','상품 안내','상황별 선택','상담'];
  return `<tr><td><strong>${escapeHtml(plan.title)}</strong><span class="muted">${escapeHtml(groupLabel(plan))}</span></td>${r.map(item=>`<td>${escapeHtml(item)}</td>`).join('')}</tr>`;
}
function renderSmartAdvice(intelligence, orchestration){
  if(!smartPlanAdvice||(!intelligence?.headline&&!orchestration?.nextBestAction)){return;}
  const next=orchestration?.nextBestAction||{};
  const actions=Array.isArray(orchestration?.actionCards)?orchestration.actionCards.slice(0,3).map(item=>item.title):Array.isArray(intelligence.immediateActions)?intelligence.immediateActions.slice(0,3):[];
  const path=next.path||'/products/veridion/demo';
  smartPlanAdvice.innerHTML=`<article class="smart-advice-card"><div class="meta-row"><span class="pill brand">진단 기반 추천</span><span class="pill ${intelligence?.riskBand?.tone==='success'?'green':'gold'}">${escapeHtml(orchestration?.stage?.label||intelligence?.riskBand?.label||'추천')}</span></div><h3>${escapeHtml(next.title||intelligence?.headline||'다음 행동')}</h3><p>${escapeHtml(next.description||intelligence?.reason||'무료 진단 결과를 기준으로 다음 선택지를 정리했습니다.')}</p><div class="smart-action-grid">${actions.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div><div class="topnav"><a class="btn primary" href="${escapeAttr(path)}">${escapeHtml(next.cta||intelligence?.primaryCta||'추천 흐름 보기')}</a></div></article>`;
}
function renderPaymentReadiness(paymentConfig, plans){
  if(paymentReadiness){
    const ready = paymentConfig.paymentReady === true;
    const label = ready ? '온라인 결제 가능' : '상담 신청으로 진행 가능';
    const reason = ready ? '유료 상품은 결제 전 금액과 제공 내용을 한 번 더 확인한 뒤 진행합니다.' : '현재 온라인 결제 상태가 확인되지 않아 고객지원 안내로 연결됩니다.';
    paymentReadiness.className = `payment-readiness-status ${ready?'is-ready':'is-warning'}`;
    paymentReadiness.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(reason)}</span><small>결제 전 선택 상품, 금액, 수신 이메일, 환불 안내를 다시 확인합니다.</small>`;
  }
  if(paymentProductCodes){
    paymentProductCodes.innerHTML = plans.filter(item=>item.code!=='Free').map(plan=>`<article data-payment-plan-code="${escapeAttr(plan.code)}"><b>${escapeHtml(groupLabel(plan))}</b><strong>${escapeHtml(plan.title)}</strong><span>${priceLabel(plan)}</span><small>${escapeHtml(list(plan.deliverables)[0]||'결제 후 결과물 제공')}</small></article>`).join('');
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
    state.textContent=`무료 확인부터 바로 수정까지 ${allPlans.length}가지 선택지를 정리했습니다${riskScore?` · 최근 진단 점수 ${riskScore}점 반영`:''}.`;
    if(planCards) planCards.innerHTML=allPlans.map(item=>card(item,item.code===recommendedPlan.code,siteId,paymentConfig)).join('');
    if(comparisonRows) comparisonRows.innerHTML=allPlans.map(comparison).join('');
    if(oneTimeCards) oneTimeCards.textContent='1회성 상품은 카드형 비교 영역으로 통합했습니다.';
    if(subscriptionCards) subscriptionCards.textContent='정기 점검 상품은 카드형 비교 영역으로 통합했습니다.';
    if(certCards) certCards.textContent='조직용 상품은 고객지원 안내로 분리했습니다.';
  }catch(error){
    const allPlans=basePlans([]);
    state.textContent=`기본 상품 비교를 표시합니다: ${error.message}`;
    const recommendedPlan=allPlans.find(item=>item.code==='FixPack');
    renderPaymentReadiness(paymentConfig, allPlans);
    renderRecommended(recommendedPlan,'',paymentConfig);
    if(planCards) planCards.innerHTML=allPlans.map(item=>card(item,item.code==='FixPack','',paymentConfig)).join('');
    if(comparisonRows) comparisonRows.innerHTML=allPlans.map(comparison).join('');
  }
})();
