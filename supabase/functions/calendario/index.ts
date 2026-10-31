// Remate · función "calendario" (Supabase Edge Function).
// Entrega el calendario del equipo en formato iCalendar (.ics) para suscribirse desde el celular:
//   https://<proyecto>.supabase.co/functions/v1/calendario?t=<enlace secreto del equipo>
// Incluye entrenamientos publicados, partidos y torneos (desde 30 días atrás). No incluye nombres de jugadores.
// Se despliega SIN verificación de JWT, porque las apps de calendario no pueden iniciar sesión: la protege el enlace secreto.
import { createClient } from 'npm:@supabase/supabase-js@2';

const TZ = 'America/Mexico_City';
const VTIMEZONE = ['BEGIN:VTIMEZONE', `TZID:${TZ}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0600', 'TZOFFSETTO:-0600', 'TZNAME:CST', 'END:STANDARD', 'END:VTIMEZONE'];
const KINDS: Record<string, string> = { amistoso: 'Amistoso', liga: 'Liga', torneo: 'Torneo', entrenamiento: 'Partido de práctica' };

const esc = (s: unknown) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Líneas de máximo 75 bytes (regla de iCalendar).
function fold(line: string) {
  const enc = new TextEncoder(); const out: string[] = []; let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const d8 = (s: string) => s.replaceAll('-', '');
const addDays = (s: string, n: number) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function localPlus(date: string, time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const t = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m + minutes));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`;
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

type Ev = { uid: string; summary: string; date: string; end?: string | null; time?: string | null; minutes?: number; location?: string; desc?: string; cancelled?: boolean };
function vevent(e: Ev) {
  const L = ['BEGIN:VEVENT', `UID:${e.uid}@remate`, `DTSTAMP:${stamp()}`];
  if (e.time) {
    L.push(`DTSTART;TZID=${TZ}:${localPlus(e.date, e.time, 0)}`, `DTEND;TZID=${TZ}:${localPlus(e.date, e.time, e.minutes || 90)}`);
  } else {
    L.push(`DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${d8(addDays(e.end || e.date, 1))}`);
  }
  L.push(`SUMMARY:${esc(e.summary)}`);
  if (e.location) L.push(`LOCATION:${esc(e.location)}`);
  if (e.desc) L.push(`DESCRIPTION:${esc(e.desc)}`);
  if (e.cancelled) L.push('STATUS:CANCELLED');
  else L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.summary)}`, `TRIGGER:${e.time ? '-PT60M' : '-PT15H'}`, 'END:VALARM');
  L.push('END:VEVENT');
  return L;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = (url.searchParams.get('t') || '').trim();
  const text = (body: string, status = 200, type = 'text/plain; charset=utf-8') => new Response(body, { status, headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  if (!/^[A-Za-z0-9]{32,80}$/.test(token)) return text('Enlace de calendario no válido.', 404);
  try {
    let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (k.default) secret = k.default; } catch { /* sin llaves nuevas */ }
    const db = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: feed, error } = await db.from('calendar_feeds').select('group_id, active').eq('token', token).maybeSingle();
    if (error) return text('El calendario todavía no está listo: falta correr el SQL de la versión 3.4 en Supabase.', 503);
    if (!feed || !feed.active) return text('Este enlace de calendario ya no existe. Pídele a tu entrenador el nuevo.', 404);
    const gid = feed.group_id, from = addDays(new Date().toISOString().slice(0, 10), -30);
    const [{ data: g }, { data: ss }, { data: ms }, tr] = await Promise.all([
      db.from('groups').select('name, settings').eq('id', gid).maybeSingle(),
      db.from('sessions').select('id, session_date, start_time, minutes, title, status, published').eq('group_id', gid).eq('published', true).gte('session_date', from).order('session_date').limit(300),
      db.from('matches').select('id, match_date, rival, venue, kind, status, note, tournament_id').eq('group_id', gid).gte('match_date', from).order('match_date').limit(300),
      db.from('tournaments').select('id, name, venue, start_date, end_date, note').eq('group_id', gid).gte('start_date', addDays(from, -30)).order('start_date').limit(100),
    ]);
    const team = g?.name || 'Mi equipo', st = (g?.settings || {}) as Record<string, unknown>;
    const tours = new Map((tr.data || []).map((t) => [t.id, t]));
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Remate//Calendario del equipo//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(`Remate · ${team}`)}`, `X-WR-TIMEZONE:${TZ}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H', ...VTIMEZONE];
    for (const s of ss || []) {
      const time = String(s.start_time || st.start || '').slice(0, 5) || null;
      L.push(...vevent({ uid: `s-${s.id}`, summary: `${s.status === 'cancelada' ? 'Cancelado: ' : ''}${s.title || 'Entrenamiento'} · ${team}`, date: s.session_date,
        time: /^\d\d:\d\d$/.test(time || '') ? time : null, minutes: Number(s.minutes) || Number(st.minutes) || 90, desc: 'Entrenamiento de voleibol. El plan está en Remate.', cancelled: s.status === 'cancelada' }));
    }
    for (const m of ms || []) {
      const t = m.tournament_id ? tours.get(m.tournament_id) : null;
      L.push(...vevent({ uid: `m-${m.id}`, summary: `Partido contra ${m.rival}`, date: m.match_date, location: m.venue || t?.venue || '',
        desc: [t ? `Torneo: ${t.name}` : KINDS[m.kind] || '', m.note || ''].filter(Boolean).join('\n') }));
    }
    for (const t of tr.data || []) L.push(...vevent({ uid: `t-${t.id}`, summary: `Torneo: ${t.name}`, date: t.start_date, end: t.end_date, location: t.venue || '', desc: t.note || '' }));
    L.push('END:VCALENDAR');
    return text(L.map(fold).join('\r\n') + '\r\n', 200, 'text/calendar; charset=utf-8');
  } catch (e) {
    return text(`No se pudo armar el calendario: ${String((e as Error)?.message || e)}`, 500);
  }
});
