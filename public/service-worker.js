// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const PRECACHE = 'precache-v1.6.2';
const RUNTIME = 'runtime-1';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  'index.html',
  'arrow.png',
  'arrow-fill.png',
  './', // Alias
  'index.css',
  'Header.png',
  'index.js'
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
    const currentCaches = [PRECACHE, RUNTIME];
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      }).then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        }));
      }).then(() => self.clients.claim())
    );
  });
 
  function fetchAndCache(event) {
    return fetch(event.request).then( function ( response ) {
      // Put a copy of the response in the runtime cache.
      return caches.open(RUNTIME).then(function(cache) {
        return cache.put(event.request, response.clone()).then(() => {
          return response;
        });
      } );
    });
  }

  // The fetch handler serves responses for same-origin resources from a cache.
  // If no response is found, it populates the runtime cache with the response
  // from the network before returning it to the page.
  self.addEventListener('fetch', event => {
    // Skip cross-origin requests, like those for Google Analytics.
    if (event.request.url.startsWith(self.location.origin)) {
      event.respondWith(
        caches.open(RUNTIME).then(function(cache) {
          return cache.match(event.request).then(function(cachedResponse) {
            if ( cachedResponse ) {
              // get recent version for next time after delay (or this time if first go)
              setTimeout( function () {
                fetchAndCache( event );
              }, 5000 );
              // return cached response
              return cachedResponse;
            } else {
              // retrieve from server not in cache
              return fetchAndCache( event );
            }
         })
        })
      );
    }
  });
