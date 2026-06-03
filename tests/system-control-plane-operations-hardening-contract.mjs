import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENGINE_AGENT_ASSIGNMENT_MATRIX } from '../server/core/engine-agent-orchestrator.mjs';
import {
  SYSTEM_LAYER_REGISTRY,
  SYSTEM_PIPELINE_REGISTRY,
  appendSystemControlEvent,
  buildPublicSystemControlPlaneSummary,
  buildSystemControlPlaneSnapshot,
  normalizeSystemControlEventPayload,
  redactSensitiveText,
  runSystemControlPlanePackageAudit
} from '../server/core/system-control-plane.mjs';

const platformLayer = SYSTEM_LAYER_REGISTRY.find(layer => layer.id === 'platform-foundation-layer');
assert.deepEqual(platformLayer.engines, ['system-control-plane-engine']);
assert.equal(SYSTEM_LAYER_REGISTRY.every(layer => layer.engines.length > 0), true);
assert.equal(SYSTEM_PIPELINE_REGISTRY.every(pipeline => Array.isArray(pipeline.dependencies) && pipeline.ownerLayerId && pipeline.runbook), true);

assert.equal(redactSensitiveText('NV0_SESSION_SECRET=super-secret-value'), 'NV0_SESSION_SECRET=[REDACTED]');
assert.equal(redactSensitiveText('Bearer abc.def.ghi'), 'Bearer [REDACTED]');
assert.equal(redactSensitiveText('token nv0_Z1taFrEQcXF2pSEKJbKymzNJqNrLP1ZPuoLl'), 'token [REDACTED_TOKEN]');
assert.equal(redactSensitiveText('https://admin:password@example.com'), 'https://admin:[REDACTED]@example.com');

assert.throws(() => normalizeSystemControlEventPayload({ pipelineId: 'commerce-fulfillment-pipeline', layerId: 'experience-edge-layer' }), /책임 레이어/);
const safe = normalizeSystemControlEventPayload({ pipelineId: 'startup-security-pipeline', message: 'NV0_SESSION_SECRET=do-not-log Bearer abc.def.ghi' });
assert.equal(safe.message.includes('do-not-log'), false);
assert.equal(safe.message.includes('abc.def.ghi'), false);

const db = {};
const options = { id: 'scp_one', nowIso: () => '2026-06-03T00:01:00.000Z' };
const first = appendSystemControlEvent(db, { pipelineId: 'startup-security-pipeline', status: 'blocked', action: 'hold', correlationId: 'deploy-42', message: 'startup blocked' }, options);
const duplicate = appendSystemControlEvent(db, { pipelineId: 'startup-security-pipeline', status: 'blocked', action: 'hold', correlationId: 'deploy-42', message: 'startup blocked' }, { id: 'scp_two', nowIso: () => '2026-06-03T00:01:30.000Z' });
assert.equal(first.deduplicated, false);
assert.equal(duplicate.deduplicated, true);
assert.equal(db.systemControlEvents.length, 1);

appendSystemControlEvent(db, { pipelineId: 'content-indexing-pipeline', status: 'healthy', action: 'resume', message: 'content fresh' }, { id: 'scp_old', nowIso: () => '2026-06-03T00:00:00.000Z', dedupeWindowMs: 0 });
appendSystemControlEvent(db, { pipelineId: 'content-indexing-pipeline', status: 'healthy', action: 'resume', message: 'content newer' }, { id: 'scp_new', nowIso: () => '2026-06-03T00:03:00.000Z', dedupeWindowMs: 0 });
const snapshot = buildSystemControlPlaneSnapshot(db, { nowIso: () => '2026-06-03T00:04:00.000Z' });
assert.equal(snapshot.recentEvents[0].id, 'scp_new');
assert.equal(snapshot.runtime.activeIncidentCount > 0, true);
assert.equal(snapshot.pipelines.find(pipeline => pipeline.id === 'public-diagnosis-pipeline').status, 'blocked');
assert.deepEqual(snapshot.pipelines.find(pipeline => pipeline.id === 'public-diagnosis-pipeline').blockedBy, ['startup-security-pipeline']);
assert.equal(snapshot.layers.find(layer => layer.id === 'platform-foundation-layer').engineCount, 1);
assert.equal(snapshot.registry.agents.every(agent => agent.engineReady === true), true);

const publicSummary = buildPublicSystemControlPlaneSummary(db, { nowIso: () => '2026-06-03T00:05:00.000Z' });
const publicText = JSON.stringify(publicSummary);
assert.equal(publicText.includes('recentEvents'), false);
assert.equal(publicText.includes('startup blocked'), false);
assert.equal(publicText.includes('runtimeFile'), false);

const files = [
  'server/core/system-control-plane.mjs','server/core/engine-agent-orchestrator.mjs','server/routes/public.mjs','server/routes/admin.mjs',
  'tests/system-control-plane-contract.mjs','tests/system-control-plane-operations-hardening-contract.mjs','scripts/run-release-gate.mjs',
  'docs/SYSTEM_CONTROL_PLANE_KO.md','docs/SYSTEM_CONTROL_PLANE_OPERATIONS_HARDENING_KO.md'
];
const audit = runSystemControlPlanePackageAudit({
  files,
  routes: ['/api/public/system-control-plane','/api/admin/system-control-plane','/api/admin/system-control-plane/audit','/api/admin/system-control-plane/events'],
  sourceText: fs.readFileSync(new URL('../server/core/system-control-plane.mjs', import.meta.url), 'utf8'),
  releaseGateText: "system-control-plane-contract.mjs system-control-plane-operations-hardening-contract.mjs"
});
assert.equal(audit.ok, true);
assert.equal(audit.score, 100);
assert.equal(ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.length >= 56, true);
console.log(`system control plane operations hardening passed: ${SYSTEM_LAYER_REGISTRY.length} layers · ${SYSTEM_PIPELINE_REGISTRY.length} pipelines · ${db.systemControlEvents.length} stored events`);
