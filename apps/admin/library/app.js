import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml, safeUrl } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

const out=document.getElementById('libraryState');
const libraryList=document.getElementById('libraryList');
const libraryFeed=document.getElementById('libraryFeed');

function card(title, meta, body) {
  const fileUrl = safeUrl(body || '');
  const content = fileUrl ? `<a href="${fileUrl}" target="_blank" rel="noreferrer">${escapeHtml(fileUrl)}</a>` : escapeHtml(body);
  return `<div class="result-card stack"><strong>${escapeHtml(title)}</strong><div class="muted">${escapeHtml(meta)}</div><div>${content}</div></div>`;
}

async function load(){
  const [libRes, feedRes] = await Promise.all([
    adminFetch('/api/admin/library'),
    adminFetch('/api/admin/system-items')
  ]);
  const libData = await libRes.json();
  const feedData = await feedRes.json();
  libraryList.innerHTML = (libData.library || []).slice(0, 20).map(item => card(item.title, `${item.type || 'document'} · ${item.createdAt || '-'}${item.filename ? ` · ${item.filename}` : ''}`, item.body || item.fileUrl || '')).join('') || '<div class="muted">등록된 자료가 없습니다.</div>';
  libraryFeed.innerHTML = (feedData.items || []).filter(item => String(item.type || '').startsWith('library')).slice(0, 10).map(item => card(item.title, `${item.type} · ${item.createdAt || '-'}`, item.summary || item.body || '')).join('') || '<div class="muted">공개 피드 반영 자료가 없습니다.</div>';
}

document.getElementById('postBtn').addEventListener('click', async()=>{ const title=document.getElementById('postTitle').value; const body=document.getElementById('postBody').value; const res=await adminFetch('/api/admin/library/post',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,body})}); out.textContent=JSON.stringify(await res.json(),null,2); load(); });
document.getElementById('uploadBtn').addEventListener('click', async()=>{ const file=document.getElementById('fileInput').files[0]; if(!file){ out.textContent='파일을 선택하세요.'; return; } const fd=new FormData(); fd.append('title', document.getElementById('fileTitle').value); fd.append('file', file); const res=await adminFetch('/api/admin/library/upload',{method:'POST',body:fd}); out.textContent=JSON.stringify(await res.json(),null,2); load(); });

load();
