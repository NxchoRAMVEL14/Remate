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
