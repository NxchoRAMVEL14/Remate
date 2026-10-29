// Hojas emergentes de sesiones y ejercicios: crear sesión, pasar lista, elegir ejercicio, ejercicio propio.
import { h, ic, openSheet, toast, todayStr, addDays, parseDate, DAYS } from '../util.js';
import { add, patch, group, settings, players, setAttendance, state } from '../store.js';
import { SKILLS, SKILL_BY_ID } from '../content/skills.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../content/templates.js';
import { allExercises, filterExercises, MATERIAL, KINDS, levelLabel } from '../content/exercises.js';
import { field, options, note, jersey, STATUS_LABEL } from './ui.js';

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
      if (s) { patch('sessions', s.id, base); toast('Guardado'); return; }
      const t = TEMPLATE_BY_ID[tpl.value];
      const ns = add('sessions', { ...base, group_id: group()?.id, focus: t?.focus || [], plan: t ? t.blocks.map((b) => ({ ...b, note: '' })) : [], status: 'planeada', published: false });
      toast('Entrenamiento creado'); onCreated?.(ns);
    } }],
  });
}

// ---------- pasar lista ----------
const ATT = [['presente', 'P', 'p'], ['retardo', 'R', 'r'], ['falta', 'F', 'f'], ['justificada', 'J', 'j']];
export function attendanceSheet(s) {
  const list = players();
  const mark = (pid) => state.data.attendance.find((a) => a.session_id === s.id && a.player_id === pid)?.status || null;
  const counts = h('div', { class: 'cluster' });
  const rows = h('div', { class: 'rows' });
  function paint() {
    const c = { presente: 0, retardo: 0, falta: 0, justificada: 0, sin: 0 };
    for (const p of list) c[mark(p.id) || 'sin']++;
    counts.replaceChildren(...ATT.map(([k]) => h('span', { class: `chip ${{ presente: 'ok', retardo: 'warn', falta: 'bad', justificada: 'info' }[k]}` }, `${STATUS_LABEL[k]} ${c[k]}`)),
      h('span', { class: 'chip' }, `Sin lista ${c.sin}`));
    rows.replaceChildren(...list.map((p) => h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name)),
      h('div', { class: 'att', role: 'group', 'aria-label': `Asistencia de ${p.name}` }, ATT.map(([k, l, c2]) => h('button', {
        type: 'button', class: c2, 'aria-pressed': String(mark(p.id) === k), 'aria-label': STATUS_LABEL[k], title: STATUS_LABEL[k],
        onclick: () => set(p.id, mark(p.id) === k ? null : k) }, l))))));
  }
  function set(pid, st) {
    setAttendance(s.id, pid, st);
    // Al pasar lista el entrenamiento ya ocurrió: se marca hecho y se publica, para que cada jugador vea su asistencia.
    if (s.status === 'planeada') { patch('sessions', s.id, { status: 'hecha', published: true }); s.status = 'hecha'; }
    paint();
  }
  paint();
  return openSheet({
    title: 'Pasar lista',
    body: h('div', { class: 'stack' },
      list.length ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { for (const p of list) if (!mark(p.id)) set(p.id, 'presente'); } }, ic('check', 16), 'Los que faltan por marcar, presentes')) : null,
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
