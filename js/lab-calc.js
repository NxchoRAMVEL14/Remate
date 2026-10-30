// Cálculos del laboratorio de salto (puros, sin pantalla).
import { parseDate, toStr, addDays, todayStr, diffDays } from './util.js';

export const TEST_KINDS = {
  cmj: 'Salto con contramovimiento (manos en la cadera)',
  cmj_arms: 'Salto con contramovimiento y brazos',
  sj: 'Salto desde sentadilla (sin rebote)',
  spike: 'Salto de remate (con aproximación)',
  block: 'Salto de bloqueo (sin aproximación)',
  drop: 'Salto en profundidad (drop jump)',
};
export const KIND_SHORT = { cmj: 'CMJ', cmj_arms: 'CMJ con brazos', sj: 'Desde sentadilla', spike: 'Remate', block: 'Bloqueo', drop: 'En profundidad' };
export const METHODS = { myjump: 'Celular con My Jump', sargent: 'Marca en la pared (Sargent)', mat: 'Tapete o plataforma', otro: 'Otro' };
export const NET_CM = { M: 243, F: 224 };                 // altura oficial de la red, varonil y femenil (FIVB)

// Con la marca en la pared se anota la altura que alcanzas; el salto es esa altura menos tu alcance de pie.
export const isTouch = (method) => method === 'sargent';
export const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null; };
export const best = (list) => { const a = (list || []).filter((x) => Number.isFinite(x)); return a.length ? Math.max(...a) : null; };
export const round1 = (x) => Math.round(x * 10) / 10;

// Índice de fuerza reactiva = altura del salto (m) / tiempo de contacto (s). Solo en salto en profundidad.
export function rsi(heightCm, contactMs) {
  if (!(heightCm > 0) || !(contactMs > 0)) return null;
  return Math.round(((heightCm / 100) / (contactMs / 1000)) * 100) / 100;
}

export const testsOf = (tests, kind) => tests.filter((t) => t.kind === kind).sort((a, b) => `${a.test_date}${a.created_at}`.localeCompare(`${b.test_date}${b.created_at}`));

export function summary(tests, kind) {
  const list = testsOf(tests, kind);
  if (!list.length) return null;
  const vals = list.map((t) => Number(t.height_cm));
  const first = vals[0], last = vals[vals.length - 1], top = Math.max(...vals);
  const tail = vals.slice(-3), avg3 = tail.reduce((a, b) => a + b, 0) / tail.length;
  return { n: list.length, first, last, best: top, avg3: round1(avg3), change: round1(last - first), changePct: first ? Math.round(((last - first) / first) * 1000) / 10 : null, firstDate: list[0].test_date, lastDate: list[list.length - 1].test_date };
}

// Cuánto varían tus intentos dentro de una misma prueba: cambios menores a esto pueden ser ruido de medición.
export function noise(tests) {
  const r = tests.slice().sort((a, b) => `${b.test_date}`.localeCompare(`${a.test_date}`)).filter((t) => (t.attempts || []).length >= 2).slice(0, 6)
    .map((t) => { const a = t.attempts.map(Number).filter(Number.isFinite); return a.length >= 2 ? (Math.max(...a) - Math.min(...a)) / 2 : null; }).filter((x) => x != null);
  return r.length ? round1(r.reduce((a, b) => a + b, 0) / r.length) : null;
}

// Alcance de remate: tu alcance de pie más el mejor salto de remate, contra la red.
export function attackReach(profile, tests, netCm) {
  const reach = num(profile?.reach_cm);
  const spike = summary(tests, 'spike');
  if (!reach) return { reach: null, touch: null, net: netCm, above: null, spike };
  const touch = spike ? round1(reach + spike.best) : null;
  return { reach, touch, net: netCm, above: touch != null ? round1(touch - netCm) : null, spike };
}

// ---------- carga semanal ----------
export function weekStart(dateStr) { const d = parseDate(dateStr); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return toStr(d); }
export function weeklyLoad(sessions) {
  const m = new Map();
  for (const s of sessions) {
    const k = weekStart(s.session_date);
    const w = m.get(k) || { week: k, sessions: 0, contacts: 0, rpeSum: 0, rpeN: 0, load: 0 };
    w.sessions++; w.contacts += Number(s.contacts) || 0;
    if (s.rpe) { w.rpeSum += s.rpe; w.rpeN++; w.load += s.rpe * (Number(s.minutes) || 0); }
    m.set(k, w);
  }
  return [...m.values()].map((w) => ({ ...w, avgRpe: w.rpeN ? Math.round((w.rpeSum / w.rpeN) * 10) / 10 : null })).sort((a, b) => b.week.localeCompare(a.week));
}

// Dos sesiones seguidas con molestia de 4 o más en la misma zona: bajar la carga de saltos y consultar.
export function painAlert(sessions) {
  const last = sessions.slice().sort((a, b) => `${b.session_date}${b.created_at}`.localeCompare(`${a.session_date}${a.created_at}`)).slice(0, 2);
  if (last.length < 2) return null;
  const [a, b] = last;
  return a.pain_zone && a.pain_zone === b.pain_zone && (a.pain_level ?? 0) >= 4 && (b.pain_level ?? 0) >= 4 ? { zone: a.pain_zone, level: Math.max(a.pain_level, b.pain_level) } : null;
}

// ---------- posición en el programa de 12 semanas ----------
export function programPosition(startDate, today = todayStr()) {
  if (!startDate) return null;
  const days = diffDays(today, startDate);
  if (days < 0) return { notStarted: true, startsIn: -days };
  const week = Math.floor(days / 7) + 1;
  if (week > 12) return { finished: true, week };
  return { week, block: Math.floor((week - 1) / 3), weekInBlock: ((week - 1) % 3) + 1, day: days };
}
export const programEnds = (startDate) => (startDate ? addDays(startDate, 12 * 7 - 1) : null);
