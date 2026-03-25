const CACHE_NAME = 'scootsafe-pwa-v1'
const APP_SHELL = [
  '/pwascooter/',
  '/pwascooter/index.html',
  '/pwascooter/manifest.webmanifest',
  '/pwascooter/offline.html',
  '/pwascooter/icon-192.png',
  '/pwascooter/icon-512.png',
  '/pwascooter/icon-maskable-512.png',
  '/pwascooter/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/pwascooter/index.html', copy))
          return response
        })
        .catch(async () => {
          return (await caches.match('/pwascooter/index.html')) ?? caches.match('/pwascooter/offline.html')
        })
    )
    return
  }

  if (/\.(?:js|css|png|svg|webmanifest|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            return response
          })
          .catch(() => cachedResponse)

        return cachedResponse ?? networkResponse
      })
    )
  }
})
