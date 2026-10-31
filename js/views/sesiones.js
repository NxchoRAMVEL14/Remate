// Lista de entrenamientos: por venir, pendientes de lista y anteriores.
import { h, ic, plural, toast, todayStr, addDays, parseDate, fmtDate, openSheet, DAYS_LONG } from '../util.js';
import { state, sessions, settings, group, add } from '../store.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../content/templates.js';
import { sectionTitle, empty, note, sessionWhen, options, field } from './ui.js';
import { sessionFormSheet } from './sheets-session.js';
import { currentBlock } from './temporada.js';
import { teoriaCard } from './teoria.js';

function sessionRow(s) {
  const marks = state.data.attendance.filter((a) => a.session_id === s.id);
  const present = marks.filter((a) => a.status === 'presente' || a.status === 'retardo').length;
  const blocks = (s.plan || []).length;
  let chip;
  if (s.status === 'cancelada') chip = h('span', { class: 'chip bad' }, 'Cancelado');
  else if (s.status === 'hecha') chip = h('span', { class: `chip ${marks.length ? 'ok' : ''}` }, marks.length ? `${present} de ${marks.length}` : 'Sin lista');
  else chip = h('span', { class: `chip ${s.published ? 'info' : ''}` }, s.published ? 'Publicado' : 'Borrador');
  return h('a', { class: 'row', href: `#/sesion/${s.id}` },
    h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'),
      h('span', { class: 'row-sub' }, `${sessionWhen(s)}, ${s.minutes} min${blocks ? `, ${plural(blocks, 'bloque', 'bloques')}` : ', sin plan'}`)),
    h('span', { class: 'row-end' }, chip, ic('chevron-right', 18)));
}

export default function sesiones(ctx) {
  const ui = ctx.ui; ui.shown ??= 15;
  const all = sessions(), t = todayStr();
  const upcoming = all.filter((s) => s.status === 'planeada' && s.session_date >= t);
  const overdue = all.filter((s) => s.status === 'planeada' && s.session_date < t).reverse();
  const past = all.filter((s) => s.status !== 'planeada').reverse();
  const el = h('div', { class: 'page' },
    (() => { const b = currentBlock(); return h('a', { class: 'labcard', href: '#/temporada' }, h('span', { class: 'lc-ic' }, ic('calendar-range', 26)),
      h('span', { class: 'lc-t' }, h('strong', {}, 'Planear temporada'), h('span', {}, b ? `Bloque actual: ${b.name}` : 'Bloques con enfoque que crean tus entrenamientos.')), ic('chevron-right', 20)); })(),
    teoriaCard(ctx),
    h('section', {}, sectionTitle('Entrenamientos', h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: scheduleSheet }, ic('calendar-days', 16), 'Programar semanas'),
      h('button', { class: 'btn primary sm', type: 'button', onclick: () => sessionFormSheet(null, (s) => { location.hash = `#/sesion/${s.id}`; }) }, ic('plus', 16), 'Nuevo'))),
    all.length ? null : empty('Aún no hay entrenamientos', 'Crea uno con una plantilla o programa varias semanas de golpe con tus días de entrenamiento.')));
  if (overdue.length) el.append(h('section', {}, sectionTitle('Sin lista'), note('Estos entrenamientos ya pasaron y no tienen lista. Ábrelos para pasar lista o cancelarlos.', 'warn'),
    h('div', { class: 'rows', style: { marginTop: '8px' } }, overdue.map(sessionRow))));
  if (upcoming.length) el.append(h('section', {}, sectionTitle('Por venir'), h('div', { class: 'rows' }, upcoming.map(sessionRow))));
  else if (all.length) el.append(h('section', {}, sectionTitle('Por venir'), note('No hay entrenamientos por venir. Usa “Programar semanas” para llenar el calendario.')));
  if (past.length) {
    el.append(h('section', {}, sectionTitle('Anteriores'), h('div', { class: 'rows' }, past.slice(0, ui.shown).map(sessionRow)),
      past.length > ui.shown ? h('button', { class: 'btn sm', type: 'button', style: { marginTop: '10px' }, onclick: () => { ui.shown += 20; ctx.rerender(); } }, `Ver más (${past.length - ui.shown})`) : null));
  }
  return { title: 'Entrenamientos', el };
}

// Crea entrenamientos vacíos en los días de entrenamiento de las próximas semanas.
function scheduleSheet() {
  const st = settings();
  if (!(st.days || []).length) { toast('Primero elige tus días de entrenamiento en Ajustes'); location.hash = '#/ajustes'; return; }
  const weeks = h('select', {}, options([[1, '1 semana'], [2, '2 semanas'], [4, '4 semanas'], [8, '8 semanas']], 4));
  const tpl = h('select', {}, options([['', 'En blanco (arma cada plan después)'], ...TEMPLATES.map((x) => [x.id, `${x.name}, ${x.minutes} min`])], ''));
  const preview = h('p', { 'aria-live': 'polite' });
  const dates = () => {
    const have = new Set(state.data.sessions.map((s) => s.session_date)), out = [];
    for (let i = 0; i < Number(weeks.value) * 7; i++) { const d = addDays(todayStr(), i); if (st.days.includes(parseDate(d).getDay()) && !have.has(d)) out.push(d); }
    return out;
  };
  const paint = () => { const d = dates(); preview.textContent = d.length ? `Se crearán ${plural(d.length, 'entrenamiento', 'entrenamientos')}: ${d.slice(0, 6).map((x) => fmtDate(x, { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}${d.length > 6 ? ' y más' : ''}.` : 'Ya hay entrenamientos en todos esos días.'; };
  weeks.addEventListener('input', paint); paint();
  openSheet({
    title: 'Programar semanas',
    body: h('div', { class: 'stack' }, h('p', {}, `Usa tus días de entrenamiento (${st.days.map((d) => DAYS_LONG[d]).join(', ')}) y tu hora de ${st.start}. No toca los días que ya tienen entrenamiento.`),
      field('Cuántas semanas', weeks), field('Plantilla para todos', tpl, 'Puedes cambiar el plan de cada uno después.'), preview),
    actions: [{ label: 'Cancelar' }, { label: 'Crear', kind: 'primary', onClick: () => {
      const d = dates(); if (!d.length) { toast('No hay días nuevos que crear'); return false; }
      const tp = TEMPLATE_BY_ID[tpl.value];
      for (const date of d) add('sessions', { group_id: group()?.id, session_date: date, start_time: st.start, minutes: tp?.minutes || st.minutes, title: tp?.name || '',
        focus: tp?.focus || [], plan: tp ? tp.blocks.map((b) => ({ ...b, note: '' })) : [], status: 'planeada', published: false });
      toast(`${plural(d.length, 'entrenamiento creado', 'entrenamientos creados')}`);
    } }],
  });
}
