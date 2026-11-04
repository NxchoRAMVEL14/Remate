// Hojas para imprimir o guardar en PDF (v3.17): rutina de gym (la tuya, la de tu entrenador o la personalizada),
// rutina de Remate Fit y plan de comida. #/imprimir/gym[/<jugador>|/s/<enlace>] · #/imprimir/fit[/<adulto>] · #/imprimir/comida[/<adulto>]
import { h, ic, fmtDate, todayStr, plural, DAYS } from '../util.js';
import { players, settings } from '../store.js';
import { note, empty } from './ui.js';
import { VERSION } from '../version.js';
import { activeSpec, coachPlanOf, specText } from './gym.js';
import { buildRoutine, normSpec, GYM_BY_ID, WARMUP, COOLDOWN, weekPlan, cleanCustom } from '../content/gym.js';
import { profOf, specOf, vbOf } from './fit.js';
import { buildFit, FIT_BY_ID, FIT_GOALS, FIT_EXP, PLACES, splitName, ROLE as FROLE } from '../content/fit.js';
import { fitOk } from '../calc.js';
import { planOf, nutriOf, eqText, gName, examplesOf, portionsOf } from './fit-comida.js';
import { TIMING, groupTotals } from '../content/nutricion.js';
import { RECIPE_BY_ID, shoppingList } from '../content/recetas.js';
import { rxLine, unpackRoutine } from './compartir.js';
const restOf = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s / 60} min`);

const WDN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const fmtN = (n) => Math.round(n).toLocaleString('es-MX');
const today = () => fmtDate(todayStr(), { day: 'numeric', month: 'long', year: 'numeric' });
const printBtn = () => h('button', { class: 'btn primary', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir o guardar PDF');
const check = (ui, key, label, def) => {
  ui[key] ??= def;
  return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: ui[key] ? true : null, onchange: (e) => { ui[key] = e.target.checked; ui.rr?.(); } }), h('span', {}, label));
};
const head = (title, who, lines = []) => h('header', { class: 'pr-head' },
  h('div', { class: 'pr-brand' }, h('img', { src: 'icons/icon-192.png', alt: '', width: 34, height: 34 }), h('span', {}, 'Remate')),
  h('h1', {}, title), h('p', { class: 'pr-who' }, [who, today()].filter(Boolean).join(' · ')),
  lines.filter(Boolean).map((x) => h('p', { class: 'pr-sum' }, x)));
const foot = (extra) => h('footer', { class: 'pr-foot' }, extra ? h('p', {}, extra) : null, h('p', {}, `Hecho con Remate ${VERSION}. Es una guía: no sustituye a un médico, nutriólogo ni entrenador certificado.`));
const page = (sub, back, tools, sheet) => ({ title: 'Imprimir', sub, back, actions: [{ icon: 'printer', label: 'Imprimir o guardar PDF', onClick: () => window.print() }],
  el: h('div', { class: 'page pr-page' }, h('div', { class: 'pr-tools no-print stack' }, tools, h('div', { class: 'cluster' }, printBtn()),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'En el celular: «Imprimir» → elige «Guardar como PDF» y luego lo mandas por WhatsApp. En computadora puedes imprimir directo.')), sheet) });

// ---------- rutina (gym y Remate Fit) ----------
function routineSheet(ui, { title, who, lines, days, byId, roleName, week, notes, foot: f }) {
  const cols = ui.cols ? 4 : 0;
  const seen = [];
  for (const d of days) for (const rx of d.items) if (!seen.includes(rx.ex) && byId[rx.ex]) seen.push(rx.ex);
  return h('article', { class: 'pr' },
    head(title, who, lines),
    week ? h('p', { class: 'pr-week' }, h('strong', {}, 'Tu semana: '), week) : null,
    notes?.length ? h('ul', { class: 'pr-notes' }, notes.map((x) => h('li', {}, x))) : null,
    h('section', { class: 'pr-sec' }, h('h2', {}, 'Calentamiento, 8 a 10 min'), h('ol', {}, WARMUP.map((x) => h('li', {}, x)))),
    days.map((d) => h('section', { class: 'pr-day' },
      h('h2', {}, `${Number.isInteger(d.wd) ? `${WDN[d.wd]} · ` : ''}Día ${d.key}: ${d.name}`, h('small', {}, ` ≈ ${d.min} min${d.light ? ' · ligero' : ''}`)),
      h('div', { class: 'pr-scroll' }, h('table', { class: 'pr-tbl' },
        h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Ejercicio'), h('th', {}, 'Series × reps'), h('th', {}, 'Intensidad'), h('th', {}, 'Descanso'),
          Array.from({ length: cols }, (_, i) => h('th', { class: 'pr-w' }, `Sem ${i + 1}`)))),
        h('tbody', {}, d.items.map((rx, i) => {
          const ex = byId[rx.ex], parts = rxLine(rx, ex).split(' · ');
          return h('tr', {}, h('td', { class: 'pr-n' }, String(i + 1)),
            h('td', {}, h('strong', {}, ex?.name || rx.ex), roleName?.[rx.role] ? h('span', { class: 'pr-role' }, roleName[rx.role]) : null),
            h('td', {}, parts[0]), h('td', {}, parts.length > 2 ? parts[1] : '—'), h('td', {}, restOf(rx.rest)),
            Array.from({ length: cols }, () => h('td', { class: 'pr-w' })));
        })))))),
    h('section', { class: 'pr-sec' }, h('h2', {}, 'Para terminar, 5 min'), h('ul', {}, COOLDOWN.map((x) => h('li', {}, x)))),
    h('section', { class: 'pr-sec pr-read' }, h('h2', {}, 'Cómo leer tu rutina'),
      h('dl', {}, h('dt', {}, '3 × 8-10'), h('dd', {}, '3 series de 8 a 10 repeticiones.'),
        h('dt', {}, 'Te sobran 2'), h('dd', {}, 'Termina la serie cuando todavía podrías hacer 2 más con buena técnica.'),
        h('dt', {}, 'Cuándo subir'), h('dd', {}, 'Cuando completes el máximo de repeticiones en todas las series, sube un poco el peso y vuelve al mínimo.'),
        cols ? [h('dt', {}, 'Sem 1 a 4'), h('dd', {}, 'Anota el peso y las repeticiones que hiciste, por ejemplo «20 kg × 10».')] : null)),
    ui.how ? h('section', { class: 'pr-sec pr-how' }, h('h2', {}, 'Cómo se hace cada ejercicio'),
      seen.map((id) => { const ex = byId[id]; return h('div', { class: 'pr-ex' }, h('h3', {}, ex.name), ex.why ? h('p', {}, ex.why) : null,
        h('ol', {}, (ex.how || []).map((x) => h('li', {}, x))), ex.cues?.length ? h('p', {}, h('strong', {}, 'Claves: '), ex.cues.join(' · ')) : null,
        ex.err ? h('p', {}, h('strong', {}, 'Error común: '), ex.err) : null, ex.safety ? h('p', {}, h('strong', {}, 'Seguridad: '), ex.safety) : null); })) : null,
    foot(f));
}

function gymPrint(ctx) {
  const ui = ctx.ui; ui.rr = ctx.rerender;
  const [, a, code] = ctx.args;
  let spec = null, who = '', from = '', back = '#/gym';
  if (a === 's') {
    const got = unpackRoutine(code, 'gym');
    if (got) { spec = normSpec({ ...got.s, custom: got.custom ? cleanCustom(got.custom, GYM_BY_ID) : undefined }); who = got.who; from = got.who ? 'Rutina compartida' : 'Armada en Remate'; }
  } else if (a && ctx.role === 'coach') {
    const p = players().find((x) => x.id === a); spec = p ? coachPlanOf(p) : null; who = p?.name || ''; from = 'Rutina que le asignó su entrenador';
  } else if (ctx.me) {
    const act = activeSpec(ctx.me); spec = act.spec; who = ctx.me.name; from = act.src === 'coach' ? 'Rutina de tu entrenador' : 'Tu rutina';
  }
  if (!spec) return { title: 'Imprimir rutina', back, el: h('div', { class: 'page' }, empty('No hay rutina para imprimir', 'Primero arma o asigna una rutina en Gym.')) };
  const r = buildRoutine(spec);
  const train = settings().days || [];
  const wk = weekPlan(r.n, train).map((x, i) => `${DAYS[x.wd]}: día ${r.days[i]?.key || ''}`).join(' · ');
  const tools = [h('div', { class: 'cluster' }, check(ui, 'cols', 'Columnas para anotar pesos (4 semanas)', true), check(ui, 'how', 'Cómo se hace cada ejercicio', false))];
  return page('Rutina de gym', back, tools, routineSheet(ui, { title: 'Rutina de gym', who,
    lines: [from + (r.custom ? ' (personalizada)' : ''), specText(spec), spec.note ? `Tu entrenador: “${spec.note}”` : null],
    days: r.days, byId: GYM_BY_ID, week: wk, notes: r.notes,
    foot: 'Si tienes partido, no hagas pierna pesada ni saltos 2 días antes. Cada 6 semanas, una semana ligera: una serie menos y sin subir peso.' }));
}

// Remate Fit: tuyo, o el de un adulto que te lo comparte (entrenador).
function fitPerson(ctx, pid) {
  if (pid && ctx.role === 'coach') { const p = players().find((x) => x.id === pid); return p && profOf(p.id)?.share ? p : null; }
  return ctx.me && fitOk(ctx.me) && (!ctx.readonly || profOf(ctx.me.id)?.share) ? ctx.me : null;
}
function fitPrint(ctx) {
  const ui = ctx.ui; ui.rr = ctx.rerender;
  const me = fitPerson(ctx, ctx.args[1]), back = ctx.args[1] ? `#/fit/adulto/${ctx.args[1]}` : '#/fit/rutina';
  if (!me || !profOf(me.id)) return { title: 'Imprimir rutina', back, el: h('div', { class: 'page' }, note('No hay una rutina de Remate Fit para imprimir aquí.')) };
  const spec = specOf(me.id), vb = vbOf(me, spec), r = buildFit(spec, vb.days);
  const tools = [h('div', { class: 'cluster' }, check(ui, 'cols', 'Columnas para anotar pesos (4 semanas)', true), check(ui, 'how', 'Cómo se hace cada ejercicio', false))];
  return page('Rutina de Remate Fit', back, tools, routineSheet(ui, { title: 'Rutina de Remate Fit', who: me.name,
    lines: [`${FIT_GOALS[spec.goal].name} · ${r.custom ? `personalizada, ${plural(r.days.length, 'día', 'días')}` : splitName(spec.days)}`, [`${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name, `${vb.days} de voleibol por semana`].join(' · ')],
    days: r.days, byId: FIT_BY_ID, roleName: FROLE, notes: r.notes,
    foot: 'Cada 6 semanas, una semana de descarga: una serie menos en cada ejercicio y sin subir peso.' }));
}

// ---------- plan de comida ----------
function foodPrint(ctx) {
  const ui = ctx.ui; ui.rr = ctx.rerender;
  const me = fitPerson(ctx, ctx.args[1]), back = ctx.args[1] ? `#/fit/adulto/${ctx.args[1]}` : '#/fit/comida';
  const plan = me ? planOf(me) : null;
  if (!plan) return { title: 'Imprimir plan', back, el: h('div', { class: 'page' }, note('No hay un plan de comida para imprimir aquí (faltan los datos de comida, el peso o la estatura).')) };
  const n = nutriOf(me), { t } = plan, hide = n.hide;
  const picks = Object.fromEntries(Object.entries(n.picks || {}).filter(([id, x]) => RECIPE_BY_ID[id] && x > 0));
  const hasPicks = Object.keys(picks).length > 0;
  const diet = [n.diet.veg && 'vegetariana', n.diet.noDairy && 'sin lácteos', n.diet.noGluten && 'sin gluten'].filter(Boolean).join(', ');
  const tools = [h('div', { class: 'cluster' }, check(ui, 'por', 'Lista de porciones', true), check(ui, 'tim', 'Antes y después de entrenar', true),
    hasPicks ? check(ui, 'sup', 'Recetas de la semana y lista del súper', true) : null)];
  const sheet = h('article', { class: 'pr' },
    head('Plan de comida', me.name, [`${FIT_GOALS[plan.spec.goal].name} · ${plural(n.meals, 'comida', 'comidas')} al día${diet ? ` · ${diet}` : ''}`,
      hide ? null : `${fmtN(t.kcal)} kcal al día · proteína ${t.p} g · grasa ${t.f} g · carbohidratos ${t.c} g`,
      `Al día: ${Object.entries(groupTotals(plan.eq)).map(([g, x]) => `${eqText(x)} ${gName(g, x)}`).join(', ')}.`]),
    h('section', { class: 'pr-sec' }, h('h2', {}, 'Tus comidas'),
      h('div', { class: 'pr-scroll' }, h('table', { class: 'pr-tbl' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Comida'), h('th', {}, 'Porciones'), h('th', {}, '1 porción es, por ejemplo'))),
        h('tbody', {}, plan.meals.flatMap((m) => Object.entries(m.g).map(([g, x], i, all) => h('tr', { class: i === all.length - 1 ? 'pr-end' : null },
          i === 0 ? h('td', { rowspan: all.length }, h('strong', {}, m.name)) : null,
          h('td', {}, `${eqText(x)} ${gName(g, x)}`), h('td', {}, examplesOf(g, n.diet))))))))),
    h('p', { class: 'pr-sum' }, 'Puedes cambiar un alimento por otro del mismo grupo. No tiene que ser exacto: con acercarte basta.'),
    ui.por ? h('section', { class: 'pr-sec pr-cols' }, h('h2', {}, '¿Qué es una porción?'),
      portionsOf(n.diet).map(([name, foods]) => h('div', { class: 'pr-grp' }, h('h3', {}, name), h('ul', {}, foods.map(([f, q]) => h('li', {}, `${f}: ${q}`)))))) : null,
    ui.tim ? h('section', { class: 'pr-sec' }, h('h2', {}, 'Antes y después de entrenar'), h('dl', {}, TIMING.map(([a, b]) => [h('dt', {}, a), h('dd', {}, b)]))) : null,
    hasPicks && ui.sup ? h('section', { class: 'pr-sec' }, h('h2', {}, 'Recetas de la semana'),
      h('ul', {}, Object.entries(picks).map(([id, x]) => h('li', {}, `${RECIPE_BY_ID[id].name}: ${plural(x, 'ración', 'raciones')}`))),
      h('h2', {}, 'Lista del súper'),
      h('div', { class: 'pr-cols' }, shoppingList(picks).map(([cat, xs]) => h('div', { class: 'pr-grp' }, h('h3', {}, cat), h('ul', { class: 'pr-box' }, xs.map((x) => h('li', {}, `${x.name}: ${x.text}`))))))) : null,
    foot('Es una estimación con el Sistema Mexicano de Alimentos Equivalentes. No es para personas con diabetes, enfermedad de los riñones, embarazo u otra condición médica: consulta a un nutriólogo.'));
  return page('Plan de comida', back, tools, sheet);
}

export default function imprimir(ctx) {
  const k = ctx.args[0];
  if (k === 'gym') return gymPrint(ctx);
  if (k === 'fit') return fitPrint(ctx);
  if (k === 'comida') return foodPrint(ctx);
  return { title: 'Imprimir', back: '#/', el: h('div', { class: 'page' }, empty('Nada que imprimir', 'Abre «Compartir o imprimir» desde tu rutina o tu plan.')) };
}
