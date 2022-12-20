const cacheData = [
  './',
  './index.html',
  './404.html',
  './images/bountyHunters.jpg',
  './images/star-wars-logo.jpg',
  './images/snowTroopers.jpg',
  './service-worker.js'
];

const cacheName = 'static-v1';

self.addEventListener('install', (event) => {
  console.log('V1 installing…');

  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      // cache.add("/cat.svg");
      return cache.addAll(cacheData);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('V1 now ready to handle fetches!');
});

self.addEventListener('fetch', (event) => {
  // const url = new URL(event.request.url);

  // if (url.origin == location.origin && url.pathname == "/dog.svg") {
  //   event.respondWith(caches.match("/cat.svg"));
  // }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response !== undefined) {
        return response;
      } else {
        fetch(event.request)
          .then(function (response) {
            let responseClone = response.clone();

            caches.open(cacheName).then(function (cache) {
              cache.put(event.request, responseClone);
            });

            return response;
          })
          .catch(function () {
            return caches.match('/404.html');
          });
      }
    })
  );
});
