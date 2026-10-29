// Entrenamientos del jugador: lo que su entrenador publicó, con el plan y su asistencia.
import { h, ic, fmtDate, todayStr } from '../util.js';
import { state, sessions } from '../store.js';
import { getExercise } from '../content/exercises.js';
import { sectionTitle, empty, note, statusChip, sessionWhen } from './ui.js';

const getEx = (id) => getExercise(id, state.data.customEx);

function planList(s) {
  const plan = s.plan || [];
  if (!plan.length) return h('p', { class: 'muted', style: { margin: 0 } }, 'Todavía no hay plan escrito.');
  return h('ol', { class: 'plain' }, plan.map((b) => { const ex = b.ex ? getEx(b.ex) : null;
    return h('li', {}, ex ? h('a', { href: `#/ejercicio/${ex.id}` }, ex.name) : (b.text || 'Bloque'), ` (${b.min} min)`, b.note ? h('span', { class: 'row-sub' }, ` ${b.note}`) : null); }));
}

export default function entrenos(ctx) {
  const me = ctx.me, t = todayStr();
  const all = sessions();
  const upcoming = all.filter((s) => s.status === 'planeada' && s.session_date >= t);
  const past = all.filter((s) => s.status !== 'planeada' || s.session_date < t).reverse().slice(0, 30);
  const mark = (s) => state.data.attendance.find((a) => a.session_id === s.id && a.player_id === me?.id)?.status || null;
  const el = h('div', { class: 'page' });
  el.append(h('section', {}, sectionTitle('Por venir'), upcoming.length
    ? h('div', { class: 'stack' }, upcoming.map((s) => h('details', { class: 'panel', open: s === upcoming[0] ? true : null },
      h('summary', { style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' } },
        h('span', {}, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub', style: { display: 'block' } }, `${sessionWhen(s)}, ${s.minutes} min`))),
      h('div', { style: { marginTop: '10px' } }, planList(s)))))
    : note('Tu entrenador todavía no publica entrenamientos por venir.')));
  if (past.length) el.append(h('section', {}, sectionTitle('Anteriores'), h('div', { class: 'rows' }, past.map((s) => h('div', { class: 'row' },
    h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, fmtDate(s.session_date))),
    h('span', { class: 'row-end' }, s.status === 'cancelada' ? h('span', { class: 'chip bad' }, 'Cancelado') : statusChip(mark(s))))))));
  return { title: 'Entrenos', el };
}
