// Hora de los partidos y horarios de los torneos (v3.13).
// Un torneo largo (una liga) guarda en qué días y a qué horas puede haber partidos; de ahí salen los próximos
// horarios para elegir con un toque. Las horas van como 'HH:MM' (24 h); en pantalla, '8:00 pm'.
import { todayStr, addDays, parseDate, fmtDate } from './util.js';

export const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DOW_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const hhmm = (t) => { const s = String(t || '').slice(0, 5); return HHMM.test(s) ? s : null; };
export const toMin = (t) => { const s = hhmm(t); if (!s) return null; const [a, b] = s.split(':').map(Number); return a * 60 + b; };
export const fromMin = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
export const addMin = (t, m) => (toMin(t) == null ? null : fromMin(toMin(t) + m));
// Duración que se propone: 2 de 3 sets ≈ 1 hora; 3 de 5 ≈ 1 h 45.
export const defaultMinutes = (bestOf) => (Number(bestOf) === 5 ? 105 : 60);

// '20:00' → '8:00 pm'
export function timeText(t) {
  const s = hhmm(t); if (!s) return '';
  let [a, b] = s.split(':').map(Number);
  const pm = a >= 12; a = a % 12 || 12;
  return `${a}:${String(b).padStart(2, '0')} ${pm ? 'pm' : 'am'}`;
}
// La hora de un partido: '8:00 pm' o '8:00 a 9:00 pm'.
export function matchTime(m) {
  const a = hhmm(m?.start_time), b = hhmm(m?.end_time);
  if (!a) return '';
  if (!b) return timeText(a);
  const ta = timeText(a), tb = timeText(b);
  return ta.slice(-2) === tb.slice(-2) ? `${ta.slice(0, -3)} a ${tb}` : `${ta} a ${tb}`;
}
export const matchMinutes = (m) => {
  const a = toMin(m?.start_time), b = toMin(m?.end_time);
  if (a == null) return null;
  if (b == null) return defaultMinutes(m?.best_of);
  return ((b - a) + 1440) % 1440 || defaultMinutes(m?.best_of);
};

export function normSchedule(s) {
  const days = [...new Set((s?.days || []).map(Number).filter((d) => d >= 0 && d <= 6))].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
  const times = [...new Set((s?.times || []).map(hhmm).filter(Boolean))].sort();
  const minutes = Math.min(240, Math.max(20, Math.round(Number(s?.minutes) || 60)));
  return { days, times, minutes };
}
export const hasSchedule = (t) => { const s = normSchedule(t?.schedule); return s.days.length > 0 && s.times.length > 0; };
// 'Martes y jueves, 8:00 y 9:00 pm (1 h)'
export function scheduleText(t) {
  const s = normSchedule(t?.schedule);
  if (!s.days.length || !s.times.length) return '';
  const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] || '');
  const ts = s.times.map(timeText), samePm = ts.every((x) => x.slice(-2) === ts[0].slice(-2));
  const times = samePm && ts.length > 1 ? `${list(ts.map((x) => x.slice(0, -3)))} ${ts[0].slice(-2)}` : list(ts);
  const dur = s.minutes % 60 ? `${Math.floor(s.minutes / 60) ? `${Math.floor(s.minutes / 60)} h ` : ''}${s.minutes % 60} min` : `${s.minutes / 60} h`;
  const d = list(s.days.map((x) => DOW[x].toLowerCase()));
  return `${d.charAt(0).toUpperCase()}${d.slice(1)}, ${times} (${dur} por partido)`;
}

// Próximos horarios del torneo (dentro de sus fechas), con los partidos que ya ocupan cada uno.
export function upcomingSlots(t, matches = [], { from = todayStr(), weeks = 6, max = 40 } = {}) {
  const s = normSchedule(t?.schedule);
  if (!s.days.length || !s.times.length) return [];
  const start = t.start_date && t.start_date > from ? t.start_date : from;
  const last = t.end_date && t.end_date < addDays(start, weeks * 7) ? t.end_date : addDays(start, weeks * 7 - 1);
  const out = [];
  for (let d = start; d <= last && out.length < max; d = addDays(d, 1)) {
    const dow = parseDate(d).getDay();
    if (!s.days.includes(dow)) continue;
    for (const time of s.times) {
      out.push({ date: d, time, end: addMin(time, s.minutes), taken: matches.filter((m) => m.match_date === d && hhmm(m.start_time) === time) });
      if (out.length >= max) break;
    }
  }
  return out;
}
export const slotLabel = (x) => `${fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${timeText(x.time)}`;
