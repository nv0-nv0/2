// Phase225 legacy /demo redirect helper.
try {
  if (location.pathname === '/demo') {
    document.documentElement.dataset.legacyDemoRedirect = 'ready';
  }
} catch (error) {
  document.documentElement.dataset.legacyDemoRedirect = 'safe-fallback';
}
