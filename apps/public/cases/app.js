// Phase225 static cases page guard.
try {
  document.documentElement.dataset.casesPage = 'ready';
} catch (error) {
  // Static content remains available without JavaScript.
}
