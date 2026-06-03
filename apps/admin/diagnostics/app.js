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

async function waitForJob(jobId, label, pick) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const res = await adminFetch(`/api/admin/jobs/status?id=${encodeURIComponent(jobId)}`);
    const payload = await res.json();
    const job = payload.job || {};
    renderJson(payload);
    if (job.status === 'succeeded') { setState(pick(job.result || {})); await load(); return job; }
    if (job.status === 'failed') throw new Error(job.error || `${label} 처리에 실패했습니다.`);
    setState(`${label} 예약 완료 · 처리 상태를 확인하고 있습니다. (${job.status || 'queued'})`);
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  throw new Error(`${label} 처리 시간이 길어지고 있습니다. 작업 목록에서 상태를 확인하세요.`);
}

async function runQueuedAction(endpoint, label, pick, options = {}) {
  try {
    setState(`${label} 작업을 예약하고 있습니다.`);
    const body = { ...(options.body || {}), mode: 'async_enqueue' };
    const res = await adminFetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (!payload.jobId) throw new Error('운영 작업 번호를 받지 못했습니다.');
    renderJson(payload);
    await waitForJob(payload.jobId, label, pick);
  } catch (error) {
    setState(`${label} 실패. ${error.message}`);
    renderJson({ ok: false, action: label, message: error.message });
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

document.getElementById('backupBtn')?.addEventListener('click', () => runQueuedAction('/api/admin/backups/run', '보관본', payload => payload.backup?.dbTarget || '보관본 결과 경로를 확인하세요.'));
document.getElementById('opsReportBtn')?.addEventListener('click', () => runQueuedAction('/api/admin/ops-report/run', '점검 리포트 생성', payload => payload.snapshot?.filePath || '점검 리포트 결과를 확인하세요.'));
document.getElementById('selfTestBtn')?.addEventListener('click', () => runAction('/api/admin/ops/self-test', '운영 자가 점검', payload => payload.probes?.emailOutboxId ? `자가 점검 큐 생성: ${payload.probes.emailOutboxId}` : '자가 점검 결과를 확인하세요.'));
document.getElementById('emailDryRunBtn')?.addEventListener('click', () => runQueuedAction('/api/admin/email-outbox/process', '메일 처리 미리보기', payload => `미리보기 ${payload.result?.processed || 0}건`, { body: { dryRun: true, limit: 20 } }));
document.getElementById('emailLiveBtn')?.addEventListener('click', () => runQueuedAction('/api/admin/email-outbox/process', '메일 실처리', payload => `큐 처리 ${payload.result?.processed || 0}건`, { body: { dryRun: false, limit: 20 } }));
document.getElementById('pruneBtn')?.addEventListener('click', () => runQueuedAction('/api/admin/maintenance/prune', '서비스 환경 정리', payload => JSON.stringify(payload.pruned || {})));

load();
