// v3.39 «Partidos»: alineaciones guardadas (con nombre, en los ajustes del grupo; sin SQL), las 6 rotaciones de cada una
// para imprimir o compartir, rotaciones en la temporada (todos tus partidos juntos) y el plan de saque de un partido
// por jugar (del scouting del rival y de cuántos saques mete cada quien).
import { h, ic, toast, openSheet, confirmSheet, uid, fmtDate, todayStr, diffDays, plural, shareText, rivalKey } from '../util.js';
import { state, patch, players, playerById, settings, saveSettings, multiTeam, teams, teamOf, teamName } from '../store.js';
import { replay, byRotation, rotLabel, rotate, countsFor, addCounts, metrics, zoneCounts, ZONE_ORDER } from '../match-calc.js';
import { note, empty, sectionTitle, field, options } from './ui.js';
import { getLog } from './partido-capture.js';
import { rotationToNext } from './plan-toque.js';
import { rivals } from './rivales.js';
import { gamePlan } from './scout-rapido.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const savedLineups = () => (Array.isArray(settings().lineups) ? settings().lineups : []).filter((l) => l && Array.isArray(l.slots) && l.slots.length === 6);
const saveAll = (list) => saveSettings({ lineups: list });
const lineupById = (id) => savedLineups().find((l) => l.id === id) || null;
// Las guardadas que sirven para un partido: las de su equipo o las que no tienen equipo.
export const lineupsFor = (m) => savedLineups().filter((l) => !multiTeam() || !l.team || l.team === teamOf(m));
const short = (id) => { const p = playerById(id); return p ? `${p.jersey != null ? `${p.jersey} ` : ''}${p.name.split(' ')[0]}` : '—'; };
const setters = () => new Set(players().filter((p) => p.position === 'colocador').map((p) => p.id));
const rosterSorted = () => players().slice().sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999) || a.name.localeCompare(b.name, 'es'));

// Guardar (nueva o reemplazar) una alineación.
export function storeLineup(row) {
  const list = savedLineups(), i = list.findIndex((l) => l.id === row.id);
  const next = i >= 0 ? list.map((l) => (l.id === row.id ? row : l)) : [...list, row];
  saveAll(next); return row;
}

// ---------- Hoja para crear o editar una alineación ----------
export function lineupFormSheet(lu = null, { team = '' } = {}) {
  const list = rosterSorted();
  const opts = (sel) => options([['', '—'], ...list.map((p) => [p.id, `${p.jersey != null ? `${p.jersey} · ` : ''}${p.name}`])], sel || '');
  const name = h('input', { type: 'text', maxlength: 40, value: lu?.name || '', placeholder: 'Por ejemplo: Titular, Mixto, Torneo' });
  const tm = multiTeam() ? h('select', {}, options([['', 'Cualquier equipo'], ...teams().map((t) => [t.id, t.name])], lu?.team ?? team)) : null;
  const zone = {}; for (let z = 1; z <= 6; z++) zone[z] = h('select', { 'aria-label': `Zona ${z}` }, opts(lu?.slots?.[z - 1]));
  const libero = h('select', { 'aria-label': 'Líbero' }, opts(lu?.libero));
  const err = h('div', { class: 'note bad', role: 'alert', hidden: true });
  const cell = (z) => h('label', { class: 'lu-cell' }, h('span', {}, `Zona ${z}${z === 1 ? ' (saca)' : ''}`), zone[z]);
  openSheet({
    title: lu ? 'Editar alineación' : 'Nueva alineación',
    body: h('div', { class: 'stack' },
      field('Nombre', name), tm ? field('Equipo', tm) : null,
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Como la ves desde tu banca: la red arriba. La de zona 1 es la que saca cuando ustedes sacan primero.'),
      h('div', { class: 'lu-grid' }, h('div', { class: 'lu-net' }, 'Red'), ZONE_ORDER.front.map(cell), ZONE_ORDER.back.map(cell)),
      field('Líbero (opcional)', libero), err),
    actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      const slots = [1, 2, 3, 4, 5, 6].map((z) => zone[z].value);
      const bad = (t) => { err.textContent = t; err.hidden = false; return false; };
      if (!name.value.trim()) return bad('Ponle un nombre a la alineación.');
      if (slots.some((x) => !x)) return bad('Elige a los 6 jugadores en cancha.');
      if (new Set(slots).size < 6) return bad('Un jugador está en dos zonas.');
      if (libero.value && slots.includes(libero.value)) return bad('El líbero no puede estar también en la cancha.');
      storeLineup({ id: lu?.id || uid(), name: name.value.trim(), team: tm ? tm.value : '', slots, libero: libero.value || null, updated: todayStr() });
      toast('Alineación guardada'); return true;
    } }],
  });
}

// ---------- Ponerla en los próximos partidos (set 1) ----------
const upcoming = (lu) => state.data.matches.filter((m) => m.status !== 'terminado' && m.match_date >= todayStr() && (!multiTeam() || !lu.team || teamOf(m) === lu.team))
  .sort((a, b) => a.match_date.localeCompare(b.match_date) || String(a.start_time || '').localeCompare(String(b.start_time || '')));
export function applySheet(lu) {
  const ms = upcoming(lu);
  if (!ms.length) { toast('No tienes partidos por jugar: créalos en Partidos'); return; }
  const boxes = ms.map((m) => { const has = !!m.lineups?.[0];
    return { m, input: h('input', { type: 'checkbox', checked: has ? null : true }), has }; });
  openSheet({
    title: `Usar «${lu.name}»`,
    body: h('div', { class: 'stack' },
      h('p', { style: { margin: 0 } }, 'Se pone como alineación del set 1 en los partidos que marques. Quién saca primero lo cambias en cada partido cuando sepas el sorteo.'),
      h('div', { class: 'stack' }, boxes.map(({ m, input, has }) => h('label', { class: 'check' }, input,
        h('span', {}, `${fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${multiTeam() ? `${teamName(teamOf(m))} vs ` : 'Contra '}${m.rival}${has ? ' (ya tiene alineación: se reemplaza)' : ''}`))))),
    actions: [{ label: 'Cancelar' }, { label: 'Poner alineación', kind: 'primary', onClick: () => {
      const pick = boxes.filter((b) => b.input.checked);
      if (!pick.length) { toast('Marca al menos un partido'); return false; }
      for (const { m } of pick) { const lus = [...(m.lineups || [])]; lus[0] = { slots: [...lu.slots], libero: lu.libero || null, serve: lus[0]?.serve || 'us' }; patch('matches', m.id, { lineups: lus }); }
      toast(`Alineación puesta en ${plural(pick.length, 'partido', 'partidos')}`); return true;
    } }],
  });
}

// ---------- Las 6 rotaciones ----------
export function rotationsOf(lu) {
  const out = []; let s = [...lu.slots];
  for (let k = 0; k < 6; k++) { out.push(s); s = rotate(s); }
  return out;
}
function miniCourt(slots, k) {
  const st = setters();
  const cell = (z) => { const id = slots[z - 1], p = playerById(id);
    return h('div', { class: `slip-cell ${z === 1 ? 'rot-serve' : ''}` }, h('span', { class: 'slip-pos' }, `Z${z}${st.has(id) ? ' · C' : ''}`),
      h('b', {}, p?.jersey != null ? String(p.jersey) : '—'), h('span', { class: 'slip-name' }, p?.name?.split(' ')[0] || 'Jugador')); };
  return h('section', { class: 'slip rot-card' },
    h('div', { class: 'slip-head' }, h('strong', {}, `Rotación ${k + 1}`), h('span', {}, `Saca: ${short(slots[0])}`)),
    h('div', { class: 'slip-grid', role: 'img', 'aria-label': `Rotación ${k + 1}` }, h('span', { class: 'slip-net' }, 'Red'), [...ZONE_ORDER.front, ...ZONE_ORDER.back].map(cell)),
    h('p', { class: 'slip-line' }, h('strong', {}, 'Adelante: '), ZONE_ORDER.front.map((z) => short(slots[z - 1])).join(', ')));
}
const rotText = (lu) => [`*${lu.name}: las 6 rotaciones*`, '(Como se ve desde la banca, la red arriba. Se rota como las manecillas del reloj cuando recuperan el saque.)',
  ...rotationsOf(lu).map((s, k) => `Rotación ${k + 1}: saca ${short(s[0])} · adelante ${ZONE_ORDER.front.map((z) => short(s[z - 1])).join(', ')} · atrás ${ZONE_ORDER.back.map((z) => short(s[z - 1])).join(', ')}`),
  lu.libero ? `Líbero: ${short(lu.libero)}` : null].filter(Boolean).join('\n');

export function rotaciones(ctx) {
  const lu = lineupById(ctx.args[0]);
  if (!lu) return { title: 'Rotaciones', back: '#/alineaciones', el: h('div', { class: 'page' }, empty('No encontré esa alineación', 'Puede que se haya borrado.', h('a', { class: 'btn', href: '#/alineaciones' }, 'Ver alineaciones'))) };
  const el = h('div', { class: 'page lineup-print' },
    h('div', { class: 'note no-print' }, 'Dónde va cada quien en las 6 rotaciones. «Z» es la zona; «C», el colocador. El de la zona 1 saca. Se rota una zona (como las manecillas del reloj) cada vez que recuperan el saque. Imprímela o compártela con tu equipo.'),
    lu.libero ? h('p', { style: { margin: 0 } }, h('strong', {}, 'Líbero: '), short(lu.libero), ' (entra por un jugador de atrás y no saca ni ataca arriba de la red).') : null,
    h('div', { class: 'rot-grid' }, rotationsOf(lu).map(miniCourt)),
    h('div', { class: 'cluster no-print' }, h('button', { class: 'btn primary', type: 'button', onclick: () => window.print() }, ic('printer', 18), 'Imprimir o guardar PDF'),
      h('button', { class: 'btn', type: 'button', onclick: () => shareText(rotText(lu)) }, ic('share-2', 18), 'Compartir')));
  return { title: lu.name, sub: 'Las 6 rotaciones', back: '#/alineaciones', actions: [{ icon: 'printer', label: 'Imprimir o guardar PDF', onClick: () => window.print() }], el };
}

// ---------- Rotaciones en la temporada ----------
export function seasonRotations(days) {
  const t = todayStr();
  const ms = state.data.matches.filter((m) => m.status === 'terminado' && (!days || diffDays(t, m.match_date) <= days) && (m.lineups || []).some((l) => l?.slots?.length === 6));
  const rallies = ms.flatMap((m) => replay(getLog(m)?.log || [], m.lineups || [], players()).rallies);
  return { matches: ms.length, rallies: rallies.length, rots: byRotation(rallies) };
}
function seasonSection(ctx) {
  const ui = ctx.ui; ui.days ??= 90;
  const r = seasonRotations(ui.days), rots = r.rots.filter((x) => x.n >= 4);
  const worst = rots.length > 1 ? rots.reduce((a, b) => (b.diff < a.diff ? b : a)) : null;
  const best = rots.length > 1 ? rots.reduce((a, b) => (b.diff > a.diff ? b : a)) : null;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Periodo' }, [[30, '30 días'], [90, '90 días'], [0, 'Todo']].map(([d, t]) =>
    h('button', { type: 'button', 'aria-pressed': ui.days === d ? 'true' : 'false', onclick: () => { ui.days = d; ctx.rerender(); } }, t)));
  return h('section', { class: 'stack' }, sectionTitle('Rotaciones en la temporada'),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Todos tus partidos con alineación capturada, sumados: en qué rotación ganan y en cuál pierden más puntos.'), seg,
    !r.matches ? note('Todavía no hay partidos terminados con alineación en este periodo. Pon la alineación de cada set al capturar y aquí verás tus rotaciones.')
      : !rots.length ? note(`Hay ${plural(r.matches, 'partido', 'partidos')} con alineación, pero pocos puntos por rotación (se necesitan 4 o más en cada una).`)
        : h('div', { class: 'stack' },
          h('p', { class: 'row-sub', style: { margin: 0 } }, `${plural(r.matches, 'partido', 'partidos')}, ${plural(r.rallies, 'punto jugado', 'puntos jugados')}.`),
          worst && worst.diff < 0 ? note(`Donde más pierden: ${rotLabel(worst.key).toLowerCase()} (${worst.won} ganados de ${worst.n}${worst.soN ? `, side-out ${worst.so}%` : ''}).${best && best.diff > 0 ? ` La mejor: ${rotLabel(best.key).toLowerCase()} (${best.won} de ${best.n}).` : ''}`, 'warn') : null,
          worst && worst.diff < 0 ? h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => rotationToNext({ key: worst.key, label: rotLabel(worst.key), n: worst.n, won: worst.won, so: worst.so, soN: worst.soN }) }, ic('calendar-plus', 16), 'Trabajarla en el próximo entreno')) : null,
          h('div', { class: 'tablewrap' }, h('table', { class: 'stbl' },
            h('thead', {}, h('tr', {}, ['Rotación', 'Puntos', 'Ganados', '+/-', 'Side-out', 'Break point'].map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', {}, rots.map((x) => h('tr', { class: worst && x.key === worst.key && worst.diff < 0 ? 'hl' : null }, h('th', { scope: 'row' }, rotLabel(x.key)), h('td', {}, String(x.n)), h('td', {}, String(x.won)),
              h('td', {}, `${x.diff > 0 ? '+' : ''}${x.diff}`), h('td', {}, x.soN ? `${x.so}% (${x.soW}/${x.soN})` : '—'), h('td', {}, x.bpN ? `${x.bp}% (${x.bpW}/${x.bpN})` : '—')))))),
          h('p', { class: 'row-sub', style: { margin: 0 } }, 'Side-out: puntos ganados cuando reciben. Break point: puntos ganados cuando sacan. «Colocador en zona X» sale si marcaste quién es colocador en la ficha.')));
}

// ---------- Página ----------
export default function alineaciones(ctx) {
  const list = savedLineups();
  const row = (lu) => h('section', { class: 'panel stack' },
    h('div', { class: 'split' }, h('div', {}, h('h3', { style: { margin: 0 } }, lu.name),
      h('span', { class: 'row-sub' }, [multiTeam() && lu.team ? teamName(lu.team) : null, lu.libero ? `líbero ${short(lu.libero)}` : null].filter(Boolean).join(' · ') || ' ')),
      h('a', { class: 'btn sm', href: `#/rotaciones/${lu.id}` }, ic('rotate-cw', 16), 'Rotaciones')),
    h('div', { class: 'slip-grid lu-mini', role: 'img', 'aria-label': `Alineación ${lu.name}` }, h('span', { class: 'slip-net' }, 'Red'),
      [...ZONE_ORDER.front, ...ZONE_ORDER.back].map((z) => h('div', { class: 'slip-cell' }, h('span', { class: 'slip-pos' }, `Z${z}`), h('span', { class: 'slip-name' }, short(lu.slots[z - 1]))))),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn sm primary', type: 'button', onclick: () => applySheet(lu) }, ic('calendar-check', 16), 'Usar en próximos partidos'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => lineupFormSheet(lu) }, ic('pencil', 16), 'Editar'),
      h('button', { class: 'btn sm ghost', type: 'button', 'aria-label': `Borrar ${lu.name}`, onclick: async () => {
        if (!(await confirmSheet({ title: 'Borrar alineación', text: `Se borra «${lu.name}». Los partidos donde ya la usaste no cambian.`, ok: 'Borrar', danger: true }))) return;
        saveAll(savedLineups().filter((x) => x.id !== lu.id)); toast('Alineación borrada');
      } }, ic('trash-2', 16))));
  const el = h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, 'Guarda tus alineaciones base con nombre. En cada partido la eliges con un toque, y aquí ves sus 6 rotaciones para imprimir o compartir con tu equipo.'),
    h('div', { class: 'cluster' }, h('button', { class: 'btn primary', type: 'button', onclick: () => lineupFormSheet(null) }, ic('plus', 18), 'Nueva alineación')),
    list.length ? h('div', { class: 'stack' }, list.map(row)) : empty('Sin alineaciones guardadas', 'Crea una aquí o, al poner la alineación de un partido, marca «Guardar también como alineación».'),
    seasonSection(ctx));
  return { title: 'Alineaciones y rotaciones', back: '#/partidos', el };
}

// ---------- Del scouting al saque (partido por jugar) ----------
function serveStats(pid) {
  const t = todayStr();
  const logs = state.data.matches.filter((m) => m.status === 'terminado' && diffDays(t, m.match_date) <= 180).map((m) => getLog(m)?.log || []);
  return metrics(addCounts(...logs.map((l) => countsFor(l, pid))));
}
function adviceFor(st) {
  if (st.serves < 6) return { tag: 'Seguro', tone: '', why: st.serves ? `Solo ${plural(st.serves, 'saque capturado', 'saques capturados')}: que entre.` : 'Sin saques capturados: que entre.' };
  if (st.svIn < 75) return { tag: 'Seguro', tone: 'warn', why: `Mete ${st.svIn}% de sus saques: lo importante es que entre.` };
  if (st.svIn >= 88) return { tag: 'Puede arriesgar', tone: 'ok', why: `Mete ${st.svIn}%${st.aces ? ` y lleva ${plural(st.aces, 'ace', 'aces')}` : ''}: puede sacar más fuerte o a la zona objetivo.` };
  return { tag: 'Normal', tone: '', why: `Mete ${st.svIn}%: saque firme a la zona objetivo.` };
}
export function servePlan(m) {
  const lu = m.lineups?.[0] || null;
  if (!lu?.slots || lu.slots.length !== 6) return null;
  const order = (lu.serve === 'them' ? [1, 2, 3, 4, 5, 0] : [0, 1, 2, 3, 4, 5]).map((i) => lu.slots[i]);
  const rv = rivals().find((r) => r.key === rivalKey(m.rival)) || null;
  const tips = rv ? gamePlan(rv).filter((x) => x.k === 'saque' || x.t === 'Su rotación débil').map((x) => x.d) : [];
  // Zonas del rival donde más puntos sacaste contra ellos (con 3 saques o más ahí).
  const vsLogs = (rv?.matches || []).filter((x) => x.status === 'terminado').map((x) => getLog(x)?.log || []);
  const zc = {}; for (const l of vsLogs) for (const [z, c] of Object.entries(zoneCounts(l, 'sv'))) { zc[z] ??= { n: 0, pts: 0 }; zc[z].n += c.n; zc[z].pts += c.pts; }
  const bestZ = Object.entries(zc).filter(([, c]) => c.n >= 3 && c.pts > 0).sort((a, b) => b[1].pts / b[1].n - a[1].pts / a[1].n)[0];
  if (bestZ) tips.push(`Contra ellos, tus saques a su zona ${bestZ[0]} hicieron ${plural(bestZ[1].pts, 'punto', 'puntos')} de ${bestZ[1].n}.`);
  return { lu, rv, tips, servers: order.map((id, i) => ({ id, n: i + 1, st: serveStats(id), ...adviceFor(serveStats(id)) })) };
}
const planTxt = (m, p) => [`*Plan de saque contra ${m.rival}* (${fmtDate(m.match_date, { weekday: 'long', day: 'numeric', month: 'short' })})`,
  p.tips.length ? `A dónde: ${p.tips.join(' ')}` : 'A dónde: saque seguro y profundo; sin ficha del rival todavía.',
  ...p.servers.map((s) => `${s.n}. ${short(s.id)}: ${s.tag}. ${s.why}`)].join('\n');
export function servePlanCard(m) {
  const p = servePlan(m);
  if (!p) {
    const saved = lineupsFor(m);
    return h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, 'Plan de saque'),
      h('p', { style: { margin: 0 } }, 'Pon la alineación del set 1 y Remate te arma el orden de saque, quién saca seguro y a quién sacarle según tu ficha del rival.'),
      saved.length ? h('div', { class: 'cluster' }, saved.slice(0, 3).map((lu) => h('button', { class: 'btn sm', type: 'button', onclick: () => {
        patch('matches', m.id, { lineups: [{ slots: [...lu.slots], libero: lu.libero || null, serve: 'us' }, ...(m.lineups || []).slice(1)] }); toast(`Set 1 con «${lu.name}»`);
      } }, ic('users', 16), `Usar «${lu.name}»`))) : h('a', { class: 'btn sm', href: '#/alineaciones' }, ic('users', 16), 'Alineaciones'));
  }
  return h('section', { class: 'panel stack serve-plan' },
    h('div', { class: 'split' }, h('h3', { style: { margin: 0 } }, 'Plan de saque'), h('span', { class: 'row-sub' }, p.lu.serve === 'them' ? `Saca primero ${m.rival}` : 'Sacan ustedes primero')),
    p.tips.length ? h('ul', { class: 'plain' }, p.tips.map((t) => h('li', {}, t)))
      : h('p', { style: { margin: 0 } }, p.rv?.sc ? 'Tu ficha del rival no marca a quién sacarle: saque seguro y profundo.' : 'Sin ficha del rival: saque seguro y profundo. Si llegas antes, usa «Scouting en 1 minuto» para saber quién recibe mal.'),
    h('ol', { class: 'serve-list' }, p.servers.map((s) => h('li', {}, h('strong', {}, short(s.id)), ' ', h('span', { class: `chip ${s.tone}` }, s.tag), h('span', { class: 'row-sub' }, ` ${s.why}`)))),
    h('div', { class: 'cluster' }, h('button', { class: 'btn sm', type: 'button', onclick: () => shareText(planTxt(m, p)) }, ic('share-2', 16), 'Compartir'),
      h('a', { class: 'btn sm ghost', href: `#/rival/${rivalKey(m.rival)}` }, ic('eye', 16), 'Ficha del rival')),
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'El orden sigue la alineación del set 1. «Seguro»: mete menos de 75% o tiene pocos saques capturados; «Puede arriesgar»: mete 88% o más (últimos 6 meses).'));
}
