// Remate Fit (v3.11, nutrición en v3.12): la zona de adultos dentro de Remate. Solo la ven mayores de 18 que el entrenador activa
// (y el entrenador con su propio perfil de jugador). Gym de adultos, comida, peso, medidas y pasos.
// Lo de cada adulto es suyo: el entrenador lo ve solo si ese adulto activa «Compartir con mi entrenador».
import { h, ic, toast, confirmSheet, fmtDate, todayStr, addDays, plural } from '../util.js';
import { lazyFig } from '../figura.js';
import { figFor } from '../content/movimientos.js';
import { state, add, patch, remove, players, settings, sql311Ready, ls, myPlayer } from '../store.js';
import { fitOk, isAdult, ageFrom } from '../calc.js';
import { num } from '../lab-calc.js';
import { FIT_BY_ID, fitName, PLACES, FIT_GOALS, FIT_EXP, FIT_MINUTES, normFit, buildFit, nextFitStep, fitWeek, weeklyAverages, weeklyRate, rateText,
  MEASURES, MEASURE_TIPS, STEP_NOTE, vbFromRemate, FIT_SOURCES, MUSCLES, VOLUME_TARGET, ROLE, NEED, TIER, splitName } from '../content/fit.js';
import { WARMUP, COOLDOWN } from '../content/gym.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { lineChart } from './chart.js';
import { enterSelf } from './mas.js';
import { foodTab, recipePage, foodSummary, foodShared } from './fit-comida.js';

// ---------- datos ----------
export const profOf = (pid) => (state.data.fitProfiles || []).find((r) => r.player_id === pid) || null;
const byDay = (a, b) => `${b.day}${b.created_at || ''}`.localeCompare(`${a.day}${a.created_at || ''}`);
export const fitLogsOf = (pid, kind) => (state.data.fitLogs || []).filter((l) => l.player_id === pid && (!kind || l.kind === kind)).sort(byDay);
export function saveProf(pid, data, extra = {}) {
  const r = profOf(pid);
  if (r) return patch('fitProfiles', r.id, { data: { ...(r.data || {}), ...data }, updated_at: new Date().toISOString(), ...extra });
  return add('fitProfiles', { player_id: pid, data: { ...data }, share: false, ...extra });
}
// Un registro por día para pasos y para peso/medidas: si ya hay, se completa.
export function upsertDay(pid, kind, day, data) {
  const ex = fitLogsOf(pid, kind).find((l) => l.day === day);
  if (ex) return patch('fitLogs', ex.id, { data: { ...(ex.data || {}), ...data } });
  return add('fitLogs', { player_id: pid, kind, day, data });
}
export const specOf = (pid) => normFit(profOf(pid)?.data);
export function vbOf(me, spec) {
  const auto = vbFromRemate({ attendance: state.data.attendance || [], sessions: state.data.sessions || [], matchStats: state.data.matchStats || [], matches: state.data.matches || [],
    playerId: me.id, teamDays: (settings().days || []).length });
  return { auto, days: spec.vbAuto ? auto.days : spec.vbDays };
}
function routineOf(me) {
  const spec = specOf(me.id), vb = vbOf(me, spec), r = buildFit(spec, vb.days), wk = fitWeek(spec.since);
  // Semana de descarga (cada 6): una serie menos en todo y sin subir peso.
  if (wk?.light) r.days.forEach((d) => d.items.forEach((rx) => { rx.sets = Math.max(1, rx.sets - 1); }));
  return { spec, vb, r, wk };
}
function lastFor(pid, exId, skipId) {
  for (const l of fitLogsOf(pid, 'gym')) { if (l.id === skipId) continue; const e = (l.data?.sets || []).find((x) => x.ex === exId); if (e) return e; }
  return null;
}
const nextKey = (pid, r) => { const last = fitLogsOf(pid, 'gym')[0]?.data?.key; const i = r.days.findIndex((d) => d.key === last); return r.days[i >= 0 ? (i + 1) % r.days.length : 0]; };

// ---------- textos ----------
const restText = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
function rxText(rx) {
  const ex = FIT_BY_ID[rx.ex];
  const parts = [`${rx.sets} × ${rx.reps}${ex?.side ? ' por lado' : ''}`];
  if (rx.rir != null) parts.push(rx.rir === 0 ? 'hasta el fallo técnico' : `te sobran ${rx.rir}`);
  else if (rx.role === 'pow' || ex?.unit === 'saltos') parts.push('a máxima velocidad');
  parts.push(`descanso ${restText(rx.rest)}`);
  return parts.join(' · ');
}
const longDay = (d) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
const r1 = (x) => Math.round(x * 10) / 10;
const RPE = { 1: 'Muy fácil', 2: 'Muy fácil', 3: 'Fácil', 4: 'Fácil', 5: 'Moderada', 6: 'Moderada', 7: 'Pesada', 8: 'Pesada', 9: 'Muy pesada', 10: 'Al máximo' };

function exItem(ex, { rx = null, last, n } = {}) {
  const lf = lazyFig(figFor(ex), { size: 'md' });
  const tip = rx && last !== undefined ? nextFitStep(rx, last) : '';
  return h('details', { class: 'hx', ontoggle: lf.ontoggle },
    h('summary', {}, n ? h('span', { class: 'gx-n', 'aria-hidden': 'true' }, String(n)) : null,
      h('span', { class: 'row-main' }, h('strong', {}, ex.name), h('span', { class: 'row-sub' }, rx ? `${ROLE[rx.role]} · ${rxText(rx)}` : `${TIER[ex.tier]} · ${NEED[ex.need]}`)), ic('chevron-down', 18)),
    h('div', { class: 'hx-body stack' },
      h('p', { style: { margin: 0 } }, ex.why), lf.slot,
      h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))),
      h('div', { class: 'cluster' }, ex.cues.map((c) => h('span', { class: 'chip info' }, c))),
      h('dl', { class: 'gx-dl' }, h('dt', {}, 'Error común'), h('dd', {}, ex.err), h('dt', {}, 'Más fácil'), h('dd', {}, ex.easier), h('dt', {}, 'Más difícil'), h('dd', {}, ex.harder)),
      tip ? note(`La siguiente vez: ${tip}`) : null,
      ex.safety ? note(`Seguridad: ${ex.safety}`, 'warn') : null,
      h('p', { class: 'row-sub', style: { margin: 0 } }, `${ex.body} · ${NEED[ex.need]}${ex.each ? ' · peso por mano' : ''}`)));
}

// ---------- pestañas ----------
const TABS = [['hoy', 'Hoy'], ['rutina', 'Rutina'], ['comida', 'Comida'], ['progreso', 'Progreso'], ['ajustes', 'Perfil']];
const FOOD = ['comida', 'recetas', 'super'];
const tabKey = (a) => (FOOD.includes(a) ? 'comida' : TABS.some(([k]) => k === a) ? a : 'hoy');
function tabsEl(ctx, base = '#/fit') {
  const cur = tabKey(ctx.args[0]);
  return h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { location.hash = k === 'hoy' ? base : `${base}/${k}`; } }, t)));
}

export default function fit(ctx) {
  if (ctx.role === 'coach') return coachView(ctx);
  const me = ctx.me;
  if (!me) return { title: 'Remate Fit', el: h('div', { class: 'page' }, empty('Sin perfil', 'Entra con tu código para usar Remate Fit.')) };
  if (!sql311Ready()) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, note('Remate Fit todavía no está listo en la nube. Tu entrenador tiene que correr el SQL de la versión 3.11.', 'warn')) };
  if (!fitOk(me)) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, empty('Remate Fit es para adultos', 'Es la zona de gym, peso y nutrición para mayores de 18. La activa tu entrenador en tu ficha.')) };
  // Vista previa del entrenador (no es su propio perfil): solo si ese adulto comparte.
  if (ctx.readonly && !profOf(me.id)?.share) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, note(`Remate Fit es privado de ${me.name}. Lo verías aquí solo si activa «Compartir con mi entrenador».`)) };
  if (ctx.args[0] === 'registrar') return logPage(ctx, me);
  if (ctx.args[0] === 'receta') return recipePage(ctx, me, !ctx.readonly);
  const tab = tabKey(ctx.args[0]);
  const canEdit = !ctx.readonly;
  // La comida necesita el perfil Fit (objetivo y días de gym): si no hay, primero eso.
  const body = tab === 'comida' ? (profOf(me.id) ? foodTab(ctx, me, canEdit, ctx.args[0]) : todayTab(ctx, me, canEdit)) : tab === 'rutina' ? routineTab(ctx, me, canEdit) : tab === 'progreso' ? progressTab(ctx, me, canEdit) : tab === 'ajustes' ? profileTab(ctx, me, canEdit) : todayTab(ctx, me, canEdit);
  return { title: 'Remate Fit', sub: 'Zona de adultos', back: '#/inicio', el: h('div', { class: 'page fit' }, tabsEl(ctx), body) };
}

// ---------- Hoy ----------
function todayTab(ctx, me, canEdit) {
  const prof = profOf(me.id);
  if (!prof && canEdit) return firstTime(ctx, me);
  const { spec, vb, r, wk } = routineOf(me);
  const day = nextKey(me.id, r);
  const today = todayStr();
  const weekFrom = addDays(today, -6);
  const gymWeek = fitLogsOf(me.id, 'gym').filter((l) => l.day >= weekFrom).length;
  const steps = fitLogsOf(me.id, 'steps'), stepsToday = steps.find((l) => l.day === today)?.data?.n;
  const st7 = steps.filter((l) => l.day >= weekFrom && Number(l.data?.n) > 0);
  const stAvg = st7.length ? Math.round(st7.reduce((a, l) => a + Number(l.data.n), 0) / st7.length) : null;
  const body = fitLogsOf(me.id, 'body'), kgToday = body.find((l) => l.day === today)?.data?.kg;
  const avgs = weeklyAverages(body, 3), rate = weeklyRate(avgs), lastAvg = [...avgs].reverse().find((a) => a.avg != null);

  const stepsIn = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 80000, step: 100, value: stepsToday ?? '', placeholder: 'Pasos', 'aria-label': 'Pasos de hoy' });
  const kgIn = h('input', { type: 'number', inputmode: 'decimal', min: 30, max: 250, step: 0.1, value: kgToday ?? '', placeholder: 'kg', 'aria-label': 'Peso de hoy en kg' });
  const saveSteps = () => { const n = num(stepsIn.value); if (n == null || n < 0 || n > 80000) { toast('Escribe tus pasos de hoy (0 a 80,000)'); return; } upsertDay(me.id, 'steps', today, { n: Math.round(n) }); toast('Pasos guardados'); };
  const saveKg = () => { const kg = num(kgIn.value); if (kg == null || kg < 30 || kg > 250) { toast('Escribe tu peso en kg (30 a 250)'); return; } upsertDay(me.id, 'body', today, { kg: r1(kg) }); toast('Peso guardado'); };

  return h('div', { class: 'stack' },
    h('section', { class: 'band next fit-band' },
      h('div', { class: 'when' }, [FIT_GOALS[spec.goal].name, wk ? `semana ${wk.week} de 6${wk.light ? ' · descarga' : ''}` : null].filter(Boolean).join(' · ')),
      h('h2', {}, `Siguiente: día ${day.key}, ${day.name}`),
      h('div', {}, `${plural(day.items.length, 'ejercicio', 'ejercicios')}, ≈ ${day.min} min${day.light ? ' · día ligero de pierna por tu voleibol' : ''}`),
      h('div', { class: 'cluster' },
        canEdit ? h('a', { class: 'btn ball', href: `#/fit/registrar/${day.key}` }, ic('check', 18), `Registrar el día ${day.key}`) : null,
        h('a', { class: 'btn', href: '#/fit/rutina' }, ic('dumbbell', 18), 'Ver la rutina'))),
    wk?.light ? note('Semana de descarga: una serie menos en cada ejercicio y sin subir peso. Te recuperas y luego sigues subiendo.', 'info') : null,
    h('div', { class: 'kpis fit-kpis' },
      kpi('Gym esta semana', `${gymWeek} de ${spec.days}`, gymWeek >= spec.days ? 'ok' : ''),
      kpi('Pasos (promedio 7 días)', stAvg != null ? stAvg.toLocaleString('es-MX') : '—', stAvg != null && stAvg >= spec.stepsGoal ? 'ok' : ''),
      kpi('Peso (promedio semana)', lastAvg ? `${r1(lastAvg.avg)} kg` : '—', ''),
      kpi('Voleibol por semana', `${vb.days} ${vb.days === 1 ? 'día' : 'días'}`, '')),
    rate ? note(rateText(spec.goal, rate)) : null,
    canEdit ? h('section', { class: 'panel stack' }, h('h3', {}, 'Hoy'),
      h('div', { class: 'fit-quick' }, h('label', { class: 'field' }, h('span', { class: 'label' }, `Pasos (meta ${spec.stepsGoal.toLocaleString('es-MX')})`), stepsIn), h('button', { type: 'button', class: 'btn', onclick: saveSteps }, 'Guardar')),
      h('div', { class: 'fit-quick' }, h('label', { class: 'field' }, h('span', { class: 'label' }, 'Peso en ayunas (kg)'), kgIn), h('button', { type: 'button', class: 'btn', onclick: saveKg }, 'Guardar')),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Los pasos los ves en tu reloj o en la app de salud de tu celular. El peso: por la mañana, después del baño y antes de desayunar.')) : null,
    state.role === 'coach' ? null : note(prof?.share ? 'Compartes tu Remate Fit con tu entrenador: ve tu rutina y tu progreso. Lo cambias en «Perfil».' : 'Tu Remate Fit es privado: tu entrenador no lo ve. Si quieres que te ayude, actívalo en «Perfil».'),
    foodSummary(me, canEdit));
}
const kpi = (label, value, kind) => h('div', { class: `kpi ${kind || ''}` }, h('span', { class: 'n' }, value), h('span', { class: 'l' }, label));

function firstTime(ctx, me) {
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' }, h('h2', {}, `¡Bienvenido a Remate Fit, ${me.name.split(' ')[0]}!`),
      h('p', { style: { margin: 0 } }, 'Tu zona de adultos: rutina de gym a tu medida que se ajusta a tu voleibol, plan de comida con recetas mexicanas, tus cargas, tu peso, tus medidas y tus pasos.'),
      h('p', { style: { margin: 0 } }, 'Primero dinos tu objetivo, tu experiencia y dónde entrenas.')),
    profileForm(me, normFit({}), (data) => { saveProf(me.id, { ...data, since: todayStr() }); toast('Listo: ya tienes tu rutina'); location.hash = '#/fit/rutina'; }, 'Armar mi rutina'),
    privacyNote());
}
const privacyNote = () => note('Lo que registras en Remate Fit es tuyo. Tu entrenador lo ve solo si activas «Compartir con mi entrenador». Nadie más lo ve en la app.');

// ---------- rutina ----------
function routineTab(ctx, me, canEdit) {
  const { spec, vb, r, wk } = routineOf(me);
  const [lo, hi] = VOLUME_TARGET[spec.goal];
  const vol = Object.entries(r.volume).filter(([m]) => m !== 'abdomen');
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, splitName(spec.days)), h('span', { class: 'chip ball' }, FIT_GOALS[spec.goal].name)),
      h('p', { class: 'row-sub', style: { margin: 0 } }, [`${spec.days} días`, `${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name, `${vb.days} de voleibol${spec.vbAuto ? ' (de Remate)' : ' (a mano)'}`].join(' · ')),
      wk ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Bloque ${wk.block}, semana ${wk.week} de 6. ${wk.light ? 'Esta es de descarga.' : `La semana 6 es de descarga (termina el ${fmtDate(wk.ends, { day: 'numeric', month: 'short' })}).`}`) : null,
      h('ul', { class: 'plain' }, r.notes.map((x) => h('li', {}, x)))),
    r.days.map((d) => h('section', { class: 'panel stack gx-day' },
      h('div', { class: 'split' }, h('h3', {}, `Día ${d.key}: ${d.name}`), h('span', { class: 'cluster' }, d.light ? h('span', { class: 'chip info' }, 'Pierna ligera') : null, h('span', { class: 'chip ball' }, `≈ ${d.min} min`))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, d.focus),
      h('details', { class: 'gx-sub' }, h('summary', {}, h('strong', {}, 'Calentamiento, 8 a 10 min')), h('ol', { class: 'plain' }, WARMUP.map((x) => h('li', {}, x)))),
      h('div', { class: 'rows' }, d.items.map((rx, i) => exItem(FIT_BY_ID[rx.ex], { rx, last: lastFor(me.id, rx.ex), n: i + 1 }))),
      h('details', { class: 'gx-sub' }, h('summary', {}, h('strong', {}, 'Para terminar')), h('ul', { class: 'plain' }, COOLDOWN.map((x) => h('li', {}, x)))),
      canEdit ? h('a', { class: 'btn primary', href: `#/fit/registrar/${d.key}` }, ic('check', 18), `Registrar el día ${d.key}`) : null)),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Series por semana de cada músculo'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Para tu objetivo, de ${lo} a ${hi} por músculo. Las de un ejercicio que lo trabaja de lado cuentan la mitad.`),
      h('div', { class: 'fit-vol' }, vol.map(([m, x]) => h('div', { class: `fit-vol-row ${x >= lo ? 'ok' : x > 0 ? 'low' : 'none'}` },
        h('span', {}, MUSCLES[m]), h('span', { class: 'fit-bar' }, h('i', { style: { width: `${Math.min(100, (x / hi) * 100)}%` } })), h('strong', {}, String(r1(x))))))),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo leer tu rutina')),
      h('dl', { class: 'gx-dl' },
        h('dt', {}, '3 × 8-10'), h('dd', {}, '3 series de 8 a 10 repeticiones.'),
        h('dt', {}, 'Te sobran 2'), h('dd', {}, 'Termina la serie cuando todavía podrías hacer 2 más con buena técnica. Para crecer músculo conviene acercarse al fallo (0 a 2); para fuerza no hace falta.'),
        h('dt', {}, 'Cuándo subir'), h('dd', {}, 'Cuando completes el máximo de repeticiones en todas las series, sube un poco el peso y vuelve al mínimo. Remate te lo dice al registrar.'),
        h('dt', {}, 'Descarga'), h('dd', {}, 'Cada 6 semanas, una semana con una serie menos y sin subir peso.'))),
    sourcesPanel());
}
const sourcesPanel = () => h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale')),
  h('ul', { class: 'plain' }, FIT_SOURCES.map(([t, u]) => h('li', {}, link(u, t)))),
  h('p', { class: 'row-sub' }, 'Las series, repeticiones y ajustes son propuestas de Remate basadas en estas fuentes. No sustituye a un médico ni a un entrenador certificado; si tienes una lesión o una enfermedad, consulta antes.'));

// ---------- registrar una sesión ----------
const DRAFT = (pid) => `remate.fit.draft.${pid}`;
function logPage(ctx, me) {
  const back = '#/fit';
  const { spec, r } = routineOf(me);
  const day = r.days.find((d) => d.key === ctx.args[1]);
  if (!day) return { title: 'Registrar', back, el: h('div', { class: 'page' }, empty('No encontré ese día', 'Puede que hayas cambiado tu rutina.', h('a', { class: 'btn', href: '#/fit/rutina' }, 'Ver mi rutina'))) };
  const ui = ctx.ui, canSave = !ctx.readonly;
  if (!ui.draft) {
    let saved = null; try { saved = JSON.parse(ls.get(DRAFT(me.id)) || 'null'); } catch { saved = null; }
    if (saved && saved.key === day.key && saved.goal === spec.goal && Date.now() - (saved.at || 0) < 12 * 3600e3) { ui.draft = saved; ui.recovered = true; }
    else ui.draft = { key: day.key, goal: spec.goal, date: todayStr(), minutes: day.min, rpe: null, pain: false, note: '', at: Date.now(),
      entries: day.items.map((rx) => { const last = lastFor(me.id, rx.ex); return { ex: rx.ex, s: Array.from({ length: rx.sets }, (_, i) => [last?.s?.[i]?.[0] ?? last?.s?.[0]?.[0] ?? '', '']) }; }) };
  }
  const dr = ui.draft;
  let timer;
  const persist = () => { dr.at = Date.now(); clearTimeout(timer); timer = setTimeout(() => ls.set(DRAFT(me.id), JSON.stringify(dr)), 300); };
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const exBlock = (rx, k) => {
    const ex = FIT_BY_ID[rx.ex], entry = dr.entries[k] || (dr.entries[k] = { ex: rx.ex, s: [['', '']] });
    const last = lastFor(me.id, rx.ex), tip = nextFitStep(rx, last), kgOn = ex.unit === 'kg';
    const repsLabel = ex.repsLabel || (ex.unit === 's' ? 'Segundos' : 'Reps');
    const list = h('div', { class: 'gx-sets' });
    const paint = () => list.replaceChildren(...entry.s.map((x, i) => h('div', { class: 'gx-set' }, h('span', { class: 'gx-sn' }, `Serie ${i + 1}`),
      kgOn ? h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'decimal', min: 0, max: 500, step: 0.5, value: x[0] ?? '', 'aria-label': `${ex.name}, serie ${i + 1}: kilos`, oninput: (e) => { x[0] = e.target.value; persist(); } }), h('span', {}, ex.each ? 'kg c/u' : 'kg')) : null,
      h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 600, step: 1, value: x[1] ?? '', placeholder: String(rx.reps).replace(/\s*s$/, ''), 'aria-label': `${ex.name}, serie ${i + 1}: ${repsLabel.toLowerCase()}`, oninput: (e) => { x[1] = e.target.value; persist(); } }), h('span', {}, repsLabel.toLowerCase())))));
    paint();
    const lf = lazyFig(figFor(ex), { size: 'sm' });
    return h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, `${k + 1}. ${ex.name}`), h('span', { class: 'row-sub' }, rxText(rx))),
      last ? h('p', { class: 'row-sub', style: { margin: 0 } }, `La vez pasada: ${last.s.map((x) => (x[0] ? `${x[0]} kg × ${x[1]}` : `${x[1]}`)).join(', ')}`) : null,
      tip ? note(tip) : null, list,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => { if (entry.s.length >= 8) return; entry.s.push([entry.s[entry.s.length - 1]?.[0] ?? '', '']); persist(); paint(); } }, ic('plus', 16), 'Serie'),
        entry.s.length > 1 ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { entry.s.pop(); persist(); paint(); } }, ic('minus', 16), 'Quitar la última') : null,
        h('details', { class: 'gx-how', ontoggle: lf.ontoggle }, h('summary', {}, '¿Cómo se hace?'), lf.slot, h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))))));
  };
  const date = h('input', { type: 'date', min: addDays(todayStr(), -14), max: todayStr(), value: dr.date, oninput: (e) => { dr.date = e.target.value; persist(); } });
  const mins = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 240, value: dr.minutes ?? '', oninput: (e) => { dr.minutes = e.target.value; persist(); } });
  const rpeDesc = h('span', { class: 'hint' }), rpeSeg = h('div', { class: 'seg gx-rpe', role: 'group', 'aria-label': '¿Qué tan pesada fue la sesión?' });
  const paintRpe = () => { rpeSeg.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h('button', { type: 'button', 'aria-pressed': Number(dr.rpe) === n ? 'true' : 'false', title: RPE[n], onclick: () => { dr.rpe = n; persist(); paintRpe(); } }, String(n))));
    rpeDesc.textContent = dr.rpe ? RPE[dr.rpe] : '1 muy fácil, 10 al máximo.'; };
  paintRpe();
  const painNote = note('Si te dolió una articulación (no son agujetas), no sigas con ese ejercicio. Si se repite, consulta a un profesional.', 'warn'); painNote.hidden = !dr.pain;
  const pain = h('input', { type: 'checkbox', checked: dr.pain ? true : null, onchange: (e) => { dr.pain = e.target.checked; painNote.hidden = !dr.pain; persist(); } });
  const text = h('input', { type: 'text', maxlength: 300, value: dr.note || '', placeholder: 'Opcional', oninput: (e) => { dr.note = e.target.value; persist(); } });
  const save = () => {
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    const sets = [];
    for (const e of dr.entries) {
      const ex = FIT_BY_ID[e.ex]; if (!ex) continue;
      const rows = [];
      for (const x of e.s) {
        const reps = num(x[1]), kg = ex.unit === 'kg' ? num(x[0]) : null;
        if (reps == null && kg == null) continue;
        if (reps == null || reps < 1 || reps > 600) return fail(`Revisa ${ex.name}: escribe las ${ex.unit === 's' ? 'segundos' : 'repeticiones'} de cada serie (o déjala vacía).`);
        if (kg != null && (kg < 0 || kg > 500)) return fail(`Revisa los kilos de ${ex.name}.`);
        rows.push([kg != null ? r1(kg) : null, Math.round(reps)]);
      }
      if (rows.length) sets.push({ ex: e.ex, s: rows.slice(0, 8) });
    }
    if (!sets.length) return fail('Anota por lo menos una serie.');
    const m = dr.minutes === '' || dr.minutes == null ? null : Math.round(Number(dr.minutes));
    if (m != null && !(m >= 1 && m <= 240)) return fail('Los minutos deben estar entre 1 y 240.');
    add('fitLogs', { player_id: me.id, kind: 'gym', day: dr.date || todayStr(), data: { key: day.key, name: day.name, goal: spec.goal, minutes: m, rpe: dr.rpe || null, pain: !!dr.pain, note: (dr.note || '').trim().slice(0, 300), sets: sets.slice(0, 16) } });
    ls.del(DRAFT(me.id)); ui.draft = null;
    toast('¡Bien! Sesión guardada', 2800);
    location.hash = '#/fit/progreso';
  };
  const el = h('div', { class: 'page' },
    ui.recovered ? note('Recuperé lo que llevabas anotado de esta sesión.') : null,
    h('p', { style: { margin: 0 } }, 'Anota lo que vas haciendo. Lo que escribas se guarda en este celular hasta que toques «Guardar sesión».'),
    day.items.map(exBlock),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Al terminar'),
      h('div', { class: 'grid' }, field('Fecha', date), field('Minutos', mins)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Qué tan pesada fue la sesión?'), rpeSeg, rpeDesc),
      h('label', { class: 'check' }, pain, h('span', {}, 'Me dolió algo (no son agujetas)')), painNote, field('Nota', text)),
    err,
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', disabled: canSave ? null : true, onclick: save }, ic('check', 18), 'Guardar sesión'),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        if (await confirmSheet({ title: '¿Descartar lo anotado?', text: 'Se borra lo que llevas de esta sesión.', ok: 'Descartar', danger: true })) { ls.del(DRAFT(me.id)); ui.draft = null; location.hash = back; }
      } }, 'Descartar')));
  return { title: `Día ${day.key}`, sub: day.name, back, el };
}

// ---------- progreso ----------
export function progressTab(ctx, me, canEdit) {
  const ui = ctx.ui;
  const spec = specOf(me.id);
  const body = fitLogsOf(me.id, 'body'), gym = fitLogsOf(me.id, 'gym'), steps = fitLogsOf(me.id, 'steps');
  // Peso: promedio de cada semana (un día suelto engaña: agua, sal, comida).
  const avgs = weeklyAverages(body, 12).filter((a) => a.avg != null);
  const wPts = avgs.map((a) => ({ x: a.end, y: r1(a.avg), tip: plural(a.n, 'pesada', 'pesadas') }));
  const rate = weeklyRate(weeklyAverages(body, 3));
  // Medidas: la primera contra la última de cada una.
  const mRows = MEASURES.map(([k, name]) => {
    const xs = body.filter((b) => Number(b.data?.[k]) > 0).sort((a, b) => a.day.localeCompare(b.day));
    if (!xs.length) return null;
    const a = Number(xs[0].data[k]), z = Number(xs[xs.length - 1].data[k]), d = r1(z - a);
    return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, name), h('span', { class: 'row-sub' }, `${z} cm el ${fmtDate(xs[xs.length - 1].day, { day: 'numeric', month: 'short' })}`)),
      xs.length > 1 ? h('span', { class: `chip ${d === 0 ? '' : 'info'}` }, `${d > 0 ? '+' : ''}${d} cm desde el ${fmtDate(xs[0].day, { day: 'numeric', month: 'short' })}`) : null);
  }).filter(Boolean);
  // Pasos: últimos 14 días.
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i - 13)).map((d) => ({ d, n: Number(steps.find((s) => s.day === d)?.data?.n) || 0 }));
  const maxN = Math.max(spec.stepsGoal, ...last14.map((x) => x.n));
  const with7 = last14.slice(7).filter((x) => x.n > 0);
  // Gym: avance por ejercicio.
  const seen = new Map();
  for (const l of [...gym].reverse()) for (const e of l.data?.sets || []) { if (!seen.has(e.ex)) seen.set(e.ex, []); seen.get(e.ex).push({ l, e }); }
  const exIds = [...seen.keys()].filter((id) => seen.get(id).length >= 2 && FIT_BY_ID[id]).sort((a, b) => Number(FIT_BY_ID[b].unit === 'kg') - Number(FIT_BY_ID[a].unit === 'kg'));
  ui.ex = exIds.includes(ui.ex) ? ui.ex : exIds[0];
  let exChart = null;
  if (ui.ex) {
    const ex = FIT_BY_ID[ui.ex], useKg = ex.unit === 'kg';
    const pts = seen.get(ui.ex).map(({ l, e }) => ({ x: l.day, y: Math.max(...(e.s || []).map((x) => Number(useKg ? x[0] : x[1]) || 0)), tip: `Día ${l.data?.key || ''}` })).filter((p) => p.y > 0);
    const pick = h('select', { 'aria-label': 'Ejercicio' }, options(exIds.map((id) => [id, fitName(id)]), ui.ex));
    pick.addEventListener('change', () => { ui.ex = pick.value; ctx.rerender(); });
    exChart = h('div', { class: 'stack' }, pick, pts.length >= 2 ? lineChart(pts, { unit: useKg ? 'kg' : 'reps', label: ex.name, digits: useKg ? 1 : 0 }) : null);
  }
  // Agregar medidas (un registro por día, junto con el peso si lo hay).
  const mIns = MEASURES.map(([k, name]) => [k, h('input', { type: 'number', inputmode: 'decimal', min: 20, max: 250, step: 0.1, 'aria-label': `${name} en cm`, placeholder: 'cm' })]);
  const saveM = () => {
    const data = {};
    for (const [k, inp] of mIns) { if (inp.value === '') continue; const v = num(inp.value); if (v == null || v < 20 || v > 250) { toast('Revisa las medidas (20 a 250 cm)'); return; } data[k] = r1(v); }
    if (!Object.keys(data).length) { toast('Escribe al menos una medida'); return; }
    upsertDay(me.id, 'body', todayStr(), data); toast('Medidas guardadas'); ctx.rerender();
  };
  const del = async (l, what) => { if (await confirmSheet({ title: `¿Borrar ${what}?`, ok: 'Borrar', danger: true })) { remove('fitLogs', l.id); toast('Borrado'); } };
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' }, h('h3', {}, 'Peso (promedio de cada semana)'),
      wPts.length >= 2 ? lineChart(wPts, { unit: 'kg', label: 'Peso promedio semanal', digits: 1, bestLabel: 'Más alto' }) : note('Pésate 3 o más mañanas por semana: con 2 semanas aparece tu gráfica.'),
      note(rateText(spec.goal, rate)),
      body.filter((b) => b.data?.kg).length ? h('details', {}, h('summary', {}, 'Tus pesadas'), h('div', { class: 'rows' }, body.filter((b) => b.data?.kg).slice(0, 21).map((b) =>
        h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, `${b.data.kg} kg`), h('span', { class: 'row-sub' }, longDay(b.day))),
          canEdit ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Borrar este registro', onclick: () => del(b, 'este registro') }, ic('trash-2', 18)) : null)))) : null),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Medidas'),
      mRows.length ? h('div', { class: 'rows' }, mRows) : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Todavía no hay medidas.'),
      canEdit ? h('details', {}, h('summary', {}, 'Agregar medidas de hoy'),
        h('div', { class: 'grid' }, mIns.map(([k, inp]) => field(MEASURES.find((m) => m[0] === k)[1], inp, MEASURES.find((m) => m[0] === k)[2]))),
        h('ul', { class: 'plain' }, MEASURE_TIPS.map((x) => h('li', {}, x))),
        h('button', { type: 'button', class: 'btn primary', onclick: saveM }, 'Guardar medidas')) : null),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Pasos'),
      h('div', { class: 'fit-steps', role: 'img', 'aria-label': `Pasos de los últimos 14 días: ${last14.map((x) => x.n).join(', ')}` }, last14.map((x) => h('span', { class: x.n >= spec.stepsGoal ? 'ok' : '', title: `${fmtDate(x.d, { day: 'numeric', month: 'short' })}: ${x.n}` },
        h('i', { style: { height: `${Math.round((x.n / maxN) * 100)}%` } }), h('b', {}, fmtDate(x.d, { day: 'numeric' }))))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, with7.length ? `Promedio de los últimos 7 días: ${Math.round(with7.reduce((a, x) => a + x.n, 0) / with7.length).toLocaleString('es-MX')} (meta ${spec.stepsGoal.toLocaleString('es-MX')}).` : 'Anota tus pasos en «Hoy».'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, STEP_NOTE)),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Gym'),
      exChart || note('Registra un ejercicio dos veces para ver tu avance.'),
      gym.length ? h('div', { class: 'rows' }, gym.slice(0, 20).map((l) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, `Día ${l.data?.key || '?'}${l.data?.name ? `: ${l.data.name}` : ''}`),
          h('span', { class: 'row-sub' }, [longDay(l.day), l.data?.minutes ? `${l.data.minutes} min` : null, l.data?.rpe ? `esfuerzo ${l.data.rpe}` : null, plural((l.data?.sets || []).length, 'ejercicio', 'ejercicios')].filter(Boolean).join(' · '))),
        l.data?.pain ? h('span', { class: 'chip warn' }, 'Molestia') : null,
        canEdit ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Borrar esta sesión', onclick: () => del(l, 'esta sesión') }, ic('trash-2', 18)) : null))) : null));
}

// ---------- mi perfil Fit ----------
function profileForm(me, spec, onSave, label = 'Guardar') {
  const goal = h('select', {}, options(Object.entries(FIT_GOALS).map(([k, g]) => [k, g.name]), spec.goal));
  const goalDesc = h('span', { class: 'hint' }, FIT_GOALS[spec.goal].desc); goal.addEventListener('change', () => { goalDesc.textContent = FIT_GOALS[goal.value].desc; });
  const exp = h('select', {}, options(Object.entries(FIT_EXP).map(([k, e]) => [k, `${e.name}: ${e.desc}`]), spec.exp));
  const days = h('select', {}, options([2, 3, 4, 5, 6].map((n) => [n, `${n} días: ${splitName(n).toLowerCase()}`]), spec.days));
  const mins = h('select', {}, options(FIT_MINUTES.map((n) => [n, `${n} min`]), spec.minutes));
  const place = h('select', {}, options(Object.entries(PLACES).map(([k, p]) => [k, `${p.name}: ${p.desc}`]), spec.place));
  const vb = vbOf(me, spec);
  const auto = h('input', { type: 'checkbox', checked: spec.vbAuto ? true : null });
  const vbDays = h('input', { type: 'number', min: 0, max: 7, inputmode: 'numeric', value: spec.vbDays, 'aria-label': 'Días de voleibol por semana' });
  const vbBox = h('div', { class: 'field' }, h('span', { class: 'label' }, 'Días de voleibol por semana (a mano)'), vbDays);
  const paintVb = () => { vbBox.hidden = auto.checked; }; auto.addEventListener('change', paintVb); paintVb();
  const stepsGoal = h('input', { type: 'number', min: 3000, max: 20000, step: 500, inputmode: 'numeric', value: spec.stepsGoal });
  return h('section', { class: 'panel stack' },
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Objetivo'), goal, goalDesc),
    field('Experiencia con pesas', exp),
    h('div', { class: 'grid' }, field('Días de gym por semana', days), field('Minutos por sesión', mins)),
    field('Dónde entrenas', place),
    h('label', { class: 'check' }, auto, h('span', {}, `Tomar mi voleibol de Remate: ${vb.auto.days} ${vb.auto.days === 1 ? 'día' : 'días'} por semana `, h('span', { class: 'row-sub' }, vb.auto.from === 'equipo' ? '(los días de entrenamiento de tu equipo)' : `(en las últimas 4 semanas: ${vb.auto.train} entrenos y ${vb.auto.games} partidos)`))),
    vbBox,
    field('Meta de pasos al día', stepsGoal, 'Entre 8,000 y 10,000 es una buena meta para adultos menores de 60 años.'),
    h('button', { type: 'button', class: 'btn primary', onclick: () => {
      const v = Number(vbDays.value), st = Number(stepsGoal.value);
      if (!auto.checked && !(v >= 0 && v <= 7)) { toast('Los días de voleibol van de 0 a 7'); return; }
      if (!(st >= 3000 && st <= 20000)) { toast('La meta de pasos va de 3,000 a 20,000'); return; }
      onSave({ goal: goal.value, exp: exp.value, days: Number(days.value), minutes: Number(mins.value), place: place.value, vbAuto: auto.checked, vbDays: Math.round(v) || 0, stepsGoal: Math.round(st) });
    } }, ic('check', 18), label));
}
function profileTab(ctx, me, canEdit) {
  const prof = profOf(me.id), spec = specOf(me.id);
  if (!canEdit) return h('div', { class: 'stack' }, note('Vista del entrenador: solo lectura.'));
  const share = h('input', { type: 'checkbox', checked: prof?.share ? true : null, onchange: (e) => { saveProf(me.id, {}, { share: e.target.checked }); toast(e.target.checked ? 'Ahora tu entrenador ve tu Remate Fit' : 'Tu Remate Fit vuelve a ser privado'); } });
  const isCoach = state.role === 'coach';
  return h('div', { class: 'stack' },
    profileForm(me, spec, (data) => { saveProf(me.id, data); toast('Guardado: tu rutina se actualizó'); location.hash = '#/fit/rutina'; }),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Bloque de 6 semanas'),
      h('p', { style: { margin: 0 } }, spec.since ? `Empezaste el ${longDay(spec.since)}. La semana 6 de cada bloque es de descarga.` : 'Todavía no empiezas un bloque.'),
      h('button', { type: 'button', class: 'btn', onclick: () => { saveProf(me.id, { since: todayStr() }); toast('Bloque nuevo desde hoy'); } }, ic('refresh-cw', 18), 'Empezar un bloque nuevo hoy')),
    isCoach ? null : h('section', { class: 'panel stack' }, h('h3', {}, 'Privacidad'),
      h('label', { class: 'check' }, share, h('span', {}, h('strong', {}, 'Compartir con mi entrenador'), h('br'), h('span', { class: 'row-sub' }, 'Ve tu rutina, tus sesiones, tu plan de comida y un resumen de lo que registras, tu peso, tus medidas y tus pasos. No puede cambiar nada. Lo apagas cuando quieras.'))),
      privacyNote()),
    sourcesPanel());
}

// ---------- entrenador ----------
function coachView(ctx) {
  if (ctx.args[0] === 'adulto') return sharedView(ctx);
  const s311 = sql311Ready();
  const me = myPlayer();
  const all = players();
  const active = all.filter((p) => fitOk(p) && p.id !== me?.id);
  const adults = all.filter((p) => isAdult(p) && !p.fit && p.id !== me?.id);
  const noDate = all.filter((p) => !p.birth_date && p.id !== me?.id).length;
  const toggle = async (p, on) => {
    if (on && !(await confirmSheet({ title: `¿Activar Remate Fit para ${p.name}?`, text: `${p.name} tiene ${ageFrom(p.birth_date)} años. Le aparece en su Inicio: gym de adultos, comida y recetas, peso, medidas y pasos. Lo que registre es suyo; tú lo ves solo si lo comparte.`, ok: 'Activar' }))) return;
    patch('players', p.id, { fit: on }); toast(on ? `Remate Fit activado para ${p.name}` : `Remate Fit desactivado para ${p.name}`);
  };
  const mine = me && fitOk(me)
    ? h('a', { class: 'labcard', href: '#/fit', onclick: (e) => { e.preventDefault(); enterSelf(me.id); setTimeout(() => { location.hash = '#/fit'; }, 0); } },
      h('span', { class: 'lc-ic' }, ic('dumbbell', 26)), h('span', { class: 'lc-t' }, h('strong', {}, 'Mi Remate Fit'), h('span', {}, 'Entra con tu perfil de jugador: tu rutina, tu comida, tus cargas, tu peso y tus pasos.')), ic('chevron-right', 20))
    : note(me ? 'Para usar Remate Fit tú: en Más → Mi perfil de jugador → Editar mis datos, pon tu fecha de nacimiento y activa «Remate Fit».' : 'Para usar Remate Fit tú: crea tu perfil de jugador (Más → Mi perfil de jugador) con tu fecha de nacimiento y activa «Remate Fit».');
  return { title: 'Remate Fit', sub: 'Zona de adultos', back: '#/mas', el: h('div', { class: 'page fit' },
    !s311 ? note('Para usar Remate Fit corre el SQL de la versión 3.11 en Supabase (el último bloque de sql/instalar.sql).', 'warn') : null,
    h('p', { style: { margin: 0 } }, 'Gym de adultos, comida y recetas, peso, medidas y pasos. Solo para mayores de 18 que tú actives. Lo de cada adulto es suyo: lo ves solo si te lo comparte.'),
    mine,
    sectionTitle('Adultos con Remate Fit'),
    active.length ? h('div', { class: 'rows' }, active.map((p) => {
      const sh = profOf(p.id)?.share;
      return h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, `${ageFrom(p.birth_date)} años · ${sh ? 'te comparte su progreso' : 'privado'}`)),
        sh ? h('a', { class: 'btn sm', href: `#/fit/adulto/${p.id}` }, 'Ver') : null,
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => toggle(p, false) }, 'Quitar'));
    })) : h('p', { class: 'row-sub' }, 'Nadie todavía.'),
    adults.length ? [sectionTitle('Mayores de 18 sin Remate Fit'), h('div', { class: 'rows' }, adults.map((p) => h('div', { class: 'row' }, jersey(p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, `${ageFrom(p.birth_date)} años`)),
      h('button', { type: 'button', class: 'btn sm', disabled: s311 ? null : true, onclick: () => toggle(p, true) }, 'Activar'))))] : null,
    noDate ? note(`${plural(noDate, 'jugador no tiene', 'jugadores no tienen')} fecha de nacimiento. Agrégala en su ficha (Editar): sin fecha no se puede activar Remate Fit.`) : null,
    note('Nadie menor de 18 puede entrar, aunque se intente: la nube lo revisa con la fecha de nacimiento y lo apaga solo si la cambias.'),
    sourcesPanel()) };
}
function sharedView(ctx) {
  const p = players().find((x) => x.id === ctx.args[1]);
  const back = '#/fit';
  if (!p || !profOf(p.id)?.share) return { title: 'Remate Fit', back, el: h('div', { class: 'page' }, note('Este adulto no comparte su Remate Fit contigo.')) };
  const { spec, vb, r } = routineOf(p);
  return { title: p.name, sub: 'Remate Fit (compartido)', back, el: h('div', { class: 'page fit' },
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, FIT_GOALS[spec.goal].name), h('span', { class: 'chip' }, `${ageFrom(p.birth_date)} años`)),
      h('p', { class: 'row-sub', style: { margin: 0 } }, [splitName(spec.days), `${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name, `${vb.days} días de voleibol`].join(' · ')),
      h('ul', { class: 'plain' }, r.days.map((d) => h('li', {}, `Día ${d.key}, ${d.name}: ${d.items.map((x) => fitName(x.ex)).join(', ')}`)))),
    foodShared(p),
    note('Solo lectura: no puedes cambiar su rutina ni sus registros.'),
    progressTab(ctx, p, false)) };
}

// Tarjeta para el Inicio de un adulto con Remate Fit.
export function fitCard(me, ctx) {
  if (!me || !fitOk(me) || !sql311Ready() || (ctx?.readonly && !profOf(me.id)?.share)) return null;
  const has = !!profOf(me.id);
  let line = 'Gym de adultos, comida, peso, medidas y pasos.';
  if (has) { const { r } = routineOf(me); const d = nextKey(me.id, r); line = `Siguiente: día ${d.key}, ${d.name} (≈ ${d.min} min).`; }
  return h('a', { class: 'labcard fit-card', href: '#/fit' }, h('span', { class: 'lc-ic' }, ic('dumbbell', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, 'Remate Fit'), h('span', {}, has ? line : 'Tu zona de adultos: arma tu rutina en 1 minuto.')), ic('chevron-right', 20));
}
