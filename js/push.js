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
