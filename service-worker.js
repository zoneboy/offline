/* eslint-disable no-restricted-globals */

// This service worker caches the app shell and the model files to ensure offline functionality.
const CACHE_NAME = 'price-scanner-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.js', // Assuming build output name, adapts to dev environments mostly
  '/bundle.js', // Common bundler output
  'https://cdn.tailwindcss.com', // Cache external Tailwind script
  // Model files - crucial for offline ML
  '/my_model/model.json',
  '/my_model/metadata.json'
  // Note: weights.bin files are referenced inside model.json. 
  // A robust SW would intercept requests or need explicit listing of all shard files.
  // For this example, we cache the initial shell and intercept network requests dynamically.
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
          // If it's a third party script (like Tailwind), type might be 'cors' or 'opaque'
          if (response && response.type === 'opaque' && event.request.url.includes('cdn.tailwindcss.com')) {
             // allow caching opaque responses for tailwind
          } else if (!response || response.status !== 200) {
             return response;
          }
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Dynamically cache visited files (like model weight shards *.bin)
          cache.put(event.request, responseToCache);
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