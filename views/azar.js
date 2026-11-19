// v3.10: Azar y equipos de entrenamiento. Un dado para elegir a un jugador al azar (sin repetir hasta que
// pasen todos) y equipos para entrenar: 6 vs 6 con posiciones, 5 vs 5, cascaritas de 2, 3 o 4 por equipo,
// o duelos de 1 vs 1 (v3.20).
// Se arman parejos por posición y nivel, solo por nivel o al azar total; y por rama (mezcladas parejo,
// cada rama por su lado, o solo una). Todo se queda en este celular: no usa tablas nuevas.
import { availability } from './lesiones.js';
import { h, ic, toast, todayStr, plural, shareText, confirmSheet } from '../util.js';
import { state, players, patch, getSession, sessions, multiTeam, teams, inTeam, convocados, teamPlayers } from '../store.js';
import { currentRatings, positionsOf } from '../calc.js';
import { POSITION_NAME, BRANCHES } from '../content/skills.js';
import { note, jersey, longDate } from './ui.js';

const KEY = 'remate.azar.v1';
const SIZES = [[6, '6 vs 6'], [5, '5 vs 5'], [4, '4 vs 4'], [3, '3 vs 3'], [2, '2 vs 2'], [1, '1 vs 1']];
const MODES = [['pos', 'Parejos: posición y nivel'], ['nivel', 'Parejos: solo nivel'], ['azar', 'Al azar total']];
const RAMAS = [['mix', 'Todas, mezcladas parejo'], ['sep', 'Cada rama por su lado'], ['M', 'Solo varonil'], ['F', 'Solo femenil']];
const ROLE_ORDER = ['colocador', 'libero', 'opuesto', 'central', 'punta', 'sin_definir'];
const COURT = ['colocador', 'opuesto', 'central', 'central', 'punta', 'punta'];
const LETTERS = 'ABCDEFGHIJKL';
const NOTES_MAX = 1200;   // lo que cabe en las notas del entrenamiento

// ---------- estado (se recuerda en este celular) ----------
const DEF = { tab: 'dado', team: '', rama: 'mix', who: 'presentes', size: 6, k: 0, mode: 'pos', probar: false, pos: '', out: { d: '', ids: [] }, bag: { d: '', ids: [], last: null, hist: [] }, res: null };
let S = null;
function load() {
  if (S) return S;
  try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { S = { ...DEF }; }
  const d = todayStr();
  if (S.out?.d !== d) S.out = { d, ids: [] };          // los que quitaste a mano: solo por hoy
  if (S.bag?.d !== d) S.bag = { d, ids: [], last: null, hist: [] };
  return S;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* sin almacenamiento */ } }

// ---------- quién está ----------
function sessionFor(sid) {
  if (sid) return getSession(sid) || null;
  const d = todayStr();
  return sessions().find((s) => s.session_date === d && s.status !== 'cancelada') || null;
}
const branchOk = (p, r) => r === 'mix' || r === 'sep' || !p.branch || p.branch === r;
export function poolFor(sess, o = load()) {
  // v3.20: en un entreno, sus convocados; sin entreno, el equipo sin los que entrenan contigo aparte.
  let ps = (sess ? convocados(sess) : teamPlayers()).filter((p) => p.active !== false);
  if (o.team && multiTeam()) ps = ps.filter((p) => inTeam(p, o.team));
  ps = ps.filter((p) => branchOk(p, o.rama));
  const marks = sess ? state.data.attendance.filter((a) => a.session_id === sess.id) : [];
  const listed = marks.length > 0;
  if (o.who === 'presentes' && listed) { const here = new Set(marks.filter((a) => a.status === 'presente' || a.status === 'retardo').map((a) => a.player_id)); ps = ps.filter((p) => here.has(p.id)); }
  // v3.23: quien está lesionado (o en las fases 1 y 2 del regreso) no entra a los equipos.
  const hurt = ps.filter((p) => availability(p.id).k === 'fuera');
  if (hurt.length) { const hs = new Set(hurt.map((p) => p.id)); ps = ps.filter((p) => !hs.has(p.id)); }
  const base = ps.length, out = new Set(o.out.ids);
  return { all: ps, list: ps.filter((p) => !out.has(p.id)), base, listed, hurt };
}

// ---------- nivel y posición ----------
// Fuerza = nivel de la Ruta (1 a 6) + un ajuste por su radar (1 a 4), si lo tiene.
export function strength(p) {
  const cur = Object.values(currentRatings(p.id, state.data.ratings || [])).map(Number).filter((x) => x > 0);
  const avg = cur.length ? cur.reduce((a, b) => a + b, 0) / cur.length : null;
  return (Number(p.level) || 1) + (avg == null ? 0 : (avg - 2.5) * 0.6);
}
const mainRole = (p) => (ROLE_ORDER.includes(p.position) ? p.position : 'sin_definir');
// Qué tan natural es una posición para alguien: 0 la suya, 1 una que también juega, 3 una nueva.
function fit(p, role, probar) {
  const pos = positionsOf(p);
  if (role === 'libero' && pos[0] !== 'libero' && !pos.includes('libero')) return 4;
  if (pos[0] === 'sin_definir') return 1.5;
  if (probar) return pos[0] === role ? 2.5 : pos.includes(role) ? 0 : 1;   // probar: mejor una que no sea la de siempre
  return pos[0] === role ? 0 : pos.includes(role) ? 1 : 3;
}

const lexLess = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] < b[i]; return false; };
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// ---------- armar equipos ----------
// Reparte n jugadores en k equipos de tamaños casi iguales (difieren en 1 como mucho).
export function splitTeams(list, k, mode, mixBranches) {
  const n = list.length; if (k < 1 || !n) return [];
  const caps = Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
  const T = caps.map(() => []);
  if (mode === 'azar') { shuffle(list).forEach((p, i) => T[i % k].push(p)); return T; }
  const st = new Map(list.map((p) => [p.id, strength(p) + (Math.random() - 0.5) * 0.7]));   // un poco de azar: cada vez sale otra combinación
  const order = mode === 'pos'
    ? list.slice().sort((a, b) => ROLE_ORDER.indexOf(mainRole(a)) - ROLE_ORDER.indexOf(mainRole(b)) || st.get(b.id) - st.get(a.id))
    : list.slice().sort((a, b) => st.get(b.id) - st.get(a.id));
  const tot = (t) => t.reduce((s, p) => s + st.get(p.id), 0);
  const cnt = (t, f) => t.filter(f).length;
  for (const p of order) {
    let best = -1, key = null;
    T.forEach((t, i) => {
      if (t.length >= caps[i]) return;
      const kk = [mode === 'pos' ? cnt(t, (q) => mainRole(q) === mainRole(p)) : 0, mixBranches && p.branch ? cnt(t, (q) => q.branch === p.branch) : 0, tot(t) / Math.max(1, caps[i]), t.length];
      if (!key || lexLess(kk, key)) { best = i; key = kk; }
    });
    T[best].push(p);
  }
  // Ajuste fino: cambia jugadores (de la misma posición si se arma por posición) si deja los equipos más parejos.
  const cost = () => {
    const avg = T.map((t, i) => tot(t) / Math.max(1, caps[i]));
    let c = Math.max(...avg) - Math.min(...avg);
    // Por posición: que ninguna posición quede cargada a un equipo (como mucho 1 de diferencia).
    if (mode === 'pos') for (const r of ROLE_ORDER) { const v = T.map((t) => cnt(t, (q) => mainRole(q) === r)); c += 2 * Math.max(0, Math.max(...v) - Math.min(...v) - 1); }
    if (mixBranches) for (const b of ['M', 'F']) { const v = T.map((t) => cnt(t, (q) => q.branch === b)); c += 0.4 * (Math.max(...v) - Math.min(...v) > 1 ? Math.max(...v) - Math.min(...v) - 1 : 0); }
    return c;
  };
  let cur = cost();
  for (let it = 0; it < 6; it++) {
    let improved = false;
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) for (let i = 0; i < T[a].length; i++) for (let j = 0; j < T[b].length; j++) {
      const x = T[a][i], y = T[b][j];
      T[a][i] = y; T[b][j] = x;
      const c = cost();
      if (c < cur - 1e-9) { cur = c; improved = true; } else { T[a][i] = x; T[b][j] = y; }
    }
    if (!improved) break;
  }
  return T;
}

// Posiciones en la cancha de un equipo de 6 (más líbero si tiene). Los demás quedan de cambio.
export function courtRoles(team, probar) {
  const slots = [...COURT]; if (team.length >= 7 && team.some((p) => positionsOf(p).includes('libero'))) slots.push('libero');
  const ps = team.slice(0, 12), m = slots.length;
  // Probar: a unos cuantos (uno de cada tres) se les pide jugar en otra posición; los demás en la suya.
  const moved = new Set(probar ? shuffle(ps.filter((p) => positionsOf(p)[0] !== 'sin_definir' && positionsOf(p)[0] !== 'libero')).slice(0, Math.max(1, Math.round(ps.length / 3))).map((p) => p.id) : []);
  const cost = (p, r) => (moved.has(p.id) ? fit(p, r, true) + (positionsOf(p)[0] === r ? 3 : 0) : fit(p, r, false)) - strength(p) * 0.05;
  let dp = new Map([[0, { v: 0, pick: [] }]]);
  ps.forEach((p, i) => {
    const nx = new Map(dp);
    for (const [mask, s] of dp) for (let j = 0; j < m; j++) {
      if (mask & (1 << j)) continue;
      const nm = mask | (1 << j), v = s.v + cost(p, slots[j]);
      if (!nx.has(nm) || nx.get(nm).v > v) nx.set(nm, { v, pick: [...s.pick, [i, j]] });
    }
    dp = nx;
  });
  // Si son menos de 6, se quedan las posiciones que mejor les quedan.
  const best = dp.get((1 << m) - 1) || [...dp.values()].sort((a, b) => b.pick.length - a.pick.length || a.v - b.v)[0];
  const roles = {}; for (const [i, j] of best.pick) roles[ps[i].id] = slots[j];
  return roles;
}

function build(o, list) {
  const mix = o.rama === 'mix' && list.some((p) => p.branch === 'M') && list.some((p) => p.branch === 'F');
  const groups = o.rama === 'sep'
    ? [['M', list.filter((p) => p.branch === 'M')], ['F', list.filter((p) => p.branch === 'F')], ['', list.filter((p) => !p.branch)]].filter(([, l]) => l.length)
    : [['', list]];
  const out = [];
  if (o.size === 1) {   // v3.20: duelos de 1 vs 1 entre los de nivel más parecido (al azar total: revueltos)
    for (const [b, l] of groups) {
      const xs = o.mode === 'azar' ? shuffle(l) : [...l].map((p) => [p, strength(p) + Math.random() * 0.8]).sort((a, c) => c[1] - a[1]).map(([p]) => p);
      const pre = b ? `${BRANCHES[b]} ` : '';
      for (let i = 0; i + 1 < xs.length; i += 2) out.push({ name: `${pre}${i / 2 + 1}`, ids: [xs[i].id, xs[i + 1].id] });
      if (xs.length % 2) out.push({ name: `${pre}espera`, ids: [xs[xs.length - 1].id], wait: true });
    }
    return { d: todayStr(), at: Date.now(), size: 1, mode: o.mode, rama: o.rama, probar: false, teams: out, roles: {} };
  }
  for (const [b, l] of groups) {
    const k = o.rama === 'sep' || !o.k ? autoK(l.length, o.size) : o.k;
    if (k < 1) continue;
    splitTeams(l, k, o.mode, mix).forEach((t, i) => out.push({ name: `${b ? `${BRANCHES[b]} ` : ''}${LETTERS[i] || i + 1}`, ids: t.map((p) => p.id) }));
  }
  const roles = {};
  if (o.size === 6) out.forEach((t) => Object.assign(roles, courtRoles(t.ids.map(byId).filter(Boolean), o.probar)));
  return { d: todayStr(), at: Date.now(), size: o.size, mode: o.mode, rama: o.rama, probar: o.probar, teams: out, roles };
}
export const autoK = (n, size) => (size === 1 ? Math.floor(n / 2) : n < 4 ? (n >= 2 ? 1 : 0) : Math.max(2, Math.floor(n / size)));
const byId = (id) => players().find((p) => p.id === id) || null;

// ---------- pantalla ----------
export default function azar(ctx) {
  const o = load(), sess = sessionFor(ctx.args?.[0]);
  const pool = poolFor(sess, o);
  const set = (ch) => { Object.assign(o, ch); save(); ctx.rerender(); };
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['dado', 'Jugador al azar'], ['equipos', 'Equipos y cascaritas']].map(([k, t]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': o.tab === k ? 'true' : 'false', onclick: () => set({ tab: k }) }, t)));
  const el = h('div', { class: 'page azar' }, filters(o, sess, pool, set), tabs, o.tab === 'dado' ? dadoView(o, pool, set) : equiposView(o, pool, sess, set));
  return { title: 'Azar y equipos', back: sess ? `#/sesion/${sess.id}` : '#/hoy', el };
}

function seg(label, pairs, cur, onPick) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label }, pairs.map(([v, t]) =>
    h('button', { type: 'button', 'aria-pressed': String(cur) === String(v) ? 'true' : 'false', onclick: () => onPick(v) }, t)));
}

function filters(o, sess, pool, set) {
  const mt = multiTeam();
  const outSet = new Set(o.out.ids);
  const chips = h('div', { class: 'az-who' }, pool.all.map((p) => h('button', { type: 'button', class: `az-chip${outSet.has(p.id) ? ' off' : ''}`, 'aria-pressed': outSet.has(p.id) ? 'false' : 'true',
    title: outSet.has(p.id) ? 'Fuera: toca para meterlo' : 'Toca para dejarlo fuera hoy',
    onclick: () => { const s2 = new Set(o.out.ids); if (s2.has(p.id)) s2.delete(p.id); else s2.add(p.id); set({ out: { d: o.out.d, ids: [...s2] } }); } },
  jersey(p), p.name.split(' ').slice(0, 2).join(' '))));
  return h('section', { class: 'panel stack az-filters' },
    h('div', { class: 'split' }, h('strong', {}, `Juegan ${pool.list.length}${pool.list.length !== pool.base ? ` de ${pool.base}` : ''}`),
      sess ? h('span', { class: 'row-sub' }, `${sess.title || 'Entrenamiento'} · ${longDate(sess.session_date)}`) : h('span', { class: 'row-sub' }, 'Sin entrenamiento hoy')),
    pool.hurt?.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `🩹 Fuera por lesión: ${pool.hurt.map((p) => p.name).join(', ')}.`) : null,
    mt ? seg('Equipo', [['', 'Todos'], ...teams().map((t) => [t.id, t.name])], o.team, (v) => set({ team: v, res: null })) : null,
    seg('Rama', RAMAS, o.rama, (v) => set({ rama: v, res: null })),
    sess ? seg('Quiénes', [['presentes', 'Los que vinieron'], ['todos', 'Todo el equipo']], o.who, (v) => set({ who: v, res: null })) : null,
    sess && o.who === 'presentes' && !pool.listed ? note('Todavía no pasas lista en este entrenamiento: por ahora entran todos. Al pasar lista, solo cuentan los presentes y los retardos.', 'warn') : null,
    h('details', {}, h('summary', {}, `Quitar o meter a alguien hoy${o.out.ids.length ? ` (${o.out.ids.length} fuera)` : ''}`),
      h('p', { class: 'row-sub' }, 'Toca un nombre para dejarlo fuera (lesionado, se fue temprano). Se borra mañana.'), chips));
}

// ---------- el dado ----------
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const die = (n) => h('div', { class: 'az-die', 'aria-hidden': 'true' }, Array.from({ length: 9 }, (_, i) => h('span', { class: PIPS[n].includes(i + 1) ? 'pip' : '' })));

function dadoView(o, pool, set) {
  const poss = [...new Set(pool.list.flatMap((p) => positionsOf(p)).filter((x) => x !== 'sin_definir'))];
  const cand = pool.list.filter((p) => !o.pos || positionsOf(p).includes(o.pos));
  const ids = cand.map((p) => p.id);
  const passed = o.bag.hist.filter((id) => ids.includes(id));
  const remaining = ids.filter((id) => !new Set(passed).has(id));
  const last = o.bag.last ? byId(o.bag.last) : null;
  const dieBox = h('div', { class: 'az-diebox' }, die(last ? 5 : 1));
  const nameBox = h('div', { class: 'az-picked', 'aria-live': 'polite' },
    last ? [jersey(last, 'xl'), h('strong', {}, last.name), h('span', { class: 'row-sub' }, [POSITION_NAME[last.position], last.branch ? BRANCHES[last.branch] : null, `nivel ${last.level || 1}`].filter(Boolean).join(' · '))]
      : h('span', { class: 'row-sub' }, 'Tira el dado para elegir a alguien.'));
  const roll = () => {
    if (!cand.length) { toast('No hay nadie con esos filtros'); return; }
    let pickFrom = remaining.length ? remaining : ids.filter((id) => id !== o.bag.last || ids.length === 1);
    const newRound = !remaining.length;
    const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    btn.disabled = true; dieBox.classList.add('rolling');
    try { navigator.vibrate?.([20, 40, 20, 40, 20]); } catch { /* sin vibración */ }
    let t = 0;
    const spin = setInterval(() => {
      const p = cand[Math.floor(Math.random() * cand.length)];
      dieBox.replaceChildren(die(1 + Math.floor(Math.random() * 6)));
      nameBox.replaceChildren(jersey(p, 'xl'), h('strong', {}, p.name));
      if ((t += 70) >= 900) {
        clearInterval(spin);
        const hist = newRound ? [pick] : [...o.bag.hist, pick];
        set({ bag: { d: o.bag.d, ids: [], last: pick, hist } });
        if (newRound) toast('Ya habían pasado todos: empieza otra vuelta');
      }
    }, 70);
  };
  const btn = h('button', { type: 'button', class: 'btn primary lg', onclick: roll }, ic('dice-5', 22), last ? 'Tirar otra vez' : 'Tirar el dado');
  const histList = o.bag.hist.slice().reverse().map(byId).filter(Boolean);
  return h('section', { class: 'stack' },
    poss.length > 1 ? seg('Posición', [['', 'Cualquiera'], ...poss.map((x) => [x, POSITION_NAME[x]])], o.pos, (v) => set({ pos: v })) : null,
    h('div', { class: 'panel az-dado' }, dieBox, nameBox, btn,
      h('p', { class: 'row-sub', style: { margin: 0, textAlign: 'center' } }, cand.length ? `Ya pasaron ${passed.length} de ${cand.length}. No se repite nadie hasta que pasen todos.` : 'No hay nadie con esos filtros.')),
    histList.length ? h('details', { class: 'panel' }, h('summary', {}, `Orden de hoy (${histList.length})`),
      h('ol', { class: 'az-hist' }, histList.map((p) => h('li', {}, p.name))),
      h('button', { type: 'button', class: 'btn sm ghost', onclick: () => set({ bag: { d: o.bag.d, ids: [], last: null, hist: [] } }) }, ic('undo-2', 16), 'Empezar de cero')) : null);
}

// ---------- equipos ----------
function equiposView(o, pool, sess, set) {
  const n = pool.list.length, k = o.k || autoK(n, o.size);
  const res = o.res && o.res.d === todayStr() ? o.res : null;
  const sizeSeg = seg('Tamaño', SIZES, o.size, (v) => set({ size: Number(v), k: 0, res: null }));
  const kNum = o.size === 1 ? h('p', { class: 'row-sub', style: { margin: 0 } }, n >= 2 ? `${plural(Math.floor(n / 2), 'duelo', 'duelos')} de ${n} jugadores${n % 2 ? '; uno espera y entra contra el que gane' : ''}.` : '')
    : o.rama === 'sep' ? null : h('div', { class: 'az-k' }, h('span', {}, 'Equipos'),
    h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Un equipo menos', disabled: k <= 2 ? true : null, onclick: () => set({ k: Math.max(2, k - 1), res: null }) }, ic('minus', 18)),
    h('strong', {}, String(k)),
    h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Un equipo más', disabled: k >= Math.min(12, Math.floor(n / 2)) ? true : null, onclick: () => set({ k: Math.min(12, k + 1), res: null }) }, ic('plus', 18)),
    h('span', { class: 'row-sub' }, n >= 2 ? perTeam(n, k, o.size) : ''));
  const arm = () => {
    if (n < 2) { toast('Hacen falta al menos 2 jugadores'); return; }
    const r = build(o, pool.list);
    if (!r.teams.length) { toast('No alcanzan para armar equipos con esos filtros'); return; }
    const box = document.querySelector('.az-result');
    if (box) box.classList.add('shuffling');
    try { navigator.vibrate?.(30); } catch { /* sin vibración */ }
    setTimeout(() => set({ res: r }), box ? 380 : 0);
  };
  const controls = h('section', { class: 'panel stack' },
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Tamaño de cada equipo'), sizeSeg),
    kNum,
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Cómo armarlos'), seg('Cómo armarlos', MODES, o.mode, (v) => set({ mode: v, res: null }))),
    o.size === 6 && o.mode !== 'azar' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.probar ? true : null, onchange: (e) => set({ probar: e.target.checked, res: null }) }),
      h('span', {}, 'Probar otras posiciones: a uno de cada tres lo pone en la posición que también juega o en una nueva, para ver otras alineaciones.')) : null,
    h('div', { class: 'cluster' }, h('button', { type: 'button', class: 'btn primary', onclick: arm }, ic('dice-5', 18), res ? 'Otra combinación' : 'Armar equipos')));
  return h('section', { class: 'stack' }, controls, res ? resultView(o, res, sess, set, arm) : note(howText(o)));
}
function perTeam(n, k, size) {
  if (k < 1) return '';
  const a = Math.floor(n / k), b = a + (n % k ? 1 : 0);
  const per = a === b ? `${a}` : `${a} o ${b}`;
  return size >= 5 && a > size ? `de ${per}: ${size} en la cancha y el resto entra de cambio` : `de ${per} cada uno`;
}
function howText(o) {
  const m = { pos: 'Parejos por posición y nivel: reparte a los colocadores, centrales, puntas, opuestos y líberos entre los equipos y deja el nivel lo más igual posible (nivel de la Ruta y su radar).',
    nivel: 'Parejos por nivel: solo cuida que el nivel quede igual, sin ver posiciones.', azar: 'Al azar total: revuelve y reparte, sin ver nivel ni posición.' }[o.mode];
  return `${m} Cada vez que tocas «Otra combinación» sale distinta. ${o.rama === 'mix' ? 'Con las dos ramas, también reparte parejo a hombres y mujeres.' : ''}`;
}

let SEL = null;   // jugador tocado para cambiarlo de equipo
const COLORS = 8;
function teamLevel(ids) { const ps = ids.map(byId).filter(Boolean); return ps.length ? ps.reduce((s, p) => s + strength(p), 0) / ps.length : 0; }

function resultView(o, res, sess, set, arm) {
  const live = res.teams.map((t) => ({ ...t, ids: t.ids.filter((id) => byId(id)) }));
  const swap = (id) => {
    if (!SEL) { SEL = id; set({}); return; }
    if (SEL === id) { SEL = null; set({}); return; }
    const a = live.findIndex((t) => t.ids.includes(SEL)), b = live.findIndex((t) => t.ids.includes(id));
    if (a === b) { SEL = id; set({}); return; }
    const teamsNew = live.map((t) => ({ ...t, ids: t.ids.map((x) => (x === SEL ? id : x === id ? SEL : x)) }));
    const roles = { ...res.roles }; [roles[SEL], roles[id]] = [roles[id], roles[SEL]];
    Object.keys(roles).forEach((x) => roles[x] === undefined && delete roles[x]);
    const names = [byId(SEL)?.name, byId(id)?.name];
    SEL = null; set({ res: { ...res, teams: teamsNew, roles } }); toast(`Cambiaste a ${names[0]} por ${names[1]}`);
  };
  const duel = res.size === 1;
  const lv = live.map((t) => teamLevel(t.ids));
  // En duelos, lo parejo es dentro de cada duelo (la diferencia entre los dos).
  const dgap = (t) => { const ps = t.ids.map(byId).filter(Boolean); return ps.length === 2 ? Math.abs(strength(ps[0]) - strength(ps[1])) : 0; };
  const gap = duel ? Math.max(0, ...live.map(dgap)) : lv.length > 1 ? Math.max(...lv) - Math.min(...lv) : 0;
  const cards = live.map((t, i) => {
    const ps = t.ids.map(byId).filter(Boolean);
    const court = res.size === 6 ? ps.filter((p) => res.roles[p.id]).sort((a, b) => [...COURT, 'libero'].indexOf(res.roles[a.id]) - [...COURT, 'libero'].indexOf(res.roles[b.id])) : ps;
    const bench = res.size === 6 ? ps.filter((p) => !res.roles[p.id]) : [];
    const row = (p, role) => {
      const r = role || p.position, own = positionsOf(p)[0] === r, also = !own && positionsOf(p).includes(r);
      return h('li', {}, h('button', { type: 'button', class: `az-p${SEL === p.id ? ' sel' : ''}`, onclick: () => swap(p.id), 'aria-label': `${p.name}: toca y luego toca a alguien de otro equipo para cambiarlos` },
        jersey(p), h('span', { class: 'az-pn' }, p.name),
        r && r !== 'sin_definir' ? h('span', { class: `chip${role && !own ? (also ? ' info' : ' warn') : ''}`, title: role && !own ? (also ? 'También la juega' : 'Posición nueva para probar') : '' }, POSITION_NAME[r] || r) : null));
    };
    const br = ['M', 'F'].map((b) => [b, ps.filter((p) => p.branch === b).length]).filter(([, c]) => c);
    if (duel) return h('div', { class: `panel az-team az-duel az-c${i % COLORS}` },
      h('div', { class: 'split' }, h('h3', {}, teamTitle(res, t)), t.wait ? null : h('span', { class: 'chip' }, `diferencia ${dgap(t).toFixed(1)}`)),
      h('ul', { class: 'plain az-list' }, ps.flatMap((p, j) => [j ? h('li', { class: 'az-vs', 'aria-hidden': 'true' }, 'vs') : null, row(p, null)])),
      t.wait ? h('div', { class: 'row-sub' }, 'Entra contra el que gane el primer duelo.') : null);
    return h('div', { class: `panel az-team az-c${i % COLORS}` },
      h('div', { class: 'split' }, h('h3', {}, teamTitle(res, t)), h('span', { class: 'chip' }, `nivel ${lv[i].toFixed(1)}`)),
      h('div', { class: 'row-sub' }, [plural(ps.length, 'jugador', 'jugadores'), br.length > 1 ? br.map(([b, c]) => `${c} ${b === 'M' ? (c === 1 ? 'hombre' : 'hombres') : (c === 1 ? 'mujer' : 'mujeres')}`).join(' · ') : null].filter(Boolean).join(' · ')),
      h('ul', { class: 'plain az-list' }, court.map((p) => row(p, res.size === 6 ? res.roles[p.id] : null))),
      bench.length ? [h('div', { class: 'row-sub az-bench' }, 'De cambio (entran rotando)'), h('ul', { class: 'plain az-list' }, bench.map((p) => row(p, null)))] : null);
  });
  const newPos = res.size === 6 ? Object.entries(res.roles).filter(([id, r]) => { const p = byId(id); return p && positionsOf(p)[0] !== r && positionsOf(p)[0] !== 'sin_definir'; }).length : 0;
  const text = shareTextOf(res, live, sess);
  return h('section', { class: 'stack az-result' },
    duel ? h('div', { class: 'split' }, h('strong', {}, `${plural(live.filter((t) => !t.wait).length, 'duelo', 'duelos')}${res.mode === 'azar' ? '' : gap <= 0.6 ? ' · muy parejos' : gap <= 1.2 ? ' · parejos' : ' · algo disparejos'}`),
      h('span', { class: 'row-sub' }, `diferencia máxima ${gap.toFixed(1)}`))
      : h('div', { class: 'split' }, h('strong', {}, `${plural(live.length, 'equipo', 'equipos')}${live.length > 1 ? (gap <= 0.35 ? ' · muy parejos' : gap <= 0.8 ? ' · parejos' : ' · algo disparejos') : ''}`),
        live.length > 1 ? h('span', { class: 'row-sub' }, `diferencia de nivel ${gap.toFixed(1)}`) : null),
    res.size === 6 && newPos ? note(`${plural(newPos, 'jugador juega', 'jugadores juegan')} en una posición que no es la suya (marcada en otro color). Así pruebas otras alineaciones.`, 'info') : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, duel ? 'Para cambiar a dos de duelo: toca a uno y luego al otro.' : 'Para cambiar a dos de equipo: toca a uno y luego al otro.'),
    h('div', { class: 'az-teams' }, cards),
    duel ? note(duelText(live), '') : live.length >= 3 ? note(kingText(live), '') : null,
    h('div', { class: 'cluster' },
      h('button', { type: 'button', class: 'btn', onclick: () => bigTeams(res, live) }, ic('zoom-in', 18), 'Enseñar en grande'),
      h('button', { type: 'button', class: 'btn', onclick: () => shareText(text) }, ic('share-2', 18), 'Compartir'),
      sess ? h('button', { type: 'button', class: 'btn', onclick: () => saveToNotes(sess, text) }, ic('notebook-pen', 18), 'Guardar en el entreno') : null,
      h('button', { type: 'button', class: 'btn ghost', onclick: arm }, ic('refresh-cw', 18), 'Otra combinación')));
}
// v3.20: el título de cada tarjeta (equipo, duelo o el que espera).
const teamTitle = (res, t) => (res.size !== 1 ? `Equipo ${t.name}` : t.wait ? `${t.name.replace(/espera$/, '').trim() ? `${t.name.replace(/\s*espera$/, '')} · ` : ''}Espera` : `Duelo ${t.name}`);
function duelText(live) {
  const n = live.filter((t) => !t.wait).length;
  return `Duelos de 1 vs 1: en media cancha angosta (unos 3 m de ancho), a 5 puntos o 3 minutos.${n >= 2 ? ' Luego los ganadores juegan entre ellos y los que perdieron entre ellos, para que sigan parejos.' : ''}${live.some((t) => t.wait) ? ' El que espera entra contra el que gane el primer duelo.' : ''}`;
}
function kingText(live) {
  const L = live.map((t) => t.name);
  return `Cascarita «rey de la cancha»: empiezan ${L[0]} contra ${L[1]}; el que gana se queda y entra ${L[2]}${L.length > 3 ? `, luego ${L.slice(3).join(', ')}` : ''}. Si tienes dos canchas, juegan ${L[0]} vs ${L[1]} y ${L[2]} vs ${L[3] || 'el que gane'}.`;
}
function shareTextOf(res, live, sess) {
  const lines = [`${res.size === 1 ? 'Duelos' : 'Equipos'}${sess ? ` · ${sess.title || 'Entrenamiento'}` : ''} (${SIZES.find(([s]) => s === res.size)?.[1] || ''})`];
  live.forEach((t) => {
    const ps = t.ids.map(byId).filter(Boolean);
    if (res.size === 1) { lines.push(`${teamTitle(res, t)}: ${ps.map((p) => p.name).join(' vs ')}`); return; }
    lines.push(`Equipo ${t.name}: ${ps.map((p) => `${p.name}${res.size === 6 && res.roles[p.id] ? ` (${POSITION_NAME[res.roles[p.id]]})` : res.size === 6 ? ' (cambio)' : ''}`).join(', ')}`);
  });
  return lines.join('\n');
}
async function saveToNotes(sess, text) {
  const cur = (getSession(sess.id)?.notes || '').trim();
  const next = cur ? `${cur}\n\n${text}` : text;
  if (next.length > NOTES_MAX) {
    if (!(await confirmSheet({ title: 'No cabe completo', text: `Las notas del entreno aceptan ${NOTES_MAX} letras y con los equipos serían ${next.length}. ¿Reemplazo las notas por los equipos?`, ok: 'Reemplazar notas', danger: true }))) return;
    patch('sessions', sess.id, { notes: text.slice(0, NOTES_MAX) }); toast('Equipos guardados en las notas del entreno'); return;
  }
  patch('sessions', sess.id, { notes: next }); toast('Equipos guardados en las notas del entreno');
}

// Pantalla completa para enseñarle los equipos a todos.
function bigTeams(res, live) {
  const returnTo = document.activeElement, root = document.getElementById('root');
  const close = () => { document.removeEventListener('keydown', onKey); try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* nada */ } ov.remove(); if (root) root.inert = false; try { returnTo?.focus(); } catch { /* nada */ } };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const ov = h('div', { class: 'az-big', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Equipos en grande' },
    h('div', { class: 'az-big-top' }, h('strong', {}, res.size === 1 ? 'Duelos' : 'Equipos'), h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Cerrar', onclick: close }, ic('x', 28))),
    h('div', { class: `az-big-grid n${Math.min(live.length, 4)}` }, live.map((t, i) => h('div', { class: `az-big-t az-c${i % COLORS}` }, h('h2', {}, teamTitle(res, t)),
      h('ol', {}, t.ids.map(byId).filter(Boolean).map((p) => h('li', {}, h('span', {}, p.jersey != null ? `${p.jersey} · ${p.name}` : p.name),
        res.size === 6 ? h('small', {}, res.roles[p.id] ? POSITION_NAME[res.roles[p.id]] : 'cambio') : null)))))));
  document.addEventListener('keydown', onKey);
  document.body.append(ov); if (root) root.inert = true;
  try { ov.requestFullscreen?.().catch(() => {}); } catch { /* sin pantalla completa */ }
}

// Botón para otras pantallas (Hoy, el entrenamiento).
export const azarButton = (sid, cls = 'btn') => h('a', { class: cls, href: sid ? `#/azar/${sid}` : '#/azar' }, ic('dice-5', 18), 'Azar y equipos');
