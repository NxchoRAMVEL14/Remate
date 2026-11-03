// Remate · función "recordatorios" (Supabase Edge Function), v3.9.
// La llama pg_cron cada 15 minutos (ver sql/recordatorios.sql). Manda un aviso al celular:
//  - de cada entrenamiento publicado, unas horas antes (Ajustes → Recordatorios; 2 h si no eliges),
//  - de cada partido (no tienen hora): a las 8:00 de ese día.
// Cada recordatorio se manda una sola vez (tabla reminders_sent). Usa las mismas llaves que la función "avisos".
// Va sin «Verify JWT»: si alguien la llama de más, no pasa nada, porque solo manda lo que toca y una vez.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
type Row = Record<string, any>;

// Fecha y hora de pared en la zona del equipo, como minutos desde 1970 (sirve para comparar).
function wallNow(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, mins: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) / 60000 };
}
const wall = (date: string, time: string) => { const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number); return Date.UTC(y, m - 1, d, hh, mm) / 60000; };
const addDay = (date: string, n: number) => { const t = new Date(`${date}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const hhmm = (t: string) => String(t).slice(0, 5);

Deno.serve(async () => {
  try {
    let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (k.default) secret = k.default; } catch { /* sin llaves nuevas */ }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: cfg } = await admin.from('push_config').select('*').eq('id', 1).maybeSingle();
    if (!cfg) return json({ ok: true, note: 'Aún no hay llaves: primero activa las notificaciones en algún celular.' });
    webpush.setVapidDetails('mailto:avisos@remate.app', cfg.public_key, cfg.private_key);

    const { data: groups } = await admin.from('groups').select('id, owner_id, name, settings');
    const out: Row[] = [];
    for (const g of groups || []) {
      const st = g.settings || {};
      if (st.reminders === false) continue;
      const tz = st.tz || 'America/Mexico_City', hours = Math.min(6, Math.max(1, Number(st.reminder_hours) || 2));
      const now = wallNow(tz), tomorrow = addDay(now.date, 1);
      const due: { kind: 'sesion' | 'partido'; id: string; title: string; body: string; url: string; team?: string | null; match?: string }[] = [];

      const { data: ses } = await admin.from('sessions').select('id, session_date, start_time, title, published, status')
        .eq('group_id', g.id).eq('published', true).eq('status', 'planeada').in('session_date', [now.date, tomorrow]);
      for (const s of ses || []) {
        const start = s.start_time ? wall(s.session_date, hhmm(s.start_time)) : wall(s.session_date, '08:00') + hours * 60;
        const left = start - now.mins;
        if (left > 0 && left <= hours * 60) {
          due.push({ kind: 'sesion', id: s.id, title: g.name, url: '#/entrenos',
            body: s.start_time ? `Entreno ${s.session_date === now.date ? 'hoy' : 'mañana'} a las ${hhmm(s.start_time)}${s.title ? `: ${s.title}` : ''}. Llega a tiempo y con agua.` : `Hoy hay entreno${s.title ? `: ${s.title}` : ''}.` });
        }
      }
      // select('*'): funciona con o sin el SQL de la v3.13 (hora de los partidos).
      const { data: ms } = await admin.from('matches').select('*').eq('group_id', g.id).eq('match_date', now.date).neq('status', 'terminado');
      for (const m of ms || []) {
        // Con hora (v3.13): el aviso llega en las horas de anticipación que eligió el entrenador. Sin hora: de 8 am a 9 pm.
        const at = m.start_time ? hhmm(m.start_time) : '';
        const ok = at ? (() => { const left = wall(m.match_date, at) - now.mins; return left > 0 && left <= hours * 60; })()
          : now.mins >= wall(m.match_date, '08:00') && now.mins < wall(m.match_date, '21:00');
        if (ok) {
          due.push({ kind: 'partido', id: m.id, title: g.name, url: `#/partido/${m.id}`, team: m.team || null, match: m.id,
            body: `Hoy juegan contra ${m.rival}${at ? ` a las ${at}` : ''}${m.venue ? ` en ${m.venue}` : ''}. Revisa la convocatoria y llega a tiempo.` });
        }
      }
      if (!due.length) continue;

      const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, keys').eq('group_id', g.id);
      const targetsAll = (subs || []).filter((x: Row) => x.user_id !== g.owner_id);
      // Jugador de cada celular (para los partidos de un equipo y los que dijeron que no van).
      const { data: pls } = await admin.from('players').select('id, user_id, team, teams').eq('group_id', g.id);
      const { data: devs } = await admin.from('player_devices').select('user_id, player_id').then((r) => (r.error ? { data: [] } : r));
      const playerOf = new Map<string, Row>();
      for (const p of pls || []) if (p.user_id) playerOf.set(p.user_id, p);
      for (const d of devs || []) { const p = (pls || []).find((x: Row) => x.id === d.player_id); if (p) playerOf.set(d.user_id, p); }

      for (const r of due) {
        const { error: claim } = await admin.from('reminders_sent').insert({ kind: r.kind, ref_id: r.id });
        if (claim) continue;                                   // ya se mandó (o la tabla no existe todavía)
        let targets = targetsAll;
        if (r.kind === 'partido') {
          const { data: no } = await admin.from('match_rsvps').select('player_id').eq('match_id', r.match).eq('status', 'no');
          const skip = new Set((no || []).map((x: Row) => x.player_id));
          targets = targetsAll.filter((x: Row) => {
            const p = playerOf.get(x.user_id);
            if (!p) return true;                              // ayudantes y celulares sin jugador
            if (skip.has(p.id)) return false;
            return !r.team || p.team === r.team || (Array.isArray(p.teams) && p.teams.includes(r.team));
          });
        }
        const payload = JSON.stringify({ title: r.title, body: r.body, url: r.url });
        const res = await Promise.allSettled(targets.map((x: Row) => webpush.sendNotification({ endpoint: x.endpoint, keys: x.keys }, payload, { TTL: 60 * 60 * 6 })));
        const dead = targets.filter((_: Row, i: number) => { const q = res[i]; return q.status === 'rejected' && [404, 410].includes((q.reason as { statusCode?: number })?.statusCode ?? 0); }).map((x: Row) => x.id);
        if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
        const sent = res.filter((q) => q.status === 'fulfilled').length;
        await admin.from('reminders_sent').update({ sent }).eq('kind', r.kind).eq('ref_id', r.id);
        out.push({ group: g.id, kind: r.kind, id: r.id, sent });
      }
    }
    return json({ ok: true, sent: out });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
