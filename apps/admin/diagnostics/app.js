import { adminFetch, adminLogout } from '/shared/admin-client.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);
const state = document.getElementById('diagState');
const out = document.getElementById('diagOut');

function setState(message) {
  if (state) state.textContent = message;
}

function renderJson(payload) {
  if (out) out.textContent = JSON.stringify(payload, null, 2);
}

async function load() {
  try {
    const res = await adminFetch('/api/admin/diagnostics');
    renderJson(await res.json());
    setState('진단 정보를 최신 상태로 불러왔습니다.');
  } catch (error) {
    renderJson({ ok: false, message: '진단 정보를 불러오지 못했습니다.', reason: error.message });
    setState('진단 조회 실패. 관리자 세션과 서버 상태를 확인하세요.');
  }
}

async function runAction(endpoint, label, pick) {
  try {
    setState(`${label} 실행 중입니다.`);
    const res = await adminFetch(endpoint, { method: 'POST' });
    const payload = await res.json();
    setState(pick(payload));
    await load();
  } catch (error) {
    setState(`${label} 실패. ${error.message}`);
    renderJson({ ok: false, action: label, message: error.message });
  }
}

document.getElementById('backupBtn')?.addEventListener('click', () => runAction('/api/admin/backups/run', '백업', payload => payload.backup?.dbTarget || '백업 결과 경로를 확인하세요.'));
document.getElementById('opsReportBtn')?.addEventListener('click', () => runAction('/api/admin/ops-report/run', '운영 리포트 생성', payload => payload.snapshot?.filePath || '운영 리포트 결과를 확인하세요.'));
document.getElementById('pruneBtn')?.addEventListener('click', () => runAction('/api/admin/maintenance/prune', '런타임 정리', payload => JSON.stringify(payload.pruned || {})));

load();
