/*
 * Offline support.
 *
 * The app is entirely local, so once it has loaded successfully it should keep
 * working with no network at all. Assets are cached as they are requested and
 * navigations fall back to the cached shell.
 */

// The two placeholders below are filled in at build time (see vite.config.ts), so
// one successful load leaves a complete, self-contained copy of the app behind.
const CACHE = 'the-missing-parts-SW_BUILD_ID'
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg'].concat(SW_PRECACHE)

self.addEventListener('install', (event) => {
  // Cached one at a time: a single missing file must not throw away the rest.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Responses can carry `Vary: Origin`, which otherwise makes a cached file
// invisible to a request made in CORS mode — module scripts, for instance.
// This app is static and same-origin, so Vary is not meaningful here.
const MATCH_OPTIONS = { ignoreVary: true }

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() =>
          caches
            .match('./index.html', MATCH_OPTIONS)
            .then((cached) => cached || caches.match('./', MATCH_OPTIONS)),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(request, MATCH_OPTIONS).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
