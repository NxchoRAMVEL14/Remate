// Cálculos de partidos (puros, sin pantalla): marcador desde el registro, estadística por jugador y del equipo.
// Registro: [{ id, set, p: id de jugador o null, a: acción, pt: 'us' | 'them' | null }]. 'set_end' cierra el set en curso.

// pt: a quién le da el punto cuando el marcador automático está encendido.
export const ACTIONS = {
  sv_ace: { g: 'sv', label: 'Ace', tone: 'ok', pt: 'us' },
  sv_in: { g: 'sv', label: 'Dentro', tone: '' },
  sv_err: { g: 'sv', label: 'Error', tone: 'bad', pt: 'them' },
  rc_3: { g: 'rc', label: 'Perfecta', short: '3', tone: 'ok' },
  rc_2: { g: 'rc', label: 'Buena', short: '2', tone: '' },
  rc_1: { g: 'rc', label: 'Mala', short: '1', tone: 'warn' },
  rc_0: { g: 'rc', label: 'Error', short: '0', tone: 'bad', pt: 'them' },
  at_k: { g: 'at', label: 'Punto', tone: 'ok', pt: 'us' },
  at_in: { g: 'at', label: 'En juego', tone: '' },
  at_err: { g: 'at', label: 'Error', tone: 'bad', pt: 'them' },
  at_blk: { g: 'at', label: 'Bloqueado', tone: 'bad', pt: 'them' },
  bk_pt: { g: 'bk', label: 'Punto', tone: 'ok', pt: 'us' },
  bk_tch: { g: 'bk', label: 'Toque', tone: '' },
  bk_err: { g: 'bk', label: 'Error', tone: 'bad', pt: 'them' },
  dg_ok: { g: 'dg', label: 'Buena', tone: 'ok' },
  dg_err: { g: 'dg', label: 'Error', tone: 'bad', pt: 'them' },
  // sin jugador
  opp_err: { g: 'tm', label: 'Error del rival', tone: 'ok', pt: 'us' },
  opp_pt: { g: 'tm', label: 'Punto del rival', tone: 'bad', pt: 'them' },
  pt_us: { g: 'tm', label: '+1 nuestro', tone: 'ok', pt: 'us' },
  pt_them: { g: 'tm', label: '+1 rival', tone: 'bad', pt: 'them' },
};
export const GROUPS = { sv: 'Saque', rc: 'Recepción', at: 'Ataque', bk: 'Bloqueo', dg: 'Defensa' };
export const KINDS = { amistoso: 'Amistoso', liga: 'Liga', torneo: 'Torneo', entrenamiento: 'Partido de práctica' };
export const STAT_KEYS = Object.keys(ACTIONS).filter((k) => ACTIONS[k].g !== 'tm');

export const setsToWin = (bestOf) => Math.ceil((bestOf || 3) / 2);
export const setTarget = (idx, bestOf) => (idx === (bestOf || 3) - 1 ? 15 : 25);   // el set decisivo va a 15
export const setDone = (s, target) => Math.max(s.us, s.them) >= target && Math.abs(s.us - s.them) >= 2;

// Marcador completo a partir del registro.
export function score(log = [], bestOf = 3) {
  const sets = [{ us: 0, them: 0 }];
  let won = { us: 0, them: 0 };
  for (const e of log) {
    const cur = sets[sets.length - 1];
    if (e.a === 'set_end') {
      if (cur.us !== cur.them) won = { ...won, [cur.us > cur.them ? 'us' : 'them']: won[cur.us > cur.them ? 'us' : 'them'] + 1 };
      sets.push({ us: 0, them: 0 });
    } else if (e.pt === 'us' || e.pt === 'them') cur[e.pt]++;
  }
  const idx = sets.length - 1, cur = sets[idx], target = setTarget(idx, bestOf);
  const over = won.us >= setsToWin(bestOf) || won.them >= setsToWin(bestOf);
  return { sets, idx, cur, target, won, over, canClose: !over && setDone(cur, target) };
}
// Lo que se guarda en matches.sets: los sets jugados (sin el vacío que abre el último set_end).
export const storedSets = (sc) => sc.sets.filter((s, i) => i < sc.idx || s.us || s.them).map((s) => ({ us: s.us, them: s.them }));

export function countsFor(log = [], playerId) {
  const c = {};
  for (const e of log) if (e.p === playerId && ACTIONS[e.a] && ACTIONS[e.a].g !== 'tm') c[e.a] = (c[e.a] || 0) + 1;
  return c;
}
export const playersIn = (log = []) => [...new Set(log.map((e) => e.p).filter(Boolean))];

export function addCounts(...list) {
  const c = {};
  for (const x of list) for (const [k, v] of Object.entries(x || {})) c[k] = (c[k] || 0) + (Number(v) || 0);
  return c;
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
// Indicadores a partir de los conteos. Eficiencia de ataque = (puntos − errores − bloqueados) / intentos.
export function metrics(c = {}) {
  const g = (k) => Number(c[k]) || 0;
  const serves = g('sv_ace') + g('sv_in') + g('sv_err');
  const recs = g('rc_3') + g('rc_2') + g('rc_1') + g('rc_0');
  const atts = g('at_k') + g('at_in') + g('at_err') + g('at_blk');
  const digs = g('dg_ok') + g('dg_err');
  return {
    serves, aces: g('sv_ace'), svErr: g('sv_err'), svIn: pct(serves - g('sv_err'), serves),
    recs, recAvg: recs ? Math.round(((3 * g('rc_3') + 2 * g('rc_2') + g('rc_1')) / recs) * 100) / 100 : null, recPos: pct(g('rc_3') + g('rc_2'), recs), recErr: g('rc_0'),
    atts, kills: g('at_k'), atErr: g('at_err') + g('at_blk'), atEff: atts ? Math.round(((g('at_k') - g('at_err') - g('at_blk')) / atts) * 1000) / 1000 : null, killPct: pct(g('at_k'), atts),
    blocks: g('bk_pt'), blkTouch: g('bk_tch'), blkErr: g('bk_err'),
    digs, digOk: g('dg_ok'), digPct: pct(g('dg_ok'), digs),
    points: g('sv_ace') + g('at_k') + g('bk_pt'),
    errors: g('sv_err') + g('rc_0') + g('at_err') + g('at_blk') + g('bk_err') + g('dg_err'),
  };
}

// Totales del equipo y de dónde salieron los puntos.
export function teamSummary(log = []) {
  const all = addCounts(...playersIn(log).map((p) => countsFor(log, p)));
  const m = metrics(all);
  const oppErr = log.filter((e) => e.a === 'opp_err').length;
  return { counts: all, ...m, oppErr, ourPts: log.filter((e) => e.pt === 'us').length, theirPts: log.filter((e) => e.pt === 'them').length };
}

export const fmtEff = (x) => (x == null ? '—' : (x >= 0 ? '' : '−') + Math.abs(x).toFixed(3).replace(/^0/, ''));
export function result(match) {
  const sets = match.sets || [];
  const us = sets.filter((s) => s.us > s.them).length, them = sets.filter((s) => s.them > s.us).length;
  return { us, them, win: match.status === 'terminado' ? us > them : null, text: `${us}-${them}`, detail: sets.map((s) => `${s.us}-${s.them}`).join(', ') };
}

// ---------- Rotaciones, side-out y break point ----------
// Alineación por set: matches.lineups[set] = { slots: [id en zona 1, zona 2, ..., zona 6], libero, serve: 'us' | 'them' }.
// La rotación es en sentido de las manecillas: el de zona 2 pasa a zona 1 (a sacar), el de 1 a 6, etc.
export const rotate = (slots) => [slots[1], slots[2], slots[3], slots[4], slots[5], slots[0]];
export const ZONE_ORDER = { front: [4, 3, 2], back: [5, 6, 1] };     // así se ve la cancha desde tu banca, con la red arriba

// Etiqueta de la rotación: por la zona del colocador si hay uno en cancha; si no, por el número de rotaciones.
function rotKey(slots, setters, n) {
  const i = slots ? slots.findIndex((id) => setters.has(id)) : -1;
  return i >= 0 ? `C${i + 1}` : `R${(n % 6) + 1}`;
}
export const rotLabel = (k) => (k?.[0] === 'C' ? `Colocador en zona ${k.slice(1)}` : `Rotación ${k?.slice(1)}`);

// Repite el partido jugada por jugada: quién sacaba en cada rally, en qué rotación estábamos y quién lo ganó.
// players: lista con { id, position } para reconocer al colocador.
export function replay(log = [], lineups = [], players = []) {
  const setters = new Set(players.filter((p) => p.position === 'colocador').map((p) => p.id));
  let set = 0, lu = lineups?.[0], slots = lu?.slots?.length === 6 ? [...lu.slots] : null, serving = lu?.serve || null, n = 0;
  const rallies = [];
  for (const e of log) {
    if (e.a === 'set_end') { set++; lu = lineups?.[set]; slots = lu?.slots?.length === 6 ? [...lu.slots] : null; serving = lu?.serve || null; n = 0; continue; }
    if (e.a === 'sub') { if (slots) { const i = slots.indexOf(e.out); if (i >= 0) slots[i] = e.p; } continue; }
    // Si no sabemos quién saca, una acción de saque o de recepción nuestra lo dice.
    if (!serving && /^sv_/.test(e.a)) serving = 'us';
    if (!serving && /^rc_/.test(e.a)) serving = 'them';
    if (e.pt !== 'us' && e.pt !== 'them') continue;
    rallies.push({ set, serving, key: slots ? rotKey(slots, setters, n) : null, won: e.pt === 'us' });
    if (serving && e.pt !== serving && e.pt === 'us' && slots) { slots = rotate(slots); n++; }
    else if (serving && e.pt !== serving && e.pt === 'us') n++;
    serving = e.pt;                                                  // quien gana el rally saca el siguiente
  }
  return { rallies, cur: { set, slots, serving, key: slots ? rotKey(slots, setters, n) : null, libero: lu?.libero || null, lineup: lu || null } };
}

// Side-out: puntos ganados cuando recibimos. Break point: puntos ganados cuando sacamos.
export function phaseStats(rallies) {
  const rec = rallies.filter((r) => r.serving === 'them'), srv = rallies.filter((r) => r.serving === 'us');
  const pct = (a) => (a.length ? Math.round((a.filter((r) => r.won).length / a.length) * 100) : null);
  return { so: pct(rec), soN: rec.length, soW: rec.filter((r) => r.won).length, bp: pct(srv), bpN: srv.length, bpW: srv.filter((r) => r.won).length };
}
export function byRotation(rallies) {
  const m = new Map();
  for (const r of rallies) { if (!r.key) continue; const x = m.get(r.key) || []; x.push(r); m.set(r.key, x); }
  return [...m.entries()].map(([key, list]) => ({ key, n: list.length, won: list.filter((r) => r.won).length, diff: list.filter((r) => r.won).length * 2 - list.length, ...phaseStats(list) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// ---------- Mapa de saque y ataque ----------
// Zonas del rival vistas desde tu lado: arriba el fondo (1, 6, 5), abajo junto a la red (2, 3, 4).
export const RIVAL_GRID = [[1, 6, 5], [2, 3, 4]];
export const ZONE_ACTIONS = new Set(['sv_ace', 'sv_in', 'at_k', 'at_in']);
export function zoneCounts(log = [], kind = 'sv', playerId = null) {
  const c = {}; for (let z = 1; z <= 6; z++) c[z] = { n: 0, pts: 0 };
  for (const e of log) {
    if (!e.z || !e.a?.startsWith(`${kind}_`) || (playerId && e.p !== playerId)) continue;
    c[e.z].n++; if (e.a === 'sv_ace' || e.a === 'at_k') c[e.z].pts++;
  }
  return c;
}
