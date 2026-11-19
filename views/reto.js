// Reto del equipo (v3.8): una meta semanal para todos (de lunes a domingo). Se guarda en los ajustes del grupo.
// Los jugadores no ven los registros de sus compañeros, así que el celular del entrenador anota el avance
// cada vez que abre Remate, y eso es lo que ven ellos. No hace falta SQL nuevo.
import { h, ic, toast, openSheet, todayStr, addDays, plural } from '../util.js';
import { state, settings, saveSettings, players } from '../store.js';
import { weekStart } from '../lab-calc.js';
import { field, options, note } from './ui.js';

export const RETO_KINDS = {
  asistencia: { name: 'Asistencia del equipo', unit: '%', def: 85, min: 50, max: 100, step: 5,
    goal: (t) => `Que el equipo llegue al ${t}% de asistencia`, val: (v) => `${v}%` },
  casa: { name: 'Minutos de práctica en casa', unit: 'min', def: 300, min: 30, max: 5000, step: 30,
    goal: (t) => `Juntar ${t} minutos de práctica en casa entre todos`, val: (v) => `${v} min` },
  gym: { name: 'Sesiones de gym', unit: 'sesiones', def: 15, min: 1, max: 500, step: 1,
    goal: (t) => `Juntar ${plural(t, 'sesión', 'sesiones')} de gym entre todos`, val: (v) => plural(v, 'sesión', 'sesiones') },
};

export const reto = () => { const r = settings().team_challenge; return r && RETO_KINDS[r.kind] && r.target ? r : null; };
const inWeek = (d, ws) => d >= ws && d <= addDays(ws, 6);

// Avance de una semana con los datos que tiene el entrenador.
export function progressFor(r, ws) {
  const ids = new Set(players().map((p) => p.id));
  if (r.kind === 'casa') return (state.data.homeLogs || []).filter((l) => ids.has(l.player_id) && inWeek(l.done_on, ws)).reduce((a, l) => a + (Number(l.minutes) || 0), 0);
  if (r.kind === 'gym') return (state.data.gymLogs || []).filter((l) => ids.has(l.player_id) && inWeek(l.done_on, ws)).length;
  const done = new Set(state.data.sessions.filter((s) => s.status === 'hecha' && inWeek(s.session_date, ws)).map((s) => s.id));
  const c = { ok: 0, n: 0 };
  for (const a of state.data.attendance) {
    if (!done.has(a.session_id) || !ids.has(a.player_id) || a.status === 'justificada') continue;
    c.n++; if (a.status === 'presente' || a.status === 'retardo') c.ok++;
  }
  return c.n ? Math.round((c.ok / c.n) * 100) : null;
}

// Solo el entrenador: guarda el avance de esta semana y el resultado de la anterior si cambiaron.
let pending = false;
export function syncReto() {
  const r = reto();
  if (!r || state.role !== 'coach' || state.viewAs || pending) return;
  const ws = weekStart(todayStr()), prev = addDays(ws, -7);
  const now = { week: ws, value: progressFor(r, ws) };
  const last = { week: prev, value: progressFor(r, prev) };
  const same = (a, b) => a && b && a.week === b.week && a.value === b.value;
  if (same(r.progress, now) && (same(r.last, last) || (r.since && r.since > prev))) return;
  pending = true;
  setTimeout(() => { pending = false; const cur = reto(); if (cur) saveSettings({ team_challenge: { ...cur, progress: { ...now, at: new Date().toISOString() }, last: cur.since && cur.since > prev ? null : last } }); }, 0);
}

function bar(value, target, kind) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  return h('div', { class: 'reto-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': `Avance del reto: ${pct}%` },
    h('span', { style: { width: `${pct}%` }, class: kind === 'ok' ? 'ok' : '' }));
}

// Tarjeta del reto. coach: con botón para cambiarlo; player: lo que guardó el entrenador.
export function retoCard({ coach = false } = {}) {
  const r = reto();
  if (!r) return coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => retoSheet() }, ic('flag', 16), 'Poner un reto del equipo')) : null;
  const K = RETO_KINDS[r.kind], ws = weekStart(todayStr());
  const value = coach ? progressFor(r, ws) : r.progress?.week === ws ? r.progress.value : null;
  const ok = value != null && value >= r.target;
  const last = r.last && r.last.week === addDays(ws, -7) && r.last.value != null ? r.last : null;
  return h('section', { class: 'panel stack reto' },
    h('div', { class: 'split' }, h('div', {}, h('div', { class: 'row-sub' }, 'Reto del equipo esta semana'), h('h2', { style: { margin: 0 } }, K.goal(r.target))),
      ok ? h('span', { class: 'chip ok' }, '¡Logrado!') : null),
    bar(value, r.target, ok ? 'ok' : ''),
    h('p', { style: { margin: 0 } }, value == null ? (r.kind === 'asistencia' ? 'Todavía no hay entrenos con lista esta semana.' : 'Todavía no hay avance esta semana.')
      : `Van: ${K.val(value)} de ${K.val(r.target)}.`,
    last ? ` La semana pasada: ${K.val(last.value)} (${last.value >= r.target ? 'lo lograron' : 'no se logró'}).` : ''),
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => retoSheet() }, ic('pencil', 16), 'Cambiar reto'))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, r.progress?.at ? `Se actualiza cuando tu entrenador abre Remate (última vez: ${new Date(r.progress.at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(/\./g, '')}).` : 'Se actualiza cuando tu entrenador abre Remate.'));
}

export function retoSheet() {
  const r = reto();
  let kind = r?.kind || 'asistencia';
  const kindSel = h('select', { 'aria-label': 'Tipo de reto' }, options(Object.entries(RETO_KINDS).map(([k, v]) => [k, v.name]), kind));
  const target = h('input', { type: 'number', inputmode: 'numeric', value: r?.target ?? RETO_KINDS[kind].def });
  const hint = h('p', { class: 'row-sub', style: { margin: 0 } });
  const setK = () => { const K = RETO_KINDS[kind]; target.min = K.min; target.max = K.max; target.step = K.step; hint.textContent = `${K.goal(Number(target.value) || K.def)}. De lunes a domingo; se reinicia cada semana.`; };
  kindSel.addEventListener('change', () => { kind = kindSel.value; target.value = RETO_KINDS[kind].def; setK(); });
  target.addEventListener('input', setK); setK();
  openSheet({ title: 'Reto del equipo', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Una meta de todos para la semana. Los jugadores la ven en su Inicio con el avance.'),
    field('¿Qué miden?', kindSel), field('Meta', target), hint,
    note('El avance de casa y gym sale de lo que anotan los jugadores en Remate; la asistencia, de tus listas. Tus jugadores ven el avance que guarda tu celular al abrir Remate.')),
  actions: [r ? { label: 'Quitar reto', kind: 'danger', onClick: () => { saveSettings({ team_challenge: null }); toast('Reto quitado'); } } : { label: 'Cancelar' },
    { label: 'Guardar', kind: 'primary', onClick: () => {
      const K = RETO_KINDS[kind], t = Math.round(Number(target.value));
      if (!(t >= K.min && t <= K.max)) { toast(`La meta debe estar entre ${K.min} y ${K.max} ${K.unit}`); return false; }
      const same = r && r.kind === kind;
      saveSettings({ team_challenge: { kind, target: t, since: same ? r.since : todayStr(), progress: same ? r.progress : null, last: same ? r.last : null } });
      toast('Reto guardado'); return true;
    } }] });
}
