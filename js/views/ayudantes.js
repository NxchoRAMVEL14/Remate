// v3.41 «Ayudantes con función»: el entrenador elige qué puede hacer cada asistente adulto.
// Funciones: «Lista y partidos» (como siempre), «Da el entreno», «Entrenador suplente» o «Personalizado».
// Los permisos se guardan en los ajustes del grupo (groups.settings.staff_roles); la base de datos los revisa
// con public.staff_can() (sql/v3.41-ayudantes.sql). Los capitanes no cambian.
import { h, ic, toast, openSheet, todayStr, addDays, fmtDate, plural } from '../util.js';
import { state, group, settings, saveSettings, sessions, add, patch, players } from '../store.js';
import { client } from '../cloud.js';
import { field, options, note, empty, sectionTitle, sessionWhen } from './ui.js';
import { attendanceSheet } from './sheets-session.js';
import { openCourtMode } from './court-mode.js';
import { splitOf } from './grupos.js';
import { planFromAny } from './condiciones.js';
import { ALL_TEMPLATES } from '../content/templates.js';
import { getExercise } from '../content/exercises.js';

export const PERMS = [
  ['lista', 'Pasar lista', 'Lista normal y lista con QR (si la tienes activada para ayudantes).'],
  ['dar', 'Dar el entreno', 'Ver el plan, Modo cancha calificando «¿Cómo salió?», marcarlo como hecho y dejarte una nota.'],
  ['editar', 'Crear y cambiar entrenos', 'Hacer entrenos nuevos y cambiarles el plan con tus plantillas.'],
  ['partidos', 'Capturar partidos', 'Crear partidos, alineación y estadística en vivo.'],
  ['avisos', 'Mandar avisos', 'Avisos al grupo (salen en el Inicio de cada jugador).'],
];
export const FUNCS = [
  ['lista_partidos', 'Lista y partidos', { lista: true, partidos: true }, 'Lo de siempre: pasa lista y captura partidos.'],
  ['da_entreno', 'Da el entreno cuando no estás', { lista: true, dar: true, avisos: true }, 'Pasa lista, da tu entreno con su plan, lo califica, lo marca como hecho y avisa al grupo.'],
  ['suplente', 'Entrenador suplente', { lista: true, dar: true, editar: true, partidos: true, avisos: true }, 'Todo lo anterior y además crea entrenos, cambia planes y captura partidos.'],
  ['personalizado', 'Personalizado', null, 'Tú eliges cada permiso.'],
];
const DEFAULT = { fn: 'lista_partidos', perms: { lista: true, partidos: true } };

// ---------- Permisos ----------
export function roleOf(st, g = group()) {
  const r = g?.settings?.staff_roles?.[st?.id] || settings().staff_roles?.[st?.id];
  return r && r.perms ? r : DEFAULT;
}
export const funcName = (r) => (FUNCS.find((f) => f[0] === r.fn) || FUNCS[3])[1];
export const myStaff = () => (state.role === 'assistant' ? state.data.staff.find((s) => s.user_id === state.user?.id && s.active) || state.data.staff[0] || null : null);
// ¿El usuario actual puede hacer esto? El entrenador, todo. El capitán, lo de siempre (lista y partidos).
export function can(perm) {
  if (state.role === 'coach') return true;
  if (state.role === 'player') return perm === 'lista' || perm === 'partidos';
  if (state.role !== 'assistant') return false;
  return !!roleOf(myStaff()).perms[perm];
}

// ¿Ya corrieron el SQL de la 3.41? (en demo, sí)
let ready = null;
export function ayudantesReady() {
  if (state.mode !== 'cloud') return Promise.resolve(true);
  if (ready) return ready;
  ready = client().then((c) => c.rpc('staff_can', { p_group: group()?.id || '00000000-0000-0000-0000-000000000000', p_perm: 'dar' }))
    .then((r) => !r.error).catch(() => false);
  return ready;
}

// ---------- Entrenador: elegir la función de un asistente ----------
export function roleSheet(st) {
  const cur = roleOf(st);
  let fn = cur.fn, perms = { ...cur.perms };
  const desc = h('p', { class: 'row-sub', style: { margin: 0 } });
  const boxes = PERMS.map(([k, t, d]) => ({ k, input: h('input', { type: 'checkbox' }), row: null, t, d }));
  boxes.forEach((b) => { b.row = h('label', { class: 'check' }, b.input, h('span', {}, h('strong', {}, b.t), h('span', { class: 'row-sub', style: { display: 'block' } }, b.d)));
    b.input.addEventListener('change', () => { perms[b.k] = b.input.checked; fn = 'personalizado'; sel.value = fn; paint(); }); });
  const sel = h('select', { 'aria-label': 'Función' }, options(FUNCS.map((f) => [f[0], f[1]]), fn));
  sel.addEventListener('change', () => { fn = sel.value; const f = FUNCS.find((x) => x[0] === fn); if (f[2]) perms = { ...f[2] }; paint(); });
  const paint = () => { desc.textContent = (FUNCS.find((x) => x[0] === fn) || FUNCS[3])[3]; boxes.forEach((b) => { b.input.checked = !!perms[b.k]; }); };
  paint();
  ayudantesReady().then((ok) => { if (!ok) warn.hidden = false; });
  const warn = note('Para que pueda dar el entreno, cambiar entrenos o mandar avisos, corre en Supabase el archivo sql/v3.41-ayudantes.sql (SQL Editor → pega todo → Run). Mientras, solo podrá pasar lista y capturar partidos.', 'warn');
  warn.hidden = true;
  openSheet({
    title: `Función de ${st.name}`,
    body: h('div', { class: 'stack' }, field('Función', sel), desc, h('div', { class: 'stack' }, boxes.map((b) => b.row)), warn,
      note('Nunca ve notas privadas, evaluaciones, reportes, datos de contacto ni tu laboratorio, sin importar su función.')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const clean = Object.fromEntries(PERMS.map(([k]) => [k, !!perms[k]]));
      if (!Object.values(clean).some(Boolean)) { toast('Elige al menos un permiso'); return false; }
      saveSettings({ staff_roles: { ...(settings().staff_roles || {}), [st.id]: { fn, perms: clean } } });
      toast(`${st.name}: ${funcName({ fn })}`); return true;
    } }],
  });
}

// ---------- Ayudante: Entrenos ----------
const tplChoices = () => [['', 'Elige una plantilla…'], ...ALL_TEMPLATES.map((t) => [t.id, `${t.name} (${t.minutes} min)`])];
function newSessionSheet() {
  const st = settings();
  const date = h('input', { type: 'date', value: todayStr() }), time = h('input', { type: 'time', value: st.start || '' });
  const mins = h('input', { type: 'number', min: 20, max: 240, step: 5, inputmode: 'numeric', value: st.minutes || 90 });
  const title = h('input', { type: 'text', maxlength: 80, placeholder: 'Por ejemplo: Recepción y saque' }), tpl = h('select', {}, options(tplChoices(), ''));
  openSheet({ title: 'Nuevo entreno', body: h('div', { class: 'stack' }, field('Fecha', date), field('Hora', time), field('Minutos', mins), field('Plantilla del plan', tpl), field('Nombre (opcional)', title)),
    actions: [{ label: 'Cancelar' }, { label: 'Crear', kind: 'primary', onClick: () => {
      if (!date.value) { toast('Elige la fecha'); return false; }
      const t = ALL_TEMPLATES.find((x) => x.id === tpl.value);
      const s = add('sessions', { group_id: group()?.id, session_date: date.value, start_time: time.value || null, minutes: Math.min(240, Math.max(20, Number(mins.value) || 90)),
        title: title.value.trim() || t?.name || 'Entrenamiento', focus: t?.focus || [], plan: t ? planFromAny(t.id, date.value, settings().warmup_prev !== false) : [], status: 'planeada', published: false });
      toast('Entreno creado'); location.hash = `#/dar/${s.id}`; return true;
    } }] });
}
function changePlanSheet(s) {
  const tpl = h('select', {}, options(tplChoices(), ''));
  openSheet({ title: 'Cambiar el plan', body: h('div', { class: 'stack' }, field('Plantilla', tpl), note('Se reemplaza el plan de este entreno. El entrenador lo ve al momento.')),
    actions: [{ label: 'Cancelar' }, { label: 'Cambiar', kind: 'primary', onClick: () => {
      const t = ALL_TEMPLATES.find((x) => x.id === tpl.value); if (!t) { toast('Elige una plantilla'); return false; }
      patch('sessions', s.id, { plan: planFromAny(t.id, s.session_date, settings().warmup_prev !== false), focus: t.focus || [], title: s.title || t.name }); toast('Plan cambiado'); return true;
    } }] });
}
function noteSheet(s) {
  const me = myStaff()?.name || 'Ayudante';
  const ta = h('textarea', { maxlength: 600, rows: 5, placeholder: 'Cómo salió, quién faltó, qué hay que reforzar…' });
  openSheet({ title: 'Nota para el entrenador', body: h('div', { class: 'stack' }, ta, note('Se agrega a las notas de este entreno con tu nombre.')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar nota', kind: 'primary', onClick: () => {
      const v = ta.value.trim(); if (!v) { toast('Escribe la nota'); return false; }
      const line = `Nota de ${me} (${fmtDate(todayStr(), { day: 'numeric', month: 'short' })}): ${v}`;
      patch('sessions', s.id, { notes: `${s.notes ? `${s.notes}\n` : ''}${line}`.slice(-3000) }); toast('Nota guardada'); return true;
    } }] });
}
const courtBtn = (s, { rate }) => ((s.plan || []).some((b) => Number(b.min) > 0)
  ? (splitOf(s) ? ['A', 'B'].map((g) => h('button', { class: 'btn sm', type: 'button', onclick: () => openCourtMode(s, { group: g, rate }) }, ic('timer', 16), `Cancha grupo ${g}`))
    : [h('button', { class: 'btn sm primary', type: 'button', onclick: () => openCourtMode(s, { rate }) }, ic('timer', 16), 'Modo cancha')]) : []);

export function darEntreno(ctx) {
  const s = state.data.sessions.find((x) => x.id === ctx.args[0]);
  if (!s) return { title: 'Entreno', back: '#/entrenos-ayudante', el: h('div', { class: 'page' }, empty('No encontré ese entreno', 'Puede que el entrenador lo haya borrado.')) };
  const dar = can('dar'), editar = can('editar');
  const marks = state.data.attendance.filter((a) => a.session_id === s.id).length;
  const plan = (s.plan || []).filter((b) => b && (b.ex || b.text || b.name));
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, sessionWhen(s)), h('h2', {}, s.title || 'Entrenamiento'),
      h('p', { style: { margin: 0 } }, `${s.minutes || 0} min · ${s.status === 'hecha' ? 'Hecho' : s.status === 'cancelada' ? 'Cancelado' : 'Por dar'}${marks ? ` · lista de ${marks}` : ''}`)),
    h('div', { class: 'cluster' },
      ...(dar || editar ? courtBtn(s, { rate: dar }) : []),
      can('lista') ? h('button', { class: 'btn sm', type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 16), marks ? 'Corregir lista' : 'Pasar lista') : null),
    h('section', { class: 'stack' }, sectionTitle('Plan'),
      plan.length ? h('ol', { class: 'cero-plan' }, plan.map((b) => { const ex = b.ex ? getExercise(b.ex) : null;
        return h('li', {}, ex ? h('a', { href: `#/ejercicio/${ex.id}` }, ex.name) : h('span', {}, b.name || b.text || 'Bloque'), h('span', { class: 'row-sub' }, ` · ${b.min || 0} min${b.g ? ` · grupo ${b.g}` : ''}`)); }))
        : note(editar ? 'Este entreno no tiene plan todavía. Ponle uno con «Cambiar el plan».' : 'Este entreno no tiene plan todavía. Pídele al entrenador que lo arme.')),
    s.notes ? h('section', { class: 'stack' }, sectionTitle('Notas'), h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, s.notes)) : null,
    dar || editar ? h('div', { class: 'cluster' },
      dar && s.status !== 'hecha' ? h('button', { class: 'btn', type: 'button', onclick: () => { patch('sessions', s.id, { status: 'hecha' }); toast('Marcado como hecho'); } }, ic('check', 16), 'Marcar como hecho') : null,
      dar ? h('button', { class: 'btn', type: 'button', onclick: () => noteSheet(s) }, ic('message-circle', 16), 'Nota para el entrenador') : null,
      editar ? h('button', { class: 'btn', type: 'button', onclick: () => changePlanSheet(s) }, ic('pencil', 16), 'Cambiar el plan') : null) : null,
    dar ? note('En Modo cancha califica cada ejercicio («¿Cómo salió?»): el entrenador lo ve en su historial.') : null);
  return { title: s.title || 'Entreno', sub: 'Dar el entreno', back: '#/entrenos-ayudante', el };
}

export default function entrenosAyudante() {
  const dar = can('dar'), editar = can('editar');
  if (!dar && !editar) return { title: 'Entrenos', el: h('div', { class: 'page' }, empty('Tu función no incluye dar entrenos', 'Si tu entrenador quiere que des el entreno cuando él no pueda, puede cambiar tu función en Ajustes → Equipo de apoyo.')) };
  const t = todayStr(), all = sessions().filter((s) => s.status !== 'cancelada');
  const today = all.filter((s) => s.session_date === t);
  const next = all.filter((s) => s.session_date > t && s.session_date <= addDays(t, 14));
  const past = all.filter((s) => s.session_date < t && s.session_date >= addDays(t, -10)).reverse();
  const row = (s) => h('a', { class: 'row', href: `#/dar/${s.id}` }, h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'),
    h('span', { class: 'row-sub' }, `${sessionWhen(s)} · ${plural((s.plan || []).length, 'bloque', 'bloques')}${s.status === 'hecha' ? ' · hecho' : ''}`)), ic('chevron-right', 18));
  const sec = (title, list, emptyTxt) => h('section', { class: 'stack' }, sectionTitle(title), list.length ? h('div', { class: 'rows' }, list.map(row)) : h('p', { class: 'row-sub', style: { margin: 0 } }, emptyTxt));
  const el = h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, `Tu función: ${funcName(roleOf(myStaff()))}. Abre un entreno para ver su plan y darlo.`),
    editar ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: newSessionSheet }, ic('plus', 18), 'Nuevo entreno')) : null,
    sec('Hoy', today, 'No hay entreno hoy.'), sec('Próximos 14 días', next, 'Sin entrenos próximos.'), sec('Recientes', past, 'Sin entrenos recientes.'),
    players().length ? null : note('Todavía no ves la lista del equipo. Si acabas de entrar, espera a que se sincronice.'));
  return { title: 'Entrenos', sub: 'Asistente', el };
}
