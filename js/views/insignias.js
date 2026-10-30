// Insignias del jugador: las ganadas y las siguientes por conseguir.
import { h, ic } from '../util.js';
import { state, settings } from '../store.js';
import { badgesFor } from '../badges.js';
import { sectionTitle } from './ui.js';

export function badgesEl(p, { title = 'Insignias', you = true } = {}) {
  const { earned, next } = badgesFor(p, state.data, settings());
  if (!earned.length && !next.length) return null;
  return h('section', { class: 'stack' }, sectionTitle(title, earned.length ? h('span', { class: 'chip ball' }, String(earned.length)) : null),
    earned.length ? h('div', { class: 'badges' }, earned.map((b) => h('div', { class: `badge t${b.tier}` },
      h('span', { class: 'bd-ic', 'aria-hidden': 'true' }, ic(b.icon, 22)), h('strong', {}, b.name), h('span', {}, b.desc))))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, you ? 'Todavía no tienes insignias. Las primeras están cerca.' : 'Todavía no tiene insignias.'),
    next.length ? h('div', { class: 'rows' }, next.slice(0, 3).map((b) => h('div', { class: 'row' },
      h('span', { class: 'bd-ic off', 'aria-hidden': 'true' }, ic(b.icon, 18)),
      h('span', { class: 'row-main' }, h('strong', {}, b.name), h('span', { class: 'row-sub' }, `${b.have} de ${b.need} ${b.unit}`),
        h('span', { class: 'bar', role: 'img', 'aria-label': `${Math.round(b.frac * 100)}%` }, h('i', { style: { width: `${Math.min(100, Math.round(b.frac * 100))}%` } })))))) : null);
}
