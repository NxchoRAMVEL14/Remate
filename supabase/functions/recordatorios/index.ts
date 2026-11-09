// Remate · función "recordatorios" (Supabase Edge Function), v3.9 + v3.21 (+ CORS en la 3.23.1).
// La llama pg_cron cada 15 minutos (ver sql/recordatorios.sql). Manda un aviso al celular:
//  - de cada entrenamiento publicado, unas horas antes (Ajustes → Recordatorios; 2 h si no eliges),
//  - de cada partido (no tienen hora): a las 8:00 de ese día.
//  v3.21:
//  - gym: a las 4 pm en los días de gym de cada jugador con rutina (la que le dio el entrenador o la última que registró),
//    si ese día todavía no registra su sesión. Los días salen igual que en la app: primero los que no hay entreno.
//  - 2 faltas seguidas: al jugador que faltó (sin justificar) a los 2 últimos entrenos, una sola vez, de 9 am a 8 pm.
//  - resumen del lunes: al entrenador, el lunes de 8 am a 12 pm: la semana pasada y lo que viene.
//  Las tres se pueden apagar en Ajustes. Body { ping: true } solo contesta la versión (lo usa «Estado de las notificaciones»).
//  Para no correr SQL nuevo, los avisos nuevos se apuntan en reminders_sent con kind 'sesion' y un id calculado
//  (SHA-1 de un texto como «gym|jugador|fecha»), que nunca coincide con el id de un entreno real.
// Cada recordatorio se manda una sola vez (tabla reminders_sent). Usa las mismas llaves que la función "avisos".
// Va sin «Verify JWT»: si alguien la llama de más, no pasa nada, porque solo manda lo que toca y una vez.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

// v3.23.1: CORS, para que «Estado de las notificaciones» (desde el celular) pueda preguntarle si existe.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
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
const VERSION = '3.23.1';
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();          // 0 domingo … 6 sábado
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// id estable (formato uuid) para apuntar avisos que no son de un entreno ni de un partido
async function keyId(text: string) {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`remate|${text}`))).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; b[8] = (b[8] & 0x3f) | 0x80;
  const x = [...b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
// Igual que weekPlan() de la app (js/content/gym.js): reparte n días de gym, primero en los días sin entreno.
function weekPlan(n: number, train: number[] = []) {
  const week = [1, 2, 3, 4, 5, 6], off = week.filter((d) => !train.includes(d));
  let chosen: number[] = [];
  if (n === 1) chosen = off.length ? [off[Math.floor((off.length - 1) / 2)]] : [];
  else if (off.length >= n) for (let i = 0; i < n; i++) chosen.push(off[Math.round((i * (off.length - 1)) / (n - 1))]);
  else chosen = [...off];
  chosen = [...new Set(chosen)];
  for (const d of week) { if (chosen.length >= n) break; if (!chosen.includes(d)) chosen.push(d); }
  return chosen;
}
const isSpec = (s: Row | null) => !!(s && typeof s === 'object' && typeof s.goal === 'string' && s.goal && Number(s.days) > 0);

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const reqBody = await req.json().catch(() => ({}));
    if (reqBody?.ping) return json({ pong: true, version: VERSION });
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
      const tz = st.tz || 'America/Mexico_City', hours = Math.min(6, Math.max(1, Number(st.reminder_hours) || 2));
      const now = wallNow(tz), tomorrow = addDay(now.date, 1);
      const due: { kind: 'sesion' | 'partido'; id: string; title: string; body: string; url: string; team?: string | null; match?: string; only?: string[]; owner?: boolean }[] = [];
      const on = st.reminders !== false;

      const { data: ses } = await admin.from('sessions').select('id, session_date, start_time, title, published, status')
        .eq('group_id', g.id).eq('published', true).eq('status', 'planeada').in('session_date', [now.date, tomorrow]);
      for (const s of ses || []) {
        const start = s.start_time ? wall(s.session_date, hhmm(s.start_time)) : wall(s.session_date, '08:00') + hours * 60;
        const left = start - now.mins;
        if (on && left > 0 && left <= hours * 60) {
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
        if (on && ok) {
          due.push({ kind: 'partido', id: m.id, title: g.name, url: `#/partido/${m.id}`, team: m.team || null, match: m.id,
            body: `Hoy juegan contra ${m.rival}${at ? ` a las ${at}` : ''}${m.venue ? ` en ${m.venue}` : ''}. Revisa la convocatoria y llega a tiempo.` });
        }
      }
      // ---------- v3.21 ----------
      const { data: pls } = await admin.from('players').select('*').eq('group_id', g.id).eq('active', true);
      const apart = new Set(Array.isArray(st.apart) ? st.apart : []);
      const team = (pls || []).filter((p: Row) => !apart.has(p.id));
      const train: number[] = Array.isArray(st.days) ? st.days.map(Number) : [];
      const wd = weekday(now.date), inWin = (a: string, b: string) => now.mins >= wall(now.date, a) && now.mins < wall(now.date, b);

      // gym en sus días (4 pm a 9 pm, si no ha registrado hoy)
      if (on && st.gym_players !== false && st.reminders_gym !== false && inWin('16:00', '21:00') && team.length) {
        const ids = team.map((p: Row) => p.id);
        const { data: gl } = await admin.from('gym_logs').select('player_id, done_on, plan').in('player_id', ids).gte('done_on', addDay(now.date, -28)).order('done_on', { ascending: false })
          .then((r) => (r.error ? { data: [] } : r));
        for (const p of team) {
          const mine = (gl || []).filter((l: Row) => l.player_id === p.id);
          const spec = isSpec(p.gym_plan) ? p.gym_plan : mine.find((l: Row) => isSpec(l.plan))?.plan;
          if (!spec || mine.some((l: Row) => l.done_on === now.date)) continue;
          if (!weekPlan(Math.min(6, Number(spec.days)), train).includes(wd)) continue;
          due.push({ kind: 'sesion', id: await keyId(`gym|${p.id}|${now.date}`), title: g.name, url: '#/gym', only: [p.id],
            body: `Hoy te toca gym. Calienta 5 minutos, sigue tu rutina y registra tus cargas en Remate. 💪` });
        }
      }

      // 2 faltas seguidas (sin justificar) en los 2 últimos entrenos hechos de los últimos 10 días
      if (on && st.reminders_faltas !== false && inWin('09:00', '20:00') && team.length) {
        const { data: done } = await admin.from('sessions').select('id, session_date').eq('group_id', g.id).eq('status', 'hecha')
          .lte('session_date', now.date).order('session_date', { ascending: false }).limit(2);
        if ((done || []).length === 2 && done![0].session_date >= addDay(now.date, -10)) {
          const { data: att } = await admin.from('attendance').select('session_id, player_id, status').in('session_id', done!.map((x: Row) => x.id));
          const conv = st.conv || {};
          const { data: nx } = await admin.from('sessions').select('session_date, start_time').eq('group_id', g.id).eq('status', 'planeada').eq('published', true)
            .gt('session_date', now.date).order('session_date').limit(1);
          const next = nx?.[0] ? ` El próximo es el ${DAYS[weekday(nx[0].session_date)]}${nx[0].start_time ? ` a las ${hhmm(nx[0].start_time)}` : ''}.` : '';
          for (const p of team) {
            const both = done!.every((s: Row) => (!Array.isArray(conv[s.id]) || conv[s.id].includes(p.id))
              && (att || []).some((a: Row) => a.session_id === s.id && a.player_id === p.id && a.status === 'falta'));
            if (!both) continue;
            due.push({ kind: 'sesion', id: await keyId(`faltas|${p.id}|${done![0].id}`), title: g.name, url: '#/entrenos', only: [p.id],
              body: `¡Te extrañamos en los 2 últimos entrenos! Si pasa algo, avísale a tu entrenador.${next} Te esperamos.` });
          }
        }
      }

      // resumen del lunes para el entrenador
      if (st.reminders_resumen !== false && wd === 1 && inWin('08:00', '12:00')) {
        const from = addDay(now.date, -7), to = addDay(now.date, -1), end = addDay(now.date, 6);
        const { data: past } = await admin.from('sessions').select('id').eq('group_id', g.id).eq('status', 'hecha').gte('session_date', from).lte('session_date', to);
        const pid = (past || []).map((x: Row) => x.id);
        const { data: att } = pid.length ? await admin.from('attendance').select('player_id, status').in('session_id', pid) : { data: [] };
        const marks = (att || []).length, came = (att || []).filter((a: Row) => a.status === 'presente' || a.status === 'retardo').length;
        const { data: plan } = await admin.from('sessions').select('id').eq('group_id', g.id).eq('status', 'planeada').gte('session_date', now.date).lte('session_date', end);
        const { data: mw } = await admin.from('matches').select('rival, match_date').eq('group_id', g.id).neq('status', 'terminado').gte('match_date', now.date).lte('match_date', end).order('match_date');
        const n = (k: number, a: string, b: string) => `${k} ${k === 1 ? a : b}`;
        const parts = [
          pid.length ? `Semana pasada: ${n(pid.length, 'entreno', 'entrenos')}${marks ? `, asistencia ${Math.round((came / marks) * 100)}%` : ''}.` : 'Semana pasada: sin entrenos marcados como hechos.',
          `Esta semana: ${n((plan || []).length, 'entreno planeado', 'entrenos planeados')}${(mw || []).length ? ` y ${n(mw!.length, 'partido', 'partidos')} (${mw!.slice(0, 3).map((m: Row) => m.rival).join(', ')})` : ''}.`,
        ];
        due.push({ kind: 'sesion', id: await keyId(`resumen|${g.id}|${now.date}`), title: `${g.name} · tu lunes`, url: '#/hoy', owner: true, body: `${parts.join(' ')} ¡Buena semana!` });
      }

      if (!due.length) continue;

      const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, keys').eq('group_id', g.id);
      const targetsAll = (subs || []).filter((x: Row) => x.user_id !== g.owner_id);
      const ownerSubs = (subs || []).filter((x: Row) => x.user_id === g.owner_id);
      // Jugador de cada celular (para los partidos de un equipo y los que dijeron que no van).
      const { data: devs } = await admin.from('player_devices').select('user_id, player_id').then((r) => (r.error ? { data: [] } : r));
      const playerOf = new Map<string, Row>();
      for (const p of pls || []) if (p.user_id) playerOf.set(p.user_id, p);
      for (const d of devs || []) { const p = (pls || []).find((x: Row) => x.id === d.player_id); if (p) playerOf.set(d.user_id, p); }

      for (const r of due) {
        const { error: claim } = await admin.from('reminders_sent').insert({ kind: r.kind, ref_id: r.id });
        if (claim) continue;                                   // ya se mandó (o la tabla no existe todavía)
        let targets = targetsAll;
        if (r.owner) targets = ownerSubs;
        else if (r.only) targets = targetsAll.filter((x: Row) => r.only!.includes(playerOf.get(x.user_id)?.id));
        else if (r.kind === 'partido') {
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
