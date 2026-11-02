// Arranque de Remate: entrada, rutas, encabezado, navegación y re-dibujo cuando cambian los datos.
import { h, ic, $, applyTheme, iosBrowser, INSTALL_STEPS, openSheet } from './util.js';
import { state, onChange, getPlayer, pendingCount } from './store.js';
import { boot } from './auth.js';
import { renderGate } from './views/gate.js';
import { selfSheet, enterSelf, leaveSelf } from './views/mas.js';
import { unseenUpdate, firstRun, markSeen, updateBanner, SEEN_KEY } from './views/ayuda.js';
import { casaReady, isStaff, ls, myPlayer } from './store.js';

// v3.8: cada pantalla se carga al abrirla; después, en segundo plano, se cargan todas (así quedan guardadas para usar sin internet).
// [archivo en js/views, función que exporta]
const R = (file, pick = 'default') => ({ file, pick });
const ROUTES = { hoy: R('hoy'), jugadores: R('jugadores'), jugador: R('jugador'), sesiones: R('sesiones'), sesion: R('sesion'), ejercicios: R('ejercicios'), ejercicio: R('ejercicio'),
  ruta: R('ruta'), ajustes: R('ajustes'), ayuda: R('ayuda'), novedades: R('ayuda', 'novedades'), partidos: R('partidos'), partido: R('partidos', 'partido'), lab: R('lab'), reportes: R('reportes'),
  mas: R('mas'), casa: R('casa'), mejoras: R('mejoras'), pruebas: R('pruebas'), temporada: R('temporada'), avisos: R('avisos'), radar: R('radar-guia'), comparar: R('radar-guia', 'comparar'),
  teoria: R('teoria'), torneo: R('torneos'), alineacion: R('partido-capture', 'alineacion'), rivales: R('rivales'), rival: R('rivales'), gym: R('gym'), medir: R('medir'),
  'lista-qr': R('asistir', 'listaQr'), llegue: R('asistir', 'llegue'), asistir: R('asistir'), inicio: R('inicio'), entrenos: R('entrenos') };
const COACH = new Set(['hoy', 'jugadores', 'jugador', 'sesiones', 'sesion', 'ejercicios', 'ejercicio', 'ruta', 'ajustes', 'ayuda', 'partidos', 'partido', 'lab', 'reportes', 'mas', 'casa', 'mejoras', 'pruebas', 'temporada', 'avisos', 'radar', 'novedades', 'teoria', 'comparar', 'torneo', 'alineacion', 'rivales', 'rival', 'gym', 'medir', 'lista-qr', 'llegue']);
const PLAYER = new Set(['inicio', 'ruta', 'entrenos', 'partidos', 'partido', 'ejercicios', 'ejercicio', 'casa', 'pruebas', 'avisos', 'asistir', 'ajustes', 'ayuda', 'radar', 'novedades', 'teoria', 'torneo', 'gym', 'medir', 'llegue', 'lista-qr']);
const ASSISTANT = new Set(['asistir', 'partidos', 'partido', 'avisos', 'ejercicios', 'ejercicio', 'ajustes', 'ayuda', 'novedades', 'torneo', 'alineacion', 'lista-qr']);
const MODS = new Map();
const loadView = (file) => (MODS.has(file) ? Promise.resolve(MODS.get(file)) : import(`./views/${file}.js`).then((m) => { MODS.set(file, m); return m; }));
let prefetched = false;
function prefetchAll() {
  if (prefetched) return; prefetched = true;
  const files = [...new Set(Object.values(ROUTES).map((r) => r.file))];
  const next = () => { const f = files.shift(); if (!f) return; loadView(f).catch(() => {}).finally(() => setTimeout(next, 30)); };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(next, { timeout: 2500 });
}
const TABLES = { coach: COACH, player: PLAYER, assistant: ASSISTANT };
const HOME = { coach: '#/hoy', player: '#/inicio', assistant: '#/asistir' };
// [ruta, texto, ícono, dónde se ve]: 'wide' solo en pantalla grande (barra lateral), 'narrow' solo en celular.
const NAV = {
  coach: [['hoy', 'Hoy', 'house'], ['jugadores', 'Jugadores', 'users'], ['sesiones', 'Entrenos', 'calendar-days'], ['partidos', 'Partidos', 'volleyball'],
    ['ejercicios', 'Ejercicios', 'book-open', 'wide'], ['ruta', 'Ruta', 'flag', 'wide'], ['lab', 'Laboratorio', 'zap', 'wide'], ['gym', 'Gym', 'dumbbell', 'wide'], ['reportes', 'Reportes', 'file-text', 'wide'],
    ['mejoras', 'Mejoras', 'lightbulb', 'wide'], ['ajustes', 'Ajustes', 'settings', 'wide'], ['ayuda', 'Ayuda', 'circle-help', 'wide'],
    ['mas', 'Más', 'layout-grid', 'narrow']],
  player: [['inicio', 'Inicio', 'house'], ['entrenos', 'Entrenos', 'calendar-days'], ['partidos', 'Partidos', 'volleyball'], ['ejercicios', 'Ejercicios', 'book-open'], ['ruta', 'Ruta', 'flag']],
  assistant: [['asistir', 'Asistir', 'clipboard-check'], ['partidos', 'Partidos', 'volleyball'], ['avisos', 'Avisos', 'bell'], ['ejercicios', 'Ejercicios', 'book-open']],
};
const PARENT = { jugador: 'jugadores', sesion: 'sesiones', ejercicio: 'ejercicios', partido: 'partidos', casa: 'ejercicios', pruebas: 'jugadores', temporada: 'sesiones', avisos: 'hoy', asistir: 'inicio', novedades: 'ajustes', comparar: 'jugadores', torneo: 'partidos', alineacion: 'partidos', rivales: 'partidos', rival: 'partidos', 'lista-qr': 'sesiones', llegue: 'inicio' };   // sección que se ilumina en la navegación
const UNDER_MAS = new Set(['ejercicios', 'ruta', 'lab', 'reportes', 'ajustes', 'ayuda', 'mejoras', 'mas', 'novedades', 'gym']);
// Pantalla en la que estás → sección de la mejora (para anotarla rápido desde el foco del encabezado).
const IDEA_AREA = { hoy: 'hoy', jugadores: 'jugadores', jugador: 'jugadores', sesiones: 'entrenos', sesion: 'entrenos', partidos: 'partidos', partido: 'partidos',
  casa: 'casa', lab: 'laboratorio', reportes: 'reportes', ruta: 'ruta', ejercicios: 'ejercicios', ejercicio: 'ejercicios', ajustes: 'ajustes', teoria: 'entrenos', comparar: 'jugadores', radar: 'jugadores', torneo: 'partidos', gym: 'gym', medir: 'laboratorio', 'lista-qr': 'entrenos' };          // en celular, estas iluminan "Más"

const root = $('#root');
const uiState = new Map();
let mounted = false, queued = false;

const parse = () => {
  const [name = '', ...args] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name, args };
};

function errorView(e) {
  console.error(e);
  return { title: 'Algo salió mal', el: h('div', { class: 'page' }, h('div', { class: 'note bad' }, 'Esta pantalla tuvo un problema. Regresa al inicio e inténtalo de nuevo.'),
    h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '.8rem' } }, String(e?.stack || e)), h('a', { class: 'btn', href: '#/' }, 'Ir al inicio')) };
}

function render({ fresh = false } = {}) {
  if (!mounted || !state.ready) return;
  let { name, args } = parse();
  if (name === 'ver' && state.role === 'coach' && getPlayer(args[0])) { state.viewAs = args[0]; state.self = false; location.replace('#/inicio'); return; }
  // Mi perfil de jugador: el entrenador entra con su propia ficha (o la crea).
  if (name === 'yo' && state.role === 'coach' && !state.viewAs) {
    if (myPlayer()) { enterSelf(myPlayer().id, true); return; }
    location.replace('#/mas'); setTimeout(selfSheet, 0); return;
  }
  const role = state.viewAs ? 'player' : state.role;
  const table = TABLES[role] || PLAYER;
  if (!table.has(name) || (name === 'asistir' && role === 'player' && !isStaff())) { location.replace(HOME[role] || '#/inicio'); return; }
  const route = ROUTES[name], mod = MODS.get(route.file);
  if (!mod) {
    // Mientras llega el archivo de esa pantalla, se queda la actual (casi siempre tarda unos milisegundos).
    document.body.classList.add('view-loading');
    loadView(route.file).then(() => { document.body.classList.remove('view-loading'); render({ fresh }); }, (e) => {
      document.body.classList.remove('view-loading');
      root.replaceChildren(h('div', { class: 'app' }, h('main', { class: 'main', id: 'main' }, h('div', { class: 'page' },
        h('div', { class: 'note warn' }, navigator.onLine === false ? 'Esta pantalla todavía no se guardó en tu celular y no hay internet. Conéctate y vuelve a intentar.' : 'No se pudo abrir esta pantalla. Puede que haya una versión nueva de Remate: recarga.'),
        h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => location.reload() }, 'Recargar'), h('a', { class: 'btn', href: HOME[role] || '#/inicio' }, 'Ir al inicio'))))));
      console.error(e);
    });
    return;
  }
  const me = state.viewAs ? getPlayer(state.viewAs) : state.me;
  if (state.viewAs && !me) { state.viewAs = null; state.self = false; location.replace('#/jugadores'); return; }
  const key = [role, name, ...args].join('/');
  if (!uiState.has(key)) uiState.set(key, {});
  const y = fresh ? 0 : window.scrollY;
  const ctx = { role, me, readonly: !!state.viewAs && !state.self, self: !!state.viewAs && state.self, args, ui: uiState.get(key), rerender: () => render() };
  let view;
  try { view = mod[route.pick](ctx); } catch (e) { view = errorView(e); }
  const nav = name === 'radar' ? (role === 'coach' ? 'jugadores' : 'inicio') : name === 'teoria' ? (role === 'coach' ? 'sesiones' : 'entrenos') : name === 'gym' ? (role === 'coach' ? 'gym' : 'ejercicios') : name === 'medir' ? (role === 'coach' ? 'lab' : 'inicio') : (PARENT[name] || name);

  const sync = state.mode === 'demo' ? h('span', { class: 'sync' }, 'Demo')
    : !state.online ? h('span', { class: 'sync warn' }, pendingCount() ? `Sin internet, ${pendingCount()} por enviar` : 'Sin internet')
      : pendingCount() ? h('span', { class: 'sync warn' }, `${pendingCount()} por enviar`) : null;
  const header = h('header', { class: 'top' },
    view.back ? h('a', { class: 'iconbtn', href: view.back, 'aria-label': 'Volver' }, ic('chevron-left', 26)) : null,
    h('div', { style: { flex: 1, minWidth: 0 } }, h('h1', { id: 'page-title' }, view.title), view.sub ? h('div', { class: 'sub' }, view.sub) : null),
    sync,
    (view.actions || []).map((a) => (a.href ? h('a', { class: 'iconbtn', href: a.href, 'aria-label': a.label, title: a.label }, ic(a.icon)) : h('button', { class: 'iconbtn', type: 'button', 'aria-label': a.label, title: a.label, onclick: a.onClick }, ic(a.icon)))),
    // Entrenador: un foco para anotar una mejora de la app desde cualquier pantalla (Ayuda y Ajustes viven en Más y en la barra lateral).
    role === 'coach' ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Anotar una mejora para la app', title: 'Anotar una mejora para la app',
      onclick: () => (casaReady() ? loadView('mejoras').then((m) => m.ideaSheet(null, { area: IDEA_AREA[name] || 'otra' })) : (location.hash = '#/mejoras')) }, ic('lightbulb'))
      : [h('a', { class: 'iconbtn', href: '#/ayuda', 'aria-label': 'Ayuda', title: 'Ayuda' }, ic('circle-help')),
        h('a', { class: 'iconbtn', href: '#/ajustes', 'aria-label': 'Ajustes', title: 'Ajustes' }, ic('settings'))]);
  const navEl = h('nav', { class: 'nav', 'aria-label': 'Secciones' }, (NAV[role] || NAV.player).map(([id, label, icon, where]) =>
    h('a', { href: `#/${id}`, class: where ? `${where}-only` : null, 'aria-current': id === nav || (id === 'mas' && UNDER_MAS.has(nav)) ? 'page' : null }, ic(icon, 22), h('span', {}, label))));
  const banner = state.viewAs && state.self ? h('div', { class: 'viewas self', role: 'status' }, h('span', {}, `Estás en tu perfil de jugador: ${me.name}`),
    h('button', { class: 'btn sm', type: 'button', onclick: () => leaveSelf('#/hoy') }, 'Volver a entrenador'))
    : state.viewAs ? h('div', { class: 'viewas', role: 'status' }, h('span', {}, `Vista previa: así lo ve ${me.name}`),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { const id = state.viewAs; state.viewAs = null; location.hash = `#/jugador/${id}`; } }, 'Salir')) : null;
  // Aviso de una sola vez cuando el celular abre una versión nueva de Remate.
  const upd = !state.viewAs && name !== 'novedades' && unseenUpdate() ? updateBanner(() => render()) : null;
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1', 'aria-labelledby': 'page-title' }, banner, upd, safariBanner(), view.el);
  root.replaceChildren(h('div', { class: 'app' }, header, navEl, main));
  document.title = `${view.title} · Remate`;
  if (fresh) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); } else window.scrollTo(0, y);
  prefetchAll();
}

// iPhone en Safari (o abierto desde WhatsApp): aquí la sesión se guarda aparte de la app instalada.
let safariHidden = false;
export function installSheet() {
  openSheet({ title: 'Instala Remate en tu iPhone', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'En iPhone, Safari y Remate instalado guardan tu sesión por separado. Si entras a veces por Safari (por ejemplo desde un enlace de WhatsApp), te vuelve a pedir el código.'),
    h('ol', { class: 'plain' }, INSTALL_STEPS.map((x) => h('li', {}, x))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Puedes tener Remate abierto en hasta 3 lugares (por ejemplo la app instalada, Safari y una tablet) sin que se cierre en los otros.')),
  actions: [{ label: 'Entendido', kind: 'primary' }] });
}
function safariBanner() {
  if (safariHidden || state.mode !== 'cloud' || !iosBrowser()) return null;
  return h('div', { class: 'note warn safari-note', role: 'status' },
    h('span', {}, h('strong', {}, 'Estás en Safari, no en la app. '), 'Para que no te vuelva a pedir el código, abre Remate desde su ícono en tu pantalla de inicio.'),
    h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: installSheet }, 'Cómo instalarla'),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { safariHidden = true; render(); } }, 'Ahora no')));
}

function schedule() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); }

function mountApp() {
  mounted = true;
  if (firstRun()) ls.set(SEEN_KEY, 'anterior');   // ya usaba Remate antes de que hubiera versiones: que vea el aviso
  if (!location.hash || location.hash === '#') location.replace(HOME[state.role] || '#/inicio');
  render({ fresh: true });
}
function mountGate() {
  mounted = false;
  if (firstRun()) markSeen();   // celular nuevo: no hay "actualización" que avisar
  root.replaceChildren(renderGate(() => { location.hash = ''; mountApp(); }));
  document.title = 'Remate';
}

onChange(schedule);
addEventListener('hashchange', () => render({ fresh: true }));

(async function start() {
  applyTheme();
  try { navigator.storage?.persist?.().catch(() => {}); } catch { /* el navegador decide */ }   // que el celular no borre la sesión
  root.replaceChildren(h('div', { class: 'boot', role: 'status' }, h('img', { class: 'hero-icon', src: 'icons/icon-192.png', alt: '', width: 150, height: 150 }), h('p', {}, 'Cargando Remate…')));
  let where = 'gate';
  try { where = await boot(); } catch (e) { console.error(e); }
  if (where === 'app') mountApp(); else mountGate();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
