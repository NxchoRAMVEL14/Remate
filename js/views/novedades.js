// Novedades: versión actual de Remate y qué cambió en cada versión (lo más nuevo arriba).
import { h, ic, fmtDate } from '../util.js';
import { ls } from '../store.js';
import { VERSION, CHANGELOG } from '../version.js';
import { sectionTitle } from './ui.js';

// Última versión que este celular ya vio. Sirve para avisar una sola vez cuando Remate se actualiza.
export const SEEN_KEY = 'remate.version.vista';
export const markSeen = () => ls.set(SEEN_KEY, VERSION);
export const unseenUpdate = () => { const v = ls.get(SEEN_KEY); return !!v && v !== VERSION; };
export const firstRun = () => !ls.get(SEEN_KEY);

const when = (f) => fmtDate(f, { day: 'numeric', month: 'long', year: 'numeric' });

// Bloque "Acerca de Remate" para Ajustes (todos los roles).
export const aboutSection = () => h('section', { class: 'stack' }, sectionTitle('Acerca de Remate'),
  h('div', { class: 'rows' }, h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, `Versión ${VERSION}`), h('span', { class: 'row-sub' }, `Actualizada el ${when(CHANGELOG[0].f)}`)),
    h('a', { class: 'btn sm', href: '#/novedades' }, ic('sparkles', 18), 'Ver novedades'))));

// Aviso de una sola vez después de una actualización.
export function updateBanner(onClose) {
  const close = () => { markSeen(); onClose(); };
  return h('div', { class: 'updbar', role: 'status' },
    h('span', {}, ic('sparkles', 18), ` Remate se actualizó a la versión ${VERSION}.`),
    h('span', { class: 'cluster' }, h('a', { class: 'btn sm', href: '#/novedades', onclick: () => markSeen() }, 'Ver novedades'),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar aviso', onclick: close }, ic('x', 20))));
}

export default function novedades(ctx) {
  markSeen();
  const back = ctx.role === 'coach' ? '#/ajustes' : null;
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, 'Estás usando'), h('h2', {}, `Remate ${VERSION}`),
      h('p', { style: { margin: 0 } }, 'Cuando subes una versión nueva a GitHub, cada celular la descarga sola al abrir Remate con internet. Si no la ves, cierra la app por completo y vuelve a abrirla.')),
    h('section', { class: 'stack' }, sectionTitle('Qué cambió'),
      h('ol', { class: 'changelog' }, CHANGELOG.map((c, i) => h('li', { class: 'panel' },
        h('div', { class: 'cl-head' }, h('strong', {}, `Versión ${c.v}`), i === 0 ? h('span', { class: 'chip ball' }, 'Actual') : null, h('span', { class: 'row-sub' }, when(c.f))),
        h('p', {}, c.t))))),
    h('p', { class: 'row-sub' }, 'Las versiones siguen la forma mayor.menor.corrección: el primer número cambia con funciones grandes, el segundo con mejoras y el tercero con arreglos.'));
  return { title: 'Novedades', back, el };
}
