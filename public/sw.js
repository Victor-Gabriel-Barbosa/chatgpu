const VERSION = 'v4';
const CACHE_NAME = `chatgpu-cache-${VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon0.svg',
  '/icon1.png',
  '/chatgpu-video.mp4'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)));
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse?.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response(null, { status: 504, statusText: "Offline e não cacheado" });
        });
    })
  );
});
