// Notificaciones en el celular (Web Push). La función "avisos" de Supabase guarda las llaves y envía.
import { client } from './cloud.js';
import { state, group } from './store.js';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const b64ToU8 = (s) => { const pad = '='.repeat((4 - (s.length % 4)) % 4); const b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

async function call(body) {
  const c = await client();
  const { data, error } = await c.functions.invoke('avisos', { body });
  if (error) {
    let msg = error.message || 'No se pudo contactar el servidor de avisos.';
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* sin detalle */ }
    throw new Error(/not found|404/i.test(msg) ? 'Falta instalar la función de avisos en Supabase (ver LEEME).' : msg);
  }
  return data;
}

async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) || null;
}

// 'unsupported' | 'install' (iPhone sin instalar) | 'denied' | 'on' | 'off'
export async function pushStatus() {
  if (state.mode !== 'cloud' || !pushSupported()) return isIOS() && !isStandalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSub()) ? 'on' : 'off';
}

export async function enablePush() {
  if (state.mode !== 'cloud') throw new Error('En el modo demo no hay notificaciones.');
  if (isIOS() && !isStandalone()) throw new Error('En iPhone primero instala Remate: Compartir → Agregar a inicio. Ábrela desde ese ícono y vuelve a intentar.');
  if (!pushSupported()) throw new Error('Este navegador no permite notificaciones. Prueba con Chrome o instala la app.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No se dio permiso de notificaciones. Puedes cambiarlo en los ajustes del navegador.');
  const { publicKey } = await call({ action: 'key' });
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
  const j = sub.toJSON(), g = group();
  if (!g) throw new Error('No encontré tu equipo. Actualiza y vuelve a intentar.');
  const c = await client();
  const { error } = await c.from('push_subscriptions').upsert({ user_id: state.user.id, group_id: g.id, endpoint: j.endpoint, keys: j.keys }, { onConflict: 'user_id,endpoint' });
  if (error) throw new Error('No se pudo guardar la suscripción. ¿Ya corrieron el SQL nuevo?');
}

export async function disablePush() {
  const sub = await currentSub();
  if (!sub) return;
  try { const c = await client(); await c.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', state.user?.id); } catch { /* sin conexión */ }
  await sub.unsubscribe();
}

// Solo el entrenador del equipo puede enviar (la función lo revisa).
export const sendPush = ({ title, body, url }) => call({ action: 'send', group_id: group()?.id, title, body, url });

// v3.21: prueba a ti mismo. La función «avisos» la manda solo a tus celulares (no al equipo).
export async function sendTest() {
  try { return await call({ action: 'test' }); }
  catch (e) { if (/desconocida/i.test(e.message)) throw new Error('Tu función «avisos» de Supabase es de antes de la 3.21: vuelve a pegar su código nuevo (LEEME, paso de notificaciones).'); throw e; }
}

// v3.21: «Estado de las notificaciones». Revisa una por una las piezas, de la más sencilla a la del servidor.
// Cada punto: { k, ok: true | false | null (no se pudo revisar), label, fix }.
export async function pushDiagnose({ coach = false } = {}) {
  const out = [];
  const add = (k, ok, label, fix = '') => { out.push({ k, ok, label, fix }); return ok; };
  if (!add('cloud', state.mode === 'cloud', 'Remate conectado a la nube', 'En el modo demo no hay notificaciones.')) return out;
  if (isIOS() && !isStandalone()) { add('install', false, 'App instalada en el iPhone', 'Safari → Compartir → Agregar a inicio, y abre Remate desde ese ícono.'); return out; }
  if (!add('browser', pushSupported(), 'El navegador permite notificaciones', 'En Android usa Chrome. En iPhone, iOS 16.4 o más nuevo y la app instalada.')) return out;
  const perm = Notification.permission;
  add('perm', perm === 'granted' ? true : perm === 'denied' ? false : null, perm === 'granted' ? 'Permiso concedido' : perm === 'denied' ? 'Permiso bloqueado' : 'Permiso: aún no se pide',
    perm === 'denied' ? 'Ajustes del celular → Notificaciones → Remate (o el navegador) → Permitir.' : perm === 'granted' ? '' : 'Toca «Activar notificaciones».');
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  add('sw', !!reg, 'La app quedó instalada en el navegador (service worker)', 'Cierra Remate por completo y vuelve a abrirla con internet.');
  const sub = (await reg?.pushManager.getSubscription().catch(() => null)) || null;
  add('sub', !!sub, 'Este celular está suscrito', 'Toca «Activar notificaciones».');
  try {
    const c = await client();
    if (sub) {
      const { data, error } = await c.from('push_subscriptions').select('id').eq('endpoint', sub.endpoint).eq('user_id', state.user?.id).limit(1);
      add('db', error ? null : !!data?.length, 'La suscripción está guardada en Supabase', error ? 'No se pudo revisar (¿sin internet?).' : 'Toca «Desactivar» y luego «Activar» otra vez.');
    }
    await call({ action: 'key' });
    add('avisos', true, 'La función «avisos» responde');
  } catch (e) { add('avisos', false, 'La función «avisos» responde', e.message); }
  if (coach) {
    try {
      const c = await client();
      const { data, error } = await c.functions.invoke('recordatorios', { body: { ping: true } });
      if (error) throw error;
      add('rec', data?.pong ? true : null, data?.pong ? `La función «recordatorios» responde (versión ${data.version || 'anterior'})` : 'La función «recordatorios» responde, pero es de antes de la 3.21',
        data?.pong ? '' : 'Vuelve a pegar su código nuevo (LEEME).');
    } catch (e) {
      const st = e?.context?.status;
      add('rec', false, 'La función «recordatorios» existe en Supabase', st === 401 ? 'Está con «Verify JWT» encendido: apágalo en Edge Functions → recordatorios → Details.' : 'No la encontré. Créala con ese nombre exacto (LEEME, notificaciones, paso 1).');
    }
  }
  return out;
}
