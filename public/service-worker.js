/* eslint-disable no-restricted-globals */

// This service worker caches the app shell and the model files to ensure offline functionality.
const CACHE_NAME = 'price-scanner-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com', // Cache external Tailwind script
  // Model files - crucial for offline ML
  '/my_model/model.json',
  '/my_model/metadata.json'
  // Note: We removed specific JS files (index.js) from here because build tools generate 
  // hashed filenames (e.g., index-xyz.js). The 'fetch' handler below will dynamically 
  // cache those files when the app loads.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          // Allow caching opaque responses for third-party scripts like Tailwind
          if (response && response.type === 'opaque') {
             // proceed to cache
          } else if (!response || response.status !== 200) {
             return response;
          }
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Dynamically cache visited files (like hashed JS bundles and model weights)
          // This ensures the app code is cached for offline use after the first load
          if (event.request.method === 'GET') {
             cache.put(event.request, responseToCache);
          }
        });

        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});