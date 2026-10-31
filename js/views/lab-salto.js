// Laboratorio de salto vertical del entrenador: pruebas, programa de 12 semanas y bitácora de carga.
import { h, ic, fmtDate, todayStr, addDays, plural, nextWeekday } from '../util.js';
import { state, profile, saveProfile, labReady, settings } from '../store.js';
import { TEST_KINDS, KIND_SHORT, METHODS, NET_CM, summary, testsOf, noise, attackReach, rsi, weeklyLoad, painAlert, programPosition, programEnds, weekStart } from '../lab-calc.js';
import { PROGRAM, TEST_WEEKS, RULES, SOURCES, LAB_BY_ID, itemSets, itemContacts, sessionContacts, sessionMinutes, repsText } from '../content/lab-salto.js';
import { sectionTitle, note, empty, field } from './ui.js';
import { lineChart } from './chart.js';
import { testSheet, jumpLogSheet, profileSheet, FOCUS, PAIN_ZONES } from './sheets-lab.js';
import { calItemSheet } from './sheets-session.js';
import { weekPlan } from '../content/gym.js';

// Calendario del programa: sesión A y B en los 2 días que elijas, de hoy a la semana 12.
export function labCalDefaults() {
  const pr = profile(), pos = programPosition(pr.program_start);
  if (!pr.program_start || pos?.finished) return null;
  return { days: weekPlan(2, settings().days || []).map((x) => x.wd), time: '07:00' };
}
export function labCalEvents(days, time, alarm = 60) {
  const pr = profile(); if (!pr.program_start) return [];
  const ds = [...days].sort((a, b) => (a || 7) - (b || 7)), ev = [];
  for (let w = 1; w <= 12; w++) {
    const ws = addDays(pr.program_start, (w - 1) * 7), b = PROGRAM[Math.floor((w - 1) / 3)], wib = ((w - 1) % 3) + 1;
    ds.slice(0, 2).map((wd) => nextWeekday(ws, wd)).sort().forEach((date, i) => {   // dentro de cada semana, A va primero
      const k = i ? 'B' : 'A';
      if (date < todayStr()) return;
      ev.push({ uid: `lab-${pr.program_start}-${w}${k}`, summary: `Salto vertical · semana ${w}, sesión ${k}`, date, time, minutes: sessionMinutes(b[k], wib) || 45,
        desc: `Bloque ${b.name}: ${b[k].title}.${TEST_WEEKS.includes(w) && k === 'A' ? ' Esta semana toca medir tu salto al inicio de la sesión.' : ''}`, alarm });
    });
  }
  return ev;
}
const labCalSheet = () => { const def = labCalDefaults(); if (!def) return;
  calItemSheet({ title: 'Programa de salto en el calendario', name: 'laboratorio', intro: 'Elige tus 2 días (deja al menos uno de descanso entre ellos). Cada semana: sesión A el primero y sesión B el segundo, hasta la semana 12.',
    weekly: { days: def.days, time: def.time, need: 2 }, events: ({ days, time, alarm }) => labCalEvents(days, time, alarm) }); };

const TABS = [['pruebas', 'Pruebas'], ['programa', 'Programa'], ['bitacora', 'Bitácora']];
const FOCUS_OF = { base: ['fuerza', 'aterrizaje'], fuerza: ['fuerza', 'pliometria'], potencia: ['potencia', 'pliometria'], transferencia: ['potencia', 'pliometria'] };
const signed = (n, u = '') => `${n > 0 ? '+' : ''}${n}${u}`;
const kpi = (n, l) => h('div', { class: 'kpi' }, h('span', { class: 'n' }, n), h('span', { class: 'l' }, l));

export default function labSalto(ctx) {
  const ui = ctx.ui;
  if (!ui.init) { ui.init = true; if (['pruebas', 'programa', 'bitacora'].includes(ctx.args[1])) ui.tab = ctx.args[1]; }
  ui.tab = ui.tab || 'pruebas';
  const ro = !labReady();
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === id ? 'true' : 'false', onclick: () => { ui.tab = id; ctx.rerender(); } }, label)));
  const body = ui.tab === 'programa' ? programa(ctx, ro) : ui.tab === 'bitacora' ? bitacora(ctx, ro) : pruebas(ctx, ro);
  return { title: 'Salto vertical', sub: 'Solo tú lo ves', back: '#/lab', el: h('div', { class: 'page' }, tabs, body) };
}

// ---------- Pruebas ----------
function pruebas(ctx, ro) {
  const ui = ctx.ui, tests = state.data.jumpTests, pr = profile();
  const kinds = Object.keys(TEST_KINDS).filter((k) => tests.some((t) => t.kind === k));
  if (!ui.kind || !kinds.includes(ui.kind)) ui.kind = kinds.includes('cmj') ? 'cmj' : kinds[0];
  const tools = h('div', { class: 'cluster' },
    ro ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => testSheet() }, ic('plus', 18), 'Registrar prueba'),
    h('a', { class: 'btn', href: '#/medir/cmj/lab' }, ic('video', 18), 'Medir con video'),
    ro ? null : h('button', { class: 'btn', type: 'button', onclick: () => profileSheet() }, ic('ruler', 18), 'Mis datos'));
  if (!tests.length) {
    return h('div', { class: 'stack' }, tools,
      empty('Todavía no hay pruebas', 'Mide tu salto antes de empezar el programa. Así sabrás cuánto mejoras. Con «Medir con video» (la cámara lenta de tu celular) o con una marca en la pared basta.'),
      howToMeasure(pr.method));
  }
  const list = testsOf(tests, ui.kind), sm = summary(tests, ui.kind), nz = noise(list);
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tipo de prueba' }, kinds.map((k) =>
    h('button', { type: 'button', 'aria-pressed': ui.kind === k ? 'true' : 'false', onclick: () => { ui.kind = k; ctx.rerender(); } }, KIND_SHORT[k])));
  const isDrop = ui.kind === 'drop';
  const pts = list.map((t) => ({ x: t.test_date, y: Number(t.height_cm), tip: [METHODS[t.method], isDrop && rsi(t.height_cm, t.contact_ms) ? `índice reactivo ${rsi(t.height_cm, t.contact_ms)}` : null].filter(Boolean).join(', ') }));
  const net = NET_CM[pr.net || 'M'], ar = attackReach(pr, tests, net);
  return h('div', { class: 'stack' }, tools,
    !pr.reach_cm ? note('Anota tu alcance de pie en "Mis datos" para ver a qué altura atacas comparado con la red.') : null,
    seg,
    h('section', { class: 'panel stack' },
      h('h2', {}, TEST_KINDS[ui.kind]),
      h('div', { class: 'kpis' }, kpi(`${sm.best}`, 'Mejor (cm)'), kpi(`${sm.last}`, 'Última (cm)'), kpi(sm.n > 1 ? signed(sm.change) : '—', sm.n > 1 ? `Desde el ${fmtDate(sm.firstDate, { day: 'numeric', month: 'short' })}` : 'Cambio')),
      lineChart(pts, { label: TEST_KINDS[ui.kind] }),
      sm.n > 1 ? h('p', { style: { margin: 0 } }, `De ${sm.first} a ${sm.last} cm (${signed(sm.changePct, '%')}). Promedio de tus 3 últimas: ${sm.avg3} cm.`) : h('p', { style: { margin: 0 } }, 'Con una segunda prueba verás si vas mejorando.'),
      nz != null ? note(`Entre tus intentos de una misma prueba hay en promedio ±${nz} cm de diferencia. Un cambio más chico que eso puede ser variación normal de la medición, no mejora real (cálculo de Remate).`) : null),
    ar.touch != null ? h('section', { class: 'panel stack' }, h('h2', {}, 'Alcance de remate'),
      h('p', { style: { margin: 0 } }, `Tu alcance de pie (${ar.reach} cm) más tu mejor salto de remate (${ar.spike.best} cm) = `, h('strong', {}, `${ar.touch} cm`), '.'),
      h('p', { style: { margin: 0 } }, ar.above >= 0 ? `Llegas ${ar.above} cm por encima de la red ${pr.net === 'F' ? 'femenil' : 'varonil'} (${net} cm).` : `Te faltan ${-ar.above} cm para llegar a la altura de la red ${pr.net === 'F' ? 'femenil' : 'varonil'} (${net} cm).`))
      : pr.reach_cm ? note('Registra un salto de remate (con aproximación) para calcular a qué altura atacas.') : null,
    sectionTitle('Historial'),
    h('div', { class: 'rows' }, tests.slice().sort((a, b) => `${b.test_date}${b.created_at}`.localeCompare(`${a.test_date}${a.created_at}`)).map((t) => {
      const r = t.kind === 'drop' ? rsi(t.height_cm, t.contact_ms) : null;
      return h(ro ? 'div' : 'button', { type: ro ? null : 'button', class: 'row', onclick: ro ? null : () => testSheet(t) },
        h('span', { class: 'row-main' }, h('strong', {}, `${KIND_SHORT[t.kind]}: ${Number(t.height_cm)} cm`),
          h('span', { class: 'row-sub' }, [fmtDate(t.test_date, { day: 'numeric', month: 'short', year: 'numeric' }), METHODS[t.method], r ? `índice reactivo ${r}` : null, t.note || null].filter(Boolean).join(' · '))),
        ro ? null : h('span', { class: 'row-end' }, ic('pencil', 16)));
    })),
    howToMeasure(pr.method));
}

function howToMeasure(method) {
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo medir para que sirva comparar')),
    h('ul', { class: 'plain', style: { marginTop: '10px' } },
      h('li', {}, 'Mide siempre igual: mismo método, mismo piso, mismos tenis, a la misma hora del día y después del mismo calentamiento.'),
      h('li', {}, 'Haz 3 intentos con 1 minuto de descanso y guarda los tres; Remate toma el mejor.'),
      h('li', {}, 'No midas cansado ni al día siguiente de una sesión fuerte de saltos.'),
      h('li', {}, `Método que usas: ${METHODS[method || 'myjump']}. Al registrar una prueba verás los pasos de cada método.`),
      h('li', {}, 'Sin apps de paga: «Medir con video» calcula tu salto con el tiempo en el aire, cuadro por cuadro, igual que My Jump. Su guía explica cada prueba.'),
      h('li', {}, 'Pruebas recomendadas: con contramovimiento (manos en la cadera) para ver tu fuerza de pierna, y de remate con aproximación para ver tu salto de juego.')));
}

// ---------- Programa ----------
function suggested(pos) {
  if (!pos || pos.notStarted || pos.finished) return 'A';
  const ws = weekStart(todayStr());
  const done = state.data.jumpSessions.filter((s) => s.session_date >= ws && /sesión [AB]/i.test(s.note || '')).length;
  return done >= 1 ? 'B' : 'A';
}

function programa(ctx, ro) {
  const ui = ctx.ui, pr = profile();
  const pos = programPosition(pr.program_start);
  const live = pos && !pos.notStarted && !pos.finished;
  if (ui.week == null) ui.week = live ? pos.week : 1;
  if (!ui.which) ui.which = suggested(pos);
  const week = ui.week, bi = Math.floor((week - 1) / 3), wib = ((week - 1) % 3) + 1, block = PROGRAM[bi], sess = block[ui.which];
  const ws = weekStart(todayStr());
  const thisWeek = state.data.jumpSessions.filter((s) => s.session_date >= ws);

  const status = !pr.program_start
    ? h('section', { class: 'panel stack' }, h('h2', {}, 'Empieza tu programa'),
      h('p', { style: { margin: 0 } }, '12 semanas, 2 sesiones por semana de 35 a 50 minutos, con tu peso corporal, conos, un escalón y tus polainas (solo para fuerza de cadera, nunca para saltar).'),
      ro ? null : startControl(ctx))
    : pos.notStarted ? h('div', { class: 'stack' }, note(`Tu programa empieza el ${fmtDate(pr.program_start, { weekday: 'long', day: 'numeric', month: 'long' })} (en ${plural(pos.startsIn, 'día', 'días')}). Mientras, puedes revisar las sesiones.`),
      ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: labCalSheet }, ic('calendar-plus', 16), 'Agregar al calendario')))
      : pos.finished ? h('section', { class: 'panel stack' }, h('h2', {}, 'Terminaste las 12 semanas'),
        h('p', { style: { margin: 0 } }, 'Haz tu prueba final y compárala con la primera. Para seguir mejorando, repite el programa desde el bloque de fuerza o empieza otro ciclo.'),
        ro ? null : startControl(ctx, 'Empezar otro ciclo'))
        : h('section', { class: 'band next stack' },
          h('span', { class: 'chip ball' }, `Semana ${pos.week} de 12`),
          h('h2', {}, `Bloque ${pos.block + 1}: ${PROGRAM[pos.block].name}`),
          h('p', { style: { margin: 0 } }, PROGRAM[pos.block].weekNotes[pos.weekInBlock - 1]),
          h('p', { class: 'when', style: { margin: 0 } }, thisWeek.length >= 2 ? `Esta semana ya llevas ${thisWeek.length} sesiones. Descansa y juega.` : `Esta semana llevas ${plural(thisWeek.length, 'sesión', 'sesiones')} de 2. Te toca la sesión ${suggested(pos)}.`),
          TEST_WEEKS.includes(pos.week) ? h('p', { style: { margin: 0 } }, ic('ruler', 16), ' Esta semana toca medir tu salto, al inicio de una sesión.') : null,
          ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: labCalSheet }, ic('calendar-plus', 16), 'Agregar al calendario')));

  const weekSel = h('select', { 'aria-label': 'Semana del programa' }, PROGRAM.flatMap((b, i) => [1, 2, 3].map((w) => {
    const n = i * 3 + w; return h('option', { value: n, selected: n === week ? true : null }, `Semana ${n}, ${b.name}${live && n === pos.week ? ' (esta semana)' : ''}`);
  })));
  weekSel.addEventListener('change', () => { ui.week = Number(weekSel.value); ctx.rerender(); });
  const which = h('div', { class: 'seg', role: 'group', 'aria-label': 'Sesión' }, ['A', 'B'].map((k) =>
    h('button', { type: 'button', 'aria-pressed': ui.which === k ? 'true' : 'false', onclick: () => { ui.which = k; ctx.rerender(); } }, `Sesión ${k}`)));
  const contacts = sessionContacts(sess, wib), mins = sessionMinutes(sess, wib);

  const plan = h('section', { class: 'stack' },
    sectionTitle(sess.title),
    h('div', { class: 'cluster' }, field('Semana', weekSel), which),
    h('div', { class: 'cluster' }, h('span', { class: 'chip ball' }, `Unos ${mins} min`), h('span', { class: 'chip' }, contacts ? `${contacts} saltos (tope del bloque: ${block.cap})` : 'Sin saltos: solo fuerza'), h('span', { class: 'chip info' }, `Bloque ${bi + 1}, semana ${wib} de 3`)),
    h('div', { class: 'blocks' }, sess.items.map((it, i) => {
      const ex = LAB_BY_ID[it.ex], c = itemContacts(it, wib);
      return h('div', { class: 'block' }, h('span', { class: 'i' }, String(i + 1)),
        h('div', { class: 't' }, h('a', { href: `#/ejercicio/${it.ex}` }, ex.name),
          h('span', { class: 'row-sub' }, it.unit === 'ronda' ? 'Una ronda completa' : `${itemSets(it, wib)} ${itemSets(it, wib) === 1 ? 'serie' : 'series'} de ${repsText(it)}${it.rest !== '—' ? `, descanso ${it.rest}` : ''}${c ? `, ${c} saltos` : ''}`),
          it.note ? h('span', { class: 'row-sub' }, it.note) : null));
    })),
    ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => jumpLogSheet(null, {
      focus: FOCUS_OF[block.id][ui.which === 'A' ? 0 : 1], contacts, minutes: Math.round(mins / 5) * 5, items: sess.items.map((x) => ({ ...x })), weekInBlock: wib,
      note: `Semana ${week}, sesión ${ui.which}`,
    }) }, ic('check', 18), 'Registrar esta sesión')));

  return h('div', { class: 'stack' }, status, plan,
    h('section', { class: 'stack' }, sectionTitle('Reglas del programa'), h('ul', { class: 'plain' }, RULES.map((r) => h('li', {}, r)))),
    h('section', { class: 'stack' }, sectionTitle('Los 4 bloques'),
      h('div', { class: 'rows' }, PROGRAM.map((b, i) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, `${i + 1}. ${b.name}, semanas ${b.weeks}`), h('span', { class: 'row-sub' }, `${b.goal} Tope: ${b.cap} saltos por sesión.`)))))),
    note('Las series, repeticiones y topes de saltos son una propuesta de Remate para un adulto que ya juega. La evidencia dice que programas de pliometría con poco volumen y poca frecuencia ya mejoran el salto en voleibol, y que conviene ajustarlos a cada persona. Si tienes una lesión o dolor que no se va, consulta a un profesional antes de empezar.'),
    pr.program_start && !ro ? h('div', { class: 'cluster' }, h('span', { class: 'row-sub' }, `Inició el ${fmtDate(pr.program_start, { day: 'numeric', month: 'long' })}, termina el ${fmtDate(programEnds(pr.program_start), { day: 'numeric', month: 'long' })}.`),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => profileSheet() }, 'Cambiar fecha')) : null,
    sources());
}

function startControl(ctx, label = 'Empezar el programa') {
  const t = todayStr(), d = new Date(), wd = (d.getDay() + 6) % 7;
  const monday = wd === 0 ? t : addDays(t, 7 - wd);
  const date = h('input', { type: 'date', value: monday, 'aria-label': 'Fecha de inicio' });
  return h('div', { class: 'cluster' }, field('Fecha de inicio', date),
    h('button', { class: 'btn primary', type: 'button', onclick: () => { saveProfile({ program_start: date.value || monday }); ctx.ui.week = null; ctx.ui.which = null; } }, ic('play', 18), label));
}

// ---------- Bitácora ----------
function bitacora(ctx, ro) {
  const list = state.data.jumpSessions.slice().sort((a, b) => `${b.session_date}${b.created_at}`.localeCompare(`${a.session_date}${a.created_at}`));
  const pain = painAlert(list), weeks = weeklyLoad(list).slice(0, 8);
  const tools = ro ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => jumpLogSheet() }, ic('plus', 18), 'Registrar sesión'),
    h('a', { class: 'btn', href: '#/lab/salto/programa' }, ic('dumbbell', 18), 'Sesión del programa'));
  if (!list.length) return h('div', { class: 'stack' }, tools, empty('Sin sesiones registradas', 'Registra cada sesión con sus saltos, minutos, esfuerzo y molestias. Así ves tu carga semana a semana y detectas a tiempo si algo duele.'));
  return h('div', { class: 'stack' }, tools,
    pain ? note(`Molestia en ${PAIN_ZONES[pain.zone].toLowerCase()} de ${pain.level} o más en tus 2 últimas sesiones. Baja los saltos esta semana (quédate con fuerza y movilidad) y, si sigue, consulta a un fisioterapeuta o médico.`, 'bad') : null,
    h('section', { class: 'stack' }, sectionTitle('Carga por semana'),
      h('div', { class: 'rows' }, weeks.map((w) => h('div', { class: 'row' },
        h('span', { class: 'row-main' }, h('strong', {}, `Semana del ${fmtDate(w.week, { day: 'numeric', month: 'short' })}`),
          h('span', { class: 'row-sub' }, [plural(w.sessions, 'sesión', 'sesiones'), plural(w.contacts, 'salto', 'saltos'), w.avgRpe ? `esfuerzo promedio ${w.avgRpe}` : null].filter(Boolean).join(', '))),
        w.load ? h('span', { class: 'row-end' }, h('span', { class: 'chip', title: 'Esfuerzo por minutos' }, `Carga ${w.load}`)) : null))),
      note('Carga = esfuerzo de la sesión (1 a 10) por minutos. Sirve para comparar semanas: lo que conviene evitar son los saltos grandes y repentinos de una semana a otra.')),
    h('section', { class: 'stack' }, sectionTitle('Sesiones'),
      h('div', { class: 'rows' }, list.map((s) => h(ro ? 'div' : 'button', { type: ro ? null : 'button', class: 'row', onclick: ro ? null : () => jumpLogSheet(s) },
        h('span', { class: 'row-main' }, h('strong', {}, `${fmtDate(s.session_date)}: ${FOCUS[s.focus] || s.focus}`),
          h('span', { class: 'row-sub' }, [plural(s.contacts || 0, 'salto', 'saltos'), s.minutes ? `${s.minutes} min` : null, s.rpe ? `esfuerzo ${s.rpe}` : null, s.note || null].filter(Boolean).join(' · '))),
        h('span', { class: 'row-end' }, s.pain_zone ? h('span', { class: `chip ${s.pain_level >= 4 ? 'bad' : 'warn'}` }, `${PAIN_ZONES[s.pain_zone]} ${s.pain_level}`) : null, ro ? null : ic('pencil', 16)))))));
}

function sources() {
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale esto')),
    h('ul', { class: 'plain srcs', style: { marginTop: '10px' } }, SOURCES.map((s) => h('li', {}, h('a', { href: s.u, target: '_blank', rel: 'noopener' }, s.t), `. ${s.d}`))));
}
