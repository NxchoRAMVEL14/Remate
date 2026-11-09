// Aprende (v3.21): la teoría y la práctica juntas. Eliges un fundamento (saque, recepción…) o una posición
// (colocador, central…) y ves en una sola pantalla las lecciones de Teoría, los ejercicios de cancha, lo de En casa
// y el gym que lo apoya. Para el jugador, empieza en lo que más le pide su siguiente nivel.
import { h, ic, plural } from '../util.js';
import { state, settings } from '../store.js';
import { allExercises, levelLabel } from '../content/exercises.js';
import { HOME_BY_ID } from '../content/casa.js';
import { GYM_BY_ID, groupOf, GROUPS } from '../content/gym.js';
import { levelGap } from '../calc.js';
import { FUNDS, FUND, FUND_NAME, POS, POS_IDS, lessonsForFund, lessonsForPos } from '../content/aprende.js';
import { progress, lessonDone } from './teoria.js';
import { note } from './ui.js';

const gymOn = () => settings().gym_players !== false;

export default function aprende(ctx) {
  const ui = ctx.ui, me = ctx.me, player = ctx.role === 'player' || !!state.viewAs;
  // Para el jugador: el fundamento donde más le falta para su siguiente nivel.
  let tip = null;
  if (me) {
    try {
      const g = levelGap(me, state.data.ratings || []);
      const miss = g.rows.filter((r) => !r.na && !r.ok && FUND[r.skill]).sort((a, b) => (b.need - b.have) - (a.need - a.have))[0];
      if (miss) tip = miss;
    } catch { /* sin datos */ }
  }
  ui.sel ??= me?.position && POS[me.position] ? `p:${me.position}` : tip ? `f:${tip.skill}` : 'f:saque';
  ui.lv ??= me?.level ? String(me.level) : '0';
  const [kind, id] = ui.sel.split(':');
  const pick = (v) => { ui.sel = v; ctx.rerender(); window.scrollTo({ top: 0 }); };
  const chipRow = (label, items, pref) => h('div', { class: 'stack', style: { gap: '6px' } }, h('span', { class: 'label' }, label),
    h('div', { class: 'ap-chips', role: 'group', 'aria-label': label }, items.map(([k, t]) => h('button', { type: 'button', class: 'ap-chip', 'aria-pressed': ui.sel === `${pref}:${k}` ? 'true' : 'false', onclick: () => pick(`${pref}:${k}`) }, t))));

  const p = progress();
  const lessons = kind === 'p' ? lessonsForPos(id) : lessonsForFund(id);
  const all = allExercises(state.data.customEx);
  const lv = Number(ui.lv) || 0, inLv = (e) => !lv || (e.levels[0] <= lv && lv <= e.levels[1]);
  let exs;
  if (kind === 'p') {
    const P = POS[id], extra = P.ex.map((x) => all.find((e) => e.id === x)).filter(Boolean);
    const byFund = all.filter((e) => P.funds.slice(0, 2).some((f) => e.skills[0] === f));
    exs = [...new Map([...extra, ...byFund].map((e) => [e.id, e])).values()];
  } else exs = all.filter((e) => e.skills.includes(id)).sort((a, b) => Number(b.skills[0] === id) - Number(a.skills[0] === id));
  const shown = exs.filter(inLv).sort((a, b) => a.levels[0] - b.levels[0]);
  const casa = (kind === 'p' ? POS[id].casa : FUND[id].casa).map((x) => HOME_BY_ID[x]).filter(Boolean);
  const gym = gymOn() ? (kind === 'p' ? POS[id].gym : FUND[id].gym).map((x) => GYM_BY_ID[x]).filter(Boolean) : [];
  const keys = kind === 'p' ? POS[id].keys : FUND[id].keys;
  const title = kind === 'p' ? POS[id].name : FUND_NAME[id];

  const head = h('section', { class: 'band next ap-band' },
    h('div', { class: 'when' }, kind === 'p' ? 'Posición' : 'Fundamento'),
    h('h2', {}, title),
    kind === 'p' ? h('div', {}, POS[id].why) : null,
    h('div', { class: 'ap-count' }, [plural(lessons.length, 'lección', 'lecciones'), plural(shown.length, 'ejercicio', 'ejercicios'), casa.length ? `${casa.length} en casa` : null, gym.length ? `${gym.length} de gym` : null].filter(Boolean).join(' · ')));
  const section = (icon, t, sub, body) => h('section', { class: 'panel stack' }, h('div', { class: 'cluster' }, h('span', { class: 'gx-ic' }, ic(icon, 20)), h('h3', {}, t)), sub ? h('p', { class: 'row-sub', style: { margin: 0 } }, sub) : null, body);

  const el = h('div', { class: 'page aprende' },
    h('p', { style: { margin: 0 } }, 'Elige un fundamento o una posición: aquí está la teoría para entenderlo y la práctica para dominarlo.'),
    tip && player ? h('div', { class: 'note info' }, `Para tu siguiente nivel te falta más en ${FUND_NAME[tip.skill]} (tienes ${tip.have}, se pide ${tip.need}). `,
      ui.sel !== `f:${tip.skill}` ? h('button', { type: 'button', class: 'btn sm', onclick: () => pick(`f:${tip.skill}`) }, `Ver ${FUND_NAME[tip.skill]}`) : null) : null,
    h('section', { class: 'panel stack' }, chipRow('Por fundamento', FUNDS, 'f'), chipRow('Por posición', POS_IDS.map((k) => [k, POS[k].name]), 'p')),
    head,
    kind === 'p' ? h('section', { class: 'panel stack' }, h('h3', {}, 'Lo que más usa'), h('div', { class: 'ap-chips' }, POS[id].funds.map((f, i) => h('button', { type: 'button', class: 'ap-chip', onclick: () => pick(`f:${f}`) }, `${i + 1}. ${FUND_NAME[f]}`)))) : null,
    section('key-round', 'Las 3 claves', null, h('ol', { class: 'plain ap-keys' }, keys.map((k) => h('li', {}, k)))),
    section('notebook-pen', 'Teoría', 'Lecciones cortas con quiz. La palomita es que ya la aprobaste en este celular.',
      lessons.length ? h('div', { class: 'rows' }, lessons.map((l) => h('a', { class: 'row', href: `#/teoria/${l.id}` },
        h('span', { class: 'row-main' }, h('strong', {}, l.name), h('span', { class: 'row-sub' }, `${l.min} min · quiz de ${l.quiz.length}`)),
        lessonDone(p, l) ? h('span', { class: 'chip ok' }, ic('check', 14), 'Aprobada') : ic('chevron-right', 18)))) : note('Todavía no hay una lección solo de esto; revisa las de Juego y táctica.')),
    section('volleyball', 'Práctica en la cancha', 'Ejercicios con diagrama, de lo más fácil a lo más difícil.',
      h('div', { class: 'stack' },
        h('label', { class: 'cluster', style: { gap: '8px' } }, h('span', { class: 'label', style: { margin: 0 } }, 'Nivel'),
          h('select', { 'aria-label': 'Nivel de los ejercicios', onchange: (e) => { ui.lv = e.target.value; ctx.rerender(); } },
            [['0', 'Todos'], ...[1, 2, 3, 4, 5, 6].map((n) => [String(n), me?.level === n ? `Nivel ${n} (el tuyo)` : `Nivel ${n}`])].map(([v, t]) => h('option', { value: v, selected: ui.lv === v ? true : null }, t)))),
        shown.length ? h('div', { class: 'rows' }, shown.map((e) => h('a', { class: 'row', href: `#/ejercicio/${e.id}` },
          h('span', { class: 'row-main' }, h('strong', {}, e.name), h('span', { class: 'row-sub' }, `${e.min} min · ${levelLabel(e)}`)), ic('chevron-right', 18))))
          : note(exs.length ? 'En ese nivel no hay; elige «Todos».' : 'Todavía no hay ejercicios de esto.'))),
    casa.length ? section('house', 'En casa', 'Para practicarlo solo, con poco espacio.', h('div', { class: 'rows' }, casa.map((c) => h('a', { class: 'row', href: '#/casa' },
      h('span', { class: 'row-main' }, h('strong', {}, c.name), h('span', { class: 'row-sub' }, `${c.min} min · ${c.space}`)), ic('chevron-right', 18))))) : null,
    gym.length ? section('dumbbell', 'En el gym', 'Lo que hace a tu cuerpo más fuerte para esto. Toca uno para ver cómo se hace.', h('div', { class: 'rows' }, gym.map((g) => h('details', { class: 'row ap-gym' },
      h('summary', {}, h('span', { class: 'row-main' }, h('strong', {}, g.name), h('span', { class: 'row-sub' }, `${GROUPS[groupOf(g)]?.name || ''} · ${g.body}`))),
      h('div', { class: 'stack', style: { padding: '8px 0 4px' } }, h('p', { style: { margin: 0 } }, g.why), h('ol', { class: 'plain' }, g.how.map((x) => h('li', {}, x))),
        g.safety ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Seguridad: ${g.safety}`) : null))))) : null);
  return { title: 'Aprende', sub: 'Teoría y práctica', back: ctx.role === 'coach' ? '#/mas' : '#/ejercicios', el };
}
