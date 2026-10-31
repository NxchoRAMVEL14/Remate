// Cálculos puros (sin pantalla): evaluaciones, nivel, asistencia, racha y XP.
import { SKILLS, SKILL_IDS } from './content/skills.js';
import { LEVELS, required } from './content/levels.js';
import { CHALLENGE_BY_ID } from './content/challenges.js';
import { todayStr } from './util.js';

export const XP_RULES = { presente: 10, retardo: 5, examen: 100 };

// ---------- evaluaciones ----------
export function currentRatings(playerId, ratings) {
  const out = {}, best = {};
  for (const r of ratings) {
    if (r.player_id !== playerId) continue;
    const key = `${r.rated_at || ''}|${r.created_at || ''}`;
    if (best[r.skill] === undefined || key >= best[r.skill]) { best[r.skill] = key; out[r.skill] = r.score; }
  }
  return out;
}
export function ratingHistory(playerId, skill, ratings) {
  return ratings.filter((r) => r.player_id === playerId && r.skill === skill)
    .sort((a, b) => `${a.rated_at}|${a.created_at}`.localeCompare(`${b.rated_at}|${b.created_at}`));
}
export const hasRatings = (playerId, ratings) => ratings.some((r) => r.player_id === playerId);

// ---------- nivel ----------
export const nextLevelN = (player) => Math.min(6, (player.level || 1) + 1);

// ---------- posiciones (jugadores comodín) ----------
// La principal va primero; después las que también juega bien.
export function positionsOf(p) {
  const extra = Array.isArray(p?.positions) ? p.positions.filter((x) => x && x !== 'sin_definir' && x !== p.position) : [];
  return [p?.position || 'sin_definir', ...new Set(extra)];
}
export const isWildcard = (p) => positionsOf(p).length > 1;
// Lo que pide un nivel en una habilidad para una o varias posiciones: con varias, lo más exigente de ellas.
export function needFor(pos, skillId, level) {
  const nums = (Array.isArray(pos) ? pos : [pos]).map((x) => required(x, skillId, level)).filter((v) => v !== null);
  return nums.length ? Math.max(...nums) : null;
}
// view: vacío o 'principal' = la posición principal (decide el nivel y el examen); 'todas' = todas sus posiciones; o una posición.
const posFor = (p, view) => (!view || view === 'principal' ? p.position : view === 'todas' ? positionsOf(p) : view);

// Compara las fases actuales con lo que pide el siguiente nivel (ajustado por posición).
export function levelGap(player, ratings, view = null) {
  const cur = currentRatings(player.id, ratings);
  const target = nextLevelN(player);
  const pos = posFor(player, view);
  const rows = SKILLS.map((s) => {
    const need = needFor(pos, s.id, target);
    const have = cur[s.id] || 0;
    const na = need === null;
    return { skill: s.id, name: s.name, need: na ? 0 : need, have, na, ok: na || have >= need };
  });
  const applicable = rows.filter((r) => !r.na);
  const met = applicable.filter((r) => r.ok).length;
  return { target, targetLevel: LEVELS[target - 1], rows, met, total: applicable.length,
           ready: met === applicable.length && player.level < 6, top: player.level >= 6 };
}

// Valores para el radar: actual y objetivo (0 si no aplica).
export function radarValues(player, ratings, view = null) {
  const g = levelGap(player, ratings, view);
  return { values: g.rows.map((r) => r.have), target: g.rows.map((r) => (r.na ? 0 : r.need)), labels: SKILLS.map((s) => s.name) };
}

// ---------- asistencia ----------
export function doneSessions(sessions) {
  return sessions.filter((s) => s.status === 'hecha')
    .sort((a, b) => `${a.session_date}${a.start_time || ''}`.localeCompare(`${b.session_date}${b.start_time || ''}`));
}
export function attendanceFor(playerId, sessions, attendance, settings = {}) {
  const done = doneSessions(sessions);
  const mine = new Map(attendance.filter((a) => a.player_id === playerId).map((a) => [a.session_id, a.status]));
  const c = { presente: 0, retardo: 0, falta: 0, justificada: 0 };
  const line = [];
  for (const s of done) { const st = mine.get(s.id) || null; if (st) c[st]++; line.push({ session: s, status: st }); }
  const lateN = Number(settings.late_per_absence) || 0;
  const converted = lateN ? Math.floor(c.retardo / lateN) : 0;
  const effAbsences = c.falta + converted;
  const counted = c.presente + c.retardo + c.falta;
  const pct = counted ? Math.max(0, Math.round(((counted - effAbsences) / counted) * 100)) : null;
  let streak = 0;
  for (let i = line.length - 1; i >= 0; i--) {
    const st = line[i].status;
    if (st === 'presente' || st === 'retardo') streak++;
    else if (st === 'falta') break;               // justificada o sin pasar lista no rompen la racha
  }
  let seguidas = 0;
  for (let i = line.length - 1; i >= 0; i--) {
    const st = line[i].status;
    if (st === 'falta') seguidas++;
    else if (st === null) continue;
    else break;
  }
  return { ...c, converted, effAbsences, counted, pct, streak, faltasSeguidas: seguidas, line };
}

// ---------- XP ----------
export function xpFor(player, { sessions, attendance, claims, exams }) {
  const done = new Set(doneSessions(sessions).map((s) => s.id));
  let xp = 0;
  for (const a of attendance) {
    if (a.player_id !== player.id || !done.has(a.session_id)) continue;
    xp += XP_RULES[a.status] || 0;
  }
  for (const c of claims) if (c.player_id === player.id && c.status === 'aprobada') xp += CHALLENGE_BY_ID[c.challenge_id]?.xp || 0;
  for (const e of exams) if (e.player_id === player.id && e.passed) xp += XP_RULES.examen;
  return xp;
}

// ---------- sesiones ----------
export const sessionStart = (s) => `${s.session_date}T${(s.start_time || '00:00').slice(0, 5)}`;
export function nextSession(sessions) {
  const t = todayStr();
  return sessions.filter((s) => s.status === 'planeada' && s.session_date >= t)
    .sort((a, b) => sessionStart(a).localeCompare(sessionStart(b)))[0] || null;
}
export const planMinutes = (s) => (s.plan || []).reduce((n, b) => n + (Number(b.min) || 0), 0);
export const focusOf = (session, getExercise) => {
  const set = new Set(session.focus || []);
  for (const b of session.plan || []) { const ex = b.ex && getExercise(b.ex); ex?.skills?.forEach((k) => set.add(k)); }
  return [...set].filter((k) => SKILL_IDS.includes(k));
};

// ---------- resumen del grupo ----------
export function levelCounts(players) {
  const c = [0, 0, 0, 0, 0, 0];
  for (const p of players) if (p.active !== false) c[Math.min(6, Math.max(1, p.level || 1)) - 1]++;
  return c;
}
