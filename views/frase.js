// Frase del día (v3.16): una pantalla la primera vez que abres Remate cada día, con lo que te toca hoy.
// Se apaga en Ajustes → Pantalla. Se puede volver a ver desde Inicio (jugador) o Hoy (entrenador).
import { h, ic, toast, todayStr, fmtDate, shareText } from '../util.js';
import { state, ls } from '../store.js';
import { FRASES_NOTA, TEMAS, fraseDelDia } from '../content/frases.js';
import { matchTime, timeText } from '../horarios.js';

const SEEN = 'remate.frase.visto', OFF = 'remate.frase.off';
// En estas pantallas no estorbamos: llegar con QR, pasar lista o capturar un partido.
const SKIP = new Set(['llegue', 'lista-qr', 'asistir', 'alineacion', 'partido']);
export const fraseOff = () => ls.get(OFF) === '1';

// Lo que hay hoy: partido(s) y entrenamiento.
function todayOf(day) {
  const ms = (state.data.matches || []).filter((m) => m.match_date === day && m.status !== 'cancelado').sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  const ss = (state.data.sessions || []).filter((s) => s.session_date === day && s.status !== 'cancelada');
  const out = [];
  for (const m of ms.slice(0, 2)) out.push([ic('volleyball', 18), `Partido${m.rival ? ` vs ${m.rival}` : ''}${matchTime(m) ? `, ${matchTime(m)}` : ''}`]);
  for (const s of ss.slice(0, 1)) out.push([ic('calendar-days', 18), `${s.title || 'Entrenamiento'}${s.start_time ? `, ${timeText(s.start_time)}` : ''}`]);
  return { partido: ms.length > 0, items: out };
}
export function fraseHoy(day = todayStr()) {
  const t = todayOf(day);
  return { f: fraseDelDia(day, { partido: t.partido }), today: t };
}
const shareOf = (f) => `«${f.t}»\n— ${f.a}${f.o ? `, ${f.o}` : ''}\n\nFrase del día de Remate`;

let open = false;
export function showFrase({ day = todayStr() } = {}) {
  if (open) return; open = true;
  if (day === todayStr()) ls.set(SEEN, day);
  const { f, today } = fraseHoy(day);
  const dlg = h('dialog', { class: 'frase', 'aria-labelledby': 'frase-t' });
  const close = () => { open = false; if (dlg.open) dlg.close(); dlg.remove(); };
  dlg.append(h('div', { class: 'frase-in', tabindex: '-1' },
    h('div', { class: 'frase-court', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'frase-top' }, h('span', { class: 'frase-ball', 'aria-hidden': 'true' }, ic('volleyball', 30)),
      h('div', {}, h('div', { class: 'frase-eyebrow' }, 'Frase del día'), h('div', { class: 'frase-date' }, fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })))),
    h('figure', { class: 'frase-fig' },
      h('span', { class: 'frase-q', 'aria-hidden': 'true' }, ic('quote', 34)),
      h('blockquote', { id: 'frase-t' }, f.t),
      h('figcaption', {}, h('strong', {}, f.a === 'Remate' ? 'Remate' : f.a), f.o ? h('span', {}, f.o) : null),
      h('span', { class: 'frase-tag' }, TEMAS[f.k] || 'Hoy')),
    today.items.length ? h('div', { class: 'frase-today' }, h('div', { class: 'frase-eyebrow' }, 'Hoy'), today.items.map(([i, t]) => h('div', { class: 'frase-item' }, i, h('span', {}, t)))) : null,
    h('div', { class: 'frase-actions' },
      h('button', { type: 'button', class: 'btn ball frase-go', onclick: close }, today.partido ? '¡A jugar!' : '¡Vamos!'),
      h('button', { type: 'button', class: 'btn ghost frase-share', onclick: () => shareText(shareOf(f)) }, ic('share-2', 18), 'Compartir'))));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  dlg.showModal();
  dlg.querySelector('.frase-in')?.focus({ preventScroll: true });   // sin anillo de foco sobre el botón al abrir
}

// Se llama después de dibujar cada pantalla: la primera vez del día (si no está apagada), aparece.
export function maybeFrase(route) {
  if (open || fraseOff() || SKIP.has(route) || state.viewAs && !state.self) return;
  const day = todayStr();
  if (ls.get(SEEN) === day) return;
  showFrase({ day });
}

// Tarjeta chiquita para Inicio (jugador) y Hoy (entrenador).
export function fraseCard() {
  const { f } = fraseHoy();
  return h('button', { type: 'button', class: 'frase-card', onclick: () => showFrase(), 'aria-label': 'Ver la frase del día' },
    h('span', { class: 'frase-card-q', 'aria-hidden': 'true' }, ic('quote', 18)),
    h('span', { class: 'frase-card-t' }, h('span', {}, f.t), h('small', {}, `— ${f.a}`)));
}

// Ajustes → Pantalla.
export function fraseField() {
  const cb = h('input', { type: 'checkbox', checked: fraseOff() ? null : true, onchange: (e) => { if (e.target.checked) ls.del(OFF); else ls.set(OFF, '1'); toast(e.target.checked ? 'La frase del día aparece al abrir Remate' : 'Ya no aparece al abrir; la ves en Inicio'); } });
  return h('div', { class: 'stack' },
    h('label', { class: 'check' }, cb, h('span', {}, h('strong', {}, 'Frase del día al abrir Remate'), h('br'), h('span', { class: 'row-sub' }, 'Una frase para motivarte, la primera vez que abres la app cada día. Solo en este celular.'))),
    h('details', {}, h('summary', {}, 'De dónde salen las frases'), h('p', { class: 'row-sub', style: { margin: '6px 0 0' } }, FRASES_NOTA)),
    h('button', { type: 'button', class: 'btn sm', onclick: () => showFrase() }, ic('quote', 16), 'Ver la de hoy'));
}
