import {
  STITCH_DESIGN_SYSTEM,
  STITCH_EXPERIENCE_VERSION,
  STITCH_FUNCTION_BINDINGS,
  STITCH_PROTOTYPE_MAP,
  STITCH_ROUTE_SURFACES,
  STITCH_STATE_REQUIREMENTS,
  buildStitchRouteManifestSummary
} from '../../shared/stitch-route-manifest.mjs';

export const STITCH_EXPERIENCE_PIPELINE_VERSION = 'stitch-experience-pipeline-v1.0.0';

const PIPELINE_LAYERS = Object.freeze([
  Object.freeze({ id: 'design-system-layer', engine: 'stitch-design-system-engine', agent: 'design-token-governance-agent', responsibility: 'Stitch 디자인 토큰을 로컬 CSS 공통 자산으로 고정' }),
  Object.freeze({ id: 'route-experience-layer', engine: 'stitch-route-experience-engine', agent: 'route-surface-mapping-agent', responsibility: '10개 시안과 실제 공개·관리자 라우트를 추적 가능하게 연결' }),
  Object.freeze({ id: 'state-coverage-layer', engine: 'stitch-state-coverage-engine', agent: 'interaction-state-coverage-agent', responsibility: '기본, 포커스, 로딩, 오류, 빈 상태, 권한 거부, 모바일 상태를 검수' }),
  Object.freeze({ id: 'function-binding-layer', engine: 'stitch-function-binding-engine', agent: 'function-handoff-agent', responsibility: '진단, 요금제, 결제, 포털, 인사이트, 관리자 기능 흐름을 연결' }),
  Object.freeze({ id: 'release-contract-layer', engine: 'stitch-release-contract-engine', agent: 'stitch-regression-gate-agent', responsibility: '정적 계약 검사와 통합 테스트를 최종 릴리즈 게이트에 연결' })
]);

const REQUIRED_CSS_TOKENS = Object.freeze([
  '--si-bg', '--si-surface', '--si-primary', '--si-primary-2', '--si-cta', '--si-mint', '--si-navy', '--si-danger', '--si-warn', '--si-line'
]);
const REQUIRED_PIPELINE_FILES = Object.freeze([
  'shared/stitch-institutional.css',
  'shared/stitch-route-manifest.mjs',
  'server/core/stitch-experience-pipeline.mjs',
  'scripts/check-stitch-experience-pipeline.mjs',
  'tests/stitch-experience-pipeline.mjs',
  'docs/STITCH_EXPERIENCE_PIPELINE.md'
]);

const uniq = values => [...new Set(values)];
const asSet = values => new Set(Array.isArray(values) ? values : []);
const normalizeHtmlByFile = value => value && typeof value === 'object' ? value : {};

export function buildStitchExperiencePipelineSnapshot(options = {}) {
  const summary = buildStitchRouteManifestSummary();
  const surfaceRoutes = STITCH_ROUTE_SURFACES.map(item => item.route);
  const boundRoutes = uniq(STITCH_FUNCTION_BINDINGS.flatMap(item => item.routes));
  const unboundSurfaceRoutes = surfaceRoutes.filter(route => !boundRoutes.includes(route));
  const mappedPrototypeIds = asSet(summary.mappedPrototypeIds);
  const unmappedPrototypeIds = STITCH_PROTOTYPE_MAP.map(item => item.id).filter(id => !mappedPrototypeIds.has(id));
  const ready = summary.allPrototypesMapped
    && PIPELINE_LAYERS.length === 5
    && STITCH_STATE_REQUIREMENTS.length >= 10
    && STITCH_FUNCTION_BINDINGS.length >= 8
    && unmappedPrototypeIds.length === 0;
  return {
    ok: ready,
    ready,
    version: STITCH_EXPERIENCE_PIPELINE_VERSION,
    experienceVersion: STITCH_EXPERIENCE_VERSION,
    designSystem: STITCH_DESIGN_SYSTEM,
    layers: PIPELINE_LAYERS,
    prototypes: STITCH_PROTOTYPE_MAP,
    surfaces: STITCH_ROUTE_SURFACES,
    stateRequirements: STITCH_STATE_REQUIREMENTS,
    functionBindings: STITCH_FUNCTION_BINDINGS,
    metrics: {
      layerCount: PIPELINE_LAYERS.length,
      prototypeCount: summary.prototypeCount,
      mappedPrototypeCount: summary.mappedPrototypeCount,
      surfaceCount: summary.surfaceCount,
      functionBindingCount: summary.functionBindingCount,
      stateRequirementCount: summary.stateRequirementCount,
      routeKinds: summary.routeKinds
    },
    audit: {
      allPrototypesMapped: summary.allPrototypesMapped,
      unmappedPrototypeIds,
      unboundSurfaceRoutes,
      releaseGateConnected: options.releaseGateConnected !== false,
      customerPublicExposure: false
    }
  };
}

export function runStitchExperiencePipelinePackageAudit(input = {}) {
  const files = asSet(input.files);
  const htmlByFile = normalizeHtmlByFile(input.htmlByFile);
  const cssText = String(input.cssText || '');
  const publicRouteSource = String(input.publicRouteSource || '');
  const packageJson = input.packageJson || {};
  const releaseGateSource = String(input.releaseGateSource || '');
  const htmlFiles = Object.keys(htmlByFile);
  const mappedFiles = STITCH_ROUTE_SURFACES.flatMap(surface => [surface.file, ...(surface.mirrors || [])]);
  const checks = [
    { key: 'pipeline-files', pass: REQUIRED_PIPELINE_FILES.every(file => files.has(file)), detail: REQUIRED_PIPELINE_FILES.filter(file => !files.has(file)) },
    { key: 'prototype-map-10', pass: STITCH_PROTOTYPE_MAP.length === 10 && buildStitchRouteManifestSummary().allPrototypesMapped, detail: STITCH_PROTOTYPE_MAP.map(item => item.id) },
    { key: 'route-surfaces', pass: mappedFiles.every(file => files.has(file)), detail: mappedFiles.filter(file => !files.has(file)) },
    { key: 'all-html-design-tag', pass: htmlFiles.length >= 30 && htmlFiles.every(file => /data-design-system="executive-trust-framework"/.test(htmlByFile[file])), detail: htmlFiles.filter(file => !/data-design-system="executive-trust-framework"/.test(htmlByFile[file])) },
    { key: 'all-html-local-css', pass: htmlFiles.length >= 30 && htmlFiles.every(file => /\/shared\/stitch-institutional\.css\?v=2\.7\.1/.test(htmlByFile[file])), detail: htmlFiles.filter(file => !/\/shared\/stitch-institutional\.css\?v=2\.7\.1/.test(htmlByFile[file])) },
    { key: 'prototype-surface-markers', pass: STITCH_ROUTE_SURFACES.filter(item => item.screenIds.length).every(item => item.screenIds.every(id => String(htmlByFile[item.file] || '').includes(id))), detail: STITCH_ROUTE_SURFACES.filter(item => item.screenIds.length).map(item => ({ file: item.file, screenIds: item.screenIds })) },
    { key: 'css-token-contract', pass: REQUIRED_CSS_TOKENS.every(token => cssText.includes(token)), detail: REQUIRED_CSS_TOKENS.filter(token => !cssText.includes(token)) },
    { key: 'local-css-only', pass: htmlFiles.every(file => !/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com/i.test(htmlByFile[file])), detail: htmlFiles.filter(file => /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com/i.test(htmlByFile[file])) },
    { key: 'public-api-isolated', pass: publicRouteSource.includes("'/api/public/stitch-experience-pipeline'") && publicRouteSource.includes('customerHiddenOperationalEndpoints'), detail: 'internal pipeline endpoint must stay behind test-only public API isolation' },
    { key: 'release-gate-connected', pass: releaseGateSource.includes("['check:stitch-experience-pipeline', 'node', ['scripts/check-stitch-experience-pipeline.mjs']]") && releaseGateSource.includes("['test:stitch-experience-pipeline', 'node', ['tests/stitch-experience-pipeline.mjs']]"), detail: 'direct node steps must be wired into scripts/run-release-gate.mjs' }
  ];
  const failed = checks.filter(item => !item.pass);
  return { ok: failed.length === 0, version: STITCH_EXPERIENCE_PIPELINE_VERSION, checked: checks.length, failed: failed.length, checks, summary: buildStitchRouteManifestSummary() };
}
