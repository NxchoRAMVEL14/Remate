// Compartir o imprimir (v3.17): rutinas de gym (también la de menores y la personalizada), la rutina de Remate Fit
// y el plan de comida. Tres caminos: hoja para imprimir o guardar en PDF, texto para WhatsApp y, para las rutinas,
// un enlace con el que otro la abre en su Remate y toca «Usar esta rutina».
// El enlace solo lleva las respuestas de la rutina y sus ejercicios: nada de peso, medidas ni datos personales.
import { h, ic, openSheet, shareText, copyText, toast } from '../util.js';
import { note } from './ui.js';

// ---------- enlace: rutina → texto corto en la dirección ----------
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))));
// k: 'gym' | 'fit' · s: respuestas · custom: días personalizados [{name, items:[rx]}] o null · who: nombre de pila (opcional)
// v3.18: cada día lleva su día de la semana y viajan los ejercicios propios que use (own: [{id, name, mus, need, unit}]).
export function packRoutine(k, s, custom, who = '', own = []) {
  const c = Array.isArray(custom) && custom.length ? custom.map((d) => [d.name, d.items.map((x) => [x.ex, x.role, x.sets, x.reps, x.rir ?? null, x.rest]), Number.isInteger(d.wd) ? d.wd : null]) : null;
  const used = new Set((custom || []).flatMap((d) => d.items.map((x) => x.ex)));
  const x = (own || []).filter((o) => used.has(o.id)).map((o) => [o.id, o.name, o.mus, o.need, o.unit]);
  return b64(JSON.stringify({ v: 1, k, s, c, w: String(who || '').slice(0, 24), ...(x.length ? { x } : {}) }));
}
export function unpackRoutine(code, k) {
  try {
    const o = JSON.parse(unb64(code));
    if (!o || o.v !== 1 || (k && o.k !== k) || typeof o.s !== 'object') return null;
    const custom = Array.isArray(o.c) ? o.c.slice(0, 7).map(([name, items, wd]) => ({ name: String(name || ''), wd: Number.isInteger(wd) ? wd : null, items: (Array.isArray(items) ? items : []).map(([ex, role, sets, reps, rir, rest]) => ({ ex, role, sets, reps, rir, rest })) })) : null;
    const own = Array.isArray(o.x) ? o.x.slice(0, 20).map(([id, name, mus, need, unit]) => ({ id, name, mus, need, unit })) : [];
    return { k: o.k, s: o.s, custom, who: typeof o.w === 'string' ? o.w : '', own };
  } catch { return null; }
}
export const routineLink = (k, code) => `${location.origin}${location.pathname}#/${k}/usar/${code}`;
const WDN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const firstName = (p) => String(p?.name || '').split(' ')[0];

// ---------- texto para WhatsApp ----------
const restText = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
export function rxLine(rx, ex) {
  const parts = [`${rx.sets} × ${rx.reps}${ex?.side ? ' por lado' : ''}`];
  if (rx.rir != null) parts.push(rx.rir === 0 ? 'hasta el fallo técnico' : `te sobran ${rx.rir}`);
  else if (rx.role === 'pow' || ex?.unit === 'saltos') parts.push('a máxima velocidad');
  parts.push(`descanso ${restText(rx.rest)}`);
  return parts.join(' · ');
}
export const restOf = restText;
// days: [{key, name, min, items:[rx]}]
export function routineText({ title, who, summary, days, byId, week = null, notes = [], warmup = null, cooldown = null }) {
  const L = [`🏐 *${title}*${who ? ` de ${who}` : ''} (Remate)`, summary];
  if (week) L.push(`Semana: ${week}`);
  notes.filter(Boolean).forEach((n) => L.push(`• ${n}`));
  if (warmup) L.push('', `*Calentamiento:* ${warmup}`);
  for (const d of days) {
    L.push('', `*${Number.isInteger(d.wd) ? `${WDN[d.wd]} · ` : ''}Día ${d.key}: ${d.name}* (≈ ${d.min} min)`);
    d.items.forEach((rx, i) => { const ex = byId[rx.ex]; L.push(`${i + 1}. ${ex?.name || rx.ex}: ${rxLine(rx, ex)}`); });
  }
  if (cooldown) L.push('', `*Para terminar:* ${cooldown}`);
  L.push('', '«Te sobran 2» = termina la serie cuando todavía podrías hacer 2 más con buena técnica.', 'Hecho con Remate');
  return L.join('\n');
}

// ---------- la hoja de «Compartir o imprimir» ----------
// print: ruta de la hoja para imprimir · text: texto · link: enlace para usarla (opcional)
export function shareSheet({ title, print, text, link = null, linkText = '', printSub = 'Una hoja limpia, con columnas para anotar tus pesos. En el celular, «Imprimir» → «Guardar como PDF» y luego lo mandas.' }) {
  openSheet({ title, body: (close) => h('div', { class: 'stack share-opts' },
    h('a', { class: 'share-opt', href: print, onclick: () => close() }, h('span', { class: 'lc-ic' }, ic('printer', 22)),
      h('span', { class: 'row-main' }, h('strong', {}, 'Imprimir o guardar en PDF'), h('span', { class: 'row-sub' }, printSub))),
    h('button', { type: 'button', class: 'share-opt', onclick: () => shareText(text) }, h('span', { class: 'lc-ic' }, ic('share-2', 22)),
      h('span', { class: 'row-main' }, h('strong', {}, 'Mandar como texto'), h('span', { class: 'row-sub' }, 'Para WhatsApp o mensaje. Cabe en cualquier celular.'))),
    link ? h('button', { type: 'button', class: 'share-opt', onclick: () => shareText(`${linkText}\n${link}`) }, h('span', { class: 'lc-ic' }, ic('send', 22)),
      h('span', { class: 'row-main' }, h('strong', {}, 'Enlace para que otro la use'), h('span', { class: 'row-sub' }, 'Tu compañero lo abre en su Remate, la ve y toca «Usar esta rutina». Solo lleva los ejercicios, nada personal.'))) : null,
    h('button', { type: 'button', class: 'btn ghost sm', onclick: () => copyText(text) }, ic('copy', 16), 'Copiar el texto'),
    note('En iPhone, con Remate instalado, la impresión a veces no muestra la vista previa. Si te pasa, abre Remate en Safari o usa «Mandar como texto».')),
  actions: [{ label: 'Cerrar' }] });
}
export const shareBtn = (onClick, label = 'Compartir o imprimir', cls = 'btn sm') => h('button', { type: 'button', class: cls, onclick: onClick }, ic('share-2', 16), label);
export function badLink(kind = 'rutina') { toast(`Ese enlace de ${kind} está incompleto o es de otra versión`); }
