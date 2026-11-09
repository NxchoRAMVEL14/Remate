// Service worker de Remate.
// v3.23 «sin internet de verdad»: al instalarse guarda la app completa (todas las pantallas, no solo las que ya
// abriste). Con internet va primero a la red para que una versión nueva llegue sola, pero si la red tarda más de
// 3.5 s contesta con lo guardado y actualiza por detrás. Los datos (Supabase) nunca pasan por aquí: los guarda la
// app en el celular y sube los cambios cuando vuelve la señal.
// El nombre lleva la versión de js/version.js: al subir una versión nueva, cámbialo aquí también.
const CACHE = 'remate-v3.23.0';
// ASSETS: la lista la genera scripts/assets (no la edites a mano).
// ASSETS:BEGIN
const ASSETS = [
  "./",
  "./config.js",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./css/tokens.css",
  "./css/views.css",
  "./fonts/LICENCIAS.txt",
  "./fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "./fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "./fonts/big-shoulders-display-latin-800-normal.woff2",
  "./fonts/big-shoulders-display-latin-900-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./js/auth.js",
  "./js/badges.js",
  "./js/calc.js",
  "./js/cloud.js",
  "./js/court.js",
  "./js/demo.js",
  "./js/figura.js",
  "./js/horarios.js",
  "./js/icons.js",
  "./js/lab-calc.js",
  "./js/main.js",
  "./js/match-calc.js",
  "./js/push.js",
  "./js/store.js",
  "./js/util.js",
  "./js/version.js",
  "./js/content/aprende.js",
  "./js/content/casa.js",
  "./js/content/categorias.js",
  "./js/content/challenges.js",
  "./js/content/coaching.js",
  "./js/content/ex-bloqueo-defensa.js",
  "./js/content/ex-colocacion.js",
  "./js/content/ex-fisico.js",
  "./js/content/ex-juego.js",
  "./js/content/ex-recepcion.js",
  "./js/content/ex-remate.js",
  "./js/content/ex-saque.js",
  "./js/content/exercises.js",
  "./js/content/fit.js",
  "./js/content/frases.js",
  "./js/content/gym.js",
  "./js/content/ideas.js",
  "./js/content/lab-ex.js",
  "./js/content/lab-salto.js",
  "./js/content/lesiones.js",
  "./js/content/levels.js",
  "./js/content/maquinas-dibujos.js",
  "./js/content/maquinas.js",
  "./js/content/menu.js",
  "./js/content/movimientos.js",
  "./js/content/musculos.js",
  "./js/content/nutricion.js",
  "./js/content/recetas.js",
  "./js/content/skills.js",
  "./js/content/templates.js",
  "./js/content/teoria.js",
  "./js/content/vision.js",
  "./js/views/activo.js",
  "./js/views/ajustes.js",
  "./js/views/aprende.js",
  "./js/views/asistir.js",
  "./js/views/avisos.js",
  "./js/views/ayuda.js",
  "./js/views/azar.js",
  "./js/views/card.js",
  "./js/views/carga.js",
  "./js/views/casa.js",
  "./js/views/chart.js",
  "./js/views/compartir.js",
  "./js/views/court-mode.js",
  "./js/views/ejercicio.js",
  "./js/views/ejercicios.js",
  "./js/views/entrenos.js",
  "./js/views/fit-bascula.js",
  "./js/views/fit-comida.js",
  "./js/views/fit-graficas.js",
  "./js/views/fit.js",
  "./js/views/frase.js",
  "./js/views/gate.js",
  "./js/views/gym.js",
  "./js/views/hoy.js",
  "./js/views/importar.js",
  "./js/views/imprimir.js",
  "./js/views/inicio.js",
  "./js/views/jugador.js",
  "./js/views/jugadores.js",
  "./js/views/lab-coaching.js",
  "./js/views/lab-salto.js",
  "./js/views/lab-vision.js",
  "./js/views/lab.js",
  "./js/views/lesiones.js",
  "./js/views/mas.js",
  "./js/views/medir.js",
  "./js/views/mejoras.js",
  "./js/views/panel.js",
  "./js/views/partido-capture.js",
  "./js/views/partido-summary.js",
  "./js/views/partidos.js",
  "./js/views/pizarra.js",
  "./js/views/plan-toque.js",
  "./js/views/pruebas.js",
  "./js/views/radar-guia.js",
  "./js/views/ranking.js",
  "./js/views/reportes.js",
  "./js/views/reto.js",
  "./js/views/rivales.js",
  "./js/views/ruta.js",
  "./js/views/rutina-editor.js",
  "./js/views/scout-rapido.js",
  "./js/views/sesion.js",
  "./js/views/sesiones.js",
  "./js/views/sheets-lab.js",
  "./js/views/sheets-player.js",
  "./js/views/sheets-session.js",
  "./js/views/sugerido.js",
  "./js/views/tecnica.js",
  "./js/views/temporada.js",
  "./js/views/teoria.js",
  "./js/views/torneos.js",
  "./js/views/ui.js",
  "./js/views/video-dibujo.js",
  "./vendor/supabase.js",
];
// ASSETS:END
const SLOW_MS = 3500;

async function precache() {
  const c = await caches.open(CACHE);
  const res = await Promise.allSettled(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' }))));
  return { ok: res.filter((r) => r.status === 'fulfilled').length, total: ASSETS.length };
}
self.addEventListener('install', (e) => { e.waitUntil(precache().catch(() => null).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;            // la nube (Supabase) nunca se guarda aquí
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(req).then((res) => { if (res.ok && res.type === 'basic') c.put(req, res.clone()).catch(() => {}); return res; });
    const fromCache = async () => (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? (await c.match('./index.html')) || (await c.match('./')) : null);
    const hit = await c.match(req, { ignoreSearch: true });
    if (!hit) {                                                                    // no lo tenemos: esperar a la red
      try { return await net; } catch { return (await fromCache()) || new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' }); }
    }
    let timer;
    const slow = new Promise((res) => { timer = setTimeout(() => res(null), SLOW_MS); });
    try {
      const first = await Promise.race([net.catch(() => null), slow]);
      if (first && first.ok) return first;
    } finally { clearTimeout(timer); }
    e.waitUntil(net.catch(() => null));                                            // que termine de actualizar por detrás
    return hit;
  })());
});

// La app pregunta cuánto está guardado o pide volver a descargar todo (Ajustes → Usar sin internet).
self.addEventListener('message', (e) => {
  const port = e.ports?.[0]; if (!port) return;
  const d = e.data || {};
  if (d.type === 'status') {
    e.waitUntil(caches.open(CACHE).then(async (c) => { let ok = 0; for (const u of ASSETS) if (await c.match(u, { ignoreSearch: true })) ok++; port.postMessage({ ok, total: ASSETS.length, cache: CACHE }); }));
  } else if (d.type === 'precache') {
    e.waitUntil(precache().then((r) => port.postMessage({ ...r, cache: CACHE })).catch(() => port.postMessage({ ok: 0, total: ASSETS.length, error: true })));
  }
});

// Notificaciones de avisos del equipo.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Remate', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || undefined, data: { url: d.url || '' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(`./${e.notification.data?.url || ''}`, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { if ('navigate' in c) c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
