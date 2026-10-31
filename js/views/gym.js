// Físico en el gym: rutina de pesas según lo que quieres lograr, registro de cargas y cómo llegar bien al entreno.
// El jugador arma su rutina (se guarda en su celular) o usa la que le asigna el entrenador (columna gym_plan de su ficha).
// Las sesiones que registra se guardan en la nube (gym_logs): las ven él y su entrenador.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, addDays, plural, DAYS, DAYS_LONG } from '../util.js';
import { state, add, remove, patch, players, settings, gymReady, ls, multiTeam, teamOf, inTeam } from '../store.js';
import { weekStart, num } from '../lab-calc.js';
import { GYM, GYM_BY_ID, GROUPS, NEED, EQUIP, EXP, TIER, PHASE, MINUTES, GOALS, buildRoutine, normSpec, isSpec, maxDays, weekPlan,
  nextStep, blockWeek, topReps, lowReps, available, groupOf, gymName, WARMUP, COOLDOWN, READ, RULES, ARRIVE, GYM_SOURCES } from '../content/gym.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { lineChart } from './chart.js';

// ---------- datos ----------
const KEY = { mine: (id) => `remate.gym.mine.${id}`, use: (id) => `remate.gym.use.${id}`, draft: (id) => `remate.gym.draft.${id}` };
const readJSON = (k) => { try { return JSON.parse(ls.get(k) || 'null'); } catch { return null; } };
export const gymVisible = () => settings().gym_players !== false;
export const gymLogsOf = (pid) => (state.data.gymLogs || []).filter((l) => l.player_id === pid)
  .sort((a, b) => `${b.done_on}${b.created_at}`.localeCompare(`${a.done_on}${a.created_at}`));
export const coachPlanOf = (p) => (isSpec(p?.gym_plan) ? normSpec(p.gym_plan) : null);

// Rutina que usa el jugador: la de su entrenador o la suya (si eligió la suya).
export function activeSpec(me) {
  const coachSpec = coachPlanOf(me), mine = readJSON(KEY.mine(me.id));
  const fromLog = !isSpec(mine) && !coachSpec ? gymLogsOf(me.id).find((l) => isSpec(l.plan))?.plan : null;
  const own = isSpec(mine) ? normSpec(mine) : isSpec(fromLog) ? normSpec(fromLog) : null;
  if (coachSpec && (ls.get(KEY.use(me.id)) !== 'mine' || !own)) return { spec: coachSpec, src: 'coach', coachSpec, own };
  if (own) return { spec: own, src: 'mine', coachSpec, own };
  return { spec: null, src: null, coachSpec, own };
}

export function gymStats(pid) {
  const logs = gymLogsOf(pid), ws = weekStart(todayStr()), four = addDays(todayStr(), -27), two = addDays(todayStr(), -13);
  return { logs, week: logs.filter((l) => l.done_on >= ws).length, four: logs.filter((l) => l.done_on >= four).length,
    last: logs[0]?.done_on || null, pain: logs.some((l) => l.pain && l.done_on >= two) };
}
// Última vez que hizo ese ejercicio: { ex, s: [[kg, reps], ...] }.
function lastFor(pid, exId, skipId) {
  for (const l of gymLogsOf(pid)) { if (l.id === skipId) continue; const e = (l.sets || []).find((x) => x.ex === exId); if (e) return e; }
  return null;
}

// ---------- textos ----------
const restText = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
export function rxText(rx) {
  const ex = GYM_BY_ID[rx.ex];
  const parts = [`${rx.sets} × ${rx.reps}${ex?.side ? ' por lado' : ''}`];
  if (rx.rir != null) parts.push(`te sobran ${rx.rir}`);
  else if (rx.role === 'pow' || ex?.unit === 'saltos') parts.push('a máxima velocidad');
  parts.push(`descanso ${restText(rx.rest)}`);
  return parts.join(' · ');
}
export const specText = (s) => [GOALS[s.goal].name, plural(Math.min(s.days, maxDays(s)), 'día', 'días'), `${s.minutes} min`, EXP[s.exp].name, EQUIP[s.equip].name, PHASE[s.phase].name].join(' · ');
const RPE = { 1: 'Muy fácil', 2: 'Muy fácil', 3: 'Fácil', 4: 'Fácil', 5: 'Moderada', 6: 'Moderada', 7: 'Pesada', 8: 'Pesada', 9: 'Muy pesada', 10: 'Al máximo' };
const longDay = (d) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);

// ---------- piezas ----------
function exItem(ex, { rx = null, last, n } = {}) {
  return h('details', { class: 'hx' },
    h('summary', {}, n ? h('span', { class: 'gx-n', 'aria-hidden': 'true' }, String(n)) : null,
      h('span', { class: 'row-main' }, h('strong', {}, ex.name), h('span', { class: 'row-sub' }, rx ? rxText(rx) : `${TIER[ex.tier]} · ${NEED[ex.need]}`)), ic('chevron-down', 18)),
    h('div', { class: 'hx-body stack' },
      h('p', { style: { margin: 0 } }, ex.why),
      h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))),
      h('div', { class: 'cluster' }, ex.cues.map((c) => h('span', { class: 'chip info' }, c))),
      h('dl', { class: 'gx-dl' }, h('dt', {}, 'Error común'), h('dd', {}, ex.err), h('dt', {}, 'Más fácil'), h('dd', {}, ex.easier), h('dt', {}, 'Más difícil'), h('dd', {}, ex.harder)),
      rx && last !== undefined && nextStep(rx, last) ? note(`La siguiente vez: ${nextStep(rx, last)}`) : null,
      ex.safety ? note(`Seguridad: ${ex.safety}`, 'warn') : null,
      h('p', { class: 'row-sub', style: { margin: 0 } }, `${ex.body} · ${NEED[ex.need]} · ${TIER[ex.tier]}${ex.each ? ' · peso por mano' : ''}`)));
}

function dayCard(day, { pid, canLog }) {
  return h('section', { class: 'panel stack gx-day' },
    h('div', { class: 'split' }, h('h3', {}, `Día ${day.key}: ${day.name}`), h('span', { class: 'chip ball' }, `≈ ${day.min} min`)),
    h('p', { class: 'row-sub', style: { margin: 0 } }, `${day.focus}. ${plural(day.items.length, 'ejercicio', 'ejercicios')}.`),
    h('details', { class: 'gx-sub' }, h('summary', {}, h('strong', {}, 'Calentamiento, 10 min')), h('ol', { class: 'plain' }, WARMUP.map((x) => h('li', {}, x)))),
    h('div', { class: 'rows' }, day.items.map((rx, i) => exItem(GYM_BY_ID[rx.ex], { rx, last: pid ? lastFor(pid, rx.ex) : undefined, n: i + 1 }))),
    h('details', { class: 'gx-sub' }, h('summary', {}, h('strong', {}, 'Para terminar, 5 min')), h('ul', { class: 'plain' }, COOLDOWN.map((x) => h('li', {}, x)))),
    canLog ? h('a', { class: 'btn primary', href: `#/gym/registrar/${day.key}` }, ic('check', 18), `Registrar el día ${day.key}`) : null);
}

// Próximo partido o torneo en los siguientes 7 días.
function nextGame(me) {
  const today = todayStr(), lim = addDays(today, 7);
  const ms = state.data.matches.filter((m) => m.status !== 'terminado' && m.match_date >= today && m.match_date <= lim && (!me || !multiTeam() || inTeam(me, teamOf(m))));
  const ts = state.data.tournaments.filter((t) => t.start_date >= today && t.start_date <= lim && (!me || !(t.roster || []).length || t.roster.includes(me.id)));
  return [...ms.map((m) => m.match_date), ...ts.map((t) => t.start_date)].sort()[0] || null;
}
function gameNote(me) {
  const d = nextGame(me);
  if (!d) return null;
  const heavy = addDays(d, -2), today = todayStr();
  const what = d === today ? 'Hoy tienes partido' : `Tienes partido el ${longDay(d)}`;
  if (heavy < today) return note(`${what}. Ya no hagas pierna pesada ni saltos en el gym: descansa o haz solo hombro y tronco ligero.`, 'warn');
  return note(`${what}. Si vas al gym, haz pierna o saltos a más tardar el ${longDay(heavy)}, y el ${longDay(addDays(d, -1))} descansa del gym (o solo hombro y tronco ligero).`, 'warn');
}

function weekChips(r) {
  const train = settings().days || [];
  const plan = weekPlan(r.n, train);
  return h('div', { class: 'stack' },
    h('div', { class: 'cluster' }, plan.map((x, i) => h('span', { class: `chip ${x.after ? 'warn' : 'info'}` }, `${DAYS[x.wd]}: día ${r.days[i]?.key || ''}${x.after ? ', después del entreno' : ''}`))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, train.length ? `Propuesta según tus días de entreno (${train.map((d) => DAYS_LONG[d]).join(' y ')}). Muévelos si te conviene, pero deja al menos un día entre dos días de pierna.` : 'Muévelos si te conviene, pero deja al menos un día entre dos días de pierna.'));
}

function routineBlock(r, { pid, canLog, me }) {
  return h('div', { class: 'stack' },
    r.notes.map((t) => note(t)),
    me !== undefined ? gameNote(me) : null,
    h('section', { class: 'stack' }, sectionTitle('Tu semana'), weekChips(r)),
    r.days.map((d) => dayCard(d, { pid, canLog })));
}

// Formulario para armar la rutina. Se vuelve a dibujar solo; onChange recibe la rutina nueva.
export function specForm(spec, onChange) {
  const box = h('div', { class: 'stack gx-form' });
  const s = spec;
  const segOf = (key, pairs, label, hint) => h('div', { class: 'field' }, h('span', { class: 'label' }, label),
    h('div', { class: 'seg', role: 'group', 'aria-label': label }, pairs.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(s[key]) === String(v) ? 'true' : 'false',
      onclick: () => { s[key] = v; paint(); onChange?.(s); } }, t))), hint ? h('span', { class: 'hint' }, hint) : null);
  function paint() {
    const cap = maxDays(s);
    box.replaceChildren(
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Qué quieres lograr?'),
        h('div', { class: 'choices gx-goals' }, Object.entries(GOALS).map(([k, g]) => h('button', { type: 'button', class: `choice${s.goal === k ? ' on' : ''}`, 'aria-pressed': s.goal === k ? 'true' : 'false',
          onclick: () => { s.goal = k; paint(); onChange?.(s); } }, ic(g.icon, 22), h('span', { class: 'row-main' }, h('strong', {}, g.name), h('span', { class: 'row-sub' }, g.desc)))))),
      segOf('phase', Object.entries(PHASE).map(([k, p]) => [k, p.name]), '¿En qué momento estás?', PHASE[s.phase].desc),
      segOf('days', [1, 2, 3, 4].map((n) => [n, String(n)]), 'Días de gym por semana', s.days > cap ? `En ${s.phase === 'torneo' ? 'semana de partido' : s.goal === 'regreso' ? 'regreso' : 'temporada'} Remate usa ${plural(cap, 'día', 'días')} como máximo.` : null),
      segOf('minutes', MINUTES.map((m) => [m, `${m} min`]), 'Tiempo por sesión'),
      segOf('exp', Object.entries(EXP).map(([k, e]) => [k, e.name]), 'Tu experiencia en el gym', EXP[s.exp].desc),
      segOf('equip', Object.entries(EQUIP).map(([k, e]) => [k, e.name]), '¿Qué hay en tu gym?', EQUIP[s.equip].desc));
  }
  paint();
  return box;
}

function rulesPanel(open = false) {
  return h('details', { class: 'panel', open: open ? true : null }, h('summary', {}, h('strong', {}, 'Antes de empezar: seguridad')),
    h('ul', { class: 'plain', style: { marginTop: '10px' } }, RULES.map((x) => h('li', {}, x))));
}
function readPanel() {
  return h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo leer tu rutina')),
    h('dl', { class: 'gx-dl', style: { marginTop: '10px' } }, READ.flatMap(([t, d]) => [h('dt', {}, t), h('dd', {}, d)])));
}

// ---------- pestañas comunes ----------
function libraryTab(ctx) {
  const ui = ctx.ui; ui.grp ??= ''; ui.q ??= ''; ui.eq ??= '';
  const q = h('input', { type: 'search', placeholder: 'Buscar ejercicio', 'aria-label': 'Buscar ejercicio', value: ui.q });
  const eq = h('select', { 'aria-label': 'Qué hay en tu gym' }, options([['', 'Cualquier gym'], ...Object.entries(EQUIP).map(([k, e]) => [k, e.name])], ui.eq));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tipo de ejercicio' }, [['', 'Todos'], ...Object.entries(GROUPS).map(([k, g]) => [k, g.name])].map(([k, t]) =>
    h('button', { type: 'button', 'aria-pressed': ui.grp === k ? 'true' : 'false', onclick: () => { ui.grp = k; ctx.rerender(); } }, t)));
  const rows = h('div', { class: 'rows' }), count = h('span', { class: 'row-sub', 'aria-live': 'polite' });
  const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function paint() {
    ui.q = q.value; ui.eq = eq.value;
    const list = GYM.filter((e) => (!ui.grp || groupOf(e) === ui.grp) && (!ui.eq || available(e, ui.eq)) && (!ui.q || norm(`${e.name} ${e.body} ${e.why}`).includes(norm(ui.q))));
    count.textContent = plural(list.length, 'ejercicio', 'ejercicios');
    rows.replaceChildren(...(list.length ? list.map((e) => exItem(e)) : [h('div', { class: 'empty' }, 'Ningún ejercicio coincide.')]));
  }
  q.addEventListener('input', paint); eq.addEventListener('change', paint);
  paint();
  return h('div', { class: 'stack' }, h('p', { style: { margin: 0 } }, 'Toca un ejercicio para ver cómo se hace, el error más común y cómo hacerlo más fácil o más difícil.'),
    seg, h('div', { class: 'grid' }, q, eq), count, rows);
}

function arriveTab(me) {
  return h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'El gym sirve si llegas al entreno y al partido mejor que antes, no más cansado. Esto es lo que más ayuda.'),
    me !== undefined ? gameNote(me) : null,
    h('div', { class: 'gx-arrive' }, ARRIVE.map((a) => h('section', { class: 'panel stack' },
      h('div', { class: 'cluster' }, h('span', { class: 'gx-ic' }, ic(a.icon, 20)), h('h3', {}, a.title)),
      h('ul', { class: 'plain' }, a.items.map((x) => h('li', {}, x)))))),
    rulesPanel(), readPanel(),
    h('section', { class: 'stack' }, sectionTitle('De dónde sale esto'),
      h('ul', { class: 'plain srcs' }, GYM_SOURCES.map(([t, u]) => h('li', {}, t, ' ', link(u, 'Ver fuente')))),
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Las rutinas, series y descansos de Remate son una propuesta basada en estas fuentes, no un estudio. Remate no sustituye a un médico, un nutriólogo ni un entrenador titulado.')));
}

// ---------- jugador ----------
const P_TABS = [['rutina', 'Mi rutina'], ['registro', 'Mi avance'], ['ejercicios', 'Ejercicios'], ['llegar', 'Llegar bien']];
function tabsEl(ctx, list) {
  return h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones de Gym' }, list.map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ctx.ui.tab === id ? 'true' : 'false', onclick: () => { ctx.ui.tab = id; ctx.rerender(); } }, label)));
}

function playerView(ctx) {
  const me = ctx.me;
  if (!me) return { title: 'Gym', el: h('div', { class: 'page' }, empty('Sin jugador', 'Vuelve a entrar con tu código.')) };
  if (!gymVisible() && !ctx.self) return { title: 'Gym', back: '#/inicio', el: h('div', { class: 'page' }, empty('Gym no está activado', 'Tu entrenador decide si esta sección está disponible para el equipo.')) };
  const ui = ctx.ui;
  if (P_TABS.some(([id]) => id === ctx.args[0]) && !ui.argTab) { ui.tab = ctx.args[0]; ui.argTab = true; }
  ui.tab ??= 'rutina';
  const canLog = gymReady() && !ctx.readonly;
  const st = gymStats(me.id);
  const body = ui.tab === 'registro' ? historyTab(ctx, me, canLog) : ui.tab === 'ejercicios' ? libraryTab(ctx) : ui.tab === 'llegar' ? arriveTab(me) : routineTab(ctx, me, canLog);
  const el = h('div', { class: 'page' },
    h('section', { class: 'band next stack' }, h('h2', {}, 'Físico en el gym'),
      h('p', { style: { margin: 0 } }, 'Tu rutina de pesas según lo que quieres mejorar, para llegar más fuerte y sin lesiones a los entrenos y partidos.'),
      h('p', { class: 'when', style: { margin: 0 } }, st.week ? `Esta semana: ${plural(st.week, 'sesión', 'sesiones')}.` : st.last ? `Tu última sesión: ${fmtDate(st.last)}.` : 'Todavía no registras sesiones.')),
    !gymReady() ? note('Por ahora no se pueden guardar tus sesiones (falta una actualización de tu entrenador). Igual puedes armar tu rutina y hacerla.', 'warn') : null,
    tabsEl(ctx, P_TABS), body);
  return { title: 'Gym', sub: 'Físico para voleibol', back: '#/inicio', el };
}

function routineTab(ctx, me, canLog) {
  const ui = ctx.ui;
  const act = activeSpec(me);
  if (!act.spec || ui.edit) {
    ui.draftSpec ??= normSpec(act.own || act.coachSpec || {});
    const preview = h('div', { class: 'stack' });
    const paintPreview = () => {
      const r = buildRoutine(ui.draftSpec);
      preview.replaceChildren(sectionTitle('Así queda'), h('p', { class: 'row-sub', style: { margin: 0 } }, specText(ui.draftSpec)),
        r.notes.map((t) => note(t)),
        h('div', { class: 'rows' }, r.days.map((d) => h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, `Día ${d.key}: ${d.name} (≈ ${d.min} min)`),
          h('span', { class: 'row-sub' }, d.items.map((rx) => gymName(rx.ex)).join(', ')))))));
    };
    paintPreview();
    const save = () => {
      if (ctx.readonly) { toast('Vista previa: aquí no se guarda'); return; }
      ls.set(KEY.mine(me.id), JSON.stringify({ ...normSpec(ui.draftSpec), since: todayStr() }));
      ls.set(KEY.use(me.id), 'mine');
      ui.edit = false; ui.draftSpec = null; toast('Rutina guardada en este celular'); ctx.rerender();
    };
    return h('div', { class: 'stack' },
      act.spec ? null : h('p', { style: { margin: 0 } }, 'Contesta seis preguntas y Remate te arma una rutina con calentamiento, series, repeticiones y descansos. La puedes cambiar cuando quieras.'),
      rulesPanel(!act.spec && !gymLogsOf(me.id).length),
      specForm(ui.draftSpec, paintPreview), preview,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn primary', type: 'button', disabled: ctx.readonly ? true : null, onclick: save }, ic('check', 18), 'Usar esta rutina'),
        act.spec ? h('button', { class: 'btn', type: 'button', onclick: () => { ui.edit = false; ui.draftSpec = null; ctx.rerender(); } }, 'Cancelar') : null));
  }
  const s = act.spec, r = buildRoutine(s), bw = blockWeek(s.since || s.updated_at);
  const src = act.coachSpec && act.own ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Qué rutina usar' },
    [['coach', 'La de mi entrenador'], ['mine', 'La mía']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': act.src === k ? 'true' : 'false',
      onclick: () => { ls.set(KEY.use(me.id), k); ctx.rerender(); } }, t))) : null;
  return h('div', { class: 'stack' },
    src,
    h('section', { class: `panel stack${act.src === 'coach' ? ' plan' : ''}` },
      h('div', { class: 'split' }, h('h2', {}, act.src === 'coach' ? 'Rutina de tu entrenador' : 'Tu rutina'), bw ? h('span', { class: `chip ${bw.light ? 'warn' : 'info'}` }, bw.light ? 'Semana ligera' : `Semana ${bw.week} de 6`) : null),
      h('p', { style: { margin: 0 } }, specText(s)),
      act.src === 'coach' && s.note ? h('p', { style: { margin: 0 } }, `Tu entrenador: “${s.note}”`) : null,
      bw?.light ? note('Semana ligera: haz una serie menos en cada ejercicio y no subas peso. La siguiente semana vuelve a armar tu rutina (o súbele la experiencia si ya dominas la técnica).') : null,
      ctx.readonly ? null : h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { ui.edit = true; ui.draftSpec = normSpec(act.src === 'mine' ? s : (act.own || s)); ctx.rerender(); } },
        ic('pencil', 16), act.src === 'coach' && !act.own ? 'Armar la mía' : 'Cambiar mi rutina'))),
    routineBlock(r, { pid: me.id, canLog, me }),
    readPanel(), rulesPanel());
}

function historyTab(ctx, me, canLog) {
  const ui = ctx.ui, st = gymStats(me.id), logs = st.logs;
  if (!logs.length) return h('div', { class: 'stack' }, empty('Todavía no hay sesiones', canLog ? 'Cuando termines un día de tu rutina, toca «Registrar» y aquí verás tu avance y cuánto peso mueves.' : 'Aquí aparecerán las sesiones registradas.'));
  const kpis = h('div', { class: 'kpis' },
    h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(st.week)), h('span', { class: 'l' }, 'esta semana')),
    h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(st.four)), h('span', { class: 'l' }, 'en 4 semanas')),
    h('div', { class: 'kpi' }, h('span', { class: 'n' }, String(logs.length)), h('span', { class: 'l' }, 'en total')));
  // Avance por ejercicio: el mejor peso (o repeticiones o segundos) de cada sesión.
  const seen = new Map();
  for (const l of [...logs].reverse()) for (const e of l.sets || []) { if (!GYM_BY_ID[e.ex]) continue; if (!seen.has(e.ex)) seen.set(e.ex, []); seen.get(e.ex).push({ l, e }); }
  const exIds = [...seen.keys()].filter((id) => seen.get(id).length >= 2)
    .sort((a, b) => Number(GYM_BY_ID[b].unit === 'kg' && GYM_BY_ID[b].pat !== 'lanzamiento') - Number(GYM_BY_ID[a].unit === 'kg' && GYM_BY_ID[a].pat !== 'lanzamiento'));   // primero los de peso
  ui.ex = exIds.includes(ui.ex) ? ui.ex : exIds[0];
  let chart = null;
  if (ui.ex) {
    const ex = GYM_BY_ID[ui.ex], useKg = ex.unit === 'kg' && seen.get(ui.ex).some(({ e }) => (e.s || []).some((x) => Number(x[0]) > 0));
    const pts = seen.get(ui.ex).map(({ l, e }) => ({ x: l.done_on, y: Math.max(...(e.s || []).map((x) => Number(useKg ? x[0] : x[1]) || 0)), tip: `Día ${l.day}` })).filter((p) => p.y > 0);
    const pick = h('select', { 'aria-label': 'Ejercicio' }, options(exIds.map((id) => [id, gymName(id)]), ui.ex));
    pick.addEventListener('change', () => { ui.ex = pick.value; ctx.rerender(); });
    chart = h('section', { class: 'stack' }, sectionTitle('Tu avance'), pick,
      pts.length >= 2 ? lineChart(pts, { unit: useKg ? 'kg' : ex.unit === 's' ? 's' : 'reps', label: ex.name, digits: useKg ? 1 : 0, bestLabel: 'Mejor' }) : note('Registra este ejercicio un par de veces más para ver la gráfica.'));
  }
  return h('div', { class: 'stack' }, kpis, chart,
    h('section', { class: 'stack' }, sectionTitle('Tus sesiones'), h('div', { class: 'rows' }, logs.slice(0, 30).map((l) => logRow(l, canLog)))));
}

function setsText(e) {
  const ex = GYM_BY_ID[e.ex];
  const parts = (e.s || []).map((x) => (ex?.unit === 'kg' && Number(x[0]) > 0 ? `${x[0]}×${x[1]}` : `${x[1]}${ex?.unit === 's' ? ' s' : ''}`));
  return `${gymName(e.ex)}: ${parts.join(', ')}`;
}
function logRow(l, canDelete, who) {
  const head = [who, l.day ? `Día ${l.day}` : 'Sesión', fmtDate(l.done_on, { weekday: 'short', day: 'numeric', month: 'short' }), l.minutes ? `${l.minutes} min` : null, l.rpe ? `esfuerzo ${l.rpe} (${RPE[l.rpe].toLowerCase()})` : null].filter(Boolean).join(' · ');
  return h('details', { class: 'hx' },
    h('summary', {}, h('span', { class: 'row-main' }, h('strong', {}, head), h('span', { class: 'row-sub' }, `${plural((l.sets || []).length, 'ejercicio', 'ejercicios')}${l.goal && GOALS[l.goal] ? ` · ${GOALS[l.goal].name}` : ''}`)),
      l.pain ? h('span', { class: 'chip bad' }, 'Molestia') : null, ic('chevron-down', 18)),
    h('div', { class: 'hx-body stack' },
      h('ul', { class: 'plain' }, (l.sets || []).map((e) => h('li', {}, setsText(e)))),
      l.note ? h('p', { style: { margin: 0 } }, `Nota: ${l.note}`) : null,
      canDelete ? h('button', { class: 'btn sm danger', type: 'button', style: { justifySelf: 'start' }, onclick: async () => {
        if (await confirmSheet({ title: '¿Borrar esta sesión?', text: `${l.day ? `Día ${l.day}` : 'Sesión'} del ${fmtDate(l.done_on)}.`, ok: 'Borrar', danger: true })) { remove('gymLogs', l.id); toast('Sesión borrada'); }
      } }, ic('trash-2', 16), 'Borrar') : null));
}

// ---------- registrar una sesión ----------
function logPage(ctx) {
  const me = ctx.role === 'coach' ? null : ctx.me;
  const back = '#/gym';
  if (!me) return { title: 'Registrar', back, el: h('div', { class: 'page' }, empty('Solo para jugadores', 'Entra a tu perfil de jugador para registrar tus sesiones.')) };
  const act = activeSpec(me);
  const r = act.spec ? buildRoutine(act.spec) : null, day = r?.days.find((d) => d.key === ctx.args[1]);
  if (!day) return { title: 'Registrar', back, el: h('div', { class: 'page' }, empty('No encontré ese día', 'Puede que hayas cambiado tu rutina.', h('a', { class: 'btn', href: back }, 'Ver mi rutina'))) };
  const ui = ctx.ui, canSave = gymReady() && !ctx.readonly;
  if (!ui.draft) {
    const saved = readJSON(KEY.draft(me.id));
    if (saved && saved.key === day.key && saved.goal === act.spec.goal && saved.at && Date.now() - saved.at < 12 * 3600e3) { ui.draft = saved; ui.recovered = true; }
    else ui.draft = { key: day.key, goal: act.spec.goal, date: todayStr(), minutes: day.min, rpe: null, pain: false, note: '', at: Date.now(),
      entries: day.items.map((rx) => { const last = lastFor(me.id, rx.ex); return { ex: rx.ex, s: Array.from({ length: rx.sets }, (_, i) => [last?.s?.[i]?.[0] ?? last?.s?.[0]?.[0] ?? '', '']) }; }) };
  }
  const dr = ui.draft;
  let timer;
  const persist = () => { dr.at = Date.now(); clearTimeout(timer); timer = setTimeout(() => ls.set(KEY.draft(me.id), JSON.stringify(dr)), 300); };
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });

  const exBlock = (rx, k) => {
    const ex = GYM_BY_ID[rx.ex], entry = dr.entries[k] || (dr.entries[k] = { ex: rx.ex, s: [['', '']] });
    const last = lastFor(me.id, rx.ex), tip = nextStep(rx, last);
    const kgOn = ex.unit === 'kg';
    const repsLabel = ex.repsLabel || (ex.unit === 's' ? 'Segundos' : 'Reps');
    const list = h('div', { class: 'gx-sets' });
    const paintSets = () => list.replaceChildren(...entry.s.map((x, i) => h('div', { class: 'gx-set' },
      h('span', { class: 'gx-sn' }, `Serie ${i + 1}`),
      kgOn ? h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'decimal', min: 0, max: 400, step: 0.5, value: x[0] ?? '', 'aria-label': `${ex.name}, serie ${i + 1}: kilos${ex.each ? ' por mano' : ''}`,
        oninput: (e) => { x[0] = e.target.value; persist(); } }), h('span', {}, ex.each ? 'kg c/u' : 'kg')) : null,
      h('label', { class: 'gx-in' }, h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 600, step: 1, value: x[1] ?? '', placeholder: String(rx.reps).replace(/\s*(s|m)$/, ''), 'aria-label': `${ex.name}, serie ${i + 1}: ${repsLabel.toLowerCase()}`,
        oninput: (e) => { x[1] = e.target.value; persist(); } }), h('span', {}, repsLabel.toLowerCase())))));
    paintSets();
    return h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h3', {}, `${k + 1}. ${ex.name}`), h('span', { class: 'row-sub' }, rxText(rx))),
      last ? h('p', { class: 'row-sub', style: { margin: 0 } }, `La vez pasada: ${setsText(last).replace(`${ex.name}: `, '')}`) : null,
      tip ? note(tip) : null,
      list,
      h('div', { class: 'cluster' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => { if (entry.s.length >= 8) return; entry.s.push([entry.s[entry.s.length - 1]?.[0] ?? '', '']); persist(); paintSets(); } }, ic('plus', 16), 'Serie'),
        entry.s.length > 1 ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { entry.s.pop(); persist(); paintSets(); } }, ic('minus', 16), 'Quitar la última') : null,
        h('details', { class: 'gx-how' }, h('summary', {}, '¿Cómo se hace?'), h('ol', { class: 'plain' }, ex.how.map((x) => h('li', {}, x))))));
  };

  const date = h('input', { type: 'date', min: addDays(todayStr(), -7), max: todayStr(), value: dr.date, oninput: (e) => { dr.date = e.target.value; persist(); } });
  const mins = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 240, value: dr.minutes ?? '', oninput: (e) => { dr.minutes = e.target.value; persist(); } });
  const rpeDesc = h('span', { class: 'hint' });
  const rpeSeg = h('div', { class: 'seg gx-rpe', role: 'group', 'aria-label': '¿Qué tan pesada fue la sesión?' });
  const paintRpe = () => { rpeSeg.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h('button', { type: 'button', 'aria-pressed': Number(dr.rpe) === n ? 'true' : 'false', title: RPE[n], onclick: () => { dr.rpe = n; persist(); paintRpe(); } }, String(n))));
    rpeDesc.textContent = dr.rpe ? RPE[dr.rpe] : '1 muy fácil, 10 al máximo. Lo ideal casi siempre es 6 a 8.'; };
  paintRpe();
  const pain = h('input', { type: 'checkbox', checked: dr.pain ? true : null, onchange: (e) => { dr.pain = e.target.checked; painNote.hidden = !dr.pain; persist(); } });
  const painNote = note('Si te dolió una articulación, no sigas con ese ejercicio y avísale a tu entrenador. Escribe abajo qué te dolió.', 'warn'); painNote.hidden = !dr.pain;
  const text = h('input', { type: 'text', maxlength: 300, value: dr.note || '', placeholder: 'Opcional: cómo te sentiste, qué se te dificultó', oninput: (e) => { dr.note = e.target.value; persist(); } });

  const save = () => {
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    const sets = [];
    for (const e of dr.entries) {
      const ex = GYM_BY_ID[e.ex]; if (!ex) continue;
      const rows = [];
      for (const x of e.s) {
        const reps = num(x[1]), kg = ex.unit === 'kg' ? num(x[0]) : null;
        if (reps == null && kg == null) continue;
        if (reps == null || reps < 1 || reps > 600) return fail(`Revisa ${ex.name}: escribe cuántas ${ex.unit === 's' ? 'segundos' : 'repeticiones'} hiciste en cada serie (o déjala vacía si no la hiciste).`);
        if (kg != null && (kg < 0 || kg > 400)) return fail(`Revisa los kilos de ${ex.name}.`);
        rows.push([kg != null ? Math.round(kg * 10) / 10 : null, Math.round(reps)]);
      }
      if (rows.length) sets.push({ ex: e.ex, s: rows.slice(0, 8) });
    }
    if (!sets.length) return fail('Anota por lo menos una serie.');
    const m = dr.minutes === '' || dr.minutes == null ? null : Math.round(Number(dr.minutes));
    if (m != null && !(m >= 1 && m <= 240)) return fail('Los minutos deben estar entre 1 y 240.');
    const spec = normSpec(act.spec);
    add('gymLogs', { player_id: me.id, done_on: dr.date || todayStr(), day: day.key, goal: spec.goal, minutes: m, rpe: dr.rpe || null, pain: !!dr.pain, note: (dr.note || '').trim(),
      plan: { goal: spec.goal, days: spec.days, minutes: spec.minutes, exp: spec.exp, equip: spec.equip, phase: spec.phase, since: spec.since || null }, sets: sets.slice(0, 16) });
    ls.del(KEY.draft(me.id)); ui.draft = null;
    toast(dr.pain ? 'Guardado. Avísale a tu entrenador de la molestia.' : '¡Bien! Sesión guardada', 3200);
    location.hash = '#/gym/registro';
  };

  const el = h('div', { class: 'page' },
    !canSave ? note(ctx.readonly ? 'Vista previa: aquí no se guarda.' : 'Por ahora no se pueden guardar sesiones. Tu entrenador tiene que actualizar Remate.', 'warn') : null,
    ui.recovered ? note('Recuperé lo que llevabas anotado de esta sesión.') : null,
    gameNote(me),
    h('p', { style: { margin: 0 } }, 'Anota lo que vas haciendo. Si no hiciste una serie, déjala vacía. Lo que escribas se guarda en este celular hasta que toques «Guardar sesión».'),
    day.items.map(exBlock),
    h('section', { class: 'panel stack' }, h('h3', {}, 'Al terminar'),
      h('div', { class: 'grid' }, field('Fecha', date), field('Minutos', mins)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Qué tan pesada fue la sesión?'), rpeSeg, rpeDesc),
      h('label', { class: 'check' }, pain, h('span', {}, 'Me dolió algo (no son agujetas)')), painNote,
      field('Nota', text), note('Tu entrenador ve lo que registras aquí. Nadie más.')),
    err,
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', disabled: canSave ? null : true, onclick: save }, ic('check', 18), 'Guardar sesión'),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        if (await confirmSheet({ title: '¿Descartar lo anotado?', text: 'Se borra lo que llevas de esta sesión.', ok: 'Descartar', danger: true })) { ls.del(KEY.draft(me.id)); ui.draft = null; location.hash = back; }
      } }, 'Descartar')));
  return { title: `Día ${day.key}`, sub: day.name, back, el };
}

// ---------- entrenador ----------
const C_TABS = [['equipo', 'Equipo'], ['armar', 'Armar rutina'], ['ejercicios', 'Ejercicios'], ['llegar', 'Llegar bien']];

function coachView(ctx) {
  const ui = ctx.ui;
  if (C_TABS.some(([id]) => id === ctx.args[0]) && !ui.argTab) { ui.tab = ctx.args[0]; ui.argTab = true; }
  ui.tab ??= 'equipo';
  const body = ui.tab === 'armar' ? buildTab(ctx) : ui.tab === 'ejercicios' ? libraryTab(ctx) : ui.tab === 'llegar' ? arriveTab() : teamTab(ctx);
  const el = h('div', { class: 'page' },
    !gymReady() ? note('Para que tus jugadores guarden sus sesiones de gym y para asignarles rutina, corre en Supabase el instalar.sql de esta versión.', 'bad') : null,
    !gymVisible() ? note('Tus jugadores no ven Gym. Lo activas en Ajustes → Entrenamientos.', 'warn') : null,
    h('p', { style: { margin: 0 } }, 'Rutinas de pesas para que tus jugadores lleguen más fuertes a los entrenos. Cada uno arma la suya según lo que quiere mejorar, o tú le asignas una. Lo que registran lo ves aquí.'),
    tabsEl(ctx, C_TABS), body);
  return { title: 'Gym', sub: 'Físico para voleibol', back: '#/mas', el };
}

function teamTab() {
  const list = players().map((p) => ({ p, ...gymStats(p.id), plan: coachPlanOf(p) }))
    .sort((a, b) => b.four - a.four || (b.last || '').localeCompare(a.last || '') || a.p.name.localeCompare(b.p.name, 'es'));
  const active = list.filter((x) => x.four), idle = list.filter((x) => !x.four);
  const pains = list.filter((x) => x.pain);
  return h('div', { class: 'stack' },
    pains.length ? note(`Reportaron molestia en las últimas 2 semanas: ${pains.map((x) => x.p.name).join(', ')}. Platica con ellos antes de que vuelvan a cargar.`, 'bad') : null,
    h('section', { class: 'stack' }, sectionTitle('Quién va al gym', h('span', { class: 'chip' }, 'Últimas 4 semanas')),
      active.length ? h('div', { class: 'rows' }, active.map((x) => playerGymRow(x))) : empty('Nadie ha registrado todavía', 'Cuéntales a tus jugadores que existe Gym (en su Inicio y en Ejercicios).')),
    idle.length ? h('section', { class: 'stack' }, sectionTitle('Sin sesiones en 4 semanas'), h('div', { class: 'rows' }, idle.map((x) => playerGymRow(x)))) : null);
}
function playerGymRow(x) {
  return h('button', { class: 'row', type: 'button', onclick: () => playerGymSheet(x.p) }, jersey(x.p, 'sm'),
    h('span', { class: 'row-main' }, h('strong', {}, x.p.name), h('span', { class: 'row-sub' }, [x.four ? plural(x.four, 'sesión', 'sesiones') : null, x.last ? `última: ${fmtDate(x.last)}` : 'sin sesiones', x.plan ? `rutina: ${GOALS[x.plan.goal].name}` : null].filter(Boolean).join(' · '))),
    h('span', { class: 'row-end' }, x.pain ? h('span', { class: 'chip bad' }, 'Molestia') : null, x.plan ? h('span', { class: 'chip ball' }, 'Rutina') : null, ic('chevron-right', 18)));
}

export function playerGymSheet(p) {
  const plan = coachPlanOf(p), logs = gymLogsOf(p.id);
  openSheet({ title: `Gym de ${p.name}`, body: h('div', { class: 'stack' },
    plan ? h('div', { class: 'panel plan stack' }, h('strong', {}, 'Rutina que le asignaste'), h('span', {}, specText(plan)), plan.note ? h('span', { class: 'row-sub' }, `“${plan.note}”`) : null)
      : note('No le has asignado rutina: usa la que él arme en su celular.'),
    logs.length ? h('div', { class: 'rows' }, logs.slice(0, 8).map((l) => logRow(l, false))) : empty('Sin sesiones registradas', null)),
  actions: [{ label: 'Cerrar' },
    plan ? { label: 'Quitar rutina', kind: 'danger', onClick: () => { patch('players', p.id, { gym_plan: {} }); toast('Rutina quitada'); } } : null,
    gymReady() ? { label: plan ? 'Cambiar rutina' : 'Asignar rutina', kind: 'primary', onClick: () => { setTimeout(() => gymPlanSheet([p]), 50); } } : null].filter(Boolean) });
}

// Asignar una rutina a uno o varios jugadores (se guarda en su ficha).
export function gymPlanSheet(list, base) {
  const one = list.length === 1 ? list[0] : null;
  const spec = normSpec(base || coachPlanOf(one) || {});
  const preview = h('p', { class: 'row-sub', style: { margin: 0 } });
  const paint = () => { const r = buildRoutine(spec); preview.textContent = r.days.map((d) => `Día ${d.key} (≈ ${d.min} min): ${d.items.map((rx) => gymName(rx.ex)).join(', ')}`).join('. '); };
  paint();
  const text = h('textarea', { rows: 2, maxlength: 200, placeholder: 'Por ejemplo: pierna el lunes, nunca el día antes de partido.' }, (one && coachPlanOf(one)?.note) || '');
  openSheet({ title: one ? `Rutina de gym para ${one.name}` : `Rutina de gym para ${plural(list.length, 'jugador', 'jugadores')}`,
    body: h('div', { class: 'stack' }, specForm(spec, paint), sectionTitle('Así queda'), preview, field('Mensaje para el jugador', text),
      note('El jugador la ve en Gym como «Rutina de tu entrenador». Si arma una propia, puede elegir cuál usar.')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const val = { ...normSpec(spec), note: text.value.trim(), since: todayStr() };
      for (const p of list) patch('players', p.id, { gym_plan: val });
      toast(one ? `Rutina asignada a ${one.name}` : `Rutina asignada a ${plural(list.length, 'jugador', 'jugadores')}`); return true;
    } }] });
}

function assignSheet(spec) {
  const sel = new Set();
  const list = players();
  const count = h('span', { class: 'row-sub' }, 'Ninguno elegido');
  openSheet({ title: 'Asignar esta rutina', body: h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, specText(spec)),
    list.length ? h('div', { class: 'rows' }, list.map((p) => h('label', { class: 'row check' }, h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) sel.add(p.id); else sel.delete(p.id); count.textContent = sel.size ? plural(sel.size, 'jugador elegido', 'jugadores elegidos') : 'Ninguno elegido'; } }),
      jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, coachPlanOf(p) ? `Ya tiene: ${GOALS[coachPlanOf(p).goal].name}` : 'Sin rutina asignada'))))) : empty('Sin jugadores', null),
    count),
  actions: [{ label: 'Cancelar' }, { label: 'Siguiente', kind: 'primary', onClick: () => {
    if (!sel.size) { toast('Elige por lo menos un jugador'); return false; }
    setTimeout(() => gymPlanSheet(list.filter((p) => sel.has(p.id)), spec), 50); return true;
  } }] });
}

function buildTab(ctx) {
  const ui = ctx.ui;
  ui.spec ??= normSpec({ phase: 'temp', exp: 'nuevo' });
  ui.level ??= '';
  const preview = h('div', { class: 'stack' });
  const paint = () => { const r = buildRoutine(ui.spec); preview.replaceChildren(sectionTitle('Así queda'), h('p', { class: 'row-sub', style: { margin: 0 } }, specText(ui.spec)), routineBlock(r, { canLog: false })); };
  paint();
  return h('div', { class: 'stack' },
    h('p', { style: { margin: 0 } }, 'Prueba combinaciones para ver qué rutina recibe cada jugador. Para dejarle una a alguien, tócala en «Asignar».'),
    specForm(ui.spec, paint),
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', disabled: gymReady() ? null : true, onclick: () => assignSheet(normSpec(ui.spec)) }, ic('user-plus', 18), 'Asignar a jugadores')),
    preview);
}

export default function gym(ctx) {
  if (ctx.args[0] === 'registrar') return logPage(ctx);
  return ctx.role === 'coach' ? coachView(ctx) : playerView(ctx);
}

// Resumen de una línea para la tarjeta de Inicio y la ficha del jugador.
export function gymLine(p) {
  const st = gymStats(p.id), plan = coachPlanOf(p);
  if (plan) return `Tu entrenador te armó una rutina: ${GOALS[plan.goal].name}.${st.week ? ` Esta semana llevas ${plural(st.week, 'sesión', 'sesiones')}.` : ''}`;
  if (st.week) return `Esta semana llevas ${plural(st.week, 'sesión', 'sesiones')}. ¡Sigue así!`;
  return 'Arma tu rutina de pesas según lo que quieres mejorar: salto, fuerza, remate, rapidez o prevenir lesiones.';
}
