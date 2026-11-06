const CACHE_NAME = 'nsl-offline-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.jsx',
  './manifest.json',
  './vendor/react.min.js',
  './vendor/react-dom.min.js',
  './vendor/babel.min.js',
  './assets/logos/ktg.jpg',
  './assets/logos/ask.jpg',
  './assets/logos/nkg.jpg',
  './assets/logos/alw.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching NSL offline assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
