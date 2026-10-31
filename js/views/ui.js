// Piezas de interfaz compartidas por varias pantallas.
import { h, ic, initials, fmtDate, relDay, fmtTime } from '../util.js';
import { POSITION_NAME, BRANCHES } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { positionsOf } from '../calc.js';
import { VERSION } from '../version.js';

export const sectionTitle = (title, right) => h('div', { class: 'section-title' }, h('h2', {}, title), right || null);

export const empty = (title, text, action) =>
  h('div', { class: 'empty' }, h('h3', {}, title), text ? h('p', {}, text) : null, action || null);

export const note = (text, kind = '') => h('div', { class: `note ${kind}` }, text);

export const jersey = (p, cls = '') =>
  h('span', { class: `jersey ${cls}`, 'aria-hidden': 'true' }, p.jersey != null ? String(p.jersey) : initials(p.name)[0]);

export const lvl = (n) => h('span', { class: 'lvl', title: `Nivel ${n}: ${LEVELS[n - 1].name}` }, String(n));

const STATUS = {
  presente: ['ok', 'Presente'], retardo: ['warn', 'Retardo'], falta: ['bad', 'Falta'], justificada: ['info', 'Justificada'],
};
export const STATUS_LABEL = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[1]]));
export const statusChip = (st) => (st ? h('span', { class: `chip ${STATUS[st][0]}` }, STATUS[st][1]) : h('span', { class: 'chip' }, 'Sin lista'));

// Cuatro puntos = cuatro fases. "need" marca la fase que pide el siguiente nivel.
export function dots(have, need = 0) {
  return h('span', { class: 'dots', role: 'img', 'aria-label': `Fase ${have} de 4${need ? `, se pide ${need}` : ''}` },
    [1, 2, 3, 4].map((i) => h('i', { class: `${i <= have ? 'on' : ''} ${i === need ? 'need' : ''}` })));
}

export const playerSub = (p) => { const n = positionsOf(p).length - 1; return [`${POSITION_NAME[p.position]}${n ? ` (+${n})` : ''}`, p.branch ? BRANCHES[p.branch] : null].filter(Boolean).join(', '); };
// Jugadores comodín: con qué posición se dibuja la línea punteada del radar.
export const posView = (p, view) => (!view || view === 'principal' ? POSITION_NAME[p.position] : view === 'todas' ? 'todas sus posiciones' : POSITION_NAME[view]);
export function radarViewPicker(p, view, onPick) {
  const opts = [['principal', POSITION_NAME[p.position]], ...positionsOf(p).slice(1).map((x) => [x, POSITION_NAME[x]]), ['todas', 'Todas']];
  const btns = opts.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (view || 'principal') === k ? 'true' : 'false', 'data-k': k }, t));
  btns.forEach((b) => b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); onPick(b.dataset.k); }));
  return h('div', { class: 'seg rv-pick', role: 'group', 'aria-label': 'Ver el radar como' }, btns);
}

export function playerRow(p, { href, end } = {}) {
  return h(href ? 'a' : 'div', { class: 'row', href },
    jersey(p),
    h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, playerSub(p))),
    h('span', { class: 'row-end' }, end || null, lvl(p.level), href ? ic('chevron-right', 18) : null));
}

export const sessionWhen = (s) => `${relDay(s.session_date)}${s.start_time ? `, ${fmtTime(s.start_time)}` : ''}`;
export const longDate = (s) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long' });

export const backLink = (href, text = 'Volver') =>
  h('a', { class: 'btn ghost sm', href }, ic('chevron-left', 18), text);

// Campo de formulario con etiqueta visible
export function field(label, control, hint) {
  const id = control.id || `f${Math.random().toString(36).slice(2, 8)}`;
  control.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
}
export const options = (pairs, selected) => pairs.map(([v, t]) => h('option', { value: v, selected: String(v) === String(selected) ? true : null }, t));

// Radar de habilidades (8 ejes, fases de 1 a 4). Se dibuja sobre la tarjeta azul del jugador.
const escSVG = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// before (opcional): una segunda figura para comparar dos fechas (antes y después).
export function radarSVG({ values, target = [], labels, before = null }, label = 'Radar de habilidades') {
  const W = 400, H = 340, cx = 200, cy = 170, R = 100, LR = 122;
  const n = labels.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 4), cy + Math.sin(ang(i)) * R * (v / 4)];
  const poly = (arr) => arr.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  let s = `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escSVG(label)}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 1; k <= 4; k++) s += `<polygon class="ring" points="${poly(Array(n).fill(k))}"/>`;
  for (let i = 0; i < n; i++) { const [x, y] = pt(i, 4); s += `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
  if (target.some((v) => v > 0)) s += `<polygon class="target" points="${poly(target)}"/>`;
  if (before && before.some((v) => v > 0)) {
    s += `<polygon class="before" points="${poly(before)}"/>`;
    before.forEach((v, i) => { if (v > 0) { const [x, y] = pt(i, v); s += `<circle class="bdot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`; } });
  }
  s += `<polygon class="shape" points="${poly(values)}"/>`;
  values.forEach((v, i) => { if (v > 0) { const [x, y] = pt(i, v); s += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; } });
  labels.forEach((t, i) => {
    const c = Math.cos(ang(i)), sn = Math.sin(ang(i));
    const x = cx + c * LR, y = cy + sn * LR + (sn > 0.5 ? 10 : sn < -0.5 ? -2 : 4);
    const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${escSVG(t)}</text>`;
  });
  return s + '</svg>';
}

// Encabezado con el icono de Remate (también lo usa Novedades).
export function brandBand(text = 'Voleibol de sala para CETAC: entrenos, partidos, laboratorio y gym en un solo lugar.') {
  return h('section', { class: 'brandband' }, h('img', { src: 'icons/icon-192.png', alt: '', width: 84, height: 84 }),
    h('div', {}, h('h2', {}, 'Remate'), h('p', {}, text), h('span', { class: 'bb-ver' }, `v${VERSION}`)));
}
