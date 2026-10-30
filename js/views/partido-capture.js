// Captura en vivo: marcador por set, alineación y rotación, acciones por jugador y zona del saque o del ataque.
import { h, ic, toast, openSheet, confirmSheet, uid } from '../util.js';
import { state, add, patch, players, playerById, ls } from '../store.js';
import { ACTIONS, GROUPS, score, storedSets, countsFor, playersIn, setsToWin, replay, rotLabel, ZONE_ORDER, RIVAL_GRID, ZONE_ACTIONS } from '../match-calc.js';
import { note, sectionTitle, field, options } from './ui.js';

export const getLog = (m) => state.data.matchLogs.find((l) => l.match_id === m.id) || null;
export const nameOf = (id) => playerById(id)?.name || 'Jugador';
const pjersey = (p) => (p ? (p.jersey != null ? String(p.jersey) : p.name.slice(0, 1).toUpperCase()) : '?');

// Preferencias de captura de este celular (marcador automático y zonas).
const PREF = 'remate.captura';
export const capPrefs = () => { try { return { auto: true, zones: false, ...JSON.parse(ls.get(PREF) || '{}') }; } catch { return { auto: true, zones: false }; } };
const setPref = (k, v) => ls.set(PREF, JSON.stringify({ ...capPrefs(), [k]: v }));

// Guarda el registro, el marcador del partido y la estadística de los jugadores tocados.
export function commit(m, log, touched = []) {
  const row = getLog(m);
  if (row) patch('matchLogs', row.id, { log }); else add('matchLogs', { match_id: m.id, log });
  const sc = score(log, m.best_of);
  patch('matches', m.id, { sets: storedSets(sc), ...(m.status === 'planeado' ? { status: 'en_juego' } : {}) });
  for (const pid of touched.filter(Boolean)) {
    const counts = countsFor(log, pid), st = state.data.matchStats.find((s) => s.match_id === m.id && s.player_id === pid);
    if (st) patch('matchStats', st.id, { counts }); else if (Object.keys(counts).length) add('matchStats', { match_id: m.id, player_id: pid, counts });
  }
}

function logEvent(m, a, pid, extra = {}) {
  const log = [...(getLog(m)?.log || [])];
  const sc = score(log, m.best_of);
  if (sc.over) { toast('El partido ya tiene ganador. Termínalo o deshaz la última acción.'); return; }
  const pt = a === 'pt_us' ? 'us' : a === 'pt_them' ? 'them' : capPrefs().auto ? ACTIONS[a]?.pt || null : null;
  log.push({ id: uid().slice(0, 8), set: sc.idx, p: pid || null, a, pt, ...extra });
  commit(m, log, [pid]);
  if (pid && ACTIONS[a]) toast(`${nameOf(pid)}: ${GROUPS[ACTIONS[a].g].toLowerCase()}, ${ACTIONS[a].label.toLowerCase()}${extra.z ? `, zona ${extra.z}` : ''}`, 1400);
}

// Con "marcar zona" encendido, el saque y el ataque que caen en la cancha rival piden la zona.
function act(m, a, pid) {
  if (!capPrefs().zones || !ZONE_ACTIONS.has(a)) { logEvent(m, a, pid); return; }
  const grid = (close) => h('div', { class: 'zone-pick' },
    RIVAL_GRID.map((row) => h('div', { class: 'zp-row' }, row.map((z) =>
      h('button', { type: 'button', class: 'zp', onclick: () => { close(); logEvent(m, a, pid, { z }); } }, h('b', {}, String(z)), h('small', {}, z === 1 || z === 5 || z === 6 ? 'fondo' : 'junto a la red'))))),
    h('div', { class: 'zp-net' }, 'Red'));
  openSheet({ title: `¿Dónde cayó? (cancha de ${m.rival})`, body: (close) => h('div', { class: 'stack' }, h('p', { class: 'row-sub', style: { margin: 0 } }, 'La cancha del rival vista desde tu banca: la red abajo, su fondo arriba.'), grid(close)),
    actions: [{ label: 'Sin zona', onClick: () => logEvent(m, a, pid) }] });
}

function undo(m) {
  const log = [...(getLog(m)?.log || [])];
  const e = log.pop(); if (!e) return;
  commit(m, log, [e.p, e.out]);
  toast(`Deshecho: ${e.a === 'set_end' ? 'cierre de set' : e.a === 'sub' ? 'cambio' : `${e.p ? `${nameOf(e.p)}, ` : ''}${ACTIONS[e.a]?.label.toLowerCase() || e.a}`}`, 1600);
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
  commit(m, log, playersIn(log));
  patch('matches', m.id, { status: 'terminado', sets: storedSets(sc) });
  ctx.ui.tab = 'resumen'; toast('Partido terminado');
}

// ---------- Alineación ----------
export function lineupSheet(m, setIdx) {
  const list = players().slice().sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));
  const lus = m.lineups || [];
  const prev = lus[setIdx] || (setIdx > 0 && lus[setIdx - 1] ? { ...lus[setIdx - 1], serve: lus[setIdx - 1].serve === 'us' ? 'them' : 'us' } : null);
  const opts = (sel) => options([['', '—'], ...list.map((p) => [p.id, `${p.jersey != null ? `${p.jersey} · ` : ''}${p.name}`])], sel || '');
  const zone = {};
  for (let z = 1; z <= 6; z++) zone[z] = h('select', { 'aria-label': `Zona ${z}` }, opts(prev?.slots?.[z - 1]));
  const libero = h('select', { 'aria-label': 'Líbero' }, opts(prev?.libero));
  let serve = prev?.serve || 'us';
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': '¿Quién saca primero?' });
  const drawSeg = () => seg.replaceChildren(...[['us', 'Nosotros'], ['them', m.rival]].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': serve === k ? 'true' : 'false', onclick: () => { serve = k; drawSeg(); } }, t)));
  drawSeg();
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const cell = (z) => h('label', { class: 'lu-cell' }, h('span', {}, `Zona ${z}${z === 1 ? ' (saca)' : ''}`), zone[z]);
  openSheet({
    title: `Alineación del set ${setIdx + 1}`,
    body: h('div', { class: 'stack' },
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Como la ves desde tu banca: la red arriba. Al sacar primero, el de zona 1 es el que saca.'),
      h('div', { class: 'lu-grid' }, h('div', { class: 'lu-net' }, 'Red'), ZONE_ORDER.front.map(cell), ZONE_ORDER.back.map(cell)),
      field('Líbero (opcional)', libero),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Quién saca primero en este set?'), seg), err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const slots = [1, 2, 3, 4, 5, 6].map((z) => zone[z].value);
      if (slots.some((x) => !x)) { err.textContent = 'Elige a los 6 jugadores en cancha.'; err.hidden = false; return false; }
      if (new Set(slots).size < 6) { err.textContent = 'Un jugador está en dos zonas.'; err.hidden = false; return false; }
      if (libero.value && slots.includes(libero.value)) { err.textContent = 'El líbero no puede estar también en la alineación.'; err.hidden = false; return false; }
      const next = [...lus]; while (next.length < setIdx) next.push(null);
      next[setIdx] = { slots, libero: libero.value || null, serve };
      patch('matches', m.id, { lineups: next }); toast('Alineación guardada'); return true;
    } }],
  });
}

function subSheet(m, cur) {
  const on = cur.slots.filter(Boolean), bench = players().filter((p) => !on.includes(p.id) && p.id !== cur.libero);
  const out = h('select', { 'aria-label': 'Sale' }, options(on.map((id) => [id, nameOf(id)]), ''));
  const inn = h('select', { 'aria-label': 'Entra' }, options(bench.map((p) => [p.id, p.name]), ''));
  openSheet({ title: 'Cambio', body: h('div', { class: 'grid' }, field('Sale', out), field('Entra', inn)),
    actions: [{ label: 'Cancelar' }, { label: 'Hacer el cambio', kind: 'primary', onClick: () => {
      if (!inn.value) { toast('No hay nadie en la banca'); return false; }
      const log = [...(getLog(m)?.log || [])], sc = score(log, m.best_of);
      log.push({ id: uid().slice(0, 8), set: sc.idx, p: inn.value, out: out.value, a: 'sub', pt: null });
      commit(m, log); toast(`Entra ${nameOf(inn.value)} por ${nameOf(out.value)}`); return true;
    } }] });
}

// ---------- Pantalla de captura ----------
export function capture(m, ctx) {
  const ui = ctx.ui, pr = capPrefs();
  const log = getLog(m)?.log || [], sc = score(log, m.best_of);
  const roster = players().slice().sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999) || a.name.localeCompare(b.name, 'es'));
  const rp = replay(log, m.lineups || [], roster), cur = rp.cur;
  const hasLineup = !!cur.slots && cur.set === sc.idx;
  ui.noLineup ||= {};
  if (ui.sel && !roster.some((p) => p.id === ui.sel)) ui.sel = null;
  const serveTxt = cur.serving ? (cur.serving === 'us' ? 'Sacamos nosotros' : `Saca ${m.rival}`) : null;

  const board = h('section', { class: 'board' },
    h('div', { class: 'bd-sets' }, h('span', {}, `Sets ${sc.won.us}-${sc.won.them}`), h('span', {}, sc.over ? 'Partido decidido' : `Set ${sc.idx + 1} a ${sc.target}`)),
    h('div', { class: 'bd-score' },
      h('button', { type: 'button', class: 'bd-side us', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'pt_us', null), 'aria-label': 'Sumar un punto a tu equipo' },
        h('span', { class: 'bd-n' }, String(sc.cur.us)), h('span', { class: 'bd-l' }, '+1 nosotros')),
      h('span', { class: 'bd-x', 'aria-hidden': 'true' }, '—'),
      h('button', { type: 'button', class: 'bd-side them', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'pt_them', null), 'aria-label': `Sumar un punto a ${m.rival}` },
        h('span', { class: 'bd-n' }, String(sc.cur.them)), h('span', { class: 'bd-l' }, `+1 ${m.rival}`))),
    serveTxt || hasLineup ? h('div', { class: 'bd-prev' }, serveTxt ? h('span', {}, ic('volleyball', 14), ` ${serveTxt}`) : null, hasLineup ? h('span', {}, rotLabel(cur.key)) : null) : null,
    sc.sets.length > 1 ? h('div', { class: 'bd-prev' }, sc.sets.slice(0, -1).map((s, i) => h('span', {}, `Set ${i + 1}: ${s.us}-${s.them}`))) : null,
    h('div', { class: 'cluster bd-tools' },
      h('button', { type: 'button', class: 'btn sm', disabled: log.length ? null : true, onclick: () => undo(m) }, ic('undo-2', 16), 'Deshacer'),
      sc.canClose ? h('button', { type: 'button', class: 'btn ball sm', onclick: () => closeSet(m) }, ic('check', 16), `Cerrar set ${sc.idx + 1} (${sc.cur.us}-${sc.cur.them})`) : null,
      h('button', { type: 'button', class: `btn sm ${sc.over ? 'primary' : ''}`, onclick: () => finish(m, ctx) }, ic('flag', 16), 'Terminar partido')),
    h('div', { class: 'cluster bd-tools' },
      h('label', { class: 'check', title: 'Cada ace, remate, bloqueo o error suma el punto solo.' },
        h('input', { type: 'checkbox', checked: pr.auto ? true : null, onchange: (e) => { setPref('auto', e.target.checked); ctx.rerender(); } }), h('span', {}, 'Marcador automático')),
      h('label', { class: 'check', title: 'Después de un saque o ataque que cae en su cancha, toca la zona.' },
        h('input', { type: 'checkbox', checked: pr.zones ? true : null, onchange: (e) => { setPref('zones', e.target.checked); ctx.rerender(); } }), h('span', {}, 'Marcar zona'))));

  const pickBtn = (p, extra = '') => h('button', { type: 'button', class: `rp ${extra}`, 'aria-pressed': ui.sel === p.id ? 'true' : 'false', onclick: () => { ui.sel = ui.sel === p.id ? null : p.id; ctx.rerender(); } },
    h('span', { class: 'rp-n' }, pjersey(p)), h('span', { class: 'rp-name' }, p.name));

  let pick;
  if (hasLineup) {
    const slotP = (z) => playerById(cur.slots[z - 1]) || { id: cur.slots[z - 1], name: 'Jugador' };
    const lib = cur.libero ? playerById(cur.libero) : null;
    const on = new Set([...cur.slots, cur.libero].filter(Boolean));
    const bench = roster.filter((p) => !on.has(p.id));
    const zoneBtn = (z) => h('div', { class: 'court-z' }, h('span', { class: 'cz-n' }, z === 1 && cur.serving === 'us' ? ic('volleyball', 14) : String(z)), pickBtn(slotP(z)));
    pick = h('section', { class: 'stack' },
      h('div', { class: 'split' }, h('strong', {}, ui.sel ? `Jugador: ${nameOf(ui.sel)}` : '1. Toca al jugador'),
        h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn sm', onclick: () => subSheet(m, cur) }, ic('arrow-left-right', 16), 'Cambio'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => lineupSheet(m, sc.idx) }, 'Alineación'))),
      h('div', { class: 'court-live' }, h('div', { class: 'cl-net' }, 'Red'), ZONE_ORDER.front.map(zoneBtn), ZONE_ORDER.back.map(zoneBtn)),
      lib || bench.length ? h('div', { class: 'cluster bench' }, lib ? pickBtn(lib, 'lib') : null, bench.map((p) => pickBtn(p, 'sm'))) : null);
  } else {
    pick = h('section', { class: 'stack' },
      !sc.over && !ui.noLineup[sc.idx] ? h('div', { class: 'panel stack lineup-ask' },
        h('strong', {}, `¿Quién empieza el set ${sc.idx + 1}?`),
        h('p', { class: 'row-sub', style: { margin: 0 } }, 'Con la alineación, Remate sigue la rotación y te dice en cuál ganan y en cuál pierden más puntos, y su side-out y break point.'),
        h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn primary sm', onclick: () => lineupSheet(m, sc.idx) }, ic('users', 16), 'Poner alineación'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.noLineup[sc.idx] = true; ctx.rerender(); } }, 'Capturar sin alineación'))) : null,
      h('div', { class: 'split' }, h('strong', {}, ui.sel ? `Jugador: ${nameOf(ui.sel)}` : '1. Toca al jugador'), ui.sel ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.sel = null; ctx.rerender(); } }, 'Quitar') : null),
      roster.length ? h('div', { class: 'roster', role: 'group', 'aria-label': 'Jugadores' }, roster.map((p) => pickBtn(p))) : note('Todavía no hay jugadores en el equipo.'));
  }

  const pad = h('section', { class: 'stack' }, h('strong', {}, '2. Toca lo que hizo'),
    h('div', { class: 'pad' }, Object.entries(GROUPS).map(([g, label]) => h('div', { class: 'pad-g' }, h('span', { class: 'pad-t' }, label),
      h('div', { class: 'pad-b' }, Object.entries(ACTIONS).filter(([, a]) => a.g === g).map(([k, a]) =>
        h('button', { type: 'button', class: `act ${a.tone}`, disabled: !ui.sel || sc.over ? true : null, onclick: () => act(m, k, ui.sel) },
          a.short ? h('b', {}, a.short) : null, a.label, pr.auto && a.pt ? h('small', {}, a.pt === 'us' ? ' +1' : ' +1 rival') : null)))))),
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn sm', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'opp_err', null) }, 'Error del rival'),
      h('button', { type: 'button', class: 'btn sm', disabled: sc.over ? true : null, onclick: () => logEvent(m, 'opp_pt', null) }, 'Punto del rival (sin error nuestro)')),
    !ui.sel ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Primero elige al jugador. Para puntos sin jugador usa los botones del marcador o los de error y punto del rival.') : null);

  const feed = log.slice(-6).reverse();
  return h('div', { class: 'stack capture' }, board, pick, pad,
    feed.length ? h('section', { class: 'stack' }, sectionTitle('Últimas acciones'),
      h('div', { class: 'rows' }, feed.map((e) => h('div', { class: 'row' }, h('span', { class: 'row-main' },
        h('strong', {}, e.a === 'set_end' ? `Fin del set ${e.set + 1}` : e.a === 'sub' ? `Cambio: entra ${nameOf(e.p)} por ${nameOf(e.out)}`
          : `${e.p ? `${nameOf(e.p)}: ` : ''}${e.p ? `${GROUPS[ACTIONS[e.a].g]}, ${ACTIONS[e.a].label.toLowerCase()}` : ACTIONS[e.a]?.label || e.a}${e.z ? `, zona ${e.z}` : ''}`),
        h('span', { class: 'row-sub' }, `Set ${e.set + 1}${e.pt ? `, punto ${e.pt === 'us' ? 'nuestro' : 'del rival'}` : ''}`)))))) : null);
}
