import assert from 'node:assert/strict';
import { buildExperienceOrchestratorSnapshot, buildExperienceControlPlane, runExperienceOrchestratorAudit, EXPERIENCE_ORCHESTRATOR_VERSION } from '../server/core/experience-orchestrator.mjs';

const db = {
  settings: { businessProfile: { tradeName: 'VERIDION', domain: 'https://example.com' } },
  sites: [{ id: 'site_1', domain: 'https://example.com', industry: 'shopping', latestRiskScore: 72, lastScanAt: new Date().toISOString() }],
  scans: [{
    siteId: 'site_1',
    requestId: 'scan_1',
    target: 'https://example.com',
    industry: 'shopping',
    riskScore: 72,
    fetched: true,
    topFindings: ['환불 기준', '개인정보 링크', '고객지원 안내'],
    detailFindings: [
      { code: 'refund', title: '환불 기준 위치', priority: 'P0', certainty: 'high' },
      { code: 'privacy', title: '개인정보 링크 노출', priority: 'P1', certainty: 'medium', manualReviewRequired: true },
      { code: 'support', title: '고객지원 경로 가독성', priority: 'P2', certainty: 'high' }
    ],
    evidenceSummary: {
      coverageScore: 78,
      confidenceScore: 74,
      attemptedPageCount: 4,
      successfulPageCount: 4,
      scannedPages: [{ status: 200, contentLength: 1500 }]
    }
  }],
  boards: [{ id: 'board_1', title: '인사이트', summary: '요약', createdAt: new Date().toISOString(), visibility: 'public', autoPublished: true, type: 'column' }],
  publications: [{ id: 'pub_1', title: '인사이트', summary: '요약', createdAt: new Date().toISOString(), visibility: 'public', autoPublished: true, type: 'column' }],
  orders: [{ id: 'ord_1', siteId: 'site_1', status: 'paid', plan: 'Report', amount: 149000, email: 'team@example.com', createdAt: new Date().toISOString() }],
  subscriptions: [{ id: 'sub_1', siteId: 'site_1', status: 'active', plan: 'Monitoring', monthlyPrice: 99000, currentPeriodEnd: new Date(Date.now() + 5 * 86400000).toISOString() }],
  refundRequests: [],
  emailOutbox: [],
  autoFixJobs: [{ id: 'fix_1', siteId: 'site_1', status: 'pending', title: '푸터 보강' }]
};

const snapshot = buildExperienceOrchestratorSnapshot(db, { nowIso: new Date().toISOString() });
assert.equal(snapshot.ok, true);
assert.equal(snapshot.version, EXPERIENCE_ORCHESTRATOR_VERSION);
assert.equal(snapshot.stages.length, 6);
assert.ok(snapshot.userSatisfactionScore >= 0 && snapshot.userSatisfactionScore <= 100);
assert.ok(snapshot.pillars.length >= 6);
assert.ok(snapshot.hardeningPrograms.length >= 4);
assert.equal(snapshot.site.id, 'site_1');

const controlPlane = buildExperienceControlPlane(db, { nowIso: new Date().toISOString() });
assert.equal(controlPlane.version, EXPERIENCE_ORCHESTRATOR_VERSION);
assert.equal(controlPlane.pipelineLayer.stageCount, 6);
assert.ok(Array.isArray(controlPlane.engineLayer.domains));

const audit = runExperienceOrchestratorAudit({
  files: ['server/core/experience-orchestrator.mjs', 'tests/experience-orchestrator.mjs'],
  packageJson: { scripts: { 'test:experience-orchestrator': 'node tests/experience-orchestrator.mjs' } },
  routes: ['/api/public/experience-orchestrator', '/api/admin/experience-orchestrator', '/api/admin/experience-orchestrator/audit'],
  sourceText: `${buildExperienceOrchestratorSnapshot.toString()}\n${buildExperienceControlPlane.toString()}\n${EXPERIENCE_ORCHESTRATOR_VERSION}`
});
assert.equal(audit.ok, true);
assert.equal(audit.score, 100);

console.log(JSON.stringify({ ok: true, version: EXPERIENCE_ORCHESTRATOR_VERSION, stages: snapshot.stages.length, score: snapshot.userSatisfactionScore }, null, 2));
