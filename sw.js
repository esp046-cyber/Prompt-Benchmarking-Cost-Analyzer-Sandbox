// sw.js — minimal app-shell cache. This is what makes iOS Safari treat the
// site as an installable PWA. It does NOT cache API responses (those are
// live benchmark calls and should never be served stale).

const CACHE_NAME = "bench-sandbox-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./pricing.json",
  "./datasets.json",
  "./export.js",
  "./eval.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept calls to LLM providers — those must always go live.
  const isApiCall = /openai\.com|googleapis\.com|openrouter\.ai/.test(url.hostname);
  if (isApiCall || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
