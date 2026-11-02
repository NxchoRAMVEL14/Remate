// Captura en vivo: marcador por set, alineación y rotación, acciones por jugador y zona del saque o del ataque.
import { h, ic, toast, openSheet, confirmSheet, uid, fmtDate, shareText, rivalKey } from '../util.js';
import { state, add, patch, players, playerById, ls, group, teamName, teamOf, inTeam, profile } from '../store.js';
import { ACTIONS, GROUPS, score, storedSets, countsFor, playersIn, setsToWin, replay, rotLabel, ZONE_ORDER, RIVAL_GRID, ZONE_ACTIONS, rivalLabel } from '../match-calc.js';
import { note, sectionTitle, field, options } from './ui.js';
import { suggestLineup } from './sugerido.js';

export const getLog = (m) => state.data.matchLogs.find((l) => l.match_id === m.id) || null;
export const nameOf = (id) => playerById(id)?.name || 'Jugador';
const pjersey = (p) => (p ? (p.jersey != null ? String(p.jersey) : p.name.slice(0, 1).toUpperCase()) : '?');

// Preferencias de captura de este celular (marcador automático y zonas).
const PREF = 'remate.captura';
export const capPrefs = () => { try { return { auto: true, zones: false, rival: true, ...JSON.parse(ls.get(PREF) || '{}') }; } catch { return { auto: true, zones: false, rival: true }; } };
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
  else if (/^opp_/.test(a)) toast(`${m.rival}: ${rivalLabel({ a, ...extra }).toLowerCase()}${log[log.length - 1].pt ? (log[log.length - 1].pt === 'us' ? ' (+1 nuestro)' : ' (+1 rival)') : ''}`, 1400);
}

// ---------- Lo que hace el rival ----------
// Números de playera del rival: los de tu ficha de scouting y los que ya anotaste en este partido.
function rivalNums(m) {
  const sc = (profile().scouting || {})[rivalKey(m.rival)];
  const nums = new Set([...(sc?.players || []).map((p) => String(p.num || '')), ...(getLog(m)?.log || []).map((e) => (e.rn ? String(e.rn) : ''))].filter(Boolean));
  return [...nums].sort((a, b) => Number(a) - Number(b));
}
const RIVAL_TITLE = { opp_sv: 'Saque dentro', opp_at: 'Ataque en juego', 'opp_pt:sv': 'Ace', 'opp_pt:at': 'Punto de ataque', 'opp_err:sv': 'Error de saque', 'opp_err:at': 'Error de ataque' };
// Una sola hoja: quién lo hizo (su número) y a qué zona de tu cancha fue. Tocar la zona guarda.
function rivalSheet(m, a, k) {
  const log = getLog(m)?.log || [], sc = score(log, m.best_of);
  if (sc.over) { toast('El partido ya tiene ganador. Termínalo o deshaz la última acción.'); return; }
  const needZone = a !== 'opp_err';
  const givesPt = capPrefs().auto && !!ACTIONS[a].pt;
  // Si lo último fue un error de tu jugador que ya le dio el punto al rival, probablemente es el mismo punto.
  const last = [...log].reverse().find((e) => e.a !== 'sub');
  const dup = givesPt && a === 'opp_pt' && last && last.a !== 'set_end' && last.set === sc.idx && last.p && last.pt === 'them' ? last : null;
  let num = null;
  const addPt = h('input', { type: 'checkbox', checked: dup ? null : true });
  const save = (close, z) => { close(); logEvent(m, a, null, { ...(k ? { k } : {}), ...(num ? { rn: num } : {}), ...(z ? { z } : {}), ...(givesPt && !addPt.checked ? { pt: null } : {}) }); };
  const other = h('input', { type: 'text', inputmode: 'numeric', maxlength: 3, placeholder: '#', 'aria-label': 'Otro número', class: 'rv-other' });
  const chips = h('div', { class: 'rv-nums', role: 'group', 'aria-label': 'Su número' });
  const body = (close) => {
    const pickNum = (n) => { num = num === n ? null : n; if (!needZone) save(close); else drawChips(); };
    const drawChips = () => chips.replaceChildren(
      ...rivalNums(m).map((n) => h('button', { type: 'button', class: 'rv-num', 'aria-pressed': num === n ? 'true' : 'false', onclick: () => pickNum(n) }, `#${n}`)),
      h('span', { class: 'rv-otherbox' }, other, h('button', { type: 'button', class: 'btn sm', onclick: () => { const v = other.value.replace(/\D/g, '').slice(0, 3); if (!v) { other.focus(); return; } other.value = ''; pickNum(v); } }, needZone ? 'Usar' : 'Guardar')),
      ...(needZone ? [] : [h('button', { type: 'button', class: 'rv-num', onclick: () => { num = null; save(close); } }, 'No sé')]));
    drawChips();
    const zbtn = (z) => h('button', { type: 'button', class: 'zp', onclick: () => save(close, z) }, h('b', {}, String(z)), h('small', {}, z === 1 || z === 5 || z === 6 ? 'fondo' : 'junto a la red'));
    return h('div', { class: 'stack' },
      h('div', { class: 'field' }, h('span', { class: 'label' }, needZone ? '¿Quién? (su número, opcional)' : '¿Quién fue? (su número)'), chips),
      needZone ? h('div', { class: 'field' }, h('span', { class: 'label' }, '¿A dónde fue? Toca la zona de tu cancha'),
        h('div', { class: 'zone-pick ours' }, h('div', { class: 'zp-net' }, 'Red'), h('div', { class: 'zp-row' }, ZONE_ORDER.front.map(zbtn)), h('div', { class: 'zp-row' }, ZONE_ORDER.back.map(zbtn))),
        h('span', { class: 'hint' }, 'Tu cancha vista desde tu banca: la red arriba, tu fondo abajo.')) : null,
      givesPt ? h('label', { class: 'check' }, addPt, h('span', {}, `Sumar el punto ${ACTIONS[a].pt === 'us' ? 'a tu equipo' : `a ${m.rival}`}`)) : null,
      dup ? note(`Lo último que anotaste fue «${GROUPS[ACTIONS[dup.a]?.g] || ''} ${ACTIONS[dup.a]?.label.toLowerCase() || ''}» de ${nameOf(dup.p)}, que ya le dio el punto a ${m.rival}. Por eso no se suma otra vez; solo queda anotado quién y a dónde.`, 'warn') : null);
  };
  openSheet({ title: `${m.rival}: ${RIVAL_TITLE[k ? `${a}:${k}` : a] || ACTIONS[a].label}`, body,
    actions: needZone ? [{ label: 'Cancelar' }, { label: 'Guardar sin zona', onClick: (close) => { save(close); } }] : [{ label: 'Cancelar' }] });
}

function rivalPanel(m, ctx, sc) {
  const pr = capPrefs(), off = sc.over ? true : null;
  const tag = (pt) => (pr.auto && pt ? h('small', {}, pt === 'us' ? ' +1 nuestro' : ' +1 rival') : null);
  const b = (label, tone, pt, onclick) => h('button', { type: 'button', class: `act ${tone}`, disabled: off, onclick }, label, tag(pt));
  const quickErr = (k) => logEvent(m, 'opp_err', null, { k });
  if (!pr.rival) {
    return h('section', { class: 'stack rv-panel' }, h('div', { class: 'split' }, h('strong', {}, `3. Lo que hace ${m.rival}`),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { setPref('rival', true); ctx.rerender(); } }, 'Mostrar')),
      h('div', { class: 'cluster' },
        h('button', { type: 'button', class: 'btn sm', disabled: off, onclick: () => logEvent(m, 'opp_err', null) }, 'Error del rival'),
        h('button', { type: 'button', class: 'btn sm', disabled: off, onclick: () => logEvent(m, 'opp_pt', null) }, 'Punto del rival (sin error nuestro)')));
  }
  return h('section', { class: 'stack rv-panel' },
    h('div', { class: 'split' }, h('strong', {}, `3. Lo que hace ${m.rival}`),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { setPref('rival', false); ctx.rerender(); } }, 'Ocultar')),
    h('div', { class: 'pad' },
      h('div', { class: 'pad-g rv' }, h('span', { class: 'pad-t' }, 'Su saque'),
        h('div', { class: 'pad-b' }, b('Dentro', '', null, () => rivalSheet(m, 'opp_sv')), b('Ace', 'bad', 'them', () => rivalSheet(m, 'opp_pt', 'sv')), b('Error', 'ok', 'us', () => rivalSheet(m, 'opp_err', 'sv')))),
      h('div', { class: 'pad-g rv' }, h('span', { class: 'pad-t' }, 'Su ataque'),
        h('div', { class: 'pad-b' }, b('Punto', 'bad', 'them', () => rivalSheet(m, 'opp_pt', 'at')), b('En juego', '', null, () => rivalSheet(m, 'opp_at')), b('Error', 'ok', 'us', () => rivalSheet(m, 'opp_err', 'at')))),
      h('div', { class: 'pad-g rv' }, h('span', { class: 'pad-t' }, 'Otros errores suyos'),
        h('div', { class: 'pad-b' }, b('Recepción', 'ok', 'us', () => quickErr('rc')), b('Red o invasión', 'ok', 'us', () => quickErr('red')), b('Otro error', 'ok', 'us', () => quickErr('otro')))),
      h('div', { class: 'pad-g rv' }, h('span', { class: 'pad-t' }, 'Otro punto suyo'),
        h('div', { class: 'pad-b' }, b('Punto sin error nuestro', 'bad', 'them', () => logEvent(m, 'opp_pt', null, { k: 'otro' }))))),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Con esto se llena solo el scouting del rival: a dónde saca, quién ataca y cuánto falla. Si el punto ya lo sumaste con el error de tu jugador, Remate no lo vuelve a sumar.'));
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
  toast(`Deshecho: ${e.a === 'set_end' ? 'cierre de set' : e.a === 'sub' ? 'cambio' : /^opp_/.test(e.a) ? rivalLabel(e).toLowerCase() : `${e.p ? `${nameOf(e.p)}, ` : ''}${ACTIONS[e.a]?.label.toLowerCase() || e.a}`}`, 1600);
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
  // Con varios equipos, primero los que juegan en el equipo de este partido.
  const list = players().slice().sort((a, b) => Number(inTeam(b, teamOf(m))) - Number(inTeam(a, teamOf(m))) || (a.jersey ?? 999) - (b.jersey ?? 999));
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
  // v3.8: propuesta de Remate (5-1) a partir del radar, las posiciones y la estadística; tú decides.
  const sugBox = h('div', { class: 'stack' });
  const sugerir = () => {
    const r = suggestLineup(m);
    if (r.error) { sugBox.replaceChildren(note(r.error, 'warn')); return; }
    r.slots.forEach((id, i) => { zone[i + 1].value = id; });
    libero.value = r.libero || '';
    sugBox.replaceChildren(note('Listo: Remate llenó las zonas. Revisa y cambia lo que quieras antes de guardar.', 'ok'), h('details', { class: 'panel' }, h('summary', {}, h('strong', {}, 'Por qué esta alineación')),
      h('ul', { class: 'plain', style: { marginTop: '6px' } }, r.notes.map((x) => h('li', {}, x)), h('li', {}, r.why)),
      r.rated < r.total ? note(`${r.total - r.rated} de ${r.total} no tienen evaluación en el radar: para ellos se usó su nivel. Entre más evalúes, mejor la propuesta.`, 'warn') : null,
      h('p', { class: 'row-sub', style: { margin: '6px 0 0' } }, 'Es una propuesta con reglas simples (sistema 5-1). Cámbiala con los menús de cada zona antes de guardar.')));
  };
  openSheet({
    title: `Alineación del set ${setIdx + 1}`,
    body: h('div', { class: 'stack' },
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Como la ves desde tu banca: la red arriba. Al sacar primero, el de zona 1 es el que saca.'),
      h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn sm', onclick: sugerir }, ic('sparkles', 16), 'Sugerir alineación')),
      h('div', { class: 'lu-grid' }, h('div', { class: 'lu-net' }, 'Red'), ZONE_ORDER.front.map(cell), ZONE_ORDER.back.map(cell)),
      field('Líbero (opcional)', libero),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '¿Quién saca primero en este set?'), seg), sugBox, err),
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
  // Con varios equipos, primero los que juegan en el equipo de este partido.
  const roster = players().slice().sort((a, b) => Number(inTeam(b, teamOf(m))) - Number(inTeam(a, teamOf(m))) || (a.jersey ?? 999) - (b.jersey ?? 999) || a.name.localeCompare(b.name, 'es'));
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
          h('a', { class: 'btn ghost sm', href: `#/alineacion/${m.id}` }, ic('printer', 16), 'Hoja para la mesa'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.noLineup[sc.idx] = true; ctx.rerender(); } }, 'Capturar sin alineación'))) : null,
      h('div', { class: 'split' }, h('strong', {}, ui.sel ? `Jugador: ${nameOf(ui.sel)}` : '1. Toca al jugador'), ui.sel ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ui.sel = null; ctx.rerender(); } }, 'Quitar') : null),
      roster.length ? h('div', { class: 'roster', role: 'group', 'aria-label': 'Jugadores' }, roster.map((p) => pickBtn(p))) : note('Todavía no hay jugadores en el equipo.'));
  }

  const pad = h('section', { class: 'stack' }, h('strong', {}, '2. Toca lo que hizo'),
    h('div', { class: 'pad' }, Object.entries(GROUPS).map(([g, label]) => h('div', { class: 'pad-g' }, h('span', { class: 'pad-t' }, label),
      h('div', { class: 'pad-b' }, Object.entries(ACTIONS).filter(([, a]) => a.g === g).map(([k, a]) =>
        h('button', { type: 'button', class: `act ${a.tone}`, disabled: !ui.sel || sc.over ? true : null, onclick: () => act(m, k, ui.sel) },
          a.short ? h('b', {}, a.short) : null, a.label, pr.auto && a.pt ? h('small', {}, a.pt === 'us' ? ' +1' : ' +1 rival') : null)))))),
    !ui.sel ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Primero elige al jugador. Para puntos sin jugador usa los botones del marcador o lo que hace el rival (abajo).') : null);

  const feed = log.slice(-6).reverse();
  return h('div', { class: 'stack capture' }, board, pick, pad, rivalPanel(m, ctx, sc),
    feed.length ? h('section', { class: 'stack' }, sectionTitle('Últimas acciones'),
      h('div', { class: 'rows' }, feed.map((e) => h('div', { class: 'row' }, h('span', { class: 'row-main' },
        h('strong', {}, e.a === 'set_end' ? `Fin del set ${e.set + 1}` : e.a === 'sub' ? `Cambio: entra ${nameOf(e.p)} por ${nameOf(e.out)}`
          : e.p ? `${nameOf(e.p)}: ${GROUPS[ACTIONS[e.a].g]}, ${ACTIONS[e.a].label.toLowerCase()}${e.z ? `, zona ${e.z}` : ''}`
            : /^opp_/.test(e.a) ? `${m.rival}: ${rivalLabel(e).replace(/^./, (c) => c.toLowerCase())}` : ACTIONS[e.a]?.label || e.a),
        h('span', { class: 'row-sub' }, `Set ${e.set + 1}${e.pt ? `, punto ${e.pt === 'us' ? 'nuestro' : 'del rival'}` : ''}`)))))) : null);
}


// ---------- Hoja de alineación para la mesa (una por set) ----------
// Posiciones I a VI = zonas 1 a 6. El orden de saque sigue la rotación: I, II, III... Si recibimos primero,
// al ganar el saque rotamos antes de sacar, así que nuestro primer saque es de la posición II.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const serveOrder = (lu) => (lu.serve === 'us' ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 1]);
const numName = (p) => (p ? `${p.jersey != null ? `${p.jersey} ` : ''}${p.name}` : '—');
function lineupText(m, i, lu) {
  const P = (id) => playerById(id);
  return [`Alineación · ${teamName(teamOf(m))} vs ${m.rival} · Set ${i + 1}`,
    `Saca primero: ${lu.serve === 'us' ? 'nosotros' : m.rival}`,
    ...[1, 2, 3, 4, 5, 6].map((z) => `${ROMAN[z - 1]}: ${numName(P(lu.slots[z - 1]))}`),
    lu.libero ? `Líbero: ${numName(P(lu.libero))}` : null,
    `Orden de saque: ${serveOrder(lu).map((z) => P(lu.slots[z - 1])?.jersey ?? P(lu.slots[z - 1])?.name ?? '?').join(' → ')}`].filter(Boolean).join('\n');
}
function slip(m, i, lu, canEdit) {
  const team = teamName(teamOf(m));
  const head = h('div', { class: 'slip-head' }, h('strong', {}, `Set ${i + 1}`), h('span', {}, `${team} vs ${m.rival}`), h('span', {}, fmtDate(m.match_date, { day: 'numeric', month: 'short', year: 'numeric' })));
  if (!lu) {
    return h('section', { class: 'slip slip-blank' }, head,
      h('div', { class: 'slip-grid' }, h('span', { class: 'slip-net' }, 'Red'), [4, 3, 2, 5, 6, 1].map((z) => h('div', { class: 'slip-cell' }, h('span', { class: 'slip-pos' }, ROMAN[z - 1]), h('b', {}, ' ')))),
      h('p', { class: 'slip-line' }, 'Líbero: ________   Saca primero: nosotros / rival'),
      h('p', { class: 'slip-line' }, 'Firma del entrenador: ______________________'),
      canEdit ? h('div', { class: 'cluster no-print' }, h('button', { class: 'btn primary sm', type: 'button', onclick: () => lineupSheet(m, i) }, ic('users', 16), `Definir alineación del set ${i + 1}`)) : null);
  }
  const P = (id) => playerById(id);
  const order = serveOrder(lu);
  return h('section', { class: 'slip' }, head,
    h('div', { class: 'slip-grid', role: 'img', 'aria-label': `Posiciones del set ${i + 1}` }, h('span', { class: 'slip-net' }, 'Red'),
      [4, 3, 2, 5, 6, 1].map((z) => { const p = P(lu.slots[z - 1]);
        return h('div', { class: 'slip-cell' }, h('span', { class: 'slip-pos' }, ROMAN[z - 1]), h('b', {}, p?.jersey != null ? String(p.jersey) : '—'), h('span', { class: 'slip-name' }, p?.name || 'Jugador')); })),
    h('p', { class: 'slip-line' }, h('strong', {}, 'Líbero: '), lu.libero ? numName(P(lu.libero)) : 'sin líbero'),
    h('p', { class: 'slip-line' }, h('strong', {}, 'Saca primero: '), lu.serve === 'us' ? 'nosotros (posición I)' : `${m.rival}. Nuestro primer saque es de la posición II.`),
    h('ol', { class: 'slip-order', 'aria-label': 'Orden de saque' }, order.map((z) => { const p = P(lu.slots[z - 1]);
      return h('li', {}, h('span', { class: 'slip-pos' }, ROMAN[z - 1]), ` ${numName(p)}`); })),
    h('p', { class: 'slip-line' }, 'Firma del entrenador: ______________________'),
    h('div', { class: 'cluster no-print' },
      canEdit ? h('button', { class: 'btn sm', type: 'button', onclick: () => lineupSheet(m, i) }, ic('pencil', 16), 'Editar') : null,
      h('button', { class: 'btn sm', type: 'button', onclick: () => shareText(lineupText(m, i, lu)) }, ic('share-2', 16), 'Compartir')));
}
export function alineacion(ctx) {
  const m = state.data.matches.find((x) => x.id === ctx.args[0]);
  if (!m) return { title: 'Hoja para la mesa', back: '#/partidos', el: h('div', { class: 'page' }, note('No encontré ese partido.')) };
  const canEdit = ctx.role === 'coach' || ctx.role === 'assistant';
  const n = m.best_of || 3, lus = m.lineups || [];
  const used = lus.flatMap((lu) => (lu ? [...lu.slots, lu.libero] : [])).filter(Boolean);
  const noNum = [...new Set(used)].map(playerById).filter((p) => p && p.jersey == null);
  const shareAll = () => shareText(lus.map((lu, i) => (lu ? lineupText(m, i, lu) : null)).filter(Boolean).join('\n\n') || 'Todavía no hay alineaciones.');
  const el = h('div', { class: 'page lineup-print' },
    h('div', { class: 'note no-print' }, 'Una hoja por set con las posiciones I a VI (en la cancha, como la ve tu banca) y el orden de saque. Prepara los sets que faltan, imprímela o compártela, y entrégale cada hoja al anotador antes del set.'),
    noNum.length ? h('div', { class: 'note warn no-print' }, `Sin número de playera: ${noNum.map((p) => p.name).join(', ')}. El anotador necesita los números; agrégalos en la ficha de cada jugador.`) : null,
    Array.from({ length: n }, (_, i) => slip(m, i, lus[i], canEdit)),
    h('div', { class: 'cluster no-print' }, h('button', { class: 'btn primary', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir o guardar PDF'),
      h('button', { class: 'btn', type: 'button', onclick: shareAll }, ic('share-2', 18), 'Compartir todo')));
  return { title: 'Hoja para la mesa', sub: `Contra ${m.rival}`, back: `#/partido/${m.id}`, actions: [{ icon: 'printer', label: 'Imprimir o guardar PDF', onClick: () => window.print() }], el };
}
