// Entrar y salir: entrenador (correo y contraseña), jugador (código) o modo demo.
import { client, cloudConfigured, friendly } from './cloud.js';
import { state, beginDemo, beginCloud, refresh, clearLocal, ls, MODE_KEY, add, group, flush, pendingCount, resetDemo } from './store.js';
import { makeDemoData } from './demo.js';
import { cleanCode } from './util.js';

const LAST_KEY = 'remate.last';

async function ensureGroup() {
  if (state.role !== 'coach' || group()) return;
  add('groups', { name: 'Mi equipo', settings: { days: [2, 4], start: '17:00', minutes: 90, late_per_absence: 3 } });
}

async function startFrom(user) {
  const role = user.is_anonymous ? 'player' : 'coach';
  ls.set(MODE_KEY, 'cloud');
  ls.set(LAST_KEY, JSON.stringify({ id: user.id, email: user.email || '', role }));
  beginCloud({ user, role });
  await refresh();
  await ensureGroup();
}

// Decide qué pantalla mostrar al abrir: 'app' o 'gate' (entrada).
export async function boot() {
  if (ls.get(MODE_KEY) === 'demo') { beginDemo(makeDemoData); return 'app'; }
  if (!cloudConfigured()) return 'gate';
  try {
    const c = await client();
    const { data } = await c.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      const role = user.is_anonymous ? 'player' : 'coach';
      ls.set(LAST_KEY, JSON.stringify({ id: user.id, email: user.email || '', role }));
      beginCloud({ user, role });
      const hadData = state.data.groups.length || state.data.players.length;
      if (hadData) { refresh().then(ensureGroup); } else { await refresh(); await ensureGroup(); }
      return 'app';
    }
  } catch { /* sin conexión: probamos con lo último guardado */ }
  if (navigator.onLine === false) {
    try {
      const last = JSON.parse(ls.get(LAST_KEY) || 'null');
      if (last?.id) { beginCloud({ user: { id: last.id, email: last.email, is_anonymous: last.role === 'player' }, role: last.role }); return 'app'; }
    } catch { /* nada */ }
  }
  return 'gate';
}

export function startDemo() { beginDemo(makeDemoData); }
export function restartDemo() { resetDemo(makeDemoData); }

export async function coachSignIn(email, password) {
  const c = await client();
  clearLocal();
  const { data, error } = await c.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error) throw new Error(friendly(error));
  await startFrom(data.session.user);
}

export async function coachSignUp(email, password) {
  const c = await client();
  clearLocal();
  const { data, error } = await c.auth.signUp({ email: String(email).trim(), password });
  if (error) throw new Error(friendly(error));
  if (!data.session) return { needsConfirm: true };
  await startFrom(data.session.user);
  return { needsConfirm: false };
}

export async function playerJoin(raw) {
  const code = cleanCode(raw);
  if (code.length !== 6) throw new Error('El código tiene 6 caracteres.');
  const c = await client();
  let { data: { session } } = await c.auth.getSession();
  if (!session || !session.user.is_anonymous) {
    if (session) await c.auth.signOut();
    clearLocal();
    const r = await c.auth.signInAnonymously();
    if (r.error) throw new Error(friendly(r.error));
    session = r.data.session;
  }
  const { data, error } = await c.rpc('join_with_code', { p_code: code });
  if (error) throw new Error(friendly(error));
  if (!data || !data.length) throw new Error('Ese código no existe. Revísalo con tu entrenador.');
  await startFrom(session.user);
}

// Sale de la cuenta. Si quedan cambios sin enviar, avisa (blocked) a menos que force sea true.
export async function leave({ force = false } = {}) {
  if (state.mode === 'cloud') {
    await flush();
    if (pendingCount() && !force) return { blocked: true, pending: pendingCount() };
    try { const c = await client(); await c.auth.signOut(); } catch { /* sin conexión */ }
    ls.del(LAST_KEY);
  }
  clearLocal();
  return { ok: true };
}
