// Insignias: reconocen constancia y logros. Se calculan con lo que ya hay (asistencia, retos, casa, partidos, pruebas).
import { attendanceFor } from './calc.js';
import { metrics, addCounts } from './match-calc.js';
import { weekStart } from './lab-calc.js';
import { addDays, todayStr } from './util.js';
import { testTrend } from './content/pruebas.js';

// Cada familia tiene tres escalones. unit sirve para el texto del avance.
export const FAMILIES = [
  { id: 'racha', icon: 'flame', unit: 'entrenos seguidos', tiers: [[5, 'Constante'], [10, 'Imparable'], [20, 'De hierro']] },
  { id: 'casa', icon: 'house', unit: 'semanas seguidas entrenando en casa', tiers: [[2, 'Tarea hecha'], [4, 'Disciplina'], [8, 'Hábito de campeón']] },
  { id: 'retos', icon: 'trophy', unit: 'retos aprobados', tiers: [[1, 'Primer reto'], [5, 'Retador'], [10, 'Leyenda de retos']] },
  { id: 'nivel', icon: 'flag', unit: 'exámenes aprobados', tiers: [[1, 'Subí de nivel'], [2, 'Escalador'], [4, 'Cima']] },
  { id: 'partidos', icon: 'volleyball', unit: 'partidos jugados', tiers: [[1, 'Debut'], [5, 'Fogueado'], [10, 'Veterano']] },
  { id: 'saque', icon: 'zap', unit: 'aces', tiers: [[3, 'Buen saque'], [10, 'Saque bomba'], [25, 'Rey del ace']] },
  { id: 'recepcion', icon: 'shield', unit: 'recepciones perfectas', tiers: [[10, 'Buenas manos'], [30, 'Pase perfecto'], [60, 'Muro de recepción']] },
  { id: 'ataque', icon: 'target', unit: 'remates punto', tiers: [[5, 'Rematador'], [20, 'Martillo'], [50, 'Cañonero']] },
  { id: 'bloqueo', icon: 'shield-check', unit: 'bloqueos punto', tiers: [[3, 'Manos arriba'], [10, 'Muralla'], [25, 'Gran muralla']] },
  { id: 'salto', icon: 'arrow-up', unit: 'cm más de salto', tiers: [[2, 'Más alto'], [5, 'Resorte'], [8, 'Despegue']] },
];

// Semanas seguidas (hasta esta o la pasada) con al menos 2 días registrados en casa.
export function homeWeeks(logs) {
  const days = new Map();
  for (const l of logs) { const w = weekStart(l.done_on); if (!days.has(w)) days.set(w, new Set()); days.get(w).add(l.done_on); }
  const good = (w) => (days.get(w)?.size || 0) >= 2;
  let w = weekStart(todayStr()); if (!good(w)) w = addDays(w, -7);
  let n = 0; while (good(w)) { n++; w = addDays(w, -7); }
  return n;
}

export function badgeValues(p, d, st) {
  const att = attendanceFor(p.id, d.sessions, d.attendance, st);
  const done = new Set(d.matches.filter((m) => m.status === 'terminado').map((m) => m.id));
  const ms = d.matchStats.filter((s) => s.player_id === p.id && done.has(s.match_id));
  const c = addCounts(...ms.map((s) => s.counts)), m = metrics(c);
  const jump = testTrend(d.playerTests.filter((t) => t.player_id === p.id), 'cmj');
  return {
    racha: att.streak,
    casa: homeWeeks(d.homeLogs.filter((l) => l.player_id === p.id)),
    retos: d.claims.filter((x) => x.player_id === p.id && x.status === 'aprobada').length,
    nivel: d.exams.filter((x) => x.player_id === p.id && x.passed).length,
    partidos: ms.length,
    saque: m.aces, recepcion: Number(c.rc_3) || 0, ataque: m.kills, bloqueo: m.blocks,
    salto: jump && jump.d > 0 ? Math.floor(jump.d) : 0,
  };
}

// Lista de insignias ganadas (la más alta de cada familia) y las siguientes por conseguir.
export function badgesFor(p, d, st) {
  const v = badgeValues(p, d, st);
  const earned = [], next = [];
  for (const f of FAMILIES) {
    const val = v[f.id] || 0;
    const got = f.tiers.filter(([n]) => val >= n);
    if (got.length) earned.push({ id: f.id, icon: f.icon, name: got[got.length - 1][1], tier: got.length, desc: `${val} ${f.unit}` });
    const nx = f.tiers.find(([n]) => val < n);
    if (nx) next.push({ id: f.id, icon: f.icon, name: nx[1], need: nx[0], have: val, unit: f.unit, frac: val / nx[0] });
  }
  next.sort((a, b) => b.frac - a.frac);
  return { earned, next };
}
