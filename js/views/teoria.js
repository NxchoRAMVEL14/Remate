// Teoría: lecciones para entender el voleibol (reglas, técnica, sistemas y táctica), con quiz, examen por módulo,
// glosario y situaciones de partido. El avance se guarda en este celular; el examen aprobado se puede mandar como reto.
import { h, ic, toast, shareText, todayStr, plural, confirmSheet } from '../util.js';
import { state, ls, add } from '../store.js';
import { UNITS, UNIT_BY_ID, LESSONS, LESSON_BY_ID, lessonsOf, GLOSSARY, EXAM } from '../content/teoria.js';
import { SCENARIOS, SCENARIO_BY_ID, CATS } from '../content/vision.js';
import { CHALLENGE_BY_ID } from '../content/challenges.js';
import { courtSVG } from '../court.js';
import { sectionTitle, note, empty } from './ui.js';

// ---------- avance (solo en este celular) ----------
const pkey = () => `remate.teoria.${state.viewAs || state.me?.id || 'entrenador'}`;
export function progress() {
  let p = {};
  try { p = JSON.parse(ls.get(pkey()) || '{}') || {}; } catch { p = {}; }
  return { read: p.read || {}, quiz: p.quiz || {}, exam: p.exam || {}, miss: p.miss || {}, repaso: p.repaso ?? null };
}
// Preguntas falladas: se guardan para el repaso de errores y salen de la lista cuando las contestas bien.
const track = (ctx, key, right) => saveProgress(ctx, (p) => { p.miss ||= {}; if (right) delete p.miss[key]; else p.miss[key] = todayStr(); });
const getQ = (key) => { const [lid, k] = String(key).split(':'); return LESSON_BY_ID[lid]?.quiz[Number(k)]; };
const missKeys = (p = progress()) => Object.keys(p.miss).filter(getQ);
function saveProgress(ctx, fn) {
  if (ctx.readonly) return;
  const p = progress(); fn(p); ls.set(pkey(), JSON.stringify(p));
}
const passMark = (l) => Math.ceil((l.quiz.length * 2) / 3);
export const lessonDone = (p, l) => (p.quiz[l.id] ?? -1) >= passMark(l);
const level = (ctx) => (ctx.role === 'player' ? ctx.me?.level || 1 : 6);

// Siguiente lección sugerida: la primera sin aprobar de los módulos de tu nivel; si ya los terminaste, cualquiera.
export function nextLesson(ctx, p = progress()) {
  const lv = level(ctx);
  return LESSONS.find((l) => UNIT_BY_ID[l.unit].min <= lv && !lessonDone(p, l)) || LESSONS.find((l) => !lessonDone(p, l)) || null;
}

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const claimFor = (ctx, cid) => (ctx.me ? state.data.claims.filter((c) => c.player_id === ctx.me.id && c.challenge_id === cid)
  .sort((a, b) => String(b.claimed_at).localeCompare(String(a.claimed_at)))[0] : null);
const lessonUrl = (id) => `${location.origin}${location.pathname}#/teoria/${id}`;

// ---------- piezas ----------
function blockEl(b) {
  if (typeof b === 'string') return h('p', {}, b);
  if (b.h) return h('h3', {}, b.h);
  if (b.ul) return h('ul', { class: 'plain' }, b.ul.map((x) => h('li', {}, x)));
  if (b.ol) return h('ol', { class: 'plain' }, b.ol.map((x) => h('li', {}, x)));
  if (b.tip) return h('div', { class: 'note teo-tip' }, h('strong', {}, 'Dato: '), b.tip);
  if (b.dg) return h('figure', { class: 'court-wrap teo-dg' }, h('div', { html: courtSVG(b.dg, b.cap || 'Diagrama de cancha') }), b.cap ? h('figcaption', {}, b.cap) : null);
  return null;
}

// Una pregunta de opción múltiple. Las opciones se revuelven una vez y se guardan en st para que no cambien al redibujar.
function questionEl(q, st, key, onAnswer, n) {
  st.order[key] ??= shuffle(q.opts.map((_, i) => i));
  const chosen = st.ans[key], answered = chosen !== undefined, right = chosen === q.a;
  return h('div', { class: `quiz-q ${answered ? (right ? 'is-ok' : 'is-bad') : ''}` },
    h('p', { class: 'qq' }, n ? h('span', { class: 'qn' }, `${n}. `) : null, q.q),
    h('div', { class: 'quiz-opts', role: 'group', 'aria-label': 'Opciones' }, st.order[key].map((i) => h('button', {
      type: 'button', class: `quiz-opt ${answered && i === q.a ? 'right' : ''} ${answered && i === chosen && !right ? 'wrong' : ''}`,
      disabled: answered ? true : null, onclick: () => { st.ans[key] = i; onAnswer(key, i === q.a); },
    }, answered && i === q.a ? ic('check', 18) : answered && i === chosen ? ic('x', 18) : null, h('span', {}, q.opts[i])))),
    answered ? h('p', { class: 'quiz-why', role: 'status' }, h('strong', {}, right ? 'Correcto. ' : 'No es esa. '), q.why) : null);
}

const unitChip = (u, lv) => h('span', { class: `chip ${u.min <= lv ? 'info' : ''}` }, u.min <= lv ? u.tag : `${u.tag}, desde nivel ${u.min}`);

// Tarjeta para Entrenos (jugador) y Entrenamientos (entrenador).
export function teoriaCard(ctx) {
  const p = progress(), done = LESSONS.filter((l) => lessonDone(p, l)).length, nx = nextLesson(ctx, p);
  const coach = ctx.role === 'coach';
  return h('a', { class: 'labcard', href: !coach && nx && done ? `#/teoria/${nx.id}` : '#/teoria' },
    h('span', { class: 'lc-ic' }, ic('notebook-pen', 26)),
    h('span', { class: 'lc-t' }, h('strong', {}, coach ? 'Teoría para tus jugadores' : 'Teoría: aprende voleibol'),
      h('span', {}, coach ? `${LESSONS.length} lecciones de reglas, técnica, sistemas y táctica, con quiz y examen.`
        : done ? `${done} de ${LESSONS.length} lecciones aprobadas.${nx ? ` Sigue: ${nx.name}.` : ' ¡Terminaste todas!'}` : `Reglas, técnica, sistemas y táctica en ${LESSONS.length} lecciones cortas.`)),
    !coach && done ? h('span', { class: 'chip ball' }, `${Math.round((done / LESSONS.length) * 100)}%`) : null, ic('chevron-right', 20));
}

// ---------- pantallas ----------
function home(ctx) {
  const p = progress(), lv = level(ctx), coach = ctx.role === 'coach';
  const done = LESSONS.filter((l) => lessonDone(p, l)).length, nx = nextLesson(ctx, p);
  const row = (l) => {
    const ok = lessonDone(p, l), read = !!p.read[l.id];
    return h('a', { class: 'row', href: `#/teoria/${l.id}` },
      h('span', { class: `teo-mark ${ok ? 'ok' : read ? 'read' : ''}`, 'aria-hidden': 'true' }, ok ? ic('check', 16) : null),
      h('span', { class: 'row-main' }, h('strong', {}, l.name), h('span', { class: 'row-sub' }, `${l.min} min · ${l.quiz.length} preguntas${ok ? ' · aprobada' : read ? ' · leída' : ''}`)),
      ic('chevron-right', 18));
  };
  const el = h('div', { class: 'page teoria' },
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${LESSONS.length} lecciones · ${UNITS.length} módulos`),
      h('h2', {}, coach ? 'Teoría de voleibol' : done ? `Llevas ${done} de ${LESSONS.length}` : 'Aprende voleibol'),
      h('p', { style: { margin: 0 } }, coach ? 'Lo que tus jugadores aprenden fuera de la cancha: reglas, técnica, sistemas y táctica. Cada lección dura de 3 a 5 minutos y cierra con un quiz.'
        : 'Entender el juego te hace jugar mejor: sabes qué hacer, por qué y qué viene. Cada lección dura de 3 a 5 minutos y cierra con un quiz.'),
      nx ? h('div', { class: 'cluster' }, h('a', { class: 'btn ball', href: `#/teoria/${nx.id}` }, ic('play', 18), done ? `Seguir: ${nx.name}` : `Empezar: ${nx.name}`)) : h('p', { style: { margin: 0 } }, '¡Aprobaste todas las lecciones!')),
    coach ? note(`Tus jugadores la encuentran en Entrenos. Si sacan ${EXAM.pass} de ${EXAM.n} o más en el examen de un módulo, te piden su reto de teoría y lo apruebas en Hoy o en Ruta, como cualquier reto. El avance de cada quiz se guarda en el celular de cada jugador.`) : null,
    UNITS.map((u) => {
      const ls_ = lessonsOf(u.id), ok = ls_.filter((l) => lessonDone(p, l)).length, best = p.exam[u.id];
      const ch = CHALLENGE_BY_ID[u.reto], claim = claimFor(ctx, u.reto);
      return h('section', { class: 'stack' }, sectionTitle(u.name, unitChip(u, lv)),
        h('p', { class: 'row-sub', style: { margin: 0 } }, `${u.desc} ${ok}/${ls_.length} aprobadas.`),
        h('div', { class: 'rows' }, ls_.map(row),
          h('a', { class: 'row teo-exam', href: `#/teoria/examen/${u.id}` },
            h('span', { class: 'lc-ic sm', 'aria-hidden': 'true' }, ic('award', 18)),
            h('span', { class: 'row-main' }, h('strong', {}, 'Examen del módulo'),
              h('span', { class: 'row-sub' }, `${EXAM.n} preguntas al azar; se aprueba con ${EXAM.pass}.${best != null ? ` Tu mejor: ${best} de ${EXAM.n}.` : ''}${ch ? ` Reto: +${ch.xp} XP.` : ''}`)),
            claim?.status === 'aprobada' ? h('span', { class: 'chip ok' }, 'Reto aprobado') : claim?.status === 'solicitada' ? h('span', { class: 'chip warn' }, 'Reto pedido')
              : best >= EXAM.pass ? h('span', { class: 'chip ok' }, 'Aprobado') : null,
            ic('chevron-right', 18))));
    }),
    h('section', { class: 'stack' }, sectionTitle('Para practicar'),
      h('div', { class: 'rows' },
        h('a', { class: 'row', href: '#/teoria/repaso' }, h('span', { class: 'lc-ic sm', 'aria-hidden': 'true' }, ic('list-checks', 18)),
          h('span', { class: 'row-main' }, h('strong', {}, 'Repaso general'), h('span', { class: 'row-sub' }, `${REPASO} preguntas mezcladas de los ${UNITS.length} módulos para volver a estudiar todo.${p.repaso ? ` Tu mejor: ${p.repaso.best} de ${p.repaso.n}.` : ''}`)), ic('chevron-right', 18)),
        missKeys(p).length ? h('a', { class: 'row', href: '#/teoria/errores' }, h('span', { class: 'lc-ic sm', 'aria-hidden': 'true' }, ic('target', 18)),
          h('span', { class: 'row-main' }, h('strong', {}, 'Mis errores'), h('span', { class: 'row-sub' }, `${plural(missKeys(p).length, 'pregunta que fallaste', 'preguntas que fallaste')}. Contéstalas bien y salen de la lista.`)), ic('chevron-right', 18)) : null,
        h('a', { class: 'row', href: '#/teoria/situaciones' }, h('span', { class: 'lc-ic sm', 'aria-hidden': 'true' }, ic('brain', 18)),
          h('span', { class: 'row-main' }, h('strong', {}, 'Situaciones de partido'), h('span', { class: 'row-sub' }, `Ves una jugada en la cancha y eliges la mejor decisión. ${SCENARIOS.length} situaciones.`)), ic('chevron-right', 18)),
        h('a', { class: 'row', href: '#/teoria/glosario' }, h('span', { class: 'lc-ic sm', 'aria-hidden': 'true' }, ic('book-open', 18)),
          h('span', { class: 'row-main' }, h('strong', {}, 'Glosario'), h('span', { class: 'row-sub' }, `${GLOSSARY.length} palabras que vas a escuchar en la cancha.`)), ic('chevron-right', 18)))),
    !ctx.readonly && (done || Object.keys(p.read).length || p.repaso || Object.keys(p.exam).length) ? h('section', { class: 'stack' }, sectionTitle('Volver a estudiar todo'),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Borra tu avance de lecciones, quizzes, exámenes y repasos en este celular para empezar de cero. Los retos que ya te aprobaron se quedan.'),
      h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: async () => {
        if (!(await confirmSheet({ title: 'Empezar de nuevo', text: 'Se borra tu avance de Teoría en este celular (lecciones leídas, quizzes, exámenes, repasos y errores). Los retos aprobados no se borran.', ok: 'Empezar de nuevo', danger: true }))) return;
        ls.set(pkey(), '{}'); toast('Listo: tu avance de Teoría empieza de cero'); ctx.rerender();
      } }, ic('rotate-cw', 16), 'Empezar de nuevo'))) : null,
    note('Las reglas siguen las Reglas Oficiales de Voleibol FIVB 2025-2028; tu liga puede tener ajustes. Las explicaciones técnicas y tácticas son propuesta de Remate. Las fuentes están en Ayuda.'));
  return { title: 'Teoría', back: coach ? '#/sesiones' : '#/entrenos', el };
}

function lesson(ctx, l) {
  const u = UNIT_BY_ID[l.unit], list = lessonsOf(l.unit), i = list.indexOf(l), coach = ctx.role === 'coach';
  if (!progress().read[l.id]) saveProgress(ctx, (p) => { p.read[l.id] = todayStr(); });
  const ui = ctx.ui; ui.order ??= {}; ui.ans ??= {};
  const all = l.quiz.length, answered = l.quiz.filter((_, k) => ui.ans[k] !== undefined).length;
  const score = l.quiz.filter((q, k) => ui.ans[k] === q.a).length;
  const onAnswer = (k, right) => {
    track(ctx, `${l.id}:${k}`, right);
    if (l.quiz.every((_, k) => ui.ans[k] !== undefined)) {
      const sc = l.quiz.filter((q, k) => ui.ans[k] === q.a).length;
      saveProgress(ctx, (p) => { p.quiz[l.id] = Math.max(p.quiz[l.id] ?? 0, sc); });
    }
    ctx.rerender();
  };
  const best = progress().quiz[l.id];
  const flat = LESSONS.indexOf(l), prev = LESSONS[flat - 1], next = LESSONS[flat + 1];
  const el = h('div', { class: 'page teoria lesson' },
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${u.name} · lección ${i + 1} de ${list.length} · ${l.min} min`),
      h('h2', {}, l.name), h('p', { style: { margin: 0 } }, l.intro)),
    h('article', { class: 'panel stack teo-body' }, l.body.map(blockEl)),
    h('section', { class: 'panel stack teo-keys' }, h('h3', {}, 'Para recordar'), h('ul', { class: 'plain' }, l.keys.map((k) => h('li', {}, k)))),
    h('section', { class: 'stack' }, sectionTitle('Comprueba lo que aprendiste', best != null ? h('span', { class: `chip ${best >= passMark(l) ? 'ok' : ''}` }, `Tu mejor: ${best} de ${all}`) : null),
      l.quiz.map((q, k) => questionEl(q, ui, k, onAnswer, k + 1)),
      answered === all ? h('div', { class: `note ${score >= passMark(l) ? '' : 'warn'}`, role: 'status' },
        h('strong', {}, `${score} de ${all}. `), score === all ? '¡Perfecto!' : score >= passMark(l) ? 'Lección aprobada.' : `Necesitas ${passMark(l)} para aprobarla. Vuelve a leer y repite el quiz.`,
        h('div', { class: 'cluster', style: { marginTop: '8px' } }, h('button', { class: 'btn sm', type: 'button', onclick: () => { ui.order = {}; ui.ans = {}; ctx.rerender(); } }, ic('refresh-cw', 16), 'Repetir quiz'),
          next ? h('a', { class: 'btn sm primary', href: `#/teoria/${next.id}` }, 'Siguiente lección', ic('chevron-right', 16)) : null)) : null),
    l.src ? h('p', { class: 'row-sub teo-src' }, `Fuente: ${l.src}`) : null,
    h('nav', { class: 'cluster teo-nav', 'aria-label': 'Otras lecciones' },
      prev ? h('a', { class: 'btn sm', href: `#/teoria/${prev.id}` }, ic('chevron-left', 16), 'Anterior') : null,
      h('a', { class: 'btn sm ghost', href: '#/teoria' }, 'Todas las lecciones'),
      next ? h('a', { class: 'btn sm', href: `#/teoria/${next.id}` }, 'Siguiente', ic('chevron-right', 16)) : h('a', { class: 'btn sm', href: `#/teoria/examen/${l.unit}` }, ic('award', 16), 'Examen del módulo')));
  const actions = coach ? [{ icon: 'share-2', label: 'Compartir esta lección', onClick: () => shareText(`Lección de Remate: ${l.name}\n${lessonUrl(l.id)}`) }] : [];
  return { title: 'Teoría', sub: l.name, back: '#/teoria', actions, el };
}

function exam(ctx, u) {
  const ui = ctx.ui;
  const pool = lessonsOf(u.id).flatMap((l) => l.quiz.map((_, k) => `${l.id}:${k}`));
  const n = Math.min(EXAM.n, pool.length);
  ui.qs ??= shuffle(pool).slice(0, n); ui.i ??= 0; ui.order ??= {}; ui.ans ??= {};
  const score = ui.qs.filter((key) => ui.ans[key] === getQ(key).a).length;
  const finished = !!ui.done && ui.qs.every((key) => ui.ans[key] !== undefined);
  const restart = () => { ui.qs = null; ui.i = 0; ui.order = {}; ui.ans = {}; ui.saved = false; ui.done = false; ctx.rerender(); };
  if (finished && !ui.saved) { ui.saved = true; saveProgress(ctx, (p) => { p.exam[u.id] = Math.max(p.exam[u.id] ?? 0, score); }); }
  const el = h('div', { class: 'page teoria exam' });
  if (!finished) {
    const key = ui.qs[ui.i], q = getQ(key), lid = key.split(':')[0];
    el.append(h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${u.name} · examen`), h('h2', {}, `Pregunta ${ui.i + 1} de ${n}`),
      h('div', { class: 'teo-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n), 'aria-valuenow': String(ui.i) }, h('span', { style: { width: `${(ui.i / n) * 100}%` } }))),
    questionEl(q, ui, key, (k, right) => { track(ctx, k, right); ctx.rerender(); }),
    ui.ans[key] !== undefined ? h('div', { class: 'cluster' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { if (ui.i + 1 < n) ui.i += 1; else ui.done = true; ctx.rerender(); } }, ui.i + 1 < n ? 'Siguiente pregunta' : 'Ver resultado', ic('chevron-right', 18)),
      h('a', { class: 'btn sm ghost', href: `#/teoria/${lid}` }, 'Repasar esa lección')) : null);
    return { title: 'Examen', sub: u.name, back: '#/teoria', el };
  }
  const passed = score >= EXAM.pass, ch = CHALLENGE_BY_ID[u.reto], claim = claimFor(ctx, u.reto);
  let reto = null;
  if (ctx.role === 'player' && ctx.me && ch) {
    if (claim?.status === 'aprobada') reto = note(`Tu entrenador ya aprobó tu reto «${ch.name}» (+${ch.xp} XP).`);
    else if (claim?.status === 'solicitada') reto = note('Ya le pediste este reto a tu entrenador. Lo verá en su pantalla de Hoy.');
    else if (passed && !ctx.readonly) reto = h('button', { class: 'btn ball', type: 'button', onclick: () => {
      add('claims', { player_id: ctx.me.id, challenge_id: u.reto, note: `Examen de teoría: ${score} de ${n}` });
      toast('Listo: tu entrenador lo revisará'); ctx.rerender(); } }, ic('award', 18), `Pedir el reto a tu entrenador (+${ch.xp} XP)`);
    else if (passed && ctx.readonly) reto = note('Vista previa: aquí el jugador puede pedir su reto de teoría.');
  } else if (ctx.role === 'coach' && ch) reto = note(`Cuando un jugador saca ${EXAM.pass} o más, puede pedirte el reto «${ch.name}» (+${ch.xp} XP). Lo apruebas en Hoy o en Ruta.`);
  const misses = ui.qs.filter((key) => ui.ans[key] !== getQ(key).a).map((key) => key.split(':')[0]);
  const review = [...new Set(misses)].map((id) => LESSON_BY_ID[id]);
  el.append(h('section', { class: `band next stack ${passed ? '' : 'teo-fail'}` }, h('span', { class: 'when' }, `${u.name} · examen`),
    h('h2', {}, `${score} de ${n}`), h('p', { style: { margin: 0 } }, passed ? (score === n ? '¡Perfecto! Dominas este módulo.' : '¡Aprobado! Dominas lo importante de este módulo.') : `Te faltaron ${EXAM.pass - score} para aprobar. Repasa y vuelve a intentarlo: las preguntas cambian cada vez.`)),
  reto,
  review.length ? h('section', { class: 'stack' }, sectionTitle('Para repasar'), h('div', { class: 'rows' }, review.map((l) => h('a', { class: 'row', href: `#/teoria/${l.id}` },
    h('span', { class: 'row-main' }, h('strong', {}, l.name), h('span', { class: 'row-sub' }, plural(misses.filter((x) => x === l.id).length, 'pregunta fallada', 'preguntas falladas'))), ic('chevron-right', 18))))) : null,
  h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: restart }, ic('refresh-cw', 18), 'Otro examen'), h('a', { class: 'btn ghost', href: '#/teoria' }, 'Volver a Teoría')));
  return { title: 'Examen', sub: u.name, back: '#/teoria', el };
}

// Repaso general: preguntas mezcladas de los 4 módulos (o solo las que has fallado) para volver a estudiar todo.
const REPASO = 20;
function repaso(ctx, onlyMiss) {
  const ui = ctx.ui;
  const pick = () => {
    if (onlyMiss) return shuffle(missKeys()).slice(0, REPASO);
    // Parejo: la misma cantidad de cada módulo y luego se revuelven.
    const per = Math.ceil(REPASO / UNITS.length);
    return shuffle(UNITS.flatMap((u) => shuffle(lessonsOf(u.id).flatMap((l) => l.quiz.map((_, k) => `${l.id}:${k}`))).slice(0, per))).slice(0, REPASO);
  };
  ui.qs ??= pick(); ui.i ??= 0; ui.order ??= {}; ui.ans ??= {};
  const title = onlyMiss ? 'Mis errores' : 'Repaso general', back = '#/teoria';
  if (!ui.qs.length) return { title, back, el: h('div', { class: 'page teoria' }, empty('No tienes preguntas falladas', 'Cuando falles una pregunta en un quiz, examen o repaso, aparece aquí para practicarla otra vez.', h('a', { class: 'btn', href: '#/teoria/repaso' }, 'Hacer el repaso general'))) };
  const n = ui.qs.length;
  const score = ui.qs.filter((key) => ui.ans[key] === getQ(key).a).length;
  const finished = !!ui.done && ui.qs.every((key) => ui.ans[key] !== undefined);
  const restart = () => { ui.qs = null; ui.i = 0; ui.order = {}; ui.ans = {}; ui.saved = false; ui.done = false; ctx.rerender(); };
  if (finished && !ui.saved && !onlyMiss) { ui.saved = true; saveProgress(ctx, (p) => { p.repaso = { best: Math.max(p.repaso?.best ?? 0, score), n, last: score, date: todayStr() }; }); }
  const el = h('div', { class: 'page teoria exam' });
  if (!finished) {
    const key = ui.qs[ui.i], q = getQ(key), lid = key.split(':')[0];
    el.append(h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${title} · ${UNIT_BY_ID[LESSON_BY_ID[lid].unit].name}`), h('h2', {}, `Pregunta ${ui.i + 1} de ${n}`),
      h('div', { class: 'teo-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n), 'aria-valuenow': String(ui.i) }, h('span', { style: { width: `${(ui.i / n) * 100}%` } }))),
    questionEl(q, ui, key, (k, right) => { track(ctx, k, right); ctx.rerender(); }),
    ui.ans[key] !== undefined ? h('div', { class: 'cluster' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { if (ui.i + 1 < n) ui.i += 1; else ui.done = true; ctx.rerender(); } }, ui.i + 1 < n ? 'Siguiente pregunta' : 'Ver resultado', ic('chevron-right', 18)),
      h('a', { class: 'btn sm ghost', href: `#/teoria/${lid}` }, 'Leer esa lección')) : null);
    return { title, back, el };
  }
  const misses = ui.qs.filter((key) => ui.ans[key] !== getQ(key).a).map((key) => key.split(':')[0]);
  const review = [...new Set(misses)].map((id) => LESSON_BY_ID[id]);
  const byUnit = UNITS.map((u) => { const qs = ui.qs.filter((key) => LESSON_BY_ID[key.split(':')[0]].unit === u.id); return [u, qs.filter((key) => ui.ans[key] === getQ(key).a).length, qs.length]; }).filter(([, , t]) => t);
  const pct = score / n, left = missKeys().length;
  el.append(h('section', { class: `band next stack ${pct >= 0.8 ? '' : 'teo-fail'}` }, h('span', { class: 'when' }, title),
    h('h2', {}, `${score} de ${n}`), h('p', { style: { margin: 0 } }, pct === 1 ? '¡Perfecto! Tienes muy fresca la teoría.' : pct >= 0.8 ? 'Muy bien: dominas casi todo. Repasa las lecciones de abajo.' : 'Vas bien. Lee otra vez las lecciones de abajo y vuelve a intentarlo: las preguntas cambian.')),
  byUnit.length > 1 ? h('section', { class: 'stack' }, sectionTitle('Por módulo'), h('div', { class: 'rows' }, byUnit.map(([u, ok, t]) => h('div', { class: 'row' },
    h('span', { class: 'row-main' }, h('strong', {}, u.name), h('span', { class: 'row-sub' }, `${ok} de ${t}`)), h('span', { class: `chip ${ok === t ? 'ok' : ok / t >= 0.6 ? '' : 'warn'}` }, `${Math.round((ok / t) * 100)}%`))))) : null,
  review.length ? h('section', { class: 'stack' }, sectionTitle('Para repasar'), h('div', { class: 'rows' }, review.map((l) => h('a', { class: 'row', href: `#/teoria/${l.id}` },
    h('span', { class: 'row-main' }, h('strong', {}, l.name), h('span', { class: 'row-sub' }, plural(misses.filter((x) => x === l.id).length, 'pregunta fallada', 'preguntas falladas'))), ic('chevron-right', 18))))) : null,
  h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', onclick: restart }, ic('refresh-cw', 18), onlyMiss ? 'Otra ronda de errores' : 'Otro repaso'),
    !onlyMiss && left ? h('a', { class: 'btn', href: '#/teoria/errores' }, ic('target', 18), `Practicar mis errores (${left})`) : null,
    h('a', { class: 'btn ghost', href: '#/teoria' }, 'Volver a Teoría')));
  return { title, back, el };
}

function situaciones(ctx) {
  const ui = ctx.ui, ROUND = 5;
  ui.ids ??= shuffle(SCENARIOS.map((s) => s.id)).slice(0, ROUND); ui.i ??= 0; ui.ans ??= {};
  const done = ui.ids.every((id) => ui.ans[id]);
  const score = ui.ids.filter((id) => ui.ans[id] === SCENARIO_BY_ID[id].answer).length;
  const again = () => { ui.ids = null; ui.i = 0; ui.ans = {}; ctx.rerender(); };
  const el = h('div', { class: 'page teoria vision' });
  if (done && ui.i >= ROUND) {
    el.append(h('section', { class: 'band next stack' }, h('span', { class: 'when' }, 'Situaciones de partido'), h('h2', {}, `${score} de ${ROUND}`),
      h('p', { style: { margin: 0 } }, score >= 4 ? 'Muy buena lectura de juego.' : 'Cada situación tiene una explicación: léela y prueba otra ronda.')),
    h('div', { class: 'cluster' }, h('button', { class: 'btn ball', type: 'button', onclick: again }, ic('play', 18), 'Otra ronda'), h('a', { class: 'btn ghost', href: '#/teoria' }, 'Volver a Teoría')),
    note('Son situaciones típicas con una mejor decisión según principios tácticos comunes. En un partido real puede haber más de una opción razonable.'));
    return { title: 'Situaciones', back: '#/teoria', el };
  }
  const sc = SCENARIO_BY_ID[ui.ids[ui.i]], chosen = ui.ans[sc.id];
  const diagram = chosen ? { ...sc.diagram, items: [...sc.diagram.items, ...(sc.after || [])] } : sc.diagram;
  el.append(h('section', { class: 'stack' }, h('div', { class: 'cluster' }, h('span', { class: 'chip info' }, CATS[sc.cat]), h('span', { class: 'row-sub' }, `Situación ${ui.i + 1} de ${ROUND}`)),
    h('h2', { style: { margin: 0 } }, sc.title), h('p', { style: { margin: 0 } }, sc.text)),
  h('figure', { class: 'court-wrap teo-dg' }, h('div', { html: courtSVG(diagram, sc.title) }), h('figcaption', {}, 'Amarillo: tu equipo. Coral: rival. Tu lado es el de abajo.')),
  h('div', { class: 'quiz-q' }, h('p', { class: 'qq' }, '¿Qué conviene?'), h('div', { class: 'quiz-opts' }, sc.options.map((o) => h('button', {
    type: 'button', class: `quiz-opt ${chosen && o.id === sc.answer ? 'right' : ''} ${chosen === o.id && o.id !== sc.answer ? 'wrong' : ''}`, disabled: chosen ? true : null,
    onclick: () => { ui.ans[sc.id] = o.id; ctx.rerender(); } }, chosen && o.id === sc.answer ? ic('check', 18) : chosen === o.id ? ic('x', 18) : null, h('span', {}, o.t)))),
  chosen ? h('p', { class: 'quiz-why', role: 'status' }, h('strong', {}, chosen === sc.answer ? 'Buena decisión. ' : 'Había una mejor. '), sc.why) : null),
  chosen ? h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { ui.i += 1; ctx.rerender(); } }, ui.i + 1 < ROUND ? 'Siguiente situación' : 'Ver resultado', ic('chevron-right', 18))) : null);
  return { title: 'Situaciones', back: '#/teoria', el };
}

function glosario() {
  const rows = GLOSSARY.map(([t, d]) => h('div', { class: 'row', 'data-q': `${t} ${d}`.toLowerCase() }, h('span', { class: 'row-main' }, h('strong', {}, t), h('span', { class: 'row-sub' }, d))));
  const none = h('p', { class: 'row-sub', hidden: true }, 'No hay palabras con esa búsqueda.');
  const search = h('input', { type: 'search', placeholder: 'Buscar una palabra', 'aria-label': 'Buscar en el glosario', oninput: (e) => {
    const q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let shown = 0;
    rows.forEach((r) => { const ok = !q || r.dataset.q.normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q); r.hidden = !ok; if (ok) shown += 1; });
    none.hidden = shown > 0;
  } });
  return { title: 'Glosario', back: '#/teoria', el: h('div', { class: 'page teoria' }, h('div', { class: 'field' }, search), h('div', { class: 'rows' }, rows), none) };
}

export default function teoria(ctx) {
  const [a, b] = ctx.args;
  if (!a) return home(ctx);
  if (a === 'glosario') return glosario(ctx);
  if (a === 'situaciones') return situaciones(ctx);
  if (a === 'repaso') return repaso(ctx, false);
  if (a === 'errores') return repaso(ctx, true);
  if (a === 'examen' && UNIT_BY_ID[b]) return exam(ctx, UNIT_BY_ID[b]);
  if (LESSON_BY_ID[a]) return lesson(ctx, LESSON_BY_ID[a]);
  return { title: 'Teoría', back: '#/teoria', el: h('div', { class: 'page' }, empty('No encontré esa lección', 'Puede que haya cambiado de nombre. Vuelve a la lista de Teoría.')) };
}
