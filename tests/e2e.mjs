import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const port = Number(process.env.NV0_TEST_PORT || (3200 + Math.floor(Math.random() * 1000)));
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NV0_ADMIN_KEY: 'test-key',
    NV0_TRUST_PROXY_HEADERS: 'true',
    NODE_ENV: 'production',
    NV0_TARGET_FETCH_ENABLED: 'false'
  },
  stdio: 'inherit'
});
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitForServer() {
  const deadline = Date.now() + 10000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw lastError || new Error('server did not become ready');
}
await waitForServer();

async function j(url, options={}) {
  const res = await fetch(`http://127.0.0.1:${port}${url}`, options);
  const text = await res.text();
  let data = null; try { data = JSON.parse(text); } catch {}
  return { res, text, data };
}

try {
  let r = await fetch(`http://127.0.0.1:${port}/`);
  const home = await r.text();
  assert.equal(home.includes('관리자 키 게이트'), false);
  assert.equal(home.includes('/admin'), false);

  let x = await j('/healthz');
  assert.equal(x.res.status, 200);
  x = await j('/readyz');
  assert.equal(x.res.status, 200);
  assert.equal(x.data.ok, true);
  assert.equal(x.data.ready, true);

  r = await fetch(`http://127.0.0.1:${port}/demo`);
  assert.equal(r.status, 200);
  assert.match(String(r.headers.get('cache-control')), /max-age=60/);

  r = await fetch(`http://127.0.0.1:${port}/documents`);
  assert.equal(r.status, 200);
  const documentsHtml = await r.text();
  assert.ok(documentsHtml.includes('문서 생성'));

  r = await fetch(`http://127.0.0.1:${port}/guides`);
  assert.equal(r.status, 200);

  x = await j('/api/public/scan', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ target:'https://example.com' }) });
  assert.equal(x.res.status, 200);
  assert.equal(x.data.ok, true);
  assert.ok(x.data.result.riskScore >= 0);
  assert.ok(Array.isArray(x.data.result.detailFindings));
  assert.ok(typeof x.data.result.siteId === 'string');
  assert.ok(x.data.result.siteProfile?.siteType);
  assert.ok(x.data.result.categoryScores);
  assert.equal(x.data.result.ruleVersion != null, true);
  const requestId = x.data.result.requestId;
  const scannedSiteId = x.data.result.siteId;

  x = await j('/api/public/board');
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.posts));

  let contentFeed = await j('/api/public/content');
  assert.equal(contentFeed.data.ok, true);
  assert.ok(Array.isArray(contentFeed.data.items));

  let cachedScan = await j('/api/public/scan', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ target:'https://example.com' }) });
  assert.equal(cachedScan.res.status, 200);
  assert.equal(cachedScan.data.result.cached, true);
  assert.ok(cachedScan.data.result.cachedFromRequestId);
  assert.ok(cachedScan.data.result.siteProfile?.industry);
  assert.ok(cachedScan.data.result.categoryScores);

  x = await j(`/api/public/plans?siteId=${encodeURIComponent(scannedSiteId)}`);
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.plans));

  x = await j('/api/public/document-preview', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ businessName:'베리디언', representative:'홍길동', domain:'veridion.local', contactEmail:'ops@veridion.local', subscriptionBilling:true }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.preview.documents.length, 4);
  assert.match(x.data.preview.documents[0].content, /개인정보처리방침/);

  x = await j('/api/public/checkout-session', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ plan:'Auto', siteId: scannedSiteId, buyerName:'홍길동', buyerEmail:'owner@example.com' }) });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.order.id);
  const checkoutOrderId = x.data.order.id;
  assert.equal(x.data.paymentSession.provider, 'demo');

  x = await j('/api/public/order?orderId=' + encodeURIComponent(checkoutOrderId));
  assert.equal(x.data.ok, true);
  assert.equal(x.data.order.id, checkoutOrderId);

  x = await j('/api/public/payment/complete', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ orderId: checkoutOrderId }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.order.status, 'paid');

  x = await j('/api/public/portal-summary?orderId=' + encodeURIComponent(checkoutOrderId));
  assert.equal(x.data.ok, true);
  assert.equal(x.data.summary.order.id, checkoutOrderId);
  assert.ok(x.data.summary.guidance);

  x = await j('/api/public/guidance?siteId=' + encodeURIComponent(x.data.summary.site.id));
  assert.equal(x.data.ok, true);
  assert.match(x.data.guidance.content, /운영 지침/);

  x = await j('/api/public/scan', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ target:'example.com' }) });
  assert.equal(x.res.status, 400);

  let badJson = await fetch(`http://127.0.0.1:${port}/api/public/document-preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{'
  });
  assert.equal(badJson.status, 400);
  let badJsonBody = await badJson.json();
  assert.equal(badJsonBody.ok, false);

  r = await fetch(`http://127.0.0.1:${port}/admin`);
  const gate = await r.text();
  assert.ok(gate.includes('관리자 키 게이트'));
  assert.ok(gate.includes('autocomplete="off"'));
  assert.equal(r.headers.get('cache-control'), 'no-store');

  r = await fetch(`http://127.0.0.1:${port}/admin/console`, { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/admin');

  x = await j('/api/admin/session', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ key:'test-key' }) });
  assert.equal(x.res.status, 200);
  const cookie = x.res.headers.get('set-cookie');
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('Secure'));
  const csrf = x.data.csrfToken;
  assert.ok(csrf);

  r = await fetch(`http://127.0.0.1:${port}/admin/console`, { headers: { cookie } });
  assert.equal(r.status, 200);
  const consoleHtml = await r.text();
  assert.ok(consoleHtml.includes('관리자 허브'));

  for (const page of ['/admin/publications', '/admin/library', '/admin/orders', '/admin/diagnostics', '/admin/settings']) {
    const pageRes = await fetch(`http://127.0.0.1:${port}${page}`, { headers: { cookie } });
    assert.equal(pageRes.status, 200);
  }

  x = await j('/api/admin/status', { headers: { cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.counts.auditLogs >= 1);
  assert.ok(x.data.counts.sites >= 1);

  x = await j('/api/admin/sites', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.sites));
  assert.ok(Array.isArray(x.data.guidanceDocuments));

  x = await j('/api/admin/rules', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.rules.length >= 5);

  x = await j('/api/admin/rules', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ code:'CONTACT-CHANNEL', category:'고객지원', title:'고객센터 연락수단', severity:11, penaltyMax:2500000, fixTemplate:'푸터와 문의영역에 이메일/전화번호를 추가합니다.' }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.rule.code, 'CONTACT-CHANNEL');

  x = await j('/api/admin/legal-updates', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.legalUpdates));

  x = await j('/api/admin/auto-fix-jobs', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.autoFixJobs));
  const firstFix = x.data.autoFixJobs[0]?.id;
  if (firstFix) {
    x = await j('/api/admin/auto-fix-jobs/approve', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ id:firstFix }) });
    assert.equal(x.data.ok, true);
    assert.equal(x.data.job.status, 'approved');
    x = await j('/api/admin/auto-fix-jobs/rollback', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ id:firstFix }) });
    assert.equal(x.data.ok, true);
    assert.equal(x.data.job.status, 'rolled_back');
  }

  x = await j('/api/admin/publications', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.publications));

  x = await j('/api/admin/publications/publish-now', { method:'POST', headers:{ 'content-type':'application/json', cookie }, body: JSON.stringify({ title:'차단 테스트' }) });
  assert.equal(x.res.status, 403);

  x = await j('/api/admin/publications/publish-now', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ title:'테스트 발행', body:'본문' }) });
  assert.equal(x.data.ok, true);

  x = await j('/api/admin/system-items', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.items));

  x = await j('/api/admin/system-items', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ type:'board', title:'통합 게시글', body:'본문', visibility:'public' }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.type, 'board');

  x = await j('/api/admin/publications/cta-generate', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ requestId }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.publication.type, 'cta');

  x = await j('/api/admin/orders', { headers:{ cookie } });
  const firstOrder = x.data.orders[0].id;
  assert.ok(Array.isArray(x.data.sites));
  x = await j('/api/admin/orders/status', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ id:firstOrder, status:'paid' }) });
  assert.equal(x.data.order.status, 'paid');
  x = await j('/api/admin/orders/advance', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ id:firstOrder }) });
  assert.ok(x.data.order.stage);

  x = await j('/api/admin/subscriptions', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.subscriptions));

  const firstSiteId = (await j('/api/admin/sites', { headers:{ cookie } })).data.sites[0].id;
  x = await j('/api/admin/subscriptions/upsert', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ siteId:firstSiteId, plan:'Pro', status:'active' }) });
  assert.equal(x.data.ok, true);
  assert.equal(x.data.subscription.plan, 'Pro');

  x = await j('/api/admin/library', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.library));

  x = await j('/api/admin/library/post', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ title:'자료실 테스트', body:'본문', type:'document' }) });
  assert.equal(x.data.ok, true);

  const fd = new FormData();
  fd.append('title', '업로드 테스트');
  fd.append('file', new Blob(['hello'], { type:'text/plain' }), 'hello.txt');
  let res = await fetch(`http://127.0.0.1:${port}/api/admin/library/upload`, { method:'POST', headers:{ cookie, 'x-nv0-csrf': csrf }, body: fd });
  let data = await res.json();
  assert.equal(data.ok, true);

  x = await j('/api/admin/settings', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ ctaAutopublishEnabled: true, legalWatchEnabled:true, autoFixMode:'approval_required', defaultJurisdiction:'KR', defaultAlertChannel:'email', supportEmail:'admin@example.com' }) });
  assert.equal(x.data.settings.ctaAutopublishEnabled, true);

  x = await j('/api/admin/diagnostics', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.recentAuditLogs));

  x = await j('/api/admin/ops-report', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.report.counts.sites >= 1);

  x = await j('/api/admin/ops-report/run', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({}) });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.snapshot.filePath.includes('/runtime/reports/'));

  x = await j('/api/admin/backups/run', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({}) });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.backup.dbTarget.includes('/runtime/backups/'));

  let ops = await j('/api/admin/ops', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ action:'backup' }) });
  assert.equal(ops.data.ok, true);
  assert.equal(ops.data.action, 'backup');

  x = await j('/api/admin/backups', { headers:{ cookie } });
  assert.equal(x.data.ok, true);
  assert.ok(Array.isArray(x.data.backups));
  assert.ok(x.data.backups.length >= 1);
  const backupName = x.data.backups[0].name;

  x = await j('/api/admin/backups/restore', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({ name: backupName }) });
  assert.equal(x.data.ok, true);
  assert.ok(x.data.restored.restoredFrom.includes(backupName));

  x = await j('/api/admin/maintenance/prune', { method:'POST', headers:{ 'content-type':'application/json', cookie, 'x-nv0-csrf': csrf }, body: JSON.stringify({}) });
  assert.equal(x.data.ok, true);
  assert.ok(typeof x.data.pruned.keep === 'number');

  await j('/api/admin/logout', { method:'POST', headers:{ cookie, 'x-nv0-csrf': csrf } });
  r = await fetch(`http://127.0.0.1:${port}/admin/console`, { headers:{ cookie }, redirect:'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/admin');
  process.stdout.write('E2E passed\n');
} finally {
  child.kill('SIGTERM');
}
await new Promise(resolve => setTimeout(resolve, 100));
process.exit(0);
