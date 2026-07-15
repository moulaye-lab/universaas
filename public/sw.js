/**
 * Service Worker - University SaaS PWA
 * Cache Strategy: Network First with Cache Fallback
 */

const CACHE_NAME = 'university-saas-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets à pré-cacher au premier chargement
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Installation: Pré-cache des assets critiques
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Pré-cache des assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation: Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activation');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les appels Firebase (toujours en ligne)
  if (request.url.includes('firebaseio.com') ||
      request.url.includes('googleapis.com') ||
      request.url.includes('cloudfunctions.net')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cloner pour mettre en cache
        const responseClone = response.clone();

        // Mettre en cache si succès
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Fallback: chercher dans le cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('📦 Cache hit:', request.url);
            return cachedResponse;
          }

          // Fallback ultime: page offline
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Message handler pour forcer le refresh
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
