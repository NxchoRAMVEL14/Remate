// Datos de la app: estado en memoria + guardado local (demo) o nube con cola de envío (sin internet).
import { uid, newJoinCode, todayStr } from './util.js';
import { client, fetchAll, isNetworkError, friendly } from './cloud.js';

export const TABLES = {
  groups: 'groups', players: 'players', sessions: 'sessions', attendance: 'attendance', ratings: 'ratings',
  exams: 'level_exams', claims: 'challenge_claims', notes: 'player_notes', customEx: 'custom_exercises',
};
export const KEYS = Object.keys(TABLES);
const emptyData = () => Object.fromEntries(KEYS.map((k) => [k, []]));

export const state = {
  ready: false, mode: null,          // 'demo' | 'cloud'
  role: null,                        // 'coach' | 'player'
  user: null, email: '', me: null,   // me = fila del jugador cuando entra con código
  viewAs: null,                      // id de jugador que el entrenador está previsualizando
  data: emptyData(), pending: 0, online: true, lastError: null,
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
};

// ---------- operaciones ----------
const find = (key, id) => state.data[key].find((r) => r.id === id);
function ownerId() { return state.role === 'player' ? (state.me?.owner_id || state.user?.id) : state.user?.id; }

export function add(key, row) {
  const full = { id: uid(), owner_id: ownerId(), ...DEFAULTS[key](), ...row };
  if (key !== 'claims') full.created_at = full.created_at || new Date().toISOString();
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
  if (key === 'players') for (const k of ['attendance', 'ratings', 'exams', 'claims', 'notes']) d[k] = d[k].filter((r) => r.player_id !== id);
  if (key === 'sessions') d.attendance = d.attendance.filter((r) => r.session_id !== id);
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

// ---------- guardado ----------
let demoTimer;
function saveDemo() { ls.set(DEMO_KEY, JSON.stringify({ v: 1, data: state.data })); }
function scheduleDemoSave() { clearTimeout(demoTimer); demoTimer = setTimeout(saveDemo, 250); }
addEventListener('pagehide', () => { if (state.mode === 'demo') saveDemo(); });

function saveCache() { if (state.user) ls.set(cacheKey(), JSON.stringify(state.data)); }
function saveOutbox() { ls.set(outKey(), JSON.stringify(outbox)); state.pending = outbox.length; }

function persist(op) {
  if (state.mode === 'demo') { scheduleDemoSave(); return; }
  outbox.push(op); saveOutbox(); saveCache();
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
    const keys = KEYS.filter((k) => state.role === 'coach' || k !== 'notes');
    const res = await Promise.all(keys.map((k) => fetchAll(TABLES[k])));
    const next = emptyData(); keys.forEach((k, i) => { next[k] = res[i]; });
    state.data = next; state.online = true;
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
  Object.assign(state, { ready: false, mode: null, role: null, user: null, email: '', me: null, viewAs: null, data: emptyData(), pending: 0, lastError: null });
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
