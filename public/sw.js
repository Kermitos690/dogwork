/**
 * DogWork — Service worker (Phase 3A)
 *
 * Preview-safe: registration in main.tsx is gated and refuses to install on
 * Lovable preview hosts or when the app runs inside an iframe. This file is
 * therefore only ever active in production-like environments.
 *
 * Strategy:
 *  - Precache the app shell (index.html + manifest + favicon) for offline boot.
 *  - Network-first for navigations (so users always get fresh HTML when online,
 *    with a cached fallback when offline).
 *  - Cache-first for static built assets (`/assets/*`) — they are immutable
 *    thanks to Vite's content hashing.
 *  - Bypass for everything else (Supabase, AI, third parties).
 */

const VERSION = "dogwork-sw-v2";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_URLS = ["/manifest.json", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Bypass cross-origin (Supabase, fonts CDN, AI gateway, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Bypass Supabase REST/Storage if ever same-origin proxied
  if (url.pathname.startsWith("/functions/") || url.pathname.startsWith("/rest/")) return;

  // Navigation (HTML) → network only, no caching of index.html.
  // Caching the HTML across deploys causes references to chunk hashes that
  // no longer exist after a new build → ChunkLoadError that crashes the SPA.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/manifest.json").then(() => new Response(
          "<html><body><script>location.reload()</script></body></html>",
          { headers: { "Content-Type": "text/html" } }
        ))
      ),
    );
    return;
  }

  // Static assets → cache first
  if (url.pathname.startsWith("/assets/") || /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => cached as Response);
      }),
    );
  }
});
