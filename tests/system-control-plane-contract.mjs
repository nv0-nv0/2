import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENGINE_AGENT_ASSIGNMENT_MATRIX, applyEngineAgentGate } from '../server/core/engine-agent-orchestrator.mjs';
import {
  SYSTEM_CONTROL_PLANE_VERSION,
  SYSTEM_LAYER_REGISTRY,
  SYSTEM_PIPELINE_REGISTRY,
  appendSystemControlEvent,
  buildPublicSystemControlPlaneSummary,
  buildSystemControlPlaneSnapshot,
  normalizeSystemControlEventPayload,
  runSystemControlPlanePackageAudit
} from '../server/core/system-control-plane.mjs';

assert.match(SYSTEM_CONTROL_PLANE_VERSION, /^system-control-plane-v1/);
assert.ok(SYSTEM_LAYER_REGISTRY.length >= 10);
assert.ok(SYSTEM_PIPELINE_REGISTRY.length >= 12);
assert.ok(ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.length >= 56);
assert.ok(ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.length >= 117);

const allEngineIds = ENGINE_AGENT_ASSIGNMENT_MATRIX.engines.map(engine => engine.id);
const mappedEngineIds = SYSTEM_LAYER_REGISTRY.flatMap(layer => layer.engines);
assert.deepEqual([...new Set(mappedEngineIds)].sort(), allEngineIds.sort());
assert.equal(mappedEngineIds.length, new Set(mappedEngineIds).size);
const pipelineEngineIds = new Set(SYSTEM_PIPELINE_REGISTRY.flatMap(pipeline => pipeline.stages));
assert.deepEqual(allEngineIds.filter(id => !pipelineEngineIds.has(id)), []);

const db = {};
const initial = buildSystemControlPlaneSnapshot(db, { nowIso: () => '2026-06-03T00:00:00.000Z' });
assert.equal(initial.ok, true);
assert.equal(initial.score, 100);
assert.equal(initial.structure.layerCount, SYSTEM_LAYER_REGISTRY.length);
assert.equal(initial.structure.pipelineCount, SYSTEM_PIPELINE_REGISTRY.length);
assert.equal(initial.structure.blockers.length, 0);

const normalized = normalizeSystemControlEventPayload({ pipelineId: 'commerce-fulfillment-pipeline', status: 'blocked', severity: 'critical', action: 'hold', message: 'provider timeout', metrics: { attempts: 3 } });
assert.equal(normalized.layerId, 'commerce-lifecycle-layer');
assert.equal(normalized.status, 'blocked');
assert.throws(() => normalizeSystemControlEventPayload({ pipelineId: 'unknown-pipeline' }), /pipelineId/);
appendSystemControlEvent(db, normalized, { id: 'scp_test', nowIso: () => '2026-06-03T00:01:00.000Z' });
const blocked = buildSystemControlPlaneSnapshot(db, { nowIso: () => '2026-06-03T00:02:00.000Z' });
assert.equal(blocked.ok, false);
assert.equal(blocked.runtime.blockedPipelineCount, 1);
assert.equal(blocked.recentEvents[0].id, 'scp_test');
const publicSummary = buildPublicSystemControlPlaneSummary(db, { nowIso: () => '2026-06-03T00:03:00.000Z' });
assert.equal(publicSummary.publicSafe, true);
assert.equal(JSON.stringify(publicSummary).includes('runtimeFile'), false);
assert.equal(JSON.stringify(publicSummary).includes('serverFile'), false);
assert.equal(JSON.stringify(publicSummary).includes('ownerAgents'), false);

const gate = applyEngineAgentGate('system.control.event', { pipelineId: 'commerce-fulfillment-pipeline', layerId: 'commerce-lifecycle-layer', status: 'blocked' });
assert.equal(gate.ok, true);

const files = [
  'server/core/system-control-plane.mjs',
  'server/core/engine-agent-orchestrator.mjs',
  'server/routes/public.mjs',
  'server/routes/admin.mjs',
  'tests/system-control-plane-contract.mjs',
  'scripts/run-release-gate.mjs',
  'docs/SYSTEM_CONTROL_PLANE_KO.md'
];
const audit = runSystemControlPlanePackageAudit({
  files,
  routes: ['/api/public/system-control-plane','/api/admin/system-control-plane','/api/admin/system-control-plane/audit','/api/admin/system-control-plane/events'],
  sourceText: fs.readFileSync(new URL('../server/core/system-control-plane.mjs', import.meta.url), 'utf8'),
  releaseGateText: "['test:system-control-plane', 'node', ['tests/system-control-plane-contract.mjs']]"
});
assert.equal(audit.ok, true);
assert.equal(audit.score, 100);

console.log(`system control plane contract passed: ${SYSTEM_LAYER_REGISTRY.length} layers · ${SYSTEM_PIPELINE_REGISTRY.length} pipelines · ${allEngineIds.length} engines · ${ENGINE_AGENT_ASSIGNMENT_MATRIX.agents.length} agents`);
