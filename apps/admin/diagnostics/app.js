import { adminFetch, adminLogout } from '/shared/admin-client.js';
import { escapeHtml } from '/shared/html.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);
const state = document.getElementById('diagState');
const out = document.getElementById('diagOut');
const readyBadge = document.getElementById('readyBadge');
const emailBadge = document.getElementById('emailBadge');
const integrationBadge = document.getElementById('integrationBadge');
const checkList = document.getElementById('checkList');

function setState(message) {
  if (state) state.textContent = message;
}

function renderJson(payload) {
  if (out) out.textContent = JSON.stringify(payload, null, 2);
}

function badgeText(ok, yes, no) {
  return ok ? yes : no;
}

function renderSummary(payload) {
  const readiness = payload.readiness || {};
  const checklist = payload.launchChecklist || {};
  const email = payload.emailOutbox || {};
  const integrations = payload.integrations || {};
  if (readyBadge) readyBadge.textContent = badgeText(readiness.ready, '준비 양호', `보완 ${checklist.blockers?.length || 0}건`);
  if (emailBadge) emailBadge.textContent = `${email.queued || 0} 대기 · ${email.failed || 0} 실패`;
  if (integrationBadge) {
    const scan = integrations.scanProvider?.urlConfigured ? '스캔 URL 연결' : '스캔 URL 필요';
    const smtp = integrations.email?.smtpConfigured ? 'SMTP 설정' : 'SMTP 필요';
    integrationBadge.textContent = `${scan} / ${smtp}`;
  }
  if (checkList) {
    const checks = checklist.checks || [];
    checkList.innerHTML = checks.slice(0, 12).map(item => `<div class="mini-check ${item.ok ? 'ok' : 'warn'}"><b>${item.ok ? '통과' : '확인'}</b><span>${escapeHtml(item.label)}</span></div>`).join('') || '<div class="muted">체크리스트가 없습니다.</div>';
  }
}

async function load() {
  try {
    const res = await adminFetch('/api/admin/diagnostics');
    const payload = await res.json();
    renderSummary(payload);
    renderJson(payload);
    setState('진단 정보를 최신 상태로 불러왔습니다.');
  } catch (error) {
    renderJson({ ok: false, message: '진단 정보를 불러오지 못했습니다.', reason: error.message });
    setState('진단 조회 실패. 관리자 세션과 서버 상태를 확인하세요.');
  }
}

async function runAction(endpoint, label, pick, options = {}) {
  try {
    setState(`${label} 실행 중입니다.`);
    const res = await adminFetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(options.body || {}) });
    const payload = await res.json();
    renderJson(payload);
    setState(pick(payload));
    await load();
  } catch (error) {
    setState(`${label} 실패. ${error.message}`);
    renderJson({ ok: false, action: label, message: error.message });
  }
}

document.getElementById('backupBtn')?.addEventListener('click', () => runAction('/api/admin/backups/run', '백업', payload => payload.backup?.dbTarget || '백업 결과 경로를 확인하세요.'));
document.getElementById('opsReportBtn')?.addEventListener('click', () => runAction('/api/admin/ops-report/run', '운영 리포트 생성', payload => payload.snapshot?.filePath || '운영 리포트 결과를 확인하세요.'));
document.getElementById('selfTestBtn')?.addEventListener('click', () => runAction('/api/admin/ops/self-test', '운영 자가검수', payload => payload.probes?.emailOutboxId ? `자가검수 큐 생성: ${payload.probes.emailOutboxId}` : '자가검수 결과를 확인하세요.'));
document.getElementById('emailDryRunBtn')?.addEventListener('click', () => runAction('/api/admin/email-outbox/process', '이메일 큐 미리보기', payload => `미리보기 ${payload.result?.processed || 0}건`, { body: { dryRun: true, limit: 20 } }));
document.getElementById('emailLiveBtn')?.addEventListener('click', () => runAction('/api/admin/email-outbox/process', 'SMTP 큐 실처리', payload => `큐 처리 ${payload.result?.processed || 0}건`, { body: { dryRun: false, limit: 20 } }));
document.getElementById('pruneBtn')?.addEventListener('click', () => runAction('/api/admin/maintenance/prune', '런타임 정리', payload => JSON.stringify(payload.pruned || {})));

load();
