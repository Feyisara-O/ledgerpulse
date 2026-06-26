/**
 * TradeFlow Service Worker
 * Handles caching and offline support for the PWA
 * Strategy: Cache-First for static assets, Network-First for pages
 */

const CACHE_NAME = 'tradeflow-v1.0.0';
const OFFLINE_PAGE = './offline.html';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/css/theme.css',
  './assets/js/storage.js',
  './assets/js/theme.js',
  './assets/js/utils.js',
  './assets/js/app.js',
  './pages/dashboard.html',
  './pages/inventory.html',
  './pages/pos.html',
  './pages/sales.html',
  './pages/reports.html',
  './pages/settings.html',
  // Bootstrap 5 CDN (cached for offline)
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  // Chart.js
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ─── Install Event ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing TradeFlow v1.0.0...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching assets...');
      // Use addAll for critical assets; ignore failures on CDN resources
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to pre-cache:', err);
      });
    }).then(() => {
      // Force the waiting service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// ─── Activate Event ────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    // Remove old caches from previous versions
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// ─── Fetch Event ───────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  event.respondWith(handleFetch(request));
});

/**
 * Fetch handler with cache-first strategy for static assets
 * and network-first for navigation requests
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleFetch(request) {
  const url = new URL(request.url);

  // Navigation requests: Network-first, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    try {
      const networkResponse = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch {
      const cached = await caches.match(request);
      return cached || caches.match(OFFLINE_PAGE);
    }
  }

  // Static assets: Cache-first strategy
  const cached = await caches.match(request);
  if (cached) return cached;

  // Not in cache — fetch from network and cache it
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Network failed — return offline page for HTML, empty for others
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_PAGE);
    }
    return new Response('Offline', { status: 503 });
  }
}