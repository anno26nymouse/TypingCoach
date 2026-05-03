const CACHE_NAME = 'typing-ai-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// ===== ASSETS WAJIB =====
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// ===== FETCH STRATEGY =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. HTML → Network First (biar selalu update)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, res.clone());
            return res;
          });
        })
        .catch(() => {
          return caches.match(req).then(res => {
            return res || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. CSS / CDN → Stale While Revalidate
  if (req.url.includes('cdnjs') || req.destination === 'style') {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(networkRes => {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, networkRes.clone());
          });
          return networkRes;
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Default → Cache First
  event.respondWith(
    caches.match(req).then(res => {
      return res || fetch(req).then(networkRes => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(req, networkRes.clone());
          return networkRes;
        });
      });
    })
  );
});

// ===== BACKGROUND SYNC (opsional, future ready) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stats') {
    console.log('[SW] Syncing stats...');
    // nanti bisa kirim data ke server
  }
});

// ===== PUSH NOTIFICATION (optional future) =====
self.addEventListener('push', (event) => {
  const data = event.data?.text() || 'New update available!';
  
  event.waitUntil(
    self.registration.showNotification('Typing AI Trainer', {
      body: data,
      icon: '/192.png'
    })
  );
});