// Phase225 static service page guard.
try {
  document.documentElement.dataset.servicePage = 'ready';
} catch (error) {
  // Static content remains available without JavaScript.
}
