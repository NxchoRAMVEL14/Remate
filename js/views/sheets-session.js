// Hojas emergentes de sesiones y ejercicios: crear sesión, pasar lista, elegir ejercicio, ejercicio propio.
import { h, ic, openSheet, confirmSheet, toast, todayStr, addDays, parseDate, DAYS, buildICS, download, copyText, plural, fmtDate, googleCalUrl, weeklyRule, nextWeekday } from '../util.js';
import { add, patch, remove, group, settings, players, setAttendance, state, calReady, randomToken, multiTeam, teamName, teamOf } from '../store.js';
import { SKILLS, SKILL_BY_ID } from '../content/skills.js';
import { TEMPLATES, TEMPLATE_BY_ID, planFromTemplate } from '../content/templates.js';
import { allExercises, filterExercises, MATERIAL, KINDS, levelLabel } from '../content/exercises.js';
import { field, options, note, jersey, STATUS_LABEL } from './ui.js';
import { noticeSheet } from './avisos.js';
import { gymCalDefaults, gymCalEvents } from './gym.js';
import { labCalDefaults, labCalEvents } from './lab-salto.js';
import { testsDue, testsEvery } from './pruebas.js';
import { planOf } from './casa.js';
import { CONFIG } from '../../config.js';

// ---------- crear o editar sesión ----------
function nextTrainingDay() {
  const days = settings().days || [];
  for (let i = 0; i < 14; i++) { const d = addDays(todayStr(), i); if (days.includes(parseDate(d).getDay())) return d; }
  return todayStr();
}
export function sessionFormSheet(s = null, onCreated) {
  const st = settings();
  const date = h('input', { type: 'date', value: s?.session_date || nextTrainingDay(), required: true });
  const time = h('input', { type: 'time', value: s?.start_time ? s.start_time.slice(0, 5) : st.start });
  const mins = h('input', { type: 'number', min: 10, max: 300, step: 5, inputmode: 'numeric', value: s?.minutes || st.minutes });
  const title = h('input', { type: 'text', maxlength: 80, value: s?.title || '', placeholder: 'Por ejemplo: Saque y recepción' });
  const tpl = h('select', {}, options([['', 'En blanco (arma tú el plan)'], ...TEMPLATES.map((t) => [t.id, `${t.name}, ${t.minutes} min, niveles ${t.levels[0]} a ${t.levels[1]}`])], ''));
  let lastAuto = '';
  tpl.addEventListener('change', () => {
    const t = TEMPLATE_BY_ID[tpl.value];
    if (t) { mins.value = t.minutes; if (!title.value || title.value === lastAuto) { title.value = t.name; lastAuto = t.name; } }
  });
  return openSheet({
    title: s ? 'Editar entrenamiento' : 'Nuevo entrenamiento',
    body: h('div', { class: 'stack' },
      h('div', { class: 'grid' }, field('Fecha', date), field('Hora', time), field('Duración (min)', mins)),
      field('Título', title), s ? null : field('Plantilla', tpl, 'Puedes cambiar todo después.')),
    actions: [{ label: 'Cancelar' }, { label: s ? 'Guardar' : 'Crear', kind: 'primary', onClick: () => {
      if (!date.value) { toast('Elige una fecha'); return false; }
      const m = Math.min(300, Math.max(10, Number(mins.value) || st.minutes));
      const base = { session_date: date.value, start_time: time.value || null, minutes: m, title: title.value.trim() };
      if (s) {
        const moved = s.published && s.status === 'planeada' && (s.session_date !== base.session_date || (s.start_time || '').slice(0, 5) !== (base.start_time || '').slice(0, 5));
        patch('sessions', s.id, base); toast('Guardado');
        // Si ya lo veían los jugadores y cambió el día o la hora, ofrece avisarles.
        if (moved) setTimeout(async () => {
          const { noticeSheet } = await import('./avisos.js'); const { sessionNotice } = await import('./sesion.js');
          if (await confirmSheet({ title: '¿Avisar del cambio?', text: 'Este entrenamiento ya lo ven tus jugadores. Puedes avisarles en la app, por notificación y por WhatsApp.', ok: 'Avisar' })) noticeSheet(sessionNotice(s, true));
        }, 50);
        return;
      }
      const t = TEMPLATE_BY_ID[tpl.value];
      const ns = add('sessions', { ...base, group_id: group()?.id, focus: t?.focus || [], plan: t ? planFromTemplate(t, base.session_date, settings().warmup_prev !== false) : [], status: 'planeada', published: false });
      toast('Entrenamiento creado'); onCreated?.(ns);
    } }],
  });
}

// ---------- pasar lista ----------
const ATT = [['presente', 'P', 'p'], ['retardo', 'R', 'r'], ['falta', 'F', 'f'], ['justificada', 'J', 'j']];
const marksOf = (s) => state.data.attendance.filter((a) => a.session_id === s.id);

// Regresa un entrenamiento a «Por hacer» y borra su lista (por si se pasó lista por error).
export async function undoDone(s) {
  const marks = marksOf(s);
  const ok = await confirmSheet({ title: '¿Regresar a «Por hacer»?',
    text: `${marks.length ? `Se borra la lista que se pasó (${plural(marks.length, 'marca', 'marcas')}) y deja de contar en la asistencia y los XP. ` : ''}El entrenamiento vuelve a quedar pendiente. Si todavía no quieres que tus jugadores lo vean, después desmarca «Visible para los jugadores».`,
    ok: 'Regresar a Por hacer' });
  if (!ok) return false;
  for (const a of marks) remove('attendance', a.id);
  patch('sessions', s.id, { status: 'planeada' });
  toast('Listo: el entrenamiento está otra vez por hacer', 3200);
  return true;
}

export function attendanceSheet(s) {
  const list = players();
  const mark = (pid) => state.data.attendance.find((a) => a.session_id === s.id && a.player_id === pid)?.status || null;
  const future = s.session_date > todayStr();
  // Un entrenamiento que todavía no llega: primero se confirma, para no dejarlo como hecho por un toque de más.
  let armed = !future || marksOf(s).length > 0;
  const when = fmtDate(s.session_date, { weekday: 'long', day: 'numeric', month: 'long' });
  const guard = armed ? null : h('div', { class: 'note warn stack' },
    h('span', {}, `Este entrenamiento es el ${when}: todavía no llega. Si pasas lista, quedará como hecho y contará en la asistencia de tus jugadores.`),
    h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { armed = true; guard.hidden = true; paint(); } }, 'Pasar lista de todos modos')));
  const futureTip = future && !armed ? null : future ? note(state.role === 'coach' ? `Este entrenamiento es el ${when}. Si la lista fue por error, quita las marcas o, en el entrenamiento, toca «Regresar a Por hacer».` : `Este entrenamiento es el ${when}. Si la lista fue por error, quita las marcas.`, 'warn') : null;
  const counts = h('div', { class: 'cluster' });
  const rows = h('div', { class: 'rows' });
  const bulk = h('button', { class: 'btn sm', type: 'button', onclick: () => { if (!armed) return; for (const p of list) if (!mark(p.id)) set(p.id, 'presente'); } }, ic('check', 16), 'Los que faltan por marcar, presentes');
  function paint() {
    const c = { presente: 0, retardo: 0, falta: 0, justificada: 0, sin: 0 };
    for (const p of list) c[mark(p.id) || 'sin']++;
    bulk.disabled = !armed;
    counts.replaceChildren(...ATT.map(([k]) => h('span', { class: `chip ${{ presente: 'ok', retardo: 'warn', falta: 'bad', justificada: 'info' }[k]}` }, `${STATUS_LABEL[k]} ${c[k]}`)),
      h('span', { class: 'chip' }, `Sin lista ${c.sin}`));
    rows.replaceChildren(...list.map((p) => h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name)),
      h('div', { class: 'att', role: 'group', 'aria-label': `Asistencia de ${p.name}` }, ATT.map(([k, l, c2]) => h('button', {
        type: 'button', class: c2, 'aria-pressed': String(mark(p.id) === k), 'aria-label': STATUS_LABEL[k], title: STATUS_LABEL[k], disabled: armed ? null : true,
        onclick: () => set(p.id, mark(p.id) === k ? null : k) }, l))))));
  }
  function set(pid, st) {
    if (!armed) return;
    setAttendance(s.id, pid, st);
    // Al pasar lista el entrenamiento ya ocurrió: se marca hecho y se publica, para que cada jugador vea su asistencia.
    // (Si la pasa un ayudante, la base de datos lo marca sola; aquí solo se refleja en pantalla.)
    if (st && s.status === 'planeada') { if (state.role === 'coach') patch('sessions', s.id, { status: 'hecha', published: true }); else s.published = true; s.status = 'hecha'; }
    // Si era un entrenamiento que todavía no llega y ya no le queda ninguna marca, vuelve a «Por hacer».
    if (!st && future && s.status === 'hecha' && state.role === 'coach' && !marksOf(s).length) { patch('sessions', s.id, { status: 'planeada' }); toast('Sin lista: el entrenamiento vuelve a estar por hacer', 3200); }
    paint();
  }
  paint();
  return openSheet({
    title: 'Pasar lista',
    body: h('div', { class: 'stack' }, guard, futureTip,
      list.length ? h('div', { class: 'cluster' }, bulk) : null,
      counts, list.length ? rows : note('Primero agrega jugadores.'),
      h('p', { class: 'row-sub' }, 'P presente, R retardo, F falta, J justificada. Toca otra vez para borrar la marca.')),
    actions: [{ label: 'Listo', kind: 'primary' }],
  });
}

// ---------- elegir ejercicio para un bloque ----------
export function pickExerciseSheet(onPick, { skill = '' } = {}) {
  const f = { q: '', skill, level: 0 };
  const list = h('div', { class: 'rows' });
  const q = h('input', { type: 'search', placeholder: 'Buscar ejercicio', 'aria-label': 'Buscar ejercicio' });
  const sk = h('select', { 'aria-label': 'Habilidad' }, options([['', 'Todas las habilidades'], ...SKILLS.map((x) => [x.id, x.name])], skill));
  const lv = h('select', { 'aria-label': 'Nivel' }, options([[0, 'Todos los niveles'], ...[1, 2, 3, 4, 5, 6].map((n) => [n, `Nivel ${n}`])], 0));
  const free = h('input', { type: 'text', maxlength: 60, placeholder: 'Por ejemplo: Charla inicial', 'aria-label': 'Bloque libre' });
  let dlg;
  function paint() {
    f.q = q.value; f.skill = sk.value; f.level = Number(lv.value);
    const res = filterExercises(allExercises(state.data.customEx), f).slice(0, 60);
    list.replaceChildren(...(res.length ? res.map((e) => h('button', { type: 'button', class: 'row', onclick: () => { onPick({ ex: e.id, min: e.min }); dlg.close(); } },
      h('span', { class: 'row-main' }, h('strong', {}, e.name), h('span', { class: 'row-sub' }, `${e.min} min, ${levelLabel(e)}, ${e.skills.map((x) => SKILL_BY_ID[x].name).join(', ')}`)),
      h('span', { class: 'row-end' }, ic('plus', 18)))) : [h('div', { class: 'empty' }, 'Nada coincide con esos filtros.')]));
  }
  [q, sk, lv].forEach((el) => el.addEventListener('input', paint));
  paint();
  dlg = openSheet({
    title: 'Agregar ejercicio',
    body: h('div', { class: 'stack' }, q, h('div', { class: 'grid' }, sk, lv), list,
      h('div', { class: 'field' }, h('label', { for: 'free' }, 'O agrega un bloque libre (sin ejercicio)'), Object.assign(free, { id: 'free' }),
        h('button', { class: 'btn sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => {
          const t = free.value.trim(); if (!t) { toast('Escribe el nombre del bloque'); return; }
          onPick({ ex: null, text: t, min: 5 }); dlg.close();
        } }, 'Agregar bloque libre'))),
    actions: [{ label: 'Cerrar' }],
  });
  return dlg;
}

// ---------- ejercicio propio ----------
export function customExerciseSheet(ex = null, onSaved) {
  const v = ex || { skills: [], levels: [1, 6], min: 10, material: ['balones'], kind: 'tecnica', how: [], cues: [], errors: [] };
  const name = h('input', { type: 'text', maxlength: 80, value: v.name || '' });
  const checks = (items, selected) => items.map(([id, label]) => { const c = h('input', { type: 'checkbox', value: id, checked: selected.includes(id) ? true : null }); return h('label', { class: 'check' }, c, label); });
  const skills = h('div', { class: 'cluster' }, checks(SKILLS.map((s) => [s.id, s.name]), v.skills));
  const mats = h('div', { class: 'cluster' }, checks(Object.entries(MATERIAL), v.material));
  const l0 = h('select', {}, options([1, 2, 3, 4, 5, 6].map((n) => [n, `Nivel ${n}`]), v.levels[0]));
  const l1 = h('select', {}, options([1, 2, 3, 4, 5, 6].map((n) => [n, `Nivel ${n}`]), v.levels[1]));
  const min = h('input', { type: 'number', min: 1, max: 90, value: v.min });
  const kind = h('select', {}, options(Object.entries(KINDS), v.kind));
  const players_ = h('input', { type: 'text', maxlength: 20, value: v.players || '' , placeholder: 'Por ejemplo: 4 a 12' });
  const ta = (val, ph) => h('textarea', { maxlength: 1200, placeholder: ph }, Array.isArray(val) ? val.join('\n') : (val || ''));
  const goal = ta(v.goal, 'Qué se aprende o se logra'), setup = ta(v.setup, 'Cómo se organiza el grupo'), how = ta(v.how, 'Un paso por línea');
  const easier = ta(v.easier, 'Cómo hacerlo más fácil'), harder = ta(v.harder, 'Cómo hacerlo más difícil');
  const cues = ta(v.cues, 'Un punto clave por línea'), errors = ta(v.errors, 'Un error común por línea');
  const measure = ta(v.measure, 'Cómo saber si salió bien'), safety = ta(v.safety, 'Opcional: precauciones');
  const lines = (el) => el.value.split('\n').map((x) => x.trim()).filter(Boolean);
  const picked = (box) => [...box.querySelectorAll('input:checked')].map((i) => i.value);
  return openSheet({
    title: ex ? 'Editar ejercicio' : 'Ejercicio propio',
    body: h('div', { class: 'stack' }, field('Nombre', name), h('div', { class: 'field' }, h('span', { class: 'label' }, 'Habilidades'), skills),
      h('div', { class: 'grid' }, field('Desde', l0), field('Hasta', l1), field('Minutos', min), field('Tipo', kind), field('Jugadores', players_)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Material'), mats),
      field('Objetivo', goal), field('Organización', setup), field('Cómo se hace', how), field('Más fácil', easier), field('Más difícil', harder),
      field('Puntos clave', cues), field('Errores comunes', errors), field('Cómo medirlo', measure), field('Seguridad', safety)),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const sk = picked(skills);
      if (!name.value.trim()) { toast('Ponle un nombre'); return false; }
      if (!sk.length) { toast('Elige al menos una habilidad'); return false; }
      const a = Number(l0.value), b = Number(l1.value);
      const data = { name: name.value.trim(), skills: sk, levels: [Math.min(a, b), Math.max(a, b)], min: Math.max(1, Number(min.value) || 10), players: players_.value.trim() || '—',
        material: picked(mats), kind: kind.value, goal: goal.value.trim(), setup: setup.value.trim(), how: lines(how), easier: easier.value.trim(), harder: harder.value.trim(),
        cues: lines(cues), errors: lines(errors), measure: measure.value.trim(), safety: safety.value.trim(), diagram: null };
      const row = ex ? patch('customEx', ex.dbId, { data }) : add('customEx', { data });
      toast('Ejercicio guardado'); onSaved?.(row);
    } }],
  });
}


// ---------- calendario en el celular ----------
// Un evento por cosa (entreno, partido, torneo), para el archivo .ics o para Google Calendar.
export function sessionEvent(s, alarm = 60) {
  const st = settings(), team = group()?.name || 'Mi equipo', time = String(s.start_time || st.start || '').slice(0, 5);
  return { uid: `s-${s.id}`, summary: `${s.title || 'Entrenamiento'} · ${team}`, date: s.session_date, time: /^\d\d:\d\d$/.test(time) ? time : null,
    minutes: Number(s.minutes) || Number(st.minutes) || 90, desc: 'Entrenamiento de voleibol. El plan está en Remate.', alarm };
}
export function matchEvent(m) {
  const t = state.data.tournaments.find((x) => x.id === m.tournament_id);
  return { uid: `m-${m.id}`, summary: multiTeam() ? `${teamName(teamOf(m))} vs ${m.rival}` : `Partido contra ${m.rival}`, date: m.match_date, location: m.venue || t?.venue || '', desc: [t ? `Torneo: ${t.name}` : '', m.note || ''].filter(Boolean).join('\n') };
}
export const tourEvent = (t) => ({ uid: `t-${t.id}`, summary: `Torneo: ${t.name}`, date: t.start_date, end: t.end_date, location: t.venue || '', desc: t.note || '' });

// Eventos de los próximos 90 días para quien está usando la app (el entrenador ve todo; jugadores y ayudantes, lo publicado).
export function upcomingEvents(role, me, alarm = 60) {
  const d = state.data, from = todayStr(), to = addDays(from, 90);
  const coach = role === 'coach';
  const ev = [];
  for (const s of d.sessions) {
    if (s.session_date < from || s.session_date > to || s.status === 'cancelada' || (!coach && !s.published)) continue;
    ev.push(sessionEvent(s, alarm));
  }
  for (const m of d.matches) {
    if (m.match_date < from || m.match_date > to || m.status === 'terminado') continue;
    ev.push(matchEvent(m));
  }
  for (const t of d.tournaments) {
    if ((t.end_date || t.start_date) < from || t.start_date > to) continue;
    if (role === 'player' && me && !(t.roster || []).includes(me.id)) continue;   // al jugador, solo los torneos a los que está convocado
    ev.push(tourEvent(t));
  }
  return ev.sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
}

// ---------- Agregar al calendario (v3.7) ----------
const ALARMS = [[0, 'Sin aviso'], [15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [120, '2 horas antes'], [1440, '1 día antes']];
const WEEK = [1, 2, 3, 4, 5, 6, 0];   // de lunes a domingo
const evLine = (e) => `${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}${e.time ? `, ${e.time}` : ''} · ${e.summary}${e.rrule ? ' (cada semana)' : ''}`;
const withAlarm = (list, alarm) => list.map((e) => (e.time ? { ...e, alarm: alarm ? alarm : null } : e));
const fileName = (name) => `remate-${String(name || 'calendario').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${todayStr()}.ics`;
// Días de la semana para algo que se repite (gym, laboratorio, En casa). need = cuántos días exactos.
export function weekPicker(st, need, onChange) {
  const box = h('div', { class: 'stack' });
  const paint = () => box.replaceChildren(
    h('div', { class: 'daypick', role: 'group', 'aria-label': 'Días de la semana' }, WEEK.map((d) => h('button', { type: 'button', 'aria-pressed': st.days.has(d) ? 'true' : 'false',
      onclick: () => { if (st.days.has(d)) st.days.delete(d); else { if (need && st.days.size >= need) st.days.delete([...st.days][0]); st.days.add(d); } paint(); onChange?.(); } }, DAYS[d]))),
    h('div', { class: 'grid' }, field('Hora', h('input', { type: 'time', value: st.time, onchange: (e) => { st.time = e.target.value || st.time; onChange?.(); } })),
      need ? h('p', { class: 'row-sub', style: { margin: 'auto 0 0' } }, st.days.size === need ? `${plural(need, 'día', 'días')} elegidos.` : `Elige ${plural(need, 'día', 'días')} (llevas ${st.days.size}).`) : null));
  paint();
  return box;
}
// Hoja para agregar uno o varios eventos: archivo .ics (iPhone y Android) y, si es uno solo, Google Calendar.
// events: lista o función ({ days, time, alarm }) → lista. weekly: { days, time, need } para elegir días y hora.
export function calItemSheet({ title = 'Agregar al calendario', name, intro, events, weekly = null }) {
  const st = { alarm: 60, days: new Set(weekly?.days || []), time: weekly?.time || '18:00' };
  const preview = h('div', { class: 'stack' }), actions = h('div', { class: 'cluster' });
  const get = () => {
    if (weekly?.need && st.days.size !== weekly.need) return [];
    const list = typeof events === 'function' ? events({ days: [...st.days], time: st.time, alarm: st.alarm || null }) : events;
    return withAlarm(list, st.alarm);
  };
  const paint = () => {
    const ev = get();
    const sorted = ev.slice().sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
    preview.replaceChildren(ev.length ? h('ul', { class: 'plain cal-preview' }, sorted.slice(0, 5).map((e) => h('li', {}, evLine(e))), ev.length > 5 ? h('li', { class: 'row-sub' }, `y ${plural(ev.length - 5, 'evento más', 'eventos más')}`) : null)
      : h('p', { class: 'row-sub', style: { margin: 0 } }, weekly ? 'Elige los días para ver cómo queda.' : 'No hay nada que agregar.'));
    actions.replaceChildren(...[
      h('button', { class: 'btn primary', type: 'button', disabled: ev.length ? null : true, onclick: () => { download(fileName(name || title), buildICS(get(), `Remate · ${name || title}`), 'text/calendar;charset=utf-8'); toast('Listo: abre el archivo para agregarlo'); } }, ic('calendar-plus', 18), 'Agregar (archivo .ics)'),
      ev.length === 1 ? h('a', { class: 'btn', href: googleCalUrl(ev[0]), target: '_blank', rel: 'noopener' }, 'Google Calendar') : null].filter(Boolean));
  };
  const hasTime = weekly || (Array.isArray(events) ? events.some((e) => e.time) : true);
  const alarmSel = h('select', { onchange: (e) => { st.alarm = Number(e.target.value); paint(); } }, options(ALARMS, 60));
  paint();
  openSheet({ title, body: h('div', { class: 'stack' },
    intro ? h('p', { style: { margin: 0 } }, intro) : null,
    weekly ? weekPicker(st, weekly.need, paint) : null,
    hasTime ? field('Aviso', alarmSel, 'Lo de todo el día (partidos y torneos) avisa a las 9 de la mañana del día anterior.') : null,
    preview, actions,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'iPhone: abre el archivo y toca «Agregar todo». Android: ábrelo con Google Calendar o usa el botón de Google.')),
  actions: [{ label: 'Listo' }] });
}
export const calButton = (opts, label = 'Agregar al calendario') => h('button', { class: 'btn sm', type: 'button', onclick: () => calItemSheet(opts) }, ic('calendar-plus', 16), label);

// «Mi calendario»: todo lo tuyo en un solo archivo (entrenos, partidos, gym, laboratorio, pruebas, En casa).
function myCalendarSection(ctx) {
  const coach = ctx.role === 'coach', me = ctx.me || null;
  const parts = [];
  const add2 = (key, label, sub, count, picker, build, on = false) => parts.push({ key, label, sub, count, picker, build, on });
  const team = upcomingEvents(ctx.role, me).length;
  add2('team', 'Entrenamientos, partidos y torneos', 'Los próximos 3 meses.', team, null, (alarm) => withAlarm(upcomingEvents(ctx.role, me, alarm || 60), alarm), team > 0);
  const gd = me ? gymCalDefaults(me) : null;
  if (gd) { const gst = { days: new Set(gd.days), time: gd.time }; add2('gym', 'Mi rutina de gym', `${plural(gd.n, 'día', 'días')} por semana, hasta que termina tu bloque.`, null, { st: gst, need: gd.n }, (alarm) => gymCalEvents(me, [...gst.days], gst.time, alarm)); }
  if (coach && !ctx.self) {
    const ld = labCalDefaults();
    if (ld) { const lst = { days: new Set(ld.days), time: ld.time }; add2('lab', 'Laboratorio: programa de salto', 'Tus 2 sesiones por semana hasta terminar las 12 semanas.', null, { st: lst, need: 2 }, (alarm) => labCalEvents([...lst.days], lst.time, alarm)); }
    const due = testsDue(), next = due.due ? todayStr() : addDays(due.last, testsEvery() * 7);
    add2('tests', 'Pruebas físicas del equipo', `Próxima toma: ${fmtDate(next, { weekday: 'long', day: 'numeric', month: 'long' })}.`, 1, null,
      () => [{ uid: `tests-${next}`, summary: 'Pruebas físicas del equipo (Remate)', date: next, desc: 'Salto, 10 m, agilidad, plancha. Mídelas siempre igual; «Medir con video» ayuda con salto, 10 m y prueba T.' }]);
  }
  if (me && planOf(me).items.length) {
    const hst = { days: new Set([2, 4]), time: '19:00' };
    add2('casa', 'Mi tarea de En casa', 'Un recordatorio cada semana (8 semanas).', null, { st: hst, need: 0 },
      (alarm) => [...hst.days].map((wd) => ({ uid: `casa-${me.id}-${wd}`, summary: 'En casa: tu tarea de Remate', date: nextWeekday(todayStr(), wd), time: hst.time, minutes: 20, rrule: weeklyRule([wd], addDays(todayStr(), 55)), desc: 'Abre Remate > Ejercicios > En casa.', alarm })));
  }
  const on = new Set(parts.filter((x) => x.on).map((x) => x.key));
  let alarm = 60;
  const total = h('p', { class: 'row-sub', style: { margin: 0 } });
  const count = () => parts.filter((x) => on.has(x.key)).reduce((a, x) => a + x.build(alarm).length, 0);
  const sync = () => { total.textContent = on.size ? `${plural(count(), 'evento', 'eventos')} (los que se repiten cuentan una vez).` : 'Elige qué quieres en tu calendario.'; };
  const rows = parts.map((x) => {
    const pick = x.picker ? h('div', { class: 'cal-pick', hidden: on.has(x.key) ? null : true }, weekPicker(x.picker.st, x.picker.need, sync)) : null;
    return h('div', { class: 'cal-part' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on.has(x.key) ? true : null, onchange: (e) => { if (e.target.checked) on.add(x.key); else on.delete(x.key); if (pick) pick.hidden = !e.target.checked; sync(); } }),
        h('span', {}, h('strong', {}, x.label), x.count != null ? ` (${x.count})` : '', h('br'), h('span', { class: 'row-sub' }, x.sub))), pick);
  });
  sync();
  const alarmSel = h('select', { onchange: (e) => { alarm = Number(e.target.value); } }, options(ALARMS, 60));
  return h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Mi calendario (archivo)'),
    h('p', { style: { margin: 0 } }, 'Elige qué quieres y descárgalo en un solo archivo. No se actualiza solo: si algo cambia, vuelve a descargarlo.'),
    rows, field('Aviso de lo que tiene hora', alarmSel), total,
    h('button', { class: 'btn primary', type: 'button', onclick: () => {
      const bad = parts.find((x) => on.has(x.key) && x.picker?.need && x.picker.st.days.size !== x.picker.need);
      if (bad) { toast(`${bad.label}: elige ${plural(bad.picker.need, 'día', 'días')}`); return; }
      const ev = parts.filter((x) => on.has(x.key)).flatMap((x) => x.build(alarm || null));
      if (!ev.length) { toast('No hay nada que agregar'); return; }
      download(fileName('mi-calendario'), buildICS(ev, `Remate · ${group()?.name || 'Mi calendario'}`), 'text/calendar;charset=utf-8'); toast('Calendario descargado');
    } }, ic('download', 18), 'Descargar mi calendario (.ics)'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'En iPhone, ábrelo desde Safari y toca «Agregar todo». En Android, ábrelo con Google Calendar.'));
}

export const feedUrl = (token) => `${CONFIG.SUPABASE_URL}/functions/v1/calendario?t=${token}`;

export function calendarSheet(ctx) {
  const coach = ctx.role === 'coach', readonly = !!ctx.readonly;
  const box = h('div', { class: 'stack' });
  const draw = () => {
    const feed = state.data.calFeeds[0] || null;
    // 1) Suscripción: se actualiza sola.
    const sub = h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Que se actualice solo (suscripción)'));
    if (state.mode !== 'cloud') sub.append(note('En el modo demo no hay suscripción. Prueba el archivo de abajo.'));
    else if (!calReady()) sub.append(note(coach ? 'Para activar la suscripción, corre en Supabase el sql/instalar.sql de la versión 3.4 (SQL Editor → pega todo → Run).' : 'Tu entrenador todavía no activa el calendario del equipo. Mientras, usa el archivo de abajo.', coach ? 'bad' : ''));
    else if (!feed) sub.append(...(coach
      ? [h('p', { style: { margin: 0 } }, 'Crea el enlace del equipo. Tus jugadores se suscriben una vez y les llegan los cambios que hagas.'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { add('calFeeds', { group_id: group()?.id }); toast('Calendario del equipo activado'); setTimeout(draw, 50); } }, ic('calendar-days', 18), 'Activar calendario del equipo')]
      : [note('Tu entrenador todavía no activa el calendario del equipo. Mientras, usa el archivo de abajo.')]));
    else {
      const https = feedUrl(feed.token), webcal = https.replace(/^https?:\/\//, 'webcal://');
      sub.append(h('p', { style: { margin: 0 } }, 'Entrenamientos publicados, partidos y torneos. Si cambias un horario, se actualiza solo en el celular (puede tardar unas horas).'),
        h('div', { class: 'cluster' },
          h('a', { class: 'btn primary', href: webcal }, ic('calendar-days', 18), 'Suscribirme (iPhone)'),
          h('a', { class: 'btn', href: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`, target: '_blank', rel: 'noopener' }, 'Google Calendar'),
          h('button', { class: 'btn', type: 'button', onclick: () => copyText(https) }, ic('copy', 18), 'Copiar enlace')),
        h('details', {}, h('summary', {}, 'Cómo suscribirse paso a paso'), h('ul', { class: 'plain' },
          h('li', {}, 'iPhone: toca «Suscribirme» y luego «Suscribirse». Si no aparece: Ajustes → Calendario → Cuentas → Agregar cuenta → Otra → Agregar calendario suscrito, y pega el enlace. Para recibir los avisos, deja apagado «Quitar alarmas».'),
          h('li', {}, 'Google Calendar (Android): la primera vez es más fácil desde una computadora: calendar.google.com → Otros calendarios → + → Desde URL → pega el enlace. Después aparece solo en el celular. Los avisos se eligen en la configuración de ese calendario.'),
          h('li', {}, 'El enlace solo muestra horarios, partidos y torneos del equipo; no lleva nombres de jugadores. No lo publiques en redes.'))));
      if (coach && !readonly) sub.append(h('div', { class: 'cluster' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => noticeSheet({ title: 'Calendario del equipo', body: 'Abre Remate → Entrenos → «Calendario en el celular» y suscríbete. Así te llegan los avisos de entrenamientos y partidos aunque no abras la app.', url: '#/entrenos' }) }, ic('megaphone', 16), 'Avisar a mis jugadores'),
        h('button', { class: 'btn sm', type: 'button', onclick: async () => {
          if (!(await confirmSheet({ title: '¿Cambiar el enlace?', text: 'El enlace anterior deja de funcionar. Quien ya estaba suscrito tendrá que volver a suscribirse. Úsalo si el enlace se compartió de más.', ok: 'Cambiar enlace' }))) return;
          patch('calFeeds', feed.id, { token: randomToken() }); toast('Enlace nuevo listo'); draw(); } }, ic('refresh-cw', 16), 'Cambiar enlace'),
        h('button', { class: 'btn sm', type: 'button', onclick: async () => {
          if (!(await confirmSheet({ title: '¿Desactivar el calendario?', text: 'El enlace deja de funcionar para todos. Puedes activarlo otra vez cuando quieras (con un enlace nuevo).', ok: 'Desactivar', danger: true }))) return;
          remove('calFeeds', feed.id); toast('Calendario desactivado'); draw(); } }, 'Desactivar')));
    }
    // 2) Archivo con lo que elijas (v3.7: también gym, laboratorio, pruebas y En casa).
    const file = myCalendarSection(ctx);
    box.replaceChildren(sub, file);
  };
  draw();
  openSheet({ title: 'Calendario en el celular', body: box, actions: [{ label: 'Listo', kind: 'primary' }] });
}
export const calendarCard = (ctx) => h('button', { class: 'labcard', type: 'button', onclick: () => calendarSheet(ctx) },
  h('span', { class: 'lc-ic' }, ic('calendar-days', 26)),
  h('span', { class: 'lc-t' }, h('strong', {}, 'Calendario en el celular'), h('span', {}, 'Entrenos, partidos, torneos, gym y más en tu calendario, con aviso aunque no abras Remate.')), ic('chevron-right', 20));
