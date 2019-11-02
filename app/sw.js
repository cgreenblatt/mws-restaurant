const staticCache = 'mws-restaurant-0'

// this assumes cell phones will be used more often than laptops,
// load medium images
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(staticCache).then((cache) =>
      cache.addAll([
        '/scripts/Listbox.js',
        '/scripts/main.js',
        '/styles/main.css',
        '/images/1-700-medium.jpg',
        '/images/2-700-medium.jpg',
        '/images/3-700-medium.jpg',
        '/images/4-700-medium.jpg',
        '/images/5-700-medium.jpg',
        '/images/6-700-medium.jpg',
        '/images/7-700-medium.jpg',
        '/images/8-700-medium.jpg',
        '/images/9-700-medium.jpg',
        '/images/10-700-medium.jpg'
      ]))
      .catch((error) => {
        console.log('Error occurred during installation of service worker. ', error);
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
    }))
});


self.addEventListener('fetch', (e) => e.respondWith(caches.open(staticCache)
  .then((cache) => cache.match(e.request).then((cacheResponse) =>
    cacheResponse || fetch(e.request).then((fetchResponse) => {
      // cache requested resource that is not currently in the cache
      cache.put(e.request, fetchResponse.clone())
        .catch(error => {
          console.log(`Unable to cache resource ${e.request.url}`, error);
        });
      return fetchResponse;
    })))
  .catch(() => new Response('error fetching data'))));
