// v3.38 «Desde cero»: programa de clases para un grupo que nunca ha jugado voleibol (8 clases o Torneo exprés de 4).
// Crea las clases en tus días de entreno con el plan ya puesto y ajustado a la duración de tus clases.
import { h, ic, toast, openSheet, fmtDate, todayStr, addDays, parseDate, plural, DAYS_LONG } from '../util.js';
import { state, settings, group, add } from '../store.js';
import { getExercise } from '../content/exercises.js';
import { planFromTemplate } from '../content/templates.js';
import { ROUTES_CERO } from '../content/desde-cero.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { field, options, note } from './ui.js';

const titleOf = (r, c) => `${r.id === '8' ? 'Desde cero' : 'Torneo exprés'} ${c.n}: ${c.name}`;
const sessionsOf = (r, c) => state.data.sessions.filter((s) => (s.title || '').startsWith(`${titleOf(r, c).split(':')[0]}:`));

// Ajusta los minutos a la duración de la clase: calentamiento (10) y enfriamiento (5) fijos; el resto se reparte
// en proporción, en múltiplos de 5 y mínimo 5; la diferencia va al bloque más largo.
export function scalePlan(plan, minutes) {
  const total = plan.reduce((a, b) => a + b.min, 0);
  if (!minutes || minutes === total || plan.length < 3) return plan.map((b) => ({ ...b }));
  const first = { ...plan[0], min: 10 }, last = { ...plan[plan.length - 1], min: 5 }, mid = plan.slice(1, -1);
  const room = minutes - 15, midTotal = mid.reduce((a, b) => a + b.min, 0);
  const out = mid.map((b) => ({ ...b, min: Math.max(5, Math.round((b.min * room) / midTotal / 5) * 5) }));
  const diff = room - out.reduce((a, b) => a + b.min, 0);
  const big = out.reduce((m, b, i) => (b.min > out[m].min ? i : m), 0);
  out[big].min = Math.max(5, out[big].min + diff);
  return [first, ...out, last];
}
const planFor = (c, date, minutes) => scalePlan(planFromTemplate({ blocks: c.blocks }, date, settings().warmup_prev !== false), minutes);

// Próximos días de entreno libres (sin entrenamiento ya puesto), desde una fecha.
function freeDays(from, n, days) {
  const have = new Set(state.data.sessions.map((s) => s.session_date)), out = [];
  for (let i = 0; out.length < n && i < 370; i++) { const d = addDays(from, i); if (days.includes(parseDate(d).getDay()) && !have.has(d)) out.push(d); }
  return out;
}
const MINUTES = [[45, '45 min'], [60, '1 hora'], [75, '1 h 15 min'], [90, '1 h 30 min'], [120, '2 horas']];
const minSelect = () => { const m = Number(settings().minutes) || 90; return h('select', {}, options(MINUTES, MINUTES.some(([v]) => v === m) ? m : 90)); };
const mk = (r, c, date, minutes) => add('sessions', { group_id: group()?.id, session_date: date, start_time: settings().start || null, minutes, title: titleOf(r, c),
  focus: c.focus, plan: planFor(c, date, minutes), status: 'planeada', published: false });

function createAllSheet(r) {
  const st = settings(), days = st.days || [];
  if (!days.length) { toast('Primero elige los días de entrenamiento de este grupo en Ajustes'); location.hash = '#/ajustes'; return; }
  const pending = r.list.filter((c) => !sessionsOf(r, c).length);
  if (!pending.length) { toast('Ya están creadas todas las clases de esta ruta'); return; }
  const start = h('input', { type: 'date', value: todayStr() }), mins = minSelect(), preview = h('p', { 'aria-live': 'polite' });
  const dates = () => freeDays(start.value || todayStr(), pending.length, days);
  const paint = () => { const d = dates(); preview.textContent = `Se crearán ${plural(d.length, 'clase', 'clases')}: ${d.map((x, i) => `${pending[i].n}) ${fmtDate(x, { weekday: 'short', day: 'numeric', month: 'short' })}`).join(', ')}.`; };
  start.addEventListener('input', paint); paint();
  openSheet({
    title: `Crear ${r.short}`,
    body: h('div', { class: 'stack' }, h('p', {}, `En tus días de entreno de «${group()?.name || 'este grupo'}» (${days.map((d) => DAYS_LONG[d]).join(', ')}), una clase por día, en orden. No toca los días que ya tienen entrenamiento.`),
      field('Empezar desde', start), field('Duración de cada clase', mins, 'Los minutos de cada ejercicio se ajustan a esta duración.'), preview),
    actions: [{ label: 'Cancelar' }, { label: 'Crear clases', kind: 'primary', onClick: () => {
      const d = dates(), m = Number(mins.value);
      pending.forEach((c, i) => { if (d[i]) mk(r, c, d[i], m); });
      toast(`${plural(Math.min(d.length, pending.length), 'clase creada', 'clases creadas')}`); location.hash = '#/sesiones';
    } }],
  });
}

function oneSheet(r, c) {
  const days = settings().days || [];
  const def = (days.length ? freeDays(todayStr(), 1, days)[0] : null) || todayStr();
  const date = h('input', { type: 'date', value: def }), mins = minSelect();
  openSheet({
    title: `Clase ${c.n}: ${c.name}`,
    body: h('div', { class: 'stack' }, field('Fecha', date), field('Duración', mins, 'Los minutos de cada ejercicio se ajustan a esta duración.')),
    actions: [{ label: 'Cancelar' }, { label: 'Crear entreno', kind: 'primary', onClick: () => {
      const s = mk(r, c, date.value || def, Number(mins.value)); toast('Entreno creado con el plan'); location.hash = `#/sesion/${s.id}`;
    } }],
  });
}

function classCard(r, c) {
  const ss = sessionsOf(r, c), done = ss.find((s) => s.status === 'hecha'), next = ss.find((s) => s.status !== 'hecha');
  const line = (label, text) => h('p', { style: { margin: 0 } }, h('strong', {}, `${label}: `), text);
  return h('section', { class: 'panel stack cero-card' },
    h('div', { class: 'split' }, h('div', {}, h('span', { class: 'row-sub' }, `Clase ${c.n} de ${r.list.length}`), h('h3', {}, c.name)),
      done ? h('span', { class: 'chip ok' }, 'Hecha') : next ? h('a', { class: 'chip info', href: `#/sesion/${next.id}` }, fmtDate(next.session_date, { weekday: 'short', day: 'numeric', month: 'short' })) : null),
    h('p', { style: { margin: 0 } }, c.goal),
    h('div', { class: 'cluster' }, c.focus.map((k) => h('span', { class: 'chip' }, SKILL_BY_ID[k]?.name || k))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Plan para 1 h 30 min; al crear la clase se ajusta a la duración que elijas.'),
    h('ol', { class: 'cero-plan' }, c.blocks.map((b) => { const ex = getExercise(b.ex);
      return h('li', {}, h('a', { href: `#/ejercicio/${b.ex}` }, ex?.name || b.ex), h('span', { class: 'row-sub' }, ` · ${b.min} min`)); })),
    line('Explica', c.talk), line('Regla del día', c.rule), line('Tarea', c.home),
    h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => oneSheet(r, c) }, ic('calendar-plus', 16), next ? 'Crear otra vez' : 'Usar en un entreno')));
}

export default function desdeCero(ctx) {
  const ui = ctx.ui; ui.route ??= '4';
  const r = ROUTES_CERO.find((x) => x.id === ui.route) || ROUTES_CERO[0];
  const made = r.list.filter((c) => sessionsOf(r, c).length).length, done = r.list.filter((c) => sessionsOf(r, c).some((s) => s.status === 'hecha')).length;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Ruta' }, ROUTES_CERO.map((x) =>
    h('button', { type: 'button', 'aria-pressed': x.id === r.id ? 'true' : 'false', onclick: () => { ui.route = x.id; ctx.rerender(); } }, x.name)));
  const el = h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, 'Para un grupo que nunca ha jugado voleibol: del balón en las manos al primer partido. Cada clase trae su plan, qué explicar, la regla del día y una tarea corta.'),
    seg,
    h('section', { class: 'panel stack' }, h('p', { style: { margin: 0 } }, r.desc),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `En «${group()?.name || 'este grupo'}»: ${made} de ${r.list.length} clases creadas, ${done} ${done === 1 ? 'hecha' : 'hechas'}.`),
      made < r.list.length ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => createAllSheet(r) }, ic('calendar-days', 18),
        made ? `Crear las ${r.list.length - made} que faltan` : `Crear las ${r.list.length} clases`)) : null),
    ...r.list.map((c) => classCard(r, c)),
    note('Consejos: grupos de 2 o 3 por balón para que todos toquen mucho; corrige una sola cosa a la vez; termina siempre jugando. Cuando ya hagan 3 toques sin atrapar, pasa a las plantillas Fundamentos y Rally (Principiante).'),
    note('La secuencia sigue la iniciación y el minivoleibol de uso común (FIVB Coaches Manual y programas de minivoleibol). El orden, los tiempos y los textos son de Remate. Si el torneo tiene reglas propias (altura de red, sets, cambios), esas mandan.'));
  return { title: 'Desde cero', sub: 'Programa para quien nunca ha jugado', back: '#/sesiones', el };
}
