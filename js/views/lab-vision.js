// Entrenador de visión de juego: rondas de situaciones, precisión y tiempo de decisión.
import { h, ic, plural } from '../util.js';
import { state, add, labReady } from '../store.js';
import { courtSVG } from '../court.js';
import { CATS, SCENARIOS, SCENARIO_BY_ID } from '../content/vision.js';
import { sectionTitle, note, empty } from './ui.js';

const ROUND = 8;
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);

export function visionStats(attempts) {
  const by = {};
  for (const c of Object.keys(CATS)) by[c] = { n: 0, ok: 0, ms: [] };
  for (const a of attempts) { const b = by[a.category]; if (!b) continue; b.n++; if (a.correct) { b.ok++; if (a.ms != null) b.ms.push(a.ms); } }
  const last = attempts.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);
  return { by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.n, pct: v.n ? Math.round((v.ok / v.n) * 100) : null, ms: median(v.ms) }])),
    recent: { n: last.length, pct: last.length ? Math.round((last.filter((a) => a.correct).length / last.length) * 100) : null, ms: median(last.filter((a) => a.correct && a.ms != null).map((a) => a.ms)) } };
}

// Las situaciones que más fallas (al menos un error y peor proporción primero).
function weakest(attempts) {
  const m = new Map();
  for (const a of attempts) { const r = m.get(a.scenario_id) || { n: 0, bad: 0 }; r.n++; if (!a.correct) r.bad++; m.set(a.scenario_id, r); }
  return [...m.entries()].filter(([id, r]) => r.bad && SCENARIO_BY_ID[id]).sort((a, b) => b[1].bad / b[1].n - a[1].bad / a[1].n).map(([id]) => id);
}

function startRound(ctx, ids) {
  ctx.ui.round = { ids: shuffle(ids).slice(0, ROUND), i: 0, ok: 0, shownAt: 0, fb: null, order: null };
  ctx.rerender();
}

export default function labVision(ctx) {
  const ui = ctx.ui, attempts = state.data.decisions;
  if (ui.round) return { title: 'Visión de juego', sub: `Situación ${Math.min(ui.round.i + 1, ui.round.ids.length)} de ${ui.round.ids.length}`, back: '#/lab', el: roundView(ctx) };
  const st = visionStats(attempts), weak = weakest(attempts), ro = !labReady();
  const catBtn = (c) => h('button', { class: 'btn', type: 'button', disabled: ro ? true : null, onclick: () => startRound(ctx, SCENARIOS.filter((s) => s.cat === c).map((s) => s.id)) }, CATS[c]);
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' },
      h('h2', {}, 'Entrena tu lectura del juego'),
      h('p', { style: { margin: 0 } }, `Ves una situación de partido y eliges la mejor decisión. Remate mide si aciertas y cuánto tardas. ${SCENARIOS.length} situaciones en ${Object.keys(CATS).length} temas.`),
      h('div', { class: 'cluster' }, h('button', { class: 'btn ball', type: 'button', disabled: ro ? true : null, onclick: () => startRound(ctx, SCENARIOS.map((s) => s.id)) }, ic('play', 18), `Ronda de ${ROUND}`),
        weak.length ? h('button', { class: 'btn', type: 'button', disabled: ro ? true : null, onclick: () => startRound(ctx, weak) }, ic('refresh-cw', 18), `Repasar las que fallas (${weak.length})`) : null)),
    attempts.length ? h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${st.recent.pct}%`), h('span', { class: 'l' }, `Aciertos, últimas ${st.recent.n}`)),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, secs(st.recent.ms)), h('span', { class: 'l' }, 'Tiempo típico al acertar')),
      h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(attempts.length)), h('span', { class: 'l' }, 'Decisiones en total'))) : null,
    h('section', { class: 'stack' }, sectionTitle('Por tema'),
      h('div', { class: 'rows' }, Object.keys(CATS).map((c) => {
        const b = st.by[c], total = SCENARIOS.filter((s) => s.cat === c).length;
        return h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, CATS[c]),
          h('span', { class: 'row-sub' }, b.n ? `${b.pct}% de aciertos en ${plural(b.n, 'intento', 'intentos')}, tiempo típico ${secs(b.ms)}` : `${plural(total, 'situación', 'situaciones')}, sin intentos todavía`)),
        h('span', { class: 'row-end' }, catBtn(c)));
      }))),
    note('Cómo usarlo: haz una ronda 2 o 3 veces por semana. Primero busca acertar; cuando aciertes más de 8 de cada 10, trata de decidir más rápido. Después lleva las mismas preguntas a tus jugadores: "¿qué viste?, ¿qué opciones tenías?". Las respuestas son propuestas de Remate basadas en principios tácticos comunes; en un partido real puede haber más de una opción razonable.'),
    attempts.length ? null : empty('Aún no hay decisiones', 'Empieza con una ronda. Toma menos de 5 minutos.'));
  return { title: 'Visión de juego', sub: 'Solo tú lo ves', back: '#/lab', el };
}

function roundView(ctx) {
  const r = ctx.ui.round;
  if (r.i >= r.ids.length) {
    return h('div', { class: 'page' }, h('section', { class: 'band next stack' },
      h('h2', {}, `${r.ok} de ${r.ids.length} correctas`),
      h('p', { style: { margin: 0 } }, r.ok === r.ids.length ? 'Ronda perfecta. La próxima, intenta decidir más rápido.' : r.ok >= r.ids.length * 0.75 ? 'Muy bien. Repasa las que fallaste para que se te queden.' : 'Lee la explicación de las que fallaste y vuelve a intentarlo en unos días.'),
      h('div', { class: 'cluster' }, h('button', { class: 'btn ball', type: 'button', onclick: () => startRound(ctx, SCENARIOS.map((s) => s.id)) }, ic('play', 18), 'Otra ronda'),
        h('button', { class: 'btn', type: 'button', onclick: () => { ctx.ui.round = null; ctx.rerender(); } }, 'Terminar'))));
  }
  const sc = SCENARIO_BY_ID[r.ids[r.i]];
  if (!r.order) { r.order = shuffle(sc.options); r.shownAt = Date.now(); }
  const fb = r.fb;
  const diagram = fb ? { ...sc.diagram, items: [...sc.diagram.items, ...(sc.after || [])] } : sc.diagram;
  const choose = (opt) => {
    if (r.fb) return;
    const ms = Math.min(600000, Date.now() - r.shownAt), correct = opt.id === sc.answer;
    r.fb = { chosen: opt.id, correct, ms }; if (correct) r.ok++;
    add('decisions', { scenario_id: sc.id, category: sc.cat, chosen: opt.id, correct, ms });
  };
  const next = () => { r.i++; r.fb = null; r.order = null; ctx.rerender(); };
  return h('div', { class: 'page vision' },
    h('div', { class: 'segs', 'aria-hidden': 'true' }, r.ids.map((_, i) => h('i', { class: i < r.i ? 'done' : i === r.i ? 'cur' : '', style: { flex: 1 } }))),
    h('div', { class: 'vis-grid' },
      h('figure', { class: 'court-wrap', style: { margin: 0 } }, h('div', { html: courtSVG(diagram, `Situación: ${sc.title}`) }),
        h('figcaption', {}, 'Tu equipo abajo (amarillo), el rival arriba (coral). Flecha amarilla: balón. Blanca: movimiento.')),
      h('div', { class: 'stack' },
        h('span', { class: 'chip info', style: { justifySelf: 'start' } }, CATS[sc.cat]),
        h('h2', {}, sc.title), h('p', { style: { margin: 0 } }, sc.text),
        h('strong', {}, '¿Qué haces?'),
        h('div', { class: 'choices', role: 'group', 'aria-label': 'Opciones' }, r.order.map((opt) => {
          const cls = !fb ? '' : opt.id === sc.answer ? 'right' : opt.id === fb.chosen ? 'wrong' : 'dim';
          return h('button', { type: 'button', class: `choice ${cls}`, disabled: fb ? true : null, 'aria-pressed': fb && opt.id === fb.chosen ? 'true' : null, onclick: () => choose(opt) },
            fb && opt.id === sc.answer ? ic('check', 18) : fb && opt.id === fb.chosen ? ic('x', 18) : null, h('span', {}, opt.t));
        })),
        fb ? h('div', { class: `note ${fb.correct ? '' : 'warn'}`, role: 'status' }, h('strong', {}, fb.correct ? `Correcto, en ${secs(fb.ms)}. ` : 'Mejor opción: la marcada en verde. '), sc.why) : null,
        fb ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: next }, r.i + 1 < r.ids.length ? 'Siguiente' : 'Ver resultado', ic('chevron-right', 18)),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { ctx.ui.round = null; ctx.rerender(); } }, 'Salir')) : h('button', { class: 'btn ghost', type: 'button', style: { justifySelf: 'start' }, onclick: () => { ctx.ui.round = null; ctx.rerender(); } }, 'Salir de la ronda'))));
}
