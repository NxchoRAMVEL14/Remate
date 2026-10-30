// En casa: ejercicios opcionales para el jugador (físicos, técnicos con y sin balón) y su registro.
// El entrenador ve el mismo contenido y quién está entrenando en casa.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, addDays, plural } from '../util.js';
import { state, add, patch, remove, players, casaReady, teamReady } from '../store.js';
import { weekStart } from '../lab-calc.js';
import { CATS, STAGE, HOME, HOME_BY_ID, ROUTINES, FEEL, RULES, refName } from '../content/casa.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';

const doseOf = (ex, level) => ex.dose[STAGE(level || 1)];
const logsOf = (pid) => state.data.homeLogs.filter((l) => l.player_id === pid).sort((a, b) => `${b.done_on}${b.created_at}`.localeCompare(`${a.done_on}${a.created_at}`));
function weekSummary(logs) {
  const ws = weekStart(todayStr()), wk = logs.filter((l) => l.done_on >= ws);
  return { days: new Set(wk.map((l) => l.done_on)).size, minutes: wk.reduce((a, l) => a + (Number(l.minutes) || 0), 0), n: wk.length };
}
export const homeWeek = (pid) => weekSummary(logsOf(pid));

function logSheet(me, kind, ref, minutes) {
  const date = h('input', { type: 'date', min: addDays(todayStr(), -7), max: todayStr(), value: todayStr() });
  const mins = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 180, step: 1, value: minutes || '' });
  let feel = null;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Cómo te sentiste' });
  const desc = h('span', { class: 'hint' }, 'Opcional.');
  const draw = () => { seg.replaceChildren(...Object.keys(FEEL).map((k) => h('button', { type: 'button', 'aria-pressed': String(feel) === k ? 'true' : 'false', title: FEEL[k], onclick: () => { feel = Number(k); draw(); } }, k))); desc.textContent = feel ? FEEL[feel] : '1 muy pesado, 5 muy bien. Opcional.'; };
  draw();
  const text = h('input', { type: 'text', maxlength: 300, placeholder: 'Opcional: qué se te hizo difícil' });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: `Lo hice: ${refName(ref)}`,
    body: h('div', { class: 'stack' }, h('div', { class: 'grid' }, field('Fecha', date), field('Minutos', mins)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Cómo te sentiste?'), seg, desc), field('Nota', text),
      note('Tu entrenador ve lo que registras aquí. Nadie más.'), err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const m = mins.value === '' ? null : Math.round(Number(mins.value));
      if (m != null && (m < 1 || m > 180)) { err.textContent = 'Los minutos deben estar entre 1 y 180.'; err.hidden = false; return false; }
      add('homeLogs', { player_id: me.id, done_on: date.value || todayStr(), kind, ref, minutes: m, feeling: feel, note: text.value.trim() });
      toast('¡Bien! Quedó registrado'); return true;
    } }],
  });
}

function exItem(ex, level, canLog, me) {
  return h('details', { class: 'hx' },
    h('summary', {}, h('span', { class: 'row-main' }, h('strong', {}, ex.name), h('span', { class: 'row-sub' }, `${doseOf(ex, level)} · ${ex.space}`)), ic('chevron-down', 18)),
    h('div', { class: 'hx-body stack' },
      h('p', { style: { margin: 0 } }, ex.goal),
      h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))),
      h('div', { class: 'cluster' }, ex.cues.map((c) => h('span', { class: 'chip info' }, c))),
      ex.safety ? note(`Seguridad: ${ex.safety}`, 'warn') : null,
      canLog ? h('button', { class: 'btn sm', type: 'button', onclick: () => logSheet(me, 'ejercicio', ex.id, ex.min) }, ic('check', 16), 'Lo hice') : null));
}

function routineCard(r, level, canLog, me) {
  return h('section', { class: 'panel stack' },
    h('div', { class: 'split' }, h('h3', {}, r.name), h('span', { class: 'chip ball' }, `${r.min} min`)),
    h('ol', { class: 'plain' }, r.items.map((id) => h('li', {}, `${HOME_BY_ID[id].name}: ${doseOf(HOME_BY_ID[id], level)}`))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, r.note),
    canLog ? h('button', { class: 'btn primary sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => logSheet(me, 'rutina', r.id, r.min) }, ic('check', 16), 'La hice') : null);
}

function library(ctx, level, canLog, me) {
  const ui = ctx.ui; ui.cat ||= 'fisico';
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tipo de ejercicio' }, Object.entries(CATS).map(([k, c]) =>
    h('button', { type: 'button', 'aria-pressed': ui.cat === k ? 'true' : 'false', onclick: () => { ui.cat = k; ctx.rerender(); } }, c.name)));
  return h('div', { class: 'stack' },
    h('section', { class: 'stack' }, sectionTitle('Rutinas listas'), h('div', { class: 'routines' }, ROUTINES.map((r) => routineCard(r, level, canLog, me)))),
    h('section', { class: 'stack' }, sectionTitle('Ejercicios por tipo'), seg,
      h('p', { class: 'row-sub', style: { margin: 0 } }, CATS[ui.cat].desc),
      h('div', { class: 'rows' }, HOME.filter((e) => e.cat === ui.cat).map((e) => exItem(e, level, canLog, me)))),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Antes de empezar')), h('ul', { class: 'plain', style: { marginTop: '10px' } }, RULES.map((r) => h('li', {}, r)))));
}

// ---------- Tarea de casa por jugador ----------
export const planOf = (p) => (p?.home_plan && Array.isArray(p.home_plan.items) ? p.home_plan : { items: [], note: '' });

export function homePlanSheet(p) {
  const plan = planOf(p), chosen = new Map(plan.items.map((x) => [x.ref, x.times || 2]));
  const row = (ref, name, sub) => {
    const cb = h('input', { type: 'checkbox', checked: chosen.has(ref) ? true : null });
    const times = h('select', { 'aria-label': `Veces por semana: ${name}` }, options([1, 2, 3, 4].map((n) => [n, `${n} por semana`]), chosen.get(ref) || 2));
    const sync = () => { if (cb.checked) chosen.set(ref, Number(times.value)); else chosen.delete(ref); times.disabled = !cb.checked; };
    cb.addEventListener('change', sync); times.addEventListener('change', sync); times.disabled = !cb.checked;
    return h('div', { class: 'row plan-row' }, h('label', { class: 'check', style: { flex: 1 } }, cb, h('span', { class: 'row-main' }, h('strong', {}, name), sub ? h('span', { class: 'row-sub' }, sub) : null)), times);
  };
  const text = h('textarea', { rows: 2, maxlength: 300, placeholder: 'Por ejemplo: trabaja el hombro antes de cada partido.' }, plan.note || '');
  openSheet({
    title: `Tarea de casa de ${p.name}`,
    body: h('div', { class: 'stack' },
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Elige lo que más le conviene. Lo verá primero en su sección En casa, con la dosis de su nivel (${p.level}).`),
      sectionTitle('Rutinas'), h('div', { class: 'rows' }, ROUTINES.map((r) => row(r.id, r.name, `${r.min} min`))),
      ...Object.entries(CATS).map(([k, c]) => h('details', {}, h('summary', {}, h('strong', {}, c.name)),
        h('div', { class: 'rows', style: { marginTop: '6px' } }, HOME.filter((e) => e.cat === k).map((e) => row(e.id, e.name, doseOf(e, p.level)))))),
      field('Mensaje para el jugador', text)),
    actions: [{ label: 'Cancelar' },
      plan.items.length ? { label: 'Quitar tarea', kind: 'danger', onClick: () => { patch('players', p.id, { home_plan: {} }); toast('Tarea quitada'); } } : null,
      { label: 'Guardar', kind: 'primary', onClick: () => {
        const items = [...chosen.entries()].map(([ref, times]) => ({ ref, times }));
        patch('players', p.id, { home_plan: items.length || text.value.trim() ? { items, note: text.value.trim(), updated_at: todayStr() } : {} });
        toast(items.length ? `Tarea guardada: ${plural(items.length, 'cosa', 'cosas')}` : 'Tarea guardada'); return true;
      } }].filter(Boolean),
  });
}

// Lo que el entrenador le recomienda a este jugador (lo ve el jugador arriba de todo).
function planSection(me, canLog) {
  const plan = planOf(me);
  if (!plan.items.length && !plan.note) return null;
  const ws = weekStart(todayStr());
  const doneThisWeek = (ref) => state.data.homeLogs.filter((l) => l.player_id === me.id && l.ref === ref && l.done_on >= ws).length;
  return h('section', { class: 'panel stack plan' },
    h('div', { class: 'split' }, h('h2', {}, 'Tu tarea de casa'), plan.updated_at ? h('span', { class: 'row-sub' }, `Desde el ${fmtDate(plan.updated_at, { day: 'numeric', month: 'short' })}`) : null),
    plan.note ? h('p', { style: { margin: 0 } }, `Tu entrenador: “${plan.note}”`) : null,
    plan.items.length ? h('div', { class: 'rows' }, plan.items.map((x) => {
      const ref = x.ref, r = ROUTINES.find((y) => y.id === ref), ex = HOME_BY_ID[ref], d = doneThisWeek(ref);
      if (!r && !ex) return null;
      return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, r ? r.name : ex.name),
        h('span', { class: 'row-sub' }, `${x.times || 2} por semana${r ? `, ${r.min} min` : `, ${doseOf(ex, me.level)}`} · esta semana: ${d}`)),
        h('span', { class: 'row-end' }, d >= (x.times || 2) ? h('span', { class: 'chip ok' }, 'Lista') : null,
          canLog ? h('button', { class: 'btn sm', type: 'button', onclick: () => logSheet(me, r ? 'rutina' : 'ejercicio', ref, r ? r.min : ex.min) }, ic('check', 16), 'Lo hice') : null));
    })) : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Los detalles de cada ejercicio están más abajo.'));
}

export default function casa(ctx) {
  return ctx.role === 'coach' ? coach(ctx) : jugador(ctx);
}

function jugador(ctx) {
  const me = ctx.me;
  if (!me) return { title: 'En casa', el: h('div', { class: 'page' }, empty('Sin jugador', 'Vuelve a entrar con tu código.')) };
  const ready = casaReady(), canLog = ready && !ctx.readonly;
  const logs = logsOf(me.id), wk = weekSummary(logs);
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' },
      h('h2', {}, 'Entrena en casa'),
      h('p', { style: { margin: 0 } }, `Es opcional. Rutinas cortas, sin aparatos y ajustadas a tu nivel (${me.level}). Lo que hagas aquí se nota en la cancha.`),
      h('p', { class: 'when', style: { margin: 0 } }, wk.days ? `Esta semana: ${plural(wk.days, 'día', 'días')}${wk.minutes ? `, ${wk.minutes} min` : ''}.` : 'Esta semana todavía no registras nada.')),
    !ready ? note('Por ahora no se puede registrar lo que haces en casa. Igual puedes hacer los ejercicios.', 'warn') : null,
    planSection(me, canLog),
    library(ctx, me.level, canLog, me),
    logs.length ? h('section', { class: 'stack' }, sectionTitle('Lo que has hecho'),
      h('div', { class: 'rows' }, logs.slice(0, 12).map((l) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, refName(l.ref)), h('span', { class: 'row-sub' }, [fmtDate(l.done_on), l.minutes ? `${l.minutes} min` : null, l.feeling ? FEEL[l.feeling] : null, l.note || null].filter(Boolean).join(' · '))),
        canLog ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Borrar registro', onclick: async () => {
          if (await confirmSheet({ title: '¿Borrar este registro?', text: `${refName(l.ref)} del ${fmtDate(l.done_on)}.`, ok: 'Borrar', danger: true })) { remove('homeLogs', l.id); toast('Registro borrado'); }
        } }, ic('trash-2', 18)) : null)))) : null);
  return { title: 'En casa', sub: 'Opcional', back: '#/inicio', el };
}

function coach(ctx) {
  const ui = ctx.ui; ui.level ||= '2';
  const ws = addDays(todayStr(), -13);
  const rows = players().map((p) => {
    const l = logsOf(p.id).filter((x) => x.done_on >= ws);
    return { p, days: new Set(l.map((x) => x.done_on)).size, minutes: l.reduce((a, x) => a + (Number(x.minutes) || 0), 0), last: logsOf(p.id)[0]?.done_on || null };
  }).sort((a, b) => b.days - a.days || b.minutes - a.minutes || a.p.name.localeCompare(b.p.name, 'es'));
  const active = rows.filter((r) => r.days);
  const lv = h('select', { 'aria-label': 'Ver dosis del nivel' }, options([1, 2, 3, 4, 5, 6].map((n) => [String(n), `Dosis del nivel ${n}`]), ui.level));
  lv.addEventListener('change', () => { ui.level = lv.value; ctx.rerender(); });
  const el = h('div', { class: 'page' },
    !casaReady() ? note('Para que tus jugadores puedan registrar lo que hacen en casa, corre en Supabase el instalar.sql de esta versión.', 'bad') : null,
    h('p', { style: { margin: 0 } }, 'Tus jugadores ven esta sección desde su Inicio y desde Ejercicios. Es opcional: pueden hacer las rutinas y, si quieren, registrar lo que hicieron.'),
    h('section', { class: 'stack' }, sectionTitle('Quién entrena en casa', h('span', { class: 'chip' }, 'Últimas 2 semanas')),
      active.length ? h('div', { class: 'rows' }, active.map((r) => h('a', { class: 'row', href: `#/jugador/${r.p.id}` }, jersey(r.p),
        h('span', { class: 'row-main' }, h('strong', {}, r.p.name), h('span', { class: 'row-sub' }, `${plural(r.days, 'día', 'días')}${r.minutes ? `, ${r.minutes} min` : ''} · último: ${fmtDate(r.last)}`)),
        h('span', { class: 'row-end' }, planOf(r.p).items.length ? h('span', { class: 'chip ball', title: 'Tiene tarea de casa' }, 'Tarea') : null, h('span', { class: `chip ${r.days >= 4 ? 'ok' : 'info'}` }, `${r.days} d`)))))
        : empty('Nadie ha registrado todavía', 'Cuéntales a tus jugadores que existe esta sección. Registrar es opcional.'),
      active.length && active.length < rows.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Sin registros en estas 2 semanas: ${rows.filter((r) => !r.days).map((r) => r.p.name).join(', ')}.`) : null),
    h('section', { class: 'stack' }, sectionTitle('Tareas de casa por jugador'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Asigna a cada jugador lo que más necesita (por ejemplo, hombro a tus rematadores o equilibrio a quien se ha torcido el tobillo).'),
      !teamReady() ? note('Para asignar tareas, corre en Supabase el instalar.sql de esta versión.', 'warn') : null,
      h('div', { class: 'rows' }, players().map((p) => { const pl = planOf(p);
        return h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name),
          h('span', { class: 'row-sub' }, pl.items.length ? pl.items.map((x) => refName(x.ref)).join(', ') : 'Sin tarea')),
          h('button', { class: 'btn sm', type: 'button', disabled: teamReady() ? null : true, onclick: () => homePlanSheet(p) }, ic(pl.items.length ? 'pencil' : 'plus', 16), pl.items.length ? 'Cambiar' : 'Asignar'));
      }))),
    h('div', { class: 'cluster' }, lv),
    library(ctx, Number(ui.level), false, null));
  return { title: 'En casa', sub: 'Lo que ven tus jugadores', back: '#/ejercicios', el };
}
