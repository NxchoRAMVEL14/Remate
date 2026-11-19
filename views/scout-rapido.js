// Scouting en 1 minuto (v3.23): mientras el rival calienta, con botones grandes: a dónde sacan, quiénes son peligrosos
// y quién recibe mal. Con eso (y lo que capturaste en partidos anteriores contra ellos) Remate arma la tarjeta del
// plan de juego para el tiempo fuera. Se guarda en la misma ficha privada del rival (Scouting de rivales).
import { h, ic, toast, fmtDate, rivalKey, shareText } from '../util.js';
import { state, profile, saveProfile, labReady } from '../store.js';
import { rivalStats } from '../match-calc.js';
import { rivals } from './rivales.js';
import { note, empty } from './ui.js';
import { missingSqlNote } from './lab.js';

export const TAGS = [
  ['remata', 'Remata fuerte'], ['saca', 'Saca fuerte'], ['recibemal', 'Recibe mal'],
  ['colocador', 'Colocador'], ['zurdo', 'Zurdo'], ['bloquea', 'Bloquea bien'],
];
const TAG = Object.fromEntries(TAGS);
const SYS = [['', 'No sé'], ['5-1', '5-1'], ['6-2', '6-2'], ['4-2', '4-2']];
const ZONES_OURS = [[4, 3, 2], [5, 6, 1]];
const scouting = () => profile().scouting || {};
const tagsOf = (p) => (Array.isArray(p.tags) ? p.tags : [...(p.attacks ? ['remata'] : []), ...(p.pos === 'colocador' ? ['colocador'] : [])]);
const nums = (list, t) => list.filter((p) => tagsOf(p).includes(t) && p.num).map((p) => `#${p.num}`);
const join = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);

// La tarjeta del plan de juego: frases cortas, de lo más útil a lo menos.
export function gamePlan(rv) {
  const sc = rv.sc || {}, list = sc.players || [];
  const log = (rv.matches || []).flatMap((m) => state.data.matchLogs.find((l) => l.match_id === m.id)?.log || []);
  const r = log.length ? rivalStats(log) : null;
  const out = [];
  // Saque
  const weakRec = nums(list, 'recibemal');
  if (weakRec.length) out.push({ k: 'saque', t: 'Saque', d: `Sácale a ${join(weakRec)}: recibe${weakRec.length > 1 ? 'n' : ''} mal.` });
  const setter = nums(list, 'colocador');
  if (setter.length) out.push({ k: 'saque', t: 'Saque', d: `Saca a la zona 1 (su derecha atrás) para que su colocador ${setter[0]} tenga que correr.` });
  // Recepción
  const zs = (sc.serveZones || []).length ? sc.serveZones : r && r.sv.n >= 4 ? Object.entries(r.sv.zones).filter(([, c]) => c.n / r.sv.n >= 0.25).map(([z]) => Number(z)) : [];
  if (zs.length) out.push({ k: 'recep', t: 'Recepción', d: `Sacan a la zona ${join(zs.map(String))} de tu cancha: pon ahí a tu mejor receptor (o al líbero).` });
  const servers = [...new Set([...nums(list, 'saca'), ...(r ? r.sv.by.filter((x) => x.n >= 3 && x.pts >= 2).map((x) => `#${x.rn}`) : [])])];
  if (servers.length) out.push({ k: 'recep', t: 'Recepción', d: `${join(servers)} saca${servers.length > 1 ? 'n' : ''} fuerte: receptores un paso atrás y pase alto al centro.` });
  // Bloqueo y defensa
  const hitters = [...new Set([...nums(list, 'remata'), ...(r ? r.at.by.filter((x) => x.n >= 3 && x.pts >= 2).sort((a, b) => b.pts - a.pts).slice(0, 2).map((x) => `#${x.rn}`) : [])])];
  if (hitters.length) out.push({ k: 'bloqueo', t: 'Bloqueo', d: `Cierra a ${join(hitters)}: doble bloqueo cuando ataque${hitters.length > 1 ? 'n' : ''}.` });
  const lefty = nums(list, 'zurdo');
  if (lefty.length) out.push({ k: 'bloqueo', t: 'Bloqueo', d: `${join(lefty)} ${lefty.length > 1 ? 'son zurdos' : 'es zurdo'}: su mejor ataque suele venir por zona 2 (tu zona 4); tu bloqueador de 4 atento.` });
  if (setter.length) out.push({ k: 'bloqueo', t: 'Defensa', d: `Cuando su colocador ${setter[0]} esté adelante, puede atacar de segunda: el bloqueador de tu zona 4 no se va antes.` });
  const blockers = nums(list, 'bloquea');
  if (blockers.length) out.push({ k: 'ataque', t: 'Ataque', d: `${join(blockers)} bloquea${blockers.length > 1 ? 'n' : ''} bien: ataca a las orillas del bloqueo o con toque a la zona vacía.` });
  if (r && r.errors && r.gifts >= 4) { const top = Object.entries(r.errors).sort((a, b) => b[1] - a[1])[0]; if (top && top[1] >= 3) out.push({ k: 'ataque', t: 'Paciencia', d: `Contra ti fallaron mucho ${({ sv: 'el saque', at: 'el ataque', rc: 'la recepción', red: 'en la red', otro: 'en general' })[top[0]]}: juega seguro y deja que se equivoquen.` }); }
  if (sc.weakRot) out.push({ k: 'clave', t: 'Su rotación débil', d: `${sc.weakNote ? sc.weakNote.replace(/\.+$/, '') : `Con su colocador en zona ${sc.weakRot}`}. Ahí es momento de arriesgar en el saque.` });
  if (sc.plan) out.push({ k: 'clave', t: 'Tu plan', d: sc.plan });
  return out;
}

export function planText(rv, m = null) {
  const p = gamePlan(rv);
  return [`*Plan de juego contra ${rv.name}*${m ? ` (${fmtDate(m.match_date, { weekday: 'long', day: 'numeric', month: 'short' })})` : ''}`, ...p.map((x) => `• ${x.t}: ${x.d}`)].join('\n');
}
export function planCard(rv, m = null, { big = false } = {}) {
  const p = gamePlan(rv);
  return h('section', { class: `panel stack sr-plan ${big ? 'big' : ''}` },
    h('h3', { style: { margin: 0 } }, `Plan contra ${rv.name}`),
    p.length ? h('ul', { class: 'plain sr-lines' }, p.map((x) => h('li', { class: `sr-${x.k}` }, h('strong', {}, `${x.t}: `), x.d)))
      : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Marca arriba a dónde sacan y a 2 o 3 jugadores: con eso sale el plan.'));
}
export function bigPlan(rv, m) {
  const ov = h('div', { class: 'sr-full', role: 'dialog', 'aria-label': `Plan contra ${rv.name}` },
    h('button', { class: 'iconbtn sr-x', type: 'button', 'aria-label': 'Cerrar', onclick: () => ov.remove() }, ic('x', 26)), planCard(rv, m, { big: true }));
  const close = () => { ov.remove(); removeEventListener('keydown', key); removeEventListener('hashchange', close); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  ov.querySelector('.sr-x').onclick = close;
  addEventListener('keydown', key); addEventListener('hashchange', close);
  document.body.append(ov); ov.querySelector('.sr-x').focus();
}

export default function scoutRapido(ctx) {
  const [key0, mid] = ctx.args;
  const m = mid ? state.data.matches.find((x) => x.id === mid) : null;
  const key = key0 || (m ? rivalKey(m.rival) : '');
  const rv = rivals().find((r) => r.key === key) || (key ? { key, name: m?.rival || key, matches: m ? [m] : [], sc: null } : null);
  if (!rv) return { title: 'Scouting en 1 minuto', back: '#/partidos', el: h('div', { class: 'page' }, empty('Elige un partido', 'Ábrelo desde un partido o desde Scouting de rivales.')) };
  const ro = !labReady() || ctx.readonly;
  const ui = ctx.ui;
  ui.sc ??= { name: rv.name, system: '', weakRot: null, weakNote: '', serveZones: [], players: [], strengths: '', weaknesses: '', plan: '', ...(rv.sc || {}) };
  ui.sc.players = (ui.sc.players || []).map((p) => ({ ...p, tags: tagsOf(p) }));
  ui.sel ??= ui.sc.players[0]?.num || null;
  const sc = ui.sc;
  const save = () => {
    if (ro) return;
    const row = { ...sc, players: sc.players.filter((p) => p.num).map((p) => ({ num: String(p.num).slice(0, 3), pos: p.tags.includes('colocador') ? 'colocador' : (p.pos === 'colocador' ? '' : p.pos || ''), attacks: p.tags.includes('remata'), note: p.note || '', tags: p.tags })), updated: new Date().toISOString().slice(0, 10) };
    saveProfile({ scouting: { ...scouting(), [rv.key]: row } });
    rv.sc = row;
  };
  const rerender = () => { save(); ctx.rerender(); };
  const cur = sc.players.find((p) => String(p.num) === String(ui.sel)) || null;
  const zoneBtn = (z) => h('button', { type: 'button', class: 'sc-zone', 'aria-pressed': sc.serveZones.includes(z) ? 'true' : 'false',
    onclick: () => { sc.serveZones = sc.serveZones.includes(z) ? sc.serveZones.filter((x) => x !== z) : [...sc.serveZones, z].sort(); rerender(); } }, `Zona ${z}`);
  const numBtn = (n) => { const has = sc.players.find((p) => String(p.num) === String(n)); return h('button', { type: 'button', class: `sr-num ${has ? 'has' : ''} ${String(ui.sel) === String(n) ? 'on' : ''}`, 'aria-pressed': String(ui.sel) === String(n) ? 'true' : 'false',
    onclick: () => { if (!has) sc.players.push({ num: String(n), pos: '', attacks: false, note: '', tags: [] }); ui.sel = String(n); rerender(); } }, String(n)); };
  const other = h('input', { type: 'text', inputmode: 'numeric', maxlength: 3, placeholder: 'Otro #', 'aria-label': 'Otro número', class: 'sr-other' });
  const el = h('div', { class: 'page sr' },
    ro && !ctx.readonly ? missingSqlNote() : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, 'Mientras calientan: toca las zonas a donde sacan y los números que veas. Todo se guarda solo.'),
    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, '1. ¿A dónde sacan? (tu cancha)'),
      h('div', { class: 'sc-zones' }, h('span', { class: 'sc-net' }, 'Red'), ...ZONES_OURS.flat().map(zoneBtn))),
    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, '2. Sus jugadores'),
      h('div', { class: 'sr-nums', role: 'group', 'aria-label': 'Números del rival' }, Array.from({ length: 20 }, (_, i) => numBtn(i + 1)),
        ...sc.players.filter((p) => Number(p.num) > 20 || Number(p.num) < 1).map((p) => numBtn(p.num))),
      h('div', { class: 'cluster' }, other, h('button', { class: 'btn sm', type: 'button', onclick: () => { const n = other.value.replace(/\D/g, ''); if (!n) return; if (!sc.players.find((p) => String(p.num) === n)) sc.players.push({ num: n, pos: '', attacks: false, note: '', tags: [] }); ui.sel = n; rerender(); } }, ic('plus', 16), 'Agregar')),
      cur ? h('div', { class: 'stack sr-tags' }, h('strong', {}, `#${cur.num}:`),
        h('div', { class: 'ap-chips' }, TAGS.map(([k, t]) => h('button', { type: 'button', class: `ap-chip ${cur.tags.includes(k) ? 'on' : ''}`, 'aria-pressed': cur.tags.includes(k) ? 'true' : 'false',
          onclick: () => { cur.tags = cur.tags.includes(k) ? cur.tags.filter((x) => x !== k) : [...cur.tags, k]; rerender(); } }, t))),
        h('button', { class: 'btn sm ghost', type: 'button', style: { justifySelf: 'start' }, onclick: () => { sc.players = sc.players.filter((p) => p !== cur); ui.sel = sc.players[0]?.num || null; rerender(); } }, ic('trash-2', 16), `Quitar #${cur.num}`))
        : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Toca un número y marca qué hace.'),
      sc.players.some((p) => p.tags.length) ? h('ul', { class: 'plain sr-sum' }, sc.players.filter((p) => p.tags.length).map((p) => h('li', {}, h('strong', {}, `#${p.num}: `), p.tags.map((t) => TAG[t]).join(', ')))) : null),
    h('section', { class: 'panel stack' }, h('h3', { style: { margin: 0 } }, '3. Su sistema'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Su sistema' }, SYS.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (sc.system || '') === k ? 'true' : 'false', onclick: () => { sc.system = k; rerender(); } }, t)))),
    planCard(rv, m),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => bigPlan(rv, m) }, ic('maximize', 18), 'Enseñar en grande'),
      h('button', { class: 'btn', type: 'button', onclick: () => shareText(planText(rv, m)) }, ic('message-circle', 18), 'Mandar por WhatsApp'),
      m ? h('a', { class: 'btn', href: `#/pizarra/${m.id}` }, ic('move', 18), 'Abrir en la Pizarra') : null,
      h('a', { class: 'btn ghost', href: `#/rival/${rv.key}` }, ic('eye', 18), 'Ficha completa')),
    note('Anota por número y lo que se ve en la cancha. Nada de datos personales de jugadores de otros equipos.'));
  return { title: 'Scouting en 1 minuto', sub: rv.name, back: m ? `#/partido/${m.id}` : `#/rival/${rv.key}`, el };
}
