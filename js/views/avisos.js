// Avisos al equipo: en la app, por WhatsApp y como notificación en el celular.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, addDays, plural } from '../util.js';
import { state, add, remove, group, teamReady, ls } from '../store.js';
import { sendPush, pushStatus, enablePush, disablePush } from '../push.js';
import { sectionTitle, note, empty, field, options } from './ui.js';

const LINKS = [['', 'Sin enlace'], ['#/inicio', 'Inicio'], ['#/entrenos', 'Entrenamientos'], ['#/partidos', 'Partidos'], ['#/casa', 'En casa'], ['#/ruta', 'Ruta y retos']];
const appLink = (hash = '') => `${location.origin}${location.pathname}${hash}`;
export const waLink = (title, body, hash) => `https://wa.me/?text=${encodeURIComponent(`*${title}*${body ? `\n${body}` : ''}\n\nRemate: ${appLink(hash)}\n(Si tienes Remate en tu pantalla de inicio, mejor ábrelo desde el ícono.)`)}`;

export function noticeSheet(prefill = {}) {
  const title = h('input', { type: 'text', maxlength: 80, value: prefill.title || '', placeholder: 'Por ejemplo: Mañana entrenamos a las 5' });
  const body = h('textarea', { rows: 3, maxlength: 500, placeholder: 'Detalles (opcional)' }, prefill.body || '');
  const url = h('select', {}, options(LINKS.some(([v]) => v === prefill.url) || !prefill.url ? LINKS : [...LINKS, [prefill.url, 'Esta pantalla']], prefill.url || ''));
  const cloud = state.mode === 'cloud';
  const push = h('input', { type: 'checkbox', checked: cloud ? true : null, disabled: cloud ? null : true });
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const wa = h('a', { class: 'btn', target: '_blank', rel: 'noopener', href: '#' }, ic('message-circle', 18), 'Mandar por WhatsApp');
  const syncWa = () => { wa.href = waLink(title.value.trim() || 'Aviso', body.value.trim(), url.value); };
  [title, body, url].forEach((x) => x.addEventListener('input', syncWa)); syncWa();
  openSheet({
    title: 'Avisar al equipo',
    body: h('div', { class: 'stack' }, field('Título', title), field('Mensaje', body), field('Enlace dentro de la app', url),
      h('label', { class: 'check' }, push, h('span', {}, 'También como notificación en los celulares que la activaron')),
      !cloud ? note('En el modo demo el aviso se guarda en la app, pero no se envían notificaciones.', 'warn') : null,
      h('div', { class: 'cluster' }, wa, h('span', { class: 'row-sub' }, 'Abre WhatsApp con el mensaje listo para tu grupo.')), err),
    actions: [{ label: 'Cancelar' }, { label: 'Publicar aviso', kind: 'primary', onClick: async () => {
      if (!title.value.trim()) { err.textContent = 'Escribe un título.'; err.hidden = false; return false; }
      if (!teamReady()) { err.textContent = 'Para guardar avisos, corre en Supabase el instalar.sql de esta versión. Mientras, usa el botón de WhatsApp.'; err.hidden = false; return false; }
      const row = { group_id: group()?.id, title: title.value.trim(), body: body.value.trim(), url: url.value };
      add('notices', row);
      if (push.checked && cloud) {
        try { const r = await sendPush(row); toast(r?.sent ? `Aviso publicado y enviado a ${plural(r.sent, 'celular', 'celulares')}` : 'Aviso publicado. Nadie ha activado las notificaciones todavía.', 3600); }
        catch (e) { toast(`Aviso publicado en la app. La notificación no salió: ${e.message}`, 5000); }
      } else toast('Aviso publicado');
      return true;
    } }],
  });
}

// ---------- Avisos sin leer (jugadores y ayudantes) ----------
const seenKey = () => `remate.vistos.${group()?.id || ''}`;
const seen = () => { try { return new Set(JSON.parse(ls.get(seenKey()) || '[]')); } catch { return new Set(); } };
export const markSeen = (id) => { const s = seen(); s.add(id); ls.set(seenKey(), JSON.stringify([...s].slice(-60))); };
export const recentNotices = (days = 14) => state.data.notices.filter((n) => n.created_at.slice(0, 10) >= addDays(todayStr(), -days)).sort((a, b) => b.created_at.localeCompare(a.created_at));
export function unseenBanner(ctx) {
  const list = recentNotices().filter((n) => !seen().has(n.id)).slice(0, 2);
  if (!list.length) return null;
  return h('section', { class: 'stack notices' }, list.map((n) => h('div', { class: 'notice' },
    h('span', { class: 'nt-ic', 'aria-hidden': 'true' }, ic('megaphone', 20)),
    h('div', { class: 'row-main' }, h('strong', {}, n.title), n.body ? h('span', {}, n.body) : null, h('span', { class: 'row-sub' }, fmtDate(n.created_at.slice(0, 10)))),
    h('div', { class: 'cluster' }, n.url ? h('a', { class: 'btn sm', href: n.url, onclick: () => markSeen(n.id) }, 'Ver') : null,
      ctx.readonly ? null : h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { markSeen(n.id); ctx.rerender(); } }, 'Entendido')))));
}

// ---------- Notificaciones en este celular (Ajustes) ----------
export function pushSettings() {
  const box = h('div', { class: 'stack' }, h('p', { class: 'row-sub', style: { margin: 0 } }, 'Revisando…'));
  const paint = async () => {
    const st = await pushStatus();
    const msg = { unsupported: 'Este navegador no permite notificaciones. En Android usa Chrome; en iPhone instala la app primero.',
      install: 'En iPhone las notificaciones solo funcionan con Remate instalada: Compartir → Agregar a inicio, y ábrela desde ese ícono.',
      denied: 'Las notificaciones están bloqueadas para Remate. Actívalas en los ajustes del navegador o del celular.',
      on: 'Activadas en este celular: te llegan los avisos de tu equipo aunque no abras la app.',
      off: 'Recibe los avisos del equipo aunque no tengas la app abierta.' }[st];
    const btn = st === 'on' ? h('button', { class: 'btn', type: 'button', onclick: async () => { await disablePush(); toast('Notificaciones desactivadas'); paint(); } }, 'Desactivar')
      : st === 'off' ? h('button', { class: 'btn primary', type: 'button', onclick: async (e) => { e.target.disabled = true; try { await enablePush(); toast('¡Listo! Notificaciones activadas'); } catch (err) { toast(err.message, 5000); } paint(); } }, ic('bell', 18), 'Activar notificaciones') : null;
    box.replaceChildren(h('p', { style: { margin: 0 } }, msg), btn);
  };
  if (state.mode === 'cloud') paint(); else box.replaceChildren(h('p', { class: 'row-sub', style: { margin: 0 } }, 'En el modo demo no hay notificaciones.'));
  return box;
}

export default function avisos(ctx) {
  const coach = ctx.role === 'coach';
  const list = state.data.notices.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!coach) list.slice(0, 10).forEach((n) => markSeen(n.id));
  const el = h('div', { class: 'page' },
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => noticeSheet() }, ic('megaphone', 18), 'Nuevo aviso')) : null,
    coach && !teamReady() ? note('Para guardar avisos en la app, corre en Supabase el instalar.sql de esta versión.', 'bad') : null,
    list.length ? h('div', { class: 'rows' }, list.map((n) => h('div', { class: 'row' },
      h('span', { class: 'row-main' }, h('strong', {}, n.title), n.body ? h('span', {}, n.body) : null, h('span', { class: 'row-sub' }, fmtDate(n.created_at.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' }))),
      h('span', { class: 'row-end' }, n.url ? h('a', { class: 'btn sm', href: n.url }, 'Ver') : null,
        coach ? h('a', { class: 'iconbtn', href: waLink(n.title, n.body, n.url), target: '_blank', rel: 'noopener', 'aria-label': 'Mandar por WhatsApp' }, ic('message-circle', 18)) : null,
        coach ? h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Borrar aviso', onclick: async () => { if (await confirmSheet({ title: '¿Borrar este aviso?', text: 'Desaparece de la app de tus jugadores.', ok: 'Borrar', danger: true })) remove('notices', n.id); } }, ic('trash-2', 18)) : null)))) : empty('Sin avisos', coach ? 'Publica avisos para tu equipo: aparecen en su Inicio y, si activaron las notificaciones, les llegan al celular.' : 'Aquí verás los avisos de tu entrenador.'),
    coach ? note('Los avisos aparecen en el Inicio de cada jugador. La notificación al celular solo llega a quien la activó en Ajustes (en iPhone, con la app instalada).') : null);
  return { title: 'Avisos', back: coach ? '#/hoy' : state.role === 'assistant' ? null : '#/inicio', el };
}
