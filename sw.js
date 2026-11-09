/* Service worker: red primero (las actualizaciones llegan al instante), caché como respaldo sin conexión */
const C = 'gymtracker-v1';
const A = ['./', 'index.html', 'app.js', 'calendario.js', 'entreno.js', 'dashboard.js', 'admin.js', 'extras.js', 'config.js', 'manifest.json', 'icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(A)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // la API (Apps Script) nunca se cachea
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
