// Entrar y salir: entrenador (correo y contraseña), jugador (código) o modo demo.
import { client, cloudConfigured, friendly } from './cloud.js';
import { state, beginDemo, beginCloud, refresh, clearLocal, ls, MODE_KEY, add, group, flush, pendingCount, resetDemo } from './store.js';
import { makeDemoData } from './demo.js';
import { cleanCode } from './util.js';

const LAST_KEY = 'remate.last';

async function ensureGroup() {
  if (state.role !== 'coach' || group() || state.lastError) return;
  add('groups', { name: 'Mi equipo', settings: { days: [2, 4], start: '17:00', minutes: 90, late_per_absence: 3 } });
}

// Con correo puede ser entrenador o asistente: es asistente si tiene una invitación activa y no tiene equipo propio.
async function roleOf(user) {
  if (user.is_anonymous) return 'player';
  try {
    const c = await client();
    const [own, inv] = await Promise.all([
      c.from('groups').select('id').eq('owner_id', user.id).limit(1),
      c.from('staff').select('id').eq('user_id', user.id).eq('active', true).limit(1),
    ]);
    if (own.error) throw own.error;
    if (own.data?.length) return 'coach';
    if (!inv.error && inv.data?.length) return 'assistant';
    return 'coach';
  } catch {
    // Sin conexión: el último papel con el que entró en este celular.
    try { const last = JSON.parse(ls.get(LAST_KEY) || 'null'); if (last?.id === user.id && last.role) return last.role; } catch { /* nada */ }
    return 'coach';
  }
}

async function startFrom(user, known) {
  const role = known || await roleOf(user);
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
      const role = await roleOf(user);
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

// Asistente adulto: entra (o crea su cuenta) con correo y usa el código de invitación de su entrenador.
export async function assistantJoin(email, password, raw, { signup = false } = {}) {
  const code = cleanCode(raw);
  if (code.length !== 6) throw new Error('El código de invitación tiene 6 caracteres.');
  const c = await client();
  clearLocal();
  const r = signup ? await c.auth.signUp({ email: String(email).trim(), password }) : await c.auth.signInWithPassword({ email: String(email).trim(), password });
  if (r.error) throw new Error(friendly(r.error));
  if (!r.data.session) { const e = new Error('Cuenta creada. Confirma tu correo con el enlace que te enviamos y luego entra con tu código.'); e.info = true; throw e; }
  const { data, error } = await c.rpc('join_staff', { p_code: code });
  if (error || !data?.length) {
    await c.auth.signOut();
    throw new Error(error ? friendly(error) : 'Ese código de invitación no existe o ya lo usó otra persona. Pídele uno nuevo a tu entrenador.');
  }
  await startFrom(r.data.session.user, 'assistant');
}
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
