// Piezas de interfaz compartidas por varias pantallas.
import { h, ic, initials, fmtDate, relDay, fmtTime } from '../util.js';
import { POSITION_NAME, BRANCHES } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';

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

export const playerSub = (p) => [POSITION_NAME[p.position], p.branch ? BRANCHES[p.branch] : null].filter(Boolean).join(', ');

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
