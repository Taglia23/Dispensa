/* Service worker: rende l'app disponibile offline e mostra le notifiche push. */
const VERSION = 'dispensa-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css', './js/config.js', './js/recipes.js', './js/starter.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'
];
/* Librerie esterne: scaricate al primo avvio online e poi tenute in cache */
const FB = 'https://www.gstatic.com/firebasejs/10.14.1/';
const LIBS = [
  FB + 'firebase-app-compat.js', FB + 'firebase-auth-compat.js',
  FB + 'firebase-firestore-compat.js', FB + 'firebase-messaging-compat.js',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
];
const CACHE_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(async (u) => {
      try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !CACHE_HOSTS.includes(url.hostname)) return; // Firebase, Open Food Facts: sempre rete

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VERSION); c.put('./index.html', net.clone());
        return net;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  // Stale-while-revalidate per i file dell'app, cache-first per le librerie
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, { ignoreSearch: same });
    const refresh = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { if (same) e.waitUntil(refresh); return hit; }
    return (await refresh) || Response.error();
  })());
});

/* ───── Notifiche push (inviate da GitHub Actions tramite Firebase Cloud Messaging) ───── */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { notification: { body: e.data && e.data.text() } }; }
  const n = d.notification || {};
  const data = d.data || {};
  const title = n.title || data.title || 'Dispensa';
  const body = n.body || data.body || 'Controlla la dispensa';
  e.waitUntil(self.registration.showNotification(title, {
    body, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    tag: data.tag || 'dispensa', renotify: true, data: { url: data.url || './index.html#spesa' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  })());
});
