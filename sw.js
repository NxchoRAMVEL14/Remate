// Service worker de Remate: primero la red (así una versión nueva llega sola) y, sin internet, lo guardado.
const CACHE = 'remate-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;            // la nube (Supabase) nunca se guarda aquí
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const home = await caches.match('index.html') || await caches.match('./'); if (home) return home; }
      return new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' });
    }
  })());
});
