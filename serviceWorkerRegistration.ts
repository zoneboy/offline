export function register(config?: { onSuccess?: (r: ServiceWorkerRegistration) => void; onUpdate?: (r: ServiceWorkerRegistration) => void }) {
  if (process.env.NODE_ENV === 'production' || true) { // Force enable for this demo
    if ('serviceWorker' in navigator) {
      // The URL constructor is available in all browsers that support SW.
      const publicUrl = new URL(window.location.href).origin;
      const swUrl = `${publicUrl}/service-worker.js`;

      const registerSW = () => {
        registerValidSW(swUrl, config);
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }
  }
}

function registerValidSW(swUrl: string, config?: { onSuccess?: (r: ServiceWorkerRegistration) => void; onUpdate?: (r: ServiceWorkerRegistration) => void }) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('New content is available and will be used when all tabs for this page are closed.');
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      // Gracefully handle invalid state errors which can happen in restricted iframe/preview environments
      if (error.message && error.message.includes('invalid state')) {
        console.warn('Service Worker registration failed due to invalid document state (likely iframe/preview restriction). Offline mode may not work in this environment.');
      } else {
        console.error('Error during service worker registration:', error);
      }
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}