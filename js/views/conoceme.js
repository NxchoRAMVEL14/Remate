// Conóceme (v3.26): los tests que contesta el jugador, sus resultados, y su retroalimentación al entrenador
// (después de cada entreno y la encuesta del mes). Va con nombre: el entrenador ve quién contestó qué.
import { h, ic, toast, fmtDate, todayStr, addDays, plural, confirmSheet } from '../util.js';
import { state, add, sql326Ready } from '../store.js';
import { currentRatings } from '../calc.js';
import { SKILL_BY_ID } from '../content/skills.js';
import { note, empty, sectionTitle } from './ui.js';
import {
  SCALE5, RETEST_DAYS, TESTS, TEST_BY, MENTE_Q, MENTE_DIMS, MOTIVO_Q, ROL_Q, ROLES, CORR_Q, GUSTO_Q, MANO, POS_IDS, POS_INFO, AUTO_SKILLS, AUTO_LEVELS,
  scoreMente, scoreMotivo, scoreRol, corrSummary, autoGap, scorePosition, MISSING_NAME, FACES, RETRO_TAGS, MES_Q, MES_OPEN, NPS_Q, PERFIL_SOURCES,
} from '../content/perfiles.js';

// ---------- datos ----------
const byNew = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
export const surveysOf = (pid, kind) => (state.data.surveys || []).filter((r) => r.player_id === pid && (!kind || r.kind === kind)).sort(byNew);
export const lastOf = (pid, kind) => surveysOf(pid, kind)[0] || null;
export const daysAgo = (row) => (row ? Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000) : null);
export const isStale = (row) => row && daysAgo(row) >= RETEST_DAYS;
export function latestTests(pid) {
  const out = {};
  for (const t of [...state.data.playerTests].filter((x) => x.player_id === pid).sort((a, b) => String(a.test_date).localeCompare(String(b.test_date)))) out[t.kind] = Number(t.value);
  return out;
}
// Todo el perfil de un jugador ya calculado (lo usan el jugador y el entrenador).
export function profileOf(p) {
  const g = (k) => lastOf(p.id, k);
  const mente = g('mente') ? scoreMente(g('mente').answers) : null;
  const rol = g('rol') ? scoreRol(g('rol').answers) : null;
  const ratings = currentRatings(p.id, state.data.ratings || []);
  const tests = latestTests(p.id);
  if (!tests.estatura && Number(p.height_cm) > 0) tests.estatura = Number(p.height_cm);   // la estatura de su ficha
  const pos = scorePosition({ tests, ratings, gustos: g('posicion')?.answers || null, mente, rol, branch: p.branch, hand: p.hand === 'izq' ? 'izquierda' : p.hand === 'der' ? 'derecha' : null });
  return {
    rows: Object.fromEntries(TESTS.map((t) => [t.kind, g(t.kind)])), mente, rol, pos, ratings,
    motivo: g('motivo') ? scoreMotivo(g('motivo').answers) : null,
    corr: g('correccion') ? corrSummary(g('correccion').answers) : null,
    auto: g('autoeval') ? autoGap(g('autoeval').answers, ratings) : null,
  };
}

// ---------- piezas ----------
const bar = (v, cls = '') => h('span', { class: `pf-bar ${cls}`, 'aria-hidden': 'true' }, h('i', { style: { width: `${Math.max(3, Math.min(100, v))}%` } }));
const level = (v) => (v >= 75 ? 'ok' : v >= 50 ? 'mid' : 'low');
const levelPos = (v) => (v >= 65 ? 'ok' : v >= 40 ? 'mid' : 'low');
function likert(i, ans, onPick) {
  const btns = SCALE5.map((t, k) => h('button', { type: 'button', class: 'lk-b', 'aria-pressed': Number(ans[i]) === k + 1 ? 'true' : 'false', 'aria-label': t, onclick: () => {
    ans[i] = k + 1; btns.forEach((b, j) => b.setAttribute('aria-pressed', j === k ? 'true' : 'false')); onPick?.();
  } }, h('b', {}, String(k + 1)), h('span', {}, t)));
  return h('div', { class: 'lk', role: 'group' }, btns);
}
function choice(id, opts, ans, onPick, cls = 'pf-opts') {
  const btns = opts.map(([k, t]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': ans[id] === k ? 'true' : 'false', onclick: () => {
    ans[id] = k; btns.forEach((b, j) => b.setAttribute('aria-pressed', opts[j][0] === k ? 'true' : 'false')); onPick?.();
  } }, t));
  return h('div', { class: cls, role: 'group' }, btns);
}
const qCard = (n, text, ctrl) => h('div', { class: 'pf-q' }, h('div', { class: 'pf-qt' }, h('span', { class: 'pf-n' }, String(n)), h('span', {}, text)), ctrl);

// ---------- resultados (jugador y entrenador) ----------
export function positionCard(pf, p, { coach = false } = {}) {
  const pos = pf.pos;
  if (!pos.ranking.length) return note(coach ? 'Todavía no hay datos para calcular su posición: que conteste «Mi posición ideal» y registra sus pruebas físicas y su evaluación.' : 'Contesta «Mi posición ideal» para ver tus mejores posiciones.');
  const [a, b] = pos.top;
  return h('section', { class: 'panel stack pf-pos' },
    h('div', { class: 'split' }, h('h3', {}, coach ? 'Su posición ideal' : 'Tu posición ideal'), h('span', { class: `chip ${pos.confidence === 'alta' ? 'ok' : pos.confidence === 'media' ? 'warn' : ''}` }, `Confianza ${pos.confidence}`)),
    h('div', { class: 'pf-top' }, [a, b].filter(Boolean).map((x, i) => h('div', { class: `pf-pick${i ? '' : ' first'}` },
      h('small', {}, i ? 'También' : 'La mejor hoy'), h('strong', {}, x.name), h('span', { class: 'pf-score' }, `${x.score}%`),
      x.reasons.length ? h('span', { class: 'row-sub' }, `Destaca: ${x.reasons.join(', ')}.`) : null))),
    h('div', { class: 'pf-rank' }, pos.ranking.map((x) => h('div', { class: 'pf-row' }, h('span', {}, x.name), bar(x.score, levelPos(x.score)), h('b', {}, `${x.score}%`)))),
    pos.fav ? h('p', { class: 'row-sub', style: { margin: 0 } }, `${coach ? 'Le gusta más' : 'Te gusta más'}: ${POS_INFO[pos.fav].name}.${pos.fav === a.p ? ' ¡Coincide!' : ''}${coach && p.position && p.position !== 'sin_definir' ? ` Hoy juega de ${POS_INFO[p.position]?.name || p.position}.` : ''}`) : null,
    pos.missing.length ? note(`${coach ? 'Para afinarlo' : 'Para que sea más exacto'}, falta: ${pos.missing.map((k) => MISSING_NAME[k]).join(', ')}.`, 'info') : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Es una propuesta de Remate con tus medidas, pruebas, fundamentos y gustos de hoy. Cambia mientras creces y mejoras; la última palabra es del entrenador.'));
}
export function resultOf(kind, pf, p, { coach = false } = {}) {
  const row = pf.rows[kind];
  if (kind === 'posicion') return positionCard(pf, p, { coach });
  if (!row) return null;
  const when = h('p', { class: 'row-sub', style: { margin: 0 } }, `Contestado ${fmtDate(String(row.created_at).slice(0, 10), { day: 'numeric', month: 'long' })}${isStale(row) ? ' · ya toca repetirlo' : ''}.`);
  if (kind === 'mente' && pf.mente) {
    return h('section', { class: 'panel stack' }, h('h3', {}, coach ? 'Su mente en la cancha' : 'Tu mente en la cancha'),
      h('div', { class: 'pf-rank' }, pf.mente.dims.map((d) => h('div', { class: 'pf-row' }, h('span', {}, d.name), bar(d.v, level(d.v)), h('b', {}, `${d.v}`)))),
      h('p', { style: { margin: 0 } }, h('strong', {}, 'Fuerte: '), pf.mente.strong.map((d) => d.name.toLowerCase()).join(' y '), '.'),
      pf.mente.work.length ? h('div', { class: 'stack' }, h('strong', {}, coach ? 'Cómo ayudarle' : 'Para mejorar'),
        h('ul', { class: 'plain' }, pf.mente.work.map((d) => h('li', {}, h('b', {}, `${d.name}: `), coach ? MENTE_DIMS[d.k].coach : MENTE_DIMS[d.k].tip)))) : h('p', { style: { margin: 0 } }, 'Vas bien en todo. Sigue así.'),
      when);
  }
  if (kind === 'motivo' && pf.motivo) {
    const m = pf.motivo;
    return h('section', { class: 'panel stack' }, h('h3', {}, coach ? '¿Por qué juega?' : '¿Por qué juegas?'),
      h('div', { class: 'pf-rank' }, h('div', { class: 'pf-row' }, h('span', {}, 'Mejorar'), bar(m.tarea, 'ok'), h('b', {}, `${m.tarea}`)), h('div', { class: 'pf-row' }, h('span', {}, 'Ganar y destacar'), bar(m.ego, 'mid'), h('b', {}, `${m.ego}`))),
      h('p', { style: { margin: 0 } }, h('strong', {}, `${m.name}. `), coach ? m.coach : m.text), when);
  }
  if (kind === 'rol' && pf.rol) {
    const r = pf.rol;
    return h('section', { class: 'panel stack' }, h('h3', {}, coach ? 'Su rol en el equipo' : 'Tu rol en el equipo'),
      h('p', { style: { margin: 0 } }, h('strong', {}, r.top.name + (r.second ? ` y ${r.second.name.toLowerCase()}` : '')), `. ${coach ? r.top.coach : r.top.text}`),
      h('div', { class: 'pf-rank' }, r.list.map((x) => h('div', { class: 'pf-row' }, h('span', {}, x.name), bar(x.v, level(x.v)), h('b', {}, `${x.v}`)))), when);
  }
  if (kind === 'correccion' && pf.corr) {
    return h('section', { class: 'panel stack' }, h('h3', {}, coach ? 'Cómo le gusta que lo corrijan' : 'Cómo te gusta que te corrijan'),
      h('div', { class: 'rows' }, pf.corr.map((x) => h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('span', { class: 'row-sub' }, x.q), h('strong', {}, x.a))))), when);
  }
  if (kind === 'autoeval' && pf.auto) {
    const big = pf.auto.filter((x) => x.d != null && Math.abs(x.d) >= 2);
    return h('section', { class: 'panel stack' }, h('h3', {}, coach ? 'Cómo se ve vs. cómo lo ves' : 'Cómo te ves vs. tu entrenador'),
      h('div', { class: 'pf-gap' }, h('div', { class: 'pf-gh' }, h('span', {}), h('b', {}, coach ? 'Él' : 'Tú'), h('b', {}, 'Coach')),
        pf.auto.map((x) => h('div', { class: `pf-gr${x.d == null ? '' : x.d >= 1 ? ' up' : x.d <= -1 ? ' down' : ''}` }, h('span', {}, SKILL_BY_ID[x.s]?.name || x.s), h('b', {}, x.me ? `F${x.me}` : '—'), h('b', {}, x.c ? `F${x.c}` : '—')))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, `Amarillo: ${coach ? 'se califica' : 'te calificas'} más alto que ${coach ? 'tú' : 'tu entrenador'}; azul: más bajo.`),
      h('p', { class: 'row-sub', style: { margin: 0 } }, big.length ? `Diferencia grande en ${big.map((x) => SKILL_BY_ID[x.s]?.name.toLowerCase()).join(', ')}: ${coach ? 'buena plática para tener con él.' : 'platícalo con tu entrenador.'}` : 'En general se ven parecido. ¡Buena señal!'),
      when);
  }
  return null;
}

// ---------- pantallas del jugador ----------
export default function conoceme(ctx) {
  const me = ctx.me;
  if (!me) return { title: 'Conóceme', el: h('div', { class: 'page' }, empty('Sin jugador', 'Entra con tu código para contestar.')) };
  if (!sql326Ready()) return { title: 'Conóceme', back: '#/inicio', el: h('div', { class: 'page' }, note('Tu entrenador aún no activa esta parte de Remate. Pronto la verás aquí.', 'info')) };
  const [a0, a1] = ctx.args;
  if (a0 === 'mes') return monthPage(ctx, me);
  if (TEST_BY[a0]) return a1 === 'contestar' || !lastOf(me.id, a0) ? testPage(ctx, me, a0) : resultPage(ctx, me, a0);
  const pf = profileOf(me);
  const done = TESTS.filter((t) => pf.rows[t.kind]).length;
  const month = todayStr().slice(0, 7), mes = surveysOf(me.id, 'retro_mes').find((r) => r.period === month);
  return { title: 'Conóceme', back: '#/inicio', el: h('div', { class: 'page' },
    h('section', { class: 'band next' }, h('div', { class: 'when' }, 'Conóceme'), h('h2', {}, `${done} de ${TESTS.length} tests`),
      h('div', {}, 'No son exámenes: no hay respuestas buenas ni malas. Contesta con honestidad. Tus resultados los ven solo tú y tu entrenador.')),
    pf.pos.ranking.length ? positionCard(pf, me) : null,
    h('div', { class: 'rows' }, TESTS.map((t) => { const row = pf.rows[t.kind];
      return h('a', { class: 'row', href: `#/conoceme/${t.kind}` }, h('span', { class: 'pf-ic', 'aria-hidden': 'true' }, ic(t.icon, 22)),
        h('span', { class: 'row-main' }, h('strong', {}, t.name), h('span', { class: 'row-sub' }, row ? `Contestado hace ${plural(daysAgo(row), 'día', 'días')}` : `${t.desc} (${t.min} min)`)),
        h('span', { class: 'row-end' }, row ? (isStale(row) ? h('span', { class: 'chip warn' }, 'Repetir') : h('span', { class: 'chip ok' }, 'Listo')) : h('span', { class: 'chip ball' }, 'Nuevo'), ic('chevron-right', 18))); })),
    sectionTitle('Tu opinión de los entrenos'),
    h('a', { class: 'row panel', href: '#/conoceme/mes' }, h('span', { class: 'pf-ic', 'aria-hidden': 'true' }, ic('message-circle', 22)),
      h('span', { class: 'row-main' }, h('strong', {}, 'Encuesta del mes'), h('span', { class: 'row-sub' }, mes ? 'Ya la contestaste este mes. ¡Gracias!' : 'Unas 15 preguntas sobre los entrenos y tu entrenador (5 min).')),
      h('span', { class: 'row-end' }, mes ? h('span', { class: 'chip ok' }, 'Lista') : h('span', { class: 'chip ball' }, 'Contestar'), ic('chevron-right', 18))),
    h('p', { class: 'row-sub' }, 'Tu opinión va con tu nombre: tu entrenador la lee para mejorar los entrenos. Di lo que piensas con respeto.')) };
}

function resultPage(ctx, me, kind) {
  const pf = profileOf(me), t = TEST_BY[kind];
  return { title: t.name, back: '#/conoceme', el: h('div', { class: 'page' },
    resultOf(kind, pf, me) || note('Sin resultado todavía.'),
    kind === 'posicion' && pf.rows.posicion ? null : null,
    h('div', { class: 'cluster' }, ctx.readonly ? null : h('a', { class: 'btn', href: `#/conoceme/${kind}/contestar` }, ic('rotate-ccw', 18), isStale(pf.rows[kind]) ? 'Repetir (ya toca)' : 'Contestar otra vez'),
      h('a', { class: 'btn ghost', href: '#/conoceme' }, 'Ver todos')),
    h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'De dónde sale')),
      h('ul', { class: 'plain' }, PERFIL_SOURCES.map(([tt, u]) => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, tt)))),
      h('p', { class: 'row-sub' }, 'Las preguntas son de Remate, inspiradas en esos cuestionarios. No son un diagnóstico: sirven para conocerte y platicar con tu entrenador.'))) };
}

function testPage(ctx, me, kind) {
  const t = TEST_BY[kind], ui = ctx.ui, prev = lastOf(me.id, kind);
  ui.ans ||= {};
  const ans = ui.ans;
  const prog = h('span', { class: 'chip' }), list = h('div', { class: 'stack' });
  let total = 0;
  const count = () => {
    let n = 0;
    if (kind === 'correccion') n = CORR_Q.filter((q) => ans[q.id]).length;
    else if (kind === 'autoeval') n = AUTO_SKILLS.filter((s) => ans[s]).length;
    else n = Array.from({ length: kind === 'posicion' ? GUSTO_Q.length : (kind === 'mente' ? MENTE_Q : kind === 'motivo' ? MOTIVO_Q : ROL_Q).length }, (_, i) => ans[i]).filter(Boolean).length + (kind === 'posicion' ? (ans.mano ? 1 : 0) + (ans.fav ? 1 : 0) : 0);
    prog.textContent = `${n} de ${total}`; return n;
  };
  const upd = () => count();
  if (kind === 'mente' || kind === 'motivo' || kind === 'rol') {
    const Q = kind === 'mente' ? MENTE_Q : kind === 'motivo' ? MOTIVO_Q : ROL_Q; total = Q.length;
    Q.forEach(([, text], i) => list.append(qCard(i + 1, text, likert(i, ans, upd))));
  } else if (kind === 'posicion') {
    total = GUSTO_Q.length + 2;
    GUSTO_Q.forEach(([, text], i) => list.append(qCard(i + 1, text, likert(i, ans, upd))));
    list.append(qCard(GUSTO_Q.length + 1, '¿Con qué mano rematas?', choice('mano', MANO, ans, upd)),
      qCard(GUSTO_Q.length + 2, '¿Qué posición te gusta más?', choice('fav', [...POS_IDS.map((p) => [p, POS_INFO[p].name]), ['nose', 'No sé todavía']], ans, upd)));
  } else if (kind === 'correccion') {
    total = CORR_Q.length;
    CORR_Q.forEach((q, i) => list.append(qCard(i + 1, q.q, choice(q.id, q.opts, ans, upd, 'pf-opts col'))));
  } else if (kind === 'autoeval') {
    total = AUTO_SKILLS.length;
    AUTO_SKILLS.forEach((s, i) => list.append(qCard(i + 1, `${SKILL_BY_ID[s]?.name}: ${SKILL_BY_ID[s]?.desc || ''}`, choice(s, [1, 2, 3, 4].map((k) => [k, AUTO_LEVELS[k]]), ans, upd, 'pf-opts col'))));
  }
  count();
  const save = async () => {
    if (ctx.readonly) { toast('En la vista previa no se guarda'); return; }
    const n = count();
    if (!n) { toast('Contesta por lo menos una pregunta'); return; }
    if (n < total) { if (!(await confirmSheet({ title: `Te faltan ${total - n}`, text: 'Puedes guardar así, pero el resultado será menos exacto. ¿Guardar de todos modos?', ok: 'Guardar' }))) return; }
    const clean = Object.fromEntries(Object.entries(ans).filter(([, v]) => v != null && v !== ''));
    add('surveys', { player_id: me.id, kind, answers: clean });
    ui.ans = null;
    toast('¡Listo! Mira tu resultado');
    location.hash = `#/conoceme/${kind}`;
  };
  return { title: t.name, back: prev ? `#/conoceme/${kind}` : '#/conoceme', el: h('div', { class: 'page' },
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, t.name), prog), h('p', { style: { margin: 0 } }, t.desc),
      kind === 'autoeval' ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Es la misma escala de fases que usa tu entrenador. Sé honesto: no cuenta para tu nivel.')
        : kind === 'correccion' ? null : h('p', { class: 'row-sub', style: { margin: 0 } }, '1 = nada, 5 = totalmente. Piensa en cómo eres normalmente, no en un día bueno o malo.')),
    list,
    h('div', { class: 'cluster pf-save' }, h('button', { type: 'button', class: 'btn primary', onclick: save }, ic('check', 18), 'Guardar y ver mi resultado'))) };
}

// ---------- retroalimentación al entrenador ----------
function wasThere(s, me) { const a = state.data.attendance.find((x) => x.session_id === s.id && x.player_id === me.id); return !a || a.status === 'presente' || a.status === 'retardo'; }
function ended(s) {
  if (s.status === 'hecha') return true;
  if (s.session_date !== todayStr() || !s.start_time || s.status === 'cancelada') return s.session_date < todayStr() && s.status !== 'cancelada';
  const st = new Date(`${s.session_date}T${String(s.start_time).slice(0, 5)}:00`).getTime();
  return Date.now() > st + (Number(s.minutes) || 90) * 60000;
}
export function pendingRetro(me) {
  if (!me || !sql326Ready()) return null;
  const from = addDays(todayStr(), -3), mine = new Set(surveysOf(me.id, 'retro_entreno').map((r) => r.session_id));
  return state.data.sessions.filter((s) => s.session_date >= from && s.session_date <= todayStr() && s.status !== 'cancelada' && ended(s) && wasThere(s, me) && !mine.has(s.id))
    .sort((a, b) => b.session_date.localeCompare(a.session_date))[0] || null;
}
// Tarjeta en Inicio: «¿Qué tal el entreno?» (1 toque, más etiquetas y comentario opcionales).
export function retroCard(me, ctx) {
  const s = pendingRetro(me);
  if (!s) return null;
  const st = { face: 0, tags: new Set() };
  const more = h('div', { class: 'stack', hidden: true });
  const txt = h('textarea', { rows: 2, maxlength: 600, placeholder: 'Opcional: ¿qué te gustó o qué cambiarías?', 'aria-label': 'Comentario para tu entrenador' });
  const faces = FACES.map(([e, t], i) => h('button', { type: 'button', class: 'face-b', 'aria-pressed': 'false', 'aria-label': t, onclick: () => {
    st.face = i + 1; faces.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false')); more.hidden = false;
  } }, h('span', { class: 'face-e' }, e), h('small', {}, t)));
  const tags = RETRO_TAGS.map(([k, t]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': 'false', onclick: (e) => {
    if (st.tags.has(k)) st.tags.delete(k); else st.tags.add(k); e.currentTarget.setAttribute('aria-pressed', st.tags.has(k) ? 'true' : 'false');
  } }, t));
  const send = () => {
    if (ctx.readonly) { toast('En la vista previa no se guarda'); return; }
    if (!st.face) { toast('Elige una carita'); return; }
    add('surveys', { player_id: me.id, kind: 'retro_entreno', session_id: s.id, answers: { face: st.face, tags: [...st.tags] }, comment: txt.value.trim().slice(0, 600) });
    toast('¡Gracias! Tu entrenador lo va a leer');
  };
  more.append(h('div', { class: 'cluster' }, tags), txt, h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn primary', onclick: send }, ic('send', 18), 'Enviar')));
  return h('section', { class: 'panel stack retro-card' },
    h('div', {}, h('div', { class: 'row-sub' }, `Entreno del ${fmtDate(s.session_date, { weekday: 'long', day: 'numeric', month: 'long' })}`), h('h2', { style: { margin: 0 } }, '¿Qué tal estuvo el entreno?')),
    h('div', { class: 'face-row', role: 'group', 'aria-label': 'Cómo estuvo el entreno' }, faces), more,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Va con tu nombre para tu entrenador.'));
}
// Recordatorio de la encuesta del mes (desde el día 20, si no la ha contestado).
export function monthCard(me) {
  if (!me || !sql326Ready() || new Date().getDate() < 20) return null;
  const month = todayStr().slice(0, 7);
  if (surveysOf(me.id, 'retro_mes').some((r) => r.period === month)) return null;
  return h('a', { class: 'panel', href: '#/conoceme/mes', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    ic('message-circle', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Encuesta del mes'), h('span', { class: 'row-sub' }, '5 minutos para decirle a tu entrenador qué te gusta y qué cambiarías.')),
    h('span', { class: 'chip ball' }, 'Contestar'), ic('chevron-right', 18));
}
// Acceso a Conóceme en Inicio (si le falta algún test o le toca repetir).
export function conocemeCard(me) {
  if (!me || !sql326Ready()) return null;
  const rows = TESTS.map((t) => lastOf(me.id, t.kind)), left = rows.filter((r) => !r).length, stale = rows.filter((r) => isStale(r)).length;
  return h('a', { class: 'panel', href: '#/conoceme', style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' } },
    ic('target', 26), h('span', { class: 'row-main' }, h('strong', {}, 'Conóceme: tu posición ideal y más'),
      h('span', { class: 'row-sub' }, left ? `Te ${left === 1 ? 'falta 1 test' : `faltan ${left} tests`} cortos. No son exámenes.` : stale ? `Ya toca repetir ${plural(stale, 'test', 'tests')} (cada 3 meses).` : 'Mira tus resultados.')),
    left || stale ? h('span', { class: 'chip ball' }, left ? 'Nuevo' : 'Repetir') : null, ic('chevron-right', 18));
}

function monthPage(ctx, me) {
  const month = todayStr().slice(0, 7), done = surveysOf(me.id, 'retro_mes').find((r) => r.period === month);
  if (done) return { title: 'Encuesta del mes', back: '#/conoceme', el: h('div', { class: 'page' }, note('Ya contestaste la encuesta de este mes. ¡Gracias! El próximo mes se abre otra.', 'ok')) };
  const ui = ctx.ui; ui.ans ||= {};
  const ans = ui.ans, prog = h('span', { class: 'chip' }), total = MES_Q.length;
  const count = () => { const n = MES_Q.filter((_, i) => ans[i]).length; prog.textContent = `${n} de ${total}`; return n; };
  const opens = MES_OPEN.map(([k, q]) => { const t = h('textarea', { rows: 2, maxlength: 400, 'aria-label': q }); t.value = ans[k] || ''; t.addEventListener('input', () => { ans[k] = t.value; }); return h('label', { class: 'field' }, h('span', { class: 'label' }, q), t); });
  const npsBtns = Array.from({ length: 11 }, (_, v) => h('button', { type: 'button', class: 'nps-b', 'aria-pressed': ans.nps === v ? 'true' : 'false', onclick: () => { ans.nps = v; npsBtns.forEach((b, j) => b.setAttribute('aria-pressed', j === v ? 'true' : 'false')); } }, String(v)));
  const save = async () => {
    if (ctx.readonly) { toast('En la vista previa no se guarda'); return; }
    const n = count();
    if (n < total && !(await confirmSheet({ title: `Te faltan ${total - n} preguntas`, text: '¿Enviar así?', ok: 'Enviar' }))) return;
    const answers = Object.fromEntries(Object.entries(ans).filter(([k, v]) => v != null && v !== '' && !MES_OPEN.some(([o]) => o === k)));
    const comment = MES_OPEN.map(([k, q]) => (String(ans[k] || '').trim() ? `${q} ${String(ans[k]).trim()}` : '')).filter(Boolean).join('\n').slice(0, 600);
    for (const [k] of MES_OPEN) if (String(ans[k] || '').trim()) answers[k] = String(ans[k]).trim().slice(0, 400);
    add('surveys', { player_id: me.id, kind: 'retro_mes', period: month, answers, comment });
    ui.ans = null; toast('¡Gracias! Tu entrenador lo va a leer'); location.hash = '#/conoceme';
  };
  count();
  return { title: 'Encuesta del mes', back: '#/conoceme', el: h('div', { class: 'page' },
    h('section', { class: 'panel stack' }, h('div', { class: 'split' }, h('h3', {}, `Encuesta de ${fmtDate(`${month}-01`, { month: 'long' })}`), prog),
      h('p', { style: { margin: 0 } }, 'Ayuda a tu entrenador a mejorar los entrenos. 1 = nada de acuerdo, 5 = totalmente. Va con tu nombre: di lo que piensas con respeto.')),
    h('div', { class: 'stack' }, MES_Q.map(([, text], i) => qCard(i + 1, text, likert(i, ans, count)))),
    h('section', { class: 'panel stack' }, h('strong', {}, NPS_Q), h('div', { class: 'nps-row', role: 'group', 'aria-label': NPS_Q }, npsBtns)),
    h('section', { class: 'panel stack' }, opens),
    h('div', { class: 'cluster pf-save' }, h('button', { type: 'button', class: 'btn primary', onclick: save }, ic('send', 18), 'Enviar'))) };
}
export const _perfTest = { profileOf };
