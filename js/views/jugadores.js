// Lista de jugadores con búsqueda, filtros y orden.
import { h, ic, plural } from '../util.js';
import { state, players, settings } from '../store.js';
import { levelGap, attendanceFor } from '../calc.js';
import { POSITIONS } from '../content/skills.js';
import { sectionTitle, empty, playerRow, options } from './ui.js';
import { playerFormSheet } from './sheets-player.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function jugadores(ctx) {
  const ui = ctx.ui;
  ui.q ??= ''; ui.level ??= '0'; ui.pos ??= ''; ui.sort ??= 'nombre';
  const all = players();
  const st = settings();
  const info = new Map(all.map((p) => [p.id, { att: attendanceFor(p.id, state.data.sessions, state.data.attendance, st), gap: levelGap(p, state.data.ratings) }]));

  const q = h('input', { type: 'search', placeholder: 'Buscar por nombre', 'aria-label': 'Buscar jugador', value: ui.q });
  const lv = h('select', { 'aria-label': 'Nivel' }, options([['0', 'Todos los niveles'], ...[1, 2, 3, 4, 5, 6].map((n) => [String(n), `Nivel ${n}`])], ui.level));
  const pos = h('select', { 'aria-label': 'Posición' }, options([['', 'Todas las posiciones'], ...POSITIONS.filter((p) => p.id !== 'sin_definir').map((p) => [p.id, p.name])], ui.pos));
  const sort = h('select', { 'aria-label': 'Ordenar por' }, options([['nombre', 'Orden: nombre'], ['nivel', 'Orden: nivel'], ['asistencia', 'Orden: asistencia']], ui.sort));
  const rows = h('div', { class: 'rows' });
  const count = h('span', { class: 'row-sub', 'aria-live': 'polite' });

  function paint() {
    ui.q = q.value; ui.level = lv.value; ui.pos = pos.value; ui.sort = sort.value;
    let list = all.filter((p) => (!ui.q || norm(p.name).includes(norm(ui.q))) && (ui.level === '0' || p.level === Number(ui.level)) && (!ui.pos || p.position === ui.pos));
    if (ui.sort === 'nivel') list = [...list].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'es'));
    if (ui.sort === 'asistencia') list = [...list].sort((a, b) => (info.get(a.id).att.pct ?? 101) - (info.get(b.id).att.pct ?? 101));
    count.textContent = all.length === list.length ? plural(list.length, 'jugador', 'jugadores') : `${list.length} de ${all.length}`;
    rows.replaceChildren(...(list.length ? list.map((p) => {
      const i = info.get(p.id);
      const end = [];
      if (i.gap.ready) end.push(h('span', { class: 'chip ball', title: 'Cumple las fases para el examen' }, 'Listo'));
      if (i.att.faltasSeguidas >= 2) end.push(h('span', { class: 'chip bad' }, `${i.att.faltasSeguidas} faltas`));
      else if (i.att.pct != null) end.push(h('span', { class: `chip ${i.att.pct >= 85 ? 'ok' : i.att.pct >= 70 ? 'warn' : 'bad'}`, title: 'Asistencia' }, `${i.att.pct}%`));
      return playerRow(p, { href: `#/jugador/${p.id}`, end });
    }) : [h('div', { class: 'empty' }, all.length ? 'Ningún jugador coincide con esos filtros.' : '')]));
  }
  [q, lv, pos, sort].forEach((x) => x.addEventListener('input', paint));
  paint();

  const el = h('div', { class: 'page' },
    h('section', {}, sectionTitle('Jugadores', h('button', { class: 'btn primary sm', type: 'button', onclick: () => playerFormSheet() }, ic('plus', 16), 'Agregar')),
      all.length ? h('div', { class: 'stack' }, q, h('div', { class: 'grid' }, lv, pos, sort), count, rows)
        : empty('Todavía no hay jugadores', 'Agrega a tu primer jugador: solo necesitas un nombre o apodo. Después le das su código para que entre desde su celular.',
          h('button', { class: 'btn primary', type: 'button', onclick: () => playerFormSheet() }, ic('plus', 18), 'Agregar jugador'))));
  return { title: 'Jugadores', el };
}
