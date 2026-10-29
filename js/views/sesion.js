// Un entrenamiento: datos, plan por bloques (editable), lista de asistencia y modo cancha.
import { h, ic, toast, plural, addDays, parseDate, fmtDate, openSheet, confirmSheet } from '../util.js';
import { state, getSession, patch, add, remove, settings, players } from '../store.js';
import { planMinutes, focusOf } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../content/templates.js';
import { getExercise, KINDS, levelLabel } from '../content/exercises.js';
import { courtSVG } from '../court.js';
import { sectionTitle, empty, note, longDate, field, options, STATUS_LABEL } from './ui.js';
import { sessionFormSheet, attendanceSheet, pickExerciseSheet } from './sheets-session.js';
import { openCourtMode } from './court-mode.js';

const getEx = (id) => getExercise(id, state.data.customEx);

export default function sesion(ctx) {
  const s = getSession(ctx.args[0]);
  if (!s) return { title: 'Entrenamiento', back: '#/sesiones', el: h('div', { class: 'page' }, empty('No encontré ese entrenamiento', 'Puede que se haya eliminado.', h('a', { class: 'btn', href: '#/sesiones' }, 'Ver entrenamientos'))) };
  const plan = s.plan || [];
  const setPlan = (p) => patch('sessions', s.id, { plan: p });
  const total = planMinutes(s), diff = s.minutes - total;
  const focus = focusOf(s, getEx);
  const marks = state.data.attendance.filter((a) => a.session_id === s.id);
  const statusChip = s.status === 'cancelada' ? h('span', { class: 'chip bad' }, 'Cancelado') : s.status === 'hecha' ? h('span', { class: 'chip ok' }, 'Hecho') : h('span', { class: 'chip info' }, 'Por hacer');

  const head = h('section', { class: 'panel stack' },
    h('div', { class: 'split' }, h('div', {}, h('h2', {}, s.title || 'Entrenamiento'), h('div', { class: 'row-sub' }, `${longDate(s.session_date)}${s.start_time ? `, ${s.start_time.slice(0, 5)}` : ''}, ${s.minutes} min`)), statusChip),
    focus.length ? h('div', { class: 'cluster' }, focus.map((k) => h('span', { class: 'chip' }, SKILL_BY_ID[k].name))) : null,
    h('div', { class: 'cluster' },
      s.status !== 'cancelada' ? h('button', { class: 'btn primary', type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 18), marks.length ? 'Editar lista' : 'Pasar lista') : null,
      plan.length && s.status !== 'cancelada' ? h('button', { class: 'btn', type: 'button', onclick: () => openCourtMode(s) }, ic('timer', 18), 'Modo cancha') : null,
      plan.length ? h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir plan') : null),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.published ? true : null, onchange: (e) => { patch('sessions', s.id, { published: e.target.checked }); toast(e.target.checked ? 'Publicado: tus jugadores ya lo ven' : 'Oculto para los jugadores'); } }),
      'Visible para los jugadores (plan y horario)'),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => sessionFormSheet(s) }, ic('pencil', 16), 'Editar datos'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => duplicate(s) }, ic('copy', 16), 'Duplicar'),
      s.status === 'cancelada'
        ? h('button', { class: 'btn sm', type: 'button', onclick: () => { patch('sessions', s.id, { status: marks.length ? 'hecha' : 'planeada' }); toast('Entrenamiento reactivado'); } }, 'Reactivar')
        : h('button', { class: 'btn sm', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Cancelar este entrenamiento?', text: 'Los jugadores lo verán como cancelado y no cuenta para la asistencia.', ok: 'Cancelar entrenamiento', danger: true })) { patch('sessions', s.id, { status: 'cancelada' }); toast('Entrenamiento cancelado'); } } }, 'Cancelar'),
      h('button', { class: 'btn sm danger', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Eliminar este entrenamiento?', text: 'Se borran también su plan y su lista de asistencia.', ok: 'Eliminar', danger: true })) { remove('sessions', s.id); toast('Entrenamiento eliminado'); location.hash = '#/sesiones'; } } }, ic('trash-2', 16), 'Eliminar')));

  const balance = h('div', { class: 'balance' }, h('strong', {}, `Plan de ${total} de ${s.minutes} min`),
    plan.length ? h('span', { class: `chip ${diff === 0 ? 'ok' : 'warn'}` }, diff === 0 ? 'Completo' : diff > 0 ? `Faltan ${diff} min` : `Sobran ${-diff} min`) : null);

  const blocks = plan.length ? h('div', { class: 'blocks' }, plan.map((b, i) => blockRow(s, plan, i, b, setPlan)))
    : empty('El plan está vacío', 'Elige una plantilla para empezar rápido, o agrega ejercicios uno por uno.');

  const planBox = h('section', { class: 'no-print stack' },
    sectionTitle('Plan', h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => templateSheet(s) }, ic('book-open', 16), 'Plantilla'),
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => pickExerciseSheet((blk) => { setPlan([...plan, { ...blk, note: '' }]); toast('Bloque agregado'); }) }, ic('plus', 16), 'Ejercicio'))),
    balance, blocks);

  const notes = h('textarea', { maxlength: 1200, placeholder: 'Recordatorios para el grupo o cómo salió', value: s.notes || '', 'aria-label': 'Notas del entrenamiento', onchange: (e) => patch('sessions', s.id, { notes: e.target.value.trim() }) });
  const att = marks.length ? (() => { const c = { presente: 0, retardo: 0, falta: 0, justificada: 0 }; marks.forEach((m) => c[m.status]++); return c; })() : null;

  return { title: s.title || 'Entrenamiento', back: '#/sesiones', actions: plan.length ? [{ label: 'Imprimir plan', icon: 'printer', onClick: () => window.print() }] : [],
    el: h('div', { class: 'page' }, h('div', { class: 'no-print stack' }, head), planBox,
      att ? h('section', { class: 'no-print' }, sectionTitle('Asistencia'), h('div', { class: 'cluster' }, ['presente', 'retardo', 'falta', 'justificada'].map((k) => h('span', { class: `chip ${{ presente: 'ok', retardo: 'warn', falta: 'bad', justificada: 'info' }[k]}` }, `${STATUS_LABEL[k]} ${att[k]}`)),
        h('span', { class: 'chip' }, `Sin lista ${Math.max(0, players().length - marks.length)}`))) : null,
      h('section', { class: 'no-print' }, sectionTitle('Notas'), h('div', { class: 'field' }, notes, h('span', { class: 'hint' }, 'Los jugadores las ven cuando el entrenamiento está publicado. Para algo privado usa las notas de cada jugador.'))),
      printable(s, plan)) };
}

// ---------- un bloque del plan ----------
function blockRow(s, plan, i, b, setPlan) {
  const ex = b.ex ? getEx(b.ex) : null;
  const edit = (changes) => setPlan(plan.map((x, k) => (k === i ? { ...x, ...changes } : x)));
  const move = (to) => { const p = [...plan]; [p[i], p[to]] = [p[to], p[i]]; setPlan(p); };
  const mins = h('input', { type: 'number', class: 'mins', min: 1, max: 120, inputmode: 'numeric', value: b.min, 'aria-label': `Minutos del bloque ${i + 1}`,
    onchange: (e) => { const v = Math.min(120, Math.max(1, Number(e.target.value) || b.min)); edit({ min: v }); } });
  return h('div', { class: 'block' },
    h('span', { class: 'i', 'aria-hidden': 'true' }, String(i + 1)),
    h('span', { class: 't' }, ex ? h('a', { href: `#/ejercicio/${ex.id}` }, ex.name) : h('strong', {}, b.text || (b.ex ? 'Ejercicio que ya no existe' : 'Bloque libre')),
      ex ? h('span', { class: 'row-sub' }, `${KINDS[ex.kind]}, ${ex.skills.map((k) => SKILL_BY_ID[k].name).join(', ')}, ${levelLabel(ex)}`) : null),
    h('span', { class: 'ctl' }, mins, h('span', { class: 'row-sub' }, 'min'),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Subir bloque', disabled: i === 0 ? true : null, onclick: () => move(i - 1) }, ic('arrow-up', 18)),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Bajar bloque', disabled: i === plan.length - 1 ? true : null, onclick: () => move(i + 1) }, ic('arrow-down', 18)),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Nota del bloque', onclick: () => noteSheet(b, (t) => edit({ note: t })) }, ic('pencil', 18)),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar bloque', onclick: () => { setPlan(plan.filter((_, k) => k !== i)); toast('Bloque quitado'); } }, ic('x', 18))),
    b.note ? h('span', { class: 'bnote' }, b.note) : null);
}

function noteSheet(b, onSave) {
  const ta = h('textarea', { maxlength: 300, value: b.note || '', placeholder: 'Por ejemplo: “con conos a 4 m” o “solo la mitad del grupo”' });
  openSheet({ title: 'Nota del bloque', body: field('Nota', ta, 'La ven los jugadores si el entrenamiento está publicado.'),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => onSave(ta.value.trim()) }] });
}

// ---------- plantilla ----------
function templateSheet(s) {
  const sel = h('select', {}, options(TEMPLATES.map((t) => [t.id, `${t.name}, ${t.minutes} min, niveles ${t.levels[0]} a ${t.levels[1]}`]), TEMPLATES[0].id));
  const desc = h('p', { class: 'row-sub' });
  const paint = () => { desc.textContent = TEMPLATE_BY_ID[sel.value].desc; }; sel.addEventListener('input', paint); paint();
  openSheet({ title: 'Aplicar plantilla',
    body: h('div', { class: 'stack' }, field('Plantilla', sel), desc, (s.plan || []).length ? note('Esto reemplaza el plan actual.', 'warn') : null),
    actions: [{ label: 'Cancelar' }, { label: 'Aplicar', kind: 'primary', onClick: () => {
      const t = TEMPLATE_BY_ID[sel.value];
      patch('sessions', s.id, { plan: t.blocks.map((b) => ({ ...b, note: '' })), focus: t.focus, title: s.title || t.name }); toast('Plantilla aplicada');
    } }] });
}

// ---------- duplicar ----------
function duplicate(s) {
  const days = settings().days || [];
  let date = addDays(s.session_date, 7);
  for (let i = 1; i <= 21; i++) { const x = addDays(s.session_date, i); if (days.includes(parseDate(x).getDay())) { date = x; break; } }
  const ns = add('sessions', { group_id: s.group_id, session_date: date, start_time: s.start_time, minutes: s.minutes, title: s.title, focus: [...(s.focus || [])],
    plan: structuredClone(s.plan || []), notes: '', status: 'planeada', published: false });
  toast(`Copia creada para el ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}`);
  location.hash = `#/sesion/${ns.id}`;
}

// ---------- versión para imprimir: el plan con la organización de cada ejercicio ----------
function printable(s, plan) {
  return h('section', { class: 'print-only' },
    h('h1', {}, `${s.title || 'Entrenamiento'}`), h('p', {}, `${longDate(s.session_date)}${s.start_time ? `, ${s.start_time.slice(0, 5)}` : ''}. Duración: ${s.minutes} min.`),
    ...plan.map((b, i) => {
      const ex = b.ex ? getEx(b.ex) : null;
      return h('div', { style: { breakInside: 'avoid', margin: '0 0 14px', borderTop: '1px solid #999', paddingTop: '8px' } },
        h('h3', {}, `${i + 1}. ${ex ? ex.name : b.text || 'Bloque'} (${b.min} min)`),
        b.note ? h('p', {}, `Nota: ${b.note}`) : null,
        ex ? [h('p', {}, `Organización: ${ex.setup}`),
          h('ol', {}, ex.how.map((x) => h('li', {}, x))),
          ex.cues.length ? h('p', {}, `Puntos clave: ${ex.cues.join('; ')}.`) : null,
          ex.diagram ? h('div', { style: { maxWidth: '260px' }, html: courtSVG(ex.diagram, `Diagrama de ${ex.name}`) }) : null] : null);
    }));
}
