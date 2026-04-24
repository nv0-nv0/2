import { adminFetch, adminLogout } from '/shared/admin-client.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);
const state=document.getElementById('diagState');
const out=document.getElementById('diagOut');
async function load(){ const res=await adminFetch('/api/admin/diagnostics'); out.textContent=JSON.stringify(await res.json(),null,2); }
document.getElementById('backupBtn').addEventListener('click', async()=>{ const res=await adminFetch('/api/admin/backups/run',{method:'POST'}); state.textContent=(await res.json()).backup.dbTarget; load(); });
document.getElementById('opsReportBtn').addEventListener('click', async()=>{ const res=await adminFetch('/api/admin/ops-report/run',{method:'POST'}); state.textContent=(await res.json()).snapshot.filePath; load(); });
document.getElementById('pruneBtn').addEventListener('click', async()=>{ const res=await adminFetch('/api/admin/maintenance/prune',{method:'POST'}); state.textContent=JSON.stringify((await res.json()).pruned); load(); });
load();
