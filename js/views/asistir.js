// Asistir: lo que hace un ayudante (asistente adulto o capitán): pasar lista y capturar partidos.
// También la lista con QR (v3.7): el entrenador muestra un QR que cambia cada 20 segundos y cada jugador marca su llegada.
import { h, ic, fmtDate, todayStr, addDays, plural, toast, confirmSheet, fmtTime } from '../util.js';
import { state, group, sessions, players, isStaff, teamReady, sql37Ready, add, patch, settings, setAttendance, replaceRows, pendingCount, refresh, playerById } from '../store.js';
import { client, isNetworkError, friendly } from '../cloud.js';
import { attendanceSheet } from './sheets-session.js';
import { matchSheet, matchesSorted, resultChip } from './partidos.js';
import { sectionTitle, note, empty, sessionWhen, jersey, field, options } from './ui.js';

export default function asistir(ctx) {
  if (!isStaff()) return { title: 'Asistir', back: '#/inicio', el: h('div', { class: 'page' }, empty('Esta sección es para ayudantes', 'Tu entrenador puede nombrarte capitán para que pases lista y captures partidos.')) };
  const t = todayStr(), all = sessions();
  const marks = (s) => state.data.attendance.filter((a) => a.session_id === s.id).length;
  // Hoy primero; si no hay, el más reciente de los últimos 3 días o el siguiente.
  const today = all.filter((s) => s.session_date === t);
  const recent = all.filter((s) => s.session_date < t && s.session_date >= addDays(t, -14)).reverse().slice(0, 5);
  const upcoming = all.filter((s) => s.session_date > t && s.status === 'planeada').slice(0, 2);
  const live = matchesSorted().filter((m) => m.status !== 'terminado').reverse();
  const n = players().length;
  const sessRow = (s) => h('div', { class: 'row' },
    h('span', { class: 'row-main' }, h('strong', {}, s.title || 'Entrenamiento'), h('span', { class: 'row-sub' }, `${sessionWhen(s)} · ${marks(s) ? `lista de ${marks(s)} de ${n}` : 'sin lista'}`)),
    h('button', { class: `btn sm ${marks(s) ? '' : 'primary'}`, type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 16), marks(s) ? 'Corregir' : 'Pasar lista'));
  const who = state.role === 'assistant' ? 'asistente' : 'capitán';
  const el = h('div', { class: 'page' },
    !teamReady() ? note('Tu entrenador todavía no termina de activar esta función. Pídele que actualice Remate.', 'warn') : null,
    h('section', { class: 'band next stack' },
      h('span', { class: 'when' }, group()?.name || 'Tu equipo'),
      h('h2', {}, `Eres ${who}`),
      h('p', { style: { margin: 0 } }, `Puedes pasar lista y capturar partidos de los ${plural(n, 'jugador', 'jugadores')} del equipo. No ves notas, evaluaciones ni datos privados.`)),
    h('section', { class: 'stack' }, sectionTitle('Pasar lista'),
      today.length || recent.length ? h('div', { class: 'rows' }, [...today, ...recent].map(sessRow)) : empty('No hay entrenamientos de hoy ni recientes', null),
      upcoming.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Próximo: ${upcoming.map((s) => `${s.title || 'Entrenamiento'} (${sessionWhen(s)})`).join(', ')}.`) : null),
    h('section', { class: 'stack' }, sectionTitle('Partidos', h('button', { class: 'btn ghost sm', type: 'button', onclick: () => matchSheet(null, (m) => { location.hash = `#/partido/${m.id}`; }) }, ic('plus', 16), 'Nuevo')),
      live.length ? h('div', { class: 'rows' }, live.map((m) => h('a', { class: 'row', href: `#/partido/${m.id}` },
        h('span', { class: 'row-main' }, h('strong', {}, `Contra ${m.rival}`), h('span', { class: 'row-sub' }, fmtDate(m.match_date, { weekday: 'short', day: 'numeric', month: 'short' }))),
        h('span', { class: 'row-end' }, resultChip(m), h('span', { class: 'btn sm primary' }, 'Capturar')))))
        : h('p', { class: 'row-sub', style: { margin: 0 } }, 'No hay partidos por jugar. Crea uno con "Nuevo" para capturarlo.')));
  return { title: 'Asistir', sub: who === 'capitán' ? 'Modo capitán' : 'Asistente', back: state.role === 'assistant' ? null : '#/inicio', el };
}

// =====================================================================
// Lista de asistencia con QR
// =====================================================================
// El código de 6 números sale de HMAC-SHA256(secreto, minuto de 20 s). La base de datos (check_in) hace la misma cuenta.
const WIN = 20;
const LIBS = {
  qrcode: { g: 'qrcode', urls: ['https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js', 'https://unpkg.com/qrcode-generator@2.0.4/dist/qrcode.js'], sri: 'sha384-e9EFD6BGC90bkW9aDV5xbbBfzwN7G8YImHao2lfLVKV/hPB0E0go+H3I64h7oHtA' },
  jsqr: { g: 'jsQR', urls: ['https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'], sri: 'sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx' },
};
const loading = {};
function loadLib(name) {
  const L = LIBS[name];
  if (globalThis[L.g]) return Promise.resolve(globalThis[L.g]);
  const one = (src) => new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = src; sc.async = true; sc.crossOrigin = 'anonymous'; sc.integrity = L.sri;
    sc.onload = () => (globalThis[L.g] ? res(globalThis[L.g]) : rej(new Error('lib')));
    sc.onerror = () => { sc.remove(); rej(new Error('lib')); };
    document.head.append(sc);
  });
  loading[name] ||= L.urls.reduce((p, u) => p.catch(() => one(u)), Promise.reject(new Error('start'))).catch((e) => { delete loading[name]; throw e; });
  return loading[name];
}
const enc = new TextEncoder();
async function codeFor(secret, w) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(String(w))));
  const hex = [...sig.slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 7);
  return String(parseInt(hex, 16) % 1e6).padStart(6, '0');
}
const newSecret = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const appBase = () => location.href.split('#')[0];
const hm = (iso) => new Date(iso).toTimeString().slice(0, 5);
export const checkinOf = (sid) => state.data.checkins.find((c) => c.session_id === sid) || null;
export const checkinOpen = (ck) => !!(ck?.open_until && new Date(ck.open_until) > new Date());
// Tolerancia (Ajustes): minutos después de la hora de inicio en que todavía cuenta como presente.
export const lateMinutes = () => { const v = Number(settings().checkin_late); return Number.isFinite(v) && v >= 0 ? v : 10; };

async function drawQr(box, text) {
  try {
    const qrcode = await loadLib('qrcode');
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), q = 3; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    box.innerHTML = `<svg viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0C2340"/></svg>`;
  } catch {
    box.replaceChildren(h('p', { class: 'qr-fallback' }, 'Sin internet para dibujar el QR. Que escriban el código de abajo en Remate (Inicio > Marcar mi llegada).'));
  }
}

// El panel del QR se conserva entre redibujos de la pantalla (cada llegada vuelve a dibujarla).
let QRV = null;
function stopQr() {
  if (!QRV) return;
  clearInterval(QRV.timer); clearInterval(QRV.poll);
  try { QRV.lock?.release(); } catch { /* sin bloqueo de pantalla */ }
  QRV = null;
}
function qrPanel(s, ck) {
  if (QRV && QRV.sid === s.id && QRV.secret === ck.secret) return QRV.el;
  stopQr();
  const box = h('div', { class: 'qr-box', role: 'img', 'aria-label': 'Código QR para marcar la llegada' });
  const digits = h('div', { class: 'qr-digits' });
  const bar = h('span');
  const el = h('section', { class: 'qr-panel' }, box, h('p', { class: 'qr-hint' }, 'O que escriban este código en Remate:'), digits, h('div', { class: 'qr-bar', 'aria-hidden': 'true' }, bar),
    h('p', { class: 'qr-hint small' }, 'Cambia cada 20 segundos: una foto del QR no sirve para marcar desde la casa.'));
  let lastW = null;
  const tick = async () => {
    if (!location.hash.startsWith(`#/lista-qr/${s.id}`)) { stopQr(); return; }
    const t = Date.now() / 1000, w = Math.floor(t / WIN), left = WIN - (t % WIN);
    bar.style.width = `${(left / WIN) * 100}%`;
    if (w === lastW) return;
    lastW = w;
    const code = await codeFor(ck.secret, w);
    digits.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
    drawQr(box, `${appBase()}#/llegue/${s.id}/${code}`);
  };
  QRV = { sid: s.id, secret: ck.secret, el, timer: setInterval(tick, 250), poll: null, lock: null, seen: new Set(state.data.attendance.filter((a) => a.session_id === s.id).map((a) => a.player_id)) };
  tick();
  // Que la pantalla no se apague mientras escanean.
  navigator.wakeLock?.request('screen').then((l) => { if (QRV) QRV.lock = l; }).catch(() => {});
  // En la nube: revisar cada 5 segundos quién ya llegó.
  if (state.mode === 'cloud') {
    QRV.poll = setInterval(async () => {
      if (!QRV || document.hidden || pendingCount()) return;
      try {
        const c = await client();
        const { data, error } = await c.from('attendance').select('*').eq('session_id', s.id);
        if (error || !data || !QRV) return;
        const fresh = data.filter((a) => !QRV.seen.has(a.player_id));
        for (const a of fresh) QRV.seen.add(a.player_id);
        replaceRows('attendance', (a) => a.session_id === s.id, data);
        if (fresh.length) toast(`Llegó ${fresh.map((a) => playerById(a.player_id)?.name || 'un jugador').join(', ')}`, 2200);
      } catch { /* sin internet: se intenta en la siguiente vuelta */ }
    }, 5000);
  }
  return el;
}

// Hora a partir de la cual cuenta como retardo: inicio del entrenamiento + tolerancia (o desde que abres la lista).
function lateAfter(s) {
  const tol = lateMinutes() * 60000;
  if (s.start_time) {
    const start = new Date(`${s.session_date}T${String(s.start_time).slice(0, 5)}:00`);
    if (!Number.isNaN(start.getTime())) return new Date(start.getTime() + tol).toISOString();
  }
  return new Date(Date.now() + tol).toISOString();
}
function openChecklist(s, hours) {
  // Abierta por las horas que elijas y, como mínimo, hasta que termine el entrenamiento.
  const start = s.start_time ? new Date(`${s.session_date}T${String(s.start_time).slice(0, 5)}:00`).getTime() : NaN;
  const until = Math.max(Date.now() + hours * 3600000, Number.isNaN(start) ? 0 : start + (Number(s.minutes) || 90) * 60000);
  const row = { session_id: s.id, secret: newSecret(), open_until: new Date(until).toISOString(), late_after: lateAfter(s) };
  const ck = checkinOf(s.id);
  if (ck) patch('checkins', ck.id, row); else add('checkins', row);
  if (!s.published) patch('sessions', s.id, { published: true });   // que tus jugadores lo vean en Inicio
}

export function listaQr(ctx) {
  const s = state.data.sessions.find((x) => x.id === ctx.args[0]);
  if (ctx.role !== 'coach') return { title: 'Lista con QR', back: '#/inicio', el: h('div', { class: 'page' }, note('La lista con QR la abre el entrenador. Tú marca tu llegada en Inicio.')) };
  if (!s) return { title: 'Lista con QR', back: '#/sesiones', el: h('div', { class: 'page' }, empty('No encontré ese entrenamiento', null)) };
  const back = `#/sesion/${s.id}`, sub = `${s.title || 'Entrenamiento'} · ${sessionWhen(s)}`;
  if (!sql37Ready()) { stopQr(); return { title: 'Lista con QR', sub, back, el: h('div', { class: 'page' }, note('Para usar la lista con QR, corre en Supabase el bloque «v3.7» del archivo sql/instalar.sql (SQL Editor > pega > Run). Mientras tanto puedes pasar lista como siempre.', 'bad'),
    h('button', { class: 'btn primary', type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 18), 'Pasar lista')) }; }
  if (s.session_date > todayStr()) { stopQr(); return { title: 'Lista con QR', sub, back, el: h('div', { class: 'page' }, note(`La lista con QR se abre el día del entrenamiento (${fmtDate(s.session_date, { weekday: 'long', day: 'numeric', month: 'long' })}). Así nadie lo deja como hecho antes de tiempo.`, 'warn')) }; }
  const ck = checkinOf(s.id), open = checkinOpen(ck);
  const list = players();
  const mark = (pid) => state.data.attendance.find((a) => a.session_id === s.id && a.player_id === pid) || null;
  const here = list.filter((p) => ['presente', 'retardo'].includes(mark(p.id)?.status)).sort((a, b) => String(mark(a.id).created_at || '').localeCompare(String(mark(b.id).created_at || '')));
  const other = list.filter((p) => ['falta', 'justificada'].includes(mark(p.id)?.status));
  const missing = list.filter((p) => !mark(p.id));
  if (!open) {
    stopQr();
    const hours = h('select', { 'aria-label': 'Abierta por' }, options([['1', '1 hora'], ['2', '2 horas'], ['3', '3 horas']], '2'));
    return { title: 'Lista con QR', sub, back, el: h('div', { class: 'page' },
      h('section', { class: 'panel stack' }, h('h2', {}, ck ? 'La lista con QR está cerrada' : 'Abre la lista con QR'),
        h('p', { style: { margin: 0 } }, 'Tu celular muestra un QR. Cada jugador lo escanea desde Remate (Inicio > Marcar mi llegada) y queda presente. Tú solo revisas a los que faltan.'),
        h('p', { style: { margin: 0 } }, s.start_time ? `Llegar después de las ${hm(lateAfter(s))} cuenta como retardo (inicio ${fmtTime(String(s.start_time).slice(0, 5))} + ${lateMinutes()} min de tolerancia).` : `Este entrenamiento no tiene hora: cuenta como retardo llegar más de ${lateMinutes()} min después de que abras la lista.`),
        field('Abierta por', hours, 'Como mínimo queda abierta hasta que termina el entrenamiento. La tolerancia se cambia en Ajustes.'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { openChecklist(s, Number(hours.value) || 2); toast('Lista abierta'); } }, ic('qr-code', 18), ck ? 'Volver a abrir' : 'Abrir lista con QR')),
      here.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Ya marcaron: ${here.map((p) => p.name).join(', ')}.`) : null,
      h('button', { class: 'btn', type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 18), 'Pasar lista a mano')) };
  }
  const row = (p, end) => h('div', { class: 'row' }, jersey(p, 'sm'), h('span', { class: 'row-main' }, h('strong', {}, p.name),
    mark(p.id)?.created_at ? h('span', { class: 'row-sub' }, hm(mark(p.id).created_at)) : null), end);
  const close = async () => {
    const withFaltas = missing.length ? await confirmSheet({ title: 'Cerrar la lista', text: `Faltan ${plural(missing.length, 'jugador', 'jugadores')} por marcar. ¿Les pongo falta? Si no, quedan sin lista y los marcas después.`, ok: 'Sí, poner falta' }) : false;
    if (withFaltas) for (const p of missing) setAttendance(s.id, p.id, 'falta');
    patch('checkins', ck.id, { open_until: new Date().toISOString() });
    toast(withFaltas ? `Lista cerrada: ${plural(missing.length, 'falta', 'faltas')}` : 'Lista cerrada');
  };
  const demoArrive = () => { const p = missing[0]; if (!p) return; setAttendance(s.id, p.id, new Date() > new Date(ck.late_after || 0) ? 'retardo' : 'presente'); if (s.status === 'planeada') patch('sessions', s.id, { status: 'hecha', published: true }); toast(`Llegó ${p.name}`); };
  const el = h('div', { class: 'page lista-qr' },
    qrPanel(s, ck),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn', type: 'button', onclick: () => QRV?.el.requestFullscreen?.().catch(() => {}) }, ic('scan-line', 18), 'Pantalla completa'),
      h('button', { class: 'btn', type: 'button', onclick: () => attendanceSheet(s) }, ic('clipboard-check', 18), 'Corregir lista'),
      h('button', { class: 'btn danger', type: 'button', onclick: close }, ic('check', 18), 'Cerrar lista')),
    state.mode === 'demo' ? h('div', { class: 'note stack' }, h('span', {}, 'En el demo nadie escanea. Toca para ver cómo llegan:'), h('button', { class: 'btn sm', type: 'button', disabled: missing.length ? null : true, onclick: demoArrive }, ic('user-check', 16), 'Simular una llegada')) : null,
    h('p', { class: 'row-sub', style: { margin: 0 } }, `Abierta hasta las ${hm(ck.open_until)}. Retardo después de las ${hm(ck.late_after)}.`),
    h('section', { class: 'stack' }, sectionTitle(`Faltan (${missing.length})`),
      missing.length ? h('div', { class: 'rows' }, missing.map((p) => row(p, h('button', { class: 'btn sm', type: 'button', onclick: () => { setAttendance(s.id, p.id, 'presente'); if (s.status === 'planeada') patch('sessions', s.id, { status: 'hecha', published: true }); } }, 'Presente'))))
        : h('p', { class: 'row-sub', style: { margin: 0 } }, '¡Ya están todos!')),
    h('section', { class: 'stack' }, sectionTitle(`Llegaron (${here.length})`),
      here.length ? h('div', { class: 'rows' }, here.map((p) => row(p, h('span', { class: `chip ${mark(p.id).status === 'retardo' ? 'warn' : 'ok'}` }, mark(p.id).status === 'retardo' ? 'Retardo' : 'Presente')))) : h('p', { class: 'row-sub', style: { margin: 0 } }, 'Todavía nadie.')),
    other.length ? h('p', { class: 'row-sub', style: { margin: 0 } }, `Con falta o justificada: ${other.map((p) => p.name).join(', ')}.`) : null);
  return { title: 'Lista con QR', sub, back, el };
}

// ---------- el jugador marca su llegada ----------
const CHECKIN_ERR = [
  [/bad_code/, 'Ese código ya cambió o no es correcto. Escanea otra vez el QR (cambia cada 20 segundos).'],
  [/checkin_closed/, 'La lista con QR de este entrenamiento no está abierta. Pídele a tu entrenador que la abra.'],
  [/not_in_team/, 'Ese entrenamiento no es de tu equipo.'],
  [/session_not_found/, 'No encontré ese entrenamiento. Escanea el QR otra vez.'],
  [/too_many_attempts/, 'Demasiados intentos con código equivocado. Espera 10 minutos.'],
  [/could not find the function|PGRST202|check_in/i, 'Tu entrenador todavía no activa la lista con QR en Remate (falta correr el SQL de la versión 3.7).'],
];
const checkinMsg = (e) => (isNetworkError(e) ? 'Sin internet. Conéctate y vuelve a intentarlo.' : (CHECKIN_ERR.find(([re]) => re.test(String(e?.message || e?.code || e)))?.[1] || friendly(e)));
async function submitCheckin(sid, code) {
  if (state.mode !== 'cloud') {
    const me = state.data.players.find((p) => p.id === state.viewAs) || null;
    if (me) setAttendance(sid, me.id, 'presente');
    return { status: 'presente', demo: true };
  }
  const c = await client();
  const { data, error } = await c.rpc('check_in', { p_session: sid, p_code: code });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  refresh();
  return data;
}

// Escáner del QR dentro de Remate (también se conserva entre redibujos).
let SC = null;
function stopScan() {
  if (!SC) return;
  SC.on = false; SC.stream?.getTracks().forEach((t) => t.stop()); SC.stream = null;
  SC.video.srcObject = null; SC.wrap.classList.remove('on');
}
async function startScan(onText) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Tu navegador no deja usar la cámara aquí. Escribe el código.');
  SC.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  SC.video.srcObject = SC.stream; SC.video.setAttribute('playsinline', ''); await SC.video.play();
  SC.on = true; SC.wrap.classList.add('on');
  let detector = null;
  try { if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
  const jsQR = detector ? null : await loadLib('jsqr').catch(() => null);
  if (!detector && !jsQR) { stopScan(); throw new Error('No pude cargar el lector de QR (¿sin internet?). Escribe el código.'); }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  const loop = async () => {
    if (!SC?.on) return;
    if (!location.hash.startsWith('#/llegue')) { stopScan(); return; }
    try {
      let text = null;
      if (detector) { const r = await detector.detect(SC.video); text = r[0]?.rawValue || null; }
      else if (SC.video.videoWidth) {
        const k = Math.min(1, 480 / SC.video.videoWidth); cv.width = Math.round(SC.video.videoWidth * k); cv.height = Math.round(SC.video.videoHeight * k);
        cx.drawImage(SC.video, 0, 0, cv.width, cv.height);
        text = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' })?.data || null;
      }
      if (text && onText(text)) { stopScan(); return; }
    } catch { /* cuadro sin QR */ }
    setTimeout(loop, 180);
  };
  loop();
}
const parseQr = (text) => { const m = /#\/llegue\/([0-9a-f-]{36})\/(\d{6})/i.exec(String(text || '')); return m ? { sid: m[1], code: m[2] } : null; };

export function llegue(ctx) {
  const ui = ctx.ui, me = ctx.me;
  const back = '#/inicio';
  if (ctx.role === 'coach' && !state.viewAs) return { title: 'Marcar llegada', back: '#/hoy', el: h('div', { class: 'page' }, note('Esta pantalla es para tus jugadores. Tú abre la lista con QR desde el entrenamiento.')) };
  if (!me) return { title: 'Marcar llegada', back, el: h('div', { class: 'page' }, empty('Tu cuenta no está ligada a un jugador', null)) };
  const today = state.data.sessions.filter((s) => s.session_date === todayStr() && s.status !== 'cancelada');
  ui.sid ||= ctx.args[0] || today[0]?.id || '';
  const result = h('div', { 'aria-live': 'polite' });
  const show = (r) => {
    if (r.error) { result.replaceChildren(note(r.error, 'bad')); return; }
    const late = r.status === 'retardo';
    result.replaceChildren(h('section', { class: `checkin-ok ${late ? 'late' : ''}` }, ic(late ? 'clock' : 'circle-check', 56),
      h('h2', {}, r.already ? 'Ya estabas en la lista' : '¡Llegaste!'),
      h('p', {}, late ? 'Quedaste con retardo. La próxima, unos minutos antes.' : 'Quedaste presente. ¡A entrenar!'),
      r.demo ? h('p', { class: 'row-sub' }, 'Demo: así lo vería tu jugador.') : null));
  };
  const go = async (sid, code) => {
    if (ctx.readonly) { show({ error: 'Vista previa: aquí tu jugador marcaría su llegada.' }); return; }
    if (!sid) { show({ error: 'Elige el entrenamiento.' }); return; }
    if (!/^\d{6}$/.test(code)) { show({ error: 'El código tiene 6 números.' }); return; }
    result.replaceChildren(h('p', { class: 'row-sub' }, 'Marcando tu llegada…'));
    try { const r = await submitCheckin(sid, code); ui.done = r; show(r); } catch (e) { show({ error: checkinMsg(e) }); }
  };
  // Llegó desde el QR (cámara del celular o el escáner de Remate): se marca solo, una vez.
  if (ctx.args[1] && !ui.sent) { ui.sent = true; setTimeout(() => go(ctx.args[0], ctx.args[1]), 0); }
  if (ui.done) show(ui.done);
  if (!SC) {
    const video = h('video', { class: 'scan-video', muted: true, playsinline: true, 'aria-label': 'Cámara para leer el QR' });
    SC = { video, wrap: h('div', { class: 'scan-wrap' }, video, h('div', { class: 'scan-frame', 'aria-hidden': 'true' })), on: false, stream: null };
  }
  const scanBtn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
    if (SC.on) { stopScan(); scanBtn.replaceChildren(ic('camera', 18), 'Escanear el QR'); return; }
    try {
      scanBtn.replaceChildren(ic('x', 18), 'Detener cámara');
      await startScan((text) => { const q = parseQr(text); if (!q) return false; ui.sid = q.sid; ui.sent = true; go(q.sid, q.code); scanBtn.replaceChildren(ic('camera', 18), 'Escanear el QR'); return true; });
    } catch (e) { scanBtn.replaceChildren(ic('camera', 18), 'Escanear el QR'); show({ error: e?.name === 'NotAllowedError' ? 'Remate no tiene permiso para usar la cámara. Actívalo en los ajustes del celular o escribe el código.' : (e?.message || 'No pude abrir la cámara.') }); }
  } }, ic('camera', 18), SC.on ? 'Detener cámara' : 'Escanear el QR');
  const code = h('input', { type: 'text', inputmode: 'numeric', maxlength: 7, autocomplete: 'one-time-code', class: 'codeinput', placeholder: '123 456', 'aria-label': 'Código de 6 números' });
  const pick = today.length > 1 ? h('select', { 'aria-label': 'Entrenamiento', onchange: (e) => { ui.sid = e.target.value; } }, options(today.map((s) => [s.id, `${s.title || 'Entrenamiento'} · ${sessionWhen(s)}`]), ui.sid)) : null;
  const el = h('div', { class: 'page' },
    h('p', { style: { margin: 0 } }, 'Al llegar al entrenamiento, escanea el QR que muestra el celular de tu entrenador. Se marca tu llegada solita.'),
    result,
    h('section', { class: 'panel stack' }, SC.wrap, scanBtn,
      h('p', { class: 'row-sub', style: { margin: 0 } }, 'Escanea desde aquí, dentro de Remate: si usas la cámara normal del celular puede abrirse otra ventana donde no has entrado.')),
    h('section', { class: 'panel stack' }, h('strong', {}, '¿No lee el QR? Escribe el código'),
      today.length ? (pick ? field('Entrenamiento', pick) : h('p', { class: 'row-sub', style: { margin: 0 } }, `${today[0].title || 'Entrenamiento'} · ${sessionWhen(today[0])}`))
        : note('Hoy no hay entrenamiento en tu calendario. Si tu entrenador te muestra un QR, escanéalo.'),
      code, h('button', { class: 'btn ball', type: 'button', disabled: today.length ? null : true, onclick: () => go(ui.sid, code.value.replace(/\D/g, '')) }, ic('check', 18), 'Marcar mi llegada')));
  return { title: 'Mi llegada', sub: 'Lista con QR', back, el };
}

