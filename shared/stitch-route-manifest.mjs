export const STITCH_EXPERIENCE_VERSION = '2.7.0-executive-trust-framework';

export const STITCH_DESIGN_SYSTEM = Object.freeze({
  id: 'executive-trust-framework',
  brand: 'VERIDION',
  source: 'stitch_/executive_trust_framework/DESIGN.md',
  intent: 'institutional-authoritative-analytical',
  colorTokens: Object.freeze({
    background: '#f9f9ff',
    surface: '#ffffff',
    primary: '#00342b',
    primaryContainer: '#004d40',
    ctaGreen: '#00695c',
    highlightMint: '#a7f3d0',
    infoNavy: '#1e3a8a',
    dangerRed: '#b91c1c',
    warningAmber: '#b45309',
    borderMuted: '#dce5e2',
    textSlate: '#475569'
  }),
  layout: Object.freeze({ grid: '12-column', maxWidth: 1280, baseSpacing: 8, mobileMargin: 16, desktopMargin: 48 }),
  componentPolicy: Object.freeze({ cornerRadius: 4, largeContainerRadius: 8, pillButtons: false, zebraTables: false, localCssOnly: true })
});

export const STITCH_PROTOTYPE_MAP = Object.freeze([
  Object.freeze({ id: 'veridion_1', surface: 'admin-dashboard-ko', targetRoutes: ['/admin/console'], viewport: 'desktop', purpose: '관리자 KPI, 최근 진단, 운영 상태' }),
  Object.freeze({ id: 'veridion_2', surface: 'admin-dashboard-en-reference', targetRoutes: ['/admin/console'], viewport: 'desktop', purpose: '관리자 정보 밀도와 요약 카드 참고안' }),
  Object.freeze({ id: 'veridion_3', surface: 'plans', targetRoutes: ['/plans'], viewport: 'desktop', purpose: '기관형 요금제 비교와 CTA' }),
  Object.freeze({ id: 'veridion_4', surface: 'diagnosis-result-mobile', targetRoutes: ['/products/veridion/demo'], viewport: 'mobile', purpose: '무료 진단 결과 모바일 흐름' }),
  Object.freeze({ id: 'veridion_5', surface: 'insights', targetRoutes: ['/board', '/insights'], viewport: 'desktop', purpose: '인사이트 허브와 콘텐츠 카드' }),
  Object.freeze({ id: 'veridion_6', surface: 'auth', targetRoutes: ['/auth'], viewport: 'desktop', purpose: '기관형 인증 게이트' }),
  Object.freeze({ id: 'veridion_7', surface: 'diagnosis-result-desktop', targetRoutes: ['/products/veridion/demo'], viewport: 'desktop', purpose: '무료 진단 결과 데스크톱 흐름' }),
  Object.freeze({ id: 'veridion_8', surface: 'home-longform', targetRoutes: ['/'], viewport: 'desktop-longform', purpose: '홈 랜딩과 진단 CTA' }),
  Object.freeze({ id: 'veridion_9', surface: 'home-compact', targetRoutes: ['/'], viewport: 'desktop', purpose: '홈 랜딩 핵심 가치 카드 참고안' }),
  Object.freeze({ id: 'veridion_10', surface: 'customer-portal', targetRoutes: ['/portal'], viewport: 'desktop', purpose: '고객 포털, 요금제, 최근 결과' })
]);

export const STITCH_STATE_REQUIREMENTS = Object.freeze([
  'default', 'hover', 'focus-visible', 'disabled', 'loading', 'error', 'success', 'empty', 'permission-denied', 'responsive-mobile'
]);

export const STITCH_FUNCTION_BINDINGS = Object.freeze([
  Object.freeze({ id: 'public-navigation', routes: ['/', '/products/veridion/demo', '/board', '/plans', '/portal'], responsibility: '공개 메뉴와 현재 위치 표시' }),
  Object.freeze({ id: 'single-source-diagnosis', routes: ['/', '/products/veridion/demo'], responsibility: '홈 CTA와 진단 페이지가 동일한 진단 엔진을 사용' }),
  Object.freeze({ id: 'diagnosis-report-render', routes: ['/products/veridion/demo'], responsibility: '무료 요약 결과, 잠금형 상세, 유료 CTA 연결' }),
  Object.freeze({ id: 'plan-checkout-handoff', routes: ['/plans', '/checkout'], responsibility: '서버 고정 상품 카탈로그와 결제 상태 머신 연결' }),
  Object.freeze({ id: 'portal-account-state', routes: ['/portal', '/auth'], responsibility: '로그인, 사이트 저장, 최근 진단, 샘플 상태 연결' }),
  Object.freeze({ id: 'insight-publication', routes: ['/board', '/insights'], responsibility: '정적 인사이트 허브와 동적 게시판 연결' }),
  Object.freeze({ id: 'admin-operations', routes: ['/admin', '/admin/console', '/admin/console/orders', '/admin/console/publications', '/admin/console/library', '/admin/console/settings', '/admin/console/diagnostics'], responsibility: 'RBAC 기반 운영 화면 연결' }),
  Object.freeze({ id: 'policy-footer', routes: ['/', '/plans', '/checkout', '/privacy', '/terms', '/refund', '/business-info'], responsibility: '사업자 정보, 개인정보, 약관, 환불 고지 연결' })
]);

export const STITCH_ROUTE_SURFACES = Object.freeze([
  Object.freeze({ route: '/', file: 'apps/public/home/index.html', screenIds: ['veridion_8', 'veridion_9'], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/products/veridion/demo', file: 'apps/public/veridion-demo/index.html', mirrors: ['apps/public/demo/index.html'], screenIds: ['veridion_4', 'veridion_7'], kind: 'public', dynamic: true }),
  Object.freeze({ route: '/plans', file: 'apps/public/plans/index.html', screenIds: ['veridion_3'], kind: 'public', dynamic: true }),
  Object.freeze({ route: '/portal', file: 'apps/public/portal/index.html', screenIds: ['veridion_10'], kind: 'private-public-shell', dynamic: true }),
  Object.freeze({ route: '/auth', file: 'apps/public/auth/index.html', screenIds: ['veridion_6'], kind: 'private-public-shell', dynamic: true }),
  Object.freeze({ route: '/board', file: 'apps/public/board/index.html', screenIds: ['veridion_5'], kind: 'public', dynamic: true }),
  Object.freeze({ route: '/insights', file: 'apps/public/insights/index.html', screenIds: ['veridion_5'], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/checkout', file: 'apps/public/checkout/index.html', screenIds: [], kind: 'private-public-shell', dynamic: true }),
  Object.freeze({ route: '/service', file: 'apps/public/service/index.html', screenIds: [], kind: 'public', dynamic: true }),
  Object.freeze({ route: '/solutions', file: 'apps/public/solutions/index.html', screenIds: [], kind: 'public', dynamic: true }),
  Object.freeze({ route: '/cases', file: 'apps/public/cases/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/guides', file: 'apps/public/guides/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/documents', file: 'apps/public/documents/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/business-info', file: 'apps/public/business-info/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/privacy', file: 'apps/public/privacy/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/terms', file: 'apps/public/terms/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/refund', file: 'apps/public/refund/index.html', screenIds: [], kind: 'public', dynamic: false }),
  Object.freeze({ route: '/admin', file: 'apps/admin/gate/index.html', screenIds: [], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console', file: 'apps/admin/console/index.html', screenIds: ['veridion_1', 'veridion_2'], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console/orders', file: 'apps/admin/orders/index.html', screenIds: [], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console/publications', file: 'apps/admin/publications/index.html', screenIds: [], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console/library', file: 'apps/admin/library/index.html', screenIds: [], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console/settings', file: 'apps/admin/settings/index.html', screenIds: [], kind: 'admin', dynamic: true }),
  Object.freeze({ route: '/admin/console/diagnostics', file: 'apps/admin/diagnostics/index.html', screenIds: [], kind: 'admin', dynamic: true })
]);

export function buildStitchRouteManifestSummary() {
  const prototypeIds = STITCH_PROTOTYPE_MAP.map(item => item.id);
  const mappedPrototypeIds = [...new Set(STITCH_ROUTE_SURFACES.flatMap(item => item.screenIds || []))];
  const routeKinds = Object.fromEntries([...new Set(STITCH_ROUTE_SURFACES.map(item => item.kind))].map(kind => [kind, STITCH_ROUTE_SURFACES.filter(item => item.kind === kind).length]));
  return {
    version: STITCH_EXPERIENCE_VERSION,
    designSystem: STITCH_DESIGN_SYSTEM.id,
    prototypeCount: prototypeIds.length,
    mappedPrototypeCount: mappedPrototypeIds.length,
    allPrototypesMapped: prototypeIds.every(id => mappedPrototypeIds.includes(id)),
    surfaceCount: STITCH_ROUTE_SURFACES.length,
    functionBindingCount: STITCH_FUNCTION_BINDINGS.length,
    stateRequirementCount: STITCH_STATE_REQUIREMENTS.length,
    routeKinds,
    prototypeIds,
    mappedPrototypeIds
  };
}
