import { escapeHtml, formatWon, renderList } from '/shared/html.js';
const state = document.getElementById('plansState');
const oneTimeCards = document.getElementById('oneTimeCards');
const subscriptionCards = document.getElementById('subscriptionCards');
const certCards = document.getElementById('certCards');
const comparisonRows = document.getElementById('comparisonRows');
const smartPlanAdvice = document.getElementById('smartPlanAdvice');
function getSavedScan(){try{return JSON.parse(localStorage.getItem('nv0:lastScan')||'null');}catch{return null;}}
function priceLabel(offer){return `${formatWon(offer.price)}원${offer.period?` / ${escapeHtml(offer.period)}`:''}`;}
function groupLabel(offer){if(offer.group==='one_time')return '1회 이용';if(offer.group==='subscription')return '정기 점검';if(offer.group==='annual')return '연간 인증';return '기업·대행사';}
function roleLabel(offer){if(offer.group==='one_time')return '필요한 결과물만 바로 확인';if(offer.group==='subscription')return '정기 점검과 결과 이력 확인';if(offer.group==='annual')return '인증 표시와 공개 인증 페이지 제공';return '여러 고객사 사이트 점검 지원';}
function discountLabel(offer){
  const reference=Number(offer.referencePrice||0);
  const price=Number(offer.price||0);
  if(reference>price&&price>0){
    const rate=Math.round((1-price/reference)*100);
    return `비교 기준가 대비 약 ${rate}% 낮게 구성`;
  }
  return offer.marketPosition||'상황별 실무 구성가 기준';
}
function valueLabel(offer){
  const worth=Number(offer.valuePackWorth||0);
  const price=Number(offer.price||0);
  if(worth>0&&price>0){
    const ratio=(worth/price).toFixed(1).replace(/\.0$/,'');
    return `구성 가치 약 ${ratio}배 기준 · 제공 범위 확인 필요`;
  }
  return offer.valueStandard||'제공 범위 확인 필요';
}
function fallbackOffers(){
  return [
    {code:'Report',group:'one_time',title:'상세 리포트',price:69000,period:'1회',summary:'무료 예비 점검 결과를 확인 URL·근거·우선순위가 있는 리포트로 확장합니다.',targetCustomer:'무엇부터 고칠지 판단해야 하는 운영자',deliverables:['탐지 점수 해설','확인 URL·근거','우선 조치 목록','재점검 기준'],operations:['결제 전 제공 범위 확인','디지털 산출물 제공 기준 확인'],benefits:['개선 순서 확인','내부 공유 가능'],cta:'상세 리포트 신청',referencePrice:100000,valuePackWorth:207000},
    {code:'FixPack',group:'one_time',title:'수정 문구안',price:99000,period:'1회',summary:'푸터·환불·개인정보·광고 문구를 바로 반영하기 쉬운 초안으로 정리합니다.',targetCustomer:'오늘 바로 문구를 고쳐야 하는 운영자',deliverables:['푸터 고지 문안','환불 안내 문구','광고 표현 완화안'],operations:['운영 정보 확인 후 적용','주의 표현 별도 표시'],benefits:['붙여넣기 쉬운 문구 확보','고객 오해 완화'],cta:'수정 문구안 받기',referencePrice:150000,valuePackWorth:297000},
    {code:'Auto',group:'subscription',title:'Auto 정기 케어',price:299000,period:'월',summary:'반복 점검과 게시판 자동 발행으로 운영감을 유지합니다.',targetCustomer:'광고·이벤트·상세페이지 변경이 잦은 팀',deliverables:['정기 재진단','게시판 자동 발행','고위험 항목 알림'],operations:['정기 점검 결과 제공','수정 후보는 확인 후 사용'],benefits:['반복 점검 부담 완화','운영감 유지'],cta:'Auto 시작',referencePrice:450000,valuePackWorth:897000}
  ];
}
function card(offer,recommended,siteId){const checkout=`/checkout?plan=${encodeURIComponent(offer.code)}${siteId?`&siteId=${encodeURIComponent(siteId)}`:''}`;const smart=offer.smartReason?`<div class="smart-fit"><b>추천 적합도 ${escapeHtml(offer.smartFitScore||'-')}점</b><p>${escapeHtml(offer.smartReason)}</p></div>`:'';return `<article class="card stack offer-card ${recommended?'plan-highlight':''}">${recommended?'<div class="recommended-ribbon">추천</div>':''}<div class="offer-head"><div><span class="pill ${offer.group==='subscription'?'':'gray'}">${groupLabel(offer)}</span><h3>${escapeHtml(offer.title)}</h3></div><span class="pill brand">${escapeHtml(offer.period||'1회')}</span></div><div><div class="offer-price">${priceLabel(offer)}</div><div class="offer-meta">${offer.period==='월'?`하루 약 ${formatWon(Math.ceil(offer.price/30))}원`:roleLabel(offer)}</div><div class="offer-value">${escapeHtml(discountLabel(offer))}</div><div class="offer-value muted">${escapeHtml(valueLabel(offer))}</div></div><p class="offer-summary">${escapeHtml(offer.summary)}</p>${smart}<details><summary>상세 구성 보기</summary><div class="offer-detail"><div><h4>추천 대상</h4><p class="muted">${escapeHtml(offer.targetCustomer||'-')}</p></div><div><h4>제공 내용</h4><ul>${renderList(offer.deliverables||[], '', item=>`<li>${escapeHtml(item)}</li>`)}</ul></div><div><h4>확인 안내</h4><ul>${renderList(offer.operations||[], '', item=>`<li>${escapeHtml(item)}</li>`)}</ul></div><div><h4>기대할 수 있는 도움</h4><ul>${renderList(offer.benefits||[], '', item=>`<li>${escapeHtml(item)}</li>`)}</ul></div></div></details><div class="offer-actions"><a class="btn primary" href="${checkout}">${escapeHtml(offer.cta||'시작하기')}</a><a class="btn secondary" href="/products/veridion/demo">무료 진단</a></div></article>`;}
function renderSmartAdvice(intelligence, orchestration){
  if(!smartPlanAdvice||(!intelligence?.headline&&!orchestration?.nextBestAction)){return;}
  const next=orchestration?.nextBestAction||{};
  const actions=Array.isArray(orchestration?.actionCards)?orchestration.actionCards.slice(0,3).map(item=>item.title):Array.isArray(intelligence.immediateActions)?intelligence.immediateActions.slice(0,3):[];
  const path=next.path||'/products/veridion/demo';
  smartPlanAdvice.innerHTML=`<article class="card stack smart-advice-card"><div class="meta-row"><span class="pill brand">스마트 추천</span><span class="pill ${intelligence?.riskBand?.tone==='success'?'green':'gold'}">${escapeHtml(orchestration?.stage?.label||intelligence?.riskBand?.label||'추천')}</span></div><h2>${escapeHtml(next.title||intelligence?.headline||'다음 행동을 정리했습니다.')}</h2><p>${escapeHtml(next.description||intelligence?.reason||'예비 점검 결과의 확인 범위와 다음 선택지를 정리했습니다.')}</p><div class="smart-action-grid">${actions.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div><div class="topnav"><a class="btn primary" href="${escapeHtml(path)}">${escapeHtml(next.cta||intelligence?.primaryCta||'추천 흐름 보기')}</a><a class="btn secondary" href="/portal">내 사이트 관리</a></div><small class="muted">${escapeHtml(orchestration?.caveat||intelligence?.caveat||'법률 자문이나 성과 보장을 대신하지 않습니다.')}</small></article>`;
}

(async()=>{try{const saved=getSavedScan();const qs=new URLSearchParams(location.search);const siteId=qs.get('siteId')||saved?.siteId||'';const riskScore=Number(qs.get('riskScore')||saved?.riskScore||0);const [productsRes,plansRes]=await Promise.all([fetch(`/api/public/products?${qs.toString()}`),fetch(`/api/public/plans?${qs.toString()}`)]);const products=await productsRes.json();const plans=await plansRes.json();if(!products.ok)throw new Error(products.error||'상품 정보를 가져오지 못했습니다.');const offers=plans.smartOffers||products.offers||[];const intelligence=plans.intelligence||products.intelligence||{};const recommended=plans.recommendedPlan||intelligence.recommendedPlan||'Pro';renderSmartAdvice(intelligence,plans.orchestration||products.orchestration);state.textContent=`선택 가능한 상품 ${offers.length}개를 확인할 수 있습니다${riskScore?` · 최근 진단 점수 ${riskScore}점 기준 추천 포함`:''}.`;oneTimeCards.innerHTML=offers.filter(o=>o.group==='one_time').map(o=>card(o,recommended===o.code,siteId)).join('');subscriptionCards.innerHTML=offers.filter(o=>o.group==='subscription').map(o=>card(o,recommended===o.code||(!offers.some(x=>x.code===recommended)&&o.code==='Pro'),siteId)).join('');certCards.innerHTML=offers.filter(o=>['annual','b2b'].includes(o.group)).map(o=>card(o,recommended===o.code,siteId)).join('');comparisonRows.innerHTML=offers.map(o=>`<tr><td><strong>${escapeHtml(o.title)}</strong><br><span class="muted">${escapeHtml(groupLabel(o))}</span></td><td class="price-cell">${priceLabel(o)}</td><td>${escapeHtml(o.smartReason||o.targetCustomer||'-')}</td><td>${roleLabel(o)}</td></tr>`).join('');}catch(error){const offers=fallbackOffers();state.textContent=`상품 정보를 불러오지 못했습니다. 기본 요금표를 표시합니다: ${error.message}`;oneTimeCards.innerHTML=offers.filter(o=>o.group==='one_time').map(o=>card(o,o.code==='Report','')).join('');subscriptionCards.innerHTML=offers.filter(o=>o.group==='subscription').map(o=>card(o,false,'')).join('');certCards.innerHTML='<div class="card muted">조직용 상품은 고객지원으로 문의해 주세요.</div>';comparisonRows.innerHTML=offers.map(o=>`<tr><td><strong>${escapeHtml(o.title)}</strong><br><span class="muted">${escapeHtml(groupLabel(o))}</span></td><td class="price-cell">${priceLabel(o)}</td><td>${escapeHtml(o.targetCustomer||'-')}</td><td>${roleLabel(o)}</td></tr>`).join('');}})();
