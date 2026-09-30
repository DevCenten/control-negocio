/* ═══════════════════════════════════════════════════════════
   sw.js — Service Worker con auto-actualización
   ═══════════════════════════════════════════════════════════ */

// ⚠️ IMPORTANTE: SUBE ESTE NÚMERO CADA VEZ QUE HAGAS CAMBIOS
const CACHE_VERSION = 'variedades-karen-v6';

const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './migracion.js',
  './app.js',
  './manifest.json'
];

// ─── INSTALL: cachear archivos ───
self.addEventListener('install', event => {
  console.log('[SW] Instalando:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(urlsToCache).catch(e => console.warn(e)))
  );
  self.skipWaiting();
});

// ─── ACTIVATE: borrar TODAS las cachés viejas ───
self.addEventListener('activate', event => {
  console.log('[SW] Activando:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== CACHE_VERSION) {
            console.log('[SW] Borrando caché vieja:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH: network-first para HTML/JS/CSS, cache-first para el resto ───
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isHTML = event.request.destination === 'document';
  const isJS = url.endsWith('.js');
  const isCSS = url.endsWith('.css');

  if (isHTML || isJS || isCSS) {
    // Red primero (siempre lo último), caché si falla
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  // Recursos estáticos: caché primero
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (isHTML) return caches.match('./index.html');
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});