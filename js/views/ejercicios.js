// Biblioteca de ejercicios con búsqueda y filtros (entrenador y jugador).
import { h, ic, plural } from '../util.js';
import { state } from '../store.js';
import { SKILLS, SKILL_BY_ID } from '../content/skills.js';
import { allExercises, filterExercises, KINDS, MATERIAL, levelLabel } from '../content/exercises.js';
import { sectionTitle, options } from './ui.js';
import { customExerciseSheet } from './sheets-session.js';

export default function ejercicios(ctx) {
  const ui = ctx.ui;
  const mine = ctx.role === 'player' ? ctx.me?.level : 0;
  ui.q ??= ''; ui.skill ??= ''; ui.level ??= '0'; ui.kind ??= ''; ui.material ??= '';
  const q = h('input', { type: 'search', placeholder: 'Buscar ejercicio', 'aria-label': 'Buscar ejercicio', value: ui.q });
  const sk = h('select', { 'aria-label': 'Habilidad' }, options([['', 'Todas las habilidades'], ...SKILLS.map((s) => [s.id, s.name])], ui.skill));
  const lv = h('select', { 'aria-label': 'Nivel' }, options([['0', 'Todos los niveles'], ...(mine ? [[String(mine), `Mi nivel (${mine})`]] : []), ...[1, 2, 3, 4, 5, 6].filter((n) => n !== mine).map((n) => [String(n), `Nivel ${n}`])], ui.level));
  const kd = h('select', { 'aria-label': 'Tipo' }, options([['', 'Todos los tipos'], ...Object.entries(KINDS)], ui.kind));
  const mt = h('select', { 'aria-label': 'Material' }, options([['', 'Todo el material'], ...Object.entries(MATERIAL)], ui.material));
  const rows = h('div', { class: 'rows' }), count = h('span', { class: 'row-sub', 'aria-live': 'polite' });
  const order = (e) => SKILLS.findIndex((s) => s.id === e.skills[0]) * 10 + e.levels[0];
  function paint() {
    Object.assign(ui, { q: q.value, skill: sk.value, level: lv.value, kind: kd.value, material: mt.value });
    const all = allExercises(state.data.customEx);
    const list = filterExercises(all, { q: ui.q, skill: ui.skill, level: Number(ui.level), kind: ui.kind, material: ui.material }).sort((a, b) => order(a) - order(b));
    count.textContent = list.length === all.length ? plural(list.length, 'ejercicio', 'ejercicios') : `${list.length} de ${all.length}`;
    rows.replaceChildren(...(list.length ? list.map((e) => h('a', { class: 'row', href: `#/ejercicio/${e.id}` },
      h('span', { class: 'row-main' }, h('strong', {}, e.name), h('span', { class: 'row-sub' }, `${e.min} min, ${levelLabel(e)}, ${e.skills.map((k) => SKILL_BY_ID[k]?.name || k).join(', ')}`)),
      h('span', { class: 'row-end' }, e.custom ? h('span', { class: 'chip ok' }, 'Propio') : null, ic('chevron-right', 18)))) : [h('div', { class: 'empty' }, 'Ningún ejercicio coincide con esos filtros.')]));
  }
  [q, sk, lv, kd, mt].forEach((x) => x.addEventListener('input', paint));
  paint();
  const add = ctx.role === 'coach' ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => customExerciseSheet(null, (row) => { if (row) location.hash = `#/ejercicio/c-${row.id}`; }) }, ic('plus', 16), 'Ejercicio propio') : null;
  const home = h('a', { class: 'labcard', href: '#/casa' }, h('span', { class: 'lc-ic' }, ic('house', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Para hacer en casa'), h('span', {}, ctx.role === 'coach' ? 'Rutinas opcionales que ven tus jugadores: físico, técnica con y sin balón.' : 'Opcional: físico, técnica con balón y sin balón, a tu nivel.')), ic('chevron-right', 20));
  return { title: 'Ejercicios', el: h('div', { class: 'page' }, home, h('section', {}, sectionTitle('Biblioteca', add),
    h('div', { class: 'stack' }, q, h('div', { class: 'grid' }, sk, lv, kd, mt), count, rows))) };
}
