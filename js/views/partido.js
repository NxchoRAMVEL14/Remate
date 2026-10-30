// Un partido: captura en vivo (marcador por set y acciones por jugador) y resumen con estadística.
import { h, ic, toast, confirmSheet, fmtDate, uid } from '../util.js';
import { state, add, patch, remove, players, labReady, profile, saveProfile } from '../store.js';
import { ACTIONS, GROUPS, KINDS, score, storedSets, countsFor, playersIn, metrics, teamSummary, addCounts, fmtEff, result, setsToWin } from '../match-calc.js';
import { note, empty, sectionTitle } from './ui.js';
import { matchSheet } from './partidos.js';
import { coachLogSheet } from './lab-coaching.js';

const getLog = (m) => state.data.matchLogs.find((l) => l.match_id === m.id) || null;
const nameOf = (id) => state.data.players.find((p) => p.id === id)?.name || 'Jugador';
const pjersey = (p) => (p.jersey != null ? String(p.jersey) : p.name.slice(0, 1).toUpperCase());

// Guarda el registro, el marcador del partido y la estadística del jugador afectado.
function commit(m, log, touched = []) {
  const row = getLog(m);
  if (row) patch('matchLogs', row.id, { log }); else add('matchLogs', { match_id: m.id, log });
  const sc = score(log, m.best_of);
  patch('matches', m.id, { sets: storedSets(sc), ...(m.status === 'planeado' ? { status: 'en_juego' } : {}) });
  for (const pid of touched.filter(Boolean)) {
    const counts = countsFor(log, pid), st = state.data.matchStats.find((s) => s.match_id === m.id && s.player_id === pid);
    if (st) patch('matchStats', st.id, { counts }); else if (Object.keys(counts).length) add('matchStats', { match_id: m.id, player_id: pid, counts });
  }
}

function logEvent(m, a, pid, auto) {
  const log = [...(getLog(m)?.log || [])];
  const sc = score(log, m.best_of);
  if (sc.over) { toast('El partido ya tiene ganador. Termínalo o deshaz la última acción.'); return; }
  const pt = a === 'pt_us' ? 'us' : a === 'pt_them' ? 'them' : auto ? ACTIONS[a].pt || null : null;
  log.push({ id: uid().slice(0, 8), set: sc.idx, p: pid || null, a, pt });
  commit(m, log, [pid]);
  if (pid) toast(`${nameOf(pid)}: ${GROUPS[ACTIONS[a].g].toLowerCase()}, ${ACTIONS[a].label.toLowerCase()}`, 1400);
}

function undo(m) {
  const log = [...(getLog(m)?.log || [])];
  const e = log.pop(); if (!e) return;
  commit(m, log, [e.p]);
  toast(`Deshecho: ${e.a === 'set_end' ? 'cierre de set' : `${e.p ? `${nameOf(e.p)}, ` : ''}${ACTIONS[e.a]?.label.toLowerCase() || e.a}`}`, 1600);
}

function closeSet(m) {
  const log = [...(getLog(m)?.log || [])];
  const sc = score(log, m.best_of);
  log.push({ id: uid().slice(0, 8), set: sc.idx, p: null, a: 'set_end', pt: null });
  commit(m, log);
  const after = score(log, m.best_of);
  toast(after.over ? 'Último set cerrado. Ya puedes terminar el partido.' : `Set ${sc.idx + 1} cerrado ${sc.cur.us}-${sc.cur.them}`);
}

async function finish(m, ctx) {
  const log = getLog(m)?.log || [], sc = score(log, m.best_of);
  if (!sc.over && !(await confirmSheet({ title: '¿Terminar el partido?', text: `Todavía no hay ganador de ${setsToWin(m.best_of)} sets. Se guarda el marcador tal como está.`, ok: 'Terminar' }))) return;
  // El set en curso con puntos cuenta como jugado.
  commit(m, log, playersIn(log));
  patch('matches', m.id, { status: 'terminado', sets: storedSets(sc) });
  ctx.ui.tab = 'resumen'; toast('Partido terminado');
}

export default function partido(ctx) {
  const m = state.data.matches.find((x) => x.id === ctx.args[0]);
  if (!m) return { title: 'Partido', back: '#/partidos', el: h('div', { class: 'page' }, empty('No encontré ese partido', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/partidos' }, 'Ver partidos'))) };
  const ui = ctx.ui, ro = !labReady();
  ui.tab = ui.tab || (m.status === 'terminado' || ro ? 'resumen' : 'captura');
  const r = result(m);
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['captura', m.status === 'terminado' ? 'Corregir captura' : 'Captura'], ['resumen', 'Resumen']].map(([id, label]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === id ? 'true' : 'false', disabled: id === 'captura' && ro ? true : null, onclick: () => { ui.tab = id; ctx.rerender(); } }, label)));
  const body = ui.tab === 'captura' && !ro ? capture(m, ctx) : summaryView(m, ctx, ro);
  return { title: `Contra ${m.rival}`, sub: `${fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${KINDS[m.kind]}${m.status === 'terminado' ? ` · ${r.win ? 'Ganado' : 'Perdido'} ${r.text}` : ''}`,
    back: '#/partidos', actions: ro ? [] : [{ icon: 'pencil', label: 'Editar partido', onClick: () => matchSheet(m) }], el: h('div', { class: 'page' }, tabs, body) };
}

// ---------- Captura ----------
function capture(m, ctx) {
  const ui = ctx.ui, pr = profile();
  const auto = pr.auto_score !== false;
  const log = getLog(m)?.log || [], sc = score(log, m.best_of);
  const roster = players().slice().sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999) || a.name.localeCompare(b.name, 'es'));
  if (ui.sel && !roster.some((p) => p.id === ui.sel)) ui.sel = null;

  const board = h('section', { class: 'board' },
    h('div', { class: 'bd-sets' }, h('span', {}, `Sets ${sc.won.us}-${sc.won.them}`), h('span', {}, sc.over ? 'Partido decidido' : `Set ${sc.idx + 1} a ${sc.target}`)),
    h('div', { class: 'bd-score' },
      h('button', { type: 'button', class: 'bd-side us', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'pt_us', null, auto), 'aria-label': 'Sumar un punto a tu equipo' },
        h('span', { class: 'bd-n' }, String(sc.cur.us)), h('span', { class: 'bd-l' }, '+1 nosotros')),
      h('span', { class: 'bd-x', 'aria-hidden': 'true' }, '—'),
      h('button', { type: 'button', class: 'bd-side them', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'pt_them', null, auto), 'aria-label': `Sumar un punto a ${m.rival}` },
        h('span', { class: 'bd-n' }, String(sc.cur.them)), h('span', { class: 'bd-l' }, `+1 ${m.rival}`))),
    sc.sets.length > 1 ? h('div', { class: 'bd-prev' }, sc.sets.slice(0, -1).map((s, i) => h('span', {}, `Set ${i + 1}: ${s.us}-${s.them}`))) : null,
    h('div', { class: 'cluster bd-tools' },
      h('button', { type: 'button', class: 'btn sm', disabled: log.length ? null : true, onclick: () => undo(m) }, ic('undo-2', 16), 'Deshacer'),
      h('label', { class: 'check', title: 'Con el marcador automático, cada ace, remate, bloqueo o error suma el punto solo.' },
        h('input', { type: 'checkbox', checked: auto ? true : null, onchange: (e) => saveProfile({ auto_score: e.target.checked }) }), h('span', {}, 'Marcador automático')),
      sc.canClose ? h('button', { type: 'button', class: 'btn ball sm', onclick: () => closeSet(m) }, ic('check', 16), `Cerrar set ${sc.idx + 1} (${sc.cur.us}-${sc.cur.them})`) : null,
      h('button', { type: 'button', class: `btn sm ${sc.over ? 'primary' : ''}`, onclick: () => finish(m, ctx) }, ic('flag', 16), 'Terminar partido')));

  const pick = h('section', { class: 'stack' },
    h('div', { class: 'split' }, h('strong', {}, ui.sel ? `Jugador: ${nameOf(ui.sel)}` : '1. Toca al jugador'), ui.sel ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.sel = null; ctx.rerender(); } }, 'Quitar') : null),
    roster.length ? h('div', { class: 'roster', role: 'group', 'aria-label': 'Jugadores' }, roster.map((p) =>
      h('button', { type: 'button', class: 'rp', 'aria-pressed': ui.sel === p.id ? 'true' : 'false', onclick: () => { ui.sel = ui.sel === p.id ? null : p.id; ctx.rerender(); } },
        h('span', { class: 'rp-n' }, pjersey(p)), h('span', { class: 'rp-name' }, p.name)))) : note('Agrega jugadores en la sección Jugadores para capturar sus acciones.'));

  const pad = h('section', { class: 'stack' }, h('strong', {}, '2. Toca lo que hizo'),
    h('div', { class: 'pad' }, Object.entries(GROUPS).map(([g, label]) => h('div', { class: 'pad-g' }, h('span', { class: 'pad-t' }, label),
      h('div', { class: 'pad-b' }, Object.entries(ACTIONS).filter(([, a]) => a.g === g).map(([k, a]) =>
        h('button', { type: 'button', class: `act ${a.tone}`, disabled: !ui.sel || sc.over ? true : null, onclick: () => logEvent(m, k, ui.sel, auto) },
          a.short ? h('b', {}, a.short) : null, a.label, auto && a.pt ? h('small', {}, a.pt === 'us' ? ' +1' : ' +1 rival') : null)))))),
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn sm', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'opp_err', null, auto) }, 'Error del rival'),
      h('button', { type: 'button', class: 'btn sm', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'opp_pt', null, auto) }, 'Punto del rival (sin error nuestro)')),
    !ui.sel ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Primero elige al jugador. Para puntos sin jugador usa los botones de arriba o los de error y punto del rival.') : null);

  const feed = log.slice(-6).reverse();
  return h('div', { class: 'stack capture' }, board, pick, pad,
    feed.length ? h('section', { class: 'stack' }, sectionTitle('Últimas acciones'),
      h('div', { class: 'rows' }, feed.map((e) => h('div', { class: 'row' }, h('span', { class: 'row-main' },
        h('strong', {}, e.a === 'set_end' ? `Fin del set ${e.set + 1}` : `${e.p ? `${nameOf(e.p)}: ` : ''}${e.p ? `${GROUPS[ACTIONS[e.a].g]}, ${ACTIONS[e.a].label.toLowerCase()}` : ACTIONS[e.a]?.label || e.a}`),
        h('span', { class: 'row-sub' }, `Set ${e.set + 1}${e.pt ? `, punto ${e.pt === 'us' ? 'nuestro' : 'del rival'}` : ''}`)))))) : null);
}

// ---------- Resumen ----------
function summaryView(m, ctx, ro) {
  const log = getLog(m)?.log || [];
  const r = result(m), team = teamSummary(log);
  const ids = playersIn(log);
  const stats = state.data.matchStats.filter((s) => s.match_id === m.id);
  // Si el registro no está (otro celular sin sincronizar), se usa lo guardado por jugador.
  const rows = (ids.length ? ids.map((id) => ({ id, c: countsFor(log, id) })) : stats.map((s) => ({ id: s.player_id, c: s.counts })))
    .map((x) => ({ ...x, m: metrics(x.c), name: nameOf(x.id) })).sort((a, b) => b.m.points - a.m.points || a.name.localeCompare(b.name, 'es'));
  const tm = ids.length ? team : metrics(addCounts(...rows.map((x) => x.c)));
  const k = (n, l) => h('div', { class: 'kpi' }, h('span', { class: 'n' }, n), h('span', { class: 'l' }, l));
  const pctTxt = (x) => (x == null ? '—' : `${x}%`);
  return h('div', { class: 'stack' },
    h('section', { class: 'panel stack' },
      h('div', { class: 'split' }, h('h2', {}, m.status === 'terminado' ? `${r.win ? 'Ganamos' : 'Perdimos'} ${r.text}` : `Sets ${r.text}`), m.status !== 'terminado' ? h('span', { class: 'chip warn' }, m.status === 'planeado' ? 'Próximo' : 'En juego') : null),
      (m.sets || []).length ? h('div', { class: 'cluster' }, m.sets.map((s, i) => h('span', { class: `chip ${s.us > s.them ? 'ok' : s.them > s.us ? 'bad' : ''}` }, `Set ${i + 1}: ${s.us}-${s.them}`))) : h('p', { style: { margin: 0 } }, 'Todavía no hay puntos.'),
      m.venue ? h('span', { class: 'row-sub' }, m.venue) : null, m.note ? h('p', { style: { margin: 0 } }, m.note) : null),
    rows.length ? h('div', { class: 'kpis' }, k(fmtEff(tm.atEff), 'Eficiencia de ataque'), k(pctTxt(tm.recPos), 'Recepción buena o perfecta'), k(pctTxt(tm.svIn), 'Saques dentro')) : null,
    rows.length ? h('div', { class: 'kpis' }, k(String(tm.aces), 'Aces'), k(String(tm.blocks), 'Puntos de bloqueo'), k(String(tm.errors), 'Errores nuestros')) : null,
    ids.length && team.oppErr != null ? h('p', { style: { margin: 0 } }, `Puntos nuestros: ${team.ourPts}. De ellos, ${team.points} fueron por ace, remate o bloqueo y ${team.oppErr} por error del rival anotado.`) : null,
    rows.length ? h('section', { class: 'stack' }, sectionTitle('Por jugador'),
      h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' },
        h('thead', {}, h('tr', {}, ['Jugador', 'Pts', 'Saque (ace/err/total)', 'Recepción (prom., % buena)', 'Ataque (pts/err/total, efic.)', 'Bloqueo', 'Defensa'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rows.map((x) => h('tr', {},
          h('th', { scope: 'row' }, x.name), h('td', {}, String(x.m.points)),
          h('td', {}, x.m.serves ? `${x.m.aces}/${x.m.svErr}/${x.m.serves}` : '—'),
          h('td', {}, x.m.recs ? `${x.m.recAvg} · ${x.m.recPos}%` : '—'),
          h('td', {}, x.m.atts ? `${x.m.kills}/${x.m.atErr}/${x.m.atts} · ${fmtEff(x.m.atEff)}` : '—'),
          h('td', {}, x.m.blocks || x.m.blkTouch ? `${x.m.blocks} pts, ${x.m.blkTouch} toques` : '—'),
          h('td', {}, x.m.digs ? `${x.m.digOk}/${x.m.digs}` : '—'))))))) : empty('Sin estadística', ro ? 'Este partido no tiene acciones capturadas.' : 'Captura las acciones en la pestaña Captura para ver la estadística por jugador.'),
    rows.length ? h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Cómo leer estos números')),
      h('ul', { class: 'plain', style: { marginTop: '10px' } },
        h('li', {}, 'Eficiencia de ataque = (remates punto − errores − bloqueados) ÷ remates totales. Es la cifra más usada en voleibol para el ataque; un número positivo significa que tu ataque gana más de lo que regala.'),
        h('li', {}, 'Recepción: 3 perfecta (el colocador elige), 2 buena, 1 mala (solo bola alta), 0 error. El promedio va de 0 a 3.'),
        h('li', {}, 'Puntos del jugador = aces + remates punto + bloqueos punto.'))) : null,
    ro ? null : h('div', { class: 'cluster' },
      h('button', { class: 'btn', type: 'button', onclick: () => coachLogSheet(null, { kind: 'partido', match_id: m.id, log_date: m.match_date }) }, ic('notebook-pen', 18), 'Escribir en tu bitácora'),
      h('button', { class: 'btn danger', type: 'button', onclick: async () => {
        if (await confirmSheet({ title: '¿Borrar este partido?', text: 'Se borran el marcador, la captura y la estadística de todos los jugadores en este partido.', ok: 'Borrar', danger: true })) { remove('matches', m.id); toast('Partido borrado'); location.hash = '#/partidos'; }
      } }, ic('trash-2', 18), 'Borrar partido')));
}
