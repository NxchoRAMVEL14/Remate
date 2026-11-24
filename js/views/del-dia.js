// Entreno del día por nivel (v3.29): un entreno listo para Principiante, Intermedio o Avanzado que cambia cada día.
// A diferencia de «Armar con un toque» (que usa el radar y los partidos de tu equipo), este no necesita datos:
// el tema del día rota en un ciclo de 7 y los ejercicios salen de la biblioteca para el nivel elegido.
// «Usar en mi próximo entreno» lo pone en el siguiente entrenamiento; si va en dos grupos (v3.28), A recibe el de su nivel
// y B el de su nivel, bloque por bloque (en «alt»). Sin SQL.
import { h, ic, toast, openSheet, confirmSheet, todayStr, addDays, fmtDate, append, parseDate, plural } from '../util.js';
import { state, add, patch, settings, group, teamPlayers } from '../store.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { getExercise, BUILTIN } from '../content/exercises.js';
import { warmupFor } from '../content/templates.js';
import { pick, pickGame, weakRotation, rotNote, ROT_EX } from './plan-toque.js';
import { nextTrainingDay } from './sugerido.js';
import { TIERS, tierOfLevel, skIcon } from './ejercicios.js';
import { groupsOf } from './grupos.js';
import { blockAt } from './temporada.js';
import { fixPlan, presentOf } from './condiciones.js';
import { note } from './ui.js';

const NAME = (k) => SKILL_BY_ID[k]?.name || k;
// El ciclo de temas: dos fundamentos y para qué sirve el juego del final.
export const THEMES = [
  { t: 'Saque y recepción', f: ['saque', 'recepcion'], d: 'El primer contacto del rally: sacar con intención y recibir a zona.' },
  { t: 'Colocación y ataque', f: ['colocacion', 'remate'], d: 'De la colocación al remate: ritmo, altura y aproximación.' },
  { t: 'Defensa y bloqueo', f: ['defensa', 'bloqueo'], d: 'Frenar el ataque rival: lectura, posición baja y manos arriba.' },
  { t: 'Side-out', f: ['recepcion', 'colocacion'], d: 'Ganar el punto con tu saque en contra: recibir, colocar y terminar.' },
  { t: 'Saque y defensa', f: ['saque', 'defensa'], d: 'Presionar con el saque y sostener el rally atrás.' },
  { t: 'Ataque y bloqueo', f: ['remate', 'bloqueo'], d: 'El duelo en la red: atacar con opciones y bloquear con tiempo.' },
  { t: 'Recepción y defensa', f: ['recepcion', 'defensa'], d: 'Todo lo que se juega abajo: plataforma, desplazamiento y control.' },
];
const dayIdx = (date) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 864e5);
export const themeOf = (date) => THEMES[((dayIdx(date) % 7) + 7) % 7];
// v3.36: si la fecha cae en un bloque de tu temporada, el tema sale de los que tocan su enfoque (rotando por día).
export function themeFor(date) {
  const b = blockAt(date), f = (b?.focus || []).filter((k) => k !== 'juego' && k !== 'fisico');
  if (!f.length) return { ...themeOf(date), block: b || null };
  const fit = THEMES.map((t) => ({ t, n: t.f.filter((k) => f.includes(k)).length })).filter((x) => x.n).sort((a, b2) => b2.n - a.n);
  const top = fit.filter((x) => x.n === fit[0].n).map((x) => x.t), pool = top.length >= 2 ? top : fit.map((x) => x.t);
  return { ...pool[((dayIdx(date) % pool.length) + pool.length) % pool.length], block: b };
}

// Elige el ejercicio de un fundamento: primero que sea de su nivel, luego que su duración se parezca a la del bloque
// (para no estirar 25 min un ejercicio de 8), y que el fundamento sea el principal. variant rota entre los 3 mejores.
const fitLv = (e, lv) => (e.levels[0] <= lv && lv <= e.levels[1] ? 0 : Math.min(Math.abs(e.levels[0] - lv), Math.abs(e.levels[1] - lv)));
function pickFor(skill, level, used, variant, mins) {
  const ok = BUILTIN.filter((e) => !e.cero && e.skills.includes(skill) && (e.kind === 'tecnica' || e.kind === 'juego') && !used.has(e.id) && fitLv(e, level) <= 1);
  const score = (e) => fitLv(e, level) * 3 + Math.abs(e.min - mins) / 6 + (e.skills[0] !== skill ? 1.2 : 0) + (e.kind === 'juego' ? 0.6 : 0);
  const top = ok.sort((a, b) => score(a) - score(b)).slice(0, 3);
  return top.length ? top[variant % top.length] : pick(skill, level, used, variant);
}

// El plan: calentamiento, 2 bloques por fundamento (o 1 si hay poco tiempo), juego reducido y enfriamiento.
// v3.34: opts.rot = peor rotación (el juego del final es «Tu peor rotación», solo Intermedio y Avanzado); opts.avoid = ejercicios que no se repiten (semana).
export function dailyPlan(tierId, date = todayStr(), minutes = null, variant = 0, { rot = null, avoid = null } = {}) {
  const tier = TIERS.find((x) => x.id === tierId) || TIERS[0], th = themeFor(date);
  const level = tier.range[(dayIdx(date) + variant) % 2];          // alterna entre los 2 niveles del grupo
  const mins = Math.max(45, Number(minutes) || Number(settings().minutes) || 90);
  const gameMin = (mins >= 75 ? 20 : 15) + ((th.block?.focus || []).includes('juego') && mins >= 75 ? 5 : 0);   // bloque de competencia: un poco más de juego
  const each = Math.max(10, Math.floor((mins - 10 - 5 - gameMin) / 2 / 5) * 5);
  const used = new Set(avoid || []), plan = [{ ex: settings().warmup_prev !== false ? warmupFor(date) : 'fi-01', min: 10, note: '' }];
  th.f.forEach((k, n) => {
    const parts = each >= 20 ? 2 : 1;   // v3.30: bloques de 20 min o más se parten en 2 ejercicios (más variedad para principiantes)
    for (let i = 0; i < parts; i++) {
      const m0 = parts === 2 ? (i ? Math.floor(each / 2 / 5) * 5 : each - Math.floor(each / 2 / 5) * 5) : each;
      const ex = pickFor(k, level, used, variant + i + n, m0); if (!ex) break;
      used.add(ex.id);
      const m = m0;
      plan.push({ ex: ex.id, min: m, note: i ? '' : `Tema del día: ${NAME(k).toLowerCase()}.` });
    }
  });
  const useRot = !!rot && tier.id !== 'p' && !used.has(ROT_EX);
  const game = useRot ? getExercise(ROT_EX) : pickGame(level, th.f, used, variant);
  const near = (e) => e && (useRot || (e.levels[0] <= level + 1 && e.levels[1] >= level - 1));
  if (near(game)) { used.add(game.id); plan.push({ ex: game.id, min: gameMin, note: useRot ? rotNote(rot) : 'Juego reducido para usar lo de hoy.' }); }
  else if (plan.length > 1) plan[plan.length - 1].min += gameMin;   // no hay otro juego a su nivel: más tiempo al último bloque
  plan.push({ ex: 'fi-10', min: 5, note: '' });
  const total = plan.reduce((a, b) => a + b.min, 0);
  if (total !== mins && plan[1]) plan[1].min = Math.max(5, plan[1].min + (mins - total));
  return { tier, theme: th, level, minutes: mins, plan, focus: th.f, rot: useRot ? rot : null };
}

// Dos grupos: el plan de A y, en cada bloque, el ejercicio de B en «alt» (misma posición, mismo tema).
export function splitPlan(pa, pb) {
  return pa.plan.map((b, i) => { const o = pb.plan[i]; return o && o.ex !== b.ex && i > 0 && i < pa.plan.length - 1 ? { ...b, alt: { ex: o.ex } } : b; });
}
const teamTier = () => { const ls = teamPlayers().map((p) => Number(p.level) || 1).sort((a, b) => a - b); return tierOfLevel(ls.length ? ls[Math.floor(ls.length / 2)] : 2).id; };
const nextSession = () => { const t = todayStr(); return state.data.sessions.filter((s) => s.status === 'planeada' && s.session_date >= t && (!s.group_id || s.group_id === group()?.id))
  .sort((a, b) => a.session_date.localeCompare(b.session_date) || String(a.start_time || '').localeCompare(String(b.start_time || '')))[0] || null; };
const day = (x) => fmtDate(x, { weekday: 'short', day: 'numeric' });

// v3.36: lo que no se puede con lo que hay ese día (jugadores, espacio, red, balones) se cambia por algo parecido.
function adjustTo(target, plan) {
  if (!target) return plan;
  const g = groupsOf(target), counts = g && g.rA && g.rB ? { A: g.A.length, B: g.B.length } : { T: presentOf(target).list.length };
  return fixPlan({ ...target, plan }, counts).plan;
}
// Con dos grupos: cada uno con el plan de su nivel (mismo tema, misma posición de bloques).
function planForTarget(target, cur, date, opts = {}) {
  const g = target ? groupsOf(target) : null;
  if (!(g && g.rA && g.rB)) return { plan: cur.plan, msg: 'Plan puesto' };
  const tA = tierOfLevel(Math.round((g.rA[0] + g.rA[1]) / 2)).id, tB = tierOfLevel(Math.round((g.rB[0] + g.rB[1]) / 2)).id;
  const pa = dailyPlan(tA, date, target.minutes, 0, opts), pb = dailyPlan(tB, date, target.minutes, 0, opts);
  return { plan: splitPlan(pa, pb), msg: tA === tB ? `Plan puesto: los dos grupos son ${pa.tier.name.toLowerCase()}, cada uno con su versión` : `Plan puesto: grupo A ${pa.tier.name.toLowerCase()}, grupo B ${pb.tier.name.toLowerCase()}` };
}
async function apply(target, cur, date) {
  let { plan, msg } = planForTarget(target, cur, date, { rot: cur.rot });
  plan = adjustTo(target, plan);
  if (target) {
    if ((target.plan || []).length && !(await confirmSheet({ title: '¿Cambiar el plan?', text: `El entrenamiento del ${fmtDate(target.session_date, { weekday: 'long', day: 'numeric', month: 'long' })} ya tiene plan. Se cambia por el entreno del día.`, ok: 'Cambiar' }))) return;
    patch('sessions', target.id, { plan, focus: cur.focus, title: target.title || cur.theme.t });
    toast(msg); location.hash = `#/sesion/${target.id}`; return;
  }
  const st = settings();
  const s = add('sessions', { group_id: group()?.id, session_date: date, start_time: st.start || null, minutes: cur.minutes, title: cur.theme.t, focus: cur.focus, plan, status: 'planeada', published: false });
  toast('Entrenamiento creado sin publicar'); location.hash = `#/sesion/${s.id}`;
}

const planRows = (cur) => h('ol', { class: 'plain dd-plan' }, cur.plan.map((b) => { const ex = getExercise(b.ex, state.data.customEx);
  return h('li', {}, h('span', { class: `dd-ic sk-${ex?.skills[0] || 'juego'}`, 'aria-hidden': 'true' }, ic(skIcon(ex?.skills[0]), 14)),
    h('span', {}, ex ? h('a', { href: `#/ejercicio/${ex.id}` }, ex.name) : b.ex, h('small', { class: 'row-sub' }, ` · ${b.min} min`))); }));

// Tarjeta en Ejercicios (y hoja desde Hoy). El «día» es el de tu próximo entreno (hoy, si hoy entrenas). ui guarda el nivel elegido.
export function delDiaPanel(ui = {}, { session = null, onPick = null } = {}) {
  const date = todayStr();
  ui.dd ??= teamTier(); ui.ddv ??= 0;
  const box = h('section', { class: 'panel stack del-dia' });
  const paint = () => {
    const target = session || nextSession(), tdate = target?.session_date || nextTrainingDay(addDays(date, -1));
    const wr = ui.dd !== 'p' ? weakRotation(tdate) : null;
    const cur = dailyPlan(ui.dd, tdate, target?.minutes, ui.ddv, { rot: wr && ui.ddrot ? wr : null }), g = target ? groupsOf(target) : null;
    box.replaceChildren(); append(box, [
      h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, ic('calendar-days', 18), ' Entreno del día'), h('span', { class: 'row-sub' }, tdate === date ? 'Hoy' : `Para el ${fmtDate(tdate, { weekday: 'long', day: 'numeric' })}`)),
      h('div', { class: 'seg dd-tiers', role: 'group', 'aria-label': 'Nivel' }, TIERS.map((t) => h('button', { type: 'button', class: t.cls, 'aria-pressed': ui.dd === t.id ? 'true' : 'false', onclick: () => { ui.dd = t.id; ui.ddv = 0; paint(); } }, t.name))),
      h('div', {}, h('strong', { class: 'dd-theme' }, cur.theme.t), h('p', { class: 'row-sub', style: { margin: '2px 0 0' } }, `${cur.theme.d} Nivel ${cur.level}, ${cur.minutes} min.${cur.theme.block ? ` Sigue tu bloque de temporada «${cur.theme.block.name}».` : ''}`)),
      planRows(cur),
      wr ? h('div', { class: 'note' }, h('span', {}, `En tus partidos, ${wr.label.toLowerCase()} es donde más puntos pierden (${wr.won} de ${wr.n} rallies). `),
        h('button', { type: 'button', class: 'btn sm', 'aria-pressed': ui.ddrot ? 'true' : 'false', onclick: () => { ui.ddrot = !ui.ddrot; paint(); } }, ic(ui.ddrot ? 'check' : 'plus', 14), ui.ddrot ? 'Juego: «Tu peor rotación»' : 'Usar «Tu peor rotación» como juego')) : null,
      g && g.rA && g.rB ? note(`Tu entreno del ${day(tdate)} va en dos grupos: al usarlo, el grupo A recibe el de su nivel y el B el del suyo.`) : null,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm primary', type: 'button', onclick: () => { onPick?.(); setTimeout(() => apply(target, cur, tdate), 50); } }, ic('check', 16),
          target ? (session ? 'Poner en este entreno' : `Usar en el del ${day(tdate)}`) : `Crear el del ${day(tdate)}`),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { ui.ddv++; paint(); } }, ic('shuffle', 16), 'Otros ejercicios'),
        session ? null : h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { onPick?.(); setTimeout(() => semanaSheet({ tier: ui.dd }), 50); } }, ic('calendar-range', 16), 'Semana con un toque'))]);
  };
  paint();
  return box;
}
export function delDiaSheet(opts = {}) {
  let sh; const ui = {};
  const body = h('div', { class: 'stack' }, delDiaPanel(ui, { ...opts, onPick: () => sh?.close?.() }),
    note('Mañana cambia el tema. Si quieres un plan con los datos de tu equipo (evaluaciones y partidos), usa «Armar con un toque».'));
  sh = openSheet({ title: 'Entreno del día', body, actions: [{ label: 'Cerrar' }] });
  return sh;
}
export const delDiaButton = (opts = {}, cls = 'btn') => h('button', { class: cls, type: 'button', onclick: () => delDiaSheet(opts) }, ic('calendar-days', 18), 'Entreno del día');
export const _delDiaTest = { dailyPlan, splitPlan, themeOf };

// ---------- v3.34: semana con un toque ----------
// Los días de entreno de los próximos 7 días (los de Ajustes). Cada día con su tema (el ciclo de 7) y sin repetir
// ejercicios en la semana. Entreno sin plan: se le pone. Día sin entreno: se crea sin publicar. Con plan: no se toca (salvo que lo pidas).
export function weekDates(from = todayStr()) {
  const days = settings().days || [];
  const out = [];
  for (let i = 0; i < 7; i++) { const d = addDays(from, i); if (!days.length || days.includes(parseDate(d).getDay())) out.push(d); }
  return out;
}
export function weekPlan(tierId, { from = todayStr(), variant = 0, rot = null, replace = false } = {}) {
  const avoid = new Set(), keep = (id) => { const e = getExercise(id); return e && e.kind !== 'calentamiento' && e.kind !== 'cierre'; };
  let rotDone = false;
  return weekDates(from).map((date) => {
    const target = state.data.sessions.filter((s) => s.session_date === date && s.status === 'planeada' && (!s.group_id || s.group_id === group()?.id))
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')))[0] || null;
    const has = !!(target?.plan || []).length;
    if (has && !replace) return { date, target, action: 'skip' };
    const opts = { rot: !rotDone ? rot : null, avoid };
    const cur = dailyPlan(tierId, date, target?.minutes, variant, opts);
    if (cur.rot) rotDone = true;
    const plan = adjustTo(target, planForTarget(target, cur, date, opts).plan);
    plan.forEach((b) => { if (keep(b.ex)) avoid.add(b.ex); if (b.alt?.ex) avoid.add(b.alt.ex); });
    return { date, target, action: target ? (has ? 'replace' : 'fill') : 'create', cur, plan };
  });
}
export function semanaSheet({ tier = null } = {}) {
  const ui = { tier: tier || teamTier(), v: 0, rot: false, replace: false };
  const days = settings().days || [];
  const body = h('div', { class: 'stack' });
  let rows = [];
  const paint = () => {
    const wr = ui.tier !== 'p' ? weakRotation() : null;
    rows = weekPlan(ui.tier, { variant: ui.v, rot: wr && ui.rot ? wr : null, replace: ui.replace });
    const n = rows.filter((r) => r.action !== 'skip').length, skipped = rows.filter((r) => r.action === 'skip').length;
    body.replaceChildren(); append(body, [
      !days.length ? note('No tienes días de entreno en Ajustes: se arma un entreno para cada día. Elige tus días en Ajustes → Equipo.', 'warn') : null,
      h('div', { class: 'seg dd-tiers', role: 'group', 'aria-label': 'Nivel' }, TIERS.map((t) => h('button', { type: 'button', class: t.cls, 'aria-pressed': ui.tier === t.id ? 'true' : 'false', onclick: () => { ui.tier = t.id; ui.v = 0; paint(); } }, t.name))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, rows.length ? `${plural(rows.length, 'día de entreno', 'días de entreno')} en los próximos 7 días. Cada día con otro tema y sin repetir ejercicios.${rows.find((r) => r.cur?.theme.block) ? ` Los temas siguen tu bloque de temporada «${rows.find((r) => r.cur?.theme.block).cur.theme.block.name}».` : ''}` : 'No hay días de entreno en los próximos 7 días.'),
      ...rows.map((r) => h('div', { class: 'wk-day' },
        h('div', { class: 'wk-h' }, h('strong', {}, fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'short' })),
          h('span', { class: `chip ${r.action === 'skip' ? '' : r.action === 'create' ? 'info' : 'ok'}` }, { skip: 'Ya tiene plan: no se toca', create: 'Se crea (sin publicar)', fill: 'Se le pone plan', replace: 'Se cambia su plan' }[r.action])),
        r.cur ? h('span', {}, h('b', {}, r.cur.theme.t), h('span', { class: 'row-sub' }, r.target && groupsOf(r.target)?.rA && groupsOf(r.target)?.rB ? ` · ${r.cur.minutes} min` : ` · nivel ${r.cur.level} · ${r.cur.minutes} min`)) : h('span', { class: 'row-sub' }, r.target?.title || 'Entrenamiento'),
        r.cur ? h('small', { class: 'row-sub' }, r.plan.map((b) => getExercise(b.ex, state.data.customEx)?.name || b.ex).join(' · ')) : null,
        r.target && groupsOf(r.target)?.rA && groupsOf(r.target)?.rB && r.cur ? h('small', { class: 'row-sub' }, 'Va en dos grupos: cada grupo recibe el de su nivel (aquí ves el del grupo A).') : null)),
      wr ? h('div', { class: 'note' }, h('span', {}, `Peor rotación en tus partidos: ${wr.label.toLowerCase()} (${wr.won} de ${wr.n}). `),
        h('button', { type: 'button', class: 'btn sm', 'aria-pressed': ui.rot ? 'true' : 'false', onclick: () => { ui.rot = !ui.rot; paint(); } }, ic(ui.rot ? 'check' : 'plus', 14), ui.rot ? 'El primer día lleva «Tu peor rotación»' : 'Ponerla en el primer día')) : null,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { ui.v++; paint(); } }, ic('shuffle', 16), 'Otros ejercicios'),
        skipped || ui.replace ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ui.replace ? true : null, onchange: (e) => { ui.replace = e.target.checked; paint(); } }), ' Cambiar también los que ya tienen plan') : null),
      n ? null : note('No hay nada que crear: todos tus entrenos de la semana ya tienen plan.')]);
  };
  paint();
  return openSheet({ title: 'Semana con un toque', body, actions: [{ label: 'Cancelar' }, { label: 'Armar la semana', kind: 'primary', onClick: () => {
    const todo = rows.filter((r) => r.action !== 'skip');
    if (!todo.length) { toast('No hay nada que crear'); return false; }
    const st = settings();
    for (const r of todo) {
      if (r.target) patch('sessions', r.target.id, { plan: r.plan, focus: r.cur.focus, title: r.action === 'fill' && r.target.title ? r.target.title : r.cur.theme.t });
      else add('sessions', { group_id: group()?.id, session_date: r.date, start_time: st.start || null, minutes: r.cur.minutes, title: r.cur.theme.t, focus: r.cur.focus, plan: r.plan, status: 'planeada', published: false });
    }
    const made = todo.filter((r) => r.action === 'create').length;
    toast(`Semana lista: ${plural(todo.length, 'entreno', 'entrenos')}${made ? ` (${made} nuevos, sin publicar)` : ''}`);
    location.hash = '#/sesiones';
  } }] });
}
export const semanaButton = (cls = 'btn') => h('button', { class: cls, type: 'button', onclick: () => semanaSheet() }, ic('calendar-range', 18), 'Semana con un toque');
