export const PUBLIC_PAGE_ROUTES = Object.freeze({
  '/': 'home',
  '/guides': 'guides',
  '/resources': 'guides',
  '/board': 'board',
  '/insights': 'insights',
  '/insights/refund-policy-checklist': 'insights/refund-policy-checklist',
  '/insights/privacy-policy-checklist': 'insights/privacy-policy-checklist',
  '/insights/ecommerce-trust-checklist': 'insights/ecommerce-trust-checklist',
  '/insights/conversion-before-payment': 'insights/conversion-before-payment',
  '/insights/business-info-display': 'insights/business-info-display',
  '/insights/mobile-checkout-trust': 'insights/mobile-checkout-trust',
  '/board/post': 'board',
  '/cases': 'cases',
  '/documents': 'documents',
  '/policy-documents': 'documents',
  '/docs/veridion': 'documents',
  '/solutions': 'solutions',
  '/service': 'service',
  '/products': 'plans',
  '/demo': 'demo',
  '/products/veridion/demo': 'demo',
  '/plans': 'plans',
  '/checkout': 'checkout',
  '/portal': 'portal',
  '/auth': 'auth',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/refund': 'refund',
  '/business-info': 'business-info',
  '/risk_result.html': 'demo',
  '/demo_risk_result.html': 'demo',
  '/service_detail.html': 'service',
  '/pricing.html': 'plans',
  '/insight_board.html': 'board',
  '/mypage.html': 'portal',
  '/auth_management.html': 'auth',
  '/risk-result': 'demo',
  '/insight-board': 'board',
  '/my-page': 'portal'
});

export const ADMIN_PAGE_ROUTES = Object.freeze({
  '/admin': 'gate',
  '/admin/console': 'console',
  '/admin/orders': 'orders',
  '/admin/publications': 'publications',
  '/admin/library': 'library',
  '/admin/settings': 'settings',
  '/admin/diagnostics': 'diagnostics',
  '/admin/console/orders': 'orders',
  '/admin/console/publications': 'publications',
  '/admin/console/library': 'library',
  '/admin/console/settings': 'settings',
  '/admin/console/diagnostics': 'diagnostics'
});

export const CANONICAL_PAGE_ALIASES = Object.freeze({
  '/demo': '/products/veridion/demo',
  '/resources': '/guides',
  '/products': '/plans',
  '/risk_result.html': '/products/veridion/demo',
  '/demo_risk_result.html': '/products/veridion/demo',
  '/service_detail.html': '/service',
  '/pricing.html': '/plans',
  '/insight_board.html': '/board',
  '/mypage.html': '/portal',
  '/auth_management.html': '/auth',
  '/risk-result': '/products/veridion/demo',
  '/pricing': '/plans',
  '/contact': '/business-info',
  '/faq': '/board',
  '/about': '/business-info',
  '/privacy-policy': '/privacy',
  '/terms-of-use': '/terms',
  '/cancel': '/refund',
  '/return': '/refund',
  '/exchange': '/refund',
  '/insight-board': '/board',
  '/my-page': '/portal'
});

export function listPageRoutes() {
  return [
    ...Object.entries(PUBLIC_PAGE_ROUTES).map(([route, slug]) => ({ route, area: 'public', slug })),
    ...Object.entries(ADMIN_PAGE_ROUTES).map(([route, slug]) => ({ route, area: 'admin', slug }))
  ];
}

export function mapPageRoute(urlPath, { publicDir, adminDir }) {
  if (Object.hasOwn(PUBLIC_PAGE_ROUTES, urlPath)) return [publicDir, PUBLIC_PAGE_ROUTES[urlPath]];
  if (Object.hasOwn(ADMIN_PAGE_ROUTES, urlPath)) return [adminDir, ADMIN_PAGE_ROUTES[urlPath]];
  return null;
}

export function canonicalPagePath(urlPath = '/') {
  return CANONICAL_PAGE_ALIASES[urlPath] || urlPath || '/';
}
