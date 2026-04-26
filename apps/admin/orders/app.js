import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml, formatWon } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);
const out=document.getElementById('ordersState');
const table=document.getElementById('siteTable');

function button(label, attrs='') {
  return `<button type="button" class="secondary" ${attrs}>${escapeHtml(label)}</button>`;
}

async function postJson(url, payload){
  const res = await adminFetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  return res.json();
}

async function load(){
  const [ordersRes, fixesRes] = await Promise.all([
    adminFetch('/api/admin/orders'),
    adminFetch('/api/admin/auto-fix-jobs')
  ]);
  const data=await ordersRes.json();
  const fixData=await fixesRes.json();
  const subMap = new Map((data.subscriptions||[]).map(item => [item.siteId, item]));
  const orderCards = (data.orders||[]).slice(0, 6).map(order => `
    <div class="result-card stack">
      <div class="meta-row"><strong>${escapeHtml(order.customer)}</strong><span class="pill">${escapeHtml(order.plan || '-')}</span></div>
      <div class="muted">${escapeHtml(order.id)} · ${escapeHtml(order.status)} · ${escapeHtml(order.stage)} · ${formatWon(order.amount || 0)}원</div>
      <div>사이트: ${escapeHtml(order.domain || order.siteId || '미연결')}</div>
      <div class="topnav">
        ${button('상태 paid', `data-action="status" data-id="${escapeHtml(order.id)}" data-status="paid"`)}
        ${button('단계 진행', `data-action="advance" data-id="${escapeHtml(order.id)}"`)}
      </div>
    </div>`).join('') || '<div class="muted">최근 주문이 없습니다. 결제 세션 생성 여부와 결제 공급자 설정을 확인하세요.</div>';
  const siteCards = (data.sites||[]).map(site => {
    const sub = subMap.get(site.id);
    return `<div class="result-card stack"><strong>${escapeHtml(site.domain)}</strong><div class="muted">${escapeHtml(site.latestRiskScore)}점 · ${escapeHtml(site.latestRiskLevel)}</div><div>플랜: ${escapeHtml(sub?.plan || '-')} / 상태: ${escapeHtml(sub?.status || '-')}</div></div>`;
  }).join('') || '<div class="muted">등록 사이트가 없습니다. 무료 진단 저장 또는 관리자 재스캔으로 사이트를 추가하세요.</div>';
  const fixCards = (fixData.autoFixJobs || []).slice(0, 8).map(job => `<div class="result-card stack"><strong>${escapeHtml(job.title)}</strong><div class="muted">${escapeHtml(job.status)}</div><div>${escapeHtml(job.patchSummary)}</div><div class="topnav">${job.status === 'pending' ? button('승인', `data-action="approve-fix" data-id="${escapeHtml(job.id)}"`) : ''}${job.rollbackToken && job.status !== 'rolled_back' ? button('롤백', `data-action="rollback-fix" data-id="${escapeHtml(job.id)}"`) : ''}</div></div>`).join('') || '<div class="muted">자동수정 대기 작업이 없습니다. Fix/Auto 주문 또는 진단 결과 기반 수정 요청을 확인하세요.</div>';
  table.innerHTML = `
    <div class="stack">
      <h3>최근 주문</h3>
      ${orderCards}
      <h3>사이트 / 구독 현황</h3>
      ${siteCards}
      <h3>자동수정 대기</h3>
      ${fixCards}
    </div>`;

  table.querySelectorAll('button[data-action="status"]').forEach(btn => btn.addEventListener('click', async () => {
    const data = await postJson('/api/admin/orders/status', { id: btn.dataset.id, status: btn.dataset.status });
    out.textContent = `${data.order.id} 상태가 ${data.order.status}로 변경되었습니다.`;
    load();
  }));
  table.querySelectorAll('button[data-action="advance"]').forEach(btn => btn.addEventListener('click', async () => {
    const data = await postJson('/api/admin/orders/advance', { id: btn.dataset.id });
    out.textContent = `${data.order.id} 단계가 ${data.order.stage}로 이동했습니다.`;
    load();
  }));
  table.querySelectorAll('button[data-action="approve-fix"]').forEach(btn => btn.addEventListener('click', async () => {
    const data = await postJson('/api/admin/auto-fix-jobs/approve', { id: btn.dataset.id });
    out.textContent = `${data.job.title} 자동수정이 승인되었습니다.`;
    load();
  }));
  table.querySelectorAll('button[data-action="rollback-fix"]').forEach(btn => btn.addEventListener('click', async () => {
    const data = await postJson('/api/admin/auto-fix-jobs/rollback', { id: btn.dataset.id });
    out.textContent = `${data.job.title} 자동수정이 롤백되었습니다.`;
    load();
  }));
}

document.getElementById('rescanBtn').addEventListener('click', async()=>{
  const target=document.getElementById('rescanUrl').value.trim();
  const res=await adminFetch('/api/admin/sites/rescan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target})});
  const data=await res.json();
  out.textContent = `${data.result.target} 재스캔 완료 · ${data.result.riskScore}점 / ${data.result.totalFindings}개 항목`;
  load();
});
load();
