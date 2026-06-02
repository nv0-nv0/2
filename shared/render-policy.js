(function(){
  const allowedStaticHtmlFiles = [
    'apps/public/home/app.js',
    'apps/public/portal/app.js',
    'apps/public/veridion-demo/app.js',
    'apps/public/checkout/app.js',
    'apps/admin/app.js'
  ];
  window.NV0RenderPolicy = Object.freeze({
    version: 'client-render-policy-v1',
    allowedStaticHtmlFiles,
    rule: '사용자 입력 포함 콘텐츠는 escapeHtml/escapeAttr/safeUrl 또는 NV0SafeDom.renderSafe를 통과해야 합니다.'
  });
})();
