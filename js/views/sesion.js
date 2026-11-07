// Un entrenamiento: datos, plan por bloques (editable), lista de asistencia y modo cancha.
import { h, ic, toast, plural, addDays, parseDate, fmtDate, openSheet, confirmSheet, todayStr } from '../util.js';
import { state, getSession, patch, add, remove, settings, players, convocados, hasConv, saveConv, isApart } from '../store.js';
import { planMinutes, focusOf } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { TEMPLATES, TEMPLATE_BY_ID, planFromTemplate, WARMUPS, warmupFor } from '../content/templates.js';
import { getExercise, KINDS, levelLabel } from '../content/exercises.js';
import { courtSVG } from '../court.js';
import { sectionTitle, empty, note, longDate, field, options, STATUS_LABEL, jersey } from './ui.js';
import { sessionFormSheet, attendanceSheet, pickExerciseSheet, undoDone, calButton, sessionEvent } from './sheets-session.js';
import { noticeSheet } from './avisos.js';
import { openCourtMode } from './court-mode.js';
import { azarButton } from './azar.js';

const getEx = (id) => getExercise(id, state.data.customEx);

// v3.20: a quiénes convocas a este entreno. Solo ellos salen al pasar lista y solo ellos reciben falta.
function convBox(s, marks) {
  const all = players(), conv = convocados(s), apart = all.filter(isApart);
  const custom = hasConv(s);
  return h('section', { class: 'panel stack conv-box' },
    h('div', { class: 'split' }, h('h3', {}, 'Convocados'), h('span', { class: `chip ${custom ? 'info' : ''}` }, `${conv.length} de ${all.length}`)),
    h('p', { class: 'row-sub', style: { margin: 0 } }, custom ? 'Elegiste a quiénes convocas. Solo ellos salen al pasar lista y solo ellos reciben falta.'
      : apart.length ? `Todos, menos ${apart.length === 1 ? `${apart[0].name}, que entrena contigo aparte` : `${apart.length} que entrenan contigo aparte`}. Solo ellos salen al pasar lista.` : 'Todo el equipo. Si sabes quién no va a venir, elige a los convocados: así no les pones falta.'),
    conv.length && conv.length < all.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, conv.map((p) => p.name).join(', ')) : null,
    s.status !== 'cancelada' ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => convSheet(s) }, ic('users', 16), 'Elegir convocados'),
      custom ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { saveConv(s, null); toast('Convocados: todo el equipo'); } }, ic('undo-2', 16), 'Todo el equipo') : null) : null);
}
function convSheet(s) {
  const all = players(), pick = new Set(convocados(s).map((p) => p.id));
  // Los que vinieron al último entreno hecho (antes de este).
  const prev = (state.data.sessions || []).filter((x) => x.status === 'hecha' && x.id !== s.id && x.session_date <= s.session_date).sort((a, b) => `${b.session_date}${b.start_time || ''}`.localeCompare(`${a.session_date}${a.start_time || ''}`))[0];
  const came = prev ? new Set(state.data.attendance.filter((a) => a.session_id === prev.id && (a.status === 'presente' || a.status === 'retardo')).map((a) => a.player_id)) : null;
  const rows = h('div', { class: 'rows' }), count = h('strong', {});
  const paint = () => {
    count.textContent = `${pick.size} de ${all.length} convocados`;
    rows.replaceChildren(...all.map((p) => h('label', { class: 'row conv-row' }, jersey(p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, p.name), isApart(p) ? h('span', { class: 'row-sub' }, 'Entrena contigo aparte') : null),
      h('input', { type: 'checkbox', checked: pick.has(p.id) ? true : null, 'aria-label': `Convocar a ${p.name}`, onchange: (e) => { if (e.target.checked) pick.add(p.id); else pick.delete(p.id); count.textContent = `${pick.size} de ${all.length} convocados`; } }))));
  };
  const setAll = (ids) => { pick.clear(); ids.forEach((id) => pick.add(id)); paint(); };
  paint();
  let sh;
  sh = openSheet({ title: 'Elegir convocados', body: h('div', { class: 'stack' },
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Palomea a los que van a este entreno. A los demás no se les pone falta ni salen al pasar lista.'),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => setAll(all.filter((p) => !isApart(p)).map((p) => p.id)) }, 'Todo el equipo'),
      came && came.size ? h('button', { class: 'btn sm', type: 'button', onclick: () => setAll([...came].filter((id) => all.some((p) => p.id === id))) }, 'Los que vinieron la última vez') : null,
      h('button', { class: 'btn sm ghost', type: 'button', onclick: () => setAll([]) }, 'Nadie')),
    count, rows,
    h('button', { class: 'btn primary', type: 'button', onclick: () => {
      if (!pick.size) { toast('Convoca por lo menos a uno'); return; }
      const team = all.filter((p) => !isApart(p)).map((p) => p.id);
      const same = pick.size === team.length && team.every((id) => pick.has(id));
      saveConv(s, same ? null : [...pick]); sh?.close(); toast(`Convocados: ${pick.size}`);
    } }, ic('check', 18), 'Guardar convocados')) });
}

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
      s.status !== 'cancelada' && s.session_date === todayStr() ? h('a', { class: 'btn ball', href: `#/lista-qr/${s.id}` }, ic('qr-code', 18), 'Lista con QR') : null,
      plan.length && s.status !== 'cancelada' ? h('button', { class: 'btn', type: 'button', onclick: () => openCourtMode(s) }, ic('timer', 18), 'Modo cancha') : null,
      s.status !== 'cancelada' ? azarButton(s.id) : null,
      plan.length ? h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir plan') : null),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.published ? true : null, onchange: (e) => { patch('sessions', s.id, { published: e.target.checked }); toast(e.target.checked ? 'Publicado: tus jugadores ya lo ven' : 'Oculto para los jugadores'); } }),
      'Visible para los jugadores (plan y horario)'),
    s.published && s.status === 'planeada' ? h('button', { class: 'btn sm', type: 'button', style: { justifySelf: 'start' }, onclick: () => noticeSheet(sessionNotice(s)) }, ic('megaphone', 16), 'Avisar al equipo') : null,
    h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => sessionFormSheet(s) }, ic('pencil', 16), 'Editar datos'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => duplicate(s) }, ic('copy', 16), 'Duplicar'),
      s.status !== 'cancelada' && s.session_date >= todayStr() ? calButton({ name: 'entrenamiento', events: [sessionEvent(s)] }) : null,
      s.status === 'hecha' ? h('button', { class: 'btn sm', type: 'button', title: 'Por si pasaste lista por error', onclick: () => undoDone(s) }, ic('undo-2', 16), 'Regresar a Por hacer') : null,
      s.status === 'cancelada'
        ? h('button', { class: 'btn sm', type: 'button', onclick: () => { patch('sessions', s.id, { status: marks.length ? 'hecha' : 'planeada' }); toast('Entrenamiento reactivado'); } }, 'Reactivar')
        : h('button', { class: 'btn sm', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Cancelar este entrenamiento?', text: 'Los jugadores lo verán como cancelado y no cuenta para la asistencia.', ok: 'Cancelar entrenamiento', danger: true })) { patch('sessions', s.id, { status: 'cancelada' }); toast('Entrenamiento cancelado'); } } }, 'Cancelar'),
      h('button', { class: 'btn sm danger', type: 'button', onclick: async () => { if (await confirmSheet({ title: '¿Eliminar este entrenamiento?', text: 'Se borran también su plan y su lista de asistencia.', ok: 'Eliminar', danger: true })) { remove('sessions', s.id); toast('Entrenamiento eliminado'); location.hash = '#/sesiones'; } } }, ic('trash-2', 16), 'Eliminar')));

  const balance = h('div', { class: 'balance' }, h('strong', {}, `Plan de ${total} de ${s.minutes} min`),
    plan.length ? h('span', { class: `chip ${diff === 0 ? 'ok' : 'warn'}` }, diff === 0 ? 'Completo' : diff > 0 ? `Faltan ${diff} min` : `Sobran ${-diff} min`) : null);

  const blocks = plan.length ? h('div', { class: 'blocks' }, plan.map((b, i) => blockRow(s, plan, i, b, setPlan)))
    : empty('El plan está vacío', 'Elige una plantilla para empezar rápido, o agrega ejercicios uno por uno.');

  // Sugerencia: empezar con el calentamiento preventivo de la semana (se apaga en Ajustes).
  const wu = warmupFor(s.session_date), fiIdx = plan.findIndex((b) => b.ex === 'fi-01');
  const suggest = settings().warmup_prev !== false && s.status === 'planeada' && !plan.some((b) => WARMUPS.includes(b.ex))
    ? h('div', { class: 'note stack warmup-tip' },
      h('span', {}, h('strong', {}, 'Sugerencia: '), `empieza con el ${getEx(wu)?.name.split(':')[0].toLowerCase() || 'calentamiento preventivo'} (tobillo, rodilla y hombro, 10 min).`),
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm primary', type: 'button', onclick: () => {
          setPlan(fiIdx >= 0 ? plan.map((b, k) => (k === fiIdx ? { ...b, ex: wu, min: Math.max(10, Number(b.min) || 10) } : b)) : [{ ex: wu, min: 10, note: '' }, ...plan]);
          toast('Calentamiento preventivo agregado'); } }, fiIdx >= 0 ? 'Cambiar el calentamiento' : 'Agregar al inicio'),
        h('a', { class: 'btn sm ghost', href: `#/ejercicio/${wu}` }, 'Ver ejercicios'))) : null;
  const planBox = h('section', { class: 'no-print stack' },
    sectionTitle('Plan', h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => templateSheet(s) }, ic('book-open', 16), 'Plantilla'),
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => pickExerciseSheet((blk) => { setPlan([...plan, { ...blk, note: '' }]); toast('Bloque agregado'); }) }, ic('plus', 16), 'Ejercicio'))),
    suggest, balance, blocks);

  const conv = convBox(s, marks);
  const notes = h('textarea', { maxlength: 1200, placeholder: 'Recordatorios para el grupo o cómo salió', value: s.notes || '', 'aria-label': 'Notas del entrenamiento', onchange: (e) => patch('sessions', s.id, { notes: e.target.value.trim() }) });
  const att = marks.length ? (() => { const c = { presente: 0, retardo: 0, falta: 0, justificada: 0 }; marks.forEach((m) => c[m.status]++); return c; })() : null;

  return { title: s.title || 'Entrenamiento', back: '#/sesiones', actions: plan.length ? [{ label: 'Imprimir plan', icon: 'printer', onClick: () => window.print() }] : [],
    el: h('div', { class: 'page' }, h('div', { class: 'no-print stack' }, head, conv), planBox,
      att ? h('section', { class: 'no-print' }, sectionTitle('Asistencia'), h('div', { class: 'cluster' }, ['presente', 'retardo', 'falta', 'justificada'].map((k) => h('span', { class: `chip ${{ presente: 'ok', retardo: 'warn', falta: 'bad', justificada: 'info' }[k]}` }, `${STATUS_LABEL[k]} ${att[k]}`)),
        h('span', { class: 'chip' }, `Sin lista ${convocados(s).filter((p) => !marks.some((m) => m.player_id === p.id)).length}`))) : null,
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
      patch('sessions', s.id, { plan: planFromTemplate(t, s.session_date, settings().warmup_prev !== false), focus: t.focus, title: s.title || t.name }); toast('Plantilla aplicada');
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

// Texto del aviso de un entrenamiento (fecha, hora y enlace al plan).
export function sessionNotice(s, changed = false) {
  const when = `${longDate(s.session_date)}${s.start_time ? `, ${s.start_time.slice(0, 5)}` : ''}`;
  return { title: changed ? `Cambio de horario: ${s.title || 'entrenamiento'}` : `Entrenamiento: ${s.title || 'nuevo plan'}`.slice(0, 80),
    body: changed ? `Ahora es el ${when}.` : `${when}, ${s.minutes} min. El plan ya está en Remate.`, url: '#/entrenos' };
}
