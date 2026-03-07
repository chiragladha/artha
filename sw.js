/* ============================================================
   Artha — Service Worker (PWA offline support)
   v2 — Network-first for app files, cache-first for CDN assets
   ============================================================ */

const CACHE_NAME = 'artha-v2';
const APP_FILES = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-512.png',
];
const CDN_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
];

// Install — cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([...APP_FILES, ...CDN_ASSETS]))
    );
    self.skipWaiting();
});

// Activate — clean old caches (including v1)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for Google Sheets API (JSONP scripts)
    if (url.hostname === 'docs.google.com') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Network-first for app's own files (HTML, JS, CSS)
    // This ensures updates propagate immediately instead of serving stale cache
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache with fresh response
                    if (response.ok && event.request.method === 'GET') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for CDN assets (fonts, Chart.js) — these rarely change
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
