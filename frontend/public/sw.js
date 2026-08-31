const CACHE_NAME = 'bitespeed-pos-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method === 'GET' && !e.request.url.includes('/api/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(e.request)
          .then((response) => {
            cache.put(e.request, response.clone());
            return response;
          })
          .catch(() => {
            return cache.match(e.request);
          });
      })
    );
  }
});
