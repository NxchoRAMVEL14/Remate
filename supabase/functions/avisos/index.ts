// Remate · función "avisos" (Supabase Edge Function).
// - action "key": devuelve la llave pública para que el celular active las notificaciones.
// - action "send": el entrenador del equipo manda un aviso a los celulares suscritos de su grupo.
// Las llaves del servidor se crean solas la primera vez y se guardan en la tabla push_config (nadie más la lee).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Llave de servidor: la nueva (SUPABASE_SECRET_KEYS) si existe; si no, la clásica service_role.
    let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (k.default) secret = k.default; } catch { /* sin llaves nuevas */ }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));

    let { data: cfg } = await admin.from('push_config').select('*').eq('id', 1).maybeSingle();
    if (!cfg) {
      const k = webpush.generateVAPIDKeys();
      await admin.from('push_config').insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey });
      ({ data: cfg } = await admin.from('push_config').select('*').eq('id', 1).maybeSingle());
    }
    if (!cfg) return json({ error: 'No se pudieron crear las llaves de notificaciones. ¿Ya corriste el SQL nuevo?' }, 500);
    if (body.action === 'key') return json({ publicKey: cfg.public_key });
    if (body.action !== 'send') return json({ error: 'Acción desconocida' }, 400);

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth?.user;
    if (!user) return json({ error: 'Tu sesión caducó. Vuelve a entrar.' }, 401);
    const { data: g } = await admin.from('groups').select('id, owner_id, name').eq('id', body.group_id).maybeSingle();
    if (!g || g.owner_id !== user.id) return json({ error: 'Solo el entrenador del equipo puede mandar avisos.' }, 403);

    webpush.setVapidDetails(`mailto:${user.email || 'avisos@example.com'}`, cfg.public_key, cfg.private_key);
    const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, keys').eq('group_id', g.id);
    const targets = (subs || []).filter((s) => s.user_id !== user.id);
    const payload = JSON.stringify({
      title: String(body.title || g.name).slice(0, 80),
      body: String(body.body || '').slice(0, 300),
      url: String(body.url || '').slice(0, 200),
    });
    const res = await Promise.allSettled(targets.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24 })));
    const dead = targets.filter((_, i) => {
      const r = res[i];
      return r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
    }).map((s) => s.id);
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
    return json({ sent: res.filter((r) => r.status === 'fulfilled').length, failed: res.filter((r) => r.status === 'rejected').length, removed: dead.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
