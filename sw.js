<<<<<<< HEAD
const CACHE_NAME = 'control-v1';
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
=======
const CACHE_NAME = 'control-v1';
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
>>>>>>> 182c7f61615e60264dbbc5568b2db31f1875d962
});