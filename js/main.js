// Arranque de Remate: entrada, rutas, encabezado, navegación y re-dibujo cuando cambian los datos.
import { h, ic, $ } from './util.js';
import { state, onChange, getPlayer, pendingCount } from './store.js';
import { boot } from './auth.js';
import { applyTheme } from './theme.js';
import { renderGate } from './views/gate.js';
import hoy from './views/hoy.js';
import jugadores from './views/jugadores.js';
import jugador from './views/jugador.js';
import sesiones from './views/sesiones.js';
import sesion from './views/sesion.js';
import ejercicios from './views/ejercicios.js';
import ejercicio from './views/ejercicio.js';
import ruta from './views/ruta.js';
import ajustes from './views/ajustes.js';
import ayuda from './views/ayuda.js';
import inicio from './views/inicio.js';
import entrenos from './views/entrenos.js';
import partidos from './views/partidos.js';
import partido from './views/partido.js';
import lab from './views/lab.js';
import reportes from './views/reportes.js';
import mas from './views/mas.js';
import casa from './views/casa.js';
import mejoras, { ideaSheet } from './views/mejoras.js';
import { casaReady } from './store.js';

const COACH = { hoy, jugadores, jugador, sesiones, sesion, ejercicios, ejercicio, ruta, ajustes, ayuda, partidos, partido, lab, reportes, mas, casa, mejoras };
const PLAYER = { inicio, ruta, entrenos, partidos, ejercicios, ejercicio, casa, ajustes, ayuda };
// [ruta, texto, ícono, dónde se ve]: 'wide' solo en pantalla grande (barra lateral), 'narrow' solo en celular.
const NAV = {
  coach: [['hoy', 'Hoy', 'house'], ['jugadores', 'Jugadores', 'users'], ['sesiones', 'Entrenos', 'calendar-days'], ['partidos', 'Partidos', 'volleyball'],
    ['ejercicios', 'Ejercicios', 'book-open', 'wide'], ['ruta', 'Ruta', 'flag', 'wide'], ['lab', 'Laboratorio', 'zap', 'wide'], ['reportes', 'Reportes', 'file-text', 'wide'],
    ['mejoras', 'Mejoras', 'lightbulb', 'wide'], ['ajustes', 'Ajustes', 'settings', 'wide'], ['ayuda', 'Ayuda', 'circle-help', 'wide'],
    ['mas', 'Más', 'layout-grid', 'narrow']],
  player: [['inicio', 'Inicio', 'house'], ['entrenos', 'Entrenos', 'calendar-days'], ['partidos', 'Partidos', 'volleyball'], ['ejercicios', 'Ejercicios', 'book-open'], ['ruta', 'Ruta', 'flag']],
};
const PARENT = { jugador: 'jugadores', sesion: 'sesiones', ejercicio: 'ejercicios', partido: 'partidos', casa: 'ejercicios' };   // sección que se ilumina en la navegación
const UNDER_MAS = new Set(['ejercicios', 'ruta', 'lab', 'reportes', 'ajustes', 'ayuda', 'mejoras', 'mas']);
// Pantalla en la que estás → sección de la mejora (para anotarla rápido desde el foco del encabezado).
const IDEA_AREA = { hoy: 'hoy', jugadores: 'jugadores', jugador: 'jugadores', sesiones: 'entrenos', sesion: 'entrenos', partidos: 'partidos', partido: 'partidos',
  casa: 'casa', lab: 'laboratorio', reportes: 'reportes', ruta: 'ruta', ejercicios: 'ejercicios', ejercicio: 'ejercicios', ajustes: 'ajustes' };          // en celular, estas iluminan "Más"

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
  if (name === 'ver' && state.role === 'coach' && getPlayer(args[0])) { state.viewAs = args[0]; location.replace('#/inicio'); return; }
  const role = state.viewAs ? 'player' : state.role;
  const table = role === 'coach' ? COACH : PLAYER;
  if (!table[name]) { location.replace(role === 'coach' ? '#/hoy' : '#/inicio'); return; }
  const me = state.viewAs ? getPlayer(state.viewAs) : state.me;
  if (state.viewAs && !me) { state.viewAs = null; location.replace('#/jugadores'); return; }
  const key = [role, name, ...args].join('/');
  if (!uiState.has(key)) uiState.set(key, {});
  const y = fresh ? 0 : window.scrollY;
  const ctx = { role, me, readonly: !!state.viewAs, args, ui: uiState.get(key), rerender: () => render() };
  let view;
  try { view = table[name](ctx); } catch (e) { view = errorView(e); }
  const nav = (PARENT[name] || name);

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
      onclick: () => (casaReady() ? ideaSheet(null, { area: IDEA_AREA[name] || 'otra' }) : (location.hash = '#/mejoras')) }, ic('lightbulb'))
      : [h('a', { class: 'iconbtn', href: '#/ayuda', 'aria-label': 'Ayuda', title: 'Ayuda' }, ic('circle-help')),
        h('a', { class: 'iconbtn', href: '#/ajustes', 'aria-label': 'Ajustes', title: 'Ajustes' }, ic('settings'))]);
  const navEl = h('nav', { class: 'nav', 'aria-label': 'Secciones' }, NAV[role].map(([id, label, icon, where]) =>
    h('a', { href: `#/${id}`, class: where ? `${where}-only` : null, 'aria-current': id === nav || (id === 'mas' && UNDER_MAS.has(nav)) ? 'page' : null }, ic(icon, 22), h('span', {}, label))));
  const banner = state.viewAs ? h('div', { class: 'viewas', role: 'status' }, h('span', {}, `Vista previa: así lo ve ${me.name}`),
    h('button', { class: 'btn sm', type: 'button', onclick: () => { const id = state.viewAs; state.viewAs = null; location.hash = `#/jugador/${id}`; } }, 'Salir')) : null;
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1', 'aria-labelledby': 'page-title' }, banner, view.el);
  root.replaceChildren(h('div', { class: 'app' }, header, navEl, main));
  document.title = `${view.title} · Remate`;
  if (fresh) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); } else window.scrollTo(0, y);
}

function schedule() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); }

function mountApp() {
  mounted = true;
  if (!location.hash || location.hash === '#') location.replace(state.role === 'coach' ? '#/hoy' : '#/inicio');
  render({ fresh: true });
}
function mountGate() {
  mounted = false;
  root.replaceChildren(renderGate(() => { location.hash = ''; mountApp(); }));
  document.title = 'Remate';
}

onChange(schedule);
addEventListener('hashchange', () => render({ fresh: true }));

(async function start() {
  applyTheme();
  root.replaceChildren(h('p', { style: { padding: '24px', color: 'var(--ink-2)' } }, 'Cargando Remate…'));
  let where = 'gate';
  try { where = await boot(); } catch (e) { console.error(e); }
  if (where === 'app') mountApp(); else mountGate();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
