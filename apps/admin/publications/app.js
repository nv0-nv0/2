import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

const out = document.getElementById('pubState');
const publicationList = document.getElementById('publicationList');
const contentFeed = document.getElementById('contentFeed');

function formatBody(body = '') {
  const sections = String(body || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  if (!sections.length) return '<div class="muted">본문 없음</div>';
  return `<div class="admin-post-body">${sections.slice(0, 8).map(section => `<p>${escapeHtml(section).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
}
function card(title, meta, body) {
  return `<div class="result-card stack"><strong>${escapeHtml(title)}</strong><div class="muted">${escapeHtml(meta)}</div>${formatBody(body)}</div>`;
}

async function load() {
  const [pubRes, contentRes] = await Promise.all([
    adminFetch('/api/admin/publications'),
    adminFetch('/api/admin/system-items')
  ]);
  const pubData = await pubRes.json();
  const contentData = await contentRes.json();
  publicationList.innerHTML = (pubData.publications || []).slice(0, 10).map(item => card(item.title, `${item.type} · ${item.status} · ${item.createdAt || '-'} · ${item.qualityStandard || 'standard'}`, item.body || item.summary || item.ctaType || '')).join('') || '<div class="muted">발행물이 없습니다.</div>';
  contentFeed.innerHTML = (contentData.items || []).slice(0, 10).map(item => card(item.title, `${item.type} · ${item.createdAt || '-'}`, item.body || item.summary || '')).join('') || '<div class="muted">노출 콘텐츠가 없습니다.</div>';
}

document.getElementById('publishBtn').addEventListener('click', async()=>{
  const title=document.getElementById('publishTitle').value;
  const body=document.getElementById('publishBody').value;
  const res=await adminFetch('/api/admin/publications/publish-now',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title, body, type:'manual'})});
  out.textContent=JSON.stringify(await res.json(),null,2);
  load();
});

document.getElementById('ctaBtn').addEventListener('click', async()=>{
  const requestId=document.getElementById('requestId').value;
  const res=await adminFetch('/api/admin/publications/cta-generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId})});
  out.textContent=JSON.stringify(await res.json(),null,2);
  load();
});

load();
