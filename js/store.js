// Datos de la app: estado en memoria + guardado local (demo) o nube con cola de envío (sin internet).
import { uid, newJoinCode, todayStr } from './util.js';
import { client, fetchAll, isNetworkError, friendly } from './cloud.js';

export const TABLES = {
  groups: 'groups', players: 'players', sessions: 'sessions', attendance: 'attendance', ratings: 'ratings',
  exams: 'level_exams', claims: 'challenge_claims', notes: 'player_notes', customEx: 'custom_exercises',
  // fase 2: partidos y laboratorio
  matches: 'matches', matchLogs: 'match_logs', matchStats: 'match_stats', coachProfile: 'coach_profile', jumpTests: 'jump_tests',
  jumpSessions: 'jump_sessions', coachLogs: 'coach_logs', coachAssess: 'coach_assessments', decisions: 'decision_attempts',
  // fase 3: entrenamiento en casa y mejoras de la app
  homeLogs: 'home_logs', ideas: 'app_ideas',
};
export const KEYS = Object.keys(TABLES);
// Lo que solo ve el entrenador (el jugador ni lo pide) y lo que llegó con la fase 2 (puede faltar si aún no corren el SQL nuevo).
const COACH_ONLY = new Set(['notes', 'matchLogs', 'coachProfile', 'jumpTests', 'jumpSessions', 'coachLogs', 'coachAssess', 'decisions', 'ideas']);
const PHASE2 = new Set(['matches', 'matchLogs', 'matchStats', 'coachProfile', 'jumpTests', 'jumpSessions', 'coachLogs', 'coachAssess', 'decisions']);
const PHASE3 = new Set(['homeLogs', 'ideas']);
const isMissingTable = (e) => e?.code === 'PGRST205' || e?.code === '42P01' || /could not find the table|schema cache|does not exist/i.test(e?.message || '');
const emptyData = () => Object.fromEntries(KEYS.map((k) => [k, []]));

export const state = {
  ready: false, mode: null,          // 'demo' | 'cloud'
  role: null,                        // 'coach' | 'player'
  user: null, email: '', me: null,   // me = fila del jugador cuando entra con código
  viewAs: null,                      // id de jugador que el entrenador está previsualizando
  data: emptyData(), pending: 0, online: true, lastError: null,
  lab: true,                         // false si la base de datos aún no tiene las tablas de la fase 2
  casa: true,                        // false si aún no tiene las de la fase 3 (en casa y mejoras)
};

// ---------- almacenamiento seguro ----------
export const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nada */ } },
  keys() { try { return Object.keys(localStorage); } catch { return []; } },
};
export const DEMO_KEY = 'remate.demo.v1';
export const MODE_KEY = 'remate.mode';
const cacheKey = () => `remate.cache.${state.user?.id}`;
const outKey = () => `remate.outbox.${state.user?.id}`;
let outbox = [];

const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }

// ---------- valores por defecto ----------
const DEFAULTS = {
  groups: () => ({ name: 'Mi equipo', settings: {} }),
  players: () => ({ level: 1, position: 'sin_definir', active: true, join_code: newJoinCode(), branch: null, hand: null,
                    height_cm: null, jersey: null, consent_at: null, user_id: null, joined_at: null }),
  sessions: () => ({ status: 'planeada', plan: [], focus: [], notes: '', title: '', published: false, minutes: 90, start_time: null }),
  attendance: () => ({ note: '' }),
  ratings: () => ({ note: '', rated_at: todayStr() }),
  exams: () => ({ results: {}, note: '', taken_at: todayStr() }),
  claims: () => ({ status: 'solicitada', note: '', resolved_at: null, claimed_at: new Date().toISOString() }),
  notes: () => ({}),
  customEx: () => ({}),
  matches: () => ({ sets: [], status: 'en_juego', kind: 'amistoso', best_of: 3, venue: '', note: '', match_date: todayStr() }),
  matchLogs: () => ({ log: [] }),
  matchStats: () => ({ counts: {} }),
  coachProfile: () => ({ data: {} }),
  jumpTests: () => ({ attempts: [], note: '', test_date: todayStr() }),
  jumpSessions: () => ({ blocks: [], contacts: 0, note: '', session_date: todayStr() }),
  coachLogs: () => ({ worked: '', change: '', note: '', log_date: todayStr(), kind: 'entrenamiento' }),
  coachAssess: () => ({ scores: {}, goal: '', note: '', assessed_on: todayStr() }),
  decisions: () => ({}),
  homeLogs: () => ({ done_on: todayStr(), kind: 'rutina', note: '', minutes: null, feeling: null }),
  ideas: () => ({ body: '', area: 'otra', priority: 'media', status: 'idea', done_at: null }),
};
const NO_CREATED_AT = new Set(['claims', 'coachProfile']);   // esas tablas no tienen la columna created_at

// ---------- operaciones ----------
const find = (key, id) => state.data[key].find((r) => r.id === id);
function ownerId() { return state.role === 'player' ? (state.me?.owner_id || state.user?.id) : state.user?.id; }

export function add(key, row) {
  const full = { id: uid(), owner_id: ownerId(), ...DEFAULTS[key](), ...row };
  if (!NO_CREATED_AT.has(key)) full.created_at = full.created_at || new Date().toISOString();
  state.data[key].push(full);
  persist({ op: 'add', key, row: structuredClone(full) });
  emit();
  return full;
}
export function patch(key, id, changes) {
  const r = find(key, id); if (!r) return null;
  Object.assign(r, changes);
  persist({ op: 'patch', key, id, changes: structuredClone(changes) });
  emit();
  return r;
}
export function remove(key, id) {
  state.data[key] = state.data[key].filter((r) => r.id !== id);
  const d = state.data;
  if (key === 'players') for (const k of ['attendance', 'ratings', 'exams', 'claims', 'notes', 'matchStats', 'homeLogs']) d[k] = d[k].filter((r) => r.player_id !== id);
  if (key === 'sessions') { d.attendance = d.attendance.filter((r) => r.session_id !== id); d.coachLogs.forEach((r) => { if (r.session_id === id) r.session_id = null; }); }
  if (key === 'matches') { for (const k of ['matchLogs', 'matchStats']) d[k] = d[k].filter((r) => r.match_id !== id); d.coachLogs.forEach((r) => { if (r.match_id === id) r.match_id = null; }); }
  persist({ op: 'remove', key, id });
  emit();
}

// ---------- atajos del dominio ----------
export function setAttendance(sessionId, playerId, status) {
  const ex = state.data.attendance.find((a) => a.session_id === sessionId && a.player_id === playerId);
  if (!status) { if (ex) remove('attendance', ex.id); return; }
  if (ex) { if (ex.status !== status) patch('attendance', ex.id, { status }); }
  else add('attendance', { session_id: sessionId, player_id: playerId, status });
}
export const rate = (playerId, skill, score, note = '') => add('ratings', { player_id: playerId, skill, score, note });
export const resolveClaim = (id, ok) => patch('claims', id, { status: ok ? 'aprobada' : 'rechazada', resolved_at: new Date().toISOString() });
export function recordExam(playerId, level, passed, results, note = '') {
  const e = add('exams', { player_id: playerId, level, passed, results, note });
  if (passed) patch('players', playerId, { level });
  return e;
}

// ---------- accesos de lectura ----------
export const group = () => state.data.groups[0] || null;
export function settings() {
  return { days: [2, 4], start: '17:00', minutes: 90, late_per_absence: 3, season: '', ...(group()?.settings || {}) };
}
export const saveSettings = (changes) => { const g = group(); if (g) patch('groups', g.id, { settings: { ...settings(), ...changes } }); };
const byName = (a, b) => a.name.localeCompare(b.name, 'es');
export const players = () => state.data.players.filter((p) => p.active !== false).sort(byName);
export const getPlayer = (id) => find('players', id);
export const getSession = (id) => find('sessions', id);
export const sessions = () => [...state.data.sessions].sort((a, b) => `${a.session_date}${a.start_time || ''}`.localeCompare(`${b.session_date}${b.start_time || ''}`));
export const pendingClaims = () => state.data.claims.filter((c) => c.status === 'solicitada');

// ---------- fase 2: laboratorio y partidos ----------
// En la nube, las pantallas nuevas solo guardan si ya corriste el SQL actualizado.
export const labReady = () => state.mode !== 'cloud' || state.lab;
export const casaReady = () => state.mode !== 'cloud' || state.casa;
export const profileRow = () => state.data.coachProfile[0] || null;
export const profile = () => profileRow()?.data || {};
export function saveProfile(changes) {
  const r = profileRow(), data = { ...(r?.data || {}), ...changes };
  if (r) return patch('coachProfile', r.id, { data, updated_at: new Date().toISOString() });
  return add('coachProfile', { data });
}

// ---------- guardado ----------
let demoTimer;
function saveDemo() { ls.set(DEMO_KEY, JSON.stringify({ v: 1, data: state.data })); }
function scheduleDemoSave() { clearTimeout(demoTimer); demoTimer = setTimeout(saveDemo, 250); }
addEventListener('pagehide', () => { if (state.mode === 'demo') saveDemo(); });

function saveCache() { if (state.user) ls.set(cacheKey(), JSON.stringify(state.data)); }
function saveOutbox() { ls.set(outKey(), JSON.stringify(outbox)); state.pending = outbox.length; }

function persist(op) {
  if (state.mode === 'demo') { scheduleDemoSave(); return; }
  // Varios cambios a la misma fila se juntan en uno (captura en vivo, minutos que se ajustan...).
  // Se busca hacia atrás saltando solo cambios a otras filas; si en medio hay un alta o un borrado, no se junta.
  let merged = false;
  if (op.op === 'patch') {
    const stop = flushing ? 1 : 0;                       // el primero de la cola puede estar enviándose
    for (let i = outbox.length - 1; i >= stop; i--) {
      const q = outbox[i];
      const same = q.key === op.key && (q.op === 'add' ? q.row.id === op.id : q.id === op.id);
      if (same) {
        if (q.op === 'patch') { Object.assign(q.changes, op.changes); merged = true; }
        else if (q.op === 'add') { Object.assign(q.row, op.changes); merged = true; }
        break;
      }
      if (q.op !== 'patch') break;
    }
  }
  if (!merged) outbox.push(op);
  saveOutbox(); saveCache();
  flush();
}

// ---------- sincronización con la nube ----------
async function applyOp(op) {
  const c = await client();
  const t = TABLES[op.key];
  if (op.op === 'add') {
    let { error } = await c.from(t).insert(op.row);
    if (error?.code === '23505') {
      const info = `${error.message} ${error.details || ''}`;
      if (/_pkey|\(id\)=/.test(info)) error = null;                                       // ya estaba guardado
      else if (op.key === 'players' && /join_code/.test(info)) {                          // código repetido: otro
        op.row.join_code = newJoinCode();
        const local = find('players', op.row.id); if (local) local.join_code = op.row.join_code;
        ({ error } = await c.from(t).insert(op.row));
      } else if (op.key === 'attendance') {                                               // ya había asistencia de ese día
        ({ error } = await c.from(t).update({ status: op.row.status, note: op.row.note })
          .eq('session_id', op.row.session_id).eq('player_id', op.row.player_id));
      } else if (op.key === 'matchStats') {                                               // ya había estadística de ese jugador y partido
        ({ error } = await c.from(t).update({ counts: op.row.counts }).eq('match_id', op.row.match_id).eq('player_id', op.row.player_id));
      } else if (op.key === 'coachProfile') {                                             // ya existía tu perfil (otro celular)
        ({ error } = await c.from(t).update({ data: op.row.data }).eq('owner_id', op.row.owner_id));
      }
    }
    return error;
  }
  if (op.op === 'patch') return (await c.from(t).update(op.changes).eq('id', op.id)).error;
  if (op.op === 'remove') return (await c.from(t).delete().eq('id', op.id)).error;
  return null;
}

let flushing = false;
export async function flush() {
  if (state.mode !== 'cloud' || flushing) return;
  flushing = true;
  let dropped = false;
  try {
    while (outbox.length) {
      let err;
      try { err = await applyOp(outbox[0]); } catch (e) { err = e; }
      if (!err) { outbox.shift(); saveOutbox(); state.online = true; continue; }
      if (isNetworkError(err)) { state.online = false; break; }
      if (err.status === 401 || /jwt/i.test(err.message || '')) { state.lastError = 'Tu sesión caducó. Vuelve a entrar.'; break; }
      console.warn('Cambio rechazado por el servidor', outbox[0], err);
      state.lastError = friendly(err); outbox.shift(); saveOutbox(); dropped = true;
    }
  } finally { flushing = false; state.pending = outbox.length; emit(); }
  if (dropped) refresh();
}

export async function refresh() {
  if (state.mode !== 'cloud') return false;
  await flush();
  if (outbox.length) return false;                      // no pisar cambios que aún no se envían
  try {
    const keys = KEYS.filter((k) => state.role === 'coach' || !COACH_ONLY.has(k));
    let missing = false, missing3 = false;
    const res = await Promise.all(keys.map(async (k) => {
      try { return await fetchAll(TABLES[k]); }
      catch (e) {
        if (PHASE2.has(k) && isMissingTable(e)) { missing = true; return []; }
        if (PHASE3.has(k) && isMissingTable(e)) { missing3 = true; return []; }
        throw e;
      }
    }));
    const next = emptyData(); keys.forEach((k, i) => { next[k] = res[i]; });
    state.data = next; state.online = true; state.lab = !missing; state.casa = !missing3;
    if (state.role === 'player') state.me = next.players.find((p) => p.user_id === state.user.id) || next.players[0] || null;
    saveCache(); emit();
    return true;
  } catch (e) {
    if (isNetworkError(e)) state.online = false; else state.lastError = friendly(e);
    emit(); return false;
  }
}
addEventListener('online', () => { if (state.mode === 'cloud') refresh(); });
addEventListener('offline', () => { state.online = false; emit(); });

// ---------- arranque de cada modo (los usa auth.js) ----------
export function beginDemo(seedFn) {
  state.mode = 'demo'; state.role = 'coach'; state.user = { id: 'demo' }; state.email = '';
  const raw = ls.get(DEMO_KEY);
  let data = null;
  try { data = raw ? JSON.parse(raw).data : null; } catch { data = null; }
  state.data = { ...emptyData(), ...(data || seedFn()) };
  ls.set(MODE_KEY, 'demo');
  if (!data) saveDemo();
  state.ready = true; emit();
}
export function resetDemo(seedFn) { state.data = { ...emptyData(), ...seedFn() }; saveDemo(); emit(); }

export function beginCloud({ user, role }) {
  state.mode = 'cloud'; state.role = role; state.user = user; state.email = user.email || '';
  try { outbox = JSON.parse(ls.get(outKey()) || '[]'); } catch { outbox = []; }
  state.pending = outbox.length;
  try { const c = JSON.parse(ls.get(cacheKey()) || 'null'); if (c) state.data = { ...emptyData(), ...c }; } catch { /* sin caché */ }
  if (role === 'player') state.me = state.data.players.find((p) => p.user_id === user.id) || null;
  state.ready = true; emit();
}
export function clearLocal() {
  for (const k of ls.keys()) if (k.startsWith('remate.cache.') || k.startsWith('remate.outbox.')) ls.del(k);
  ls.del(MODE_KEY);
  outbox = [];
  Object.assign(state, { ready: false, mode: null, role: null, user: null, email: '', me: null, viewAs: null, data: emptyData(), pending: 0, lastError: null, lab: true, casa: true });
}
export const pendingCount = () => outbox.length;

// ---------- respaldo ----------
export const exportBackup = () => JSON.stringify({ app: 'remate', version: 1, exported_at: new Date().toISOString(), mode: state.mode, data: state.data }, null, 1);
export function importBackup(text) {
  const j = JSON.parse(text);
  if (j?.app !== 'remate' || !j.data) throw new Error('Este archivo no es un respaldo de Remate.');
  if (state.mode !== 'demo') throw new Error('Restaurar solo está disponible en modo demo.');
  state.data = { ...emptyData(), ...j.data }; saveDemo(); emit();
}
