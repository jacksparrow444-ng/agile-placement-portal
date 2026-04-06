const CACHE_NAME = 'placement-portal-kill-cache-v2';

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
        return self.clients.claim(); // Immediately claim any open clients
    })
  );
});

self.addEventListener('fetch', event => {
  // Network-only for everything to bypass cache issues
  event.respondWith(fetch(event.request));
});
