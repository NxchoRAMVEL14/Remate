// Remate Fit (v3.11, nutrición en v3.12): la zona de adultos dentro de Remate. Solo la ven mayores de 18 que el entrenador activa
// (y el entrenador con su propio perfil de jugador). Gym de adultos, comida, peso, medidas y pasos.
// Lo de cada adulto es suyo: el entrenador lo ve solo si ese adulto activa «Compartir con mi entrenador».
import { h, ic, toast, confirmSheet, openSheet, fmtDate, todayStr, addDays, plural } from '../util.js';
import { lazyFig } from '../figura.js';
import { figFor } from '../content/movimientos.js';
import { state, add, patch, remove, players, settings, sql311Ready, ls, myPlayer } from '../store.js';
import { fitOk, isAdult, ageFrom } from '../calc.js';
import { num } from '../lab-calc.js';
import { FIT_BY_ID, fitName, PLACES, FIT_GOALS, FIT_EXP, FIT_MINUTES, normFit, buildFit, nextFitStep, fitWeek, weeklyAverages, weeklyRate, rateText,
  MEASURES, MEASURE_TIPS, STEP_NOTE, vbFromRemate, FIT_SOURCES, MUSCLES, VOLUME_TARGET, ROLE, NEED, TIER, splitName, ALL_EX, fitDefaultRx, cleanFitCustom,
  registerOwn, cleanOwn, OWN_MUS, rampOf, applyRamp, e1rm, dayMinutes, fitAvailable } from '../content/fit.js';
import { TEMPLATES, proposeDay, musOf, MUS_BY } from '../content/musculos.js';
import { WD_NAMES } from './rutina-editor.js';
import { editorPage, pickExercise } from './rutina-editor.js';
import { CARDIO_TYPES } from './fit-bascula.js';
import { readShotSheet, entryForm, dailyReminderSheet, dayPicker, dayWord, activitySheet } from './fit-bascula.js';
import { chartsTab } from './fit-graficas.js';
const FIT_LIB = { list: ALL_EX, byId: FIT_BY_ID };
import { WARMUP, COOLDOWN } from '../content/gym.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { lineChart } from './chart.js';
import { enterSelf } from './mas.js';
import { foodTab, recipePage, foodSummary, foodShared } from './fit-comida.js';
import { shareSheet, shareBtn, packRoutine, unpackRoutine, routineLink, routineText, firstName } from './compartir.js';

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
// v3.16: actividad del día (pasos, puntos cardio, minutos de cardio). null = quitar ese dato; si no queda nada, se borra el día.
export function saveActivity(pid, day, d) {
  const ex = fitLogsOf(pid, 'steps').find((l) => l.day === day);
  const data = { ...(ex?.data || {}) };
  for (const [k, v] of Object.entries(d)) { if (v == null) delete data[k]; else data[k] = v; }
  if (!Object.keys(data).length) { if (ex) remove('fitLogs', ex.id); return; }
  if (ex) patch('fitLogs', ex.id, { data }); else add('fitLogs', { player_id: pid, kind: 'steps', day, data });
}
export const activityOf = (pid, day) => fitLogsOf(pid, 'steps').find((l) => l.day === day)?.data || {};
export const specOf = (pid) => { const d = profOf(pid)?.data; if (d?.myEx) registerOwn(d.myEx); return normFit(d); };
// v3.18: tu semana (voleibol y los entrenos que das) y la biblioteca con lo que más usas y tus ejercicios propios.
export const weekOf = (spec) => ({ vb: (spec.week?.vb || []).filter((x) => x >= 0 && x <= 6), coach: (spec.week?.coach || []).filter((x) => x >= 0 && x <= 6), coachMin: Number(spec.week?.coachMin) || 150 });
const WD_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const wdOfDate = (d) => new Date(`${d}T12:00:00`).getDay();
function recentEx(pid) {
  const n = new Map();
  fitLogsOf(pid, 'gym').slice(0, 40).forEach((l, i) => (l.data?.sets || []).forEach((e) => n.set(e.ex, (n.get(e.ex) || 0) + 1 + (40 - i) / 40)));
  return [...n].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 12);
}
function libFor(me, spec, canEdit = true) {
  return { ...FIT_LIB, list: ALL_EX, recent: recentEx(me.id), defaultRx: (id) => fitDefaultRx(id, spec), addOwn: canEdit ? (name, done) => ownSheet(me, name, done) : null };
}
// «Agregar mi propio ejercicio»: nombre, músculo, con qué y cómo se cuenta.
function ownSheet(me, preset, done) {
  const name = h('input', { type: 'text', maxlength: 50, value: preset || '', placeholder: 'Por ejemplo: Press de pecho Hammer' });
  const mus = h('select', {}, options(Object.entries(OWN_MUS).map(([k, [b]]) => [k, MUS_BY[k]?.name || b]), 'pecho'));
  const need = h('select', {}, options([['maquina', 'Máquina'], ['polea', 'Polea'], ['barra', 'Barra'], ['mancuerna', 'Mancuernas'], ['nada', 'Peso corporal'], ['liga', 'Liga']], 'maquina'));
  const unit = h('select', {}, options([['kg', 'Kilos y repeticiones'], ['reps', 'Solo repeticiones'], ['s', 'Segundos']], 'kg'));
  openSheet({ title: 'Mi propio ejercicio', body: h('div', { class: 'stack' }, field('Nombre', name, 'Como lo conoces en tu gym.'), h('div', { class: 'grid' }, field('Músculo principal', mus), field('Con qué', need)), field('Cómo lo anotas', unit),
    note('Solo existe en tu Remate Fit. Sale con un dibujo genérico y cuenta en tus series por músculo.')),
  actions: [{ label: 'Cancelar' }, { label: 'Agregar', kind: 'primary', onClick: () => {
    const nm = name.value.trim(); if (nm.length < 3) { toast('Escribe el nombre del ejercicio'); return false; }
    const list = cleanOwn(profOf(me.id)?.data?.myEx);
    const same = list.find((x) => x.name.toLowerCase() === nm.toLowerCase());
    const id = same?.id || `u-${Date.now().toString(36)}`;
    if (!same) list.push({ id, name: nm, mus: mus.value, need: need.value, unit: unit.value });
    registerOwn(list); done(id);   // primero se agrega donde estabas; luego se guarda (y la pantalla se vuelve a dibujar)
    saveProf(me.id, { myEx: list }); toast(same ? 'Ya lo tenías' : 'Ejercicio agregado'); return true;
  } }] });
}
export function vbOf(me, spec) {
  const auto = vbFromRemate({ attendance: state.data.attendance || [], sessions: state.data.sessions || [], matchStats: state.data.matchStats || [], matches: state.data.matches || [],
    playerId: me.id, teamDays: (settings().days || []).length });
  return { auto, days: spec.vbAuto ? auto.days : spec.vbDays };
}
function routineOf(me) {
  const spec = specOf(me.id), vb = vbOf(me, spec), r = buildFit(spec, vb.days), wk = fitWeek(spec.since);
  // Semana de descarga (cada 6): una serie menos en todo y sin subir peso.
  if (wk?.light) r.days.forEach((d) => d.items.forEach((rx) => { rx.sets = Math.max(1, rx.sets - 1); }));
  const ramp = rampOf(spec);   // v3.18: regreso gradual
  if (ramp) applyRamp(r.days);
  return { spec, vb, r, wk, ramp };
}
function lastFor(pid, exId, skipId) {
  for (const l of fitLogsOf(pid, 'gym')) { if (l.id === skipId) continue; const e = (l.data?.sets || []).find((x) => x.ex === exId); if (e) return e; }
  return null;
}
// El siguiente día de la rutina (las sesiones libres no cuentan para el orden).
const nextKey = (pid, r) => { const last = fitLogsOf(pid, 'gym').find((l) => l.data?.key !== 'L')?.data?.key; const i = r.days.findIndex((d) => d.key === last); return r.days[i >= 0 ? (i + 1) % r.days.length : 0]; };
// v3.18: si tus días van en días de la semana, lo que toca hoy (o el próximo).
function planToday(pid, r, today = todayStr()) {
  const fixed = r.days.some((d) => Number.isInteger(d.wd));
  if (!fixed) return { fixed, day: nextKey(pid, r) };
  const done = fitLogsOf(pid, 'gym').some((l) => l.day === today && l.data?.key !== 'L');
  const wd = wdOfDate(today), todays = r.days.find((d) => d.wd === wd);
  let next = null, inDays = 0;
  for (let k = 1; k <= 7 && !next; k++) { const x = r.days.find((d) => d.wd === (wd + k) % 7); if (x) { next = x; inDays = k; } }
  return { fixed, today: todays || null, done, next, inDays, day: todays && !done ? todays : next || todays || r.days[0] };
}

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
const FOOD = ['comida', 'menu', 'recetas', 'super'];
const tabKey = (a) => (FOOD.includes(a) ? 'comida' : TABS.some(([k]) => k === a) ? a : 'hoy');
function tabsEl(ctx, base = '#/fit') {
  const cur = tabKey(ctx.args[0]);
  return h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { location.hash = k === 'hoy' ? base : `${base}/${k}`; } }, t)));
}

export default function fit(ctx) {
  if (ctx.args[0] === 'usar') return useFit(ctx);
  if (ctx.role === 'coach') return coachView(ctx);
  const me = ctx.me;
  if (!me) return { title: 'Remate Fit', el: h('div', { class: 'page' }, empty('Sin perfil', 'Entra con tu código para usar Remate Fit.')) };
  if (!sql311Ready()) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, note('Remate Fit todavía no está listo en la nube. Tu entrenador tiene que correr el SQL de la versión 3.11.', 'warn')) };
  if (!fitOk(me)) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, empty('Remate Fit es para adultos', 'Es la zona de gym, peso y nutrición para mayores de 18. La activa tu entrenador en tu ficha.')) };
  // Vista previa del entrenador (no es su propio perfil): solo si ese adulto comparte.
  if (ctx.readonly && !profOf(me.id)?.share) return { title: 'Remate Fit', back: '#/inicio', el: h('div', { class: 'page' }, note(`Remate Fit es privado de ${me.name}. Lo verías aquí solo si activa «Compartir con mi entrenador».`)) };
  if (ctx.args[0] === 'registrar') return logPage(ctx, me);
  if (ctx.args[0] === 'editar') return ctx.readonly ? { title: 'Remate Fit', back: '#/fit/rutina', el: h('div', { class: 'page' }, note('Vista del entrenador: solo lectura.')) } : editRoutine(ctx, me);
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
  const { spec, vb, r, wk, ramp } = routineOf(me);
  const plan = planToday(me.id, r), day = plan.day;
  const today = todayStr();
  const wkx = weekOf(spec), wdToday = wdOfDate(today);
  const dayWords = ['hoy', 'mañana', 'pasado mañana'];
  const head = !plan.fixed ? `Siguiente: día ${day.key}, ${day.name}`
    : plan.today && !plan.done ? `Hoy ${WD_NAMES[wdToday].toLowerCase()}: ${plan.today.name}`
      : plan.next ? `${plan.done ? 'Ya entrenaste hoy. ' : 'Hoy descansas del gym. '}${plan.inDays < 3 ? dayWords[plan.inDays].replace(/^./, (c) => c.toUpperCase()) : `El ${WD_NAMES[plan.next.wd].toLowerCase()}`}: ${plan.next.name}` : `Siguiente: ${day.name}`;
  const todayExtra = [wkx.vb.includes(wdToday) ? 'hoy tienes voleibol' : null, wkx.coach.includes(wdToday) ? 'hoy das entrenamiento' : null].filter(Boolean);
  const lastGym = fitLogsOf(me.id, 'gym')[0]?.day;
  const longPause = !ramp && lastGym && lastGym < addDays(today, -21);
  const weekFrom = addDays(today, -6);
  const gymWeek = fitLogsOf(me.id, 'gym').filter((l) => l.day >= weekFrom).length;
  // v3.16: anotar de cualquier día (hoy, ayer u otro).
  ctx.ui.qday = ctx.ui.qday && ctx.ui.qday <= today ? ctx.ui.qday : today;
  const qday = ctx.ui.qday, qLabel = dayWord(qday), qDe = qLabel.startsWith('el ') ? `del ${qLabel.slice(3)}` : `de ${qLabel}`;
  const steps = fitLogsOf(me.id, 'steps'), stepsToday = steps.find((l) => l.day === qday)?.data?.n;
  const st7 = steps.filter((l) => l.day >= weekFrom && Number(l.data?.n) > 0);
  const stAvg = st7.length ? Math.round(st7.reduce((a, l) => a + Number(l.data.n), 0) / st7.length) : null;
  const body = fitLogsOf(me.id, 'body'), kgToday = body.find((l) => l.day === qday)?.data?.kg;
  const avgs = weeklyAverages(body, 3), rate = weeklyRate(avgs), lastAvg = [...avgs].reverse().find((a) => a.avg != null);

  const stepsIn = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 80000, step: 100, value: stepsToday ?? '', placeholder: 'Pasos', 'aria-label': 'Pasos de hoy' });
  const kgIn = h('input', { type: 'number', inputmode: 'decimal', min: 30, max: 250, step: 0.1, value: kgToday ?? '', placeholder: 'kg', 'aria-label': 'Peso de hoy en kg' });
  const saveSteps = () => { const n = num(stepsIn.value); if (n == null || n < 0 || n > 80000) { toast(`Escribe tus pasos ${qDe} (0 a 80,000)`); return; } saveActivity(me.id, qday, { n: Math.round(n) }); toast(`Pasos ${qDe} guardados`); };
  const saveKg = () => { const kg = num(kgIn.value); if (kg == null || kg < 30 || kg > 250) { toast('Escribe tu peso en kg (30 a 250)'); return; } upsertDay(me.id, 'body', qday, { kg: r1(kg) }); toast(`Peso ${qDe} guardado`); };
  const saveShot = (d) => { const { day, pasos, ...b } = d; if (Object.keys(b).length) upsertDay(me.id, 'body', day, b); if (pasos != null) saveActivity(me.id, day, { n: pasos }); toast('Guardado'); };
  const saveMany = (rows) => { rows.forEach(({ day, ...d }) => saveActivity(me.id, day, d)); toast(`Guardé ${plural(rows.length, 'día', 'días')}`); };
  const existing = (d) => activityOf(me.id, d);
  const daySeg = dayPicker(qday, (d) => { ctx.ui.qday = d; ctx.rerender(); });
  const act = activityOf(me.id, qday), kgQ = body.find((l) => l.day === qday)?.data;
  const already = [act.n != null ? `${Number(act.n).toLocaleString('es-MX')} pasos` : null, act.pc != null ? `${act.pc} pts cardio` : null, act.cmin ? `${act.cmin} min de cardio` : null, kgQ?.kg ? `${kgQ.kg} kg` : null].filter(Boolean);

  return h('div', { class: 'stack' },
    h('section', { class: 'band next fit-band' },
      h('div', { class: 'when' }, [FIT_GOALS[spec.goal].name, wk ? `semana ${wk.week} de 6${wk.light ? ' · descarga' : ''}` : null].filter(Boolean).join(' · ')),
      h('h2', {}, head),
      h('div', {}, `Día ${day.key}: ${plural(day.items.length, 'ejercicio', 'ejercicios')}, ≈ ${day.min} min${day.light ? ' · día ligero de pierna por tu voleibol' : ''}${todayExtra.length ? ` · ${todayExtra.join(' y ')}` : ''}`),
      h('div', { class: 'cluster' },
        canEdit ? h('a', { class: 'btn ball', href: `#/fit/registrar/${day.key}` }, ic('check', 18), `Registrar el día ${day.key}`) : null,
        h('a', { class: 'btn', href: '#/fit/rutina' }, ic('dumbbell', 18), 'Ver la rutina'),
        canEdit ? h('a', { class: 'btn', href: '#/fit/registrar/libre' }, ic('plus', 18), 'Sesión libre') : null)),
    wk?.light ? note('Semana de descarga: una serie menos en cada ejercicio y sin subir peso. Te recuperas y luego sigues subiendo.', 'info') : null,
    ramp ? note(`Regreso gradual, semana ${ramp.week} de 2: una serie menos y una repetición más de sobra en cada ejercicio. Así tu cuerpo se readapta sin lastimarte.`, 'info') : null,
    longPause && canEdit ? h('div', { class: 'note info stack' }, h('span', {}, `Tu última sesión fue el ${longDay(lastGym)}. Si vienes regresando, activa el regreso gradual: 2 semanas con una serie menos.`),
      h('button', { type: 'button', class: 'btn sm', onclick: () => { saveProf(me.id, { rampSince: today }); toast('Regreso gradual activado por 2 semanas'); } }, 'Activar regreso gradual')) : null,
    plan.fixed ? weekStrip(r, wkx, wdToday) : null,
    h('div', { class: 'kpis fit-kpis' },
      kpi('Gym esta semana', `${gymWeek} de ${r.days.length}`, gymWeek >= r.days.length ? 'ok' : ''),
      kpi('Pasos (promedio 7 días)', stAvg != null ? stAvg.toLocaleString('es-MX') : '—', stAvg != null && stAvg >= spec.stepsGoal ? 'ok' : ''),
      kpi('Peso (promedio semana)', lastAvg ? `${r1(lastAvg.avg)} kg` : '—', ''),
      kpi('Voleibol por semana', `${vb.days} ${vb.days === 1 ? 'día' : 'días'}`, '')),
    rate ? note(rateText(spec.goal, rate)) : null,
    canEdit ? h('section', { class: 'panel stack' }, h('h3', {}, 'Pasos y peso'), daySeg,
      already.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Ya anotaste ${qLabel}: ${already.join(' · ')}.`) : null,
      h('div', { class: 'fit-quick' }, h('label', { class: 'field' }, h('span', { class: 'label' }, `Pasos ${qDe} (meta ${spec.stepsGoal.toLocaleString('es-MX')})`), stepsIn), h('button', { type: 'button', class: 'btn', onclick: saveSteps }, 'Guardar')),
      h('div', { class: 'fit-quick' }, h('label', { class: 'field' }, h('span', { class: 'label' }, `Peso ${qDe} en ayunas (kg)`), kgIn), h('button', { type: 'button', class: 'btn', onclick: saveKg }, 'Guardar')),
      h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => readShotSheet({ onSave: saveShot, day: qday }) }, ic('camera', 16), 'Leer captura de mi báscula'),
        h('button', { type: 'button', class: 'btn sm', onclick: () => readShotSheet({ onSave: saveShot, kind: 'pasos', day: qday, onSaveMany: saveMany, existing }) }, ic('camera', 16), 'Leer captura de pasos'),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => activitySheet({ day: qday, cur: existing, title: 'Cardio y pasos', onSave: (d, data) => { saveActivity(me.id, d, data); toast(`Guardado (${dayWord(d)})`); } }) }, ic('heart-pulse', 16), 'Cardio'),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { const s2 = openSheet({ title: 'Datos de la báscula', body: entryForm({}, (d) => { saveShot(d); s2.close(); }, 'bascula', '', qday) }); } }, ic('plus', 16), 'Grasa y músculo'),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: dailyReminderSheet }, ic('calendar-plus', 16), 'Aviso diario')),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Los pasos los ves en tu reloj o en la app de salud de tu celular. El peso: por la mañana, después del baño y antes de desayunar. Con «Leer captura» tomas captura de pantalla de la app de tu báscula o de tus pasos y Remate lee los números. Con Google Fit en «Semana» se guardan los 7 días de una vez. Para corregir otro día, elige «Otro día» o entra a Progreso.')) : null,
    state.role === 'coach' ? null : note(prof?.share ? 'Compartes tu Remate Fit con tu entrenador: ve tu rutina y tu progreso. Lo cambias en «Perfil».' : 'Tu Remate Fit es privado: tu entrenador no lo ve. Si quieres que te ayude, actívalo en «Perfil».'),
    foodSummary(me, canEdit));
}
const kpi = (label, value, kind) => h('div', { class: `kpi ${kind || ''}` }, h('span', { class: 'n' }, value), h('span', { class: 'l' }, label));
// v3.18: la semana de lunes a domingo: gym, voleibol, entrenos que das y descanso.
const LEG_PATS = new Set(['sq', 'hinge', 'uni', 'glute', 'ham', 'quad']);
const heavyLegs = (d) => d.items.filter((rx) => LEG_PATS.has(rx.pat) && (rx.role === 'main' || rx.role === 'sec')).length >= 2;
function weekStrip(r, wkx, wdToday = null) {
  return h('div', { class: 'fit-week', role: 'list', 'aria-label': 'Tu semana' }, WD_ORDER.map((wd) => {
    const ds = r.days.filter((d) => d.wd === wd);
    const tags = [wkx.vb.includes(wd) ? 'Voleibol' : null, wkx.coach.includes(wd) ? 'Das entreno' : null].filter(Boolean);
    return h('div', { class: `fw-day${wd === wdToday ? ' today' : ''}${ds.length ? ' gym' : ''}`, role: 'listitem' }, h('b', {}, WD_SHORT[wd]),
      ds.length ? ds.map((d) => h('span', {}, `${d.key}: ${d.name}`)) : !tags.length ? h('span', { class: 'fw-rest' }, 'Descanso') : null,
      tags.map((t) => h('small', {}, t)));
  }));
}
function weekWarnings(r, wkx) {
  const out = [];
  for (const d of r.days) {
    if (!Number.isInteger(d.wd) || !heavyLegs(d)) continue;
    const next = (d.wd + 1) % 7;
    if (wkx.vb.includes(next)) out.push(`El ${WD_NAMES[d.wd].toLowerCase()} toca ${d.name.toLowerCase()} y al día siguiente tienes voleibol: hazla más ligera (una serie menos) o cámbiala de día.`);
    if (wkx.vb.includes(d.wd)) out.push(`El ${WD_NAMES[d.wd].toLowerCase()} toca ${d.name.toLowerCase()} el mismo día del voleibol: sepáralos al menos 3 horas, o mejor otro día.`);
  }
  return out;
}

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
      h('div', { class: 'split' }, h('h3', {}, r.custom ? `Personalizada: ${plural(r.days.length, 'día', 'días')}` : splitName(spec.days)), h('span', { class: 'chip ball' }, FIT_GOALS[spec.goal].name)),
      h('p', { class: 'row-sub', style: { margin: 0 } }, [`${spec.days} días`, `${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name, `${vb.days} de voleibol${spec.vbAuto ? ' (de Remate)' : ' (a mano)'}`].join(' · ')),
      wk ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Bloque ${wk.block}, semana ${wk.week} de 6. ${wk.light ? 'Esta es de descarga.' : `La semana 6 es de descarga (termina el ${fmtDate(wk.ends, { day: 'numeric', month: 'short' })}).`}`) : null,
      h('ul', { class: 'plain' }, r.notes.map((x) => h('li', {}, x))),
      r.days.some((d) => Number.isInteger(d.wd)) || weekOf(spec).vb.length || weekOf(spec).coach.length ? weekStrip(r, weekOf(spec), wdOfDate(todayStr())) : null,
      weekWarnings(r, weekOf(spec)).map((x) => note(x, 'warn')),
      canEdit ? h('div', { class: 'cluster' },
        h('a', { class: 'btn sm', href: '#/fit/editar' }, ic('list-checks', 16), r.custom ? 'Editar días y ejercicios' : 'Personalizar'),
        h('a', { class: 'btn sm', href: '#/fit/registrar/libre' }, ic('plus', 16), 'Sesión libre'),
        shareBtn(() => fitShare(me))) : null),
    r.days.map((d) => h('section', { class: 'panel stack gx-day' },
      h('div', { class: 'split' }, h('h3', {}, `${Number.isInteger(d.wd) ? `${WD_NAMES[d.wd]} · ` : ''}Día ${d.key}: ${d.name}`), h('span', { class: 'cluster' }, d.light ? h('span', { class: 'chip info' }, 'Pierna ligera') : null, h('span', { class: 'chip ball' }, `≈ ${d.min} min`))),
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

// ---------- compartir o imprimir (v3.17) ----------
const FIT_WARM = '8 a 10 min: cardio suave, movilidad de tobillo, cadera y espalda, y activación de glúteo y hombro.';
const FIT_COOL = '3 a 5 min caminando y estiramiento suave.';
function fitShare(me) {
  const spec = specOf(me.id), vb = vbOf(me, spec), r = buildFit(spec, vb.days), who = firstName(me);
  const code = packRoutine('fit', { goal: spec.goal, exp: spec.exp, days: spec.days, minutes: spec.minutes, place: spec.place }, r.custom ? r.days.map((d) => ({ name: d.name, wd: d.wd, items: d.items })) : null, who, cleanOwn(spec.myEx));
  shareSheet({ title: 'Compartir o imprimir mi rutina', print: '#/imprimir/fit',
    text: routineText({ title: 'Rutina de Remate Fit', who, summary: [FIT_GOALS[spec.goal].name, r.custom ? `personalizada, ${plural(r.days.length, 'día', 'días')}` : splitName(spec.days), `${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name].join(' · '),
      days: r.days, byId: FIT_BY_ID, warmup: FIT_WARM, cooldown: FIT_COOL, notes: ['Cada 6 semanas, una semana de descarga: una serie menos y sin subir peso.'] }),
    link: routineLink('fit', code), linkText: `Te paso mi rutina de Remate Fit${who ? ` (${who})` : ''}. Ábrela en tu Remate Fit y toca «Usar esta rutina»:` });
}
// Abrir un enlace de rutina de Remate Fit: solo adultos con Remate Fit. Cambia sus respuestas de entrenamiento y sus días.
function useFit(ctx) {
  const code = ctx.args[1] || '', got = unpackRoutine(code, 'fit'), back = '#/fit';
  const wrap = (...kids) => ({ title: 'Rutina', sub: 'Compartida · Remate Fit', back, el: h('div', { class: 'page fit' }, ...kids) });
  if (!got) return wrap(empty('Este enlace no se pudo abrir', 'Puede estar incompleto (a veces WhatsApp corta los enlaces largos). Pide que te lo vuelvan a mandar desde Remate.'));
  if (ctx.role === 'coach') {
    const mine = myPlayer();
    return wrap(note('Las rutinas de Remate Fit se usan desde tu perfil de jugador (Mi Remate Fit).'),
      mine && fitOk(mine) ? h('button', { type: 'button', class: 'btn primary', onclick: () => { const here = location.hash; enterSelf(mine.id); setTimeout(() => { location.hash = here; }, 0); } }, ic('dumbbell', 18), 'Abrirla en Mi Remate Fit')
        : note('Para usar Remate Fit tú: en Más → Mi perfil de jugador pon tu fecha de nacimiento y activa Remate Fit.'));
  }
  const me = ctx.me;
  if (!me || !sql311Ready() || !fitOk(me)) return wrap(empty('Remate Fit es para adultos', 'Esta rutina es de Remate Fit, la zona de gym para mayores de 18 que activa tu entrenador.'));
  if (got.own?.length) registerOwn(got.own);
  const cur = specOf(me.id), spec = normFit({ ...cur, goal: got.s.goal, exp: got.s.exp, days: got.s.days, minutes: got.s.minutes, place: got.s.place, custom: got.custom ? cleanFitCustom(got.custom) : null });
  const vb = vbOf(me, cur), r = buildFit(spec, vb.days);
  const use = async () => {
    if (ctx.readonly) { toast('Vista previa: aquí no se guarda'); return; }
    if (profOf(me.id) && !(await confirmSheet({ title: '¿Usar esta rutina?', text: 'Cambia tu objetivo, experiencia, días, minutos, lugar y tus días y ejercicios por los de esta rutina. Tus registros, tu comida y tu peso no cambian.', ok: 'Usar esta rutina' }))) return;
    const mine = cleanOwn(cur.myEx), add = cleanOwn(got.own).filter((o) => !mine.some((m) => m.id === o.id));
    saveProf(me.id, { goal: spec.goal, exp: spec.exp, days: spec.days, minutes: spec.minutes, place: spec.place, custom: spec.custom?.length ? spec.custom : null, ...(add.length ? { myEx: [...mine, ...add] } : {}), ...(profOf(me.id) ? {} : { since: todayStr() }) });
    toast('Listo: ya es tu rutina'); location.hash = '#/fit/rutina';
  };
  return wrap(
    h('section', { class: 'band next fit-band' }, h('div', { class: 'when' }, 'Rutina compartida'), h('h2', {}, got.who ? `La rutina de ${got.who}` : 'Una rutina de Remate Fit'),
      h('div', {}, [FIT_GOALS[spec.goal].name, r.custom ? `personalizada, ${plural(r.days.length, 'día', 'días')}` : splitName(spec.days), `${spec.minutes} min`, FIT_EXP[spec.exp].name, PLACES[spec.place].name].join(' · ')),
      h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn ball', onclick: use }, ic('check', 18), 'Usar esta rutina'))),
    note(`${r.custom ? 'Es una rutina personalizada: se usa tal cual.' : `Remate la ajusta a tu voleibol (${vb.days} ${vb.days === 1 ? 'día' : 'días'} por semana).`} Revísala: la armó alguien con su objetivo y su experiencia.`),
    r.days.map((d) => h('section', { class: 'panel stack gx-day' }, h('div', { class: 'split' }, h('h3', {}, `${Number.isInteger(d.wd) ? `${WD_NAMES[d.wd]} · ` : ''}Día ${d.key}: ${d.name}`), h('span', { class: 'chip ball' }, `≈ ${d.min} min`)),
      h('div', { class: 'rows' }, d.items.map((rx, i) => exItem(FIT_BY_ID[rx.ex], { rx, n: i + 1 }))))));
}

// ---------- personalizar la rutina (v3.13) ----------
function editRoutine(ctx, me) {
  const spec = specOf(me.id), vb = vbOf(me, spec);
  if (!profOf(me.id)) { location.hash = '#/fit'; return { title: 'Remate Fit', el: h('div') }; }
  const lib = libFor(me, spec);
  const wkx = weekOf(spec);
  const ok = (id) => !!FIT_BY_ID[id] && fitAvailable(FIT_BY_ID[id], spec.place);
  return editorPage(ctx, { title: 'Mi rutina', back: '#/fit/rutina', days: buildFit(spec, vb.days).days, custom: Array.isArray(spec.custom) && spec.custom.length > 0,
    lib, weekdays: true, templates: TEMPLATES,
    muscles: { propose: (keys, exclude) => proposeDay(keys, { ok, rx: (id) => fitDefaultRx(id, spec), minutes: dayMinutes, max: spec.minutes, exclude }) },
    week: (wd) => [wkx.vb.includes(wd) ? 'Voleibol' : null, wkx.coach.includes(wd) ? 'Das entreno' : null].filter(Boolean),
    onSave: (custom) => { const c = cleanFitCustom(custom); saveProf(me.id, { custom: c, days: Math.min(6, Math.max(2, c.length)) }); toast('Rutina guardada'); location.hash = '#/fit/rutina'; },
    onReset: () => { saveProf(me.id, { custom: null }); toast('Volviste a la rutina de Remate'); location.hash = '#/fit/rutina'; } });
}

// ---------- registrar una sesión ----------
const DRAFT = (pid) => `remate.fit.draft.${pid}`;
// v3.18: temporizador de descanso (abajo de la pantalla). Al terminar vibra (Android) y suena.
let restT = null;
function beep() { try { const A = window.AudioContext || window.webkitAudioContext; const a = new A(); [0, 0.35].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2); }); setTimeout(() => a.close?.(), 1200); } catch { /* sin sonido */ } }
export function restTimer(sec, what = '') {
  document.querySelector('.rest-timer')?.remove(); clearInterval(restT);
  let left = Math.max(10, Number(sec) || 60);
  const t = h('strong', { class: 'rt-t', 'aria-live': 'off' }), lbl = h('span', { class: 'rt-l' }, what ? `Descanso · ${what}` : 'Descanso');
  const fmt = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  const box = h('div', { class: 'rest-timer', role: 'timer' }, h('span', { class: 'rt-main' }, lbl, t),
    h('button', { type: 'button', class: 'btn sm', onclick: () => { left += 15; t.textContent = fmt(left); } }, '+15 s'),
    h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Quitar el temporizador', onclick: () => { clearInterval(restT); box.remove(); } }, ic('x', 18)));
  t.textContent = fmt(left);
  document.body.append(box);
  const here = location.hash;
  restT = setInterval(() => {
    if (location.hash !== here) { clearInterval(restT); box.remove(); return; }
    left -= 1; t.textContent = fmt(Math.max(0, left));
    if (left <= 0) { clearInterval(restT); box.classList.add('done'); lbl.textContent = '¡A la siguiente serie!'; try { navigator.vibrate?.([300, 150, 300]); } catch { /* iPhone no vibra */ } beep(); setTimeout(() => box.remove(), 6000); }
  }, 1000);
}
function logPage(ctx, me) {
  const back = '#/fit';
  const { spec, r } = routineOf(me);
  // v3.13: «libre» = lo que hiciste hoy aunque no sea un día de tu rutina.
  const day = ctx.args[1] === 'libre' ? { key: 'L', name: 'Sesión libre', items: [], min: 45 } : r.days.find((d) => d.key === ctx.args[1]);
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
  const rxOf = (entry) => day.items.find((x) => x.ex === entry.ex) || entry.rx || fitDefaultRx(entry.ex, spec);
  const autoRest = ls.get('remate.fit.autorest') !== '0';
  const exBlock = (entry, k) => {
    const rx = rxOf(entry), ex = FIT_BY_ID[entry.ex];
    if (!ex || !rx) return null;
    const last = lastFor(me.id, rx.ex), tip = nextFitStep(rx, last), kgOn = ex.unit === 'kg';
    const sameAsLast = () => { entry.s = last.s.map((x) => [x[0] ?? '', x[1] ?? '']); persist(); paint(); toast('Igual que la vez pasada: ajusta lo que cambie'); };
    // «Me molestó»: alternativas del mismo músculo, mejor en máquina o polea (más guiadas).
    const alts = () => { const have = new Set(dr.entries.map((e) => e.ex)); const ids = [...new Set(musOf(entry.ex).flatMap((m) => MUS_BY[m].ids))]
      .filter((id) => id !== entry.ex && !have.has(id) && FIT_BY_ID[id] && fitAvailable(FIT_BY_ID[id], spec.place));
      return ids.sort((a, b) => Number(['maquina', 'polea'].includes(FIT_BY_ID[b].need)) - Number(['maquina', 'polea'].includes(FIT_BY_ID[a].need))).slice(0, 3); };
    const painBox = h('div', { class: 'stack', hidden: !entry.pain });
    const paintPain = () => { painBox.hidden = !entry.pain; const a = alts();
      painBox.replaceChildren(note('Si duele la articulación (no es cansancio del músculo), no sigas con este ejercicio hoy. Prueba uno parecido que no cargue esa zona o baja el peso y el rango.', 'warn'),
        a.length ? h('div', { class: 'cluster' }, a.map((id) => h('button', { type: 'button', class: 'btn sm', onclick: () => { const r2 = fitDefaultRx(id, spec), l2 = lastFor(me.id, id);
          dr.entries[k] = { ex: id, rx: r2, s: Array.from({ length: r2.sets }, (_, i) => [l2?.s?.[i]?.[0] ?? '', '']) }; persist(); ctx.rerender(); toast(`Cambiado por ${FIT_BY_ID[id].name}`); } }, ic('refresh-cw', 14), FIT_BY_ID[id].name))) : null); };
    paintPain();
    const repsLabel = ex.repsLabel || (ex.unit === 's' ? 'Segundos' : 'Reps');
    const list = h('div', { class: 'gx-sets' });
    const paint = () => list.replaceChildren(...entry.s.map((x, i) => h('div', { class: 'gx-set' }, h('span', { class: 'gx-sn' }, `Serie ${i + 1}`),
      kgOn ? h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'decimal', min: 0, max: 500, step: 0.5, value: x[0] ?? '', 'aria-label': `${ex.name}, serie ${i + 1}: kilos`, oninput: (e) => { x[0] = e.target.value; persist(); } }), h('span', {}, ex.each ? 'kg c/u' : 'kg')) : null,
      h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 600, step: 1, value: x[1] ?? '', placeholder: String(rx.reps).replace(/\s*s$/, ''), 'aria-label': `${ex.name}, serie ${i + 1}: ${repsLabel.toLowerCase()}`, oninput: (e) => { x[1] = e.target.value; persist(); },
        onchange: (e) => { if (autoRest && e.target.value && i < entry.s.length - 1 + (k < dr.entries.length - 1 ? 1 : 0)) restTimer(rx.rest, ex.name); } }), h('span', {}, repsLabel.toLowerCase())))));
    paint();
    const lf = lazyFig(figFor(ex), { size: 'sm' });
    return h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, `${k + 1}. ${ex.name}`), h('span', { class: 'row-sub' }, rxText(rx))),
      last ? h('div', { class: 'split gx-last' }, h('p', { class: 'row-sub', style: { margin: 0 } }, `La vez pasada: ${last.s.map((x) => (x[0] ? `${x[0]} kg × ${x[1]}` : `${x[1]}`)).join(', ')}`),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: sameAsLast }, ic('copy', 14), 'Igual')) : null,
      tip ? note(tip) : null, list,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => { if (entry.s.length >= 8) return; entry.s.push([entry.s[entry.s.length - 1]?.[0] ?? '', '']); persist(); paint(); } }, ic('plus', 16), 'Serie'),
        entry.s.length > 1 ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { entry.s.pop(); persist(); paint(); } }, ic('minus', 16), 'Quitar la última') : null,
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => restTimer(rx.rest, ex.name) }, ic('timer', 16), 'Descanso'),
        h('button', { class: `btn sm ${entry.pain ? 'danger' : 'ghost'}`, type: 'button', 'aria-pressed': entry.pain ? 'true' : 'false', onclick: (e) => { entry.pain = !entry.pain; e.currentTarget.className = `btn sm ${entry.pain ? 'danger' : 'ghost'}`; persist(); paintPain(); } }, ic('triangle-alert', 16), 'Me molestó'),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { dr.entries.splice(k, 1); persist(); ctx.rerender(); } }, ic('x', 16), 'Hoy no lo hice'),
        h('details', { class: 'gx-how', ontoggle: lf.ontoggle }, h('summary', {}, '¿Cómo se hace?'), lf.slot, h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))))),
      painBox);
  };
  const addEx = () => pickExercise({ lib: libFor(me, spec, canSave), exclude: dr.entries.map((e) => e.ex), title: 'Agregar a esta sesión', onPick: (id) => {
    const rx = fitDefaultRx(id, spec), last = lastFor(me.id, id);
    dr.entries.push({ ex: id, rx, s: Array.from({ length: rx.sets }, (_, i) => [last?.s?.[i]?.[0] ?? last?.s?.[0]?.[0] ?? '', '']) }); persist(); ctx.rerender();
  } });
  const date = h('input', { type: 'date', min: addDays(todayStr(), -14), max: todayStr(), value: dr.date, oninput: (e) => { dr.date = e.target.value; persist(); } });
  const mins = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 240, value: dr.minutes ?? '', oninput: (e) => { dr.minutes = e.target.value; persist(); } });
  const rpeDesc = h('span', { class: 'hint' }), rpeSeg = h('div', { class: 'seg gx-rpe', role: 'group', 'aria-label': '¿Qué tan pesada fue la sesión?' });
  const paintRpe = () => { rpeSeg.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h('button', { type: 'button', 'aria-pressed': Number(dr.rpe) === n ? 'true' : 'false', title: RPE[n], onclick: () => { dr.rpe = n; persist(); paintRpe(); } }, String(n))));
    rpeDesc.textContent = dr.rpe ? RPE[dr.rpe] : '1 muy fácil, 10 al máximo.'; };
  paintRpe();
  const painNote = note('Si te dolió una articulación (no son agujetas), no sigas con ese ejercicio. Si se repite, consulta a un profesional.', 'warn'); painNote.hidden = !dr.pain;
  const pain = h('input', { type: 'checkbox', checked: dr.pain ? true : null, onchange: (e) => { dr.pain = e.target.checked; painNote.hidden = !dr.pain; persist(); } });
  const text = h('input', { type: 'text', maxlength: 300, value: dr.note || '', placeholder: 'Opcional', oninput: (e) => { dr.note = e.target.value; persist(); } });
  // v3.18: cardio al terminar (caminadora, bici…): se guarda como cardio del día.
  const cmin = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 180, value: dr.cmin ?? '', placeholder: '0', 'aria-label': 'Minutos de cardio al terminar', oninput: (e) => { dr.cmin = e.target.value; persist(); } });
  const ctipo = h('select', { 'aria-label': 'Tipo de cardio', onchange: (e) => { dr.ctipo = e.target.value; persist(); } }, options(CARDIO_TYPES, dr.ctipo || 'caminadora'));
  const autoCb = h('input', { type: 'checkbox', checked: autoRest ? true : null, onchange: (e) => { ls.set('remate.fit.autorest', e.target.checked ? '1' : '0'); toast(e.target.checked ? 'El descanso arranca solo al anotar una serie' : 'Arranca el descanso con su botón'); } });
  const fillAll = () => { let n = 0; for (const e of dr.entries) { const l = lastFor(me.id, e.ex); if (l) { e.s = l.s.map((x) => [x[0] ?? '', x[1] ?? '']); n++; } } persist(); ctx.rerender(); toast(n ? `Llené ${plural(n, 'ejercicio', 'ejercicios')} como la vez pasada` : 'Todavía no hay una vez pasada'); };
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
      if (rows.length) sets.push({ ex: e.ex, s: rows.slice(0, 8), ...(e.pain ? { pain: true } : {}) });
    }
    if (!sets.length) return fail('Anota por lo menos una serie.');
    const m = dr.minutes === '' || dr.minutes == null ? null : Math.round(Number(dr.minutes));
    if (m != null && !(m >= 1 && m <= 240)) return fail('Los minutos deben estar entre 1 y 240.');
    const cm = dr.cmin === '' || dr.cmin == null ? 0 : Math.round(Number(dr.cmin));
    if (!(cm >= 0 && cm <= 180)) return fail('El cardio va de 0 a 180 minutos.');
    const when = dr.date || todayStr(), anyPain = !!dr.pain || sets.some((x) => x.pain);
    add('fitLogs', { player_id: me.id, kind: 'gym', day: when, data: { key: day.key, name: day.name, goal: spec.goal, minutes: m, rpe: dr.rpe || null, pain: anyPain, note: (dr.note || '').trim().slice(0, 300), sets: sets.slice(0, 16), ...(cm ? { cardio: { min: cm, tipo: dr.ctipo || 'caminadora' } } : {}) } });
    if (cm) { const a = activityOf(me.id, when); saveActivity(me.id, when, { cmin: (Number(a.cmin) || 0) + cm, ctipo: dr.ctipo || 'caminadora' }); }
    ls.del(DRAFT(me.id)); ui.draft = null;
    toast('¡Bien! Sesión guardada', 2800);
    location.hash = '#/fit/progreso';
  };
  const el = h('div', { class: 'page' },
    ui.recovered ? note('Recuperé lo que llevabas anotado de esta sesión.') : null,
    h('p', { style: { margin: 0 } }, 'Anota lo que vas haciendo. Lo que escribas se guarda en este celular hasta que toques «Guardar sesión».'),
    dr.entries.some((e) => lastFor(me.id, e.ex)) ? h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn sm', onclick: fillAll }, ic('copy', 16), 'Llenar todo como la vez pasada'),
      h('label', { class: 'check' }, autoCb, h('span', {}, 'Descanso automático'))) : h('label', { class: 'check' }, autoCb, h('span', {}, 'Descanso automático al anotar una serie')),
    dr.entries.length ? dr.entries.map(exBlock) : note(day.key === 'L' ? 'Agrega los ejercicios que hiciste hoy: por ejemplo, press de banca y elevaciones laterales.' : 'Quitaste todos los ejercicios: agrega los que hiciste.'),
    canSave ? h('button', { class: 'btn', type: 'button', onclick: addEx }, ic('plus', 18), 'Agregar ejercicio') : null,
    h('section', { class: 'panel stack' }, h('h3', {}, 'Al terminar'),
      h('div', { class: 'grid' }, field('Fecha', date), field('Minutos de fuerza', mins)),
      h('div', { class: 'grid' }, field('Cardio al terminar (min)', cmin, 'Se suma a tu cardio del día.'), field('Tipo', ctipo)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Qué tan pesada fue la sesión?'), rpeSeg, rpeDesc),
      h('label', { class: 'check' }, pain, h('span', {}, 'Me dolió algo (no son agujetas)')), painNote, field('Nota', text)),
    err,
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', disabled: canSave ? null : true, onclick: save }, ic('check', 18), 'Guardar sesión'),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        if (await confirmSheet({ title: '¿Descartar lo anotado?', text: 'Se borra lo que llevas de esta sesión.', ok: 'Descartar', danger: true })) { ls.del(DRAFT(me.id)); ui.draft = null; location.hash = back; }
      } }, 'Descartar')));
  return { title: day.key === 'L' ? 'Sesión libre' : `Día ${day.key}`, sub: day.key === 'L' ? 'Lo que hiciste hoy' : day.name, back, el };
}

// ---------- progreso ----------
export function progressTab(ctx, me, canEdit) {
  const ui = ctx.ui;
  const spec = specOf(me.id);
  const body = fitLogsOf(me.id, 'body'), gym = fitLogsOf(me.id, 'gym');
  const rate = weeklyRate(weeklyAverages(body, 3));
  // Medidas: la primera contra la última de cada una.
  const mRows = MEASURES.map(([k, name]) => {
    const xs = body.filter((b) => Number(b.data?.[k]) > 0).sort((a, b) => a.day.localeCompare(b.day));
    if (!xs.length) return null;
    const a = Number(xs[0].data[k]), z = Number(xs[xs.length - 1].data[k]), d = r1(z - a);
    return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, name), h('span', { class: 'row-sub' }, `${z} cm el ${fmtDate(xs[xs.length - 1].day, { day: 'numeric', month: 'short' })}`)),
      xs.length > 1 ? h('span', { class: `chip ${d === 0 ? '' : 'info'}` }, `${d > 0 ? '+' : ''}${d} cm desde el ${fmtDate(xs[0].day, { day: 'numeric', month: 'short' })}`) : null);
  }).filter(Boolean);
  // Gym: avance por ejercicio (todo el historial).
  const seen = new Map();
  for (const l of [...gym].reverse()) for (const e of l.data?.sets || []) { if (!seen.has(e.ex)) seen.set(e.ex, []); seen.get(e.ex).push({ l, e }); }
  const exIds = [...seen.keys()].filter((id) => seen.get(id).length >= 2 && FIT_BY_ID[id]).sort((a, b) => Number(FIT_BY_ID[b].unit === 'kg') - Number(FIT_BY_ID[a].unit === 'kg'));
  ui.ex = exIds.includes(ui.ex) ? ui.ex : exIds[0];
  let exChart = null;
  if (ui.ex) {
    const ex = FIT_BY_ID[ui.ex], useKg = ex.unit === 'kg', est = useKg && ui.e1 !== false;
    const pts = seen.get(ui.ex).map(({ l, e }) => ({ x: l.day, y: est ? Math.max(...(e.s || []).map((x) => e1rm(Number(x[0]) || 0, Number(x[1]) || 0))) : Math.max(...(e.s || []).map((x) => Number(useKg ? x[0] : x[1]) || 0)),
      tip: `${l.data?.key === 'L' ? 'Sesión libre' : `Día ${l.data?.key || ''}`}${est ? ` · ${(e.s || []).map((x) => `${x[0]}×${x[1]}`).join(', ')}` : ''}` })).filter((p) => p.y > 0);
    const pick = h('select', { 'aria-label': 'Ejercicio' }, options(exIds.map((id) => [id, fitName(id)]), ui.ex));
    pick.addEventListener('change', () => { ui.ex = pick.value; ctx.rerender(); });
    const seg = useKg ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Qué ver' }, [[true, 'Máximo estimado'], [false, 'Peso más alto']].map(([v, t]) => h('button', { type: 'button', 'aria-pressed': est === v ? 'true' : 'false', onclick: () => { ui.e1 = v; ctx.rerender(); } }, t))) : null;
    exChart = h('div', { class: 'stack' }, pick, seg, pts.length >= 2 ? lineChart(pts, { unit: useKg ? 'kg' : 'reps', label: est ? `${ex.name}, máximo estimado a 1 repetición` : ex.name, digits: useKg ? 1 : 0, bestLabel: 'Récord' }) : null,
      est ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Máximo estimado a 1 repetición: lo que podrías levantar una sola vez, calculado con tu peso y tus repeticiones (fórmula de Epley). Es aproximado; más confiable con series de 10 repeticiones o menos. No hace falta probarlo.') : null);
  }
  // v3.18: récords por ejercicio (peso más alto y máximo estimado).
  const recs = [...seen.entries()].filter(([id]) => FIT_BY_ID[id]?.unit === 'kg').map(([id, xs]) => {
    let best = null, top = null;
    for (const { l, e } of xs) for (const [kg, reps] of e.s || []) {
      const k = Number(kg) || 0, r = Number(reps) || 0; if (!k || !r) continue;
      const v = e1rm(k, r);
      if (!best || v > best.v) best = { v, kg: k, reps: r, day: l.day };
      if (!top || k > top.kg || (k === top.kg && r > top.reps)) top = { kg: k, reps: r, day: l.day };
    }
    return best ? { id, best, top } : null;
  }).filter(Boolean).sort((a, b) => b.best.day.localeCompare(a.best.day));
  const recSec = recs.length ? h('details', {}, h('summary', {}, `Tus récords (${recs.length})`), h('div', { class: 'rows' }, recs.slice(0, 40).map((x) => h('div', { class: 'row' },
    h('span', { class: 'row-main' }, h('strong', {}, fitName(x.id)), h('span', { class: 'row-sub' }, `Más pesado: ${x.top.kg} kg × ${x.top.reps} (${fmtDate(x.top.day, { day: 'numeric', month: 'short' })}) · máximo estimado ${x.best.v} kg`)),
    x.best.day >= addDays(todayStr(), -7) ? h('span', { class: 'chip ok' }, 'Nuevo') : null)))) : null;
  // Agregar medidas (un registro por día, junto con el peso si lo hay).
  const mIns = MEASURES.map(([k, name]) => [k, h('input', { type: 'number', inputmode: 'decimal', min: 20, max: 250, step: 0.1, 'aria-label': `${name} en cm`, placeholder: 'cm' })]);
  const saveM = () => {
    const data = {};
    for (const [k, inp] of mIns) { if (inp.value === '') continue; const v = num(inp.value); if (v == null || v < 20 || v > 250) { toast('Revisa las medidas (20 a 250 cm)'); return; } data[k] = r1(v); }
    if (!Object.keys(data).length) { toast('Escribe al menos una medida'); return; }
    upsertDay(me.id, 'body', todayStr(), data); toast('Medidas guardadas'); ctx.rerender();
  };
  const del = async (l, what) => { if (await confirmSheet({ title: `¿Borrar ${what}?`, ok: 'Borrar', danger: true })) { remove('fitLogs', l.id); toast('Borrado'); } };
  // v3.16: las gráficas de todo viven en fit-graficas.js; aquí van las listas y los formularios de cada sección.
  return chartsTab(ctx, me, canEdit, {
    weight: [note(rateText(spec.goal, rate)),
      body.filter((b) => b.data?.kg).length ? h('details', {}, h('summary', {}, 'Tus pesadas'), h('div', { class: 'rows' }, body.filter((b) => b.data?.kg).slice(0, 30).map((b) =>
        h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, [`${b.data.kg} kg`, b.data.grasa ? `${b.data.grasa}% grasa` : null, b.data.musculo ? `${b.data.musculo} kg músculo` : b.data.musculoPct ? `${b.data.musculoPct}% músculo` : null].filter(Boolean).join(' · ')), h('span', { class: 'row-sub' }, longDay(b.day))),
          canEdit ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Borrar este registro', onclick: () => del(b, 'este registro') }, ic('trash-2', 18)) : null)))) : null],
    measures: [mRows.length ? h('div', { class: 'rows' }, mRows) : null,
      canEdit ? h('details', {}, h('summary', {}, 'Agregar medidas de hoy'),
        h('div', { class: 'grid' }, mIns.map(([k, inp]) => field(MEASURES.find((m) => m[0] === k)[1], inp, MEASURES.find((m) => m[0] === k)[2]))),
        h('ul', { class: 'plain' }, MEASURE_TIPS.map((x) => h('li', {}, x))),
        h('button', { type: 'button', class: 'btn primary', onclick: saveM }, 'Guardar medidas')) : null],
    gym: [h('h4', {}, 'Avance por ejercicio (todo tu historial)'), exChart || note('Registra un ejercicio dos veces para ver tu avance.'), recSec,
      gym.length ? h('details', {}, h('summary', {}, 'Tus sesiones'), h('div', { class: 'rows' }, gym.slice(0, 30).map((l) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, l.data?.key === 'L' ? 'Sesión libre' : `Día ${l.data?.key || '?'}${l.data?.name ? `: ${l.data.name}` : ''}`),
          h('span', { class: 'row-sub' }, [longDay(l.day), l.data?.minutes ? `${l.data.minutes} min` : null, l.data?.rpe ? `esfuerzo ${l.data.rpe}` : null, plural((l.data?.sets || []).length, 'ejercicio', 'ejercicios')].filter(Boolean).join(' · '))),
        l.data?.pain ? h('span', { class: 'chip warn' }, 'Molestia') : null,
        canEdit ? h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Borrar esta sesión', onclick: () => del(l, 'esta sesión') }, ic('trash-2', 18)) : null)))) : null],
    steps: h('p', { class: 'row-sub', style: { margin: 0 } }, STEP_NOTE),
  });
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
// v3.18: tu semana: días de voleibol, entrenos que das (actividad ligera) y regreso gradual.
function weekPanel(me, spec) {
  const w = weekOf(spec), vb = new Set(w.vb), coach = new Set(w.coach);
  const pick = (set, label) => { const box = h('div', { class: 'cluster', role: 'group', 'aria-label': label });
    const paint = () => box.replaceChildren(...WD_ORDER.map((d) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': set.has(d) ? 'true' : 'false', onclick: () => { if (set.has(d)) set.delete(d); else set.add(d); paint(); } }, WD_SHORT[d])));
    paint(); return box; };
  const cmin = h('input', { type: 'number', min: 30, max: 300, step: 15, inputmode: 'numeric', value: w.coachMin, 'aria-label': 'Minutos de cada entreno que das' });
  const ramp = rampOf(spec);
  const back = h('input', { type: 'checkbox', checked: ramp ? true : null });
  return h('section', { class: 'panel stack' }, h('h3', {}, 'Tu semana'),
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Días que juegas voleibol'), pick(vb, 'Días de voleibol'), h('span', { class: 'hint' }, 'Se marcan en tu semana y Remate te avisa si te toca pierna pesada el día antes.')),
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Días que das entrenamiento (actividad ligera)'), pick(coach, 'Días que das entrenamiento'), h('span', { class: 'hint' }, 'Por ejemplo, si entrenas a un equipo. Cuenta como actividad ligera en tus calorías.')),
    field('Minutos de cada entreno que das', cmin),
    h('label', { class: 'check' }, back, h('span', {}, h('strong', {}, 'Vengo regresando después de una pausa'), h('br'), h('span', { class: 'row-sub' }, ramp ? `Activo hasta el ${fmtDate(addDays(spec.rampSince, 13), { day: 'numeric', month: 'long' })}: una serie menos y una repetición más de sobra.` : 'Las siguientes 2 semanas: una serie menos y una repetición más de sobra en cada ejercicio.'))),
    h('button', { type: 'button', class: 'btn', onclick: () => {
      const m = Math.round(Number(cmin.value)); if (!(m >= 30 && m <= 300)) { toast('Los minutos van de 30 a 300'); return; }
      saveProf(me.id, { week: { vb: [...vb].sort(), coach: [...coach].sort(), coachMin: m }, rampSince: back.checked ? (ramp ? spec.rampSince : todayStr()) : null });
      toast('Tu semana quedó guardada');
    } }, ic('check', 18), 'Guardar mi semana'));
}
function profileTab(ctx, me, canEdit) {
  const prof = profOf(me.id), spec = specOf(me.id);
  if (!canEdit) return h('div', { class: 'stack' }, note('Vista del entrenador: solo lectura.'));
  const share = h('input', { type: 'checkbox', checked: prof?.share ? true : null, onchange: (e) => { saveProf(me.id, {}, { share: e.target.checked }); toast(e.target.checked ? 'Ahora tu entrenador ve tu Remate Fit' : 'Tu Remate Fit vuelve a ser privado'); } });
  const isCoach = state.role === 'coach';
  return h('div', { class: 'stack' },
    Array.isArray(spec.custom) && spec.custom.length ? note('Tu rutina está personalizada: estas respuestas cambian tus calorías, las dosis de los ejercicios nuevos que agregues y tu bloque, pero no tus días ni ejercicios. Para que Remate la vuelva a armar, en Rutina → Editar días y ejercicios → «Volver a la de Remate».') : null,
    profileForm(me, spec, (data) => { saveProf(me.id, data); toast('Guardado: tu rutina se actualizó'); location.hash = '#/fit/rutina'; }),
    weekPanel(me, spec),
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
    h('div', { class: 'cluster' }, h('a', { class: 'btn sm', href: `#/imprimir/fit/${p.id}` }, ic('printer', 16), 'Imprimir su rutina'),
      h('a', { class: 'btn sm', href: `#/imprimir/comida/${p.id}` }, ic('printer', 16), 'Imprimir su plan de comida')),
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
