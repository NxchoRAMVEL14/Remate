// Biblioteca de ejercicios con búsqueda y filtros (entrenador y jugador).
import { h, ic, plural } from '../util.js';
import { state, players } from '../store.js';
import { favorites, isFav, usage, usageText, fitsPlayers } from './biblioteca.js';
import { SKILLS, SKILL_BY_ID } from '../content/skills.js';
import { allExercises, filterExercises, KINDS, MATERIAL } from '../content/exercises.js';
import { signals } from './plan-toque.js';
import { delDiaPanel } from './del-dia.js';
import { sectionTitle, options } from './ui.js';
import { customExerciseSheet } from './sheets-session.js';
import { gymVisible } from './gym.js';

// v3.28: biblioteca visual. Tres niveles grandes (Principiante 1-2, Intermedio 3-4, Avanzado 5-6), fundamentos en chips,
// tarjetas con color por fundamento y «Destacados» según lo que más necesita tu equipo (o tu nivel, si eres jugador).
export const TIERS = [
  { id: 'p', name: 'Principiante', range: [1, 2], cls: 't-p' },
  { id: 'i', name: 'Intermedio', range: [3, 4], cls: 't-i' },
  { id: 'a', name: 'Avanzado', range: [5, 6], cls: 't-a' },
];
const SK_IC = { saque: 'send', recepcion: 'shield', colocacion: 'hand', remate: 'zap', bloqueo: 'brick-wall', defensa: 'shield-check', fisico: 'dumbbell', juego: 'users' };
export const skIcon = (k) => SK_IC[k] || 'volleyball';
const inTier = (e, t) => e.levels[0] <= t.range[1] && e.levels[1] >= t.range[0];
export const tierOf = (e) => TIERS.find((t) => e.levels[0] >= t.range[0] && e.levels[0] <= t.range[1]) || TIERS[0];
export const tierOfLevel = (n) => TIERS.find((t) => n >= t.range[0] && n <= t.range[1]) || TIERS[0];
const tierBadge = (e) => { if (e.cero) return h('span', { class: 'tier-b t-cero' }, 'Desde cero'); const t = tierOf(e), top = TIERS.find((x) => e.levels[1] >= x.range[0] && e.levels[1] <= x.range[1]) || t;
  return h('span', { class: `tier-b ${t.cls}` }, t === top ? t.name : `${t.name} a ${top.name.toLowerCase()}`); };
export const exCard = (e, extra) => h('a', { class: `excard sk-${e.skills[0]}`, href: `#/ejercicio/${e.id}` },
  h('span', { class: 'ex-ic', 'aria-hidden': 'true' }, ic(skIcon(e.skills[0]), 22)),
  h('span', { class: 'ex-t' }, h('strong', {}, e.name),
    h('span', { class: 'ex-meta' }, tierBadge(e), h('span', { class: 'row-sub' }, `${e.min} min · ${e.skills.map((k) => SKILL_BY_ID[k]?.name || k).join(', ')}`)),
    extra ? h('span', { class: 'row-sub' }, extra) : null),
  h('span', { class: 'row-end' }, isFav(e.id) ? h('span', { class: 'fav-on', title: 'Favorito' }, ic('star', 16)) : null, e.custom ? h('span', { class: 'chip ok' }, 'Propio') : null, ic('chevron-right', 18)));

function featured(ctx, all) {
  const isP = ctx.role === 'player';
  let skill = '', level = 0, why = '';
  if (isP) { level = Number(ctx.me?.level) || 1; why = `Para tu nivel (${level})`; }
  else {
    try { const sg = signals(); level = sg.level; const top = Object.entries(sg.score).filter(([k, v]) => v > 0 && k !== 'fisico').sort((a, b) => b[1] - a[1])[0];
      if (top) { skill = top[0]; why = `Lo que más necesita tu equipo: ${SKILL_BY_ID[skill]?.name.toLowerCase()}, nivel ${level}`; } else why = `Para el nivel de tu equipo (${level})`; }
    catch { level = 0; }
  }
  if (!level) return null;
  const sortF = (a, b) => (b.kind === 'juego') - (a.kind === 'juego') || a.min - b.min;
  const first = filterExercises(all, { skill, level }).filter((e) => e.kind !== 'calentamiento' && e.kind !== 'cierre').sort(sortF);
  const rest = filterExercises(all, { level }).filter((e) => (e.kind === 'tecnica' || e.kind === 'juego') && !first.includes(e)).sort(sortF);
  const pick = [...first, ...rest].slice(0, 3);
  if (!pick.length) return null;
  return h('section', { class: 'stack featured' }, h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, ic('star', 18), ' Destacados'), h('span', { class: 'row-sub' }, why)),
    h('div', { class: 'rows' }, pick.map((e) => exCard(e))));
}

export default function ejercicios(ctx) {
  const ui = ctx.ui;
  const mine = ctx.role === 'player' ? Number(ctx.me?.level) || 0 : 0;
  ui.q ??= ''; ui.skill ??= ''; ui.tier ??= ''; ui.level ??= '0'; ui.kind ??= ''; ui.material ??= ''; ui.more ??= false; ui.view ??= ''; ui.np ??= '';
  const all = allExercises(state.data.customEx);
  const q = h('input', { type: 'search', placeholder: 'Buscar ejercicio', 'aria-label': 'Buscar ejercicio', value: ui.q });
  const lv = h('select', { 'aria-label': 'Nivel exacto' }, options([['0', 'Cualquier nivel exacto'], ...[1, 2, 3, 4, 5, 6].map((n) => [String(n), `Nivel ${n}${n === mine ? ' (el tuyo)' : ''}`])], ui.level));
  const kd = h('select', { 'aria-label': 'Tipo' }, options([['', 'Todos los tipos'], ...Object.entries(KINDS)], ui.kind));
  const mt = h('select', { 'aria-label': 'Material' }, options([['', 'Todo el material'], ...Object.entries(MATERIAL)], ui.material));
  // v3.40: cuántos van a entrenar, favoritos y más usados.
  const nGroup = players().length;
  const np = h('select', { 'aria-label': '¿Cuántos van a entrenar?' }, options([['', 'Cualquier número de jugadores'], ...(nGroup ? [[String(nGroup), `${nGroup} (tu grupo)`]] : []),
    ...Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n !== nGroup).map((n) => [String(n), plural(n, 'jugador', 'jugadores')])], ui.np));
  const viewBox = h('div', { class: 'seg', role: 'group', 'aria-label': 'Ver' });
  const rows = h('div', { class: 'rows' }), count = h('span', { class: 'row-sub', 'aria-live': 'polite' });
  const tierBox = h('div', { class: 'tiers', role: 'group', 'aria-label': 'Nivel' }), chipBox = h('div', { class: 'skchips', role: 'group', 'aria-label': 'Fundamento' });
  const order = (e) => (e.cero ? 50 : e.levels[0] * 100) + SKILLS.findIndex((s) => s.id === e.skills[0]) * 10 + e.min / 10;
  const SK = SKILLS.filter((x) => SK_IC[x.id]);
  const feat = featured(ctx, all);
  function paint() {
    Object.assign(ui, { q: q.value, level: lv.value, kind: kd.value, material: mt.value, np: np.value });
    const favs = favorites(), use = ctx.role === 'coach' ? usage() : new Map();
    const views = [['', 'Todos'], ['fav', `Favoritos (${favs.size})`], ...(ctx.role === 'coach' ? [['uso', 'Más usados']] : [])];
    viewBox.replaceChildren(...views.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': ui.view === k ? 'true' : 'false', onclick: () => { ui.view = k; paint(); } }, k === 'fav' ? ic('star', 14) : null, t)));
    const nP = Number(ui.np) || 0;
    const base = filterExercises(all, { q: ui.q, kind: ui.kind, material: ui.material, level: Number(ui.level) })
      .filter((e) => fitsPlayers(e, nP) && (ui.view !== 'fav' || favs.has(e.id)) && (ui.view !== 'uso' || (use.has(e.id) && e.kind !== 'calentamiento' && e.kind !== 'cierre')));   // más usados: sin calentamientos ni cierres
    const t = TIERS.find((x) => x.id === ui.tier);
    const mineT = mine ? { id: 'm', range: [mine, mine] } : null;
    const tFilter = ui.tier === 'm' ? mineT : t;
    const byTier = (e) => !tFilter || inTier(e, tFilter);
    tierBox.replaceChildren(...[...(mine ? [{ id: 'm', name: 'Mi nivel', range: [mine, mine], cls: 't-m', sub: `Nivel ${mine}` }] : []), ...TIERS.map((x) => ({ ...x, sub: `Niveles ${x.range[0]} y ${x.range[1]}` }))].map((x) => {
      const n = base.filter((e) => inTier(e, x) && (!ui.skill || e.skills.includes(ui.skill))).length, on = ui.tier === x.id;
      return h('button', { type: 'button', class: `tierbtn ${x.cls}`, 'aria-pressed': on ? 'true' : 'false', onclick: () => { ui.tier = on ? '' : x.id; paint(); } },
        h('strong', {}, x.name), h('span', { class: 'tb-n' }, String(n)), h('small', {}, x.sub));
    }));
    chipBox.replaceChildren(h('button', { type: 'button', class: 'skchip', 'aria-pressed': !ui.skill ? 'true' : 'false', onclick: () => { ui.skill = ''; paint(); } }, 'Todos'),
      ...SK.map((x) => { const n = base.filter((e) => byTier(e) && e.skills.includes(x.id)).length, on = ui.skill === x.id;
        return h('button', { type: 'button', class: `skchip sk-${x.id}`, 'aria-pressed': on ? 'true' : 'false', disabled: !n && !on ? true : null, onclick: () => { ui.skill = on ? '' : x.id; paint(); } }, ic(skIcon(x.id), 15), `${x.name} `, h('small', {}, String(n))); }));
    const list = base.filter((e) => byTier(e) && (!ui.skill || e.skills.includes(ui.skill))).sort((a, b) => order(a) - order(b) + (tFilter ? ((a.levels[0] < tFilter.range[0]) - (b.levels[0] < tFilter.range[0])) * 1000 : 0));   // v3.31: los que empiezan en el nivel elegido, primero
    if (ui.view === 'uso') list.sort((a, b) => use.get(b.id).n - use.get(a.id).n || use.get(b.id).last.localeCompare(use.get(a.id).last));
    count.textContent = list.length === all.length ? plural(list.length, 'ejercicio', 'ejercicios') : `${list.length} de ${all.length}`;
    if (feat) feat.hidden = !!(ui.q || ui.tier || ui.skill || ui.view || nP);
    const emptyTxt = ui.view === 'fav' && !favs.size ? 'Todavía no tienes favoritos: abre un ejercicio y toca «Favorito».'
      : ui.view === 'uso' && !use.size ? 'Todavía no hay ejercicios en tus entrenos de los últimos 6 meses.' : 'Ningún ejercicio coincide con esos filtros.';
    rows.replaceChildren(...(list.length ? list.map((e) => exCard(e, ui.view === 'uso' ? usageText(use.get(e.id)) : null)) : [h('div', { class: 'empty' }, emptyTxt)]));
  }
  [q, lv, kd, mt, np].forEach((x) => x.addEventListener('input', paint));
  paint();
  const more = h('details', { class: 'morefil', open: ui.more || ui.kind || ui.material || ui.level !== '0' ? true : null, ontoggle: (e) => { ui.more = e.target.open; } },
    h('summary', {}, 'Más filtros: tipo, material, nivel exacto'), h('div', { class: 'grid', style: { marginTop: '8px' } }, kd, mt, lv));
  const add = ctx.role === 'coach' ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => customExerciseSheet(null, (row) => { if (row) location.hash = `#/ejercicio/c-${row.id}`; }) }, ic('plus', 16), 'Ejercicio propio') : null;
  const home = h('a', { class: 'labcard', href: '#/casa' }, h('span', { class: 'lc-ic' }, ic('house', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Para hacer en casa'), h('span', {}, ctx.role === 'coach' ? 'Rutinas opcionales que ven tus jugadores: físico, técnica con y sin balón.' : 'Opcional: físico, técnica con balón y sin balón, a tu nivel.')), ic('chevron-right', 20));
  const gymCard = ctx.role === 'coach' || gymVisible() || ctx.self ? h('a', { class: 'labcard', href: '#/gym' }, h('span', { class: 'lc-ic' }, ic('dumbbell', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Físico en el gym'), h('span', {}, ctx.role === 'coach' ? 'Rutinas de pesas para tus jugadores, quién va al gym y sus cargas.' : 'Tu rutina de pesas según lo que quieres mejorar, y cómo llegar bien al entreno.')), ic('chevron-right', 20)) : null;
  // v3.21: Aprende, la teoría y la práctica juntas.
  const learn = h('a', { class: 'labcard', href: '#/aprende' }, h('span', { class: 'lc-ic' }, ic('graduation-cap', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Aprende por fundamento o posición'), h('span', {}, 'Saque, remate, central, líbero…: la teoría, la práctica, En casa y el gym, juntos.')), ic('chevron-right', 20));
  return { title: 'Ejercicios', el: h('div', { class: 'page' }, h('div', { class: 'labcards' }, learn, ctx.role === 'coach' ? h('a', { class: 'labcard', href: '#/cero' }, h('span', { class: 'lc-ic' }, ic('sprout', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Desde cero'), h('span', {}, 'Programa de clases para quien nunca ha jugado.')), ic('chevron-right', 20)) : null, home, gymCard), ctx.role === 'coach' ? delDiaPanel(ui) : null, h('section', {}, sectionTitle('Biblioteca', add),
    h('div', { class: 'stack' }, viewBox, tierBox, chipBox, h('div', { class: 'grid lib-top' }, q, np), more, feat, h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, 'Todos'), count), rows))) };
}
