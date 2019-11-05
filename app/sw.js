const mwsNewCache = 'mws-restaurant-1';
const resourcesToCache = [
  '/',
  '/index.html',
  '/scripts/Listbox.js',
  '/scripts/main.js',
  '/styles/main.css',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/data/restaurants.json',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
];

const resourcesToFetch = [];

const restaurantCount = 10;

const getImagesToCache = async () => {
  let response;
  const imageURLs = [
    '-350-small.jpg',
    '-700-medium.jpg',
    '-1050-large.jpg',
    '-1400-xlarge.jpg'
  ]
  const imagesToCache = [];

  try {
    let i;
    // see what size images have been cached
    for (i = 0; i < imageURLs.length && !response; i += 1) {
      response = await caches.match(new Request(`/images/1${imageURLs[i]}`));
    }
    i -= 1;
    if (response) {
      for (let j = 1; j <= restaurantCount; j += 1) {
        imagesToCache.push(`/images/${j}${imageURLs[i]}`);
      }
    }
    return imagesToCache;
  } catch (error) {
    return imagesToCache;
  }
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(mwsNewCache).then(async (cache) => {
      const promises = [];
      // fetch resources that are updated or new, put in new cache
      if (resourcesToFetch.length > 0) {
        promises.push(cache.addAll(resourcesToFetch));
      }
      const imagesToCache = await getImagesToCache();
      // transfer resources with no updates from older cache to newer cache
      resourcesToCache.concat(imagesToCache).forEach(async (resource) => {
        const request = new Request(resource);
        let response = await caches.match(request);
        if (response) {
          promises.push(cache.put(request, response));
        } else {
          // if request is not in cache, fetch it
          response = await fetch(request);
          promises.push(cache.put(request, response));
        }
      });
      return Promise.all(promises);
    }).catch((error) => {
      console.log('An error occurred during the installation of a service worker. ', error);
    })
  );
});

self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((cacheNames) => {
    const cachesToDelete = cacheNames.filter((cacheName) => cacheName !== mwsNewCache && cacheName.includes('mws-restaurant-'));
    const promises = cachesToDelete.map((cacheName) => caches.delete(cacheName));
    return Promise.all(promises);
  }).then(() => {
    self.clients.claim()
  })
));


self.addEventListener('fetch', (e) =>
  e.respondWith(caches.open(mwsNewCache).then((cache) =>
    cache.match(e.request).then((cacheResponse) =>
      cacheResponse || fetch(e.request).then((fetchResponse) => {
      // cache requested resource that is not currently in the cache
        cache.put(e.request, fetchResponse.clone())
        .catch((error) => {
          console.log(`Unable to cache resource ${e.request.url}`, error);
        });
        return fetchResponse;
      })))
  .catch((error) => {
    console.log(`error occurred in fetch for ${e.request.url}`, error)
    // ignore browser-sync errors
    if (e.request.url.includes('/browser-sync/socket.io/?EIO=3&transport=polling')) {
      return new Response();
    }
    return new Response(`error occurred in fetch for ${e.request.url}`, error)
  }))
);
