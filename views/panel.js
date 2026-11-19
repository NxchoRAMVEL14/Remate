// Panel del grupo (v3.22): cómo va tu grupo de un vistazo. Solo el entrenador.
// Todo sale de lo que ya registras (listas, evaluaciones, partidos, En casa, gym y carga); no guarda nada nuevo.
import { h, ic, todayStr, addDays, fmtDate, plural, sum } from '../util.js';
import { state, players, teamPlayers, settings, sql39Ready } from '../store.js';
import { attendanceFor, levelGap, currentRatings, levelCounts } from '../calc.js';
import { SKILL_BY_ID, PHASES } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { result } from '../match-calc.js';
import { weekStart } from '../lab-calc.js';
import { sectionTitle, note, jersey } from './ui.js';
import { planToqueSheet } from './plan-toque.js';
import { spikes } from './carga.js';
import { availability } from './lesiones.js';

const TRAIN = ['saque', 'recepcion', 'colocacion', 'remate', 'bloqueo', 'defensa', 'fisico'];
const pctOf = (ok, n) => (n ? Math.round((ok / n) * 100) : null);

// Asistencia de un rango de fechas (presentes + retardos entre los que tenían lista; las justificadas no cuentan).
function attRange(from, to, ids) {
  const done = new Set(state.data.sessions.filter((s) => s.status === 'hecha' && s.session_date >= from && s.session_date <= to).map((s) => s.id));
  let ok = 0, n = 0;
  for (const a of state.data.attendance) {
    if (!done.has(a.session_id) || !ids.has(a.player_id) || a.status === 'justificada') continue;
    n++; if (a.status === 'presente' || a.status === 'retardo') ok++;
  }
  return { pct: pctOf(ok, n), n, sessions: done.size };
}

const kpi = (n, l, sub = null) => h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(n)), h('span', { class: 'l' }, l), sub ? h('span', { class: 'row-sub' }, sub) : null);

export default function panel(ctx) {
  const t = todayStr(), d = state.data, st = settings();
  const team = teamPlayers(), all = players(), ids = new Set(team.map((p) => p.id));
  const ws = weekStart(t);

  // ---- asistencia por semana (8) ----
  const weeks = Array.from({ length: 8 }, (_, i) => { const w = addDays(ws, -7 * (7 - i)); return { w, ...attRange(w, addDays(w, 6), ids) }; });
  const last4 = attRange(addDays(t, -27), t, ids), prev4 = attRange(addDays(t, -55), addDays(t, -28), ids);
  const trend = last4.pct != null && prev4.pct != null ? last4.pct - prev4.pct : null;
  const done = d.matches.filter((m) => m.status === 'terminado'), wins = done.filter((m) => result(m).win).length;
  const lvAvg = team.length ? (sum(team.map((p) => Number(p.level) || 1)) / team.length).toFixed(1) : '—';

  // ---- a quién atender ----
  const att8 = d.sessions.filter((s) => s.session_date > addDays(t, -56));
  const alerts = [];
  for (const p of team) {
    const a = attendanceFor(p.id, d.sessions, d.attendance, st), a8 = attendanceFor(p.id, att8, d.attendance, st);
    const lastR = d.ratings.filter((r) => r.player_id === p.id).map((r) => r.rated_at).sort().pop() || null;
    const g = levelGap(p, d.ratings);
    if (a.faltasSeguidas >= 2) alerts.push({ p, k: 'bad', t: `${a.faltasSeguidas} faltas seguidas`, d: 'Pregúntale si todo está bien.' });
    else if (a8.pct != null && a8.counted >= 4 && a8.pct < 70) alerts.push({ p, k: 'warn', t: `Asistencia ${a8.pct}% en 8 semanas`, d: `${a8.falta} faltas de ${a8.counted} entrenos.` });
    if (!lastR) alerts.push({ p, k: 'info', t: 'Sin evaluar', d: 'Evalúalo para que su radar y los planes cuenten con él.' });
    else if (lastR < addDays(t, -60)) alerts.push({ p, k: 'info', t: 'Evaluación vieja', d: `La última fue el ${fmtDate(lastR, { day: 'numeric', month: 'short' })}.` });
    if (g.ready) alerts.push({ p, k: 'ok', t: `Listo para el examen del nivel ${g.target}`, d: 'Ya tiene todas las fases que pide.' });
    const av = availability(p.id);
    if (av.k !== 'ok') alerts.push({ p, k: av.k === 'fuera' ? 'bad' : 'warn', t: av.text, d: av.k === 'fuera' ? 'No salta ni entrena esa zona.' : 'Entrena con límites (ver su fase).', href: '#/lesiones' });
  }
  if (sql39Ready()) for (const x of spikes()) if (ids.has(x.p.id)) alerts.push({ p: x.p, k: 'warn', t: 'Carga alta esta semana', d: 'Subió mucho contra sus semanas anteriores; bájale un poco.' });
  const order = { bad: 0, warn: 1, ok: 2, info: 3 };
  alerts.sort((a, b) => order[a.k] - order[b.k] || a.p.name.localeCompare(b.p.name));
  const pend = d.claims.filter((c) => c.status === 'solicitada').length;

  // ---- habilidades ----
  const evald = team.filter((p) => Object.keys(currentRatings(p.id, d.ratings)).length);
  const skills = TRAIN.map((k) => {
    let s = 0, n = 0, behind = 0;
    for (const p of evald) {
      const cur = currentRatings(p.id, d.ratings), g = levelGap(p, d.ratings), r = g.rows.find((x) => x.skill === k);
      if (r?.na) continue;
      if (cur[k] != null) { s += Number(cur[k]); n++; }
      if (!g.top && r && !r.ok) behind++;
    }
    return { k, avg: n ? s / n : null, behind, n };
  }).sort((a, b) => b.behind - a.behind || (a.avg ?? 9) - (b.avg ?? 9));

  // ---- fuera de la cancha (4 semanas) ----
  const from = addDays(t, -27);
  const hl = (d.homeLogs || []).filter((l) => ids.has(l.player_id) && l.done_on >= from);
  const gl = (d.gymLogs || []).filter((l) => ids.has(l.player_id) && l.done_on >= from);
  const counts = levelCounts(team), maxC = Math.max(1, ...counts);
  const maxW = 100;

  const el = h('div', { class: 'page panel-grupo' },
    h('div', { class: 'kpis', role: 'group', 'aria-label': 'Resumen' },
      kpi(last4.pct == null ? '—' : `${last4.pct}%`, 'asistencia, 4 semanas', trend == null ? null : trend === 0 ? 'igual que antes' : `${trend > 0 ? '▲' : '▼'} ${Math.abs(trend)} puntos vs. las 4 anteriores`),
      kpi(team.length, 'en el equipo', all.length > team.length ? `+${all.length - team.length} aparte` : null),
      kpi(lvAvg, 'nivel promedio'),
      kpi(done.length ? `${wins}-${done.length - wins}` : '—', 'partidos G-P')),

    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Asistencia por semana'),
      h('div', { class: 'pg-bars', role: 'img', 'aria-label': `Asistencia de las últimas 8 semanas: ${weeks.map((w) => (w.pct == null ? 'sin entrenos' : `${w.pct}%`)).join(', ')}` },
        weeks.map((w) => h('div', { class: 'pg-bar' }, h('span', { class: 'pg-v' }, w.pct == null ? '' : `${w.pct}`),
          h('span', { class: `pg-fill ${w.pct != null && w.pct < 70 ? 'low' : ''}`, style: { height: `${w.pct == null ? 0 : Math.max(4, (w.pct / maxW) * 100)}%` } }),
          h('span', { class: 'pg-l' }, fmtDate(w.w, { day: 'numeric', month: 'short' }))))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Cada barra es una semana (de lunes a domingo). En rojo, abajo de 70%.')),

    sectionTitle(`A quién atender${alerts.length ? ` (${alerts.length})` : ''}`),
    pend ? h('a', { class: 'btn sm', href: '#/ruta/retos', style: { justifySelf: 'start' } }, ic('award', 16), plural(pend, 'reto por aprobar', 'retos por aprobar')) : null,
    alerts.length ? h('div', { class: 'rows' }, alerts.slice(0, 20).map((x) => h('a', { class: 'row', href: x.href || `#/jugador/${x.p.id}` }, jersey(x.p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, x.p.name), h('span', { class: 'row-sub' }, `${x.t}. ${x.d}`)), h('span', { class: `chip ${x.k}` }, { bad: 'Urgente', warn: 'Ojo', ok: 'Bien', info: 'Pendiente' }[x.k])))) : note('Nadie necesita atención especial ahora. 👏', 'ok'),
    alerts.length > 20 ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Y ${alerts.length - 20} más.`) : null,

    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Habilidades del grupo'),
      evald.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Fase promedio de ${plural(evald.length, 'jugador evaluado', 'jugadores evaluados')} (1 a 4) y cuántos aún no tienen la que pide su siguiente nivel. Arriba, lo que más falta.`)
        : note('Todavía no evalúas a nadie: evalúa a tus jugadores para ver aquí lo que más le falta al grupo.'),
      evald.length ? h('div', { class: 'rows' }, skills.map((x) => h('div', { class: 'row pg-skill' },
        h('span', { class: 'row-main' }, h('strong', {}, SKILL_BY_ID[x.k].name),
          h('span', { class: 'pg-track', 'aria-hidden': 'true' }, h('span', { style: { width: `${x.avg == null ? 0 : (x.avg / 4) * 100}%` } })),
          h('span', { class: 'row-sub' }, `${x.avg == null ? 'Sin datos' : `Promedio ${x.avg.toFixed(1)} (${PHASES[Math.max(0, Math.round(x.avg) - 1)]?.name.toLowerCase() || '—'})`}${x.behind ? ` · ${x.behind} por debajo de su siguiente nivel` : ''}`)),
        x.behind ? h('button', { class: 'btn sm', type: 'button', onclick: () => planToqueSheet({ force: x.k }) }, ic('sparkles', 16), 'Entreno de esto') : null))) : null),

    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Niveles'),
      h('div', { class: 'rows' }, LEVELS.map((l, i) => h('div', { class: 'row pg-lv' }, h('span', { class: 'lvl' }, String(l.n)),
        h('span', { class: 'row-main' }, h('strong', {}, l.name), h('span', { class: 'pg-track', 'aria-hidden': 'true' }, h('span', { style: { width: `${(counts[i] / maxC) * 100}%` } }))),
        h('span', { class: 'rank-v' }, String(counts[i])))))),

    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Fuera de la cancha (4 semanas)'),
      h('div', { class: 'kpis' },
        kpi(`${sum(hl.map((l) => Number(l.minutes) || 0))}`, 'min en casa', plural(new Set(hl.map((l) => l.player_id)).size, 'jugador', 'jugadores')),
        kpi(gl.length, gl.length === 1 ? 'sesión de gym' : 'sesiones de gym', plural(new Set(gl.map((l) => l.player_id)).size, 'jugador', 'jugadores'))),
      h('div', { class: 'cluster' }, h('a', { class: 'btn sm', href: '#/casa' }, ic('house', 16), 'En casa'), h('a', { class: 'btn sm', href: '#/gym' }, ic('dumbbell', 16), 'Gym'), h('a', { class: 'btn sm', href: '#/ruta/ranking' }, ic('trophy', 16), 'Ranking'))),

    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => planToqueSheet({}) }, ic('sparkles', 18), 'Armar el siguiente entreno'),
      h('a', { class: 'btn', href: '#/reportes/grupo' }, ic('file-text', 18), 'Reporte del grupo')));
  return { title: 'Panel del grupo', sub: 'Cómo va tu grupo', back: '#/hoy', el };
}
