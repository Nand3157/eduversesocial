// Minimal offline-capable service worker for EduVerse
// Caches shell and serves /offline for navigation misses
const CACHE = "eduverse-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Navigation: network first, fall back to offline
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Cache-first for static assets
  if (req.url.includes("/_next/static") || req.url.includes("/icon")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); return res; }).catch(() => hit)));
  }
});
