// Ranking y retos de la semana (v3.22).
// Ranking: solo categorías en positivo (XP, asistencia, racha, casa, retos y mejora). El entrenador lo ve siempre;
// sus jugadores solo si él lo activa («Top 5» o «Todos»). Como los jugadores no ven los datos de sus compañeros,
// el celular del entrenador publica el ranking en los ajustes del grupo cada vez que abre Hoy o el Ranking
// (igual que el reto del equipo). Con «Top 5» se publica solo el top 5; cada jugador ve además su propio número,
// calculado en su celular con sus datos, pero no su lugar.
// Retos de la semana: el entrenador destaca hasta 3 retos; valen +50 % de XP si se piden esa semana. No hace falta SQL.
import { h, ic, toast, openSheet, todayStr, addDays, plural } from '../util.js';
import { state, players, playerById, settings, saveSettings } from '../store.js';
import { xpFor, attendanceFor, currentRatings, WEEK_BONUS } from '../calc.js';
import { CHALLENGES, CHALLENGE_BY_ID } from '../content/challenges.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { weekStart } from '../lab-calc.js';
import { jersey, note } from './ui.js';

const inLast = (date, days, t = todayStr()) => !!date && date > addDays(t, -days) && date <= t;

export const RANK_CATS = {
  xp: { name: 'Puntos XP', short: 'XP', unit: (v) => `${v} XP`, desc: 'Toda la temporada: entrenos, retos y exámenes.' },
  asistencia: { name: 'Asistencia', short: 'Asistencia', unit: (v) => `${v}%`, desc: 'Últimas 8 semanas (con al menos 3 entrenos).' },
  racha: { name: 'Racha', short: 'Racha', unit: (v) => plural(v, 'entreno seguido', 'entrenos seguidos'), desc: 'Entrenos seguidos sin faltar (las justificadas no la rompen).' },
  casa: { name: 'En casa', short: 'En casa', unit: (v) => `${v} min`, desc: 'Minutos de práctica en casa en las últimas 4 semanas.' },
  retos: { name: 'Retos', short: 'Retos', unit: (v) => plural(v, 'reto', 'retos'), desc: 'Retos aprobados en los últimos 30 días.' },
  mejora: { name: 'Mejora', short: 'Mejora', unit: (v) => plural(v, 'fase', 'fases'), desc: 'Fases que subió en su radar en los últimos 60 días.' },
};
export const RANK_MODES = [['no', 'Solo yo'], ['top5', 'Top 5'], ['todos', 'Todos']];
export const rankMode = () => (['top5', 'todos'].includes(settings().ranking?.mode) ? settings().ranking.mode : 'no');

// El número de un jugador en una categoría (con los datos que hay en este celular).
export function valueOf(cat, p, d = state.data, st = settings()) {
  const t = todayStr();
  if (cat === 'xp') return xpFor(p, d, st);
  if (cat === 'asistencia') {
    const ses = d.sessions.filter((s) => inLast(s.session_date, 56, t));
    const a = attendanceFor(p.id, ses, d.attendance, st);
    return a.presente + a.retardo + a.falta >= 3 ? a.pct : null;
  }
  if (cat === 'racha') return attendanceFor(p.id, d.sessions, d.attendance, st).streak;
  if (cat === 'casa') return (d.homeLogs || []).filter((l) => l.player_id === p.id && inLast(l.done_on, 28, t)).reduce((a, l) => a + (Number(l.minutes) || 0), 0);
  if (cat === 'retos') return d.claims.filter((c) => c.player_id === p.id && c.status === 'aprobada' && inLast(String(c.resolved_at || c.claimed_at || '').slice(0, 10), 30, t)).length;
  if (cat === 'mejora') {
    const mine = d.ratings.filter((r) => r.player_id === p.id);
    const before = currentRatings(p.id, mine.filter((r) => String(r.rated_at) <= addDays(t, -60)));
    const now = currentRatings(p.id, mine);
    if (!Object.keys(before).length) return null;           // sin evaluación de hace 60 días no se puede medir
    return Object.entries(now).reduce((a, [k, v]) => a + Math.max(0, (Number(v) || 0) - (Number(before[k]) || 0)), 0);
  }
  return null;
}

// Lista ordenada (sin ceros) con lugar compartido en empates.
export function rankRows(cat, list = players()) {
  const rows = list.map((p) => ({ p, v: valueOf(cat, p) })).filter((r) => r.v != null && r.v > 0).sort((a, b) => b.v - a.v || a.p.name.localeCompare(b.p.name));
  let place = 0, prev = null;
  rows.forEach((r, i) => { if (r.v !== prev) { place = i + 1; prev = r.v; } r.place = place; });
  return rows;
}

// Solo el entrenador: publica lo que ven sus jugadores si cambió.
let pending = false;
export function syncRanking() {
  if (state.role !== 'coach' || state.viewAs || pending) return;
  const mode = rankMode(), cur = settings().ranking_pub || null;
  const cats = mode === 'no' ? null : Object.fromEntries(Object.keys(RANK_CATS).map((k) => [k, rankRows(k).filter((r) => mode === 'todos' || r.place <= 5).map((r) => [r.p.id, r.v, r.place])]));
  const next = cats ? { mode, cats } : null;
  if (JSON.stringify(next) === JSON.stringify(cur ? { mode: cur.mode, cats: cur.cats } : null)) return;
  pending = true;
  setTimeout(() => { pending = false; saveSettings({ ranking_pub: next ? { ...next, at: new Date().toISOString() } : null }); }, 0);
}

// ---------- retos de la semana ----------
export const weekNow = () => weekStart(todayStr());
export const weeklyIds = (week = weekNow()) => ((Array.isArray(settings().weekly_retos) ? settings().weekly_retos : []).find((x) => x.week === week)?.ids || []).filter((id) => CHALLENGE_BY_ID[id]);
export function saveWeekly(ids, week = weekNow()) {
  const list = (Array.isArray(settings().weekly_retos) ? settings().weekly_retos : []).filter((x) => x.week !== week);
  saveSettings({ weekly_retos: [...(ids.length ? [{ week, ids }] : []), ...list].sort((a, b) => b.week.localeCompare(a.week)).slice(0, 26) });
}
export function weeklySheet() {
  const pick = new Set(weeklyIds());
  let sh;
  const rows = h('div', { class: 'rows' });
  const paint = () => rows.replaceChildren(...CHALLENGES.filter((c) => !c.teo).map((c) => h('label', { class: 'row conv-row' },
    h('span', { class: 'row-main' }, h('strong', {}, c.name), h('span', { class: 'row-sub' }, `${SKILL_BY_ID[c.skill]?.name || ''} · niveles ${c.levels[0]} a ${c.levels[1]} · ${c.xp} XP → ${c.xp + Math.round(c.xp * WEEK_BONUS)} XP`)),
    h('input', { type: 'checkbox', checked: pick.has(c.id) ? true : null, 'aria-label': c.name, onchange: (e) => {
      if (e.target.checked && pick.size >= 3) { e.target.checked = false; toast('Máximo 3 retos por semana'); return; }
      if (e.target.checked) pick.add(c.id); else pick.delete(c.id);
    } }))));
  paint();
  sh = openSheet({ title: 'Retos de la semana', body: h('div', { class: 'stack' },
    h('p', { class: 'row-sub', style: { margin: 0 } }, `Elige hasta 3. Esta semana (de lunes a domingo) valen +${Math.round(WEEK_BONUS * 100)} % de XP si tus jugadores los piden. Salen destacados en su Inicio y en Retos.`),
    rows,
    h('button', { class: 'btn primary', type: 'button', onclick: () => { saveWeekly([...pick]); sh?.close(); toast(pick.size ? `Retos de la semana: ${pick.size}` : 'Sin retos de la semana'); } }, ic('check', 18), 'Guardar')) });
}
// Tarjeta para jugador (Inicio y Retos) y entrenador (Ruta).
export function weeklyCard({ coach = false, me = null, compact = false } = {}) {
  const ids = weeklyIds();
  if (!ids.length) return coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: weeklySheet }, ic('star', 16), 'Elegir retos de la semana')) : null;
  const list = ids.map((id) => CHALLENGE_BY_ID[id]);
  const fitsMe = (c) => !me || (c.levels[0] <= me.level && me.level <= c.levels[1]);
  return h(compact ? 'a' : 'section', { class: 'panel stack wk-card', ...(compact ? { href: '#/ruta/retos', style: { textDecoration: 'none', color: 'inherit' } } : {}) },
    h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, ic('star', 18), ' Retos de la semana'), h('span', { class: 'chip ball' }, `+${Math.round(WEEK_BONUS * 100)} % XP`)),
    h('ul', { class: 'plain' }, list.map((c) => h('li', {}, h('strong', {}, c.name), ` · ${c.xp + Math.round(c.xp * WEEK_BONUS)} XP`, me && !fitsMe(c) ? h('span', { class: 'row-sub' }, ' (no es de tu nivel, pero puedes intentarlo)') : null))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Valen más si los piden antes del domingo. Tú los apruebas como siempre.' : 'Pídelo en Ruta → Retos antes del domingo y tu entrenador lo aprueba.'),
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: weeklySheet }, ic('pencil', 16), 'Cambiar')) : null);
}

// ---------- pestaña Ranking (Ruta) ----------
export function rankingTab(ctx) {
  const ui = ctx.ui; ui.rcat ??= 'xp';
  const coach = ctx.role === 'coach', me = ctx.role === 'player' ? ctx.me : null;
  const out = h('div', { class: 'stack' });
  if (coach) {
    syncRanking();
    const mode = rankMode();
    out.append(h('section', { class: 'panel stack' },
      h('h3', { style: { margin: 0 } }, '¿Quién ve el ranking?'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Quién ve el ranking' }, RANK_MODES.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': mode === k ? 'true' : 'false',
        onclick: () => { saveSettings({ ranking: { ...(settings().ranking || {}), mode: k } }); setTimeout(() => { syncRanking(); ctx.rerender(); }, 0); toast(k === 'no' ? 'Solo tú ves el ranking' : k === 'top5' ? 'Tus jugadores ven el top 5' : 'Tus jugadores ven el ranking completo'); } }, t))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, mode === 'no' ? 'Tus jugadores no lo ven.' : mode === 'top5' ? 'Ven el top 5 de cada categoría y su propio número (no su lugar). Se actualiza cuando abres Hoy o esta pestaña.' : 'Ven a todos los que tienen más de cero. Se actualiza cuando abres Hoy o esta pestaña.'),
      note('Son chavos: el ranking solo premia esfuerzo (asistir, practicar, mejorar), nunca errores. Si a alguien le pesa, déjalo en «Solo yo» o «Top 5».')));
  } else if (rankMode() === 'no' || !settings().ranking_pub) {
    out.append(note('Tu entrenador no ha activado el ranking.')); return out;
  }
  out.append(h('div', { class: 'ap-chips', role: 'group', 'aria-label': 'Categoría' }, Object.entries(RANK_CATS).map(([k, c]) =>
    h('button', { type: 'button', class: `ap-chip ${ui.rcat === k ? 'on' : ''}`, 'aria-pressed': ui.rcat === k ? 'true' : 'false', onclick: () => { ui.rcat = k; ctx.rerender(); } }, c.short))));
  const C = RANK_CATS[ui.rcat];
  let rows;
  if (coach) rows = rankRows(ui.rcat);
  else rows = (settings().ranking_pub?.cats?.[ui.rcat] || []).map(([pid, v, place]) => ({ p: playerById(pid) || { id: pid, name: 'Compañero' }, v, place }));
  const mine = me ? valueOf(ui.rcat, me) : null;
  out.append(...[h('p', { class: 'row-sub', style: { margin: 0 } }, C.desc),
    me ? h('div', { class: 'panel split' }, h('strong', {}, 'Tú'), h('span', { class: 'num', style: { fontSize: '1.4rem' } }, mine == null || mine === 0 ? '—' : C.unit(mine))) : null,
    rows.length ? h('ol', { class: 'rank-list' }, rows.map((r) => h('li', { class: `rank-row ${me && r.p.id === me.id ? 'me' : ''}` },
      h('span', { class: `rank-n p${r.place <= 3 ? r.place : 0}` }, String(r.place)), jersey(r.p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, r.p.name)), h('span', { class: 'rank-v' }, C.unit(r.v)))))
      : note(ui.rcat === 'mejora' ? 'Todavía nadie: hace falta una evaluación de hace más de 60 días para comparar.' : 'Todavía nadie tiene puntos en esta categoría.')].filter(Boolean));
  if (!coach && settings().ranking_pub?.at) out.append(h('p', { class: 'row-sub', style: { margin: 0 } }, 'Lo actualiza tu entrenador cuando abre Remate.'));
  return out;
}

