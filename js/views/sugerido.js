// Entreno sugerido después de un partido (v3.8): un borrador de entrenamiento con ejercicios para lo que más falló.
// Son reglas simples sobre la estadística capturada (propuesta de Remate, no un estudio): tú lo revisas y lo ajustas.
import { h, ic, toast, openSheet, confirmSheet, todayStr, addDays, parseDate, fmtDate } from '../util.js';
import { state, add, patch, players, settings, inTeam, teamOf, group } from '../store.js';
import { metrics, addCounts, countsFor, playersIn, replay, phaseStats, byRotation, rotLabel, rivalStats, fmtEff, rotate } from '../match-calc.js';
import { currentRatings, positionsOf } from '../calc.js';
import { POSITION_NAME } from '../content/skills.js';
import { BUILTIN, getExercise } from '../content/exercises.js';
import { warmupFor } from '../content/templates.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { note } from './ui.js';

const SKILL_NAME = (k) => (k === 'juego' ? 'Side-out' : SKILL_BY_ID[k]?.name || k);
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 2; };
// Qué tan lejos queda un ejercicio del nivel del equipo (0 = le queda).
const fit = (e, level) => (e.levels[0] <= level && level <= e.levels[1] ? 0 : Math.min(Math.abs(e.levels[0] - level), Math.abs(e.levels[1] - level)));
const span = (e) => e.levels[1] - e.levels[0];

// El ejercicio de técnica (o juego) que mejor le queda al equipo para una habilidad.
function pickFor(skill, level, used) {
  const ok = BUILTIN.filter((e) => e.skills.includes(skill) && !used.has(e.id) && (e.kind === 'tecnica' || e.kind === 'juego'));
  // Primero el que trabaja esa habilidad como principal, luego técnica antes que juego, luego el más ajustado al nivel.
  return ok.sort((a, b) => fit(a, level) - fit(b, level) || (a.skills[0] !== skill) - (b.skills[0] !== skill)
    || (a.kind !== 'tecnica') - (b.kind !== 'tecnica') || span(a) - span(b))[0] || null;
}
// El juego final: el que más toca lo que falló.
function pickGame(level, want, used) {
  const ok = BUILTIN.filter((e) => e.kind === 'juego' && e.skills.includes('juego') && !used.has(e.id));
  const hits = (e) => e.skills.filter((s) => want.includes(s)).length;
  return ok.sort((a, b) => fit(a, level) - fit(b, level) || hits(b) - hits(a) || span(a) - span(b))[0] || null;
}

// Qué falló en el partido, de lo más urgente a lo menos.
export function diagnose(m) {
  const log = state.data.matchLogs.find((l) => l.match_id === m.id)?.log || [];
  const ids = playersIn(log);
  // Sin captura jugada por jugada, usa los totales por jugador (no hay side-out ni rotaciones).
  const counts = ids.length ? ids.map((id) => countsFor(log, id)) : state.data.matchStats.filter((s) => s.match_id === m.id).map((s) => s.counts || {});
  const tm = metrics(addCounts(...counts));
  const rp = replay(log, m.lineups || [], players());
  const ph = phaseStats(rp.rallies), rots = byRotation(rp.rallies).filter((r) => r.n >= 4);
  const worst = rots.length > 1 ? rots.reduce((a, b) => (b.diff < a.diff ? b : a)) : null;
  const rv = rivalStats(log);
  const out = [];
  const push = (skill, gap, why) => out.push({ skill, gap, why });
  if (tm.recs >= 8 && tm.recPos != null && tm.recPos < 60) {
    const zs = Object.entries(rv.sv.zones).filter(([, c]) => c.n).sort((a, b) => b[1].n - a[1].n);
    const total = zs.reduce((a, [, c]) => a + c.n, 0), top = zs[0];
    push('recepcion', (60 - tm.recPos) / 60, `Recepción buena o perfecta: ${tm.recPos}% (promedio ${tm.recAvg} de 3).${top && total >= 5 && top[1].n / total >= 0.3 ? ` El rival sacó sobre todo a tu zona ${top[0]} (${Math.round((top[1].n / total) * 100)}%).` : ''}`);
  }
  if (tm.serves >= 10 && tm.svIn != null && tm.svIn < 88) push('saque', (88 - tm.svIn) / 88, `Saques dentro: ${tm.svIn}% (${tm.svErr} errores de ${tm.serves}).`);
  if (tm.atts >= 10 && tm.atEff != null && tm.atEff < 0.15) push('remate', (0.15 - tm.atEff) / 0.6, `Eficiencia de ataque: ${fmtEff(tm.atEff)} (${tm.kills} puntos y ${tm.atErr} errores o bloqueados en ${tm.atts} ataques).`);
  if (rv.at.n >= 8 && rv.at.eff != null && rv.at.eff > 0.25) push('bloqueo', Math.min(1, (rv.at.eff - 0.25) / 0.5), `El rival atacó con eficiencia de ${fmtEff(rv.at.eff)}; bloqueos punto tuyos: ${tm.blocks}.`);
  else if (tm.digs >= 8 && tm.digPct != null && tm.digPct < 55) push('defensa', (55 - tm.digPct) / 55, `Defensa: ${tm.digPct}% de balones levantados (${tm.digOk} de ${tm.digs}).`);
  if (ph.soN >= 10 && ph.so != null && ph.so < 50) push('juego', (50 - ph.so) / 50, `Side-out: ${ph.so}% (ganaron ${ph.soW} de ${ph.soN} rallies recibiendo).`);
  out.sort((a, b) => b.gap - a.gap);
  return { list: out, worst, tm, ph, enough: tm.recs + tm.serves + tm.atts >= 20 };
}

// Siguiente día de entreno según tus días de Ajustes (desde mañana).
export function nextTrainingDay(from = todayStr()) {
  const days = settings().days || [];
  for (let i = 1; i <= 14; i++) { const d = addDays(from, i); if (!days.length || days.includes(parseDate(d).getDay())) return d; }
  return addDays(from, 1);
}

export function buildPlan(m, dx, date) {
  const minutes = Math.max(45, Number(settings().minutes) || 90);
  const team = players().filter((p) => p.active !== false && inTeam(p, teamOf(m)));
  const level = Math.max(1, Math.min(6, median(team.map((p) => Number(p.level) || 1))));
  const used = new Set(), plan = [];
  plan.push({ ex: settings().warmup_prev !== false ? warmupFor(date) : 'fi-01', min: 10, note: '' });
  const focus = dx.list.filter((f) => f.skill !== 'juego').slice(0, minutes >= 75 ? 3 : 2);
  const gameMin = minutes >= 75 ? 20 : 15;
  const each = Math.max(10, Math.floor((minutes - 10 - 5 - gameMin) / Math.max(1, focus.length) / 5) * 5);
  for (const f of focus) {
    // Un bloque de más de 25 min se parte en dos ejercicios de la misma habilidad (del más básico al de más juego).
    const parts = each > 25 ? 2 : 1;
    for (let i = 0; i < parts; i++) {
      const ex = pickFor(f.skill, level, used);
      if (!ex) break;
      used.add(ex.id);
      plan.push({ ex: ex.id, min: parts === 2 ? (i ? Math.floor(each / 2 / 5) * 5 : each - Math.floor(each / 2 / 5) * 5) : each, note: i ? '' : f.why });
    }
  }
  const sideOut = dx.list.find((f) => f.skill === 'juego');
  const want = [...(sideOut ? ['recepcion', 'saque'] : []), ...focus.map((f) => f.skill)];
  const game = pickGame(level, want.length ? want : ['saque', 'remate'], used);
  if (game) {
    used.add(game.id);
    plan.push({ ex: game.id, min: gameMin, note: [sideOut?.why, dx.worst && dx.worst.diff < 0 ? `Empiecen el juego en la rotación que más perdió: ${rotLabel(dx.worst.key).toLowerCase()} (${dx.worst.won} de ${dx.worst.n} rallies).` : ''].filter(Boolean).join(' ') });
  }
  plan.push({ ex: 'fi-10', min: 5, note: '' });
  // Cuadra el total con la duración de tu entreno moviendo el primer bloque de técnica.
  const total = plan.reduce((a, b) => a + b.min, 0);
  const first = plan.find((b, i) => i > 0 && b.ex !== game?.id && b.ex !== 'fi-10') || plan.find((b) => b.ex === game?.id);
  if (first && total !== minutes) first.min = Math.max(5, first.min + (minutes - total));
  return { plan, level, minutes, focus: [...new Set(focus.map((f) => f.skill))] };
}

export function sugeridoSheet(m) {
  const dx = diagnose(m);
  if (!dx.enough) { toast('Hacen falta al menos 20 saques, recepciones y ataques capturados para sugerir un entreno.'); return; }
  const t = todayStr();
  const next = state.data.sessions.filter((s) => s.status === 'planeada' && s.session_date >= t && (!s.group_id || s.group_id === group()?.id))
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || String(a.start_time || '').localeCompare(String(b.start_time || '')))[0] || null;
  const date = nextTrainingDay();
  const { plan, level, minutes, focus } = buildPlan(m, dx, next?.session_date || date);
  const title = `Después de ${m.rival}`;
  const create = async (target) => {
    if (target) {
      if ((target.plan || []).length && !(await confirmSheet({ title: '¿Cambiar el plan?', text: `El entrenamiento del ${fmtDate(target.session_date, { weekday: 'long', day: 'numeric', month: 'long' })} ya tiene plan. Se cambia por el sugerido.`, ok: 'Cambiar' }))) return;
      patch('sessions', target.id, { plan, focus: focus.length ? focus : target.focus || [], title: target.title || title });
      toast('Plan sugerido puesto en ese entrenamiento'); location.hash = `#/sesion/${target.id}`; return;
    }
    const st = settings();
    const s = add('sessions', { group_id: group()?.id, session_date: date, start_time: st.start || null, minutes, title, focus, plan, status: 'planeada', published: false });
    toast('Entrenamiento creado sin publicar'); location.hash = `#/sesion/${s.id}`;
  };
  const day = (d) => fmtDate(d, { weekday: 'short', day: 'numeric' });
  openSheet({ title: 'Entreno sugerido', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, dx.list.length ? `Lo que más costó contra ${m.rival}, de lo más urgente a lo menos:` : `Contra ${m.rival} ningún número quedó claramente bajo. Te propongo un entreno de juego para mantener el ritmo.`),
    dx.list.length ? h('ul', { class: 'plain' }, dx.list.map((f) => h('li', {}, h('strong', {}, `${SKILL_NAME(f.skill)}: `), f.why))) : null,
    h('p', { style: { margin: 0 } }, `Plan de ${minutes} min para nivel ${level} (el nivel medio de tu equipo):`),
    h('ol', { class: 'plain sug-plan' }, plan.map((b) => { const ex = getExercise(b.ex); return h('li', {}, h('strong', {}, `${ex?.name || b.ex} · ${b.min} min`), b.note ? h('span', { class: 'row-sub', style: { display: 'block' } }, b.note) : null); })),
    note('Es un borrador hecho con reglas sencillas sobre lo que capturaste (no conoce lo que viste en la cancha). Revísalo y cámbialo; nada se publica solo.')),
  // Si ya tienes el siguiente entreno planeado, lo natural es ponerle este plan; crear otro queda como opción.
  actions: [{ label: 'Cancelar' },
    { label: next ? `Crear otro (${day(date)})` : `Crear el del ${day(date)}`, kind: next ? '' : 'primary', onClick: () => { setTimeout(() => create(null), 50); } },
    next ? { label: `Usar en el del ${day(next.session_date)}`, kind: 'primary', onClick: () => { setTimeout(() => create(next), 50); } } : null].filter(Boolean) });
}

export const sugeridoButton = (m) => h('button', { class: 'btn sm', type: 'button', onclick: () => sugeridoSheet(m) }, ic('sparkles', 16), 'Entreno sugerido');

// ---------- Alineación sugerida (v3.8) ----------
// Sistema 5-1: colocador y opuesto enfrentados (zonas 1 y 4), puntas en 2 y 5, centrales en 3 y 6, y líbero si tienes.
// Puntaje de cada jugador para cada puesto: sus fases en el radar (0 a 4), su posición y, si hay, su estadística de partidos.
const ROLE_W = {
  colocador: { colocacion: 0.7, defensa: 0.15, saque: 0.15 },
  punta: { remate: 0.4, recepcion: 0.4, saque: 0.2 },
  opuesto: { remate: 0.55, bloqueo: 0.3, saque: 0.15 },
  central: { bloqueo: 0.55, remate: 0.35, saque: 0.1 },
  libero: { recepcion: 0.55, defensa: 0.45 },
};
const SLOT_ROLES = ['colocador', 'punta', 'punta', 'central', 'central', 'opuesto', 'libero'];

function roleScore(p, role, cur, st) {
  const prior = Math.max(0, Math.min(3, ((Number(p.level) || 1) - 1) * 0.6));   // sin evaluación: un estimado por nivel
  let v = 0;
  for (const [k, w] of Object.entries(ROLE_W[role])) v += w * (cur[k] != null ? Number(cur[k]) : prior);
  const pos = positionsOf(p);
  if (pos[0] === role) v += 1; else if (pos.includes(role)) v += 0.6;
  if (st) {
    if (st.atts >= 10 && ['punta', 'opuesto', 'central'].includes(role)) v += Math.max(-0.5, Math.min(0.5, st.atEff));
    if (st.recs >= 10 && ['punta', 'libero'].includes(role)) v += Math.max(-0.5, Math.min(0.5, (st.recAvg - 1.8) / 2));
  }
  return v;
}

export function suggestLineup(m) {
  const team = teamOf(m), no = new Set(state.data.rsvps.filter((r) => r.match_id === m.id && r.status === 'no').map((r) => r.player_id));
  const cand = players().filter((p) => p.active !== false && inTeam(p, team) && !no.has(p.id));
  if (cand.length < 6) return { error: `Hacen falta al menos 6 jugadores disponibles${no.size ? ' (sin contar a quienes dijeron que no van)' : ''}.` };
  const stats = new Map(cand.map((p) => [p.id, metrics(addCounts(...state.data.matchStats.filter((x) => x.player_id === p.id).map((x) => x.counts || {})))]));
  const ratings = state.data.ratings || [];
  const useLibero = cand.length >= 7 && cand.some((p) => positionsOf(p).includes('libero'));
  const slots = useLibero ? SLOT_ROLES : SLOT_ROLES.slice(0, 6);
  const S = cand.map((p) => { const cur = currentRatings(p.id, ratings); return slots.map((r) => roleScore(p, r, cur, stats.get(p.id))); });
  // Asignación óptima: programación dinámica sobre qué puestos ya están ocupados.
  const full = (1 << slots.length) - 1;
  let dp = new Map([[0, { v: 0, pick: [] }]]);
  cand.forEach((_, i) => {
    const nx = new Map(dp);
    for (const [mask, st] of dp) for (let j = 0; j < slots.length; j++) {
      if (mask & (1 << j)) continue;
      const nm = mask | (1 << j), v = st.v + S[i][j];
      if (!nx.has(nm) || nx.get(nm).v < v) nx.set(nm, { v, pick: [...st.pick, [i, j]] });
    }
    dp = nx;
  });
  const best = dp.get(full);
  const who = {}; for (const [i, j] of best.pick) (who[j] ||= []).push(cand[i]);
  const by = (j) => who[j][0];
  // Las dos puntas: la mejor en zona 2; centrales: el mejor bloqueador en zona 3.
  const [oh1, oh2] = [by(1), by(2)].sort((a, b) => S[cand.indexOf(b)][1] - S[cand.indexOf(a)][1]);
  const [mb1, mb2] = [by(3), by(4)].sort((a, b) => S[cand.indexOf(b)][3] - S[cand.indexOf(a)][3]);
  let lineup = [by(0).id, oh1.id, mb1.id, by(5).id, oh2.id, mb2.id];          // índice 0 = zona 1
  // ¿En qué rotación empezar? La de mejor +/- en tus partidos anteriores (si hay suficientes rallies).
  const rallies = state.data.matches.filter((x) => x.id !== m.id && x.status === 'terminado' && (!team || teamOf(x) === team))
    .flatMap((x) => replay(state.data.matchLogs.find((l) => l.match_id === x.id)?.log || [], x.lineups || [], players()).rallies);
  const rots = byRotation(rallies).filter((r) => r.key?.[0] === 'C' && r.n >= 6);
  let start = 1, why = 'Empieza con el colocador en zona 1 (la rotación más común).';
  if (rots.length >= 4 && rallies.length >= 40) {
    const top = rots.reduce((a, b) => (b.diff / b.n > a.diff / a.n ? b : a));
    start = Number(top.key.slice(1));
    why = `Empieza con el colocador en zona ${start}: en tus partidos anteriores fue la rotación con mejor saldo (${top.won} de ${top.n} rallies ganados).`;
  }
  for (let k = (1 - start + 6) % 6; k > 0; k--) lineup = rotate(lineup);
  const lib = useLibero ? by(6) : null;
  const line = (p, role) => { const cur = currentRatings(p.id, ratings), ks = Object.keys(ROLE_W[role]).filter((k) => cur[k] != null);
    return `${p.name} de ${POSITION_NAME[role].toLowerCase()}${ks.length ? ` (${ks.map((k) => `${SKILL_NAME(k).toLowerCase()} ${cur[k]}/4`).join(', ')})` : ' (sin evaluación: se usó su nivel)'}`; };
  const notes = [line(by(0), 'colocador'), line(oh1, 'punta'), line(oh2, 'punta'), line(mb1, 'central'), line(mb2, 'central'), line(by(5), 'opuesto'), lib ? line(lib, 'libero') : null].filter(Boolean);
  return { slots: lineup, libero: lib?.id || null, notes, why, rated: cand.filter((p) => ratings.some((r) => r.player_id === p.id)).length, total: cand.length };
}
