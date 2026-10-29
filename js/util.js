// Utilidades generales: DOM, fechas, avisos y hojas emergentes.
import { icon } from './icons.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'for') el.htmlFor = v;
    else if (k === 'value') value = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  if (value !== undefined) el.value = value;
  return el;
}
export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}
export function ic(name, size = 20, cls = '') {
  const t = document.createElement('template');
  t.innerHTML = icon(name, size, cls);
  return t.content.firstElementChild;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- números y listas ----------
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export function groupBy(arr, fn) {
  const m = new Map();
  for (const x of arr) { const k = fn(x); (m.get(k) || m.set(k, []).get(k)).push(x); }
  return m;
}
export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';        // 31 caracteres, sin 0 O 1 I L
export function newJoinCode() {
  const buf = new Uint8Array(24); crypto.getRandomValues(buf);
  let out = '', i = 0;
  while (out.length < 6) {
    if (i >= buf.length) { crypto.getRandomValues(buf); i = 0; }
    const b = buf[i++]; if (b >= 248) continue;          // 248 = 31*8: evita sesgo
    out += ALPHA[b % 31];
  }
  return out;
}
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- fechas (siempre texto AAAA-MM-DD, sin zonas horarias) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toStr(new Date());
export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return toStr(d); };
export const diffDays = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 86400000);
export function fmtDate(s, opts) {
  if (!s) return '';
  return new Intl.DateTimeFormat('es-MX', opts || { weekday: 'short', day: 'numeric', month: 'short' }).format(parseDate(s)).replace('.', '');
}
export function relDay(s) {
  const n = diffDays(s, todayStr());
  if (n === 0) return 'Hoy'; if (n === 1) return 'Mañana'; if (n === -1) return 'Ayer';
  return fmtDate(s);
}
export const fmtTime = (t) => (t ? String(t).slice(0, 5) : '');
export const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

// ---------- avisos ----------
let toastTimer;
export function toast(msg, ms = 2600) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- hoja emergente ----------
// actions: [{label, kind:'primary'|'ball'|'danger'|'', onClick: async () => false para no cerrar}]
export function openSheet({ title, body, actions = [], onClose }) {
  const dlg = h('dialog', { class: 'sheet', 'aria-label': title });
  const close = (v) => { if (dlg.open) dlg.close(); dlg.remove(); onClose?.(v); };
  const content = typeof body === 'function' ? body(close) : body;
  dlg.append(
    h('div', { class: 'sheet-head' }, h('h2', {}, title),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cerrar', onclick: () => close() }, ic('x'))),
    h('div', { class: 'sheet-body' }, content),
  );
  if (actions.length) {
    dlg.append(h('div', { class: 'sheet-foot' }, actions.map((a) => {
      const b = h('button', { type: 'button', class: `btn ${a.kind || ''}` }, a.label);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { const r = await a.onClick?.(close); if (r !== false) close(a.value ?? true); }
        finally { b.disabled = false; }
      });
      return b;
    })));
  }
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { close, el: dlg };
}
export function confirmSheet({ title, text, ok = 'Aceptar', danger = false }) {
  return new Promise((res) => {
    let done = false;
    openSheet({
      title, body: h('p', {}, text),
      actions: [{ label: 'Cancelar', onClick: () => { done = true; res(false); } },
                { label: ok, kind: danger ? 'danger' : 'primary', onClick: () => { done = true; res(true); } }],
      onClose: () => { if (!done) res(false); },
    });
  });
}

// ---------- archivos y portapapeles ----------
export function download(filename, text, mime = 'application/json') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: filename });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { toast('No se pudo copiar'); }
}
export async function shareText(text) {
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { return; } }
  copyText(text);
}
