// Asistir: lo que hace un ayudante (asistente adulto o capitán): pasar lista y capturar partidos.
import { h, ic, fmtDate, todayStr, addDays, plural } from '../util.js';
import { state, group, sessions, players, isStaff, teamReady } from '../store.js';
import { attendanceSheet } from './sheets-session.js';
import { matchSheet, matchesSorted, resultChip } from './partidos.js';
import { sectionTitle, note, empty, sessionWhen } from './ui.js';

export default function asistir(ctx) {
  if (!isStaff()) return { title: 'Asistir', back: '#/inicio', el: h('div', { class: 'page' }, empty('Esta sección es para ayudantes', 'Tu entrenador puede nombrarte capitán para que pases lista y captures partidos.')) };
  const t = todayStr(), all = sessions();
  const marks = (s) => state.data.attendance.filter((a) => a.session_id === s.id).length;
  // Hoy primero; si no hay, el más reciente de los últimos 3 días o el siguiente.
  const today = all.filter((s) => s.session_date === t);
  const recent = all.filter((s) => s.session_date < t && s.session_date >= addDays(t, -14)).reverse().slice(0, 5);
  const upcoming = all.filter((s) => s.session_date > t && s.status === 'planeada').slice(0, 2);
  const live = matchesSorted().filter((m) => m.status !== 'terminado').reverse();
  const n = players().length;
  const sessRow = (s) => h('div', { class: 'row' },
    h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, `${sessionWhen(s)} · ${marks(s) ? `lista de ${marks(s)} de ${n}` : 'sin lista'}`)),
    h('button', { class: `btn sm ${marks(s) ? '' : 'primary'}`, type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 16), marks(s) ? 'Corregir' : 'Pasar lista'));
  const who = state.role === 'assistant' ? 'asistente' : 'capitán';
  const el = h('div', { class: 'page' },
    !teamReady() ? note('Tu entrenador todavía no termina de activar esta función. Pídele que actualice Remate.', 'warn') : null,
    h('section', { class: 'band next stack' },
      h('span', { class: 'when' }, group()?.name || 'Tu equipo'),
      h('h2', {}, `Eres ${who}`),
      h('p', { style: { margin: 0 } }, `Puedes pasar lista y capturar partidos de los ${plural(n, 'jugador', 'jugadores')} del equipo. No ves notas, evaluaciones ni datos privados.`)),
    h('section', { class: 'stack' }, sectionTitle('Pasar lista'),
      today.length || recent.length ? h('div', { class: 'rows' }, [...today, ...recent].map(sessRow)) : empty('No hay entrenamientos de hoy ni recientes', null),
      upcoming.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Próximo: ${upcoming.map((s) => `${s.title || 'Entrenamiento'} (${sessionWhen(s)})`).join(', ')}.`) : null),
    h('section', { class: 'stack' }, sectionTitle('Partidos', h('button', { class: 'btn ghost sm', type: 'button', onclick: () => matchSheet(null, (m) => { location.hash = `#/partido/${m.id}`; }) }, ic('plus', 16), 'Nuevo')),
      live.length ? h('div', { class: 'rows' }, live.map((m) => h('a', { class: 'row', href: `#/partido/${m.id}` },
        h('span', { class: 'row-main' }, h('strong', {}, `Contra ${m.rival}`), h('span', { class: 'row-sub' }, fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }))),
        h('span', { class: 'row-end' }, resultChip(m), h('span', { class: 'btn sm primary' }, 'Capturar')))))
        : h('p', { class: 'row-sub', style: { margin: 0 } }, 'No hay partidos por jugar. Crea uno con "Nuevo" para capturarlo.')));
  return { title: 'Asistir', sub: who === 'capitán' ? 'Modo capitán' : 'Asistente', back: state.role === 'assistant' ? null : '#/inicio', el };
}
