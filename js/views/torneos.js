// Torneos: agrupan partidos, con sede, fechas, rama, convocados (y su confirmación), tabla de posiciones y resultado final.
import { h, ic, toast, openSheet, confirmSheet, fmtDate, todayStr, plural } from '../util.js';
import { state, add, patch, remove, group, players, playerById, torneosReady, labReady, isStaff, equiposReady, multiTeam, teams, teamOf, teamsOf, inTeam, teamName } from '../store.js';
import { result, KINDS } from '../match-calc.js';
import { sectionTitle, note, empty, field, options, jersey } from './ui.js';
import { noticeSheet, waLink } from './avisos.js';

export const RAMAS = { F: 'Femenil', M: 'Varonil', X: 'Mixto' };
const RSVP = { voy: ['Voy', 'ok'], duda: ['En duda', 'warn'], no: ['No voy', 'bad'] };
export const torneoById = (id) => state.data.tournaments.find((t) => t.id === id) || null;
export const tournamentsSorted = () => state.data.tournaments.slice().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
export const matchesOf = (t) => state.data.matches.filter((m) => m.tournament_id === t.id).sort((a, b) => `${a.match_date}${a.created_at}`.localeCompare(`${b.match_date}${b.created_at}`));
const endOf = (t) => t.end_date || t.start_date;
export function phase(t) {
  const today = todayStr();
  if (t.place || endOf(t) < today) return 'fin';
  return t.start_date > today ? 'prox' : 'curso';
}
const PHASE = { prox: ['Próximo', 'info'], curso: ['En curso', 'warn'], fin: ['Terminado', ''] };
export const missingSql6Note = () => note('Para usar Torneos y la prueba de 10 m, corre en Supabase el sql/instalar.sql de la versión 3.3 (SQL Editor → pega todo → Run). No borra nada.', 'bad');
const placeText = (n) => (n === 1 ? 'Campeones' : n ? `${n}° lugar` : '');
const dates = (t) => (t.end_date && t.end_date !== t.start_date
  ? `${fmtDate(t.start_date, { day: 'numeric', month: 'short' })} al ${fmtDate(t.end_date, { day: 'numeric', month: 'short' })}`
  : fmtDate(t.start_date, { weekday: 'short', day: 'numeric', month: 'short' }));
const branchOk = (p, b) => b === 'X' || !p.branch || p.branch === b;

// ---------- equipos propios y cuadro de eliminación directa (v3.5) ----------
const key = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// ¿Este nombre es uno de tus equipos? Devuelve su id ('' si solo tienes uno) o null.
export function ourTeamId(name) {
  const k = key(name); if (!k) return null;
  if (multiTeam()) return teams().find((t) => key(t.name) === k)?.id ?? null;
  const g = key(teams()[0]?.name || group()?.name);
  return g && (k === g || (k.startsWith(g) && k.length <= g.length + 1)) ? '' : null;
}
export const isElim = (t) => t.format === 'eliminacion';
const gById = (B, id) => B.find((g) => g.id === id);
// Ganador de un juego: el que marcaste; si no, el del partido capturado de tu equipo; los pases directos avanzan solos.
export function winnerOf(B, g) {
  if (!g) return null;
  if (g.bye) return 'a';
  if (g.winner === 'a' || g.winner === 'b') return g.winner;
  const m = g.match_id && state.data.matches.find((x) => x.id === g.match_id);
  if (m && m.status === 'terminado') {
    const side = ourTeamId(slotTeam(B, g.a)) !== null ? 'a' : ourTeamId(slotTeam(B, g.b)) !== null ? 'b' : null;
    if (side) return result(m).win ? side : side === 'a' ? 'b' : 'a';
  }
  return null;
}
// Nombre del equipo en un lugar del cuadro: texto, o «W:P1» = ganador del juego P1.
export function slotTeam(B, slot, seen = new Set()) {
  if (!slot) return null;
  if (!String(slot).startsWith('W:')) return slot;
  const id = slot.slice(2); if (seen.has(id)) return null; seen.add(id);
  const g = gById(B, id), w = winnerOf(B, g);
  return w ? slotTeam(B, g[w], seen) : null;
}
export const slotLabel = (B, slot) => slotTeam(B, slot) || (String(slot || '').startsWith('W:') ? `Ganador ${slot.slice(2)}` : 'Por definir');
// Arma el cuadro a partir de los partidos de la primera ronda y los pases directos. Los ganadores se emparejan en orden.
export function makeBracket(games, byes = [], keep = []) {
  const B = [];
  const old = (a, b) => keep.find((g) => g.round === 1 && !g.bye && g.a === a && g.b === b);
  games.forEach((g, i) => { const o = old(g.a, g.b); B.push({ id: `P${i + 1}`, round: 1, time: g.time || '', a: g.a, b: g.b, winner: o?.winner || null, score: o?.score || '', match_id: o?.match_id || g.match_id || null }); });
  byes.forEach((tm, i) => B.push({ id: `D${i + 1}`, round: 1, time: '', a: tm, b: null, bye: true, winner: 'a' }));
  let prev = B.map((g) => g.id), round = 2, d = byes.length;
  const rounds = [];
  while (prev.length > 1) {
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      if (i + 1 >= prev.length) { d += 1; const id = `D${d}`; B.push({ id, round, time: '', a: `W:${prev[i]}`, b: null, bye: true, winner: 'a' }); next.push(id); continue; }
      const id = `R${round}-${next.length + 1}`; B.push({ id, round, time: '', a: `W:${prev[i]}`, b: `W:${prev[i + 1]}`, winner: null, score: '', match_id: null }); next.push(id);
    }
    rounds.push(next); prev = next; round += 1;
  }
  // Nombres como en los carteles: Final (F), Semifinal 1 y 2 (S1, S2), Cuartos (C1...).
  const rename = {}, total = round - 1;
  for (let r = total; r >= 2; r--) {
    const real = B.filter((g) => g.round === r && !g.bye), fromEnd = total - r;
    real.forEach((g, i) => { rename[g.id] = fromEnd === 0 ? 'F' : fromEnd === 1 ? `S${i + 1}` : fromEnd === 2 ? `C${i + 1}` : g.id; });
  }
  const fix = (s) => (s && s.startsWith('W:') && rename[s.slice(2)] ? `W:${rename[s.slice(2)]}` : s);
  return B.map((g) => ({ ...g, id: rename[g.id] || g.id, a: fix(g.a), b: fix(g.b) }));
}
export function roundName(B, r) {
  const max = Math.max(...B.map((g) => g.round)), real = B.filter((g) => g.round === r && !g.bye).length, byes = B.some((g) => g.round === r && g.bye);
  if (r === max) return 'Final';
  if (r === max - 1) return 'Semifinales';
  if (r === max - 2 && real === 4 && !byes) return 'Cuartos de final';
  return r === 1 ? 'Primera ronda' : `Ronda ${r}`;
}
const gameLabel = (g) => (g.id === 'F' ? 'Gran final' : /^S\d/.test(g.id) ? `Semifinal ${g.id.slice(1)}` : /^C\d/.test(g.id) ? `Cuartos ${g.id.slice(1)}` : /^P\d/.test(g.id) ? `Partido ${g.id.slice(1)}` : g.id);
export const champion = (B) => { const f = B.find((g) => !B.some((x) => x.a === `W:${g.id}` || x.b === `W:${g.id}`) && !g.bye) || null; return f ? slotTeam(B, `W:${f.id}`) : null; };

// ---------- convocatoria ----------
export function tRsvpCounts(t) {
  const roster = new Set(t.roster || []);
  const list = state.data.tRsvps.filter((r) => r.tournament_id === t.id && roster.has(r.player_id));
  const c = { voy: 0, duda: 0, no: 0 }; list.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
  return { ...c, list, missing: [...roster].filter((id) => !list.some((r) => r.player_id === id)) };
}
export function tRsvpControl(t, me, readonly) {
  const mine = state.data.tRsvps.find((r) => r.tournament_id === t.id && r.player_id === me.id);
  const set = (st) => {
    if (readonly) return;
    if (mine) { if (mine.status !== st) patch('tRsvps', mine.id, { status: st, updated_at: new Date().toISOString() }); }
    else add('tRsvps', { tournament_id: t.id, player_id: me.id, status: st });
    toast(st === 'voy' ? '¡Te esperamos en el torneo!' : st === 'no' ? 'Gracias por avisar' : 'Avísale a tu entrenador cuando sepas');
  };
  return h('div', { class: 'seg rsvp', role: 'group', 'aria-label': '¿Vas al torneo?' }, Object.entries(RSVP).map(([k, [txt]]) =>
    h('button', { type: 'button', 'aria-pressed': mine?.status === k ? 'true' : 'false', disabled: readonly ? true : null, onclick: () => set(k) }, txt)));
}

// ---------- hojas ----------
export function tournamentSheet(t = null, onSaved) {
  const name = h('input', { type: 'text', maxlength: 80, value: t?.name || '', placeholder: 'Por ejemplo: Copa Interprepas' });
  const venue = h('input', { type: 'text', maxlength: 120, value: t?.venue || '', placeholder: 'Opcional' });
  const start = h('input', { type: 'date', value: t?.start_date || todayStr() });
  const end = h('input', { type: 'date', value: t?.end_date || '' });
  const branch = h('select', {}, options(Object.entries(RAMAS), t?.branch || 'X'));
  const place = h('select', {}, options([['', 'Todavía no'], ...Array.from({ length: 16 }, (_, i) => [String(i + 1), i === 0 ? '1° (campeones)' : `${i + 1}°`])], t?.place ? String(t.place) : ''));
  const res = h('input', { type: 'text', maxlength: 120, value: t?.result || '', placeholder: 'Opcional. Por ejemplo: perdimos la final 2-1' });
  const text = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Opcional. Tus jugadores ven esta nota.' }, t?.note || '');
  const format = equiposReady() ? h('select', {}, options([['tabla', 'Tabla de posiciones (grupos o liga)'], ['eliminacion', 'Eliminación directa (cuadro)']], t?.format || 'tabla')) : null;
  const mySel = new Set(t?.teams?.length ? t.teams : multiTeam() ? [teams()[0].id] : []);
  const myTeams = multiTeam() ? h('div', { class: 'cluster' }, teams().map((tm) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: mySel.has(tm.id) ? true : null, onchange: (e) => { if (e.target.checked) mySel.add(tm.id); else mySel.delete(tm.id); } }), h('span', {}, tm.name)))) : null;
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  openSheet({
    title: t ? 'Editar torneo' : 'Nuevo torneo',
    body: h('div', { class: 'stack' }, field('Nombre', name), field('Sede', venue), h('div', { class: 'grid' }, field('Empieza', start), field('Termina', end, 'Déjalo vacío si es de un solo día.')),
      field('Rama', branch, 'Sirve para separar los torneos y para sugerir a quién convocar.'),
      format ? field('Formato', format, 'En eliminación directa armas el cuadro por rondas y el ganador de cada partido avanza solo.') : null,
      myTeams ? h('div', { class: 'field' }, h('span', { class: 'label' }, 'Tus equipos en este torneo'), myTeams) : null,
      t ? h('div', { class: 'grid' }, field('Lugar final', place), field('Resultado', res)) : null, field('Nota', text), err),
    actions: [{ label: 'Cancelar' },
      t ? { label: 'Borrar', kind: 'danger', onClick: async () => {
        if (!(await confirmSheet({ title: `¿Borrar ${t.name}?`, text: 'Sus partidos no se borran: se quedan sin torneo. La convocatoria del torneo sí se borra.', ok: 'Borrar', danger: true }))) return false;
        remove('tournaments', t.id); toast('Torneo borrado'); location.hash = '#/partidos'; return true; } } : null,
      { label: t ? 'Guardar' : 'Crear torneo', kind: 'primary', onClick: () => {
        if (!name.value.trim()) { err.textContent = 'Escribe el nombre del torneo.'; err.hidden = false; return false; }
        if (end.value && end.value < start.value) { err.textContent = 'La fecha final no puede ser antes de la de inicio.'; err.hidden = false; return false; }
        const row = { name: name.value.trim(), venue: venue.value.trim(), start_date: start.value || todayStr(), end_date: end.value || null, branch: branch.value, note: text.value.trim() };
        if (format) row.format = format.value;
        if (myTeams) row.teams = [...mySel];
        if (t) { patch('tournaments', t.id, { ...row, place: place.value ? Number(place.value) : null, result: res.value.trim() }); toast('Torneo guardado'); onSaved?.(t); return true; }
        const nt = add('tournaments', { ...row, group_id: group()?.id });
        toast('Torneo creado'); onSaved?.(nt); return true;
      } }].filter(Boolean),
  });
}

function rosterSheet(t) {
  let all = false, tf = '';
  const sel = new Set(t.roster || []);
  const tseg = multiTeam() ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Equipo' }) : null;
  const drawSeg = () => tseg?.replaceChildren(...[['', 'Todos'], ...teams().map((x) => [x.id, x.name])].map(([k, txt]) => h('button', { type: 'button', 'aria-pressed': tf === k ? 'true' : 'false', onclick: () => { tf = k; drawSeg(); draw(); } }, txt)));
  const list = h('div', { class: 'rows roster-pick' }), count = h('span', { class: 'chip ball' });
  const draw = () => {
    const ps = players().filter((p) => (all || branchOk(p, t.branch) || sel.has(p.id)) && inTeam(p, tf));
    list.replaceChildren(...ps.map((p) => h('label', { class: 'row check-row' }, jersey(p, 'sm'),
      h('span', { class: 'row-main' }, h('strong', {}, p.name), h('span', { class: 'row-sub' }, [multiTeam() ? teamsOf(p).map(teamName).join(', ') : null, p.branch ? RAMAS[p.branch] : null, `nivel ${p.level}`].filter(Boolean).join(' · '))),
      h('input', { type: 'checkbox', checked: sel.has(p.id) ? true : null, 'aria-label': `Convocar a ${p.name}`, onchange: (e) => { if (e.target.checked) sel.add(p.id); else sel.delete(p.id); count.textContent = `${sel.size} convocados`; } }))));
    count.textContent = `${sel.size} convocados`;
  };
  draw(); drawSeg();
  const toggle = t.branch !== 'X' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { all = e.target.checked; draw(); } }), h('span', {}, `Mostrar también a quienes no son de rama ${RAMAS[t.branch].toLowerCase()}`)) : null;
  openSheet({
    title: `Convocados: ${t.name}`,
    body: h('div', { class: 'stack' }, h('div', { class: 'cluster' }, count,
      h('button', { class: 'btn sm', type: 'button', onclick: () => { players().filter((p) => (all || branchOk(p, t.branch)) && inTeam(p, tf)).forEach((p) => sel.add(p.id)); draw(); } }, 'Todos'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { sel.clear(); draw(); } }, 'Ninguno')), tseg, toggle, list,
      note('Los convocados confirman desde su celular si van. Los demás ven el torneo como «no convocado».')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar convocados', kind: 'primary', onClick: () => {
      const ids = [...sel]; patch('tournaments', t.id, { roster: ids }); toast(`${plural(ids.length, 'jugador convocado', 'jugadores convocados')}`); return true; } }],
  });
}

// Fila de nuestro equipo con los partidos del torneo que ya terminaron.
export function ourRow(t, teamId = null) {
  const done = matchesOf(t).filter((m) => m.status === 'terminado' && (teamId === null || !multiTeam() || teamOf(m) === teamId));
  const r = done.map(result);
  return { pj: done.length, pg: r.filter((x) => x.win).length, pp: r.filter((x) => !x.win).length, sf: r.reduce((n, x) => n + x.us, 0), sc: r.reduce((n, x) => n + x.them, 0) };
}
const COLS = [['pj', 'PJ', 'Partidos jugados'], ['pg', 'PG', 'Ganados'], ['pp', 'PP', 'Perdidos'], ['sf', 'SF', 'Sets a favor'], ['sc', 'SC', 'Sets en contra'], ['pts', 'Pts', 'Puntos']];
export const sortStandings = (rows) => rows.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0) || ((b.sf || 0) - (b.sc || 0)) - ((a.sf || 0) - (a.sc || 0)) || (b.sf || 0) - (a.sf || 0));

function standingsSheet(t) {
  const mine = multiTeam() ? teams().filter((x) => (t.teams || []).includes(x.id)) : [];
  const rows = (t.standings?.length ? t.standings : mine.length ? mine.map((x) => ({ team: x.name, us: true, my: x.id })) : [{ team: teams()[0]?.name || group()?.name || 'Nosotros', us: true }]).map((r) => ({ ...r }));
  const box = h('div', { class: 'stack' });
  const num = (r, k, label) => h('label', { class: 'st-num' }, h('span', {}, label), h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 99, value: r[k] ?? '', oninput: (e) => { r[k] = e.target.value === '' ? null : Math.max(0, Math.min(99, Number(e.target.value) || 0)); } }));
  const draw = () => box.replaceChildren(...rows.map((r, i) => h('div', { class: `panel st-edit ${r.us ? 'us' : ''}` },
    h('div', { class: 'split' }, h('input', { type: 'text', maxlength: 60, value: r.team || '', placeholder: 'Equipo', 'aria-label': 'Equipo', oninput: (e) => { r.team = e.target.value; } }),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar equipo', onclick: () => { rows.splice(i, 1); draw(); } }, ic('trash-2', 16))),
    h('div', { class: 'st-grid' }, COLS.map(([k, label]) => num(r, k, label))),
    h('div', { class: 'cluster' }, multiTeam()
      ? h('label', { class: 'st-mine' }, h('span', {}, '¿Es tuyo?'), h('select', { onchange: (e) => { r.us = !!e.target.value; r.my = e.target.value || null; if (r.us && !r.team) r.team = teamName(r.my); draw(); } }, options([['', 'No'], ...teams().map((x) => [x.id, x.name])], r.us ? (r.my || teams()[0].id) : '')))
      : h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: r.us ? true : null, onchange: (e) => { rows.forEach((x) => { x.us = false; }); r.us = e.target.checked; draw(); } }), h('span', {}, 'Somos nosotros')),
      r.us ? h('button', { class: 'btn sm', type: 'button', onclick: () => { Object.assign(r, ourRow(t, multiTeam() ? (r.my || teams()[0].id) : null)); draw(); toast('Llené PJ, PG, PP y sets con tus partidos del torneo'); } }, ic('refresh-cw', 16), 'Usar mis partidos') : null))));
  draw();
  openSheet({
    title: 'Tabla de posiciones',
    body: h('div', { class: 'stack' }, note('Escribe los equipos de tu grupo o del torneo. Tu fila se puede llenar con tus partidos; los puntos los pones según las reglas del torneo.'), box,
      h('button', { class: 'btn', type: 'button', onclick: () => { rows.push({ team: '' }); draw(); } }, ic('plus', 18), 'Agregar equipo')),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar tabla', kind: 'primary', onClick: () => {
      const clean = rows.filter((r) => String(r.team || '').trim()).map((r) => ({ team: r.team.trim().slice(0, 60), us: !!r.us, ...(r.us && r.my ? { my: r.my } : {}), ...Object.fromEntries(COLS.map(([k]) => [k, r[k] == null ? null : Number(r[k])])) }));
      patch('tournaments', t.id, { standings: clean }); toast('Tabla guardada'); return true; } }],
  });
}

// ---------- cuadro de eliminación: editar la primera ronda ----------
export function bracketSheet(t) {
  const B = t.bracket || [];
  const games = B.filter((g) => g.round === 1 && !g.bye).map((g) => ({ a: g.a || '', b: g.b || '', time: g.time || '', match_id: g.match_id || null }));
  const byes = B.filter((g) => g.round === 1 && g.bye).map((g) => g.a || '');
  if (!games.length) games.push({ a: '', b: '', time: '' }, { a: '', b: '', time: '' });
  const box = h('div', { class: 'stack' });
  const inp = (o, k, ph, extra = {}) => h('input', { type: k === 'time' ? 'time' : 'text', maxlength: 40, value: o[k] || '', placeholder: ph, 'aria-label': ph, oninput: (e) => { o[k] = e.target.value; }, ...extra });
  const draw = () => box.replaceChildren(
    ...games.map((g, i) => h('div', { class: 'panel br-edit' }, h('div', { class: 'split' }, h('strong', {}, `Partido ${i + 1}`), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar partido', onclick: () => { games.splice(i, 1); draw(); } }, ic('trash-2', 16))),
      h('div', { class: 'br-row' }, inp(g, 'a', 'Equipo'), h('span', { class: 'vs' }, 'vs'), inp(g, 'b', 'Equipo')), h('label', { class: 'br-time' }, h('span', {}, 'Hora'), inp(g, 'time', 'Hora')))),
    ...byes.map((tm, i) => h('div', { class: 'panel br-edit' }, h('div', { class: 'split' }, h('strong', {}, 'Pase directo'), h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Quitar pase directo', onclick: () => { byes.splice(i, 1); draw(); } }, ic('trash-2', 16))),
      h('input', { type: 'text', maxlength: 40, value: tm, placeholder: 'Equipo que pasa directo', 'aria-label': 'Equipo que pasa directo', oninput: (e) => { byes[i] = e.target.value; } }))));
  draw();
  openSheet({
    title: 'Cuadro: primera ronda',
    body: h('div', { class: 'stack' }, note('Escribe los partidos de la primera ronda en orden y los equipos que pasan directo. Remate arma las semifinales y la final emparejando a los ganadores en ese orden. Escribe tus equipos igual que en Ajustes (por ejemplo «CETAC A»).'), box,
      h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { games.push({ a: '', b: '', time: '' }); draw(); } }, ic('plus', 16), 'Partido'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => { byes.push(''); draw(); } }, ic('plus', 16), 'Pase directo'))),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar cuadro', kind: 'primary', onClick: () => {
      const gs = games.map((g) => ({ ...g, a: g.a.trim(), b: g.b.trim() })).filter((g) => g.a && g.b), bs = byes.map((x) => x.trim()).filter(Boolean);
      if (gs.length + bs.length < 2) { toast('Escribe al menos un partido completo'); return false; }
      patch('tournaments', t.id, { bracket: makeBracket(gs, bs, B), format: 'eliminacion' }); toast('Cuadro guardado'); return true;
    } }],
  });
}
// Marca o quita el ganador de un juego. Los juegos siguientes que dependían de él se limpian si cambia.
function setWinner(t, g, side) {
  const B = (t.bracket || []).map((x) => ({ ...x }));
  const me = B.find((x) => x.id === g.id); me.winner = me.winner === side ? null : side;
  const clear = (id) => B.forEach((x) => { if (!x.bye && (x.a === `W:${id}` || x.b === `W:${id}`) && x.winner) { x.winner = null; clear(x.id); } });
  clear(g.id);
  patch('tournaments', t.id, { bracket: B });
}
// Partido de tu equipo dentro del cuadro: lo crea (o lo abre) para capturarlo como siempre.
function captureGame(t, g) {
  const B = t.bracket || [], A = slotTeam(B, g.a), Bt = slotTeam(B, g.b);
  const ia = ourTeamId(A), ib = ourTeamId(Bt);
  if (g.match_id && state.data.matches.some((m) => m.id === g.match_id)) { location.hash = `#/partido/${g.match_id}`; return; }
  const mineSide = ia !== null ? 'a' : 'b', rival = mineSide === 'a' ? Bt : A, team = mineSide === 'a' ? ia : ib;
  const date = t.start_date > todayStr() ? t.start_date : todayStr();
  const row = { group_id: group()?.id, rival, match_date: date, venue: (t.venue || '').slice(0, 80), kind: 'torneo', best_of: 3, note: g.time ? `Hora: ${g.time}` : '', status: date > todayStr() ? 'planeado' : 'en_juego', tournament_id: t.id };
  if (equiposReady() && multiTeam()) row.team = team || teams()[0].id;
  const m = add('matches', row);
  patch('tournaments', t.id, { bracket: B.map((x) => (x.id === g.id ? { ...x, match_id: m.id } : x)) });
  location.hash = `#/partido/${m.id}`;
}
export function bracketSection(t, ctx, canEdit, canCapture) {
  const B = t.bracket || [];
  if (!B.length) return h('section', { class: 'stack' }, sectionTitle('Cuadro', canEdit ? h('button', { class: 'btn sm primary', type: 'button', onclick: () => bracketSheet(t) }, ic('pencil', 16), 'Armar cuadro') : null),
    h('p', { class: 'row-sub', style: { margin: 0 } }, canEdit ? 'Escribe los partidos de la primera ronda y los pases directos; Remate arma semifinales y final. También lo puedes leer de una imagen desde Partidos.' : 'El entrenador todavía no arma el cuadro.'));
  const max = Math.max(...B.map((g) => g.round)), champ = champion(B);
  const teamRow = (g, side) => {
    const slot = g[side], name = slotTeam(B, slot), w = winnerOf(B, g), mine = name && ourTeamId(name) !== null;
    const can = canEdit && !g.bye && slotTeam(B, g.a) && slotTeam(B, g.b);
    return h(can ? 'button' : 'div', { type: can ? 'button' : null, class: `br-team ${w === side ? 'win' : w ? 'lose' : ''} ${mine ? 'mine' : ''}`, 'aria-pressed': can ? (w === side ? 'true' : 'false') : null,
      title: can ? 'Toca para marcar al ganador' : null, onclick: can ? () => setWinner(t, g, side) : null },
      h('span', { class: 'br-name' }, slotLabel(B, slot)), mine ? h('span', { class: 'chip ball' }, 'Tuyo') : null, w === side ? ic('check', 18) : null);
  };
  const gameCard = (g) => {
    if (g.bye) return h('div', { class: 'br-game bye' }, h('div', { class: 'br-head' }, h('strong', {}, 'Pase directo')), h('div', { class: 'br-team win' }, h('span', { class: 'br-name' }, slotLabel(B, g.a))));
    const A = slotTeam(B, g.a), Bt = slotTeam(B, g.b), ours = (A && ourTeamId(A) !== null) || (Bt && ourTeamId(Bt) !== null);
    return h('div', { class: 'br-game' },
      h('div', { class: 'br-head' }, h('strong', {}, gameLabel(g)), g.time ? h('span', { class: 'row-sub' }, g.time) : null,
        ours && A && Bt && canCapture ? h('button', { class: 'btn sm', type: 'button', onclick: () => captureGame(t, g) }, ic('volleyball', 16), g.match_id ? 'Ver partido' : 'Capturar') : null),
      teamRow(g, 'a'), h('div', { class: 'br-vs' }, 'vs'), teamRow(g, 'b'));
  };
  return h('section', { class: 'stack' },
    sectionTitle('Cuadro', canEdit ? h('button', { class: 'btn sm', type: 'button', onclick: () => bracketSheet(t) }, ic('pencil', 16), 'Editar cuadro') : null),
    champ ? h('div', { class: `br-champ ${ourTeamId(champ) !== null ? 'mine' : ''}` }, ic('trophy', 22), h('span', {}, h('strong', {}, 'Campeón: '), champ)) : null,
    canEdit ? h('p', { class: 'row-sub', style: { margin: 0 } }, 'Toca al equipo que ganó cada partido y avanza solo a la siguiente ronda. Los partidos de tus equipos que captures marcan al ganador solos.') : null,
    h('div', { class: 'bracket' }, Array.from({ length: max }, (_, i) => i + 1).map((r) => h('div', { class: 'br-round' },
      h('h3', {}, roundName(B, r)), B.filter((g) => g.round === r).map(gameCard)))));
}

// ---------- piezas de pantalla ----------
export function standingsTable(t) {
  const rows = sortStandings(t.standings || []);
  if (!rows.length) return null;
  return h('div', { class: 'tablewrap' }, h('table', { class: 'stbl st-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, 'Equipo'), COLS.map(([, label, title]) => h('th', { scope: 'col', title, class: 'num' }, label)))),
    h('tbody', {}, rows.map((r, i) => h('tr', { class: r.us ? 'us' : null }, h('td', {}, String(i + 1)), h('th', { scope: 'row' }, r.team), COLS.map(([k]) => h('td', { class: 'num' }, r[k] == null ? '—' : String(r[k]))))))));
}

function card(t, ctx) {
  const ph = phase(t), c = tRsvpCounts(t), coachish = ctx.role === 'coach' || ctx.role === 'assistant' || isStaff();
  const me = ctx.me, conv = me && (t.roster || []).includes(me.id), mine = me && state.data.tRsvps.find((r) => r.tournament_id === t.id && r.player_id === me.id);
  const n = matchesOf(t).length;
  const sub = [dates(t), t.venue, RAMAS[t.branch]].filter(Boolean).join(' · ');
  let end;
  if (ph === 'fin') end = t.place ? h('span', { class: `chip ${t.place <= 3 ? 'ball' : ''}` }, ic('medal', 14), ` ${placeText(t.place)}`) : h('span', { class: 'chip' }, 'Terminado');
  else if (coachish) end = (t.roster || []).length ? h('span', { class: 'chip' }, `Van ${c.voy} de ${(t.roster || []).length}`) : h('span', { class: `chip ${PHASE[ph][1]}` }, PHASE[ph][0]);
  else end = conv ? h('span', { class: `chip ${mine ? RSVP[mine.status][1] : 'info'}` }, mine ? RSVP[mine.status][0] : 'Convocado: contesta') : h('span', { class: 'chip' }, 'No convocado');
  return h('a', { class: 'row', href: `#/torneo/${t.id}` }, h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('trophy', 20)),
    h('span', { class: 'row-main' }, h('strong', {}, t.name), h('span', { class: 'row-sub' }, sub), n ? h('span', { class: 'row-sub' }, plural(n, 'partido', 'partidos')) : null),
    h('span', { class: 'row-end' }, end, ic('chevron-right', 18)));
}

// Sección de torneos para la pantalla Partidos, con filtro por rama.
export function tournamentsSection(ctx) {
  const ui = ctx.ui; ui.rama ??= 'todas';
  const coach = ctx.role === 'coach';
  if (!torneosReady()) return coach ? h('section', { class: 'stack' }, sectionTitle('Torneos'), missingSql6Note()) : null;
  const all = tournamentsSorted();
  if (!all.length && !coach) return null;
  const used = ['F', 'M', 'X'].filter((b) => all.some((t) => t.branch === b));
  const list = all.filter((t) => ui.rama === 'todas' || t.branch === ui.rama);
  const seg = used.length > 1 ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Rama' }, [['todas', 'Todas'], ...used.map((b) => [b, RAMAS[b]])].map(([k, txt]) =>
    h('button', { type: 'button', 'aria-pressed': ui.rama === k ? 'true' : 'false', onclick: () => { ui.rama = k; ctx.rerender(); } }, txt))) : null;
  return h('section', { class: 'stack' },
    sectionTitle('Torneos', coach ? h('div', { class: 'cluster' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => import('./importar.js').then((m) => m.importSheet()) }, ic('upload', 16), 'Leer de una imagen'),
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => tournamentSheet(null, (t) => { location.hash = `#/torneo/${t.id}`; }) }, ic('plus', 16), 'Nuevo torneo')) : null),
    seg, list.length ? h('div', { class: 'rows' }, list.map((t) => card(t, ctx)))
      : coach ? h('p', { class: 'row-sub', style: { margin: 0 } }, all.length ? 'No hay torneos de esa rama.' : 'Agrupa tus partidos por torneo: sede, fechas, rama, convocados, tabla y resultado final.') : null);
}

// ---------- pantalla del torneo ----------
export default function torneo(ctx) {
  const t = torneoById(ctx.args[0]);
  if (!t) return { title: 'Torneo', back: '#/partidos', el: h('div', { class: 'page' }, empty('No encontré ese torneo', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/partidos' }, 'Ver partidos'))) };
  const coach = ctx.role === 'coach', staff = ctx.role === 'assistant' || (ctx.role === 'player' && isStaff() && !ctx.readonly);
  const me = ctx.me, ph = phase(t), roster = t.roster || [], c = tRsvpCounts(t);
  const ms = matchesOf(t);
  const canCapture = (coach || staff) && labReady();
  const newMatch = () => import('./partidos.js').then(({ matchSheet }) => matchSheet(null, (m) => { location.hash = `#/partido/${m.id}`; }, { tournament: t }));
  const nameOf = (id) => playerById(id)?.name || 'Jugador';
  const by = (st) => c.list.filter((r) => r.status === st).map((r) => nameOf(r.player_id)).sort((a, b) => a.localeCompare(b, 'es'));
  const notRoster = (coach || staff) ? players().filter((p) => !roster.includes(p.id) && branchOk(p, t.branch)) : [];
  const our = ourRow(t);

  const el = h('div', { class: 'page torneo' },
    !torneosReady() ? missingSql6Note() : null,
    h('section', { class: 'band next stack' }, h('span', { class: 'when' }, `${PHASE[ph][0]} · ${RAMAS[t.branch]}`), h('h2', {}, t.name),
      h('p', { style: { margin: 0 } }, [dates(t), t.venue].filter(Boolean).join(' · ')),
      t.place || t.result ? h('p', { class: 'tr-result' }, ic('medal', 20), ` ${[placeText(t.place), t.result].filter(Boolean).join('. ')}`) : null,
      t.note ? h('p', { style: { margin: 0 } }, t.note) : null),
    // Jugador: su convocatoria
    !coach && !staff && me ? (roster.includes(me.id)
      ? h('section', { class: 'panel stack' }, h('strong', {}, ph === 'fin' ? 'Estuviste convocado a este torneo.' : 'Estás convocado. ¿Vas al torneo?'), ph === 'fin' ? null : tRsvpControl(t, me, ctx.readonly))
      : note('No estás convocado a este torneo. Si crees que es un error, platícalo con tu entrenador.')) : null,
    // Entrenador y ayudantes: convocados y confirmación
    coach || staff ? h('section', { class: 'stack' }, sectionTitle('Convocatoria', coach && torneosReady() ? h('button', { class: 'btn sm', type: 'button', onclick: () => rosterSheet(t) }, ic('users', 16), roster.length ? 'Editar convocados' : 'Elegir convocados') : null),
      roster.length ? [
        h('div', { class: 'cluster' }, Object.entries(RSVP).map(([k, [txt, tone]]) => h('span', { class: `chip ${tone}` }, `${txt}: ${c[k]}`)), h('span', { class: 'chip' }, `Sin respuesta: ${c.missing.length}`)),
        h('div', { class: 'rows' },
          Object.entries(RSVP).map(([k, [txt]]) => (by(k).length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, txt), h('span', { class: 'row-sub' }, by(k).join(', ')))) : null)),
          c.missing.length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, 'Sin respuesta'), h('span', { class: 'row-sub' }, c.missing.map(nameOf).sort((a, b) => a.localeCompare(b, 'es')).join(', ')))) : null,
          notRoster.length ? h('div', { class: 'row' }, h('span', { class: 'row-main' }, h('strong', {}, 'No convocados'), h('span', { class: 'row-sub' }, notRoster.map((p) => p.name).join(', ')))) : null),
        coach && ph !== 'fin' ? h('div', { class: 'cluster' },
          h('button', { class: 'btn sm', type: 'button', onclick: () => noticeSheet({ title: `Convocatoria: ${t.name}`, body: `${dates(t)}${t.venue ? `, ${t.venue}` : ''}. Si estás convocado, contesta en Remate si vas.`, url: `#/torneo/${t.id}` }) }, ic('megaphone', 16), 'Avisar a los convocados'),
          h('a', { class: 'btn sm', href: waLink(`Convocatoria: ${t.name}`, `${dates(t)}${t.venue ? `, ${t.venue}` : ''}. Convocados: ${roster.map(nameOf).join(', ')}. Contesten en Remate si van.${c.missing.length ? ` Faltan ${c.missing.length} por contestar.` : ''}`, `#/torneo/${t.id}`), target: '_blank', rel: 'noopener' }, ic('message-circle', 16), 'Recordar por WhatsApp')) : null]
        : h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Todavía no eliges a quién convocar.' : 'El entrenador todavía no elige a los convocados.')) : null,
    // Partidos del torneo
    h('section', { class: 'stack' }, sectionTitle('Partidos', canCapture && torneosReady() ? h('button', { class: 'btn sm primary', type: 'button', onclick: newMatch }, ic('plus', 16), 'Partido del torneo') : null),
      ms.length ? h('div', { class: 'rows' }, ms.map((m) => { const r = result(m);
        return h('a', { class: 'row', href: `#/partido/${m.id}` }, h('span', { class: 'jersey off', 'aria-hidden': 'true' }, ic('volleyball', 20)),
          h('span', { class: 'row-main' }, h('strong', {}, multiTeam() ? `${teamName(teamOf(m))} vs ${m.rival}` : `Contra ${m.rival}`), h('span', { class: 'row-sub' }, [fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }), KINDS[m.kind], r.detail || null].filter(Boolean).join(' · '))),
          h('span', { class: 'row-end' }, m.status === 'terminado' ? h('span', { class: `chip ${r.win ? 'ok' : 'bad'}` }, `${r.win ? 'Ganado' : 'Perdido'} ${r.text}`) : m.status === 'en_juego' ? h('span', { class: 'chip warn' }, `En juego ${r.text}`) : h('span', { class: 'chip info' }, 'Próximo'), ic('chevron-right', 18)));
      })) : h('p', { class: 'row-sub', style: { margin: 0 } }, canCapture ? 'Agrega los partidos del torneo. También puedes asignar un partido que ya existe desde «Editar partido».' : 'Todavía no hay partidos de este torneo.'),
      our.pj ? h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${our.pg}-${our.pp}`), h('span', { class: 'l' }, 'Ganados y perdidos')),
        h('div', { class: 'kpi' }, h('span', { class: 'n' }, `${our.sf}-${our.sc}`), h('span', { class: 'l' }, 'Sets a favor y en contra'))) : null),
    // Cuadro (eliminación directa) o tabla
    isElim(t) ? bracketSection(t, ctx, coach && torneosReady(), canCapture) : null,
    isElim(t) && !(t.standings || []).length ? null : h('section', { class: 'stack' }, sectionTitle('Tabla de posiciones', coach && torneosReady() ? h('button', { class: 'btn sm', type: 'button', onclick: () => standingsSheet(t) }, ic('pencil', 16), (t.standings || []).length ? 'Editar tabla' : 'Escribir tabla') : null),
      standingsTable(t) || h('p', { class: 'row-sub', style: { margin: 0 } }, coach ? 'Escribe los equipos y sus resultados. Tu fila se puede llenar con tus partidos.' : 'Todavía no hay tabla.')),
    coach ? h('div', { class: 'cluster' }, h('button', { class: 'btn', type: 'button', disabled: torneosReady() ? null : true, onclick: () => tournamentSheet(t) }, ic('pencil', 18), ph === 'fin' || ph === 'curso' ? 'Editar y poner resultado final' : 'Editar torneo')) : null);
  return { title: 'Torneo', sub: t.name, back: '#/partidos', actions: coach && torneosReady() ? [{ icon: 'pencil', label: 'Editar torneo', onClick: () => tournamentSheet(t) }] : [], el };
}

// Torneos por venir en los que un jugador está convocado (para su pantalla de Partidos).
export const myUpcomingTournaments = (me) => (me ? tournamentsSorted().filter((t) => phase(t) !== 'fin' && (t.roster || []).includes(me.id)).reverse() : []);
// Para Hoy: torneos que empiezan en los próximos 14 días con convocados sin contestar.
export function tournamentsNeedingAnswers() {
  const today = todayStr(), lim = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  return state.data.tournaments.filter((t) => t.start_date >= today && t.start_date <= lim && (t.roster || []).length).map((t) => ({ t, c: tRsvpCounts(t) })).filter((x) => x.c.missing.length);
}
