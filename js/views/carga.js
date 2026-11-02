// Carga semanal (v3.9): después de cada entreno el jugador dice qué tan pesado fue (0 a 10).
// Carga = esfuerzo × minutos (método de la sesión de Foster, 2001). Se suma también su gym (esfuerzo × minutos).
// El aviso de «subió mucho» es una señal para platicar con el jugador, no una predicción de lesiones.
import { h, ic, toast, fmtDate, todayStr, addDays, plural } from '../util.js';
import { state, add, patch, players, getPlayer, sql39Ready } from '../store.js';
import { weekStart } from '../lab-calc.js';
import { sectionTitle, note, empty, jersey } from './ui.js';

// Escala CR-10 de Foster en palabras de chavos.
export const RPE_SCALE = { 0: 'Descanso', 1: 'Muy, muy fácil', 2: 'Fácil', 3: 'Moderado', 4: 'Algo duro', 5: 'Duro', 6: 'Duro', 7: 'Muy duro', 8: 'Muy duro', 9: 'Muy, muy duro', 10: 'Máximo' };
const SPIKE = 1.5;         // esta semana vs. el promedio de las 4 anteriores
const WEEKS = 8;

const sessionById = (id) => state.data.sessions.find((s) => s.id === id) || null;
const inWeek = (d, ws) => d >= ws && d <= addDays(ws, 6);

// Carga de un jugador por semana (las últimas n, de la más vieja a la actual).
export function weeklyLoads(pid, n = WEEKS) {
  const ws0 = weekStart(todayStr());
  const weeks = Array.from({ length: n }, (_, i) => addDays(ws0, -7 * (n - 1 - i)));
  const rows = weeks.map((ws) => ({ ws, cancha: 0, gym: 0, n: 0 }));
  for (const r of state.data.sessionRpe || []) {
    if (r.player_id !== pid || r.rpe == null) continue;
    const s = sessionById(r.session_id); if (!s) continue;
    const w = rows.find((x) => inWeek(s.session_date, x.ws)); if (!w) continue;
    w.cancha += Number(r.rpe) * (Number(r.minutes) || Number(s.minutes) || 0); w.n++;
  }
  for (const g of state.data.gymLogs || []) {
    if (g.player_id !== pid || !g.rpe || !g.minutes) continue;
    const w = rows.find((x) => inWeek(g.done_on, x.ws)); if (!w) continue;
    w.gym += Number(g.rpe) * Number(g.minutes); w.n++;
  }
  rows.forEach((w) => { w.total = w.cancha + w.gym; });
  return rows;
}
// ¿Subió mucho esta semana? Necesita al menos 3 de las 4 semanas anteriores con datos.
export function loadFlag(rows) {
  const cur = rows[rows.length - 1], prev = rows.slice(-5, -1).filter((w) => w.total > 0);
  if (prev.length < 3 || !cur.total) return { cur, avg: null, ratio: null, spike: false };
  const avg = prev.reduce((a, w) => a + w.total, 0) / prev.length, ratio = cur.total / avg;
  return { cur, avg: Math.round(avg), ratio: Math.round(ratio * 100) / 100, spike: ratio >= SPIKE };
}
export const fmtLoad = (x) => Math.round(x).toLocaleString('es-MX');

// Barras de las últimas semanas (cancha + gym).
export function loadChart(rows) {
  const max = Math.max(1, ...rows.map((w) => w.total));
  const W = 320, H = 120, bw = W / rows.length;
  const bars = rows.map((w, i) => {
    const hc = (w.cancha / max) * (H - 26), hg = (w.gym / max) * (H - 26), x = i * bw + 6, last = i === rows.length - 1;
    return `<rect x="${x}" y="${H - 18 - hc}" width="${bw - 12}" height="${hc}" rx="3" class="ld-c${last ? ' cur' : ''}"/>`
      + `<rect x="${x}" y="${H - 18 - hc - hg}" width="${bw - 12}" height="${hg}" rx="3" class="ld-g"/>`
      + `<text x="${x + (bw - 12) / 2}" y="${H - 4}" text-anchor="middle" class="ld-t">${fmtDate(w.ws, { day: 'numeric', month: 'short' })}</text>`;
  }).join('');
  return h('figure', { class: 'ld-fig', style: { margin: 0 } },
    h('div', { html: `<svg viewBox="0 0 ${W} ${H}" class="ld-svg" role="img" aria-label="Carga de las últimas ${rows.length} semanas">${bars}</svg>` }),
    h('figcaption', { class: 'row-sub' }, h('span', { class: 'ld-key c' }), ' Entrenos  ', h('span', { class: 'ld-key g' }), ' Gym. Cada barra es una semana (de lunes a domingo).'));
}

// ---------- jugador: «¿qué tan pesado fue?» ----------
// El último entreno hecho (o que ya terminó hoy) de los últimos 3 días en que estuvo y aún no contesta.
export function pendingRpe(me) {
  if (!me || !sql39Ready()) return null;
  const now = Date.now(), from = addDays(todayStr(), -3);
  const mine = new Set((state.data.sessionRpe || []).filter((r) => r.player_id === me.id).map((r) => r.session_id));
  const was = (s) => { const a = state.data.attendance.find((x) => x.session_id === s.id && x.player_id === me.id); return !a || a.status === 'presente' || a.status === 'retardo'; };
  const ended = (s) => {
    if (s.status === 'hecha') return true;
    if (s.session_date !== todayStr() || !s.start_time || s.status === 'cancelada') return false;
    const st = new Date(`${s.session_date}T${String(s.start_time).slice(0, 5)}:00`).getTime();
    return now > st + (Number(s.minutes) || 90) * 60000;
  };
  return state.data.sessions.filter((s) => s.session_date >= from && s.session_date <= todayStr() && s.status !== 'cancelada' && ended(s) && was(s) && !mine.has(s.id))
    .sort((a, b) => b.session_date.localeCompare(a.session_date))[0] || null;
}
export function rpeCard(me, { readonly = false } = {}) {
  const s = pendingRpe(me);
  if (!s) return null;
  const pick = (v) => {
    if (readonly) { toast('En la vista previa no se guarda'); return; }
    add('sessionRpe', { player_id: me.id, session_id: s.id, rpe: v, minutes: Number(s.minutes) || 90 });
    toast(`Guardado: ${v}, ${RPE_SCALE[v].toLowerCase()}. ¡Gracias!`);
  };
  return h('section', { class: 'panel stack rpe-card' },
    h('div', {}, h('div', { class: 'row-sub' }, `Entreno del ${fmtDate(s.session_date, { weekday: 'long', day: 'numeric', month: 'long' })}`),
      h('h2', { style: { margin: 0 } }, '¿Qué tan pesado fue para ti?')),
    h('div', { class: 'rpe-grid', role: 'group', 'aria-label': 'Esfuerzo del 0 al 10' },
      Array.from({ length: 11 }, (_, v) => h('button', { type: 'button', class: `rpe-b r${v}`, onclick: () => pick(v), 'aria-label': `${v}: ${RPE_SCALE[v]}` }, h('b', {}, String(v)), h('span', {}, RPE_SCALE[v])))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Piensa en todo el entreno, no solo en el final. 0 es descanso y 10 lo más duro que puedes. Solo lo ven tú y tu entrenador.'));
}
// Línea corta para el jugador: su carga de esta semana.
export function myLoadLine(me) {
  if (!me || !sql39Ready()) return null;
  const rows = weeklyLoads(me.id, 5), f = loadFlag(rows), prev = rows[rows.length - 2];
  if (!f.cur.total && !prev.total) return null;
  return h('p', { class: 'row-sub', style: { margin: 0 } }, `Tu carga esta semana: ${fmtLoad(f.cur.total)}${prev.total ? ` (la pasada: ${fmtLoad(prev.total)})` : ''}. Carga = esfuerzo × minutos.`);
}

// ---------- entrenador ----------
export function loadSection(p) {
  const out = h('div', { class: 'stack' });
  if (!sql39Ready()) return note('Para ver la carga semanal, corre en Supabase el bloque «v3.9» de sql/instalar.sql.', 'warn');
  const rows = weeklyLoads(p.id), f = loadFlag(rows);
  if (!rows.some((w) => w.total)) return note(`Todavía no hay datos. Después de cada entreno, ${p.name} contesta en su Inicio «¿Qué tan pesado fue?» (0 a 10). El gym cuenta si registra el esfuerzo.`);
  out.append(sectionTitle('Carga semanal', f.spike ? h('span', { class: 'chip warn' }, `Subió ${Math.round((f.ratio - 1) * 100)}%`) : null),
    loadChart(rows),
    h('p', { style: { margin: 0 } }, `Esta semana: ${fmtLoad(f.cur.total)}${f.avg ? ` · promedio de las 4 anteriores: ${fmtLoad(f.avg)}` : ''}.`),
    f.spike ? note(`Esta semana lleva ${f.ratio} veces su promedio. Platica con ${p.name}: ¿cómo se siente, duerme bien, le duele algo? Si hace falta, baja el volumen unos días.`, 'warn') : null,
    h('details', {}, h('summary', {}, 'Cómo se calcula'),
      h('p', { class: 'row-sub' }, 'Carga = esfuerzo (0 a 10) × minutos, de cada entreno y de cada sesión de gym (método de Foster). Se compara la semana actual con el promedio de las 4 anteriores; 1.5 veces o más sale como aviso. Es una señal para platicar con el jugador: los estudios no muestran que esa razón prediga lesiones.')),
    h('div', { class: 'rows' }, (state.data.sessionRpe || []).filter((r) => r.player_id === p.id).map((r) => ({ r, s: sessionById(r.session_id) })).filter((x) => x.s)
      .sort((a, b) => b.s.session_date.localeCompare(a.s.session_date)).slice(0, 8).map(({ r, s }) =>
        h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, `${r.rpe} · ${RPE_SCALE[r.rpe] || ''}`), h('span', { class: 'row-sub' }, `${s.title || 'Entrenamiento'} · ${fmtDate(s.session_date)} · ${r.minutes || s.minutes} min`)),
          h('span', { class: 'row-end' }, h('strong', {}, fmtLoad(r.rpe * (r.minutes || s.minutes || 0))))))));
  return out;
}
// Quién subió mucho esta semana (para Hoy y la pantalla del equipo).
export function teamLoads() {
  return players().map((p) => ({ p, rows: weeklyLoads(p.id) })).map((x) => ({ ...x, f: loadFlag(x.rows) }));
}
export function spikes() { return sql39Ready() ? teamLoads().filter((x) => x.f.spike) : []; }

export default function carga() {
  if (!sql39Ready()) return { title: 'Carga semanal', back: '#/mas', el: h('div', { class: 'page' }, note('Para ver la carga semanal, corre en Supabase el bloque «v3.9» de sql/instalar.sql (SQL Editor → pega → Run).', 'bad')) };
  const list = teamLoads().sort((a, b) => (b.f.ratio || 0) - (a.f.ratio || 0) || b.f.cur.total - a.f.cur.total);
  const answered = new Set((state.data.sessionRpe || []).map((r) => r.player_id));
  const last = state.data.sessions.filter((s) => s.status === 'hecha').sort((a, b) => b.session_date.localeCompare(a.session_date))[0];
  const lastN = last ? (state.data.sessionRpe || []).filter((r) => r.session_id === last.id).length : 0;
  const el = h('div', { class: 'page' },
    h('section', { class: 'panel stack' },
      h('p', { style: { margin: 0 } }, 'Después de cada entreno, cada jugador contesta en su Inicio qué tan pesado fue (0 a 10). Carga = esfuerzo × minutos, más su gym. La semana va de lunes a domingo.'),
      last ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Último entreno (${fmtDate(last.session_date)}): contestaron ${lastN}.`) : null),
    list.some((x) => x.f.spike) ? note('Los primeros de la lista subieron mucho su carga esta semana (1.5 veces o más su promedio de las 4 anteriores). Es una señal para platicar con ellos, no un diagnóstico.', 'warn') : null,
    list.length ? h('div', { class: 'rows' }, list.map(({ p, f }) => h('a', { class: 'row', href: `#/jugador/${p.id}/carga` }, jersey(p),
      h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, f.cur.total ? `Esta semana ${fmtLoad(f.cur.total)}${f.avg ? ` · promedio ${fmtLoad(f.avg)}` : ''}` : answered.has(p.id) ? 'Sin carga esta semana' : 'Aún no contesta ninguno')),
      h('span', { class: 'row-end' }, f.ratio ? h('span', { class: `chip ${f.spike ? 'warn' : f.ratio < 0.6 ? 'info' : 'ok'}` }, `×${f.ratio}`) : null, ic('chevron-right', 18)))))
      : empty('Sin jugadores', null));
  return { title: 'Carga semanal', sub: 'Esfuerzo de cada entreno y del gym', back: '#/mas', el };
}
