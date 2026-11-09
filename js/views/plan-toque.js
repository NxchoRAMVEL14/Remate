// Plan con un toque (v3.22): arma el plan completo de un entreno y explica por qué.
// Junta 4 señales (son reglas sencillas de Remate, no un estudio; tú lo revisas):
//  1) en qué habilidades está el grupo más lejos de su siguiente nivel (radar de cada jugador),
//  2) lo que falló en el último partido (de los últimos 14 días, si se capturó bastante),
//  3) si hay partido en los próximos 3 días (semana de partido: menos bloques y más juego, sin físico pesado),
//  4) lo que ya se trabajó en los 2 últimos entrenos hechos (para no repetirlo).
import { h, ic, toast, openSheet, confirmSheet, todayStr, addDays, fmtDate, diffDays } from '../util.js';
import { state, add, patch, settings, teamPlayers, group } from '../store.js';
import { levelGap, currentRatings } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { BUILTIN, getExercise } from '../content/exercises.js';
import { warmupFor } from '../content/templates.js';
import { diagnose, nextTrainingDay } from './sugerido.js';
import { note } from './ui.js';

const NAME = (k) => SKILL_BY_ID[k]?.name || k;
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 2; };
const fit = (e, lv) => (e.levels[0] <= lv && lv <= e.levels[1] ? 0 : Math.min(Math.abs(e.levels[0] - lv), Math.abs(e.levels[1] - lv)));
const span = (e) => e.levels[1] - e.levels[0];
const TRAIN = ['saque', 'recepcion', 'colocacion', 'remate', 'bloqueo', 'defensa', 'fisico'];

// Candidatos para una habilidad, del que mejor le queda al grupo al que menos. variant rota entre los 3 mejores.
function pick(skill, level, used, variant = 0) {
  const kinds = skill === 'fisico' ? ['fisico'] : ['tecnica', 'juego'];
  const ok = BUILTIN.filter((e) => e.skills.includes(skill) && kinds.includes(e.kind) && !used.has(e.id))
    .sort((a, b) => fit(a, level) - fit(b, level) || (a.skills[0] !== skill) - (b.skills[0] !== skill) || (a.kind !== kinds[0]) - (b.kind !== kinds[0]) || span(a) - span(b));
  const top = ok.filter((e) => fit(e, level) <= 1).slice(0, 3);
  return (top.length ? top[variant % top.length] : ok[0]) || null;
}
function pickGame(level, want, used, variant = 0) {
  const hits = (e) => e.skills.filter((s) => want.includes(s)).length;
  const ok = BUILTIN.filter((e) => e.kind === 'juego' && !used.has(e.id)).sort((a, b) => fit(a, level) - fit(b, level) || hits(b) - hits(a) || span(a) - span(b));
  const top = ok.filter((e) => fit(e, level) <= 1).slice(0, 2);
  return (top.length ? top[variant % top.length] : ok[0]) || null;
}

// Las señales y el puntaje de cada habilidad.
export function signals(date = todayStr()) {
  const d = state.data, team = teamPlayers();
  const evald = team.filter((p) => Object.keys(currentRatings(p.id, d.ratings)).length);
  const gap = Object.fromEntries(TRAIN.map((k) => [k, 0])), behind = Object.fromEntries(TRAIN.map((k) => [k, 0]));
  for (const p of evald) {
    const g = levelGap(p, d.ratings); if (g.top) continue;
    for (const r of g.rows) if (!r.na && !r.ok && r.skill in gap) { gap[r.skill] += r.need - r.have; behind[r.skill]++; }
  }
  const score = Object.fromEntries(TRAIN.map((k) => [k, evald.length ? gap[k] / evald.length : 0]));
  const why = Object.fromEntries(TRAIN.map((k) => [k, []]));
  for (const k of TRAIN) if (behind[k]) why[k].push(`${behind[k]} de ${evald.length} evaluados aún no tienen la fase que pide su siguiente nivel.`);

  // último partido terminado de los últimos 14 días
  const lastM = (d.matches || []).filter((m) => m.status === 'terminado' && m.match_date <= date && diffDays(date, m.match_date) <= 14).sort((a, b) => b.match_date.localeCompare(a.match_date))[0] || null;
  let dx = null, sideOut = null;
  if (lastM) {
    try { dx = diagnose(lastM); } catch { dx = null; }
    if (dx?.enough) for (const f of dx.list) {
      if (f.skill === 'juego') { sideOut = f; continue; }
      if (f.skill in score) { score[f.skill] += 0.6 + f.gap * 1.5; why[f.skill].push(`Contra ${lastM.rival}: ${f.why}`); }
    }
  }
  // partido pronto
  const soon = (d.matches || []).filter((m) => m.status !== 'terminado' && m.match_date >= date && diffDays(m.match_date, date) <= 3).sort((a, b) => a.match_date.localeCompare(b.match_date))[0] || null;
  // lo que ya se trabajó
  const recent = (d.sessions || []).filter((s) => s.status === 'hecha' && s.session_date < date).sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 2);
  const recentFocus = new Set(recent.flatMap((s) => s.focus || []));
  for (const k of recentFocus) if (k in score && score[k] > 0) { score[k] -= 0.35; why[k].push('Ya se trabajó en uno de los 2 últimos entrenos.'); }
  if (soon) { score.fisico -= 2; }
  const level = Math.max(1, Math.min(6, median(team.map((p) => Number(p.level) || 1))));
  return { team, evald, score, why, lastM, dx: dx?.enough ? dx : null, sideOut, soon, recentFocus, level };
}

export function autoPlan({ date = todayStr(), minutes = null, variant = 0, force = null } = {}) {
  const sg = signals(date), st = settings();
  const mins = Math.max(45, Number(minutes) || Number(st.minutes) || 90);
  const ranked = TRAIN.filter((k) => sg.score[k] > 0.05).sort((a, b) => sg.score[b] - sg.score[a]);
  // Sin datos (nadie evaluado ni partidos): lo básico que todo equipo necesita.
  const base = ranked.length ? ranked : ['recepcion', 'saque', 'remate'];
  const nFocus = sg.soon ? 2 : mins >= 75 ? 3 : 2;
  let focus = [...new Set([...(force ? [force] : []), ...base])].slice(0, nFocus);
  const gameMin = sg.soon ? 25 : mins >= 75 ? 20 : 15;
  const each = Math.max(10, Math.floor((mins - 10 - 5 - gameMin) / Math.max(1, focus.length) / 5) * 5);
  const used = new Set(), plan = [];
  plan.push({ ex: st.warmup_prev !== false ? warmupFor(date) : 'fi-01', min: 10, note: '' });
  for (const k of focus) {
    const parts = each > 25 ? 2 : 1;
    for (let i = 0; i < parts; i++) {
      const ex = pick(k, sg.level, used, variant + i); if (!ex) break;
      used.add(ex.id);
      const why = sg.why[k].filter((w) => !/Ya se trabajó/.test(w))[0] || '';
      plan.push({ ex: ex.id, min: parts === 2 ? (i ? Math.floor(each / 2 / 5) * 5 : each - Math.floor(each / 2 / 5) * 5) : each, note: i ? '' : why });
    }
  }
  const want = [...(sg.sideOut ? ['recepcion', 'saque'] : []), ...focus];
  const game = pickGame(sg.level, want, used, variant);
  if (game) { used.add(game.id); plan.push({ ex: game.id, min: gameMin, note: [sg.sideOut ? `Side-out: ${sg.sideOut.why}` : '', sg.soon ? `Partido el ${fmtDate(sg.soon.match_date, { weekday: 'long' })}: jueguen como en el partido.` : ''].filter(Boolean).join(' ') }); }
  plan.push({ ex: 'fi-10', min: 5, note: '' });
  const total = plan.reduce((a, b) => a + b.min, 0);
  const first = plan.find((b, i) => i > 0 && b.ex !== game?.id && b.ex !== 'fi-10') || plan.find((b) => b.ex === game?.id);
  if (first && total !== mins) first.min = Math.max(5, first.min + (mins - total));
  // Por qué: lo que se le explica al entrenador.
  const reasons = [];
  for (const k of focus) reasons.push({ t: NAME(k), d: sg.why[k].join(' ') || (force === k ? 'Lo elegiste tú.' : 'Es de lo básico que más se usa en el juego.') });
  if (sg.soon) reasons.push({ t: 'Semana de partido', d: `Juegan contra ${sg.soon.rival} el ${fmtDate(sg.soon.match_date, { weekday: 'long', day: 'numeric' })}: menos bloques, más juego y nada de físico pesado.` });
  if (sg.evald.length < sg.team.length) reasons.push({ t: 'Sin evaluar', d: `${sg.team.length - sg.evald.length} de ${sg.team.length} jugadores no tienen evaluación; evalúalos para que el plan sea más preciso.` });
  if (!sg.dx && sg.lastM) reasons.push({ t: 'Último partido', d: `Contra ${sg.lastM.rival} no hay suficiente captura para sacar conclusiones.` });
  return { plan, focus, level: sg.level, minutes: mins, reasons, sg };
}

// Hoja: ver el plan y ponerlo. session: el entreno donde se pone (si no, el siguiente planeado o uno nuevo).
export function planToqueSheet({ session = null, force = null } = {}) {
  const t = todayStr();
  const next = session || state.data.sessions.filter((s) => s.status === 'planeada' && s.session_date >= t && (!s.group_id || s.group_id === group()?.id))
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || String(a.start_time || '').localeCompare(String(b.start_time || '')))[0] || null;
  const date = next?.session_date || nextTrainingDay(addDays(t, -1));
  let variant = 0, cur, sh;
  const body = h('div', { class: 'stack' });
  const paint = () => {
    cur = autoPlan({ date, minutes: next?.minutes, variant, force });
    body.replaceChildren(
      h('p', { style: { margin: 0 } }, `Para el ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${cur.minutes} min, nivel ${cur.level} (el nivel medio del grupo).`),
      h('h3', { style: { margin: 0 } }, 'Por qué este plan'),
      h('ul', { class: 'plain' }, cur.reasons.map((r) => h('li', {}, h('strong', {}, `${r.t}: `), r.d))),
      h('h3', { style: { margin: 0 } }, 'El plan'),
      h('ol', { class: 'plain sug-plan' }, cur.plan.map((b) => { const ex = getExercise(b.ex); return h('li', {}, h('strong', {}, `${ex?.name || b.ex} · ${b.min} min`), b.note ? h('span', { class: 'row-sub', style: { display: 'block' } }, b.note) : null); })),
      h('button', { class: 'btn sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => { variant++; paint(); } }, ic('shuffle', 16), 'Otros ejercicios'),
      note('Es un borrador con reglas sencillas sobre tus datos (radar, partidos y entrenos). Revísalo; nada se publica solo.'));
  };
  paint();
  const apply = async (target) => {
    if (target) {
      if ((target.plan || []).length && !(await confirmSheet({ title: '¿Cambiar el plan?', text: `El entrenamiento del ${fmtDate(target.session_date, { weekday: 'long', day: 'numeric', month: 'long' })} ya tiene plan. Se cambia por este.`, ok: 'Cambiar' }))) return;
      patch('sessions', target.id, { plan: cur.plan, focus: cur.focus, title: target.title || `Entreno de ${cur.focus.map(NAME).join(' y ').toLowerCase()}` });
      toast('Plan puesto'); location.hash = `#/sesion/${target.id}`; return;
    }
    const st = settings();
    const s = add('sessions', { group_id: group()?.id, session_date: date, start_time: st.start || null, minutes: cur.minutes, title: `Entreno de ${cur.focus.map(NAME).join(' y ').toLowerCase()}`, focus: cur.focus, plan: cur.plan, status: 'planeada', published: false });
    toast('Entrenamiento creado sin publicar'); location.hash = `#/sesion/${s.id}`;
  };
  const day = (x) => fmtDate(x, { weekday: 'short', day: 'numeric' });
  sh = openSheet({ title: 'Plan con un toque', body,
    actions: [{ label: 'Cancelar' },
      next ? { label: session ? 'Poner en este entreno' : `Usar en el del ${day(next.session_date)}`, kind: 'primary', onClick: () => { setTimeout(() => apply(next), 50); } }
        : { label: `Crear el del ${day(date)}`, kind: 'primary', onClick: () => { setTimeout(() => apply(null), 50); } }] });
  return sh;
}

export const planToqueButton = (opts = {}, cls = 'btn sm') => h('button', { class: cls, type: 'button', onclick: () => planToqueSheet(opts) }, ic('sparkles', 16), 'Armar con un toque');
