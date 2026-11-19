// Entreno del día por nivel (v3.29): un entreno listo para Principiante, Intermedio o Avanzado que cambia cada día.
// A diferencia de «Armar con un toque» (que usa el radar y los partidos de tu equipo), este no necesita datos:
// el tema del día rota en un ciclo de 7 y los ejercicios salen de la biblioteca para el nivel elegido.
// «Usar en mi próximo entreno» lo pone en el siguiente entrenamiento; si va en dos grupos (v3.28), A recibe el de su nivel
// y B el de su nivel, bloque por bloque (en «alt»). Sin SQL.
import { h, ic, toast, openSheet, confirmSheet, todayStr, addDays, fmtDate, append } from '../util.js';
import { state, add, patch, settings, group, teamPlayers } from '../store.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { getExercise, BUILTIN } from '../content/exercises.js';
import { warmupFor } from '../content/templates.js';
import { pick, pickGame } from './plan-toque.js';
import { nextTrainingDay } from './sugerido.js';
import { TIERS, tierOfLevel, skIcon } from './ejercicios.js';
import { groupsOf } from './grupos.js';
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

// Elige el ejercicio de un fundamento: primero que sea de su nivel, luego que su duración se parezca a la del bloque
// (para no estirar 25 min un ejercicio de 8), y que el fundamento sea el principal. variant rota entre los 3 mejores.
const fitLv = (e, lv) => (e.levels[0] <= lv && lv <= e.levels[1] ? 0 : Math.min(Math.abs(e.levels[0] - lv), Math.abs(e.levels[1] - lv)));
function pickFor(skill, level, used, variant, mins) {
  const ok = BUILTIN.filter((e) => e.skills.includes(skill) && (e.kind === 'tecnica' || e.kind === 'juego') && !used.has(e.id) && fitLv(e, level) <= 1);
  const score = (e) => fitLv(e, level) * 3 + Math.abs(e.min - mins) / 6 + (e.skills[0] !== skill ? 1.2 : 0) + (e.kind === 'juego' ? 0.6 : 0);
  const top = ok.sort((a, b) => score(a) - score(b)).slice(0, 3);
  return top.length ? top[variant % top.length] : pick(skill, level, used, variant);
}

// El plan: calentamiento, 2 bloques por fundamento (o 1 si hay poco tiempo), juego reducido y enfriamiento.
export function dailyPlan(tierId, date = todayStr(), minutes = null, variant = 0) {
  const tier = TIERS.find((x) => x.id === tierId) || TIERS[0], th = themeOf(date);
  const level = tier.range[(dayIdx(date) + variant) % 2];          // alterna entre los 2 niveles del grupo
  const mins = Math.max(45, Number(minutes) || Number(settings().minutes) || 90);
  const gameMin = mins >= 75 ? 20 : 15;
  const each = Math.max(10, Math.floor((mins - 10 - 5 - gameMin) / 2 / 5) * 5);
  const used = new Set(), plan = [{ ex: settings().warmup_prev !== false ? warmupFor(date) : 'fi-01', min: 10, note: '' }];
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
  const game = pickGame(level, th.f, used, variant);
  const near = (e) => e && e.levels[0] <= level + 1 && e.levels[1] >= level - 1;
  if (near(game)) { used.add(game.id); plan.push({ ex: game.id, min: gameMin, note: 'Juego reducido para usar lo de hoy.' }); }
  else if (plan.length > 1) plan[plan.length - 1].min += gameMin;   // no hay otro juego a su nivel: más tiempo al último bloque
  plan.push({ ex: 'fi-10', min: 5, note: '' });
  const total = plan.reduce((a, b) => a + b.min, 0);
  if (total !== mins && plan[1]) plan[1].min = Math.max(5, plan[1].min + (mins - total));
  return { tier, theme: th, level, minutes: mins, plan, focus: th.f };
}

// Dos grupos: el plan de A y, en cada bloque, el ejercicio de B en «alt» (misma posición, mismo tema).
export function splitPlan(pa, pb) {
  return pa.plan.map((b, i) => { const o = pb.plan[i]; return o && o.ex !== b.ex && i > 0 && i < pa.plan.length - 1 ? { ...b, alt: { ex: o.ex } } : b; });
}
const teamTier = () => { const ls = teamPlayers().map((p) => Number(p.level) || 1).sort((a, b) => a - b); return tierOfLevel(ls.length ? ls[Math.floor(ls.length / 2)] : 2).id; };
const nextSession = () => { const t = todayStr(); return state.data.sessions.filter((s) => s.status === 'planeada' && s.session_date >= t && (!s.group_id || s.group_id === group()?.id))
  .sort((a, b) => a.session_date.localeCompare(b.session_date) || String(a.start_time || '').localeCompare(String(b.start_time || '')))[0] || null; };
const day = (x) => fmtDate(x, { weekday: 'short', day: 'numeric' });

async function apply(target, cur, date) {
  let plan = cur.plan, msg = 'Plan puesto';
  const g = target ? groupsOf(target) : null;
  if (g && g.rA && g.rB) {   // dos grupos: cada uno con el plan de su nivel
    const tA = tierOfLevel(Math.round((g.rA[0] + g.rA[1]) / 2)).id, tB = tierOfLevel(Math.round((g.rB[0] + g.rB[1]) / 2)).id;
    const pa = dailyPlan(tA, date, target.minutes), pb = dailyPlan(tB, date, target.minutes);
    plan = splitPlan(pa, pb); msg = tA === tB ? `Plan puesto: los dos grupos son ${pa.tier.name.toLowerCase()}, cada uno con su versión` : `Plan puesto: grupo A ${pa.tier.name.toLowerCase()}, grupo B ${pb.tier.name.toLowerCase()}`;
  }
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
    const cur = dailyPlan(ui.dd, tdate, target?.minutes, ui.ddv), g = target ? groupsOf(target) : null;
    box.replaceChildren(); append(box, [
      h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, ic('calendar-days', 18), ' Entreno del día'), h('span', { class: 'row-sub' }, tdate === date ? 'Hoy' : `Para el ${fmtDate(tdate, { weekday: 'long', day: 'numeric' })}`)),
      h('div', { class: 'seg dd-tiers', role: 'group', 'aria-label': 'Nivel' }, TIERS.map((t) => h('button', { type: 'button', class: t.cls, 'aria-pressed': ui.dd === t.id ? 'true' : 'false', onclick: () => { ui.dd = t.id; ui.ddv = 0; paint(); } }, t.name))),
      h('div', {}, h('strong', { class: 'dd-theme' }, cur.theme.t), h('p', { class: 'row-sub', style: { margin: '2px 0 0' } }, `${cur.theme.d} Nivel ${cur.level}, ${cur.minutes} min.`)),
      planRows(cur),
      g && g.rA && g.rB ? note(`Tu entreno del ${day(tdate)} va en dos grupos: al usarlo, el grupo A recibe el de su nivel y el B el del suyo.`) : null,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm primary', type: 'button', onclick: () => { onPick?.(); setTimeout(() => apply(target, cur, tdate), 50); } }, ic('check', 16),
          target ? (session ? 'Poner en este entreno' : `Usar en el del ${day(tdate)}`) : `Crear el del ${day(tdate)}`),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { ui.ddv++; paint(); } }, ic('shuffle', 16), 'Otros ejercicios'))]);
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
