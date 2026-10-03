if ('serviceWorker' in navigator) {
  var isDevPreview = location.hostname === 'localhost' || location.hostname.includes('run.app') || location.hostname === '127.0.0.1';
  if (isDevPreview) {
    // Unregister any lingering service workers in dev preview to prevent Vite module interception
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
      }
    });
  } else {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function(registration) {
          console.log('[Kashpal PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch(function(error) {
          console.warn('[Kashpal PWA] Service Worker registration failed:', error);
        });
    });
  }
}

