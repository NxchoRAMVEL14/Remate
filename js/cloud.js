// Conexión con Supabase: carga del cliente, errores en español y lectura paginada.
import { CONFIG } from '../config.js';

let sb = null;
let loading = null;

export const cloudConfigured = () =>
  !!(CONFIG?.SUPABASE_URL && CONFIG?.SUPABASE_ANON_KEY) && /^https?:\/\//.test(CONFIG.SUPABASE_URL);

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src));
    document.head.append(s);
  });
}

export async function client() {
  if (sb) return sb;
  loading ||= (async () => {
    if (!globalThis.supabase?.createClient) await loadScript('vendor/supabase.js');
    sb = globalThis.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'remate.auth' },
    });
    return sb;
  })();
  return loading;
}

export function isNetworkError(e) {
  if (!e) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(e.message || e);
  return !e.status && !e.code ? /fetch|network|load failed|timeout|abort/i.test(msg) : (e.status === 0 || /failed to fetch|networkerror|load failed/i.test(msg));
}

const MAP = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/user already registered|already been registered/i, 'Ese correo ya tiene cuenta. Entra con tu contraseña.'],
  [/email not confirmed/i, 'Falta confirmar tu correo. Revisa tu bandeja y vuelve a entrar.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/unable to validate email|invalid format|invalid email/i, 'Revisa que el correo esté bien escrito.'],
  [/anonymous sign-ins are disabled/i, 'Falta activar "Anonymous sign-ins" en Supabase (Authentication → Sign In / Providers).'],
  [/too_many_attempts/i, 'Demasiados intentos con código equivocado. Espera 10 minutos.'],
  [/rate limit|too many requests|over_request_rate_limit/i, 'Demasiados intentos. Espera unos minutos.'],
  [/not_authenticated/i, 'Tu sesión no es válida. Vuelve a entrar.'],
];
export function friendly(e) {
  const msg = String(e?.message || e || 'Error desconocido');
  if (isNetworkError(e)) return 'Sin conexión. Inténtalo de nuevo cuando tengas internet.';
  for (const [re, text] of MAP) if (re.test(msg)) return text;
  return msg;
}

// Lee una tabla completa de mil en mil (Supabase devuelve máximo 1000 filas por petición).
export async function fetchAll(table) {
  const c = await client();
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await c.from(table).select('*').order('id').range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
