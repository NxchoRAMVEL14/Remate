// Tarjeta del jugador: número grande, nivel, radar de habilidades, tres cifras y su avance en pruebas físicas. Es lo más vistoso de la app.
// También vive aquí el bloque de insignias (antes js/views/insignias.js).
import { h, ic, initials, fmtDate } from '../util.js';
import { state, settings, multiTeam, teamName, teamsOf } from '../store.js';
import { badgesFor } from '../badges.js';
import { PTESTS, testTrend } from '../content/gym.js';
import { sectionTitle, radarSVG, radarViewPicker, posView } from './ui.js';
import { radarValues, attendanceFor, xpFor, levelGap, positionsOf, isWildcard } from '../calc.js';
import { POSITION_NAME, BRANCHES, HANDS } from '../content/skills.js';
import { LEVELS } from '../content/levels.js';

export function playerStats(p) {
  const d = state.data;
  return { att: attendanceFor(p.id, d.sessions, d.attendance, settings()), xp: xpFor(p, d), gap: levelGap(p, d.ratings) };
}

// Botón que abre la explicación detallada del radar. El jugador ve la suya; el entrenador, la de ese jugador.
function radarButton(p, rated) {
  const coach = state.role === 'coach' && !state.viewAs;
  return h('a', { class: 'radar-btn', href: coach ? `#/radar/${p.id}` : '#/radar' },
    h('span', { class: 'q', 'aria-hidden': 'true' }, '?'),
    h('span', {}, coach ? 'Ver la explicación que recibe' : rated ? '¿Qué dice mi radar?' : '¿Cómo funciona el radar?'));
}

// Con qué posición se ve el radar de un comodín (se recuerda mientras la app está abierta).
export const RADAR_VIEW = new Map();
function radarBlock(p, gap) {
  const box = h('div', {});
  const draw = (view) => {
    const rv = radarValues(p, state.data.ratings, view), g = levelGap(p, state.data.ratings, view);
    const who = isWildcard(p) ? ` jugando de ${posView(p, view).replace('todas sus posiciones', 'todas sus posiciones (lo más exigente)')}` : '';
    box.replaceChildren(h('div', { html: radarSVG(rv, `Radar de habilidades de ${p.name}`) }),
      g.top ? h('p', { class: 'legend' }, 'Relleno amarillo: sus fases de hoy. Está en el nivel más alto.')
        : h('p', { class: 'legend' }, `Relleno amarillo: sus fases de hoy. Línea punteada: lo que pide el nivel ${gap.target}${who}.`));
  };
  draw(RADAR_VIEW.get(p.id));
  return h('div', {}, isWildcard(p) ? radarViewPicker(p, RADAR_VIEW.get(p.id), (v) => { RADAR_VIEW.set(p.id, v); draw(v); }) : null, box);
}

export function playerCard(p, stats = playerStats(p)) {
  const { att, xp, gap } = stats;
  const rv = radarValues(p, state.data.ratings);
  const rated = rv.values.some((v) => v > 0);
  const extra = positionsOf(p).slice(1).map((x) => POSITION_NAME[x]);
  const meta = [multiTeam() ? teamsOf(p).map(teamName).join(' y ') : null, POSITION_NAME[p.position] !== 'Sin definir' ? POSITION_NAME[p.position] : null, extra.length ? `Comodín: también ${extra.join(', ')}` : null,
    p.branch ? BRANCHES[p.branch] : null, p.hand ? `Mano ${HANDS[p.hand].toLowerCase()}` : null, p.height_cm ? `${p.height_cm} cm` : null].filter(Boolean);
  return h('section', { class: 'card-player', 'aria-label': `Tarjeta de ${p.name}` },
    h('div', { class: 'big', 'aria-hidden': 'true' }, p.jersey != null ? String(p.jersey) : initials(p.name)[0]),
    h('h2', {}, p.name),
    h('div', { class: 'meta' }, h('span', { class: 'chip ball' }, `Nivel ${p.level}, ${LEVELS[p.level - 1].name}`), meta.map((m) => h('span', { class: 'chip' }, m))),
    rated
      ? radarBlock(p, gap)
      : h('p', { class: 'legend', style: { margin: '18px 0 14px', fontSize: '1rem' } }, 'Todavía no hay evaluación. En cuanto se evalúen sus habilidades aparece su radar.'),
    radarButton(p, rated),
    h('div', { class: 'stats' },
      h('div', {}, h('b', { class: 'num' }, att.pct == null ? '—' : `${att.pct}%`), h('span', {}, 'asistencia')),
      h('div', {}, h('b', { class: 'num' }, String(att.streak)), h('span', {}, att.streak === 1 ? 'entreno seguido' : 'entrenos seguidos')),
      h('div', {}, h('b', { class: 'num' }, String(xp)), h('span', {}, 'puntos XP'))),
    testsStrip(p));
}

// ---------- avance en pruebas físicas, dentro de la tarjeta ----------
const CARD_TESTS = ['cmj', 'vel10', 'plancha'];
const fmtT = (v, k) => `${Number(v).toFixed(PTESTS[k].step < 1 ? (PTESTS[k].step < 0.1 ? 2 : 1) : 0).replace(/\.0+$/, '')} ${PTESTS[k].unit}`;
// Línea pequeña. Para las pruebas donde menos es mejor (10 m) se dibuja al revés: la línea siempre sube cuando mejora.
function spark(vals, lowerBetter) {
  const W = 96, H = 30, pad = 3;
  const ys = lowerBetter ? vals.map((v) => -v) : vals;
  const mn = Math.min(...ys), mx = Math.max(...ys), span = mx - mn || 1;
  const pts = ys.map((v, i) => [pad + (i * (W - 2 * pad)) / Math.max(1, ys.length - 1), H - pad - ((v - mn) / span) * (H - 2 * pad)]);
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${d}"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3"/></svg>`;
}
export function testsStrip(p) {
  const list = state.data.playerTests.filter((t) => t.player_id === p.id);
  const tiles = CARD_TESTS.map((k) => ({ k, tr: testTrend(list, k) })).filter((x) => x.tr);
  if (!tiles.length) return null;
  const coach = state.role === 'coach' && !state.viewAs;
  const lastDate = list.map((t) => String(t.test_date)).sort().pop();
  return h('a', { class: 'card-tests', href: coach ? `#/jugador/${p.id}/pruebas` : '#/pruebas', 'aria-label': 'Ver pruebas físicas' },
    h('span', { class: 'ct-title' }, ic('activity', 16), ` Pruebas físicas · ${fmtDate(lastDate, { day: 'numeric', month: 'short' })}`),
    h('span', { class: 'ct-tiles' }, tiles.map(({ k, tr }) => h('span', { class: 'ct-tile' },
      h('span', { class: 'ct-name' }, PTESTS[k].short),
      h('b', {}, fmtT(tr.last, k)),
      tr.n > 1 ? h('span', { html: spark(tr.list.map((t) => Number(t.value)), PTESTS[k].better === 'down') }) : null,
      tr.n > 1 && tr.d ? h('span', { class: `ct-d ${tr.better ? 'up' : 'down'}` }, `${tr.d > 0 ? '+' : ''}${fmtT(tr.d, k)}`) : h('span', { class: 'ct-d' }, tr.n > 1 ? 'Igual' : 'Primera toma')))),
    tiles.some(({ tr }) => tr.n > 1) ? h('span', { class: 'ct-foot' }, 'La línea sube cuando mejora.') : null);
}

// ---------- insignias del jugador: las ganadas y las siguientes por conseguir ----------
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
