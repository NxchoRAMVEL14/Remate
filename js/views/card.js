// Tarjeta del jugador: número grande, nivel, radar de habilidades y tres cifras. Es lo más vistoso de la app.
import { h, initials } from '../util.js';
import { state, settings } from '../store.js';
import { radarValues, attendanceFor, xpFor, levelGap } from '../calc.js';
import { POSITION_NAME, BRANCHES, HANDS } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';
import { radarSVG } from '../radar.js';

export function playerStats(p) {
  const d = state.data;
  return { att: attendanceFor(p.id, d.sessions, d.attendance, settings()), xp: xpFor(p, d), gap: levelGap(p, d.ratings) };
}

export function playerCard(p, stats = playerStats(p)) {
  const { att, xp, gap } = stats;
  const rv = radarValues(p, state.data.ratings);
  const rated = rv.values.some((v) => v > 0);
  const meta = [POSITION_NAME[p.position] !== 'Sin definir' ? POSITION_NAME[p.position] : null, p.branch ? BRANCHES[p.branch] : null,
    p.hand ? `Mano ${HANDS[p.hand].toLowerCase()}` : null, p.height_cm ? `${p.height_cm} cm` : null].filter(Boolean);
  return h('section', { class: 'card-player', 'aria-label': `Tarjeta de ${p.name}` },
    h('div', { class: 'big', 'aria-hidden': 'true' }, p.jersey != null ? String(p.jersey) : initials(p.name)[0]),
    h('h2', {}, p.name),
    h('div', { class: 'meta' }, h('span', { class: 'chip ball' }, `Nivel ${p.level}, ${LEVELS[p.level - 1].name}`), meta.map((m) => h('span', { class: 'chip' }, m))),
    rated
      ? h('div', {}, h('div', { html: radarSVG(rv, `Radar de habilidades de ${p.name}`) }),
        gap.top ? h('p', { class: 'legend' }, 'Relleno amarillo: sus fases de hoy. Está en el nivel más alto.')
          : h('p', { class: 'legend' }, `Relleno amarillo: sus fases de hoy. Línea punteada: lo que pide el nivel ${gap.target}.`))
      : h('p', { class: 'legend', style: { margin: '18px 0 14px', fontSize: '1rem' } }, 'Todavía no hay evaluación. En cuanto se evalúen sus habilidades aparece su radar.'),
    h('div', { class: 'stats' },
      h('div', {}, h('b', { class: 'num' }, att.pct == null ? '—' : `${att.pct}%`), h('span', {}, 'asistencia')),
      h('div', {}, h('b', { class: 'num' }, String(att.streak)), h('span', {}, att.streak === 1 ? 'entreno seguido' : 'entrenos seguidos')),
      h('div', {}, h('b', { class: 'num' }, String(xp)), h('span', {}, 'puntos XP'))));
}
