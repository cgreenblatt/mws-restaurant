const staticCache = 'mws-restaurant-1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(staticCache).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/scripts/Listbox.js',
        '/scripts/main.js',
        '/styles/main.css',
        '/favicon.ico',
        '/apple-touch-icon.png',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
        'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
        'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
      ]))
      .catch((error) => {
        console.log('Error occurred during installation of service worker. ', error);
        return new Response('error');
      })
  );
});

self.addEventListener('activate', (e) => {
  return e.waitUntil(
    caches.keys().then(function(cacheNames) {
      const cachesToDelete =
        cacheNames.filter(cacheName => cacheName !== staticCache && cacheName.includes('mws-restaurant-'));
      const promises = cachesToDelete.map(cacheName => {
            return caches.delete(cacheName);
        });
        return Promise.all(promises);
    }).then(function() {
      return self.clients.claim();
    })
  )
});


self.addEventListener('fetch', (e) => {
  return e.respondWith(caches.open(staticCache)
  .then((cache) => cache.match(e.request).then((cacheResponse) =>
    cacheResponse || fetch(e.request).then((fetchResponse) => {
      // cache requested resource that is not currently in the cache
      cache.put(e.request, fetchResponse.clone())
        .catch(error => {
          console.log(`Unable to cache resource ${e.request.url}`, error);
        });
      return fetchResponse;
    })))
  .catch((error) => {
    return new Response();
  }))
});
